import { prisma } from "@/lib/prisma";
import { presentClientJson } from "@/lib/present";
import { EmployeesTable } from "@/components/employees-table";
import type { EmployeeSummary } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function EmployeesPage() {
  const employees = await prisma.employee.findMany({ orderBy: { name: "asc" } });

  return (
    <div className="p-6">
      <EmployeesTable initialEmployees={presentClientJson(employees) as unknown as EmployeeSummary[]} />
    </div>
  );
}
