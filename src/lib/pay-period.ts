// Semi-monthly pay periods in America/New_York: the 1st–15th, and the
// 16th through the last calendar day of the month. Bounds are UTC instants
// covering that Eastern calendar day so date-only rows (midnight or noon UTC)
// fall inside the period they were entered for.

import { calendarParts } from "@/lib/eastern-time";

export type PayPeriod = {
  start: Date;
  end: Date;
  label: string;
};

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function lastDayOfMonth(year: number, month: number) {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

function bounds(year: number, month: number, startDay: number, endDay: number): PayPeriod {
  const start = new Date(Date.UTC(year, month - 1, startDay, 0, 0, 0, 0));
  const end = new Date(Date.UTC(year, month - 1, endDay, 23, 59, 59, 999));
  const monthName = MONTHS[month - 1];
  return { start, end, label: `${monthName} ${startDay} – ${monthName} ${endDay}, ${year}` };
}

export function getPayPeriod(date: Date): PayPeriod {
  const { year, month, day } = calendarParts(date);
  if (day <= 15) return bounds(year, month, 1, 15);
  return bounds(year, month, 16, lastDayOfMonth(year, month));
}

function shiftCalendarDay(date: Date, days: number): Date {
  const { year, month, day } = calendarParts(date);
  return new Date(Date.UTC(year, month - 1, day + days, 12, 0, 0));
}

export function previousPayPeriod(period: PayPeriod): PayPeriod {
  return getPayPeriod(shiftCalendarDay(period.start, -1));
}

export function nextPayPeriod(period: PayPeriod): PayPeriod {
  return getPayPeriod(shiftCalendarDay(period.end, 1));
}
