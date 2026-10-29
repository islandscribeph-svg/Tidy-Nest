import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { parseDateInput } from "@/lib/eastern-time";
import { preserveStoredText } from "@/lib/alias";
import { logActivity } from "@/lib/activity";
import { findDataProblems } from "@/lib/data-problems";
import { FINANCIAL_FIELDS, financialEditError, isFinancialField, nextEditedFields, valuesDiffer } from "@/lib/field-edits";
import { presentDeal } from "@/lib/present";
import { DRIVE_URL_ERROR, isGoogleDriveUrl } from "@/lib/drive-url";
import { notifySlack } from "@/lib/slack";
import { slackStageMessage } from "@/lib/slack-message";
import { CANONICAL_STATUS, stageFromMondayStatus } from "@/lib/status-map";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const deal = await prisma.deal.findUnique({
    where: { id },
    include: {
      contact: true,
      assignedTo: { select: { id: true, name: true } },
      notes: { orderBy: { createdAt: "desc" }, include: { author: { select: { name: true } } } },
      files: { orderBy: { uploadedAt: "desc" } },
      checklistItems: { orderBy: { sortOrder: "asc" } },
      worksheetEntries: {
        orderBy: { sortOrder: "asc" },
        include: { employee: { select: { id: true, name: true } } },
      },
      reimbursementVendors: {
        orderBy: { sortOrder: "asc" },
        include: { items: { orderBy: { sortOrder: "asc" } } },
      },
      additionalCharges: { orderBy: { sortOrder: "asc" } },
    },
  });
  if (!deal) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const siblings = await prisma.deal.findMany({
    where: { contactId: deal.contactId, NOT: { id: deal.id } },
    include: { contact: true },
    orderBy: { updatedAt: "desc" },
  });
  const presented = presentDeal(deal);
  const allDeals = await prisma.deal.findMany({ include: { contact: true } });
  const problems = findDataProblems(allDeals).filter((problem) => problem.dealId === deal.id);
  return NextResponse.json({
    ...presented,
    problems,
    relatedDeals: siblings.map((sibling) => {
      const shown = presentDeal(sibling);
      return {
        id: sibling.id,
        displayName: shown.displayName,
        stage: sibling.stage,
        subStatus: shown.subStatus,
      };
    }),
  });
}

const updateDealSchema = z.object({
  stage: z
    .enum(["NEW_LEAD", "CONTACTED", "CONSULTATION", "IN_PROGRESS", "CLOSED", "UNQUALIFIED", "DEAD"])
    .optional(),
  subStatus: z.string().nullable().optional(),
  title: z.string().nullable().optional(),
  serviceType: z
    .enum(["ORGANIZING", "RELOCATION", "HOME_MANAGEMENT", "HOLIDAY_BOX", "MAINTENANCE", "OTHER"])
    .nullable()
    .optional(),
  detailsOfProject: z.string().nullable().optional(),
  source: z
    .enum(["SOCIAL_MEDIA", "REFERRAL", "MAGAZINE", "ONLINE_AD", "GOOGLE", "FRIEND", "WEBSITE", "OTHER", "UNKNOWN"])
    .optional(),
  sourceDetail: z.string().nullable().optional(),
  estimatedDealValue: z.number().nullable().optional(),
  closedDealValue: z.number().nullable().optional(),
  consultFee: z.number().nullable().optional(),
  consultDate: z.string().nullable().optional(),
  projectStartDate: z.string().nullable().optional(),
  dateClosed: z.string().nullable().optional(),
  assignedToId: z.string().nullable().optional(),
  invoiceNumber: z.string().nullable().optional(),
  invoiceLink: z.string().nullable().optional(),
  consultInvoiceNumber: z.string().nullable().optional(),
  consultInvoiceLink: z.string().nullable().optional(),
  worksheetNotes: z.string().nullable().optional(),
  projectNotes: z.string().nullable().optional(),
  driveFolderUrl: z.string().nullable().optional(),
  worksheetUrl: z.string().nullable().optional(),
  proposalUrl: z.string().nullable().optional(),
  contractUrl: z.string().nullable().optional(),
  invoicePdfUrl: z.string().nullable().optional(),
  shannonApproval: z.string().optional(),
});

