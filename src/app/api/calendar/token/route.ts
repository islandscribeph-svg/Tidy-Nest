import { randomBytes } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const revoke = (await req.json().catch(() => null))?.revoke === true;
  const calendarToken = revoke ? null : randomBytes(24).toString("hex");
  await prisma.user.update({ where: { id: session.userId }, data: { calendarToken } });
  const origin = process.env.APP_ORIGIN || "";
  const url = calendarToken ? `${origin}/api/calendar/feed?token=${calendarToken}` : null;
  return NextResponse.json({ url });
}
