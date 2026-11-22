"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { roleLabel } from "@/lib/roles";

export type UserRow = { id: string; name: string; email: string; role: string };

export function UsersPanel({ users, currentUserId }: { users: UserRow[]; currentUserId: string }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState<string | null>(null);

  async function changeRole(user: UserRow, role: "ADMIN" | "MEMBER") {
    if (role === user.role) return;
    const label = role === "ADMIN" ? "Admin" : "Member";
    if (!window.confirm(`Change ${user.name} to ${label}?`)) return;
    setError(null);
    setPending(user.id);
    const res = await fetch(`/api/users/${user.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role }),
    });
    setPending(null);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Could not change that role.");
      return;
    }
    router.refresh();
  }

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-5">
      <h1 className="text-2xl font-semibold text-[#1c2116]">Users</h1>
      <p className="mt-1 max-w-xl text-sm text-neutral-600">
        New tidynest.com sign-ins start as members. Members can work on projects and contacts. Only admins can change prices, invoices, and settings.
      </p>
      {error && <p className="mt-3 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
      <ul className="mt-4 space-y-3">
        {users.map((user) => (
          <li key={user.id} className="rounded-2xl border border-[#e4dfd2] bg-white p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="font-medium text-[#1c2116]">
                  {user.name}
                  {user.id === currentUserId ? " (you)" : ""}
                </p>
                <p className="text-sm text-neutral-600">{user.email}</p>
                <p className="text-xs text-neutral-500">{roleLabel(user.role)}</p>
              </div>
              <label className="text-sm text-neutral-600">
                Role
                <select
                  className="ml-2 min-h-11 rounded-xl border border-[#e4dfd2] bg-white px-3"
                  value={user.role === "ADMIN" ? "ADMIN" : "MEMBER"}
                  disabled={pending === user.id}
                  onChange={(event) => changeRole(user, event.target.value as "ADMIN" | "MEMBER")}
                >
                  <option value="ADMIN">Admin</option>
                  <option value="MEMBER">Member</option>
                </select>
              </label>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
