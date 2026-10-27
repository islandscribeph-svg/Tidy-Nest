import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { dateOnlyToUtcNoon } from "@/lib/eastern-time";
import { hoursBetween } from "@/lib/hours";
import { presentDeal } from "@/lib/present";
import { redactText } from "@/lib/alias";

type Params = { params: Promise<{ id: string }> };

const patchSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  personName: z.string().trim().min(1).optional(),
  dealId: z.string().trim().nullable().optional(),
  startTime: z.string().trim().min(1).optional(),
  endTime: z.string().trim().min(1).optional(),
  breakMinutes: z.number().int().min(0).optional(),
  notes: z.string().nullable().optional(),
});

function serialize(entry: {
  id: string;
  date: Date;
  personName: string;
  employeeId: string | null;
  dealId: string | null;
  clientLabel: string | null;
  startTime: string;
  endTime: string;
  breakMinutes: number;
  notes: string | null;
  deal?: { contact: { firstName: string; lastName: string | null; company: string | null }; title: string | null } | null;
}) {
  const clientLabel = entry.deal
    ? presentDeal(entry.deal).displayName
    : entry.clientLabel
      ? redactText(entry.clientLabel)
      : null;
  return {
    id: entry.id,
    date: entry.date.toISOString(),
    personName: redactText(entry.personName),
    employeeId: entry.employeeId,
    dealId: entry.dealId,
    clientLabel,
    startTime: entry.startTime,
    endTime: entry.endTime,
    breakMinutes: entry.breakMinutes,
    notes: entry.notes ? redactText(entry.notes) : null,
    hours: hoursBetween(entry.startTime, entry.endTime, entry.breakMinutes),
  };
}

const includeDeal = { deal: { include: { contact: true } } } as const;

export async function PATCH(req: NextRequest, { params }: Params) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const existing = await prisma.hourEntry.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const parsed = patchSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid hours entry" }, { status: 400 });

  const startTime = parsed.data.startTime ?? existing.startTime;
  const endTime = parsed.data.endTime ?? existing.endTime;
  const breakMinutes = parsed.data.breakMinutes ?? existing.breakMinutes;
  if (hoursBetween(startTime, endTime, breakMinutes) == null) {
    return NextResponse.json({ error: "Start, end, and break must be a valid clock range." }, { status: 400 });
  }

  const personName = parsed.data.personName?.trim() ?? existing.personName;
  const employee = await prisma.employee.findFirst({
    where: { name: { equals: personName, mode: "insensitive" } },
  });

  let dealId = existing.dealId;
  if (parsed.data.dealId !== undefined) dealId = parsed.data.dealId || null;
  const deal = dealId ? await prisma.deal.findUnique({ where: { id: dealId }, include: { contact: true } }) : null;
  if (dealId && !deal) return NextResponse.json({ error: "That project was not found." }, { status: 400 });

  const entry = await prisma.hourEntry.update({
    where: { id },
    data: {
      date: parsed.data.date ? dateOnlyToUtcNoon(parsed.data.date) : undefined,
      personName,
      employeeId: employee?.id ?? null,
      dealId,
      clientLabel: deal ? presentDeal(deal).displayName : dealId ? existing.clientLabel : null,
      startTime,
      endTime,
      breakMinutes,
      notes: parsed.data.notes === undefined ? undefined : parsed.data.notes?.trim() || null,
    },
    include: includeDeal,
  });

  return NextResponse.json(serialize(entry));
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  await prisma.hourEntry.delete({ where: { id } }).catch(() => null);
  return NextResponse.json({ ok: true });
}
