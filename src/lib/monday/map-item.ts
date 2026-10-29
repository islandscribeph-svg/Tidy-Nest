import type { ServiceType, Source, Stage } from "@prisma/client";
import { parseFlexibleDate } from "@/lib/flexible-date";
import { COL } from "@/lib/monday/columns";
import type { SnapshotColumn, SnapshotItem } from "@/lib/monday/snapshot-types";
import { normalizeSource } from "@/lib/source-map";
import { stageForItem } from "@/lib/status-map";
import { projectFromDateTimeText, projectFromNotes, projectFromWorkbookFileName } from "@/lib/display-name";

const SERVICE_MAP: Record<string, ServiceType> = {
  organizing: "ORGANIZING",
  relocation: "RELOCATION",
  "home management": "HOME_MANAGEMENT",
  "holiday box": "HOLIDAY_BOX",
  maintenance: "MAINTENANCE",
};

export type MappedSnapshotDeal = {
  mondayItemId: string;
  mondayUrl: string | null;
  mondayGroupTitle: string | null;
  mondayUpdatedAt: Date | null;
  createdAt: Date | null;
  stage: Stage;
  subStatus: string | null;
  firstName: string;
  lastName: string;
  company: string | null;
  email: string | null;
  phone: string | null;
  streetAddress: string | null;
  city: string | null;
  state: string | null;
  cityState: string | null;
  serviceType: ServiceType | null;
  source: Source;
  sourceDetail: string | null;
  title: string | null;
  detailsOfProject: string | null;
  projectNotes: string | null;
  projectDateTimeText: string | null;
  estimatedDealValue: number | null;
  closedDealValue: number | null;
  consultFee: number | null;
  consultDate: Date | null;
  projectStartDate: Date | null;
  dateClosed: Date | null;
  consultInvoiceNumber: string | null;
  consultInvoiceLink: string | null;
  invoiceNumber: string | null;
  invoicePdfUrl: string | null;
  invoiceFileName: string | null;
  invoiceLink: string | null;
  worksheetUrl: string | null;
  worksheetId: string | null;
  worksheetFileName: string | null;
  driveFolderUrl: string | null;
  slackChannelId: string | null;
  slackChannelEmail: string | null;
  proposalUrl: string | null;
  contractUrl: string | null;
  qbDepositPaymentLink: string | null;
  qbFinalPaymentLink: string | null;
  declutterFrequency: string | null;
  difficultyLettingGo: string | null;
  storageSpace: string | null;
  dateParseIssues: string | null;
  checklist: string[];
  contactSaved: boolean;
};

function parseJsonish(value: unknown): unknown {
  if (typeof value !== "string") return value;
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (!trimmed.startsWith("{") && !trimmed.startsWith("[") && !trimmed.startsWith('"')) return value;
  try {
    return JSON.parse(trimmed);
  } catch {
    return value;
  }
}

function columnMap(columns: SnapshotColumn[]): Map<string, SnapshotColumn> {
  const map = new Map<string, SnapshotColumn>();
  for (const column of columns) map.set(column.id, column);
  return map;
}

function parsedValue(column: SnapshotColumn | undefined): unknown {
  if (!column) return null;
  return parseJsonish(column.value);
}

export function columnText(columns: Map<string, SnapshotColumn>, id: string): string | null {
  const column = columns.get(id);
  if (!column) return null;
  if (column.text?.trim()) return column.text.trim();
  const parsed = parsedValue(column);
  if (typeof parsed === "string" && parsed.trim()) return parsed.trim();
  if (typeof parsed === "number" && Number.isFinite(parsed)) return String(parsed);
  if (parsed && typeof parsed === "object") {
    const record = parsed as Record<string, unknown>;
    for (const key of ["text", "label", "date", "url"]) {
      const candidate = record[key];
      if (typeof candidate === "string" && candidate.trim()) return candidate.trim();
    }
  }
  return null;
}

