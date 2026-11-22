import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { presentClientJson } from "@/lib/present";
import { UsersPanel, type UserRow } from "@/components/users-panel";

export const dynamic = "force-dynamic";

export default async function UsersPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.role !== "ADMIN") redirect("/today");
  const users = await prisma.user.findMany({
    select: { id: true, name: true, email: true, role: true },
    orderBy: { name: "asc" },
  });
  return <UsersPanel users={presentClientJson(users) as UserRow[]} currentUserId={user.id} />;
}
