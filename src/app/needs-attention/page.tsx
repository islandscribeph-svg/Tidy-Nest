import { prisma } from "@/lib/prisma";
import { findDataProblems } from "@/lib/data-problems";
import { getCurrentUser } from "@/lib/auth";
import { NeedsAttentionView } from "@/components/needs-attention-view";

export const dynamic = "force-dynamic";

export default async function NeedsAttentionPage({ searchParams }: { searchParams: Promise<{ type?: string }> }) {
  const { type } = await searchParams;
  const user = await getCurrentUser().catch(() => null);
  const deals = await prisma.deal.findMany({ include: { contact: true } });
  const problems = findDataProblems(deals).map((problem) => {
    const deal = deals.find((item) => item.id === problem.dealId);
    return {
      ...problem,
      canUseDate: problem.code === "closed_missing_date" && Boolean(deal?.projectStartDate || deal?.consultDate),
      canClearInvoice: problem.code === "died_with_invoice",
    };
  });
  return <NeedsAttentionView problems={problems} initialType={type ?? "all"} isAdmin={user?.role === "ADMIN"} />;
}
