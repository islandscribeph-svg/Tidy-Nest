import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { preserveStoredText } from "@/lib/alias";
import { mapSnapshotItem } from "@/lib/monday/map-item";
import { parseSnapshot } from "@/lib/monday/parse-snapshot";
import { matchesDashboardFilters } from "@/lib/pipeline";
import { presentClientJson, presentContact, presentDeal } from "@/lib/present";

const fixture = JSON.parse(readFileSync(new URL("./monday/fixtures/sample-board.json", import.meta.url), "utf8"));
const alias = [{ match: "Harborlane", display: "Market Street" }];

function row(id: string) {
  const snapshot = parseSnapshot(fixture);
  const item = snapshot.items.find((entry) => entry.id === id);
  if (!item) throw new Error(`missing ${id}`);
  return mapSnapshotItem(item);
}

function assertNoRawName(payload: unknown) {
  assert.equal(JSON.stringify(payload).includes("Harborlane"), false);
  assert.equal(JSON.stringify(payload).toLowerCase().includes("harborlane"), false);
}

describe("alias on API payloads from the Harborlane fixture", () => {
  const spring = row("s-15");
  const winter = row("s-16");

  it("GET /api/contacts redacts last name and lead_email", () => {
    assert.match(spring.email ?? "", /harborlane/i);
    const body = [
      presentContact(
        {
          id: "c-harbor",
          firstName: spring.firstName,
          lastName: spring.lastName,
          email: spring.email,
          phone: spring.phone,
          company: spring.company,
          streetAddress: spring.streetAddress,
          city: spring.city,
          state: spring.state,
          notes: spring.detailsOfProject,
          deals: [{ id: spring.mondayItemId, stage: spring.stage, serviceType: spring.serviceType }],
        },
        alias,
      ),
    ];
    assertNoRawName(body);
    assert.equal(body[0].lastName, "Market Street");
    assert.equal(body[0].email, "a…@example.com");
  });

  it("POST /api/contacts/save redacts the contact, the deal, and a duplicate candidate", () => {
    const contact = {
      id: "c-harbor",
      firstName: spring.firstName,
      lastName: spring.lastName,
      email: spring.email,
      phone: spring.phone,
    };
    const body = {
      duplicate: true,
      candidate: presentContact(contact, alias),
      contact: presentContact(contact, alias),
      deal: presentDeal(
        {
          id: spring.mondayItemId,
          title: spring.title,
          stage: spring.stage,
          worksheetFileName: spring.worksheetFileName,
          slackChannelEmail: spring.slackChannelEmail,
          projectNotes: spring.projectNotes,
          contact,
        },
        alias,
      ),
    };
    assertNoRawName(body);
    assert.equal(body.deal.displayName.includes("Market Street"), true);
    assert.equal(body.deal.slackChannelEmail, "h…@slack.example");
    assert.equal(body.contact.email, "a…@example.com");
  });

  it("GET /api/deals and deal detail redact subitem names, notes, and file names", () => {
    const contact = { id: "c-harbor", firstName: spring.firstName, lastName: spring.lastName, email: spring.email };
    const detail = presentDeal(
      {
        id: spring.mondayItemId,
        title: spring.title,
        stage: spring.stage,
        subStatus: spring.subStatus,
        worksheetFileName: spring.worksheetFileName,
        invoiceFileName: winter.invoiceFileName,
        slackChannelEmail: spring.slackChannelEmail,
        projectNotes: spring.projectNotes,
        checklistItems: spring.checklist.map((label, index) => ({ id: `sub-${index}`, label })),
        notes: [{ id: "n1", body: "Left a message for Harborlane at alex.harborlane@example.com" }],
        contact,
      },
      alias,
    );
    const list = [detail];
    assert.equal(spring.checklist.some((label) => /harborlane/i.test(label)), true);
    assertNoRawName(list);
    assert.match(detail.checklistItems[0].label, /Market Street/);
    assert.equal(detail.notes[0].body, "Left a message for Market Street at a…@example.com");
    assert.equal(detail.contact.email, "a…@example.com");
    assert.match(detail.invoiceFileName ?? "", /Market Street/);
    const noteResponse = presentClientJson({ id: "n1", body: "Harborlane confirmed the keys" }, alias);
    assertNoRawName(noteResponse);
  });

  it("CSV export and title search use the redacted deal", () => {
    const shown = presentDeal(
      {
        title: spring.title,
        worksheetFileName: spring.worksheetFileName,
        projectNotes: spring.projectNotes,
        dateClosed: null,
        projectStartDate: null,
        consultDate: null,
        contact: {
          id: "c-harbor",
          firstName: spring.firstName,
          lastName: spring.lastName,
          email: spring.email,
          phone: spring.phone,
          streetAddress: null,
          city: null,
          state: null,
        },
      },
      alias,
    );
    const csv = [shown.displayName, shown.contact.lastName, shown.contact.email, shown.worksheetFileName].join(",");
    assert.equal(csv.toLowerCase().includes("harborlane"), false);
    assert.equal(shown.contact.email, "a…@example.com");
    assert.match(csv, /Market Street/);
    const filters = { year: "all" as const, month: "all" as const, contactId: "all" as const, address: "", title: "" };
    assert.equal(
      matchesDashboardFilters({ ...shown, title: shown.title ?? null }, { ...filters, title: "Harborlane" }),
      false,
    );
    assert.equal(
      matchesDashboardFilters({ ...shown, title: shown.title ?? null }, { ...filters, title: "Market Street" }),
      true,
    );
  });

  it("keeps the stored surname when a redacted form is saved unchanged", () => {
    assert.equal(preserveStoredText("Market Street", "Harborlane", alias), "Harborlane");
    assert.equal(preserveStoredText("a…@example.com", spring.email, alias), spring.email);
    assert.equal(preserveStoredText("Someone Else", "Harborlane", alias), "Someone Else");
  });
});

