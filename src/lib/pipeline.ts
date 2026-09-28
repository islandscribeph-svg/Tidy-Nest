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

// One color per stage so the board reads as color-coded-by-process: the
// column header, its accent bar, and every row in it all use the same color.
export const STAGE_COLORS: Record<Stage, { header: string; text: string; bar: string; dot: string }> = {
  NEW_LEAD: { header: "bg-sky-50 border-sky-200", text: "text-sky-700", bar: "border-l-sky-400", dot: "bg-sky-400" },
  CONTACTED: {
    header: "bg-indigo-50 border-indigo-200",
    text: "text-indigo-700",
    bar: "border-l-indigo-400",
    dot: "bg-indigo-400",
  },
  CONSULTATION: {
    header: "bg-violet-50 border-violet-200",
    text: "text-violet-700",
    bar: "border-l-violet-400",
    dot: "bg-violet-400",
  },
  IN_PROGRESS: {
    header: "bg-amber-50 border-amber-200",
    text: "text-amber-700",
    bar: "border-l-amber-400",
    dot: "bg-amber-400",
  },
  CLOSED: {
    header: "bg-emerald-50 border-emerald-200",
    text: "text-emerald-700",
    bar: "border-l-emerald-400",
    dot: "bg-emerald-400",
  },
  UNQUALIFIED: {
    header: "bg-neutral-100 border-neutral-300",
    text: "text-neutral-600",
    bar: "border-l-neutral-400",
    dot: "bg-neutral-400",
  },
  DEAD: { header: "bg-rose-50 border-rose-200", text: "text-rose-700", bar: "border-l-rose-400", dot: "bg-rose-400" },
};

// Exit stages reachable as a drop target from anywhere in the pipeline,
// rendered as side lanes rather than inline with the main left-to-right flow.
export const EXIT_STAGES: Stage[] = ["UNQUALIFIED", "DEAD"];
export const MAIN_STAGES: Stage[] = STAGE_ORDER.filter((s) => !EXIT_STAGES.includes(s));

// Stage-gated detail-panel tabs. Unqualified/Dead are treated as "reached
// the max" rather than tracking real stage history, so a project's entered
// data is never hidden after it exits — the tradeoff is that a project
// marked Dead very early could show an empty Consultation tab.
const CONSULTATION_REACHED: Stage[] = ["CONSULTATION", "IN_PROGRESS", "CLOSED", "UNQUALIFIED", "DEAD"];
const IN_PROGRESS_REACHED: Stage[] = ["IN_PROGRESS", "CLOSED", "UNQUALIFIED", "DEAD"];

// The one date that best represents "when this project happened," not when
// the record was created/imported: whichever of these is actually set,
// preferring the most advanced milestone reached.
export function projectDate(deal: {
  dateClosed: string | null;
  projectStartDate: string | null;
  consultDate: string | null;
}): string | null {
  return deal.dateClosed ?? deal.projectStartDate ?? deal.consultDate ?? null;
}

export type DashboardFilters = {
  year: number | "all";
  month: number | "all"; // 1-12
  contactId: string | "all";
  address: string;
  title: string;
};

export const DEFAULT_DASHBOARD_FILTERS: DashboardFilters = {
  year: new Date().getUTCFullYear(),
  month: new Date().getUTCMonth() + 1,
  contactId: "all",
  address: "",
  title: "",
};

// Shared between the client-side Dashboard view and the server-side CSV
// export so "what's on screen" and "what downloads" never drift apart.
export function matchesDashboardFilters(
  deal: {
    title: string | null;
    dateClosed: string | null;
    projectStartDate: string | null;
    consultDate: string | null;
    contact: { id: string; streetAddress: string | null; city: string | null; state: string | null };
  },
  filters: DashboardFilters,
): boolean {
  if (filters.year !== "all" || filters.month !== "all") {
    const raw = projectDate(deal);
    if (!raw) return false;
    const d = new Date(raw);
    if (filters.year !== "all" && d.getUTCFullYear() !== filters.year) return false;
    if (filters.month !== "all" && d.getUTCMonth() + 1 !== filters.month) return false;
  }
  if (filters.contactId !== "all" && deal.contact.id !== filters.contactId) return false;
  if (filters.address.trim()) {
    const q = filters.address.trim().toLowerCase();
    const hay = [deal.contact.streetAddress, deal.contact.city, deal.contact.state]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    if (!hay.includes(q)) return false;
  }
  if (filters.title.trim() && !(deal.title ?? "").toLowerCase().includes(filters.title.trim().toLowerCase())) {
    return false;
  }
  return true;
}

export function hasReachedConsultation(stage: Stage): boolean {
  return CONSULTATION_REACHED.includes(stage);
}

export function hasReachedInProgress(stage: Stage): boolean {
  return IN_PROGRESS_REACHED.includes(stage);
}
