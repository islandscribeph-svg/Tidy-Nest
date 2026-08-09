import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

type Params = { params: Promise<{ id: string }> };

const schema = z.object({
  description: z.string().min(1),
  amount: z.number(),
});

export async function POST(req: NextRequest, { params }: Params) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid charge" }, { status: 400 });

  const count = await prisma.additionalCharge.count({ where: { dealId: id } });
  const charge = await prisma.additionalCharge.create({
    data: { dealId: id, ...parsed.data, sortOrder: count },
  });
  return NextResponse.json(charge, { status: 201 });
}
