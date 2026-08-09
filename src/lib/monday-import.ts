// Shared parsing/import logic for the legacy Monday.com "Main Nest" export.
// Used by both the local CLI script (scripts/migrate-monday-export.ts) and
// the one-time /api/setup/import endpoint, so the mapping rules only live
// in one place.
import ExcelJS from "exceljs";
import type { PrismaClient, Stage, ServiceType, Source } from "@prisma/client";

const GROUP_NAMES = new Set([
  "New Leads",
  "Contacted",
  "Consultation",
  "In Progress",
  "Closed",
  "Unqualified",
  "Dead",
]);

const COLS = {
  firstName: 2,
  subject: 3,
  service: 4,
  status: 5,
  dateClosed: 7,
  invoiceNumber: 9,
  closedDealValue: 12,
  estimatedDealValue: 17,
  consultFee: 18,
  company: 21,
  detailsOfProject: 22,
  email: 26,
  phone: 27,
  streetAddress: 28,
  city: 29,
  state: 30,
  source: 32,
  notes: 33,
  heardAbout: 35,
  projectStartDate: 36,
  consultDate: 37,
  qbDepositLink: 38,
  qbFinalLink: 39,
  projectNotes: 45,
} as const;

function cellStr(v: ExcelJS.CellValue): string | undefined {
  if (v === null || v === undefined) return undefined;
  if (typeof v === "object" && "text" in (v as object)) return String((v as { text: unknown }).text).trim() || undefined;
  if (typeof v === "object" && "result" in (v as object)) return String((v as { result: unknown }).result).trim() || undefined;
  const s = String(v).trim();
  return s || undefined;
}

function cellDate(v: ExcelJS.CellValue): Date | undefined {
  if (v instanceof Date) return v;
  const s = cellStr(v);
  if (!s) return undefined;
  const d = new Date(s);
  return isNaN(d.getTime()) ? undefined : d;
}

function cellNumber(v: ExcelJS.CellValue): number | undefined {
  const s = cellStr(v);
  if (!s) return undefined;
  const cleaned = s.replace(/[$,]/g, "");
  const n = Number(cleaned);
  return isNaN(n) ? undefined : n;
}

function mapStage(group: string, status: string | undefined): Stage {
  if (group === "Unqualified") return "UNQUALIFIED";
  if (group === "Dead" || status === "Died") return "DEAD";
  if (status === "Client - Start" || status === "Client - Post Project" || group === "In Progress") {
    return "IN_PROGRESS";
  }
  if (group === "New Leads") return "NEW_LEAD";
  if (group === "Contacted") return "CONTACTED";
  if (group === "Consultation") return "CONSULTATION";
  if (group === "Closed") return "CLOSED";
  return "NEW_LEAD";
}

const SERVICE_MAP: Record<string, ServiceType> = {
  organizing: "ORGANIZING",
  relocation: "RELOCATION",
  "home management": "HOME_MANAGEMENT",
  "holiday box": "HOLIDAY_BOX",
  maintenance: "MAINTENANCE",
};

function mapService(raw: string | undefined): ServiceType | undefined {
  if (!raw) return undefined;
  return SERVICE_MAP[raw.trim().toLowerCase()] ?? "OTHER";
}

function normalizeSource(raw: string | undefined, heardAbout: string | undefined) {
  const text = raw ?? heardAbout;
  if (!text) return { source: "UNKNOWN" as Source, detail: undefined as string | undefined };
  const low = text.toLowerCase();
  let source: Source = "OTHER";
  if (low.includes("social")) source = "SOCIAL_MEDIA";
  else if (low.includes("magazine")) source = "MAGAZINE";
  else if (low.includes("advertisement") || low.includes("article")) source = "ONLINE_AD";
  else if (low.includes("google")) source = "GOOGLE";
  else if (low.includes("referr") || low.includes("know each other")) source = "REFERRAL";
  else if (low === "friend") source = "FRIEND";
  else if (low.includes("website")) source = "WEBSITE";
  return { source, detail: text };
}

export type ParsedRecord = {
  contactKey: string;
  firstName: string;
  lastName?: string;
  email?: string;
  phone?: string;
  streetAddress?: string;
  city?: string;
  state?: string;
  company?: string;
  stage: Stage;
  subStatus?: string;
  subject?: string;
  serviceType?: ServiceType;
  detailsOfProject?: string;
  source: Source;
  sourceDetail?: string;
  estimatedDealValue?: number;
  closedDealValue?: number;
  consultFee?: number;
  consultDate?: Date;
  projectStartDate?: Date;
  dateClosed?: Date;
  invoiceNumber?: string;
  qbDepositPaymentLink?: string;
  qbFinalPaymentLink?: string;
  notes?: string;
};

