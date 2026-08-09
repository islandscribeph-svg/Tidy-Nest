import { prisma } from "@/lib/prisma";
import { toPlain } from "@/lib/serialize";
import { PipelineBoard } from "@/components/pipeline-board";
import type { DealSummary } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function PipelinePage() {
  const [deals, users] = await Promise.all([
    prisma.deal.findMany({
      include: { contact: true, assignedTo: { select: { id: true, name: true } } },
      orderBy: { updatedAt: "desc" },
    }),
    prisma.user.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } }),
  ]);

  return (
    <div className="flex h-full flex-col">
      <PipelineBoard initialDeals={toPlain(deals) as unknown as DealSummary[]} users={users} />
    </div>
  );
}
