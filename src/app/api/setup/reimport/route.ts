import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkSetupKey } from "@/lib/setup-auth";
import { corsJson, corsPreflight } from "@/lib/cors";
import { parseMondayWorkbook, summarizeMondayRecords, importMondayRecords } from "@/lib/monday-import";

// Destructive, repeatable reimport: wipes every Deal/Contact (and everything
// hanging off a Deal) and reloads from a fresh Monday export. Unlike the
// other /api/setup/* routes this does NOT self-disable -- that's the point,
// re-syncing from a fresh export is meant to be repeatable -- so it's gated
// by both the setup key AND a typed confirmation string, since there's no
// "already done" guard to fall back on. Employees/Users/TimesheetEntries are
// untouched (they aren't tied to Deals/Contacts).
const CONFIRM_TEXT = "WIPE";

export async function OPTIONS() {
  return corsPreflight();
}

export async function POST(req: NextRequest) {
  if (!checkSetupKey(req)) {
    return corsJson({ error: "Unauthorized" }, { status: 401 });
  }

  const form = await req.formData().catch(() => null);
  const file = form?.get("file");
  const confirm = form?.get("confirm");

  if (confirm !== CONFIRM_TEXT) {
    return corsJson({ error: `Type "${CONFIRM_TEXT}" in the confirm field to proceed.` }, { status: 400 });
  }
  if (!file || typeof file === "string") {
    return corsJson({ error: "Missing 'file' field (multipart form-data)" }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const records = await parseMondayWorkbook(buffer);
  const summary = summarizeMondayRecords(records);

  const wiped = await prisma.$transaction(async (tx) => {
    const dealCountBefore = await tx.deal.count();
    const contactCountBefore = await tx.contact.count();

    await tx.reimbursementItem.deleteMany({});
    await tx.reimbursementVendor.deleteMany({});
    await tx.additionalCharge.deleteMany({});
    await tx.checklistItem.deleteMany({});
    await tx.worksheetEntry.deleteMany({});
    await tx.note.deleteMany({});
    await tx.file.deleteMany({});
    await tx.deal.deleteMany({});
    await tx.contact.deleteMany({});

    return { dealsWiped: dealCountBefore, contactsWiped: contactCountBefore };
  });

  const result = await importMondayRecords(prisma, records);

  return corsJson({ wiped, summary, result }, { status: 201 });
}
