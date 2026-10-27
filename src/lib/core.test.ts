import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { redactText, parseAliasMap } from "@/lib/alias";
import { isSessionOptionalPath } from "@/lib/auth-paths";
import { calendarParts, formatEasternDateTime } from "@/lib/eastern-time";
import { hoursBetween } from "@/lib/hours";
import { getPayPeriod } from "@/lib/pay-period";
import { staffAccessError, staffCreateError } from "@/lib/staff-users";
import { stageForItem } from "@/lib/status-map";

const alias = parseAliasMap('{"Harborlane":"Market Street"}').rules;

describe("alias map", () => {
  it("replaces a surname at a word boundary, including underscores", () => {
    assert.equal(redactText("Harborlane_Spring", alias), "Market Street_Spring");
    assert.equal(redactText("visit harborlane today", alias), "visit Market Street today");
    assert.equal(redactText("NotHarborlane", alias), "NotHarborlane");
  });
});

describe("status map", () => {
  it("uses the status column and ignores a missing status", () => {
    assert.equal(stageForItem("Died"), "DEAD");
    assert.equal(stageForItem("Client - Start"), "IN_PROGRESS");
    assert.equal(stageForItem("No Comms Needed"), "CONTACTED");
    assert.equal(stageForItem("Create Worksheet"), "CONSULTATION");
    assert.equal(stageForItem(""), "NEW_LEAD");
    assert.equal(stageForItem("something new"), "NEW_LEAD");
  });
});

describe("hours", () => {
  it("subtracts an Eastern wall-clock break", () => {
    assert.equal(hoursBetween("9:00", "12:30", 30), 3);
    assert.equal(hoursBetween("12:00", "11:00", 0), null);
  });
});

describe("eastern calendar", () => {
  it("keeps noon-UTC dates on that calendar day and shifts real instants", () => {
    const noon = calendarParts(new Date("2026-10-22T12:00:00.000Z"));
    assert.deepEqual(noon, { year: 2026, month: 10, day: 22 });
    const late = calendarParts(new Date("2026-10-27T03:30:00.000Z"));
    assert.equal(late.day, 26);
    const label = formatEasternDateTime("2026-10-26T22:15:00.000Z");
    assert.match(label ?? "", /6:15 PM ET/);
    const period = getPayPeriod(new Date("2026-10-27T03:30:00.000Z"));
    assert.match(period.label, /Oct 16 – Oct 31, 2026/);
  });
});

describe("staff allowlist", () => {
  const allow = ["a@example.com", "b@example.com"];

  it("accepts only the two configured addresses", () => {
    assert.equal(staffAccessError("a@example.com", allow), null);
    assert.ok(staffAccessError("c@example.com", allow));
    assert.ok(staffCreateError({ email: "c@example.com", existingEmails: ["a@example.com"], allowlist: allow }));
    assert.ok(
      staffCreateError({
        email: "b@example.com",
        existingEmails: ["a@example.com", "b@example.com"],
        allowlist: allow,
      }),
    );
  });
});

describe("auth paths", () => {
  it("keeps app and API routes behind a session", () => {
    assert.equal(isSessionOptionalPath("/login"), true);
    assert.equal(isSessionOptionalPath("/api/auth/login"), true);
    assert.equal(isSessionOptionalPath("/api/leads/intake"), true);
    assert.equal(isSessionOptionalPath("/api/setup/admin"), true);
    assert.equal(isSessionOptionalPath("/api/deals"), false);
    assert.equal(isSessionOptionalPath("/pipeline"), false);
    assert.equal(isSessionOptionalPath("/signup"), false);
  });
});
