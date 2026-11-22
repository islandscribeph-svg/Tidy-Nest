"use client";

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { CalendarDays, House, Menu, Plus, Search, SquareKanban, Users } from "lucide-react";
import { CommandBar } from "@/components/command-bar";
import { NewLeadModal } from "@/components/new-lead-modal";
import { roleLabel } from "@/lib/roles";
import { APP_VERSION } from "@/lib/version";

const PRIMARY = [
  { href: "/today", label: "Today", icon: House },
  { href: "/pipeline", label: "Pipeline", icon: SquareKanban },
  { href: "/calendar", label: "Calendar", icon: CalendarDays },
];

const PEOPLE = [
  { href: "/contacts", label: "Contacts" },
  { href: "/partners", label: "Partners" },
  { href: "/employees", label: "Employees" },
];

const MORE = [
  { href: "/hours", label: "Hours" },
  { href: "/dashboard", label: "Charts" },
  { href: "/reports", label: "Reports" },
  { href: "/activity", label: "Activity" },
  { href: "/needs-attention", label: "Needs attention" },
];

function active(pathname: string, href: string) {
  if (href === "/today") return pathname === "/today" || pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function AppShell({
  children,
  userName,
  role,
  brandColor,
  logoPath,
  snapshotLabel,
}: {
  children: ReactNode;
  userName: string;
  role: string;
  brandColor: string;
  logoPath: string;
  snapshotLabel: string;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [sheet, setSheet] = useState<null | "people" | "more">(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [newLead, setNewLead] = useState(false);
  const admin = role === "ADMIN";
  const peopleActive = ["/contacts", "/partners", "/employees", "/clients"].some((href) => active(pathname, href));

  useEffect(() => {
    setSheet(null);
  }, [pathname]);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setSearchOpen(true);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  async function signOut() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  const moreLinks = [...MORE, ...(admin ? [{ href: "/users", label: "Users" }, { href: "/settings", label: "Settings" }] : [])];

  return (
    <div className="flex h-dvh flex-col">
      <header style={{ backgroundColor: brandColor }} className="shrink-0">
        <div className="flex items-center gap-3 px-4 py-3 md:px-6">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={logoPath} alt="Tidy Nest" className="h-7 w-auto" />
          <nav className="ml-4 hidden items-center gap-1 md:flex">
            {PRIMARY.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`rounded-full px-3 py-2 text-sm font-medium ${
                  active(pathname, link.href) ? "bg-white/20 text-white" : "text-white/80 hover:bg-white/10 hover:text-white"
                }`}
              >
                {link.label}
              </Link>
            ))}
            <button
              type="button"
              onClick={() => setSheet(sheet === "people" ? null : "people")}
              className={`rounded-full px-3 py-2 text-sm font-medium ${
                peopleActive || sheet === "people" ? "bg-white/20 text-white" : "text-white/80 hover:bg-white/10 hover:text-white"
              }`}
            >
              People
            </button>
            <button
              type="button"
              onClick={() => setSheet(sheet === "more" ? null : "more")}
              className={`rounded-full px-3 py-2 text-sm font-medium ${
                sheet === "more" ? "bg-white/20 text-white" : "text-white/80 hover:bg-white/10 hover:text-white"
              }`}
            >
              More
            </button>
          </nav>
          <div className="ml-auto flex items-center gap-2">
            <button
              type="button"
              onClick={() => setSearchOpen(true)}
              className="inline-flex min-h-10 items-center gap-2 rounded-full bg-white/10 px-3 text-sm text-white"
              aria-label="Search"
            >
              <Search size={16} />
              <span className="hidden sm:inline">Search</span>
            </button>
            <button
              type="button"
              onClick={() => setNewLead(true)}
              className="inline-flex min-h-10 items-center gap-1 rounded-full bg-white px-3 text-sm font-medium text-[#1c2116]"
            >
              <Plus size={16} />
              New lead
            </button>
            <div className="hidden items-center gap-2 text-sm text-white/85 md:flex">
              <span>
                {userName} <span className="text-white/60">· {roleLabel(role)}</span>
              </span>
              <button type="button" onClick={signOut} className="rounded-full px-2 py-1 hover:bg-white/10">
                Sign out
              </button>
            </div>
          </div>
        </div>
        <p className="px-4 pb-2 text-xs text-white/75 md:px-6">{snapshotLabel}</p>
      </header>

      {sheet && (
        <div className="border-b border-[#e4dfd2] bg-white px-4 py-3 shadow-sm">
          <div className="mx-auto flex max-w-3xl flex-wrap gap-2">
            {(sheet === "people" ? PEOPLE : moreLinks).map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`min-h-11 rounded-full border px-4 py-2 text-sm ${
                  active(pathname, link.href)
                    ? "border-[#5c6b3f] bg-[#5c6b3f] text-white"
                    : "border-[#e4dfd2] bg-[#faf8f3] text-[#1c2116]"
                }`}
              >
                {link.label}
              </Link>
            ))}
            {sheet === "more" && (
              <button type="button" onClick={signOut} className="min-h-11 rounded-full border border-[#e4dfd2] px-4 py-2 text-sm">
                Sign out
              </button>
            )}
          </div>
        </div>
      )}

      <div className="min-h-0 flex-1 overflow-auto pb-20 md:pb-0">{children}</div>

      <nav className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-5 border-t border-[#e4dfd2] bg-white md:hidden">
        {PRIMARY.map((link) => {
          const Icon = link.icon;
          const on = active(pathname, link.href);
          return (
            <Link key={link.href} href={link.href} className={`flex min-h-16 flex-col items-center justify-center gap-1 text-xs ${on ? "text-[#5c6b3f]" : "text-neutral-500"}`}>
              <Icon size={18} />
              {link.label}
            </Link>
          );
        })}
        <button
          type="button"
          onClick={() => setSheet(sheet === "people" ? null : "people")}
          className={`flex min-h-16 flex-col items-center justify-center gap-1 text-xs ${peopleActive ? "text-[#5c6b3f]" : "text-neutral-500"}`}
        >
          <Users size={18} />
          People
        </button>
        <button
          type="button"
          onClick={() => setSheet(sheet === "more" ? null : "more")}
          className="flex min-h-16 flex-col items-center justify-center gap-1 text-xs text-neutral-500"
        >
          <Menu size={18} />
          More
        </button>
      </nav>

      <footer className="hidden border-t border-[#e4dfd2] bg-white px-6 py-2 text-xs text-neutral-500 md:block">
        Tidy Nest {APP_VERSION} · {snapshotLabel}
      </footer>

      <CommandBar open={searchOpen} onClose={() => setSearchOpen(false)} onNewLead={() => setNewLead(true)} />
      {newLead && (
        <NewLeadModal
          onClose={() => setNewLead(false)}
          onCreated={(deal) => {
            setNewLead(false);
            router.push(`/pipeline?deal=${deal.id}`);
            router.refresh();
          }}
        />
      )}
    </div>
  );
}
