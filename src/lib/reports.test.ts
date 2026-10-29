import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { mapSnapshotItem } from "@/lib/monday/map-item";
import { parseSnapshot } from "@/lib/monday/parse-snapshot";
import { buildReports } from "@/lib/reports";

const fixture = JSON.parse(readFileSync(new URL("./monday/fixtures/sample-board.json", import.meta.url), "utf8"));
const alias = [{ match: "Harborlane", display: "Market Street" }];

describe("reports", () => {
  it("sums only closed value and hides the surname", () => {
    const snapshot = parseSnapshot(fixture);
    const deals = snapshot.items
      .map((item) => mapSnapshotItem(item))
      .filter((row) => row.lastName === "Harborlane")
      .map((row) => ({ ...row, id: row.mondayItemId, contact: { firstName: row.firstName, lastName: row.lastName, email: row.email, company: row.company } }));
    const report = buildReports(deals, [], alias);
    assert.equal(report.closedTotal, 2400);
    assert.equal(report.openCount, 1);
    assert.equal(JSON.stringify(report).toLowerCase().includes("harborlane"), false);
    assert.match(JSON.stringify(report), /Market Street/);
    assert.equal(report.stages.find((stage) => stage.stage === "IN_PROGRESS")?.count, 1);
    assert.equal(report.stages.find((stage) => stage.stage === "DEAD")?.count, 0);
  });
});
