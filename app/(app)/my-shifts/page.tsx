import type { Metadata } from "next";
import { MyShiftList } from "@/components/attendance/my-shift-list";

// AppShell resolves the session client-side, so this segment never renders on the server shell.
export const instant = false;

export const metadata: Metadata = { title: "Ca của tôi" };

export default function MyShiftsPage() {
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
      <header>
        <h1 className="ui-title">Ca của tôi</h1>
        <p className="ui-lead mt-2">Các ca bạn đã làm trong tháng.</p>
      </header>
      <MyShiftList />
    </div>
  );
}
