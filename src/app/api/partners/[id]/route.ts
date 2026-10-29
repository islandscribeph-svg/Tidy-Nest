import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth";
import { logActivity } from "@/lib/activity";
import { isMaskedEmail, preserveStoredText } from "@/lib/alias";
import { presentClientJson } from "@/lib/present";
import { prisma } from "@/lib/prisma";

type Params = { params: Promise<{ id: string }> };

const schema = z.object({
  name: z.string().trim().min(1).optional(),
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

export async function PATCH(req: NextRequest, { params }: Params) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const existing = await prisma.partner.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const { dealIds, contactIds, ...data } = parsed.data;
  if (data.name) data.name = preserveStoredText(data.name, existing.name) ?? data.name;
  if (data.email) data.email = preserveStoredText(data.email, existing.email) ?? data.email;
  if (data.notes) data.notes = preserveStoredText(data.notes, existing.notes);
  const partner = await prisma.partner.update({ where: { id }, data });
  if (dealIds || contactIds) {
    await prisma.partnerLink.deleteMany({ where: { partnerId: id } });
    await prisma.partnerLink.createMany({
      data: [
        ...(dealIds ?? []).map((dealId) => ({ partnerId: id, dealId })),
        ...(contactIds ?? []).map((contactId) => ({ partnerId: id, contactId })),
      ],
    });
  }
  await logActivity(prisma, {
    userId: session.userId,
    action: "edit",
    recordType: "partner",
    recordId: id,
    field: "name",
    oldValue: existing.name,
    newValue: partner.name,
  });
  return NextResponse.json(presentClientJson(partner));
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const existing = await prisma.partner.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
  await prisma.partner.delete({ where: { id } });
  await logActivity(prisma, { userId: session.userId, action: "edit", recordType: "partner", recordId: id, field: "name", oldValue: existing.name, newValue: "deleted" });
  return NextResponse.json({ ok: true });
}
