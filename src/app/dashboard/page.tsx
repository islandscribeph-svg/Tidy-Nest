import { prisma } from "@/lib/prisma";
import { presentDeal } from "@/lib/present";
import { defaultDashboardFilters } from "@/lib/pipeline";
import { DashboardView } from "@/components/dashboard-view";
import type { DealSummary } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const deals = await prisma.deal.findMany({
    include: { contact: true, assignedTo: { select: { id: true, name: true } } },
    orderBy: { createdAt: "desc" },
  });

  return (
    <DashboardView
      deals={deals.map((deal) => presentDeal(deal)) as unknown as DealSummary[]}
      initialFilters={defaultDashboardFilters()}
    />
  );
}
