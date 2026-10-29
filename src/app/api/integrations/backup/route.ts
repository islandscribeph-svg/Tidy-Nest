import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { logActivity } from "@/lib/activity";
import { backupSheets, writeBackup } from "@/lib/google-backup";
import { sheetsBackupStatus } from "@/lib/integrations";
import { prisma } from "@/lib/prisma";
import { secretsMatch } from "@/lib/setup-auth";

export async function POST(req: NextRequest) {
  const session = await getSession();
  const cron = secretsMatch(req.headers.get("x-backup-key"), process.env.BACKUP_CRON_SECRET);
  if (!session && !cron) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session && session.role !== "ADMIN") return NextResponse.json({ error: "Admin only" }, { status: 403 });
  const status = sheetsBackupStatus();
  if (!status.enabled) return NextResponse.json({ error: status.detail, configured: status.configured }, { status: 400 });
  try {
    const sheets = await backupSheets();
    await writeBackup(sheets);
    await prisma.syncRun.create({
      data: { source: "google-sheets", status: "success", finishedAt: new Date(), itemCount: sheets.reduce((sum, sheet) => sum + sheet.rows.length, 0), message: "Backup written." },
    });
    if (session) await logActivity(prisma, { userId: session.userId, action: "export", recordType: "backup", field: "google-sheets", newValue: "success" });
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Backup failed.";
    await prisma.syncRun.create({ data: { source: "google-sheets", status: "error", finishedAt: new Date(), message } });
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
