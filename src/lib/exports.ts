import type { AliasRule } from "@/lib/alias";
import { getAliasRules } from "@/lib/alias";
import { clientReportCsv, type ClientReport } from "@/lib/client-report";
import { findDataProblems, problemLabel } from "@/lib/data-problems";
import { formatCalendarDate, formatEasternDateTime } from "@/lib/eastern-time";
import { hoursBetween } from "@/lib/hours";
import { SERVICE_TYPE_LABELS, SOURCE_LABELS, STAGE_LABELS } from "@/lib/pipeline";
import { presentClientJson, presentContact, presentDeal } from "@/lib/present";
import { sheetToCsv, type Sheet } from "@/lib/sheet";

type DealRow = {
  id: string;
  stage: keyof typeof STAGE_LABELS;
  subStatus?: string | null;
  title?: string | null;
  serviceType?: keyof typeof SERVICE_TYPE_LABELS | null;
  source?: keyof typeof SOURCE_LABELS;
  sourceDetail?: string | null;
  estimatedDealValue?: unknown;
  closedDealValue?: unknown;
  consultDate?: Date | string | null;
  projectStartDate?: Date | string | null;
  dateClosed?: Date | string | null;
  createdAt?: Date | string | null;
  invoiceNumber?: string | null;
  consultInvoiceNumber?: string | null;
  driveFolderUrl?: string | null;
  worksheetUrl?: string | null;
  worksheetFileName?: string | null;
  invoiceFileName?: string | null;
  projectNotes?: string | null;
  projectDateTimeText?: string | null;
  dateParseIssues?: string | null;
  contact: {
    firstName?: string | null;
    lastName?: string | null;
    company?: string | null;
    email?: string | null;
    phone?: string | null;
  };
  assignedTo?: { name?: string | null } | null;
};

const DASH = "—";

function money(value: unknown): string {
  if (value === null || value === undefined || value === "") return DASH;
  return String(value);
}

export function pipelineSheet(deals: DealRow[], rules: AliasRule[] = getAliasRules()): Sheet {
  const headers = [
    "Display Name",
    "First Name",
    "Last Name",
    "Email",
    "Phone",
    "Stage",
    "Sub-Status",
    "Service Type",
    "Source",
    "Source Detail",
    "Project Title",
    "Estimated Deal Value",
    "Closed Deal Value",
    "Consult Date",
    "Project Start Date",
    "Date Closed",
    "Assigned To",
    "Created At",
  ];
  const rows = deals.map((deal) => {
    const shown = presentDeal(deal, rules);
    return [
      shown.displayName,
      shown.contact.firstName ?? "",
      shown.contact.lastName ?? "",
      shown.contact.email ?? "",
      shown.contact.phone ?? "",
      STAGE_LABELS[shown.stage],
      shown.subStatus ?? "",
      shown.serviceType ? SERVICE_TYPE_LABELS[shown.serviceType] : "",
      shown.source ? SOURCE_LABELS[shown.source] : "",
      shown.sourceDetail ?? "",
      shown.title ?? "",
      money(shown.estimatedDealValue),
      money(shown.closedDealValue),
      formatCalendarDate(shown.consultDate) ?? DASH,
      formatCalendarDate(shown.projectStartDate) ?? DASH,
      formatCalendarDate(shown.dateClosed) ?? DASH,
      shown.assignedTo?.name ?? "",
      formatEasternDateTime(shown.createdAt) ?? DASH,
    ];
  });
  return { name: "Pipeline", headers, rows };
}

export function contactsSheet(
  contacts: {
    firstName?: string | null;
    lastName?: string | null;
    email?: string | null;
    phone?: string | null;
    company?: string | null;
    streetAddress?: string | null;
    city?: string | null;
    state?: string | null;
    notes?: string | null;
  }[],
  rules: AliasRule[] = getAliasRules(),
): Sheet {
  const headers = ["First Name", "Last Name", "Email", "Phone", "Company", "Street", "City", "State", "Notes"];
  const rows = contacts.map((contact) => {
    const shown = presentContact(contact, rules);
    return [
      shown.firstName ?? "",
      shown.lastName ?? "",
      shown.email ?? "",
      shown.phone ?? "",
      shown.company ?? "",
      shown.streetAddress ?? "",
      shown.city ?? "",
      shown.state ?? "",
      shown.notes ?? "",
    ];
  });
  return { name: "Contacts", headers, rows };
}

export function dataProblemsSheet(deals: Parameters<typeof findDataProblems>[0], rules: AliasRule[] = getAliasRules()): Sheet {
  const problems = findDataProblems(deals, rules);
  return {
    name: "Data problems",
    headers: ["Project", "Problem", "Detail"],
    rows: problems.map((problem) => [problem.displayName, problemLabel(problem.code), problem.detail]),
  };
}

export function hoursSheet(
  entries: {
    date: Date | string;
    personName: string;
    clientLabel?: string | null;
    startTime: string;
    endTime: string;
    breakMinutes: number;
    notes?: string | null;
    deal?: { contact: { firstName?: string | null; lastName?: string | null; company?: string | null }; title?: string | null; worksheetFileName?: string | null; projectNotes?: string | null; projectDateTimeText?: string | null } | null;
  }[],
  rules: AliasRule[] = getAliasRules(),
): Sheet {
  const headers = ["Date", "Person", "Client", "Start", "End", "Break minutes", "Hours", "Notes"];
  const rows = entries.map((entry) => {
    const shown = presentClientJson(entry, rules);
    const client = entry.deal ? presentDeal(entry.deal, rules).displayName : shown.clientLabel || DASH;
    return [
      formatCalendarDate(entry.date) ?? DASH,
      shown.personName,
      client,
      shown.startTime,
      shown.endTime,
      shown.breakMinutes,
      hoursBetween(entry.startTime, entry.endTime, entry.breakMinutes) ?? DASH,
      shown.notes ?? "",
    ];
  });
  return { name: "Hours", headers, rows };
}

export function clientReportSheet(report: ClientReport): Sheet {
  const csv = clientReportCsv(report);
  const [headerLine, ...lines] = csv.split("\n");
  const headers = headerLine.split(",");
  const rows = lines.filter(Boolean).map((line) => {
    const cells: string[] = [];
    let current = "";
    let quoted = false;
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        if (quoted && line[i + 1] === '"') {
          current += '"';
          i++;
        } else quoted = !quoted;
      } else if (char === "," && !quoted) {
        cells.push(current);
        current = "";
      } else current += char;
    }
    cells.push(current);
    return cells;
  });
  return { name: "Client report", headers, rows };
}

export function activitySheet(
  events: {
    createdAt: Date | string;
    action: string;
    recordType?: string | null;
    recordId?: string | null;
    field?: string | null;
    oldValue?: string | null;
    newValue?: string | null;
    user?: { name?: string | null } | null;
  }[],
  rules: AliasRule[] = getAliasRules(),
): Sheet {
  const headers = ["When", "Who", "Action", "Record", "Field", "Old", "New"];
  const rows = events.map((event) => {
    const shown = presentClientJson(event, rules);
    return [
      formatEasternDateTime(event.createdAt) ?? "",
      shown.user?.name ?? "",
      shown.action,
      [shown.recordType, shown.recordId].filter(Boolean).join(" "),
      shown.field ?? "",
      shown.oldValue ?? "",
      shown.newValue ?? "",
    ];
  });
  return { name: "Activity", headers, rows };
}

export function sheetCsv(sheet: Sheet): string {
  return sheetToCsv(sheet);
}
