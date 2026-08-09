import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

type Params = { params: Promise<{ id: string }> };

const schema = z.object({
  vendorName: z.string().min(1).optional(),
  shippingFee: z.number().min(0).optional(),
  salesTax: z.number().min(0).optional(),
});

export async function PATCH(req: NextRequest, { params }: Params) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid update" }, { status: 400 });

  const vendor = await prisma.reimbursementVendor.update({
    where: { id },
    data: parsed.data,
    include: { items: true },
  });
  return NextResponse.json(vendor);
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  await prisma.reimbursementItem.deleteMany({ where: { vendorId: id } });
  await prisma.reimbursementVendor.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
