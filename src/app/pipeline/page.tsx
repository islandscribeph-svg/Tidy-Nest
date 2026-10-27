import { prisma } from "@/lib/prisma";
import { presentDeal } from "@/lib/present";
import { PipelineBoard } from "@/components/pipeline-board";
import type { DealSummary } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function PipelinePage({ searchParams }: { searchParams: Promise<{ deal?: string }> }) {
  const { deal: selectedDeal } = await searchParams;
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
        initialDeals={deals.map((deal) => presentDeal(deal)) as unknown as DealSummary[]}
        initialDealId={selectedDeal ?? null}
        users={users}
        employees={employees}
      />
    </div>
  );
}
