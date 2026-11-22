"use client";

import { useState, type ReactNode } from "react";

export function ViewsMenu({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="min-h-11 shrink-0 rounded-xl border border-[#e4dfd2] bg-white px-3 text-sm font-medium text-[#1c2116]"
      >
        Views and export
      </button>
      {open && (
        <div className="fixed inset-0 z-50 flex items-end bg-black/40">
          <button type="button" className="absolute inset-0" aria-label="Close views and export" onClick={() => setOpen(false)} />
          <div className="relative max-h-[85vh] w-full overflow-y-auto rounded-t-2xl bg-white p-4 pb-8 shadow-xl">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-base font-semibold text-[#1c2116]">Views and export</h2>
              <button type="button" className="min-h-11 px-2 text-sm text-neutral-600" onClick={() => setOpen(false)}>
                Close
              </button>
            </div>
            <div className="flex flex-col gap-3">{children}</div>
          </div>
        </div>
      )}
    </>
  );
}
