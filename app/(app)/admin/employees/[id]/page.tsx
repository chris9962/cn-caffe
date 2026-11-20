import type { Metadata } from "next";
import { Suspense } from "react";
import { EmployeeDetail, EmployeeDetailSkeleton } from "@/components/employees/employee-detail";

// AppShell resolves the session client-side, so this segment never renders on the server shell.
export const instant = false;

export const metadata: Metadata = { title: "Chi tiết nhân viên" };

export default function EmployeeDetailPage({ params }: { params: Promise<{ id: string }> }) {
  return (
    <Suspense fallback={<EmployeeDetailSkeleton />}>
      <EmployeeDetail params={params} />
    </Suspense>
  );
}
