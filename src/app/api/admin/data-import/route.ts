import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import {
  parseMondayWorkbook,
  summarizeMondayRecords,
  importMondayRecords,
  wipeAllDealsAndContacts,
} from "@/lib/monday-import";

// In-app version of /api/setup/reimport: same destructive wipe-and-reload,
// but gated by a normal logged-in Admin session instead of SESSION_SECRET,
// so this doesn't need the standalone setup tool once the app is live.
const CONFIRM_TEXT = "WIPE";

async function requireAdmin() {
  const session = await getSession();
  if (!session) return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  if (session.role !== "ADMIN") return { error: NextResponse.json({ error: "Admin only" }, { status: 403 }) };
  return { session };
}

export async function GET() {
  const { error } = await requireAdmin();
  if (error) return error;

  const [deals, contacts] = await Promise.all([prisma.deal.count(), prisma.contact.count()]);
  return NextResponse.json({ deals, contacts });
}

export async function POST(req: NextRequest) {
  const { error } = await requireAdmin();
  if (error) return error;

  const form = await req.formData().catch(() => null);
  const file = form?.get("file");
  const confirm = form?.get("confirm");

  if (confirm !== CONFIRM_TEXT) {
    return NextResponse.json({ error: `Type "${CONFIRM_TEXT}" in the confirm field to proceed.` }, { status: 400 });
  }
  if (!file || typeof file === "string") {
    return NextResponse.json({ error: "Missing 'file' field (multipart form-data)" }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const records = await parseMondayWorkbook(buffer);
  const summary = summarizeMondayRecords(records);

  const wiped = await wipeAllDealsAndContacts(prisma);
  const result = await importMondayRecords(prisma, records);

  return NextResponse.json({ wiped, summary, result }, { status: 201 });
}
