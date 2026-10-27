import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { STAGE_LABELS, SERVICE_TYPE_LABELS, SOURCE_LABELS, matchesDashboardFilters, DashboardFilters } from "@/lib/pipeline";
import { presentDeal } from "@/lib/present";
import { formatCalendarDate, formatEasternDateTime } from "@/lib/eastern-time";
import { redactText } from "@/lib/alias";

function csvEscape(value: unknown): string {
  if (value === null || value === undefined) return "";
  const str = String(value);
  if (/[",\n]/.test(str)) return `"${str.replace(/"/g, '""')}"`;
  return str;
}

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

  const deals = allDeals
    .map((deal) => presentDeal(deal))
    .filter((d) =>
      matchesDashboardFilters(
        {
          title: d.title,
          displayName: d.displayName,
          dateClosed: d.dateClosed,
          projectStartDate: d.projectStartDate,
          consultDate: d.consultDate,
          contact: d.contact,
        },
        filters,
      ),
    );

  const headers = [
    "Display Name",
    "First Name",
    "Last Name",
    "Email",
    "Phone",
    "Stage",
    "Sub-Status",
    "Service Type",
    "Source",
    "Source Detail",
    "Project Title",
    "Estimated Deal Value",
    "Closed Deal Value",
    "Consult Date",
    "Project Start Date",
    "Date Closed",
    "Assigned To",
    "Created At",
  ];

  const rows = deals.map((d) => [
    d.displayName,
    d.contact.firstName,
    d.contact.lastName,
    d.contact.email,
    d.contact.phone,
    STAGE_LABELS[d.stage],
    redactText(d.subStatus),
    d.serviceType ? SERVICE_TYPE_LABELS[d.serviceType] : "",
    SOURCE_LABELS[d.source],
    d.sourceDetail,
    d.title,
    d.estimatedDealValue?.toString() ?? "",
    d.closedDealValue?.toString() ?? "",
    formatCalendarDate(d.consultDate) ?? "",
    formatCalendarDate(d.projectStartDate) ?? "",
    formatCalendarDate(d.dateClosed) ?? "",
    d.assignedTo?.name ? redactText(d.assignedTo.name) : "",
    formatEasternDateTime(d.createdAt) ?? "",
  ]);

  const csv = [headers, ...rows].map((row) => row.map(csvEscape).join(",")).join("\n");

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="tidy-nest-deals-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
}
