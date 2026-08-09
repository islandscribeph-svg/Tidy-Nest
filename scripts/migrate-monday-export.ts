// One-time migration: import the legacy Monday.com "Main Nest" board export
// (an .xlsx with monday's group-header-row layout) into the new schema.
//
// Usage:
//   npx tsx scripts/migrate-monday-export.ts <path-to-xlsx> [--dry-run]
//
// --dry-run parses the file and prints the stage/source breakdown it would
// produce, without touching the database. Use it to sanity-check the
// mapping against the source file before running for real.
import { PrismaClient } from "@prisma/client";
import { parseMondayWorkbook, summarizeMondayRecords, importMondayRecords } from "../src/lib/monday-import";

async function run() {
  const path = process.argv[2];
  const dryRun = process.argv.includes("--dry-run");
  if (!path) {
    console.error("Usage: npx tsx scripts/migrate-monday-export.ts <path-to-xlsx> [--dry-run]");
    process.exit(1);
  }

  const records = await parseMondayWorkbook(path);
  const summary = summarizeMondayRecords(records);
  console.log(`\nParsed ${summary.total} records.`);
  console.log("By stage:");
  for (const [stage, count] of Object.entries(summary.byStage).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${stage.padEnd(14)} ${count}`);
  }
  console.log(`Unique contacts (by email/phone/name): ${summary.uniqueContacts}`);

  if (dryRun) {
    console.log("\nDry run — no data written.");
    return;
  }

  const prisma = new PrismaClient();
  const result = await importMondayRecords(prisma, records);
  console.log(`\nImported ${result.dealsCreated} deals across ${result.contactsUsed} contacts.`);
  await prisma.$disconnect();
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
