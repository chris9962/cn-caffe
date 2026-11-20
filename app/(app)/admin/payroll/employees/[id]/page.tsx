import type { Metadata } from "next";
import { Suspense } from "react";
import { EmployeePayHistory, EmployeePayHistorySkeleton } from "@/components/payroll/employee-pay-history";

// AppShell resolves the session client-side, so this segment never renders on the server shell.
export const instant = false;

export const metadata: Metadata = { title: "Lương theo tháng" };

export default function EmployeePayHistoryPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ year?: string | string[] }>;
}) {
  return (
    <Suspense fallback={<EmployeePayHistorySkeleton />}>
      <EmployeePayHistory params={params} searchParams={searchParams} />
    </Suspense>
  );
}
