import type { Metadata } from "next";
import { MonthlyConfigForm } from "@/components/payroll/monthly-config-form";

// AppShell resolves the session client-side, so this segment never renders on the server shell.
export const instant = false;

export const metadata: Metadata = { title: "Cấu hình tháng" };

export default function MonthlyConfigPage() {
  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="ui-title">Cấu hình tháng</h1>
        <p className="ui-lead mt-2">Khung giờ tăng ca, lương tăng ca và thời lượng tối đa của một ca, riêng cho từng tháng.</p>
      </header>
      <MonthlyConfigForm />
    </div>
  );
}
