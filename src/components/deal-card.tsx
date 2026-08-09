import { SERVICE_TYPE_LABELS } from "@/lib/pipeline";
import type { DealSummary } from "@/lib/types";

export function DealCard({ deal }: { deal: DealSummary }) {
  const name = [deal.contact.firstName, deal.contact.lastName].filter(Boolean).join(" ");

  return (
    <div className="rounded-md border border-neutral-200 bg-white p-3 shadow-sm hover:border-neutral-300">
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-medium text-neutral-900">{name || "Unnamed lead"}</p>
        {!deal.contactSaved && (
          <span className="shrink-0 rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium text-amber-700">
            Needs info
          </span>
        )}
      </div>
      {deal.serviceType && (
        <p className="mt-0.5 text-xs text-neutral-500">{SERVICE_TYPE_LABELS[deal.serviceType]}</p>
      )}
      {deal.subject && <p className="mt-1 text-xs text-neutral-400 line-clamp-1">{deal.subject}</p>}
      {deal.assignedTo && (
        <p className="mt-2 text-[11px] text-neutral-400">Assigned: {deal.assignedTo.name}</p>
      )}
    </div>
  );
}
