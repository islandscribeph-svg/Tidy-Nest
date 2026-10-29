import { dateOnlyToUtcNoon } from "@/lib/eastern-time";

const MONTHS: Record<string, number> = {
  jan: 1,
  feb: 2,
  mar: 3,
  apr: 4,
  may: 5,
  jun: 6,
  jul: 7,
  aug: 8,
  sep: 9,
  oct: 10,
  nov: 11,
  dec: 12,
};

function pad(n: number) {
  return String(n).padStart(2, "0");
}

function noon(year: number, month: number, day: number): Date | null {
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  return dateOnlyToUtcNoon(`${year}-${pad(month)}-${pad(day)}`);
}

// Best-effort calendar date. Empty values are not errors. Anything non-empty
// that does not yield a calendar day is unparseable and should be flagged.
export function parseFlexibleDate(raw: string | null | undefined): { date: Date | null; unparseable: boolean } {
  if (raw == null) return { date: null, unparseable: false };
  const text = String(raw).trim();
  if (!text) return { date: null, unparseable: false };

  const iso = text.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) {
    const date = noon(Number(iso[1]), Number(iso[2]), Number(iso[3]));
    if (date) return { date, unparseable: false };
  }

  const slash = text.match(/\b(\d{1,2})\/(\d{1,2})\/(\d{4})\b/);
  if (slash) {
    const date = noon(Number(slash[3]), Number(slash[1]), Number(slash[2]));
    if (date) return { date, unparseable: false };
  }

  const named = text.match(
    /\b(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|june?|july?|aug(?:ust)?|sep(?:t|tember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\.?\s+(\d{1,2})(?:st|nd|rd|th)?,?\s+(\d{4})\b/i,
  );
  if (named) {
    const month = MONTHS[named[1].toLowerCase().slice(0, 3)];
    const date = month ? noon(Number(named[3]), month, Number(named[2])) : null;
    if (date) return { date, unparseable: false };
  }

  return { date: null, unparseable: true };
}
