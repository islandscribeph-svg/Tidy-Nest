import { prisma } from "@/lib/prisma";
import { toPlain } from "@/lib/serialize";
import { PipelineBoard } from "@/components/pipeline-board";
import type { DealSummary } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function PipelinePage() {
  const [deals, users, employees] = await Promise.all([
    prisma.deal.findMany({
      include: { contact: true, assignedTo: { select: { id: true, name: true } } },
      orderBy: { updatedAt: "desc" },
    }),
    prisma.user.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } }),
    // Not filtered to active-only: an existing worksheet row assigned to
    // someone since deactivated still needs a matching <option>, or its
    // <select> would fall back to "Unassigned" with no matching value.
    prisma.employee.findMany({
      select: { id: true, name: true, active: true },
      orderBy: { name: "asc" },
    }),
  ]);

  return (
    <div className="flex h-full flex-col">
      <PipelineBoard
        initialDeals={toPlain(deals) as unknown as DealSummary[]}
        users={users}
        employees={employees}
      />
    </div>
  );
}
