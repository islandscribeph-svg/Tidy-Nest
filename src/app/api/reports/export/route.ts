import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { matchesDashboardFilters, type DashboardFilters } from "@/lib/pipeline";
import { presentDeal } from "@/lib/present";
import { pipelineSheet, sheetCsv } from "@/lib/exports";
import { sheetToXlsx } from "@/lib/sheet";

function parseFilters(url: URL): DashboardFilters {
  const yearParam = url.searchParams.get("year");
  const monthParam = url.searchParams.get("month");
  return {
    year: yearParam && yearParam !== "all" ? Number(yearParam) : "all",
    month: monthParam && monthParam !== "all" ? Number(monthParam) : "all",
    contactId: url.searchParams.get("contactId") || "all",
    address: url.searchParams.get("address") || "",
    title: url.searchParams.get("title") || "",
  };
}

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const filters = parseFilters(req.nextUrl);

  const allDeals = await prisma.deal.findMany({
    include: { contact: true, assignedTo: { select: { name: true } } },
    orderBy: { createdAt: "desc" },
  });

  const deals = allDeals.filter((deal) => {
    const shown = presentDeal(deal);
    return matchesDashboardFilters(
      {
        title: shown.title,
        displayName: shown.displayName,
        dateClosed: shown.dateClosed,
        projectStartDate: shown.projectStartDate,
        consultDate: shown.consultDate,
        contact: shown.contact,
      },
      filters,
    );
  });
  const sheet = pipelineSheet(deals);
  const stamp = new Date().toISOString().slice(0, 10);
  if (req.nextUrl.searchParams.get("format") === "xlsx") {
    const body = await sheetToXlsx(sheet);
    return new NextResponse(new Uint8Array(body), {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="tidy-nest-deals-${stamp}.xlsx"`,
      },
    });
  }
  return new NextResponse(sheetCsv(sheet), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="tidy-nest-deals-${stamp}.csv"`,
    },
  });
}
