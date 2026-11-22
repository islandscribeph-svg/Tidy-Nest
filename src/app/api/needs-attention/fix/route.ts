import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth";
import { logActivity } from "@/lib/activity";
import { findDataProblems, type ProblemCode } from "@/lib/data-problems";
import { isFinancialField, nextEditedFields } from "@/lib/field-edits";
import { planAttentionFix } from "@/lib/needs-attention";
import { prisma } from "@/lib/prisma";
import { presentDeal } from "@/lib/present";

const CODES = [
  "duplicate_invoice",
  "closed_missing_value",
  "closed_missing_date",
  "closed_missing_drive",
  "missing_worksheet",
  "worksheet_name_mismatch",
  "pdf_name_mismatch",
  "died_with_invoice",
  "unparseable_date",
] as const;

const schema = z.object({
  dealId: z.string().min(1),
  code: z.enum(CODES),
  shannonApproval: z.string().optional(),
});

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "That fix could not be read." }, { status: 400 });

  const existing = await prisma.deal.findUnique({ where: { id: parsed.data.dealId }, include: { contact: true } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const stillThere = findDataProblems([existing]).some(
    (problem) => problem.dealId === existing.id && problem.code === parsed.data.code,
  );
  if (!stillThere) return NextResponse.json({ error: "That item no longer needs this fix." }, { status: 400 });

  const plan = planAttentionFix({
    code: parsed.data.code as ProblemCode,
    role: session.role,
    approval: parsed.data.shannonApproval,
    projectStartDate: existing.projectStartDate,
    consultDate: existing.consultDate,
  });
  if (!plan.ok) return NextResponse.json({ error: plan.error }, { status: plan.status });

  const previous = plan.field === "dateClosed" ? existing.dateClosed : existing.invoiceNumber;
  const imported =
    existing.importedValues && typeof existing.importedValues === "object" && !Array.isArray(existing.importedValues)
      ? (existing.importedValues as Record<string, unknown>)
      : null;
  const editedFields = nextEditedFields(existing.editedFields, imported, [{ field: plan.field, value: plan.value }]);

  const deal = await prisma.deal.update({
    where: { id: existing.id },
    data: { [plan.field]: plan.value, editedFields },
    include: { contact: true, assignedTo: { select: { id: true, name: true } } },
  });
  await logActivity(prisma, {
    userId: session.userId,
    action: isFinancialField(plan.field) ? "financial" : "edit",
    recordType: "deal",
    recordId: deal.id,
    field: plan.field,
    oldValue: previous,
    newValue: plan.value,
  });
  return NextResponse.json(presentDeal(deal));
}
