import { PrismaClient } from "@prisma/client";
import { importSnapshotFile } from "../src/lib/monday/import-snapshot";
import { loadEnvFile } from "./load-env";

loadEnvFile();

const file = process.argv[2] || process.env.MONDAY_SNAPSHOT_PATH;
if (!file) {
  console.error("Usage: npm run import:snapshot -- <path>");
  console.error("Or set MONDAY_SNAPSHOT_PATH to a local JSON snapshot.");
  process.exit(1);
}

const explicitPath = Boolean(process.argv[2]);
const prisma = new PrismaClient();

importSnapshotFile(prisma, file, {
  allowSampleFixture: explicitPath || process.env.SANDBOX_ALLOW_FIXTURE === "1",
})
  .then((result) => {
    console.log(`Loaded ${result.itemCount} items (${result.contactCount} contacts, ${result.skipped} skipped rows).`);
    console.log(`Board ${result.boardId || "(no id)"} pulled at ${result.pulledAt ?? "unknown"}.`);
    console.log("Monday was not contacted.");
  })
  .catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : "Snapshot import failed.");
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