export async function parseMondayWorkbook(source: string | Buffer | ArrayBuffer): Promise<ParsedRecord[]> {
  const workbook = new ExcelJS.Workbook();
  if (typeof source === "string") {
    await workbook.xlsx.readFile(source);
  } else {
    const buf = Buffer.isBuffer(source) ? source : Buffer.from(source);
    // exceljs's bundled Buffer type doesn't match @types/node's here — harmless at runtime.
    await workbook.xlsx.load(buf as unknown as Parameters<typeof workbook.xlsx.load>[0]);
  }
  const sheet = workbook.worksheets[0];

  const records: ParsedRecord[] = [];
  let currentGroup = "New Leads";

  sheet.eachRow((row) => {
    const col1 = cellStr(row.getCell(1).value);
    const statusCell = cellStr(row.getCell(COLS.status).value);

    if (col1 && GROUP_NAMES.has(col1) && !statusCell) {
      currentGroup = col1;
      return;
    }
    if (col1 === "Name" && statusCell === "Status") return; // repeated header row
    if (col1 === "Main Nest") return; // board title row

    const firstName = cellStr(row.getCell(COLS.firstName).value);
    const lastName = col1;
    if (!firstName && !lastName) return; // blank separator row

    const email = cellStr(row.getCell(COLS.email).value)?.toLowerCase();
    const phone = cellStr(row.getCell(COLS.phone).value)?.replace(/\D/g, "");
    const contactKey = email ?? (phone ? `phone:${phone}` : `name:${(lastName ?? "").toLowerCase()}:${(firstName ?? "").toLowerCase()}`);

    const { source, detail } = normalizeSource(
      cellStr(row.getCell(COLS.source).value),
      cellStr(row.getCell(COLS.heardAbout).value),
    );

    records.push({
      contactKey,
      firstName: firstName ?? "Unknown",
      lastName,
      email: cellStr(row.getCell(COLS.email).value),
      phone: cellStr(row.getCell(COLS.phone).value),
      streetAddress: cellStr(row.getCell(COLS.streetAddress).value),
      city: cellStr(row.getCell(COLS.city).value),
      state: cellStr(row.getCell(COLS.state).value),
      company: cellStr(row.getCell(COLS.company).value),
      stage: mapStage(currentGroup, statusCell),
      subStatus: statusCell,
      subject: cellStr(row.getCell(COLS.subject).value),
      serviceType: mapService(cellStr(row.getCell(COLS.service).value)),
      detailsOfProject:
        cellStr(row.getCell(COLS.detailsOfProject).value) ?? cellStr(row.getCell(COLS.projectNotes).value),
      source,
      sourceDetail: detail,
      estimatedDealValue: cellNumber(row.getCell(COLS.estimatedDealValue).value),
      closedDealValue: cellNumber(row.getCell(COLS.closedDealValue).value),
      consultFee: cellNumber(row.getCell(COLS.consultFee).value),
      consultDate: cellDate(row.getCell(COLS.consultDate).value),
      projectStartDate: cellDate(row.getCell(COLS.projectStartDate).value),
      dateClosed: cellDate(row.getCell(COLS.dateClosed).value),
      invoiceNumber: cellStr(row.getCell(COLS.invoiceNumber).value),
      qbDepositPaymentLink: cellStr(row.getCell(COLS.qbDepositLink).value),
      qbFinalPaymentLink: cellStr(row.getCell(COLS.qbFinalLink).value),
      notes: cellStr(row.getCell(COLS.notes).value),
    });
  });

  return records;
}

export function summarizeMondayRecords(records: ParsedRecord[]) {
  const byStage: Record<string, number> = {};
  for (const r of records) byStage[r.stage] = (byStage[r.stage] ?? 0) + 1;
  const uniqueContacts = new Set(records.map((r) => r.contactKey)).size;
  return { total: records.length, byStage, uniqueContacts };
}

export async function importMondayRecords(prisma: PrismaClient, records: ParsedRecord[]) {
  const contactIdByKey = new Map<string, string>();
  let created = 0;

  for (const r of records) {
    let contactId = contactIdByKey.get(r.contactKey);
    if (!contactId) {
      const existing = r.email
        ? await prisma.contact.findFirst({ where: { email: r.email } })
        : r.phone
          ? await prisma.contact.findFirst({ where: { phone: r.phone } })
          : null;

      const contact =
        existing ??
        (await prisma.contact.create({
          data: {
            firstName: r.firstName,
            lastName: r.lastName,
            email: r.email,
            phone: r.phone,
            streetAddress: r.streetAddress,
            city: r.city,
            state: r.state,
            company: r.company,
          },
        }));
      contactId = contact.id;
      contactIdByKey.set(r.contactKey, contactId);
    }

    await prisma.deal.create({
      data: {
        contactId,
        stage: r.stage,
        subStatus: r.subStatus,
        contactSaved: true,
        subject: r.subject,
        serviceType: r.serviceType,
        detailsOfProject: r.notes ? `${r.detailsOfProject ?? ""}\n\nLegacy notes: ${r.notes}`.trim() : r.detailsOfProject,
        source: r.source,
        sourceDetail: r.sourceDetail,
        estimatedDealValue: r.estimatedDealValue,
        closedDealValue: r.closedDealValue,
        consultFee: r.consultFee,
        consultDate: r.consultDate,
        projectStartDate: r.projectStartDate,
        dateClosed: r.dateClosed,
        invoiceNumber: r.invoiceNumber,
        qbDepositPaymentLink: r.qbDepositPaymentLink,
        qbFinalPaymentLink: r.qbFinalPaymentLink,
      },
    });
    created++;
  }

  return { dealsCreated: created, contactsUsed: contactIdByKey.size };
}
