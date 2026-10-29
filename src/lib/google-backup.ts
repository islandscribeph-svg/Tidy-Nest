import { importPKCS8, SignJWT } from "jose";
import { redactText } from "@/lib/alias";
import { activitySheet, contactsSheet, dataProblemsSheet, partnersSheet, pipelineSheet } from "@/lib/exports";
import { prisma } from "@/lib/prisma";
import type { Sheet } from "@/lib/sheet";
import { sheetsBackupStatus } from "@/lib/integrations";

export async function backupSheets(): Promise<Sheet[]> {
  const [deals, contacts, partners, events, checklist] = await Promise.all([
    prisma.deal.findMany({ include: { contact: true, assignedTo: { select: { name: true } } } }),
    prisma.contact.findMany(),
    prisma.partner.findMany(),
    prisma.activityEvent.findMany({ include: { user: { select: { name: true } } }, orderBy: { createdAt: "desc" }, take: 2000 }),
    prisma.checklistItem.findMany({ include: { deal: { include: { contact: true } } }, take: 2000 }),
  ]);
  const projects: Sheet = {
    name: "Projects",
    headers: ["Deal", "Checklist item", "Done"],
    rows: checklist.map((item) => {
      const shown = pipelineSheet([item.deal]).rows[0];
      return [String(shown?.[0] ?? ""), redactText(item.label), item.done ? "Yes" : "No"];
    }),
  };
  return [
    { ...pipelineSheet(deals), name: "Deals" },
    projects,
    contactsSheet(contacts),
    dataProblemsSheet(deals),
    partnersSheet(partners),
    activitySheet(events),
  ];
}

async function accessToken(email: string, privateKey: string) {
  const key = await importPKCS8(privateKey.replace(/\\n/g, "\n"), "RS256");
  const assertion = await new SignJWT({ scope: "https://www.googleapis.com/auth/spreadsheets" })
    .setProtectedHeader({ alg: "RS256", typ: "JWT" })
    .setIssuer(email)
    .setAudience("https://oauth2.googleapis.com/token")
    .setIssuedAt()
    .setExpirationTime("1h")
    .sign(key);
  const body = new URLSearchParams({ grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer", assertion });
  const res = await fetch("https://oauth2.googleapis.com/token", { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body });
  if (!res.ok) throw new Error("Google did not accept the service account.");
  const json = (await res.json()) as { access_token?: string };
  if (!json.access_token) throw new Error("Google did not return an access token.");
  return json.access_token;
}

export async function writeBackup(sheets: Sheet[]) {
  const status = sheetsBackupStatus();
  if (!status.enabled) throw new Error(status.detail);
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL ?? "";
  const key = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY ?? "";
  const spreadsheetId = process.env.GOOGLE_SHEETS_BACKUP_ID ?? "";
  const token = await accessToken(email, key);
  for (const sheet of sheets) {
    const values = [sheet.headers, ...sheet.rows.map((row) => row.map((cell) => (cell == null ? "" : String(cell))))];
    const range = encodeURIComponent(`${sheet.name}!A1`);
    const res = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${range}?valueInputOption=RAW`, {
      method: "PUT",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ range: `${sheet.name}!A1`, majorDimension: "ROWS", values }),
    });
    if (!res.ok) throw new Error(`Could not write the ${sheet.name} tab.`);
  }
}
