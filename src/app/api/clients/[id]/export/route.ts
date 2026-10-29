import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { buildClientReport, clientReportCsv } from "@/lib/client-report";
import { findDataProblems } from "@/lib/data-problems";
import { prisma } from "@/lib/prisma";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const [contact, allDeals] = await Promise.all([
    prisma.contact.findUnique({ where: { id }, include: { deals: true } }),
    prisma.deal.findMany({ include: { contact: true } }),
  ]);
  if (!contact) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const ownIds = new Set(contact.deals.map((deal) => deal.id));
  const problemDealIds = findDataProblems(allDeals)
    .map((problem) => problem.dealId)
    .filter((dealId) => ownIds.has(dealId));
  const csv = clientReportCsv(buildClientReport({ contact, deals: contact.deals, problemDealIds }));

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="client-report.csv"',
    },
  });
}
