import type { Metadata } from "next";
import { PayrollBoard } from "@/components/payroll/payroll-board";

// AppShell resolves the session client-side, so this segment never renders on the server shell.
export const instant = false;

export const metadata: Metadata = { title: "Bảng lương" };

export default function PayrollPage() {
  return <PayrollBoard />;
}
