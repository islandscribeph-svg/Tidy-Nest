import { calendarKey } from "@/lib/eastern-time";

const OPEN_LEAD_STAGES = new Set(["NEW_LEAD", "CONTACTED", "CONSULTATION"]);
const CLOSED_STAGES = new Set(["CLOSED", "DEAD", "UNQUALIFIED"]);

export type TodayItem = {
  id: string;
  stage: string;
  displayName: string;
  title: string | null;
  subStatus: string | null;
  consultDate: string | Date | null;
  projectStartDate: string | Date | null;
  assignedToId: string | null;
};

export type TodayBuckets = {
  overdue: TodayItem[];
  followUps: TodayItem[];
  newLeads: TodayItem[];
  consultations: TodayItem[];
};

function shiftKey(key: string, days: number): string {
  const [year, month, day] = key.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day + days, 12));
  return date.toISOString().slice(0, 10);
}

function keyOf(value: string | Date | null | undefined): string | null {
  return calendarKey(value);
}

export function greetingForHour(hour: number): string {
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

// Overdue: a lead whose consult date, or start date when there is no consult date, is before today.
// Upcoming consultations: a consult date from today through the next 14 days, plus undated Consultation projects.
export function buildToday(deals: TodayItem[], userId: string, todayKey: string): TodayBuckets {
  const horizon = shiftKey(todayKey, 14);
  const overdue: TodayItem[] = [];
  const followUps: TodayItem[] = [];
  const newLeads: TodayItem[] = [];
  const consultations: TodayItem[] = [];

  for (const deal of deals) {
    if (deal.stage === "NEW_LEAD") newLeads.push(deal);
    if (deal.assignedToId === userId && OPEN_LEAD_STAGES.has(deal.stage)) followUps.push(deal);

    if (OPEN_LEAD_STAGES.has(deal.stage)) {
      const consult = keyOf(deal.consultDate);
      const start = keyOf(deal.projectStartDate);
      const marker = consult ?? start;
      if (marker && marker < todayKey) overdue.push(deal);
    }

    if (!CLOSED_STAGES.has(deal.stage)) {
      const consult = keyOf(deal.consultDate);
      if (consult && consult >= todayKey && consult <= horizon) consultations.push(deal);
      else if (!consult && deal.stage === "CONSULTATION") consultations.push(deal);
    }
  }

  return { overdue, followUps, newLeads, consultations };
}
