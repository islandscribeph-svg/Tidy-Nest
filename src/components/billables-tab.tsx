"use client";

import { useState } from "react";
import type { DealDetail } from "@/lib/types";

const QUICKBOOKS_URL = "https://qbo.intuit.com/app/invoices/new";

function money(n: number) {
  return n.toLocaleString(undefined, { style: "currency", currency: "USD" });
}

export function BillablesTab({
  deal,
  patchDeal,
  refetch,
}: {
  deal: DealDetail;
  patchDeal: (patch: Record<string, unknown>) => Promise<void>;
  refetch: () => void;
}) {
  const [draft, setDraft] = useState({ description: "", amount: "" });
  const [adding, setAdding] = useState(false);

  const serviceHoursTotal = deal.worksheetEntries.reduce((sum, e) => sum + Number(e.hours) * Number(e.rate), 0);
  const reimbursementsTotal = deal.reimbursementVendors.reduce((sum, v) => {
    const subtotal = v.items.reduce((s, i) => s + Number(i.quantity) * Number(i.unitPrice), 0);
    return sum + subtotal + Number(v.shippingFee) + Number(v.salesTax);
  }, 0);
  const combinedTotal = serviceHoursTotal + reimbursementsTotal;
  const additionalChargesTotal = deal.additionalCharges.reduce((sum, c) => sum + Number(c.amount), 0);
  const invoiceTotal = combinedTotal + additionalChargesTotal;

  async function addCharge() {
    if (!draft.description.trim() || !draft.amount) return;
    setAdding(true);
    const res = await fetch(`/api/deals/${deal.id}/additional-charges`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ description: draft.description, amount: Number(draft.amount) }),
    });
    setAdding(false);
    if (res.ok) {
      setDraft({ description: "", amount: "" });
      refetch();
    }
  }

  async function deleteCharge(id: string) {
    await fetch(`/api/additional-charges/${id}`, { method: "DELETE" });
    refetch();
  }

  return (
    <div className="space-y-6">
      <section className="space-y-2 rounded-md border border-neutral-200 p-4">
        <Row label="Service Hours Total" value={money(serviceHoursTotal)} />
        <Row label="Reimbursements Total" value={money(reimbursementsTotal)} />
        <Row label="Total (Service + Reimbursements)" value={money(combinedTotal)} bold border />
      </section>

      <section>
        <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-neutral-500">Additional charges</h4>
        <ul className="mb-3 space-y-1.5">
          {deal.additionalCharges.map((charge) => (
            <li key={charge.id} className="flex items-center justify-between gap-2 text-sm">
              <span className="text-neutral-700">{charge.description}</span>
              <span className="flex items-center gap-2">
                <span className="text-neutral-900">{money(Number(charge.amount))}</span>
                <button onClick={() => deleteCharge(charge.id)} className="text-xs text-neutral-400 hover:text-red-600">
                  Remove
                </button>
              </span>
            </li>
          ))}
          {deal.additionalCharges.length === 0 && (
            <li className="text-xs text-neutral-400">No additional charges.</li>
          )}
        </ul>
        <div className="flex gap-2">
          <input
            className="input"
            placeholder="Description..."
            value={draft.description}
            onChange={(e) => setDraft((d) => ({ ...d, description: e.target.value }))}
          />
          <input
            type="number"
            className="input w-32"
            placeholder="Amount"
            value={draft.amount}
            onChange={(e) => setDraft((d) => ({ ...d, amount: e.target.value }))}
          />
          <button
            onClick={addCharge}
            disabled={adding}
            className="shrink-0 rounded-md bg-neutral-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-neutral-800 disabled:opacity-50"
          >
            Add
          </button>
        </div>
      </section>

      <section className="rounded-md border border-neutral-300 bg-neutral-50 p-4">
        <Row label="Invoice Total" value={money(invoiceTotal)} bold large />
      </section>

      <section>
        <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-neutral-500">Project invoice</h4>
        <a
          href={QUICKBOOKS_URL}
          target="_blank"
          rel="noreferrer"
          className="mb-3 inline-block rounded-md bg-[#2CA01C] px-3 py-1.5 text-xs font-medium text-white hover:opacity-90"
        >
          Create Project Invoice on QuickBooks ↗
        </a>
        <p className="mb-3 text-[11px] text-neutral-400">
          Opens QuickBooks in a new tab. Once the invoice is created there, paste its number/link back here.
        </p>
        <div className="grid grid-cols-2 gap-3">
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-neutral-600">Invoice number</span>
            <input
              className="input"
              defaultValue={deal.invoiceNumber ?? ""}
              onBlur={(e) => patchDeal({ invoiceNumber: e.target.value || null })}
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-neutral-600">Invoice link</span>
            <input
              className="input"
              defaultValue={deal.invoiceLink ?? ""}
              onBlur={(e) => patchDeal({ invoiceLink: e.target.value || null })}
            />
          </label>
        </div>
      </section>
    </div>
  );
}

function Row({ label, value, bold, large, border }: { label: string; value: string; bold?: boolean; large?: boolean; border?: boolean }) {
  return (
    <div
      className={`flex items-center justify-between ${border ? "border-t border-neutral-200 pt-2" : ""} ${
        bold ? "font-semibold text-neutral-900" : "text-neutral-700"
      } ${large ? "text-lg" : "text-sm"}`}
    >
      <span>{label}</span>
      <span>{value}</span>
    </div>
  );
}
