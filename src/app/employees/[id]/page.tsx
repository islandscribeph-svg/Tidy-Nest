import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { EmployeeTimesheet } from "@/components/employee-timesheet";

export const dynamic = "force-dynamic";

export default async function EmployeeDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const employee = await prisma.employee.findUnique({ where: { id } });
  if (!employee) notFound();

  return (
    <div className="p-6">
      <EmployeeTimesheet employeeId={id} />
    </div>
  );
}
