import { prisma } from "@/lib/prisma";
import { findDataProblems } from "@/lib/data-problems";
import { DataProblemsView } from "@/components/data-problems-view";

export const dynamic = "force-dynamic";

export default async function DataProblemsPage({ searchParams }: { searchParams: Promise<{ type?: string }> }) {
  const { type } = await searchParams;
  const deals = await prisma.deal.findMany({ include: { contact: true } });
  const problems = findDataProblems(deals);
  return <DataProblemsView problems={problems} initialType={type ?? "all"} />;
}
