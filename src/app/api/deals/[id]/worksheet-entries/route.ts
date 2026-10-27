import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { presentClientJson } from "@/lib/present";

type Params = { params: Promise<{ id: string }> };

const schema = z.object({
  description: z.string().min(1),
  hours: z.number().min(0),
  rate: z.number().min(0),
  employeeId: z.string().nullable().optional(),
  date: z.string().nullable().optional(),
});

export async function POST(req: NextRequest, { params }: Params) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid worksheet entry" }, { status: 400 });

  const { date, ...rest } = parsed.data;
  const count = await prisma.worksheetEntry.count({ where: { dealId: id } });
  const entry = await prisma.worksheetEntry.create({
    data: { dealId: id, ...rest, date: date ? new Date(date) : null, sortOrder: count },
    include: { employee: { select: { id: true, name: true } } },
  });
  return NextResponse.json(presentClientJson(entry), { status: 201 });
}
