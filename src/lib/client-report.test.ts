import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { buildClientReport, clientReportCsv } from "@/lib/client-report";
import { findDataProblems } from "@/lib/data-problems";
import { mapSnapshotItem, type MappedSnapshotDeal } from "@/lib/monday/map-item";
import { parseSnapshot } from "@/lib/monday/parse-snapshot";

const fixture = JSON.parse(readFileSync(new URL("./monday/fixtures/sample-board.json", import.meta.url), "utf8"));
const alias = [{ match: "Harborlane", display: "Market Street" }];

function row(id: string): MappedSnapshotDeal {
  const snapshot = parseSnapshot(fixture);
  const item = snapshot.items.find((entry) => entry.id === id);
  if (!item) throw new Error(`missing ${id}`);
  return mapSnapshotItem(item);
}

function asDeal(mapped: MappedSnapshotDeal, id: string, contact: { firstName: string; lastName: string; email: string | null }) {
  return {
    id,
    stage: mapped.stage,
    subStatus: mapped.subStatus,
    title: mapped.title,
    worksheetFileName: mapped.worksheetFileName,
    worksheetUrl: mapped.worksheetUrl,
    projectNotes: mapped.projectNotes,
    projectDateTimeText: mapped.projectDateTimeText,
    projectStartDate: mapped.projectStartDate,
    consultDate: mapped.consultDate,
    dateClosed: mapped.dateClosed,
    closedDealValue: mapped.closedDealValue,
    invoiceNumber: mapped.invoiceNumber,
    invoiceFileName: mapped.invoiceFileName,
    consultInvoiceNumber: mapped.consultInvoiceNumber,
    driveFolderUrl: mapped.driveFolderUrl,
    dateParseIssues: mapped.dateParseIssues,
    contact,
  };
}

describe("client report from the Harborlane fixture", () => {
  const winter = row("s-16");
  const spring = row("s-15");
  const contact = {
    id: "c-harbor",
    firstName: winter.firstName,
    lastName: winter.lastName,
    email: winter.email,
    phone: winter.phone,
    company: winter.company,
    streetAddress: winter.streetAddress,
    city: winter.city,
    state: winter.state,
  };
  const died = {
    ...spring,
    stage: "DEAD" as const,
    subStatus: "Died",
    closedDealValue: 999,
    invoiceNumber: "2391",
    dateClosed: null,
    projectNotes: "Harborlane declined",
  };
  const blankClosed = {
    ...winter,
    closedDealValue: null,
    invoiceNumber: null,
    dateClosed: null,
    driveFolderUrl: null,
  };
  const deals = [
    asDeal(winter, "s-16", contact),
    asDeal(spring, "s-15", contact),
    asDeal(died, "s-died", contact),
    asDeal(blankClosed, "s-blank", contact),
  ];
  const problemDealIds = [...new Set(findDataProblems(deals, alias).map((problem) => problem.dealId))];
  const report = buildClientReport({ contact, deals, problemDealIds }, alias);
  const csv = clientReportCsv(report);

  it("redacts the surname on the report and the CSV", () => {
    const packed = `${JSON.stringify(report)}\n${csv}`;
    assert.equal(packed.toLowerCase().includes("harborlane"), false);
    assert.match(report.name, /Market Street/);
    assert.match(report.contact.email, /Market Street/);
    assert.match(csv, /Market Street/);
  });

  it("sums only closed values and leaves missing amounts as a dash", () => {
    assert.equal(winter.closedDealValue, 2400);
    assert.equal(report.closedTotal, "$2,400.00");
    assert.equal(report.closed.some((line) => line.id === "s-16" && line.closedDealValue === "$2,400.00"), true);
    assert.equal(report.closed.some((line) => line.id === "s-blank" && line.closedDealValue === "—"), true);
    assert.equal(report.closed.some((line) => line.closedDealValue === "$0.00"), false);
    assert.equal(report.active.some((line) => line.id === "s-15"), true);
    assert.equal(report.died.find((line) => line.id === "s-died")?.closedDealValue, "$999.00");
    assert.match(csv, /TOTAL,—,—,"\$2,400\.00"/);
    assert.doesNotMatch(csv, /TOTAL,.*999/);
  });

  it("flags data problems and counts deals by stage", () => {
    assert.equal(report.closed.find((line) => line.id === "s-blank")?.hasProblem, true);
    assert.equal(report.died.find((line) => line.id === "s-died")?.hasProblem, true);
    assert.equal(report.counts.CLOSED, 2);
    assert.equal(report.counts.IN_PROGRESS, 1);
    assert.equal(report.counts.DEAD, 1);
    assert.equal(report.closed.find((line) => line.id === "s-16")?.invoiceNumber, "2406");
    assert.match(report.closed.find((line) => line.id === "s-16")?.closedDate ?? "", /Jan 20, 2026/);
    assert.equal(report.closed.find((line) => line.id === "s-blank")?.driveFolderUrl, null);
  });

  it("builds the page and export through the alias presenter", () => {
    const root = new URL("../", import.meta.url);
    for (const file of ["app/clients/[id]/page.tsx", "app/api/clients/[id]/export/route.ts", "lib/client-report.ts"]) {
      const source = readFileSync(new URL(file, root), "utf8");
      assert.match(source, /buildClientReport|presentDeal|presentContact/, file);
    }
  });
});
