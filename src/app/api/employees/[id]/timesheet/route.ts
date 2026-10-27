import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { redactText } from "@/lib/alias";
import { hoursBetween } from "@/lib/hours";
import { presentDeal } from "@/lib/present";

type Params = { params: Promise<{ id: string }> };

// Returns an employee's hours for a date range from both sources — manual
// TimesheetEntry rows, and WorksheetEntry rows (across all projects)
// attributed to them — valued at the EMPLOYEE's own hourlyRate, not
// whatever project-billing rate those worksheet rows carry.
export async function GET(req: NextRequest, { params }: Params) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const { searchParams } = new URL(req.url);
  const start = searchParams.get("start");
  const end = searchParams.get("end");
  if (!start || !end) {
    return NextResponse.json({ error: "start and end query params are required" }, { status: 400 });
  }
  const range = { gte: new Date(start), lte: new Date(end) };

  const employee = await prisma.employee.findUnique({ where: { id } });
  if (!employee) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const [manualEntries, worksheetEntries, hourEntries] = await Promise.all([
    prisma.timesheetEntry.findMany({
      where: { employeeId: id, date: range },
      orderBy: { date: "asc" },
    }),
    prisma.worksheetEntry.findMany({
      where: { employeeId: id, date: range },
      orderBy: { date: "asc" },
      include: {
        deal: {
          select: { id: true, title: true, contact: { select: { firstName: true, lastName: true, company: true } } },
        },
      },
    }),
    prisma.hourEntry.findMany({
      where: {
        date: range,
        OR: [{ employeeId: id }, { personName: { equals: employee.name, mode: "insensitive" } }],
      },
      orderBy: { date: "asc" },
      include: { deal: { include: { contact: true } } },
    }),
  ]);

  const manualRows = manualEntries.map((e) => ({
    id: e.id,
    date: e.date,
    hours: e.hours,
    description: e.description ? redactText(e.description) : e.description,
    source: "manual" as const,
  }));

  const worksheetRows = worksheetEntries.map((e) => ({
    id: e.id,
    date: e.date,
    hours: e.hours,
    description: redactText(e.description),
    source: "project" as const,
    dealId: e.deal.id,
    dealTitle: e.deal.title ? redactText(e.deal.title) : null,
    contactName: redactText([e.deal.contact.firstName, e.deal.contact.lastName].filter(Boolean).join(" ")),
  }));

  const hourRows = hourEntries.map((e) => {
    const hours = hoursBetween(e.startTime, e.endTime, e.breakMinutes);
    const client = e.deal ? presentDeal(e.deal).displayName : e.clientLabel ? redactText(e.clientLabel) : "";
    return {
      id: e.id,
      date: e.date,
      hours: hours ?? 0,
      description: redactText([`${e.startTime}–${e.endTime}`, e.notes].filter(Boolean).join(" · ")),
      source: "log" as const,
      clientLabel: client,
    };
  });

  const totalHours =
    manualEntries.reduce((sum, e) => sum + Number(e.hours), 0) +
    worksheetEntries.reduce((sum, e) => sum + Number(e.hours), 0) +
    hourRows.reduce((sum, e) => sum + Number(e.hours), 0);
  const totalPay = totalHours * Number(employee.hourlyRate);

  return NextResponse.json({
    employee,
    manualEntries: manualRows,
    worksheetEntries: worksheetRows,
    hourEntries: hourRows,
    totalHours,
    totalPay,
  });
}
