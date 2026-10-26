import type { Metadata } from "next";
import { MyPay } from "@/components/payroll/my-pay";

// AppShell resolves the session client-side, so this segment never renders on the server shell.
export const instant = false;

export const metadata: Metadata = { title: "Lương của tôi" };

export default function MyPayPage() {
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
      <header>
        <p className="ui-eyebrow mb-2">Sổ lương</p>
        <h1 className="ui-title">Lương của tôi</h1>
        <p className="ui-lead mt-2">Công sức của bạn trong tháng, tính theo từng ca.</p>
      </header>
      <MyPay />
    </div>
  );
}
