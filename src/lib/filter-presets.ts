import { calendarKey } from "@/lib/eastern-time";

export type FilterQuery = Record<string, string>;

export type FilterPreset = { name: string; query: FilterQuery };

export const FILTER_PAGES = ["pipeline", "contacts", "data-problems"] as const;
export type FilterPage = (typeof FILTER_PAGES)[number];

export function isFilterPage(value: string): value is FilterPage {
  return (FILTER_PAGES as readonly string[]).includes(value);
}

export function filterPresets(page: FilterPage, now = new Date()): FilterPreset[] {
  if (page === "pipeline") {
    return [
      { name: "Closed this year", query: { stage: "CLOSED", year: String(easternYear(now)) } },
      { name: "In Progress", query: { stage: "IN_PROGRESS", year: "all" } },
    ];
  }
  if (page === "data-problems") {
    return [
      { name: "Missing worksheet", query: { type: "missing_worksheet", q: "" } },
      { name: "Died with invoice", query: { type: "died_with_invoice", q: "" } },
    ];
  }
  return [];
}

function easternYear(now: Date): number {
  const key = calendarKey(now);
  return key ? Number(key.slice(0, 4)) : now.getUTCFullYear();
}

export function closedInYear(dateClosed: string | Date | null | undefined, year: string): boolean {
  if (year === "all" || !year) return true;
  const key = calendarKey(dateClosed);
  if (!key) return false;
  return key.slice(0, 4) === year;
}

export function textMatch(query: string, parts: (string | null | undefined)[]): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return parts
    .filter(Boolean)
    .join(" ")
    .toLowerCase()
    .includes(q);
}
