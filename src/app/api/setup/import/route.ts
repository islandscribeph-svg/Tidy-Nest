import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkSetupKey } from "@/lib/setup-auth";
import { corsJson, corsPreflight } from "@/lib/cors";
import { parseMondayWorkbook, summarizeMondayRecords, importMondayRecords } from "@/lib/monday-import";

// One-time bootstrap endpoint: imports the legacy Monday.com export.
// Self-disables once any Deal exists, so re-running it (or leaving it
// deployed) can't create duplicate deals.
export async function OPTIONS() {
  return corsPreflight();
}

export async function POST(req: NextRequest) {
  if (!checkSetupKey(req)) {
    return corsJson({ error: "Unauthorized" }, { status: 401 });
  }

  const existingDeals = await prisma.deal.count();
  if (existingDeals > 0) {
    return corsJson({ error: "Import already completed — deals already exist." }, { status: 409 });
  }

  const form = await req.formData().catch(() => null);
  const file = form?.get("file");
  if (!file || typeof file === "string") {
    return corsJson({ error: "Missing 'file' field (multipart form-data)" }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const records = await parseMondayWorkbook(buffer);
  const summary = summarizeMondayRecords(records);
  const result = await importMondayRecords(prisma, records);

  return corsJson({ summary, result }, { status: 201 });
}
