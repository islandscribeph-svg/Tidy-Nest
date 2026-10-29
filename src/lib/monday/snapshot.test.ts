import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { findDataProblems } from "@/lib/data-problems";
import { formatInvoiceName } from "@/lib/display-name";
import { importSnapshotJson, assertLocalSnapshotPath } from "@/lib/monday/import-snapshot";
import { mapSnapshotItem } from "@/lib/monday/map-item";
import { parseSnapshot } from "@/lib/monday/parse-snapshot";
import { presentDeal } from "@/lib/present";

const fixture = JSON.parse(readFileSync(new URL("./fixtures/sample-board.json", import.meta.url), "utf8"));
const alias = [{ match: "Harborlane", display: "Market Street" }];

function mapped() {
  const snapshot = parseSnapshot(fixture);
  return { snapshot, rows: snapshot.items.map((item) => mapSnapshotItem(item)) };
}

describe("monday snapshot fixture", () => {
  it("parses the native items_page shape and skips odd rows", () => {
    const { snapshot, rows } = mapped();
    assert.equal(snapshot.board.id, "7506018580");
    assert.equal(snapshot.pulledAt, "2026-10-26T22:15:00.000Z");
    assert.equal(snapshot.skipped, 2);
    assert.equal(rows.length, 22);
    assert.equal(rows.some((row) => row.mondayItemId === "s-20"), true);
  });

  it("derives stage from Status and ignores the group", () => {
    const { rows } = mapped();
    const byId = new Map(rows.map((row) => [row.mondayItemId, row]));
    assert.equal(byId.get("s-1")?.stage, "NEW_LEAD");
    assert.equal(byId.get("s-1")?.mondayGroupTitle, "Died");
    assert.equal(byId.get("s-4")?.stage, "IN_PROGRESS");
    assert.equal(byId.get("s-4")?.mondayGroupTitle, "Consultation");
    assert.equal(byId.get("s-22")?.stage, "CONTACTED");
    assert.equal(byId.get("s-22")?.mondayGroupTitle, "Consultation");
    assert.equal(byId.get("s-12")?.stage, "DEAD");
    assert.equal(byId.get("s-14")?.stage, "UNQUALIFIED");
    assert.equal(byId.get("s-6")?.stage, "CLOSED");
    assert.equal(byId.get("s-21")?.stage, "IN_PROGRESS");
    assert.equal(byId.get("s-21")?.worksheetId, "pellsheet");
  });

  it("parses dates best-effort and does not throw on broken cells", () => {
    const { rows } = mapped();
    const hale = rows.find((row) => row.mondayItemId === "s-3");
    assert.equal(hale?.dateParseIssues, null);
    assert.equal(hale?.projectStartDate?.toISOString().slice(0, 10), "2026-10-22");
    assert.deepEqual(hale?.checklist, ["Qualify inquiry"]);
    const nia = rows.find((row) => row.mondayItemId === "s-19");
    assert.match(nia?.dateParseIssues ?? "", /sometime next spring/);
    const odd = rows.find((row) => row.mondayItemId === "s-20");
    assert.equal(odd?.stage, "NEW_LEAD");
    assert.equal(odd?.closedDealValue, null);
    assert.equal(odd?.createdAt, null);
  });

  it("flags the sample data problems and redacts the alias key", () => {
    const { rows } = mapped();
    const problems = findDataProblems(
      rows.map((row) => ({
        id: row.mondayItemId,
        stage: row.stage,
        subStatus: row.subStatus,
        invoiceNumber: row.invoiceNumber,
        consultInvoiceNumber: row.consultInvoiceNumber,
        closedDealValue: row.closedDealValue,
        dateClosed: row.dateClosed,
        driveFolderUrl: row.driveFolderUrl,
        worksheetUrl: row.worksheetUrl,
        worksheetFileName: row.worksheetFileName,
        invoiceFileName: row.invoiceFileName,
        dateParseIssues: row.dateParseIssues,
        title: row.title,
        projectNotes: row.projectNotes,
        projectDateTimeText: row.projectDateTimeText,
        contact: { firstName: row.firstName, lastName: row.lastName, company: row.company },
      })),
      alias,
    );
    const codes = new Set(problems.map((problem) => problem.code));
    for (const code of [
      "duplicate_invoice",
      "closed_missing_value",
      "closed_missing_date",
      "closed_missing_drive",
      "missing_worksheet",
      "worksheet_name_mismatch",
      "pdf_name_mismatch",
      "died_with_invoice",
      "unparseable_date",
    ]) {
      assert.equal(codes.has(code as never), true, code);
    }
    assert.equal(JSON.stringify(problems).includes("Harborlane"), false);
    const harbor = presentDeal(
      {
        contact: { firstName: "Alex", lastName: "Harborlane", email: "office@example.com" },
        title: "Spring Organizing",
        worksheetFileName: "Harborlane_Spring Organizing_Mar2026_Invoice_Workbook",
        projectNotes: "Visit for Harborlane",
      },
      alias,
    );
    assert.equal(harbor.displayName, "Market Street – Spring Organizing");
    assert.equal(JSON.stringify(harbor).includes("Harborlane"), false);
  });

  it("refuses a live URL and does not load the sample fixture by accident", () => {
    assert.throws(() => assertLocalSnapshotPath("https://api.monday.com/v2"), /does not call Monday/);
    assert.throws(() => assertLocalSnapshotPath("/tmp/sample-board.json"), /tests only/);
    assert.doesNotThrow(() => assertLocalSnapshotPath("/tmp/sample-board.json", { allowSampleFixture: true }));
  });

  it("keeps the importer free of Monday credentials and network calls", () => {
    const sources = [
      "import-snapshot.ts",
      "parse-snapshot.ts",
      "map-item.ts",
      "../../../scripts/import-snapshot.ts",
      "../../../scripts/sandbox-setup.ts",
    ];
    for (const relative of sources) {
      const source = readFileSync(new URL(relative, import.meta.url), "utf8");
      assert.doesNotMatch(source, /api\.monday\.com|MONDAY_API_TOKEN|MONDAY_READONLY_TOKEN|\bfetch\s*\(/);
    }
  });

  it("uses the two-word invoice name", () => {
    assert.equal(formatInvoiceName("2401", "Ibarra", "Organizing Oct 2026"), "Tidy Nest Invoice 2401_Ibarra_Organizing Oct 2026");
  });
});

describe("snapshot import writer", () => {
  it("is exported for the admin loader and the command", () => {
    assert.equal(typeof importSnapshotJson, "function");
  });
});
