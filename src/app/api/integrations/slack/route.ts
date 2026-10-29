import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth";
import { slackStatus } from "@/lib/integrations";
import { notifySlack } from "@/lib/slack";
import { prisma } from "@/lib/prisma";
import { formatEasternDateTime } from "@/lib/eastern-time";

async function requireAdmin() {
  const session = await getSession();
  if (!session) return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  if (session.role !== "ADMIN") return { error: NextResponse.json({ error: "Admin only" }, { status: 403 }) };
  return { session };
}

export async function POST(req: NextRequest) {
  const { error } = await requireAdmin();
  if (error) return error;
  const parsed = z
    .object({
      slackNotifyLead: z.boolean().optional(),
      slackNotifyStage: z.boolean().optional(),
      test: z.boolean().optional(),
    })
    .safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid settings" }, { status: 400 });
  if (parsed.data.test && !slackStatus().enabled) {
    return NextResponse.json({ error: slackStatus().detail }, { status: 400 });
  }
  const settings = await prisma.integrationSetting.upsert({
    where: { id: "app" },
    update: {
      slackNotifyLead: parsed.data.slackNotifyLead,
      slackNotifyStage: parsed.data.slackNotifyStage,
    },
    create: {
      id: "app",
      slackNotifyLead: parsed.data.slackNotifyLead ?? true,
      slackNotifyStage: parsed.data.slackNotifyStage ?? true,
    },
  });
  if (parsed.data.test) {
    const result = await notifySlack("lead", `Tidy Nest test message. ${formatEasternDateTime(new Date()) ?? ""}.`);
    return NextResponse.json(result, { status: result.sent ? 200 : 400 });
  }
  return NextResponse.json(settings);
}
