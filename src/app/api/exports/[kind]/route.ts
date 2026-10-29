import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { buildClientReport } from "@/lib/client-report";
import { findDataProblems } from "@/lib/data-problems";
import { logActivity } from "@/lib/activity";
import {
  activitySheet,
  contactsSheet,
  dataProblemsSheet,
  hoursSheet,
  pipelineSheet,
  partnersSheet,
  clientReportSheet,
  sheetCsv,
} from "@/lib/exports";
import { prisma } from "@/lib/prisma";
import { sheetToXlsx, type Sheet } from "@/lib/sheet";

type Params = { params: Promise<{ kind: string }> };

const KINDS = ["pipeline", "contacts", "data-problems", "hours", "client", "activity", "partners"] as const;
type Kind = (typeof KINDS)[number];

function isKind(value: string): value is Kind {
  return (KINDS as readonly string[]).includes(value);
}

async function buildSheet(kind: Kind, url: URL): Promise<Sheet | NextResponse> {
  if (kind === "pipeline") {
    const deals = await prisma.deal.findMany({
      include: { contact: true, assignedTo: { select: { name: true } } },
      orderBy: { updatedAt: "desc" },
    });
    return pipelineSheet(deals);
  }
  if (kind === "contacts") {
    const contacts = await prisma.contact.findMany({ orderBy: { updatedAt: "desc" } });
    return contactsSheet(contacts);
  }
  if (kind === "data-problems") {
    const deals = await prisma.deal.findMany({ include: { contact: true } });
    return dataProblemsSheet(deals);
  }
  if (kind === "partners") {
    const partners = await prisma.partner.findMany({ orderBy: { name: "asc" } });
    return partnersSheet(partners);
  }
  if (kind === "hours") {
    const entries = await prisma.hourEntry.findMany({
      include: {
        deal: {
          include: { contact: { select: { firstName: true, lastName: true, company: true } } },
        },
      },
      orderBy: { date: "desc" },
    });
    return hoursSheet(entries);
  }
  const id = url.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Missing client id" }, { status: 400 });
  const [contact, allDeals] = await Promise.all([
    prisma.contact.findUnique({ where: { id }, include: { deals: true } }),
    prisma.deal.findMany({ include: { contact: true } }),
  ]);
  if (!contact) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const ownIds = new Set(contact.deals.map((deal) => deal.id));
  const problemDealIds = findDataProblems(allDeals)
    .map((problem) => problem.dealId)
    .filter((dealId) => ownIds.has(dealId));
  return clientReportSheet(buildClientReport({ contact, deals: contact.deals, problemDealIds }));
}

async function activity(url: URL): Promise<Sheet> {
  const events = await prisma.activityEvent.findMany({
    where: {
      userId: url.searchParams.get("user") || undefined,
      recordType: url.searchParams.get("record") || undefined,
      action: url.searchParams.get("type") || undefined,
    },
    include: { user: { select: { name: true } } },
    orderBy: { createdAt: "desc" },
    take: 5000,
  });
  return activitySheet(events);
}

export async function GET(req: NextRequest, { params }: Params) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { kind } = await params;
  if (!isKind(kind)) return NextResponse.json({ error: "Unknown export" }, { status: 404 });

  const built = kind === "activity" ? await activity(req.nextUrl) : await buildSheet(kind, req.nextUrl);
  if (built instanceof NextResponse) return built;
  await logActivity(prisma, {
    userId: session.userId,
    action: "export",
    recordType: "export",
    recordId: kind,
    field: "format",
    newValue: req.nextUrl.searchParams.get("format") === "xlsx" ? "xlsx" : "csv",
  });
  const format = req.nextUrl.searchParams.get("format") === "xlsx" ? "xlsx" : "csv";
  const stamp = new Date().toISOString().slice(0, 10);
  if (format === "xlsx") {
    const body = await sheetToXlsx(built);
    return new NextResponse(new Uint8Array(body), {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="tidy-nest-${kind}-${stamp}.xlsx"`,
      },
    });
  }
  return new NextResponse(sheetCsv(built), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="tidy-nest-${kind}-${stamp}.csv"`,
    },
  });
}
