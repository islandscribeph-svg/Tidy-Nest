"use client";

import { useState } from "react";
import type { DealDetail, VendorEntry } from "@/lib/types";

function money(n: number) {
  return n.toLocaleString(undefined, { style: "currency", currency: "USD" });
}

function vendorSubtotal(vendor: VendorEntry) {
  return vendor.items.reduce((sum, item) => sum + Number(item.quantity) * Number(item.unitPrice), 0);
}

function vendorGrandTotal(vendor: VendorEntry) {
  return vendorSubtotal(vendor) + Number(vendor.shippingFee) + Number(vendor.salesTax);
}

export function ReimbursementsTab({
  deal,
  refetch,
}: {
  deal: DealDetail;
  refetch: () => void;
}) {
  const [newVendorName, setNewVendorName] = useState("");
  const [addingVendor, setAddingVendor] = useState(false);

  async function addVendor() {
    if (!newVendorName.trim()) return;
    setAddingVendor(true);
    const res = await fetch(`/api/deals/${deal.id}/vendors`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ vendorName: newVendorName }),
    });
    setAddingVendor(false);
    if (res.ok) {
      setNewVendorName("");
      refetch();
    }
  }

  const overviewTotal = deal.reimbursementVendors.reduce((sum, v) => sum + vendorGrandTotal(v), 0);

  return (
    <div className="space-y-6">
      {deal.reimbursementVendors.map((vendor) => (
        <VendorBlock key={vendor.id} vendor={vendor} refetch={refetch} />
      ))}

      <div className="flex gap-2">
        <input
          className="input"
          placeholder="Vendor name..."
          value={newVendorName}
          onChange={(e) => setNewVendorName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && addVendor()}
        />
        <button
          onClick={addVendor}
          disabled={addingVendor}
          className="shrink-0 rounded-md bg-neutral-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-neutral-800 disabled:opacity-50"
        >
          + Add Vendor
        </button>
      </div>

      {deal.reimbursementVendors.length > 1 && (
        <div className="rounded-md border border-neutral-300 bg-neutral-50 p-4">
          <h4 className="mb-2 text-sm font-semibold text-neutral-900">
            Reimbursement Overview for {deal.title || "this project"}
          </h4>
          <ul className="mb-2 space-y-1">
            {deal.reimbursementVendors.map((v) => (
              <li key={v.id} className="flex justify-between text-sm text-neutral-700">
                <span>{v.vendorName}</span>
                <span>{money(vendorGrandTotal(v))}</span>
              </li>
            ))}
          </ul>
          <div className="flex justify-between border-t border-neutral-300 pt-2 text-base font-semibold text-neutral-900">
            <span>Grand Total</span>
            <span>{money(overviewTotal)}</span>
          </div>
        </div>
      )}
    </div>
  );
}

