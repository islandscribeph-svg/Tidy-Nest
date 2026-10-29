import { NextRequest, NextResponse } from "next/server";
import { dealsToIcal } from "@/lib/ical";
import { prisma } from "@/lib/prisma";
import { secretsMatch } from "@/lib/setup-auth";

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token");
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const users = await prisma.user.findMany({ where: { calendarToken: { not: null } }, select: { calendarToken: true } });
  const match = users.find((user) => secretsMatch(token, user.calendarToken ?? undefined));
  if (!match) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const deals = await prisma.deal.findMany({ include: { contact: true } });
  return new NextResponse(dealsToIcal(deals), {
    headers: { "Content-Type": "text/calendar; charset=utf-8" },
  });
}
