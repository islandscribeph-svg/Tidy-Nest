import type { Stage } from "@prisma/client";
import { getAliasRules, type AliasRule } from "@/lib/alias";
import { clientLabel } from "@/lib/display-name";
import { formatCalendarDate } from "@/lib/eastern-time";
import { STAGE_ORDER } from "@/lib/pipeline";
import { presentContact, presentDeal } from "@/lib/present";

const DASH = "—";

type ContactFields = {
  firstName?: string | null;
  lastName?: string | null;
  company?: string | null;
  email?: string | null;
  phone?: string | null;
  streetAddress?: string | null;
  city?: string | null;
  state?: string | null;
  cityState?: string | null;
};

export type ReportDealInput = {
  id: string;
  stage: Stage;
  subStatus?: string | null;
  title?: string | null;
  worksheetFileName?: string | null;
  projectNotes?: string | null;
  projectDateTimeText?: string | null;
  projectStartDate?: Date | string | null;
  consultDate?: Date | string | null;
  dateClosed?: Date | string | null;
  closedDealValue?: unknown;
  invoiceNumber?: string | null;
  driveFolderUrl?: string | null;
  contact?: ContactFields | null;
};

export type ReportLine = {
  id: string;
  stage: Stage;
  name: string;
  projectDate: string;
  closedDate: string;
  closedDealValue: string;
  invoiceNumber: string;
  driveFolderUrl: string | null;
  hasProblem: boolean;
};

export type ClientReport = {
  name: string;
  contact: {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    address: string;
    company: string;
  };
  counts: Record<Stage, number>;
  closed: ReportLine[];
  active: ReportLine[];
  died: ReportLine[];
  other: ReportLine[];
  closedTotal: string;
};

export function moneyAmount(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (typeof value === "bigint") return Number(value);
  if (typeof value === "object" && value !== null && "toFixed" in value) {
    return moneyAmount(String(value));
  }
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed || /^n\/a$/i.test(trimmed)) return null;
    const amount = Number(trimmed.replace(/[$,]/g, ""));
    return Number.isFinite(amount) ? amount : null;
  }
  return null;
}

export function formatReportAmount(value: number | null): string {
  if (value === null) return DASH;
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(value);
}

function textOrDash(value: string | null | undefined): string {
  const trimmed = value?.trim();
  return trimmed ? trimmed : DASH;
}

function when(value: Date | string | null | undefined): number {
  if (!value) return Number.NEGATIVE_INFINITY;
  const time = new Date(value).getTime();
  return Number.isNaN(time) ? Number.NEGATIVE_INFINITY : time;
}

function lineFrom(deal: ReportDealInput, contact: ContactFields, problemDealIds: Set<string>, rules: AliasRule[]): ReportLine {
  const presented = presentDeal({ ...deal, contact: deal.contact ?? contact }, rules);
  const amount = moneyAmount(deal.closedDealValue);
  const drive = presented.driveFolderUrl?.trim() || null;
  return {
    id: deal.id,
    stage: deal.stage,
    name: presented.displayName,
    projectDate: formatCalendarDate(deal.projectStartDate ?? deal.consultDate ?? null) ?? DASH,
    closedDate: formatCalendarDate(deal.dateClosed ?? null) ?? DASH,
    closedDealValue: formatReportAmount(amount),
    invoiceNumber: textOrDash(presented.invoiceNumber),
    driveFolderUrl: drive,
    hasProblem: problemDealIds.has(deal.id),
  };
}

export function buildClientReport(
  input: {
    contact: ContactFields;
    deals: ReportDealInput[];
    problemDealIds?: Iterable<string>;
  },
  rules: AliasRule[] = getAliasRules(),
): ClientReport {
  const contact = presentContact(input.contact, rules);
  const problemDealIds = new Set(input.problemDealIds ?? []);
  const lines = input.deals.map((deal) => ({
    line: lineFrom(deal, contact, problemDealIds, rules),
    closedAt: when(deal.dateClosed),
    projectAt: when(deal.projectStartDate ?? deal.consultDate),
    amount: deal.stage === "CLOSED" ? moneyAmount(deal.closedDealValue) : null,
  }));

  const byName = (left: { line: ReportLine }, right: { line: ReportLine }) => left.line.name.localeCompare(right.line.name);
  const closed = lines
    .filter((row) => row.line.stage === "CLOSED")
    .sort((left, right) => right.closedAt - left.closedAt || byName(left, right))
    .map((row) => row.line);
  const active = lines
    .filter((row) => row.line.stage === "IN_PROGRESS" || row.line.stage === "CONSULTATION")
    .sort((left, right) => right.projectAt - left.projectAt || byName(left, right))
    .map((row) => row.line);
  const died = lines
    .filter((row) => row.line.stage === "DEAD")
    .sort(byName)
    .map((row) => row.line);
  const other = lines
    .filter((row) => row.line.stage !== "CLOSED" && row.line.stage !== "IN_PROGRESS" && row.line.stage !== "CONSULTATION" && row.line.stage !== "DEAD")
    .sort(byName)
    .map((row) => row.line);

  const counts = Object.fromEntries(STAGE_ORDER.map((stage) => [stage, 0])) as Record<Stage, number>;
  for (const row of lines) counts[row.line.stage] += 1;

  const amounts = lines.map((row) => row.amount).filter((amount): amount is number => amount !== null);
  const address = [contact.streetAddress, contact.city, contact.state].filter((part) => part?.trim()).join(", ");

  return {
    name: clientLabel(contact),
    contact: {
      firstName: textOrDash(contact.firstName),
      lastName: textOrDash(contact.lastName),
      email: textOrDash(contact.email),
      phone: textOrDash(contact.phone),
      address: address || textOrDash(contact.cityState),
      company: textOrDash(contact.company),
    },
    counts,
    closed,
    active,
    died,
    other,
    closedTotal: formatReportAmount(amounts.length === 0 ? null : amounts.reduce((sum, amount) => sum + amount, 0)),
  };
}

function csvEscape(value: string): string {
  if (/[",\n]/.test(value)) return `"${value.replace(/"/g, '""')}"`;
  return value;
}

export function clientReportCsv(report: ClientReport): string {
  const headers = ["Section", "Name", "Project date", "Closed date", "Closed deal value", "Invoice number", "Drive link", "Data problem"];
  const rows: string[][] = [headers];
  const push = (section: string, line: ReportLine) => {
    rows.push([
      section,
      line.name,
      line.projectDate,
      line.closedDate,
      line.closedDealValue,
      line.invoiceNumber,
      line.driveFolderUrl ?? DASH,
      line.hasProblem ? "Yes" : DASH,
    ]);
  };
  for (const line of report.closed) push("Closed", line);
  rows.push(["Closed", "TOTAL", DASH, DASH, report.closedTotal, DASH, DASH, DASH]);
  for (const line of report.active) push("In progress and consultation", line);
  for (const line of report.died) push("Died", line);
  for (const line of report.other) push("Other", line);
  return rows.map((row) => row.map(csvEscape).join(",")).join("\n");
}
