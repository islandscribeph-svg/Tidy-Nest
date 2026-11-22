import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { attentionHelp, attentionTitle, planAttentionFix } from "@/lib/needs-attention";
import { problemLabel, type ProblemCode } from "@/lib/data-problems";
import { googleSignInDecision, isTidynestEmail, roleForNewGoogleUser } from "@/lib/google-auth";
import { presentDeal } from "@/lib/present";
import { searchContacts, searchDeals } from "@/lib/search";
import { buildToday, greetingForHour } from "@/lib/today";
import { APP_VERSION } from "@/lib/version";
import { SHANNON_APPROVAL } from "@/lib/field-edits";

const CODES: ProblemCode[] = [
  "duplicate_invoice",
  "closed_missing_value",
  "closed_missing_date",
  "closed_missing_drive",
  "missing_worksheet",
  "worksheet_name_mismatch",
  "pdf_name_mismatch",
  "died_with_invoice",
  "unparseable_date",
];

const alias = [{ match: "Harborlane", display: "Market Street" }];

describe("version 2 rules", () => {
  it("is version 2.0.0", () => {
    const pkg = JSON.parse(readFileSync(new URL("../../package.json", import.meta.url), "utf8")) as { version: string };
    assert.equal(APP_VERSION, "2.0.0");
    assert.equal(pkg.version, "2.0.0");
  });

  it("allows only a verified tidynest.com email, and ignores hd", () => {
    assert.equal(isTidynestEmail("peps@tidynest.com"), true);
    assert.equal(isTidynestEmail("peps@mail.tidynest.com"), false);
    assert.equal(isTidynestEmail("peps@tidynest.com.evil.com"), false);
    assert.equal(isTidynestEmail("tidynest.com"), false);
    const ok = googleSignInDecision(
      { email: "New.Hire@tidynest.com", email_verified: true, hd: "gmail.com", name: "New Hire", nonce: "abc" },
      "abc",
    );
    assert.equal(ok.ok, true);
    if (ok.ok) {
      assert.equal(ok.email, "new.hire@tidynest.com");
      assert.equal(roleForNewGoogleUser(ok.email, ["peps@tidynest.com", "shannon@tidynest.com"]), "MEMBER");
    }
    assert.equal(
      googleSignInDecision(
        { email: "peps@tidynest.com", email_verified: "true", hd: "tidynest.com", name: "Peps", nonce: "abc" },
        "abc",
      ).ok,
      true,
    );
    assert.equal(roleForNewGoogleUser("peps@tidynest.com", ["peps@tidynest.com", "shannon@tidynest.com"]), "ADMIN");
    assert.equal(
      googleSignInDecision({ email: "a@gmail.com", email_verified: true, hd: "tidynest.com", nonce: "abc" }, "abc").ok,
      false,
    );
    assert.equal(
      googleSignInDecision({ email: "a@tidynest.com", email_verified: false, nonce: "abc" }, "abc").ok,
      false,
    );
    assert.equal(
      googleSignInDecision({ email: "a@tidynest.com", email_verified: true, nonce: "nope" }, "abc").ok,
      false,
    );
  });

  it("builds a Today list without treating finished work as overdue", () => {
    const buckets = buildToday(
      [
        {
          id: "1",
          stage: "NEW_LEAD",
          displayName: "Alex Market Street",
          title: "Kitchen",
          subStatus: null,
          consultDate: "2026-11-01T12:00:00.000Z",
          projectStartDate: null,
          assignedToId: "me",
        },
        {
          id: "2",
          stage: "CONSULTATION",
          displayName: "Sam Patel",
          title: null,
          subStatus: null,
          consultDate: "2026-11-25T12:00:00.000Z",
          projectStartDate: null,
          assignedToId: null,
        },
        {
          id: "3",
          stage: "CLOSED",
          displayName: "Old job",
          title: null,
          subStatus: null,
          consultDate: "2026-01-01T12:00:00.000Z",
          projectStartDate: null,
          assignedToId: "me",
        },
        {
          id: "4",
          stage: "NEW_LEAD",
          displayName: "Riley Chen",
          title: null,
          subStatus: null,
          consultDate: null,
          projectStartDate: null,
          assignedToId: null,
        },
      ],
      "me",
      "2026-11-22",
    );
    assert.deepEqual(buckets.overdue.map((deal) => deal.id), ["1"]);
    assert.deepEqual(buckets.followUps.map((deal) => deal.id), ["1"]);
    assert.deepEqual(buckets.newLeads.map((deal) => deal.id), ["1", "4"]);
    assert.deepEqual(buckets.consultations.map((deal) => deal.id), ["2"]);
    assert.equal(greetingForHour(9), "Good morning");
    assert.equal(JSON.stringify(buckets).toLowerCase().includes("harborlane"), false);
  });

  it("uses plain checklist copy and one-tap plans that keep financial edits admin-only", () => {
    const copy = CODES.map((code) => `${attentionTitle(code)} ${attentionHelp(code)} ${problemLabel(code)}`).join("\n");
    assert.equal(copy.includes("—"), false);
    assert.equal(copy.toLowerCase().includes("harborlane"), false);
    const date = new Date("2026-11-02T12:00:00.000Z");
    const planned = planAttentionFix({
      code: "closed_missing_date",
      role: "MEMBER",
      approval: null,
      projectStartDate: date,
      consultDate: null,
    });
    assert.equal(planned.ok, true);
    if (planned.ok) assert.equal(planned.value, date);
    const blocked = planAttentionFix({
      code: "died_with_invoice",
      role: "MEMBER",
      approval: SHANNON_APPROVAL,
      projectStartDate: null,
      consultDate: null,
    });
    assert.equal(blocked.ok, false);
    const cleared = planAttentionFix({
      code: "died_with_invoice",
      role: "ADMIN",
      approval: SHANNON_APPROVAL,
      projectStartDate: null,
      consultDate: null,
    });
    assert.equal(cleared.ok, true);
  });

  it("searches the Market Street name and never the raw surname", () => {
    const deal = presentDeal(
      {
        id: "s-15",
        stage: "NEW_LEAD",
        title: "Spring",
        contact: { id: "c1", firstName: "Alex", lastName: "Harborlane", email: "alex.harborlane@example.com", city: "Boston" },
      },
      alias,
    );
    const contact = deal.contact;
    assert.equal(searchDeals([deal], "Harborlane").length, 0);
    assert.equal(searchDeals([deal], "Market Street").length, 1);
    assert.equal(searchContacts([contact], "harborlane").length, 0);
    assert.equal(searchContacts([contact], "Market").length, 1);
    assert.equal(JSON.stringify(searchDeals([deal], "Market")).toLowerCase().includes("harborlane"), false);
  });
});
