import { ManualShiftForm } from "@/components/shifts/manual-shift-form";

// AppShell resolves the session client-side, so this segment never renders on the server shell.
export const instant = false;

export default function NewShiftPage() {
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-semibold">Thêm ca bằng tay</h1>
      <ManualShiftForm />
    </div>
  );
}
