import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth";
import { logActivity } from "@/lib/activity";
import { isMaskedEmail } from "@/lib/alias";
import { presentClientJson } from "@/lib/present";
import { prisma } from "@/lib/prisma";

const schema = z.object({
  name: z.string().trim().min(1),
  kind: z.enum(["VENDOR", "SUPPLIER", "PARTNER"]).optional(),
  contactName: z.string().nullable().optional(),
  email: z.string().refine((value) => !value || z.string().email().safeParse(value).success || isMaskedEmail(value)).nullable().optional(),
  phone: z.string().nullable().optional(),
  website: z.string().nullable().optional(),
  address: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
  status: z.enum(["ACTIVE", "INACTIVE"]).optional(),
  tags: z.array(z.string()).optional(),
  driveUrl: z.string().nullable().optional(),
  slackUrl: z.string().nullable().optional(),
  dealIds: z.array(z.string()).optional(),
  contactIds: z.array(z.string()).optional(),
});

const include = { links: true } as const;

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const partners = await prisma.partner.findMany({ include, orderBy: { name: "asc" } });
  return NextResponse.json(presentClientJson(partners));
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const { dealIds = [], contactIds = [], ...data } = parsed.data;
  const partner = await prisma.partner.create({
    data: {
      ...data,
      email: data.email || null,
      links: {
        create: [
          ...dealIds.map((dealId) => ({ dealId })),
          ...contactIds.map((contactId) => ({ contactId })),
        ],
      },
    },
    include,
  });
  await logActivity(prisma, { userId: session.userId, action: "edit", recordType: "partner", recordId: partner.id, field: "name", newValue: partner.name });
  return NextResponse.json(presentClientJson(partner), { status: 201 });
}
