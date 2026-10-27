import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { preserveStoredText } from "@/lib/alias";
import { presentClientJson } from "@/lib/present";

type Params = { params: Promise<{ id: string }> };

const schema = z.object({
  date: z.string().optional(),
  hours: z.number().min(0).optional(),
  description: z.string().nullable().optional(),
});

export async function PATCH(req: NextRequest, { params }: Params) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid update" }, { status: 400 });

  const existing = await prisma.timesheetEntry.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const { date, ...rest } = parsed.data;
  const entry = await prisma.timesheetEntry.update({
    where: { id },
    data: {
      ...rest,
      description:
        rest.description === undefined ? undefined : preserveStoredText(rest.description, existing.description),
      date: date ? new Date(date) : undefined,
    },
  });
  return NextResponse.json(presentClientJson(entry));
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  await prisma.timesheetEntry.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
