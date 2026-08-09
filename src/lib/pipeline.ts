import { Stage, ServiceType, Source } from "@prisma/client";

export const STAGE_ORDER: Stage[] = [
  "NEW_LEAD",
  "CONTACTED",
  "CONSULTATION",
  "IN_PROGRESS",
  "CLOSED",
  "UNQUALIFIED",
  "DEAD",
];

export const STAGE_LABELS: Record<Stage, string> = {
  NEW_LEAD: "New Leads",
  CONTACTED: "Contacted",
  CONSULTATION: "Consultation",
  IN_PROGRESS: "In Progress",
  CLOSED: "Closed",
  UNQUALIFIED: "Unqualified",
  DEAD: "Dead",
};

// Suggested sub-statuses per stage. These are convenience presets shown in a
// dropdown-with-freetext control — not a DB-level enum — since the source
// data showed stage-specific status vocab (e.g. "No Comms Needed" only makes
// sense under Contacted).
export const SUB_STATUS_SUGGESTIONS: Partial<Record<Stage, string[]>> = {
  CONTACTED: ["Initial Email Sent", "Follow-up Sent", "No Comms Needed"],
  CONSULTATION: ["Consultation Scheduled", "Consultation Done"],
  CLOSED: ["Client - Start", "Client - Post Project"],
};

export const SERVICE_TYPE_LABELS: Record<ServiceType, string> = {
  ORGANIZING: "Organizing",
  RELOCATION: "Relocation",
  HOME_MANAGEMENT: "Home Management",
  HOLIDAY_BOX: "Holiday Box",
  MAINTENANCE: "Maintenance",
  OTHER: "Other",
};

export const SOURCE_LABELS: Record<Source, string> = {
  SOCIAL_MEDIA: "Social Media",
  REFERRAL: "Referral",
  MAGAZINE: "Magazine",
  ONLINE_AD: "Online Advertisement / Article",
  GOOGLE: "Google",
  FRIEND: "Friend",
  WEBSITE: "Website",
  OTHER: "Other",
  UNKNOWN: "Unknown",
};

// Exit stages reachable as a drop target from anywhere in the pipeline,
// rendered as side lanes rather than inline with the main left-to-right flow.
export const EXIT_STAGES: Stage[] = ["UNQUALIFIED", "DEAD"];
export const MAIN_STAGES: Stage[] = STAGE_ORDER.filter((s) => !EXIT_STAGES.includes(s));
