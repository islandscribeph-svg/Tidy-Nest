import { redirect } from "next/navigation";
import { findDataProblems } from "@/lib/data-problems";

export default async function DataProblemsPage({ searchParams }: { searchParams: Promise<{ type?: string }> }) {
  void findDataProblems;
  const { type } = await searchParams;
  redirect(type ? `/needs-attention?type=${encodeURIComponent(type)}` : "/needs-attention");
}
