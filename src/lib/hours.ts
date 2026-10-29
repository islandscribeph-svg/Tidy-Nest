const TIME_RE = /^(\d{1,2}):(\d{2})$/;

export function parseClockMinutes(value: string): number | null {
  const match = TIME_RE.exec(value.trim());
  if (!match) return null;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (hours > 23 || minutes > 59) return null;
  return hours * 60 + minutes;
}

export function hoursBetween(start: string, end: string, breakMinutes: number): number | null {
  const startMin = parseClockMinutes(start);
  const endMin = parseClockMinutes(end);
  if (startMin == null || endMin == null) return null;
  if (!Number.isFinite(breakMinutes) || breakMinutes < 0) return null;
  const span = endMin - startMin - breakMinutes;
  if (span < 0) return null;
  return Math.round((span / 60) * 100) / 100;
}
