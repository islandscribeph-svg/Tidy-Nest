"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

const LINKS = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/pipeline", label: "Pipeline" },
  { href: "/calendar", label: "Calendar" },
  { href: "/contacts", label: "Contacts" },
  { href: "/hours", label: "Hours" },
  { href: "/data-problems", label: "Data problems" },
  { href: "/employees", label: "Employees" },
];

export function NavBar({
  userName,
  role,
  brandColor,
  logoPath,
  snapshotLabel,
}: {
  userName: string;
  role: string;
  brandColor: string;
  logoPath: string;
  snapshotLabel: string;
}) {
  const pathname = usePathname();
  const router = useRouter();

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  const links = role === "ADMIN" ? [...LINKS, { href: "/settings", label: "Settings" }] : LINKS;

  return (
    <header style={{ backgroundColor: brandColor }}>
      <div className="flex items-center justify-between px-6 py-3">
      <div className="flex items-center gap-8">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={logoPath} alt="Tidy Nest" className="h-7 w-auto" />
        <nav className="flex flex-wrap gap-1">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`rounded-md px-3 py-1.5 text-sm font-medium ${
                pathname.startsWith(link.href)
                  ? "bg-white/15 text-white"
                  : "text-white/75 hover:bg-white/10 hover:text-white"
              }`}
            >
              {link.label}
            </Link>
          ))}
        </nav>
      </div>
      <div className="flex shrink-0 items-center gap-3 text-sm text-white/80">
        <span>
          {userName} <span className="text-white/60">· {role}</span>
        </span>
        <button onClick={handleLogout} className="rounded-md px-2 py-1 text-white/80 hover:bg-white/10">
          Sign out
        </button>
      </div>
      </div>
      <p className="px-6 pb-2 text-xs text-white/80">{snapshotLabel}</p>
    </header>
  );
}
