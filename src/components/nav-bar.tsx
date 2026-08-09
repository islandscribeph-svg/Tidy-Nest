"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

const LINKS = [
  { href: "/pipeline", label: "Pipeline" },
  { href: "/contacts", label: "Contacts" },
  { href: "/employees", label: "Employees" },
  { href: "/reports", label: "Reports" },
];

export function NavBar({ userName, role }: { userName: string; role: string }) {
  const pathname = usePathname();
  const router = useRouter();

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <header className="flex items-center justify-between border-b border-neutral-200 bg-white px-6 py-3">
      <div className="flex items-center gap-8">
        <span className="text-sm font-semibold tracking-tight text-neutral-900">Tidy Nest</span>
        <nav className="flex gap-1">
          {LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`rounded-md px-3 py-1.5 text-sm font-medium ${
                pathname.startsWith(link.href)
                  ? "bg-neutral-900 text-white"
                  : "text-neutral-600 hover:bg-neutral-100"
              }`}
            >
              {link.label}
            </Link>
          ))}
        </nav>
      </div>
      <div className="flex items-center gap-3 text-sm text-neutral-500">
        <span>
          {userName} <span className="text-neutral-400">· {role}</span>
        </span>
        <button onClick={handleLogout} className="rounded-md px-2 py-1 text-neutral-500 hover:bg-neutral-100">
          Sign out
        </button>
      </div>
    </header>
  );
}
