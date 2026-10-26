import type { Metadata } from "next";
import { Suspense } from "react";
import { EmployeeDetail } from "@/components/employees/employee-detail";
import { Loading } from "@/components/ui/loading";

// AppShell resolves the session client-side, so this segment never renders on the server shell.
export const instant = false;

export const metadata: Metadata = { title: "Chi tiết nhân viên" };

export default function EmployeeDetailPage({ params }: { params: Promise<{ id: string }> }) {
  return (
    <Suspense fallback={<Loading label="Đang tải..." />}>
      <EmployeeDetail params={params} />
    </Suspense>
  );
}
