"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type Hit = { id: string; label: string; href: string; kind: string };

const PAGES = [
  { label: "Today", href: "/today" },
  { label: "Pipeline", href: "/pipeline" },
  { label: "Calendar", href: "/calendar" },
  { label: "Contacts", href: "/contacts" },
  { label: "Needs attention", href: "/needs-attention" },
  { label: "Hours", href: "/hours" },
  { label: "New lead", href: "#new-lead" },
];

export function CommandBar({
  open,
  onClose,
  onNewLead,
}: {
  open: boolean;
  onClose: () => void;
  onNewLead: () => void;
}) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [hits, setHits] = useState<Hit[]>([]);
  const [active, setActive] = useState(0);

  const pages = useMemo(() => {
    const q = query.trim().toLowerCase();
    return PAGES.filter((page) => !q || page.label.toLowerCase().includes(q));
  }, [query]);

  const items = useMemo(() => {
    const pageItems = pages.map((page) => ({ id: page.href, label: page.label, href: page.href, kind: "Go to" }));
    return [...pageItems, ...hits];
  }, [pages, hits]);

  useEffect(() => {
    if (!open) return;
    setQuery("");
    setHits([]);
    setActive(0);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const q = query.trim();
    if (q.length < 2) {
      setHits([]);
      return;
    }
    const handle = setTimeout(() => {
      fetch(`/api/search?q=${encodeURIComponent(q)}`)
        .then((res) => (res.ok ? res.json() : { deals: [], contacts: [] }))
        .then((data: { deals: { id: string; label: string; href: string }[]; contacts: { id: string; label: string; href: string }[] }) => {
          setHits([
            ...data.deals.map((deal) => ({ ...deal, kind: "Project" })),
            ...data.contacts.map((contact) => ({ ...contact, kind: "Contact" })),
          ]);
          setActive(0);
        })
        .catch(() => setHits([]));
    }, 180);
    return () => clearTimeout(handle);
  }, [open, query]);

  useEffect(() => {
    if (!open) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
      if (event.key === "ArrowDown") {
        event.preventDefault();
        setActive((current) => Math.min(current + 1, Math.max(items.length - 1, 0)));
      }
      if (event.key === "ArrowUp") {
        event.preventDefault();
        setActive((current) => Math.max(current - 1, 0));
      }
      if (event.key === "Enter" && items[active]) {
        event.preventDefault();
        choose(items[active]);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, items, active, onClose, onNewLead]);

  function choose(item: Hit) {
    onClose();
    if (item.href === "#new-lead") {
      onNewLead();
      return;
    }
    router.push(item.href);
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-start justify-center bg-black/40 px-4 pt-[12vh]">
      <div className="w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-xl" role="dialog" aria-label="Search">
        <input
          autoFocus
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search projects, contacts, or pages"
          className="w-full border-b border-[#eeeae1] px-4 py-4 text-base outline-none"
        />
        <ul className="max-h-80 overflow-y-auto py-2">
          {items.length === 0 && <li className="px-4 py-6 text-sm text-neutral-500">No matches.</li>}
          {items.map((item, index) => (
            <li key={`${item.kind}-${item.id}`}>
              <button
                type="button"
                onClick={() => choose(item)}
                className={`flex min-h-11 w-full items-center justify-between px-4 text-left text-sm ${
                  index === active ? "bg-[#f4f1ea]" : ""
                }`}
              >
                <span className="truncate">{item.label}</span>
                <span className="ml-3 shrink-0 text-xs text-neutral-500">{item.kind}</span>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
