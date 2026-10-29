"use client";

export function PrintButton() {
  return (
    <button type="button" className="min-h-10 rounded-md border border-neutral-300 bg-white px-3 text-sm" onClick={() => window.print()}>
      Print
    </button>
  );
}