export async function PATCH(req: NextRequest, { params }: Params) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await req.json().catch(() => null);
  const parsed = updateDealSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const {
    consultDate,
    projectStartDate,
    dateClosed,
    stage: requestedStage,
    subStatus: requestedSubStatus,
    shannonApproval,
    ...rest
  } = parsed.data;

  const textKeys = [
    "title",
    "detailsOfProject",
    "sourceDetail",
    "invoiceNumber",
    "invoiceLink",
    "consultInvoiceNumber",
    "consultInvoiceLink",
    "worksheetNotes",
    "projectNotes",
    "driveFolderUrl",
    "worksheetUrl",
    "proposalUrl",
    "contractUrl",
    "invoicePdfUrl",
  ] as const;

  const existing = await prisma.deal.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  let stage = requestedStage;
  let subStatus = requestedSubStatus;
  for (const key of textKeys) {
    if (rest[key] === undefined) continue;
    rest[key] = preserveStoredText(rest[key], existing[key]);
  }
  if (subStatus !== undefined) subStatus = preserveStoredText(subStatus, existing.subStatus);
  if (subStatus) {
    const mapped = stageFromMondayStatus(subStatus);
    if (mapped) stage = mapped;
  }

  if (stage && stage !== existing.stage && requestedSubStatus === undefined) {
    const current = stageFromMondayStatus(existing.subStatus);
    if (current !== stage) subStatus = CANONICAL_STATUS[stage];
  }

  const financialChanging = FINANCIAL_FIELDS.some(
    (field) => rest[field] !== undefined && valuesDiffer(field, existing[field], rest[field]),
  );
  const blocked = financialEditError({ role: session.role, approval: shannonApproval, changing: financialChanging });
  if (blocked) return NextResponse.json({ error: blocked.error }, { status: blocked.status });
  if (rest.driveFolderUrl && !isGoogleDriveUrl(rest.driveFolderUrl)) {
    return NextResponse.json({ error: DRIVE_URL_ERROR }, { status: 400 });
  }

  const changes: { field: string; value: unknown; previous: unknown }[] = [];
  for (const [field, value] of Object.entries(rest)) {
    if (value === undefined) continue;
    if (valuesDiffer(field, existing[field as keyof typeof existing], value)) {
      changes.push({ field, value, previous: existing[field as keyof typeof existing] });
    }
  }
  if (stage && stage !== existing.stage) changes.push({ field: "stage", value: stage, previous: existing.stage });
  if (subStatus !== undefined && valuesDiffer("subStatus", existing.subStatus, subStatus)) {
    changes.push({ field: "subStatus", value: subStatus, previous: existing.subStatus });
  }
  const dateChanges = [
    ["consultDate", consultDate],
    ["projectStartDate", projectStartDate],
    ["dateClosed", dateClosed],
  ] as const;
  for (const [field, value] of dateChanges) {
    if (value === undefined) continue;
    const parsedDate = value ? parseDateInput(value) : null;
    if (valuesDiffer(field, existing[field], parsedDate)) changes.push({ field, value: parsedDate, previous: existing[field] });
  }
  const imported = existing.importedValues && typeof existing.importedValues === "object" && !Array.isArray(existing.importedValues)
    ? (existing.importedValues as Record<string, unknown>)
    : null;
  const editedFields = nextEditedFields(
    existing.editedFields,
    imported,
    changes.map((change) => ({ field: change.field, value: change.value })),
  );

  // Closing a deal without an explicit dateClosed stamps it now, so
  // reporting on "when did this close" doesn't silently go blank.
  const stageChangingToClosed = stage === "CLOSED" && existing.stage !== "CLOSED";

  const deal = await prisma.deal.update({
    where: { id },
    data: {
      ...rest,
      stage,
      subStatus,
      consultDate: consultDate === undefined ? undefined : consultDate ? parseDateInput(consultDate) : null,
      projectStartDate:
        projectStartDate === undefined ? undefined : projectStartDate ? parseDateInput(projectStartDate) : null,
      dateClosed:
        dateClosed !== undefined
          ? dateClosed
            ? parseDateInput(dateClosed)
            : null
          : stageChangingToClosed
            ? new Date()
            : undefined,
      editedFields,
    },
    include: { contact: true, assignedTo: { select: { id: true, name: true } } },
  });

  if (changes.some((change) => change.field === "stage")) {
    await notifySlack("stage", slackStageMessage(deal, "stage")).catch(() => undefined);
  }

  for (const change of changes) {
    await logActivity(prisma, {
      userId: session.userId,
      action: change.field === "stage" ? "stage" : isFinancialField(change.field) ? "financial" : "edit",
      recordType: "deal",
      recordId: deal.id,
      field: change.field,
      oldValue: change.previous,
      newValue: change.value,
    });
  }

  return NextResponse.json(presentDeal(deal));
}
