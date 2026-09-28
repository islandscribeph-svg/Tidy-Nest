import { prisma } from "@/lib/prisma";
import { toPlain } from "@/lib/serialize";
import { DashboardView } from "@/components/dashboard-view";
import type { DealSummary } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const deals = await prisma.deal.findMany({
    include: { contact: true, assignedTo: { select: { id: true, name: true } } },
    orderBy: { createdAt: "desc" },
  });

  return <DashboardView deals={toPlain(deals) as unknown as DealSummary[]} />;
}
