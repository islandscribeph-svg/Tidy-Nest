import { prisma } from "@/lib/prisma";
import { toPlain } from "@/lib/serialize";
import { CalendarView } from "@/components/calendar-view";
import type { DealSummary } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function CalendarPage() {
  const [deals, users, employees] = await Promise.all([
    prisma.deal.findMany({
      include: { contact: true, assignedTo: { select: { id: true, name: true } } },
      orderBy: { updatedAt: "desc" },
    }),
    prisma.user.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } }),
    prisma.employee.findMany({
      select: { id: true, name: true, active: true },
      orderBy: { name: "asc" },
    }),
  ]);

  return (
    <CalendarView
      deals={toPlain(deals) as unknown as DealSummary[]}
      users={users}
      employees={employees}
    />
  );
}
