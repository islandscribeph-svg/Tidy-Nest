import type { AliasRule } from "@/lib/alias";
import { getAliasRules } from "@/lib/alias";
import { formatCalendarDate } from "@/lib/eastern-time";
import { presentDeal } from "@/lib/present";
import { projectDate } from "@/lib/pipeline";

function fold(value: string) {
  return value.replace(/\r?\n/g, " ");
}

export function dealsToIcal(
  deals: {
    id: string;
    stage: string;
    title?: string | null;
    consultDate?: Date | string | null;
    projectStartDate?: Date | string | null;
    dateClosed?: Date | string | null;
    contact: { firstName?: string | null; lastName?: string | null; company?: string | null };
  }[],
  rules: AliasRule[] = getAliasRules(),
) {
  const lines = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Tidy Nest//Calendar//EN", "CALSCALE:GREGORIAN"];
  for (const deal of deals) {
    const shown = presentDeal(deal, rules);
    const when = projectDate({
      dateClosed: shown.dateClosed ?? null,
      projectStartDate: shown.projectStartDate ?? null,
      consultDate: shown.consultDate ?? null,
    });
    const day = formatCalendarDate(when);
    if (!day) continue;
    const stamp = (typeof when === "string" ? when : when?.toISOString() ?? "").slice(0, 10).replace(/-/g, "");
    if (!stamp) continue;
    lines.push("BEGIN:VEVENT");
    lines.push(`UID:${shown.id}@tidynest`);
    lines.push(`DTSTART;VALUE=DATE:${stamp}`);
    lines.push(`SUMMARY:${fold(shown.displayName)}`);
    lines.push("END:VEVENT");
  }
  lines.push("END:VCALENDAR");
  return lines.join("\r\n");
}
