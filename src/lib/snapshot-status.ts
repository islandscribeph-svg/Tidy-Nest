import { formatEasternDateTime } from "@/lib/eastern-time";

export function snapshotStatusLabel(run: { pulledAt: Date | string | null; finishedAt?: Date | string | null } | null): string {
  const when = run?.pulledAt ?? run?.finishedAt ?? null;
  if (!when) return "No snapshot loaded · read-only · Monday is not connected";
  const formatted = formatEasternDateTime(when);
  if (!formatted) return "No snapshot loaded · read-only · Monday is not connected";
  return `Data as of ${formatted} · read-only snapshot`;
}
