import { STAGE_COLORS, projectDate } from "@/lib/pipeline";
import type { DealSummary } from "@/lib/types";

const dateFormatter = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" });

export function DealCard({ deal }: { deal: DealSummary }) {
  const name = [deal.contact.firstName, deal.contact.lastName].filter(Boolean).join(" ") || "Unnamed contact";
  const label = deal.title ? `${name} - ${deal.title}` : name;
  const colors = STAGE_COLORS[deal.stage];
  const rawDate = projectDate(deal);
  const date = rawDate ? dateFormatter.format(new Date(rawDate)) : null;

  return (
    <div
      className={`flex items-center gap-2 border-l-4 ${colors.bar} bg-white px-2 py-1.5 hover:bg-neutral-50`}
    >
      <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${colors.dot}`} />
      <span className="min-w-0 flex-1 truncate text-sm text-neutral-800">{label}</span>
      {!deal.contactSaved && (
        <span className="shrink-0 rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium text-amber-700">
          Needs info
        </span>
      )}
      {date && <span className="shrink-0 text-xs text-neutral-400">{date}</span>}
    </div>
  );
}
