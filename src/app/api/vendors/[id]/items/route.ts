import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

type Params = { params: Promise<{ id: string }> };

const schema = z.object({
  itemDetails: z.string().min(1),
  quantity: z.number().min(0),
  unitPrice: z.number().min(0),
});

export async function POST(req: NextRequest, { params }: Params) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid line item" }, { status: 400 });

  const count = await prisma.reimbursementItem.count({ where: { vendorId: id } });
  const item = await prisma.reimbursementItem.create({
    data: { vendorId: id, ...parsed.data, sortOrder: count },
  });
  return NextResponse.json(item, { status: 201 });
}
