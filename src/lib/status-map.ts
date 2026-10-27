import type { Stage } from "@prisma/client";

// Monday's Status column (lead_status), not the board group. Groups are ignored
// on purpose: a Died lead and a Closed project used to share a group.
const STATUS_TO_STAGE: Record<string, Stage> = {
  "new lead": "NEW_LEAD",
  "initial email sent": "CONTACTED",
  "follow up email sent": "CONTACTED",
  "follow-up email sent": "CONTACTED",
  "follow-up sent": "CONTACTED",
  "no comms needed": "CONTACTED",
  "for consultation": "CONSULTATION",
  "consultation scheduled": "CONSULTATION",
  "consultation done": "CONSULTATION",
  "create proposal": "CONSULTATION",
  "proposal sent": "CONSULTATION",
  "interested": "CONSULTATION",
  "create worksheet": "CONSULTATION",
  "setup folders": "CONSULTATION",
  "client - start": "IN_PROGRESS",
  "client - post project": "IN_PROGRESS",
  closed: "CLOSED",
  unqualified: "UNQUALIFIED",
  died: "DEAD",
  dead: "DEAD",
};

export const CANONICAL_STATUS: Record<Stage, string> = {
  NEW_LEAD: "New Lead",
  CONTACTED: "Initial Email Sent",
  CONSULTATION: "For Consultation",
  IN_PROGRESS: "Client - Start",
  CLOSED: "Closed",
  UNQUALIFIED: "Unqualified",
  DEAD: "Died",
};

export function normalizeMondayStatus(status: string | null | undefined): string {
  return (status ?? "").trim().toLowerCase().replace(/\s+/g, " ");
}

export function stageFromMondayStatus(status: string | null | undefined): Stage | null {
  const key = normalizeMondayStatus(status);
  if (!key) return null;
  return STATUS_TO_STAGE[key] ?? null;
}

// Unknown or blank status stays in New Lead so the item remains visible.
// The group title is intentionally not an argument.
export function stageForItem(status: string | null | undefined): Stage {
  return stageFromMondayStatus(status) ?? "NEW_LEAD";
}
