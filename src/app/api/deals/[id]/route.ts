import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

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
      projects: { include: { tasks: { orderBy: { sortOrder: "asc" } } } },
    },
  });
  if (!deal) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(deal);
}

const updateDealSchema = z.object({
  stage: z
    .enum(["NEW_LEAD", "CONTACTED", "CONSULTATION", "IN_PROGRESS", "CLOSED", "UNQUALIFIED", "DEAD"])
    .optional(),
  subStatus: z.string().nullable().optional(),
  subject: z.string().nullable().optional(),
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

  const { consultDate, projectStartDate, dateClosed, ...rest } = parsed.data;

  const existing = await prisma.deal.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Closing a deal without an explicit dateClosed stamps it now, so
  // reporting on "when did this close" doesn't silently go blank.
  const stageChangingToClosed = parsed.data.stage === "CLOSED" && existing.stage !== "CLOSED";

  const deal = await prisma.deal.update({
    where: { id },
    data: {
      ...rest,
      consultDate: consultDate === undefined ? undefined : consultDate ? new Date(consultDate) : null,
      projectStartDate:
        projectStartDate === undefined ? undefined : projectStartDate ? new Date(projectStartDate) : null,
      dateClosed:
        dateClosed !== undefined
          ? dateClosed
            ? new Date(dateClosed)
            : null
          : stageChangingToClosed
            ? new Date()
            : undefined,
    },
    include: { contact: true, assignedTo: { select: { id: true, name: true } } },
  });

  // Moving into IN_PROGRESS starts the project-tracking side of the tool.
  if (parsed.data.stage === "IN_PROGRESS" && existing.stage !== "IN_PROGRESS") {
    const hasProject = await prisma.project.findFirst({ where: { dealId: id } });
    if (!hasProject) {
      await prisma.project.create({ data: { dealId: id } });
    }
  }

  return NextResponse.json(deal);
}
