import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { STAGE_LABELS, SERVICE_TYPE_LABELS, SOURCE_LABELS } from "@/lib/pipeline";

function csvEscape(value: unknown): string {
  if (value === null || value === undefined) return "";
  const str = String(value);
  if (/[",\n]/.test(str)) return `"${str.replace(/"/g, '""')}"`;
  return str;
}

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const deals = await prisma.deal.findMany({
    include: { contact: true, assignedTo: { select: { name: true } } },
    orderBy: { createdAt: "desc" },
  });

  const headers = [
    "First Name",
    "Last Name",
    "Email",
    "Phone",
    "Stage",
    "Sub-Status",
    "Service Type",
    "Source",
    "Source Detail",
    "Subject",
    "Estimated Deal Value",
    "Closed Deal Value",
    "Consult Date",
    "Project Start Date",
    "Date Closed",
    "Assigned To",
    "Created At",
  ];

  const rows = deals.map((d) => [
    d.contact.firstName,
    d.contact.lastName,
    d.contact.email,
    d.contact.phone,
    STAGE_LABELS[d.stage],
    d.subStatus,
    d.serviceType ? SERVICE_TYPE_LABELS[d.serviceType] : "",
    SOURCE_LABELS[d.source],
    d.sourceDetail,
    d.subject,
    d.estimatedDealValue?.toString() ?? "",
    d.closedDealValue?.toString() ?? "",
    d.consultDate?.toISOString().slice(0, 10) ?? "",
    d.projectStartDate?.toISOString().slice(0, 10) ?? "",
    d.dateClosed?.toISOString().slice(0, 10) ?? "",
    d.assignedTo?.name ?? "",
    d.createdAt.toISOString().slice(0, 10),
  ]);

  const csv = [headers, ...rows].map((row) => row.map(csvEscape).join(",")).join("\n");

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="tidy-nest-deals-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
}
