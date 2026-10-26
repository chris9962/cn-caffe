import type { Metadata } from "next";
import { MyShiftList } from "@/components/attendance/my-shift-list";

// AppShell resolves the session client-side, so this segment never renders on the server shell.
export const instant = false;

export const metadata: Metadata = { title: "Ca của tôi" };

export default function MyShiftsPage() {
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-semibold">Ca của tôi</h1>
      <MyShiftList />
    </div>
  );
}
