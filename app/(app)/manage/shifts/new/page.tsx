import type { Metadata } from "next";
import { ManualShiftForm } from "@/components/shifts/manual-shift-form";

// AppShell resolves the session client-side, so this segment never renders on the server shell.
export const instant = false;

export const metadata: Metadata = { title: "Thêm ca thủ công" };

export default function NewShiftPage() {
  return (
    <div className="flex flex-col gap-4">
      <h1 className="ui-title">Thêm ca thủ công</h1>
      <ManualShiftForm />
    </div>
  );
}
