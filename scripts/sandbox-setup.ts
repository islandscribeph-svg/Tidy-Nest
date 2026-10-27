import { spawnSync } from "node:child_process";
import { PrismaClient } from "@prisma/client";
import { hashPassword } from "../src/lib/auth";
import { importSnapshotFile } from "../src/lib/monday/import-snapshot";
import { parseAllowlist } from "../src/lib/staff-users";
import { loadEnvFile } from "./load-env";

loadEnvFile();

function required(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    console.error(`Missing ${name}. See SANDBOX.md.`);
    process.exit(1);
  }
  return value;
}

const nodeMajor = Number(process.versions.node.split(".")[0]);
if (nodeMajor < 20) {
  console.error(`Node 20 or newer is required. This machine is running ${process.versions.node}.`);
  process.exit(1);
}

const mondayCredential = Object.keys(process.env).filter(
  (key) => key.startsWith("MONDAY_") && key !== "MONDAY_SNAPSHOT_PATH" && process.env[key]?.trim(),
);
if (mondayCredential.length > 0) {
  console.error(
    `Remove ${mondayCredential.join(", ")}. This app does not use Monday credentials and never calls Monday.`,
  );
  process.exit(1);
}

required("DATABASE_URL");
required("DIRECT_URL");
required("SESSION_SECRET");
const allowlist = parseAllowlist(required("ALLOWED_USER_EMAILS"));
if (allowlist.length !== 2) {
  console.error("ALLOWED_USER_EMAILS must list exactly two staff email addresses.");
  process.exit(1);
}

const users = [1, 2].map((n) => ({
  name: required(`SANDBOX_USER_${n}_NAME`),
  email: required(`SANDBOX_USER_${n}_EMAIL`).toLowerCase(),
  password: required(`SANDBOX_USER_${n}_PASSWORD`),
}));

if (users[0].email === users[1].email) {
  console.error("The two staff accounts need different email addresses.");
  process.exit(1);
}

for (const user of users) {
  if (!allowlist.includes(user.email)) {
    console.error("Each sandbox user email must be listed in ALLOWED_USER_EMAILS.");
    process.exit(1);
  }
  if (user.password.length < 8) {
    console.error(`Password for ${user.email} must be at least 8 characters.`);
    process.exit(1);
  }
}

const migrate = spawnSync("npx", ["prisma", "migrate", "deploy"], { stdio: "inherit", env: process.env });
if (migrate.status !== 0) {
  console.error("Migrations failed. Check that local Postgres is running and DATABASE_URL and DIRECT_URL are correct.");
  process.exit(migrate.status ?? 1);
}

const prisma = new PrismaClient();

async function keepOnlyStaffAccounts() {
  const emails = users.map((user) => user.email);
  const extras = await prisma.user.findMany({
    where: { NOT: { email: { in: emails } } },
    select: { id: true },
  });
  if (extras.length === 0) return;
  const ids = extras.map((user) => user.id);
  await prisma.deal.updateMany({ where: { assignedToId: { in: ids } }, data: { assignedToId: null } });
  await prisma.note.updateMany({ where: { authorId: { in: ids } }, data: { authorId: null } });
  await prisma.passwordResetToken.deleteMany({ where: { userId: { in: ids } } });
  await prisma.user.deleteMany({ where: { id: { in: ids } } });
}

async function main() {
  await keepOnlyStaffAccounts();
  for (const user of users) {
    const passwordHash = await hashPassword(user.password);
    const existing = await prisma.user.findFirst({
      where: { email: { equals: user.email, mode: "insensitive" } },
    });
    if (existing) {
      await prisma.user.update({
        where: { id: existing.id },
        data: { email: user.email, name: user.name, passwordHash, role: "ADMIN" },
      });
    } else {
      await prisma.user.create({
        data: { email: user.email, name: user.name, passwordHash, role: "ADMIN" },
      });
    }
  }

  console.log("Staff accounts ready (passwords not shown):");
  for (const user of users) console.log(`- ${user.email}`);

  const snapshotPath = process.env.MONDAY_SNAPSHOT_PATH?.trim();
  if (!snapshotPath) {
    console.log("MONDAY_SNAPSHOT_PATH is not set. No deals were loaded. The sample fixture was not imported.");
    return;
  }

  const result = await importSnapshotFile(prisma, snapshotPath, {
    allowSampleFixture: process.env.SANDBOX_ALLOW_FIXTURE === "1",
  });
  console.log(`Loaded ${result.itemCount} items (${result.contactCount} contacts, ${result.skipped} skipped rows).`);
  console.log(`Board ${result.boardId || "(no id)"} pulled at ${result.pulledAt ?? "unknown"}.`);
  console.log("Monday was not contacted.");
}

main()
  .catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : "Sandbox setup failed.");
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