describe("route modules present client text", () => {
  const files = [
    "../app/api/contacts/route.ts",
    "../app/api/contacts/save/route.ts",
    "../app/api/deals/route.ts",
    "../app/api/deals/[id]/route.ts",
    "../app/api/deals/[id]/notes/route.ts",
    "../app/api/deals/[id]/checklist/route.ts",
    "../app/api/checklist-items/[id]/route.ts",
    "../app/api/deals/[id]/worksheet-entries/route.ts",
    "../app/api/worksheet-entries/[id]/route.ts",
    "../app/api/deals/[id]/vendors/route.ts",
    "../app/api/vendors/[id]/route.ts",
    "../app/api/vendors/[id]/items/route.ts",
    "../app/api/reimbursement-items/[id]/route.ts",
    "../app/api/deals/[id]/additional-charges/route.ts",
    "../app/api/additional-charges/[id]/route.ts",
    "../app/api/employees/[id]/timesheet/route.ts",
    "../app/api/employees/[id]/timesheet-entries/route.ts",
    "../app/api/timesheet-entries/[id]/route.ts",
    "../app/api/hours/route.ts",
    "../app/api/hours/[id]/route.ts",
    "../app/api/reports/export/route.ts",
    "../app/api/exports/[kind]/route.ts",
    "../lib/exports.ts",
    "../app/api/filters/route.ts",
    "../app/api/filters/[id]/route.ts",
    "../app/api/contacts/[id]/route.ts",
    "../app/api/users/route.ts",
    "../app/api/employees/route.ts",
    "../app/api/employees/[id]/route.ts",
    "../app/api/auth/login/route.ts",
    "../app/api/setup/status/route.ts",
    "../app/contacts/page.tsx",
    "../app/pipeline/page.tsx",
    "../app/dashboard/page.tsx",
    "../app/calendar/page.tsx",
    "../app/data-problems/page.tsx",
    "../app/clients/[id]/page.tsx",
    "../app/api/clients/[id]/export/route.ts",
    "../lib/client-report.ts",
  ];

  it("imports the alias presenter", () => {
    for (const file of files) {
      const source = readFileSync(new URL(file, import.meta.url), "utf8");
      assert.match(source, /present(Contact|Deal|ClientJson)|findDataProblems|buildClientReport/, file);
    }
  });
});
