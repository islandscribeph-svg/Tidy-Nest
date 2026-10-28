"use client";

import Link from "next/link";
import { clientLabel } from "@/lib/display-name";
import { formatCalendarDate } from "@/lib/eastern-time";
import { STAGE_COLORS, projectDate } from "@/lib/pipeline";
import type { DealSummary } from "@/lib/types";

export function DealCard({ deal }: { deal: DealSummary }) {
  const name = clientLabel(deal.contact);
  const label = deal.displayName || (deal.title ? `${name} - ${deal.title}` : name);
  const projectPrefix = `${name} – `;
  const project = label.startsWith(projectPrefix) ? label.slice(projectPrefix.length) : null;
  const colors = STAGE_COLORS[deal.stage];
  const rawDate = projectDate(deal);
  const date = formatCalendarDate(rawDate);

  return (
    <div
      className={`flex items-center gap-2 border-l-4 ${colors.bar} bg-white px-2 py-1.5 hover:bg-neutral-50`}
    >
      <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${colors.dot}`} />
      <span className="min-w-0 flex-1 truncate text-sm text-neutral-800" title={deal.subStatus ?? label}>
        <Link
          href={`/clients/${deal.contact.id}`}
          prefetch={false}
          className="underline decoration-neutral-300 underline-offset-2 hover:decoration-neutral-800"
          onClick={(event) => event.stopPropagation()}
          onPointerDown={(event) => event.stopPropagation()}
        >
          {project ? name : label}
        </Link>
        {project ? ` – ${project}` : null}
      </span>
      {!deal.contactSaved && (
        <span className="shrink-0 rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium text-amber-700">
          Needs info
        </span>
      )}
      {date && <span className="shrink-0 text-xs text-neutral-400">{date}</span>}
    </div>
  );
}