function VendorBlock({
  vendor,
  refetch,
}: {
  vendor: VendorEntry;
  refetch: () => void;
}) {
  const [draft, setDraft] = useState({ itemDetails: "", quantity: "", unitPrice: "" });
  const [adding, setAdding] = useState(false);

  async function updateVendor(patch: Record<string, unknown>) {
    await fetch(`/api/vendors/${vendor.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    refetch();
  }

  async function deleteVendor() {
    await fetch(`/api/vendors/${vendor.id}`, { method: "DELETE" });
    refetch();
  }

  async function addItem() {
    if (!draft.itemDetails.trim() || !draft.quantity || !draft.unitPrice) return;
    setAdding(true);
    const res = await fetch(`/api/vendors/${vendor.id}/items`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        itemDetails: draft.itemDetails,
        quantity: Number(draft.quantity),
        unitPrice: Number(draft.unitPrice),
      }),
    });
    setAdding(false);
    if (res.ok) {
      setDraft({ itemDetails: "", quantity: "", unitPrice: "" });
      refetch();
    }
  }

  async function updateItem(id: string, patch: Record<string, unknown>) {
    await fetch(`/api/reimbursement-items/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    refetch();
  }

  async function deleteItem(id: string) {
    await fetch(`/api/reimbursement-items/${id}`, { method: "DELETE" });
    refetch();
  }

  const subtotal = vendorSubtotal(vendor);
  const grandTotal = vendorGrandTotal(vendor);

  return (
    <div className="rounded-md border border-neutral-200 p-4">
      <div className="mb-3 flex items-center justify-between gap-2">
        <input
          className="text-sm font-semibold text-neutral-900 border-0 bg-transparent focus:outline-none"
          defaultValue={vendor.vendorName}
          onBlur={(e) => updateVendor({ vendorName: e.target.value })}
        />
        <button onClick={deleteVendor} className="text-xs text-neutral-400 hover:text-red-600">
          Remove vendor
        </button>
      </div>

      <div className="overflow-hidden rounded-md border border-neutral-200">
        <table className="w-full text-sm">
          <thead className="bg-neutral-50 text-xs uppercase tracking-wide text-neutral-500">
            <tr>
              <th className="px-3 py-2 text-left font-medium">Item Details</th>
              <th className="w-20 px-3 py-2 text-right font-medium">Quantity</th>
              <th className="w-24 px-3 py-2 text-right font-medium">Unit Price</th>
              <th className="w-24 px-3 py-2 text-right font-medium">Total</th>
              <th className="w-8 px-2 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {vendor.items.map((item) => (
              <tr key={item.id} className="border-t border-neutral-100">
                <td className="px-3 py-1.5">
                  <input
                    className="w-full border-0 bg-transparent text-sm focus:outline-none"
                    defaultValue={item.itemDetails}
                    onBlur={(e) => updateItem(item.id, { itemDetails: e.target.value })}
                  />
                </td>
                <td className="px-3 py-1.5">
                  <input
                    type="number"
                    className="w-full border-0 bg-transparent text-right text-sm focus:outline-none"
                    defaultValue={item.quantity}
                    onBlur={(e) => updateItem(item.id, { quantity: Number(e.target.value) })}
                  />
                </td>
                <td className="px-3 py-1.5">
                  <input
                    type="number"
                    className="w-full border-0 bg-transparent text-right text-sm focus:outline-none"
                    defaultValue={item.unitPrice}
                    onBlur={(e) => updateItem(item.id, { unitPrice: Number(e.target.value) })}
                  />
                </td>
                <td className="px-3 py-1.5 text-right text-sm text-neutral-700">
                  {money(Number(item.quantity) * Number(item.unitPrice))}
                </td>
                <td className="px-2 py-1.5 text-center">
                  <button onClick={() => deleteItem(item.id)} className="text-neutral-400 hover:text-red-600">
                    ×
                  </button>
                </td>
              </tr>
            ))}
            <tr className="border-t border-neutral-100 bg-neutral-50/50">
              <td className="px-3 py-1.5">
                <input
                  className="w-full border-0 bg-transparent text-sm focus:outline-none"
                  placeholder="New item..."
                  value={draft.itemDetails}
                  onChange={(e) => setDraft((d) => ({ ...d, itemDetails: e.target.value }))}
                />
              </td>
              <td className="px-3 py-1.5">
                <input
                  type="number"
                  className="w-full border-0 bg-transparent text-right text-sm focus:outline-none"
                  placeholder="0"
                  value={draft.quantity}
                  onChange={(e) => setDraft((d) => ({ ...d, quantity: e.target.value }))}
                />
              </td>
              <td className="px-3 py-1.5">
                <input
                  type="number"
                  className="w-full border-0 bg-transparent text-right text-sm focus:outline-none"
                  placeholder="0"
                  value={draft.unitPrice}
                  onChange={(e) => setDraft((d) => ({ ...d, unitPrice: e.target.value }))}
                />
              </td>
              <td colSpan={2} className="px-2 py-1.5 text-center">
                <button
                  onClick={addItem}
                  disabled={adding}
                  className="rounded-md bg-neutral-900 px-2 py-1 text-xs font-medium text-white hover:bg-neutral-800 disabled:opacity-50"
                >
                  Add
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div className="mt-3 ml-auto w-56 space-y-1.5 text-sm">
        <div className="flex items-center justify-between">
          <span className="text-neutral-500">Subtotal</span>
          <span className="text-neutral-700">{money(subtotal)}</span>
        </div>
        <div className="flex items-center justify-between gap-2">
          <span className="text-neutral-500">Shipping fee</span>
          <input
            type="number"
            className="w-24 rounded border border-neutral-300 px-2 py-1 text-right text-sm"
            defaultValue={vendor.shippingFee}
            onBlur={(e) => updateVendor({ shippingFee: Number(e.target.value) })}
          />
        </div>
        <div className="flex items-center justify-between gap-2">
          <span className="text-neutral-500">Sales tax</span>
          <input
            type="number"
            className="w-24 rounded border border-neutral-300 px-2 py-1 text-right text-sm"
            defaultValue={vendor.salesTax}
            onBlur={(e) => updateVendor({ salesTax: Number(e.target.value) })}
          />
        </div>
        <div className="flex items-center justify-between border-t border-neutral-200 pt-1.5 font-semibold text-neutral-900">
          <span>Grand Total</span>
          <span>{money(grandTotal)}</span>
        </div>
      </div>
    </div>
  );
}
