import { prisma } from "@/lib/prisma";
import { slackStatus } from "@/lib/integrations";

async function settings() {
  return prisma.integrationSetting.upsert({
    where: { id: "app" },
    update: {},
    create: { id: "app" },
  });
}

export async function notifySlack(kind: "lead" | "stage", text: string) {
  const status = slackStatus();
  if (!status.enabled || !process.env.SLACK_WEBHOOK_URL) return { sent: false, reason: status.detail };
  const flags = await settings();
  if (kind === "lead" && !flags.slackNotifyLead) return { sent: false, reason: "Lead messages are off." };
  if (kind === "stage" && !flags.slackNotifyStage) return { sent: false, reason: "Stage messages are off." };
  const res = await fetch(process.env.SLACK_WEBHOOK_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text }),
  });
  if (!res.ok) return { sent: false, reason: "Slack did not accept the message." };
  return { sent: true, reason: "Sent." };
}
