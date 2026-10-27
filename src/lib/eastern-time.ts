export const EASTERN_TZ = "America/New_York";

export type CalendarParts = { year: number; month: number; day: number };

function pad(n: number) {
  return String(n).padStart(2, "0");
}

export function easternParts(date: Date): CalendarParts & { hour: number; minute: number } {
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone: EASTERN_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  });
  const parts = Object.fromEntries(fmt.formatToParts(date).map((p) => [p.type, p.value]));
  return {
    year: Number(parts.year),
    month: Number(parts.month),
    day: Number(parts.day),
    hour: Number(parts.hour),
    minute: Number(parts.minute),
  };
}

// Date-only values are stored at 00:00:00.000Z (older imports) or 12:00:00.000Z.
// Both mean "this calendar day", not an instant that should shift in Eastern time.
export function calendarParts(date: Date): CalendarParts {
  const h = date.getUTCHours();
  const min = date.getUTCMinutes();
  const s = date.getUTCSeconds();
  const ms = date.getUTCMilliseconds();
  if ((h === 0 || h === 12) && min === 0 && s === 0 && ms === 0) {
    return { year: date.getUTCFullYear(), month: date.getUTCMonth() + 1, day: date.getUTCDate() };
  }
  const p = easternParts(date);
  return { year: p.year, month: p.month, day: p.day };
}

export function calendarKey(value: string | Date | null | undefined): string | null {
  if (!value) return null;
  const date = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return null;
  const p = calendarParts(date);
  return `${p.year}-${pad(p.month)}-${pad(p.day)}`;
}

export function formatCalendarDate(value: string | Date | null | undefined): string | null {
  const key = calendarKey(value);
  if (!key) return null;
  const [year, month, day] = key.split("-").map(Number);
  const noon = new Date(Date.UTC(year, month - 1, day, 12));
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "UTC",
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(noon);
}

export function formatEasternDateTime(value: string | Date | null | undefined): string | null {
  if (!value) return null;
  const date = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return null;
  const formatted = new Intl.DateTimeFormat("en-US", {
    timeZone: EASTERN_TZ,
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
  return `${formatted} ET`;
}

export function easternDateInputValue(now = new Date()): string {
  const p = easternParts(now);
  return `${p.year}-${pad(p.month)}-${pad(p.day)}`;
}

export function dateOnlyToUtcNoon(isoDate: string): Date {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(isoDate.trim());
  if (!match) throw new Error("Expected a YYYY-MM-DD date");
  return new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]), 12, 0, 0));
}

export function parseDateInput(value: string): Date {
  if (/^\d{4}-\d{2}-\d{2}$/.test(value.trim())) return dateOnlyToUtcNoon(value);
  return new Date(value);
}

export function normalizeImportedDate(date: Date): Date {
  if (
    date.getUTCHours() === 0 &&
    date.getUTCMinutes() === 0 &&
    date.getUTCSeconds() === 0 &&
    date.getUTCMilliseconds() === 0
  ) {
    return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), 12));
  }
  return date;
}
