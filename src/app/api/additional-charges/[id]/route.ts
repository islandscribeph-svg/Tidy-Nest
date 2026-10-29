import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { preserveStoredText } from "@/lib/alias";
import { presentClientJson } from "@/lib/present";

type Params = { params: Promise<{ id: string }> };

const schema = z.object({
  description: z.string().min(1).optional(),
  amount: z.number().optional(),
});

export async function PATCH(req: NextRequest, { params }: Params) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid update" }, { status: 400 });

  const existing = await prisma.additionalCharge.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const charge = await prisma.additionalCharge.update({
    where: { id },
    data: {
      ...parsed.data,
      description:
        parsed.data.description === undefined
          ? undefined
          : preserveStoredText(parsed.data.description, existing.description) ?? parsed.data.description,
    },
  });
  return NextResponse.json(presentClientJson(charge));
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  await prisma.additionalCharge.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
