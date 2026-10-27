import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { preserveStoredText } from "@/lib/alias";
import { presentClientJson } from "@/lib/present";

type Params = { params: Promise<{ id: string }> };

const schema = z.object({
  description: z.string().min(1).optional(),
  hours: z.number().min(0).optional(),
  rate: z.number().min(0).optional(),
  employeeId: z.string().nullable().optional(),
  date: z.string().nullable().optional(),
});

export async function PATCH(req: NextRequest, { params }: Params) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid update" }, { status: 400 });

  const existing = await prisma.worksheetEntry.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const { date, ...rest } = parsed.data;
  const entry = await prisma.worksheetEntry.update({
    where: { id },
    data: {
      ...rest,
      description:
        rest.description === undefined ? undefined : preserveStoredText(rest.description, existing.description) ?? rest.description,
      date: date === undefined ? undefined : date ? new Date(date) : null,
    },
    include: { employee: { select: { id: true, name: true } } },
  });
  return NextResponse.json(presentClientJson(entry));
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  await prisma.worksheetEntry.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
