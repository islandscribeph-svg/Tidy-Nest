import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { dateOnlyToUtcNoon } from "@/lib/eastern-time";
import { hoursBetween } from "@/lib/hours";
import { presentClientJson, presentDeal } from "@/lib/present";
import { redactText } from "@/lib/alias";

const writeSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  personName: z.string().trim().min(1),
  dealId: z.string().trim().nullable().optional(),
  startTime: z.string().trim().min(1),
  endTime: z.string().trim().min(1),
  breakMinutes: z.number().int().min(0).optional(),
  notes: z.string().nullable().optional(),
});

async function requireSession() {
  const session = await getSession();
  if (!session) return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  return { session };
}

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
  deal?: { contact: { firstName: string; lastName: string | null; company: string | null }; title: string | null; worksheetFileName?: string | null; projectNotes?: string | null; projectDateTimeText?: string | null } | null;
}) {
  const clientLabel = entry.deal
    ? presentDeal(entry.deal).displayName
    : entry.clientLabel
      ? redactText(entry.clientLabel)
      : null;
  return presentClientJson({
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
  });
}

const includeDeal = { deal: { include: { contact: true } } } as const;

export async function GET() {
  const { error } = await requireSession();
  if (error) return error;

  const entries = await prisma.hourEntry.findMany({
    include: includeDeal,
    orderBy: [{ date: "desc" }, { startTime: "asc" }],
  });
  return NextResponse.json({ entries: entries.map((entry) => serialize(entry)) });
}

export async function POST(req: NextRequest) {
  const { error } = await requireSession();
  if (error) return error;

  const parsed = writeSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid hours entry" }, { status: 400 });

  const breakMinutes = parsed.data.breakMinutes ?? 0;
  const hours = hoursBetween(parsed.data.startTime, parsed.data.endTime, breakMinutes);
  if (hours == null) {
    return NextResponse.json({ error: "Start, end, and break must be a valid clock range." }, { status: 400 });
  }

  const dealId = parsed.data.dealId || null;
  const deal = dealId
    ? await prisma.deal.findUnique({ where: { id: dealId }, include: { contact: true } })
    : null;
  if (dealId && !deal) return NextResponse.json({ error: "That project was not found." }, { status: 400 });

  const personName = parsed.data.personName.trim();
  const employee = await prisma.employee.findFirst({
    where: { name: { equals: personName, mode: "insensitive" } },
  });

  const entry = await prisma.hourEntry.create({
    data: {
      date: dateOnlyToUtcNoon(parsed.data.date),
      personName,
      employeeId: employee?.id ?? null,
      dealId,
      clientLabel: deal ? presentDeal(deal).displayName : null,
      startTime: parsed.data.startTime,
      endTime: parsed.data.endTime,
      breakMinutes,
      notes: parsed.data.notes?.trim() || null,
    },
    include: includeDeal,
  });

  return NextResponse.json(serialize(entry), { status: 201 });
}
