import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { financialEditError, nextEditedFields, SHANNON_APPROVAL, activityValue } from "@/lib/field-edits";
import { presentClientJson } from "@/lib/present";

const alias = [{ match: "Harborlane", display: "Market Street" }];

describe("financial edits and imported values", () => {
  it("requires an admin and Shannon's approval", () => {
    assert.equal(financialEditError({ role: "STAFF", approval: SHANNON_APPROVAL, changing: true })?.status, 403);
    assert.match(financialEditError({ role: "ADMIN", approval: "ok", changing: true })?.error ?? "", /Shannon/);
    assert.equal(financialEditError({ role: "ADMIN", approval: SHANNON_APPROVAL, changing: true }), null);
    assert.equal(financialEditError({ role: "STAFF", approval: "", changing: false }), null);
  });

  it("marks a field edited and can show the imported value without the surname", () => {
    const edited = nextEditedFields([], { closedDealValue: 2400, lastName: "Harborlane" }, [
      { field: "closedDealValue", value: 2500 },
    ]);
    assert.deepEqual(edited, ["closedDealValue"]);
    const shown = presentClientJson({ importedValues: { lastName: "Harborlane", email: "alex.harborlane@example.com" } }, alias);
    assert.equal(JSON.stringify(shown).toLowerCase().includes("harborlane"), false);
    assert.equal(shown.importedValues.lastName, "Market Street");
    assert.equal(activityValue("passwordHash", "secret"), null);
  });
});
