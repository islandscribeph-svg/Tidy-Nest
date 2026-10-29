import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { buildClientReport } from "@/lib/client-report";
import { contactsSheet, dataProblemsSheet, hoursSheet, pipelineSheet, clientReportSheet } from "@/lib/exports";
import { mapSnapshotItem, type MappedSnapshotDeal } from "@/lib/monday/map-item";
import { parseSnapshot } from "@/lib/monday/parse-snapshot";
import { sheetText, sheetToXlsx } from "@/lib/sheet";

const fixture = JSON.parse(readFileSync(new URL("./monday/fixtures/sample-board.json", import.meta.url), "utf8"));
const alias = [{ match: "Harborlane", display: "Market Street" }];

function mapped(id: string): MappedSnapshotDeal {
  const snapshot = parseSnapshot(fixture);
  const item = snapshot.items.find((entry) => entry.id === id);
  if (!item) throw new Error(`missing ${id}`);
  return mapSnapshotItem(item);
}

function dealFrom(row: MappedSnapshotDeal, id: string) {
  return {
    id,
    stage: row.stage,
    subStatus: row.subStatus,
    title: row.title,
    serviceType: row.serviceType,
    source: row.source,
    sourceDetail: row.sourceDetail,
    estimatedDealValue: row.estimatedDealValue,
    closedDealValue: row.closedDealValue,
    consultDate: row.consultDate,
    projectStartDate: row.projectStartDate,
    dateClosed: row.dateClosed,
    createdAt: row.createdAt,
    invoiceNumber: row.invoiceNumber,
    consultInvoiceNumber: row.consultInvoiceNumber,
    driveFolderUrl: row.driveFolderUrl,
    worksheetUrl: row.worksheetUrl,
    worksheetFileName: row.worksheetFileName,
    invoiceFileName: row.invoiceFileName,
    projectNotes: row.projectNotes,
    projectDateTimeText: row.projectDateTimeText,
    dateParseIssues: row.dateParseIssues,
    contact: {
      firstName: row.firstName,
      lastName: row.lastName,
      company: row.company,
      email: row.email,
      phone: row.phone,
    },
  };
}

describe("excel and csv exports hide the Harborlane surname", () => {
  const winter = mapped("s-16");
  const spring = mapped("s-15");
  const deals = [dealFrom(winter, "s-16"), dealFrom(spring, "s-15")];

  it("masks pipeline, contacts, problems, hours, and the client report", async () => {
    const contact = deals[0].contact;
    const report = buildClientReport({ contact, deals, problemDealIds: [] }, alias);
    const sheets = [
      pipelineSheet(deals, alias),
      contactsSheet([contact], alias),
      dataProblemsSheet(deals, alias),
      hoursSheet(
        [
          {
            date: "2026-03-02",
            personName: "Alex Harborlane",
            clientLabel: "Harborlane – Spring",
            startTime: "09:00",
            endTime: "11:00",
            breakMinutes: 0,
            notes: "Packing for Harborlane",
            deal: deals[0],
          },
        ],
        alias,
      ),
      clientReportSheet(report),
    ];
    for (const sheet of sheets) {
      const packed = JSON.stringify(sheet);
      assert.equal(packed.toLowerCase().includes("harborlane"), false, sheet.name);
      const xlsx = await sheetText(await sheetToXlsx(sheet));
      assert.equal(xlsx.toLowerCase().includes("harborlane"), false, `${sheet.name} xlsx`);
    }
    const pipeline = pipelineSheet(deals, alias);
    assert.match(JSON.stringify(pipeline), /Market Street/);
    assert.match(JSON.stringify(pipeline), /a…@example.com/);
  });
});
