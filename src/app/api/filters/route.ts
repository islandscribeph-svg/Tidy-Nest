import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth";
import { isFilterPage } from "@/lib/filter-presets";
import { logActivity } from "@/lib/activity";
import { presentClientJson } from "@/lib/present";
import { prisma } from "@/lib/prisma";

const createSchema = z.object({
  page: z.string(),
  name: z.string().trim().min(1).max(80),
  query: z.record(z.string(), z.string()),
});

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const page = req.nextUrl.searchParams.get("page") ?? "";
  if (!isFilterPage(page)) return NextResponse.json({ error: "Unknown page" }, { status: 400 });
  const filters = await prisma.savedFilter.findMany({
    where: { userId: session.userId, page },
    orderBy: { name: "asc" },
  });
  return NextResponse.json(presentClientJson(filters));
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const parsed = createSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success || !isFilterPage(parsed.data.page)) {
    return NextResponse.json({ error: "Invalid filter" }, { status: 400 });
  }
  const saved = await prisma.savedFilter.upsert({
    where: { userId_page_name: { userId: session.userId, page: parsed.data.page, name: parsed.data.name } },
    update: { query: parsed.data.query },
    create: { userId: session.userId, page: parsed.data.page, name: parsed.data.name, query: parsed.data.query },
  });
  await logActivity(prisma, {
    userId: session.userId,
    action: "filter",
    recordType: "filter",
    recordId: saved.id,
    field: "name",
    newValue: saved.name,
  });
  return NextResponse.json(presentClientJson(saved), { status: 201 });
}
