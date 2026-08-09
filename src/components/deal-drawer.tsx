"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { STAGE_LABELS, SERVICE_TYPE_LABELS, SOURCE_LABELS, SUB_STATUS_SUGGESTIONS } from "@/lib/pipeline";
import type { DealDetail, DealSummary } from "@/lib/types";
import { SaveContactModal } from "@/components/save-contact-modal";

export function DealDrawer({
  dealId,
  users,
  onClose,
  onSaved,
}: {
  dealId: string;
  users: { id: string; name: string }[];
  onClose: () => void;
  onSaved: (deal: Partial<DealSummary> & { id: string }) => void;
}) {
  const [deal, setDeal] = useState<DealDetail | null>(null);
  const [showSaveContact, setShowSaveContact] = useState(false);
  const [noteText, setNoteText] = useState("");
  const [postingNote, setPostingNote] = useState(false);

  const loading = deal === null || deal.id !== dealId;

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/deals/${dealId}`)
      .then((r) => r.json())
      .then((data) => {
        if (!cancelled) setDeal(data);
      });
    return () => {
      cancelled = true;
    };
  }, [dealId]);

  async function patchDeal(patch: Record<string, unknown>) {
    if (!deal) return;
    const res = await fetch(`/api/deals/${dealId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    if (res.ok) {
      const updated = await res.json();
      setDeal((d) => (d ? { ...d, ...updated } : d));
      onSaved({ id: dealId, ...updated });
    }
  }

  async function handlePostNote() {
    if (!noteText.trim()) return;
    setPostingNote(true);
    const res = await fetch(`/api/deals/${dealId}/notes`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ body: noteText }),
    });
    setPostingNote(false);
    if (res.ok) {
      const note = await res.json();
      setDeal((d) => (d ? { ...d, notes: [note, ...d.notes] } : d));
      setNoteText("");
    }
  }

  return (
    <div className="fixed inset-0 z-40 flex justify-end bg-black/20">
      <div className="flex h-full w-full max-w-lg flex-col bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-neutral-200 px-5 py-4">
          <h2 className="text-sm font-semibold text-neutral-900">Deal details</h2>
          <button onClick={onClose} className="rounded-md p-1 text-neutral-400 hover:bg-neutral-100">
            <X size={18} />
          </button>
        </div>

        {loading || !deal ? (
          <div className="flex-1 p-5 text-sm text-neutral-400">Loading...</div>
        ) : (
          <div className="flex-1 overflow-y-auto px-5 py-4 space-y-6">
            <section>
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-neutral-900">
                    {[deal.contact.firstName, deal.contact.lastName].filter(Boolean).join(" ") || "Unnamed lead"}
                  </h3>
                  <p className="text-xs text-neutral-500">{deal.contact.email || deal.contact.phone || "No contact info"}</p>
                </div>
                {!deal.contactSaved && (
                  <button
                    onClick={() => setShowSaveContact(true)}
                    className="shrink-0 rounded-md bg-amber-500 px-3 py-1.5 text-xs font-medium text-white hover:bg-amber-600"
                  >
                    Save Contact
                  </button>
                )}
                {deal.contactSaved && (
                  <button
                    onClick={() => setShowSaveContact(true)}
                    className="shrink-0 rounded-md border border-neutral-300 px-3 py-1.5 text-xs font-medium text-neutral-600 hover:bg-neutral-50"
                  >
                    Edit contact
                  </button>
                )}
              </div>
            </section>

            <section className="space-y-3">
              <FieldRow label="Stage">
                <select
                  className="input"
                  value={deal.stage}
                  onChange={(e) => patchDeal({ stage: e.target.value })}
                >
                  {Object.entries(STAGE_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </FieldRow>

              <FieldRow label="Sub-status">
                <input
                  className="input"
                  list="sub-status-suggestions"
                  defaultValue={deal.subStatus ?? ""}
                  onBlur={(e) => patchDeal({ subStatus: e.target.value || null })}
                />
                <datalist id="sub-status-suggestions">
                  {(SUB_STATUS_SUGGESTIONS[deal.stage] ?? []).map((s) => (
                    <option key={s} value={s} />
                  ))}
                </datalist>
              </FieldRow>

              <FieldRow label="Service">
                <select
                  className="input"
                  value={deal.serviceType ?? ""}
                  onChange={(e) => patchDeal({ serviceType: e.target.value || null })}
                >
                  <option value="">—</option>
                  {Object.entries(SERVICE_TYPE_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </FieldRow>

              <FieldRow label="Source">
                <select
                  className="input"
                  value={deal.source}
                  onChange={(e) => patchDeal({ source: e.target.value })}
                >
                  {Object.entries(SOURCE_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </FieldRow>

              <FieldRow label="Assigned to">
                <select
                  className="input"
                  value={deal.assignedTo?.id ?? ""}
                  onChange={(e) => patchDeal({ assignedToId: e.target.value || null })}
                >
                  <option value="">Unassigned</option>
                  {users.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name}
                    </option>
                  ))}
                </select>
              </FieldRow>

              <FieldRow label="Estimated value">
                <input
                  type="number"
                  className="input"
                  defaultValue={deal.estimatedDealValue ?? ""}
                  onBlur={(e) => patchDeal({ estimatedDealValue: e.target.value ? Number(e.target.value) : null })}
                />
              </FieldRow>

              <FieldRow label="Closed value">
                <input
                  type="number"
                  className="input"
                  defaultValue={deal.closedDealValue ?? ""}
                  onBlur={(e) => patchDeal({ closedDealValue: e.target.value ? Number(e.target.value) : null })}
                />
              </FieldRow>

              <FieldRow label="Notes / details of project">
                <textarea
                  className="input"
                  rows={3}
                  defaultValue={deal.detailsOfProject ?? ""}
                  onBlur={(e) => patchDeal({ detailsOfProject: e.target.value || null })}
                />
              </FieldRow>
            </section>

            {deal.projects.length > 0 && (
              <section>
                <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-neutral-500">Project</h4>
                {deal.projects.map((p) => (
                  <div key={p.id} className="rounded-md border border-neutral-200 p-3">
                    <p className="text-xs text-neutral-500">
                      {p.tasks.length} task{p.tasks.length === 1 ? "" : "s"}
                    </p>
                    <ul className="mt-1 space-y-1">
                      {p.tasks.map((t) => (
                        <li key={t.id} className="text-sm text-neutral-700">
                          {t.title} <span className="text-xs text-neutral-400">· {t.status}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </section>
            )}

            <section>
              <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-neutral-500">Activity</h4>
              <div className="mb-3 flex gap-2">
                <input
                  className="input"
                  placeholder="Add a note..."
                  value={noteText}
                  onChange={(e) => setNoteText(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handlePostNote()}
                />
                <button
                  onClick={handlePostNote}
                  disabled={postingNote}
                  className="shrink-0 rounded-md bg-neutral-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-neutral-800 disabled:opacity-50"
                >
                  Post
                </button>
              </div>
              <ul className="space-y-3">
                {deal.notes.map((n) => (
                  <li key={n.id} className="text-sm">
                    <p className="text-neutral-700">{n.body}</p>
                    <p className="text-xs text-neutral-400">
                      {n.author?.name ?? "Unknown"} · {new Date(n.createdAt).toLocaleString()}
                    </p>
                  </li>
                ))}
                {deal.notes.length === 0 && <p className="text-xs text-neutral-400">No notes yet.</p>}
              </ul>
            </section>
          </div>
        )}
      </div>

      {showSaveContact && deal && (
        <SaveContactModal
          deal={deal}
          onClose={() => setShowSaveContact(false)}
          onSaved={(updated) => {
            setDeal((d) => (d ? { ...d, ...updated } : d));
            onSaved({ id: dealId, ...updated });
            setShowSaveContact(false);
          }}
        />
      )}
    </div>
  );
}

function FieldRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-neutral-600">{label}</span>
      {children}
    </label>
  );
}
