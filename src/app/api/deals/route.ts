import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const deals = await prisma.deal.findMany({
    include: { contact: true, assignedTo: { select: { id: true, name: true } } },
    orderBy: { updatedAt: "desc" },
  });
  return NextResponse.json(deals);
}

const createDealSchema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().optional(),
  email: z.string().email().optional().or(z.literal("")),
  phone: z.string().optional(),
  subject: z.string().optional(),
  serviceType: z
    .enum(["ORGANIZING", "RELOCATION", "HOME_MANAGEMENT", "HOLIDAY_BOX", "MAINTENANCE", "OTHER"])
    .optional(),
  source: z
    .enum(["SOCIAL_MEDIA", "REFERRAL", "MAGAZINE", "ONLINE_AD", "GOOGLE", "FRIEND", "WEBSITE", "OTHER", "UNKNOWN"])
    .optional(),
  sourceDetail: z.string().optional(),
  detailsOfProject: z.string().optional(),
});

// Manual lead entry (staff typing in a new lead directly, one of the three
// intake paths alongside the website form webhook and email intake).
export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const parsed = createDealSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const data = parsed.data;

  const contact = await prisma.contact.create({
    data: {
      firstName: data.firstName,
      lastName: data.lastName,
      email: data.email || undefined,
      phone: data.phone,
    },
  });

  const deal = await prisma.deal.create({
    data: {
      contactId: contact.id,
      stage: "NEW_LEAD",
      subject: data.subject,
      serviceType: data.serviceType,
      source: data.source ?? "UNKNOWN",
      sourceDetail: data.sourceDetail,
      detailsOfProject: data.detailsOfProject,
    },
    include: { contact: true },
  });

  return NextResponse.json(deal, { status: 201 });
}
