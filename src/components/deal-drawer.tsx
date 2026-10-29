"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { X } from "lucide-react";
import { clientLabel } from "@/lib/display-name";
import { FINANCIAL_FIELDS, SHANNON_APPROVAL } from "@/lib/field-edits";
import { formatEasternDateTime } from "@/lib/eastern-time";
import { STAGE_LABELS, SERVICE_TYPE_LABELS, SOURCE_LABELS, SUB_STATUS_SUGGESTIONS, hasReachedConsultation, hasReachedInProgress } from "@/lib/pipeline";
import type { DealDetail, DealSummary } from "@/lib/types";
import { SaveContactModal } from "@/components/save-contact-modal";
import { SelectButton } from "@/components/ui/select-button";
import { ConsultationTab } from "@/components/consultation-tab";
import { WorksheetTab } from "@/components/worksheet-tab";
import { ReimbursementsTab } from "@/components/reimbursements-tab";
import { BillablesTab } from "@/components/billables-tab";

type TabKey = "details" | "consultation" | "worksheet" | "reimbursements" | "billables";

export function DealDrawer({
  dealId,
  users,
  employees,
  isAdmin = false,
  onClose,
  onSaved,
}: {
  dealId: string;
  users: { id: string; name: string }[];
  employees: { id: string; name: string; active: boolean }[];
  isAdmin?: boolean;
  onClose: () => void;
  onSaved: (deal: Partial<DealSummary> & { id: string }) => void;
}) {
  const [deal, setDeal] = useState<DealDetail | null>(null);
  const [showSaveContact, setShowSaveContact] = useState(false);
  const [noteText, setNoteText] = useState("");
  const [postingNote, setPostingNote] = useState(false);
  const [activeTab, setActiveTab] = useState<TabKey>("details");
  const [saveError, setSaveError] = useState<string | null>(null);

  const loading = deal === null || deal.id !== dealId;

  function refetch() {
    fetch(`/api/deals/${dealId}`)
      .then((r) => r.json())
      .then((data) => setDeal(data));
  }

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
    setSaveError(null);
    const financial = Object.keys(patch).some((key) => (FINANCIAL_FIELDS as readonly string[]).includes(key));
    let body = patch;
    if (financial) {
      if (!isAdmin) {
        setSaveError("Only an admin can change financial fields.");
        return;
      }
      const approved = window.confirm("This change should be approved by Shannon.");
      if (!approved) return;
      body = { ...patch, shannonApproval: SHANNON_APPROVAL };
    }
    const res = await fetch(`/api/deals/${dealId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setSaveError(data.error ?? "Could not save.");
      return;
    }
    const updated = await res.json();
    setDeal((current) => (current ? { ...current, ...updated } : current));
    onSaved({ id: dealId, ...updated });
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

  const showConsultationTab = deal ? hasReachedConsultation(deal.stage) : false;
  const showInProgressTabs = deal ? hasReachedInProgress(deal.stage) : false;

  const tabs: { key: TabKey; label: string }[] = [
    { key: "details", label: "Details" },
    ...(showConsultationTab ? [{ key: "consultation" as const, label: "Consultation" }] : []),
    ...(showInProgressTabs ? [{ key: "worksheet" as const, label: "Services Worksheet" }] : []),
    ...(showInProgressTabs ? [{ key: "reimbursements" as const, label: "Reimbursements" }] : []),
    ...(showInProgressTabs ? [{ key: "billables" as const, label: "Total Billables" }] : []),
  ];

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 p-4">
      <div className="flex max-h-[90vh] w-full max-w-3xl flex-col rounded-lg bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-neutral-200 px-5 py-4">
          <h2 className="text-sm font-semibold text-neutral-900">{deal?.displayName || "Project details"}</h2>
          <button onClick={onClose} className="rounded-md p-1 text-neutral-400 hover:bg-neutral-100">
            <X size={18} />
          </button>
        </div>

        {loading || !deal ? (
          <div className="flex-1 p-5 text-sm text-neutral-400">Loading...</div>
        ) : (
          <>
            <div className="border-b border-neutral-200 px-5 py-4">
              <div className="flex items-start justify-between gap-2">
                <input
                  className="w-full border-0 bg-transparent text-lg font-semibold text-neutral-900 focus:outline-none"
                  defaultValue={deal.title ?? ""}
                  placeholder="Untitled project"
                  onBlur={(e) => patchDeal({ title: e.target.value || null })}
                />
                {!deal.contactSaved ? (
                  <button
                    onClick={() => setShowSaveContact(true)}
                    className="shrink-0 rounded-md bg-amber-500 px-3 py-1.5 text-xs font-medium text-white hover:bg-amber-600"
                  >
                    Save Contact
                  </button>
                ) : (
                  <button
                    onClick={() => setShowSaveContact(true)}
                    className="shrink-0 rounded-md border border-neutral-300 px-3 py-1.5 text-xs font-medium text-neutral-600 hover:bg-neutral-50"
                  >
                    Edit contact
                  </button>
                )}
              </div>
              <p className="mt-0.5 text-sm text-neutral-600">
                <Link href={`/clients/${deal.contact.id}`} className="underline">
                  {clientLabel(deal.contact)}
                </Link>
              </p>
              <p className="text-xs text-neutral-400">{deal.contact.email || deal.contact.phone || "No contact info"}</p>
            </div>

            <div className="flex gap-1 border-b border-neutral-200 px-5 pt-2">
              {tabs.map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`rounded-t-md px-3 py-1.5 text-xs font-medium ${
                    activeTab === tab.key
                      ? "border-b-2 border-neutral-900 text-neutral-900"
                      : "text-neutral-500 hover:text-neutral-700"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <div className="flex-1 overflow-y-auto px-5 py-4">
              {activeTab === "details" && (
                <div className="space-y-6">
                  {saveError && <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{saveError}</p>}
                  {deal.editedFields && deal.editedFields.length > 0 && (
                    <p className="rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-800">
                      Edited in this app: {deal.editedFields.join(", ")}. Imported values stay visible under those fields.
                    </p>
                  )}
                  {deal.problems && deal.problems.length > 0 && (
                    <ul className="space-y-1 text-xs text-amber-800">
                      {deal.problems.map((problem) => (
                        <li key={problem.id}>
                          <Link href="/data-problems" prefetch={false} className="underline">
                            {problem.detail}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  )}
                  <section className="space-y-3">
                    <FieldRow label="Stage">
                      <SelectButton
                        value={deal.stage}
                        onChange={(value) => patchDeal({ stage: value })}
                        options={Object.entries(STAGE_LABELS).map(([value, label]) => ({ value, label }))}
                      />
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
                      <SelectButton
                        value={deal.serviceType ?? ""}
                        onChange={(value) => patchDeal({ serviceType: value || null })}
                        placeholder="—"
                        options={Object.entries(SERVICE_TYPE_LABELS).map(([value, label]) => ({ value, label }))}
                      />
                    </FieldRow>

                    <FieldRow label="Source">
                      <SelectButton
                        value={deal.source}
                        onChange={(value) => patchDeal({ source: value })}
                        options={Object.entries(SOURCE_LABELS).map(([value, label]) => ({ value, label }))}
                      />
                    </FieldRow>

                    <FieldRow label="Assigned to">
                      <SelectButton
                        value={deal.assignedTo?.id ?? ""}
                        onChange={(value) => patchDeal({ assignedToId: value || null })}
                        placeholder="Unassigned"
                        options={[
                          { value: "", label: "Unassigned" },
                          ...users.map((u) => ({ value: u.id, label: u.name })),
                        ]}
                      />
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
                        className="input min-h-10"
                        defaultValue={deal.closedDealValue ?? ""}
                        onBlur={(e) => patchDeal({ closedDealValue: e.target.value ? Number(e.target.value) : null })}
                      />
                      <Imported field="closedDealValue" deal={deal} />
                    </FieldRow>
                    <FieldRow label="Invoice number">
                      <input
                        className="input min-h-10"
                        defaultValue={deal.invoiceNumber ?? ""}
                        onBlur={(e) => patchDeal({ invoiceNumber: e.target.value || null })}
                      />
                      <Imported field="invoiceNumber" deal={deal} />
                    </FieldRow>
                    <FieldRow label="Consult date">
                      <input type="date" className="input min-h-10" defaultValue={dateValue(deal.consultDate)} onBlur={(e) => patchDeal({ consultDate: e.target.value || null })} />
                    </FieldRow>
                    <FieldRow label="Project start">
                      <input type="date" className="input min-h-10" defaultValue={dateValue(deal.projectStartDate)} onBlur={(e) => patchDeal({ projectStartDate: e.target.value || null })} />
                    </FieldRow>
                    <FieldRow label="Date closed">
                      <input type="date" className="input min-h-10" defaultValue={dateValue(deal.dateClosed)} onBlur={(e) => patchDeal({ dateClosed: e.target.value || null })} />
                      <Imported field="dateClosed" deal={deal} />
                    </FieldRow>
                    <FieldRow label="Drive folder">
                      <input className="input min-h-10" defaultValue={deal.driveFolderUrl ?? ""} onBlur={(e) => patchDeal({ driveFolderUrl: e.target.value || null })} />
                    </FieldRow>
                    <FieldRow label="Proposal link">
                      <input className="input min-h-10" defaultValue={deal.proposalUrl ?? ""} onBlur={(e) => patchDeal({ proposalUrl: e.target.value || null })} />
                    </FieldRow>
                    <FieldRow label="Contract link">
                      <input className="input min-h-10" defaultValue={deal.contractUrl ?? ""} onBlur={(e) => patchDeal({ contractUrl: e.target.value || null })} />
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

                  <section className="space-y-2 text-sm">
                    <h4 className="text-xs font-semibold uppercase tracking-wide text-neutral-500">Snapshot</h4>
                    <p className="text-xs text-neutral-500">
                      Monday status: {deal.subStatus || "—"}
                      {deal.mondayGroupTitle ? ` · Board group (ignored for stage): ${deal.mondayGroupTitle}` : ""}
                    </p>
                    {deal.dateParseIssues && (
                      <p className="rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-800">{deal.dateParseIssues}</p>
                    )}
                    {deal.projectNotes && <p className="whitespace-pre-wrap text-neutral-700">{deal.projectNotes}</p>}
                    {deal.projectDateTimeText && (
                      <p className="text-xs text-neutral-500">Project date text: {deal.projectDateTimeText}</p>
                    )}
                    <div className="flex flex-wrap gap-x-4 gap-y-1">
                      <ExternalLink href={deal.worksheetUrl}>Worksheet{deal.worksheetFileName ? `: ${deal.worksheetFileName}` : ""}</ExternalLink>
                      <ExternalLink href={deal.driveFolderUrl}>Client Drive folder</ExternalLink>
                      <ExternalLink href={deal.invoicePdfUrl}>
                        Invoice PDF{deal.invoiceFileName ? `: ${deal.invoiceFileName}` : ""}
                      </ExternalLink>
                      <ExternalLink href={deal.invoiceLink}>Invoice link</ExternalLink>
                      <ExternalLink href={deal.consultInvoiceLink}>Consult invoice</ExternalLink>
                      <ExternalLink href={deal.qbDepositPaymentLink}>Deposit payment</ExternalLink>
                      <ExternalLink href={deal.qbFinalPaymentLink}>Final payment</ExternalLink>
                      <ExternalLink href={deal.proposalUrl}>Proposal</ExternalLink>
                      <ExternalLink href={deal.contractUrl}>Contract</ExternalLink>
                      {deal.slackChannelId && (
                        <ExternalLink href={`https://slack.com/app_redirect?channel=${encodeURIComponent(deal.slackChannelId)}`}>
                          Slack channel
                        </ExternalLink>
                      )}
                      <ExternalLink href={deal.mondayUrl}>Monday item (read-only link)</ExternalLink>
                    </div>
                    {deal.relatedDeals && deal.relatedDeals.length > 0 && (
                      <ul className="text-xs text-neutral-600">
                        {deal.relatedDeals.map((related) => (
                          <li key={related.id}>
                            <a className="underline" href={`/pipeline?deal=${related.id}`}>
                              {related.displayName}
                            </a>{" "}
                            · {STAGE_LABELS[related.stage]}
                          </li>
                        ))}
                      </ul>
                    )}
                  </section>

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
                            {n.author?.name ?? "Unknown"} · {formatEasternDateTime(n.createdAt)}
                          </p>
                        </li>
                      ))}
                      {deal.notes.length === 0 && <p className="text-xs text-neutral-400">No notes yet.</p>}
                    </ul>
                  </section>
                </div>
              )}

              {activeTab === "consultation" && (
                <ConsultationTab deal={deal} patchDeal={patchDeal} refetch={refetch} />
              )}

              {activeTab === "worksheet" && (
                <WorksheetTab deal={deal} employees={employees} patchDeal={patchDeal} refetch={refetch} />
              )}

              {activeTab === "reimbursements" && (
                <ReimbursementsTab deal={deal} refetch={refetch} />
              )}

              {activeTab === "billables" && (
                <BillablesTab deal={deal} patchDeal={patchDeal} refetch={refetch} />
              )}
            </div>
          </>
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

function ExternalLink({ href, children }: { href: string | null | undefined; children: React.ReactNode }) {
  if (!href?.trim()) return null;
  return (
    <a href={href} target="_blank" rel="noreferrer" className="text-sm text-blue-800 underline">
      {children}
    </a>
  );
}

function dateValue(value: string | null | undefined) {
  return value ? value.slice(0, 10) : "";
}

function Imported({ field, deal }: { field: string; deal: DealDetail }) {
  if (!deal.editedFields?.includes(field)) return null;
  const original = deal.importedValues?.[field];
  return (
    <p className="mt-1 text-[11px] text-amber-700">
      Edited. Imported: {original == null || original === "" ? "—" : String(original)}
    </p>
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