function linkParts(columns: Map<string, SnapshotColumn>, id: string): { url: string | null; fileName: string | null } {
  const column = columns.get(id);
  const text = columnText(columns, id);
  const parsed = parsedValue(column);
  let url: string | null = null;
  let label: string | null = text;
  if (parsed && typeof parsed === "object") {
    const record = parsed as Record<string, unknown>;
    if (typeof record.url === "string" && record.url.trim()) url = record.url.trim();
    if (typeof record.text === "string" && record.text.trim()) label = record.text.trim();
  }
  if (!url && label && /^https?:\/\//i.test(label)) url = label;
  if (!url && text && /^https?:\/\//i.test(text)) url = text;
  const fileName = label && !/^https?:\/\//i.test(label) ? label : null;
  return { url, fileName };
}

function money(columns: Map<string, SnapshotColumn>, id: string): number | null {
  const text = columnText(columns, id);
  if (!text) return null;
  const cleaned = text.replace(/[$,]/g, "").trim();
  if (!cleaned) return null;
  const value = Number(cleaned);
  return Number.isFinite(value) ? value : null;
}

function driveId(url: string | null): string | null {
  if (!url) return null;
  const match = url.match(/\/d\/([a-zA-Z0-9_-]+)/);
  return match?.[1] ?? null;
}

function optionalDate(columns: Map<string, SnapshotColumn>, id: string, label: string, issues: string[]): Date | null {
  const text = columnText(columns, id);
  const parsed = parseFlexibleDate(text);
  if (parsed.unparseable) issues.push(`${label}: ${text}`);
  return parsed.date;
}

function instant(value: string | null): Date | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function isTimeOrReimbursement(item: SnapshotItem["subitems"][number]): boolean {
  const blob = [item.name, ...item.column_values.map((c) => c.text ?? "")].join(" ").toLowerCase();
  return /time entry|reimbursement|reimubrsement/.test(blob);
}

function fallback(item: SnapshotItem): MappedSnapshotDeal {
  return {
    mondayItemId: item.id,
    mondayUrl: item.url,
    mondayGroupTitle: item.group?.title || null,
    mondayUpdatedAt: null,
    createdAt: null,
    stage: "NEW_LEAD",
    subStatus: null,
    firstName: "",
    lastName: item.name || "Unknown",
    company: null,
    email: null,
    phone: null,
    streetAddress: null,
    city: null,
    state: null,
    cityState: null,
    serviceType: null,
    source: "UNKNOWN",
    sourceDetail: null,
    title: null,
    detailsOfProject: null,
    projectNotes: null,
    projectDateTimeText: null,
    estimatedDealValue: null,
    closedDealValue: null,
    consultFee: null,
    consultDate: null,
    projectStartDate: null,
    dateClosed: null,
    consultInvoiceNumber: null,
    consultInvoiceLink: null,
    invoiceNumber: null,
    invoicePdfUrl: null,
    invoiceFileName: null,
    invoiceLink: null,
    worksheetUrl: null,
    worksheetId: null,
    worksheetFileName: null,
    driveFolderUrl: null,
    slackChannelId: null,
    slackChannelEmail: null,
    proposalUrl: null,
    contractUrl: null,
    qbDepositPaymentLink: null,
    qbFinalPaymentLink: null,
    declutterFrequency: null,
    difficultyLettingGo: null,
    storageSpace: null,
    dateParseIssues: null,
    checklist: [],
    contactSaved: Boolean(item.name),
  };
}

export function mapSnapshotItem(item: SnapshotItem): MappedSnapshotDeal {
  try {
    const columns = columnMap(item.column_values ?? []);
    const issues: string[] = [];
    const status = columnText(columns, COL.status);
    const worksheet = linkParts(columns, COL.worksheet);
    const invoiceFile = linkParts(columns, COL.invoiceFile);
    const drive = linkParts(columns, COL.driveFolder);
    const consultFile = linkParts(columns, COL.consultInvoiceFile);
    const proposal = linkParts(columns, COL.proposal);
    const contract = linkParts(columns, COL.contract);
    const qbDeposit = linkParts(columns, COL.qbDeposit);
    const qbFinal = linkParts(columns, COL.qbFinal);
    const projectDateTimeText = columnText(columns, COL.projectDateTime);
    const projectDateParsed = parseFlexibleDate(projectDateTimeText);
    if (projectDateParsed.unparseable && projectDateTimeText) issues.push(`Project Date and Time: ${projectDateTimeText}`);
    const projectStart = optionalDate(columns, COL.projectStart, "Project Start Date", issues);
    const consultDate = optionalDate(columns, COL.consultDate, "Consult Date", issues);
    const dateClosed = optionalDate(columns, COL.dateClosed, "Date Closed", issues);
    const projectNotes = columnText(columns, COL.projectNotes);
    const details = columnText(columns, COL.details);
    const legacyNotes = columnText(columns, COL.notes);
    const serviceRaw = columnText(columns, COL.service);
    const heard = normalizeSource(columnText(columns, COL.source), columnText(columns, COL.heardAbout));
    const worksheetId = columnText(columns, COL.worksheetId) ?? driveId(worksheet.url);
    const title =
      projectFromWorkbookFileName(worksheet.fileName) ||
      projectFromDateTimeText(projectDateTimeText) ||
      projectFromNotes(projectNotes) ||
      columnText(columns, COL.subject);

    const checklist = (item.subitems ?? [])
      .filter((sub) => sub.name && !isTimeOrReimbursement(sub))
      .map((sub) => sub.name);

    const email = columnText(columns, COL.email);
    const phone = columnText(columns, COL.phone);
    const lastName = item.name?.trim() || "Unknown";
    const firstName = columnText(columns, COL.firstName) ?? "";

    return {
      mondayItemId: item.id,
      mondayUrl: item.url,
      mondayGroupTitle: item.group?.title?.trim() || null,
      mondayUpdatedAt: instant(item.updated_at),
      createdAt: instant(item.created_at),
      stage: stageForItem(status),
      subStatus: status,
      firstName,
      lastName,
      company: columnText(columns, COL.company),
      email,
      phone,
      streetAddress: columnText(columns, COL.street),
      city: columnText(columns, COL.city),
      state: columnText(columns, COL.state),
      cityState: columnText(columns, COL.cityState),
      serviceType: serviceRaw ? (SERVICE_MAP[serviceRaw.toLowerCase()] ?? "OTHER") : null,
      source: heard.source,
      sourceDetail: heard.detail ?? null,
      title,
      detailsOfProject: [details, legacyNotes ? `Legacy notes: ${legacyNotes}` : null].filter(Boolean).join("\n\n") || null,
      projectNotes,
      projectDateTimeText,
      estimatedDealValue: money(columns, COL.estimatedValue),
      closedDealValue: money(columns, COL.closedValue),
      consultFee: money(columns, COL.consultFee),
      consultDate,
      projectStartDate: projectStart ?? (projectDateParsed.date && !projectStart ? projectDateParsed.date : null),
      dateClosed,
      consultInvoiceNumber: columnText(columns, COL.consultInvoiceNumber),
      consultInvoiceLink: consultFile.url,
      invoiceNumber: columnText(columns, COL.invoiceNumber),
      invoicePdfUrl: invoiceFile.url,
      invoiceFileName: invoiceFile.fileName,
      invoiceLink: invoiceFile.url,
      worksheetUrl: worksheet.url,
      worksheetId,
      worksheetFileName: worksheet.fileName,
      driveFolderUrl: drive.url,
      slackChannelId: columnText(columns, COL.slackChannelId),
      slackChannelEmail: columnText(columns, COL.slackEmail),
      proposalUrl: proposal.url,
      contractUrl: contract.url,
      qbDepositPaymentLink: qbDeposit.url,
      qbFinalPaymentLink: qbFinal.url,
      declutterFrequency: columnText(columns, COL.declutter),
      difficultyLettingGo: columnText(columns, COL.difficulty),
      storageSpace: columnText(columns, COL.storage),
      dateParseIssues: issues.length ? issues.join("; ") : null,
      checklist,
      contactSaved: Boolean(lastName || email || phone),
    };
  } catch {
    return fallback(item);
  }
}

export function contactKey(row: Pick<MappedSnapshotDeal, "email" | "phone" | "lastName" | "firstName">): string {
  if (row.email) return `email:${row.email.toLowerCase()}`;
  const digits = row.phone?.replace(/\D/g, "");
  if (digits) return `phone:${digits}`;
  return `name:${row.lastName.trim().toLowerCase()}:${row.firstName.trim().toLowerCase()}`;
}
