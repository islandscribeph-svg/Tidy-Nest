// Semi-monthly pay periods: the 1st–15th, and the 16th–end of month.
// Periods aren't stored as rows; they're computed from dates so timesheet
// entries (manual or project-sourced) just need a plain date to slot in.

export type PayPeriod = {
  start: Date; // inclusive, local midnight
  end: Date; // inclusive, local end-of-day
  label: string;
};

function startOfDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0);
}

function endOfDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);
}

function lastDayOfMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

function formatDate(d: Date) {
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export function getPayPeriod(date: Date): PayPeriod {
  const year = date.getFullYear();
  const month = date.getMonth();

  if (date.getDate() <= 15) {
    const start = startOfDay(new Date(year, month, 1));
    const end = endOfDay(new Date(year, month, 15));
    return { start, end, label: `${formatDate(start)} – ${formatDate(end)}, ${year}` };
  }

  const start = startOfDay(new Date(year, month, 16));
  const end = endOfDay(new Date(year, month, lastDayOfMonth(year, month)));
  return { start, end, label: `${formatDate(start)} – ${formatDate(end)}, ${year}` };
}

export function previousPayPeriod(period: PayPeriod): PayPeriod {
  const dayBeforeStart = new Date(period.start);
  dayBeforeStart.setDate(dayBeforeStart.getDate() - 1);
  return getPayPeriod(dayBeforeStart);
}

export function nextPayPeriod(period: PayPeriod): PayPeriod {
  const dayAfterEnd = new Date(period.end);
  dayAfterEnd.setDate(dayAfterEnd.getDate() + 1);
  return getPayPeriod(dayAfterEnd);
}
