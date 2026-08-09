"use client";

import { useState } from "react";
import type { DealDetail } from "@/lib/types";

const QUICKBOOKS_URL = "https://qbo.intuit.com/app/invoices/new";

export function ConsultationTab({
  deal,
  patchDeal,
  refetch,
}: {
  deal: DealDetail;
  patchDeal: (patch: Record<string, unknown>) => Promise<void>;
  refetch: () => void;
}) {
  const [newItem, setNewItem] = useState("");
  const [adding, setAdding] = useState(false);

  async function addItem() {
    if (!newItem.trim()) return;
    setAdding(true);
    const res = await fetch(`/api/deals/${deal.id}/checklist`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ label: newItem }),
    });
    setAdding(false);
    if (res.ok) {
      setNewItem("");
      refetch();
    }
  }

  async function toggleItem(id: string, done: boolean) {
    await fetch(`/api/checklist-items/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ done }),
    });
    refetch();
  }

  async function deleteItem(id: string) {
    await fetch(`/api/checklist-items/${id}`, { method: "DELETE" });
    refetch();
  }

  return (
    <div className="space-y-6">
      <section>
        <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-neutral-500">Checklist</h4>
        <ul className="mb-3 space-y-1.5">
          {deal.checklistItems.map((item) => (
            <li key={item.id} className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={item.done}
                onChange={(e) => toggleItem(item.id, e.target.checked)}
                className="h-4 w-4 rounded border-neutral-300"
              />
              <span className={`flex-1 text-sm ${item.done ? "text-neutral-400 line-through" : "text-neutral-800"}`}>
                {item.label}
              </span>
              <button
                onClick={() => deleteItem(item.id)}
                className="text-xs text-neutral-400 hover:text-red-600"
              >
                Remove
              </button>
            </li>
          ))}
          {deal.checklistItems.length === 0 && (
            <li className="text-xs text-neutral-400">No checklist items yet.</li>
          )}
        </ul>
        <div className="flex gap-2">
          <input
            className="input"
            placeholder="Add checklist item..."
            value={newItem}
            onChange={(e) => setNewItem(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addItem()}
          />
          <button
            onClick={addItem}
            disabled={adding}
            className="shrink-0 rounded-md bg-neutral-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-neutral-800 disabled:opacity-50"
          >
            Add
          </button>
        </div>
      </section>

      <section>
        <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-neutral-500">Consultation date</h4>
        <input
          type="date"
          className="input"
          defaultValue={deal.consultDate ? deal.consultDate.slice(0, 10) : ""}
          onBlur={(e) => patchDeal({ consultDate: e.target.value || null })}
        />
      </section>

      <section>
        <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-neutral-500">Consult invoice</h4>
        <a
          href={QUICKBOOKS_URL}
          target="_blank"
          rel="noreferrer"
          className="mb-3 inline-block rounded-md bg-[#2CA01C] px-3 py-1.5 text-xs font-medium text-white hover:opacity-90"
        >
          Create Consult Invoice on QuickBooks ↗
        </a>
        <p className="mb-3 text-[11px] text-neutral-400">
          Opens QuickBooks in a new tab. Once the invoice is created there, paste its number/link back here.
        </p>
        <div className="grid grid-cols-2 gap-3">
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-neutral-600">Invoice number</span>
            <input
              className="input"
              defaultValue={deal.consultInvoiceNumber ?? ""}
              onBlur={(e) => patchDeal({ consultInvoiceNumber: e.target.value || null })}
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-neutral-600">Invoice link</span>
            <input
              className="input"
              defaultValue={deal.consultInvoiceLink ?? ""}
              onBlur={(e) => patchDeal({ consultInvoiceLink: e.target.value || null })}
            />
          </label>
        </div>
      </section>
    </div>
  );
}
