import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { filterPresets, textMatch } from "@/lib/filter-presets";

describe("saved filter presets", () => {
  it("includes the built-in views and does not name the fixture surname", () => {
    const pipeline = filterPresets("pipeline", new Date("2026-10-29T16:00:00.000Z"));
    const problems = filterPresets("data-problems");
    const names = [...pipeline, ...problems].map((preset) => preset.name);
    assert.deepEqual(names, ["Closed this year", "In Progress", "Missing worksheet", "Died with invoice"]);
    assert.equal(pipeline[0].query.stage, "CLOSED");
    assert.equal(pipeline[0].query.year, "2026");
    assert.equal(problems[1].query.type, "died_with_invoice");
    assert.equal(JSON.stringify({ pipeline, problems }).toLowerCase().includes("harborlane"), false);
  });

  it("searches the displayed name, not the raw surname", () => {
    assert.equal(textMatch("Harborlane", ["Market Street", "a…@example.com"]), false);
    assert.equal(textMatch("Market Street", ["Market Street", "a…@example.com"]), true);
  });
});
