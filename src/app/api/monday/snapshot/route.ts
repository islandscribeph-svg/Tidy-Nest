import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { importSnapshotFile, importSnapshotJson } from "@/lib/monday/import-snapshot";

const CONFIRM_TEXT = "REPLACE";

async function requireAdmin() {
  const session = await getSession();
  if (!session) return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  if (session.role !== "ADMIN") return { error: NextResponse.json({ error: "Admin only" }, { status: 403 }) };
  return { session };
}

export async function POST(req: NextRequest) {
  const { error } = await requireAdmin();
  if (error) return error;

  const contentType = req.headers.get("content-type") ?? "";
  try {
    if (contentType.includes("multipart/form-data")) {
      const form = await req.formData();
      if (form.get("confirm") !== CONFIRM_TEXT) {
        return NextResponse.json({ error: `Type ${CONFIRM_TEXT} to replace the current projects.` }, { status: 400 });
      }
      const file = form.get("file");
      if (!(file instanceof File)) return NextResponse.json({ error: "Choose a snapshot JSON file." }, { status: 400 });
      const text = await file.text();
      let raw: unknown;
      try {
        raw = JSON.parse(text) as unknown;
      } catch {
        return NextResponse.json({ error: "That file is not JSON." }, { status: 400 });
      }
      const result = await importSnapshotJson(prisma, raw);
      return NextResponse.json(result);
    }

    const body = (await req.json().catch(() => null)) as { confirm?: string; source?: string } | null;
    if (body?.confirm !== CONFIRM_TEXT) {
      return NextResponse.json({ error: `Type ${CONFIRM_TEXT} to replace the current projects.` }, { status: 400 });
    }
    if (body.source !== "env") {
      return NextResponse.json({ error: "Load the snapshot configured on the server, or upload a JSON file." }, { status: 400 });
    }
    const filePath = process.env.MONDAY_SNAPSHOT_PATH?.trim();
    if (!filePath) {
      return NextResponse.json({ error: "MONDAY_SNAPSHOT_PATH is not set on the server." }, { status: 400 });
    }
    const result = await importSnapshotFile(prisma, filePath, {
      allowSampleFixture: process.env.SANDBOX_ALLOW_FIXTURE === "1",
    });
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Snapshot import failed.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
