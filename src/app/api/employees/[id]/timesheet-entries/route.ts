import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

type Params = { params: Promise<{ id: string }> };

const schema = z.object({
  date: z.string(),
  hours: z.number().min(0),
  description: z.string().optional(),
});

export async function POST(req: NextRequest, { params }: Params) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid timesheet entry" }, { status: 400 });

  const entry = await prisma.timesheetEntry.create({
    data: {
      employeeId: id,
      date: new Date(parsed.data.date),
      hours: parsed.data.hours,
      description: parsed.data.description,
    },
  });
  return NextResponse.json(entry, { status: 201 });
}
