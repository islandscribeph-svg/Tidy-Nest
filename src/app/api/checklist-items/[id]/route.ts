import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { preserveStoredText } from "@/lib/alias";
import { presentClientJson } from "@/lib/present";

type Params = { params: Promise<{ id: string }> };

const schema = z.object({
  label: z.string().min(1).optional(),
  done: z.boolean().optional(),
});

export async function PATCH(req: NextRequest, { params }: Params) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid update" }, { status: 400 });

  const existing = await prisma.checklistItem.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const item = await prisma.checklistItem.update({
    where: { id },
    data: {
      ...parsed.data,
      label: parsed.data.label === undefined ? undefined : preserveStoredText(parsed.data.label, existing.label) ?? parsed.data.label,
    },
  });
  return NextResponse.json(presentClientJson(item));
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  await prisma.checklistItem.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
