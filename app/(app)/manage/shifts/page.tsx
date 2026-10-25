import type { Metadata } from "next";
import { ShiftBoard } from "@/components/shifts/shift-board";

// AppShell resolves the session client-side, so this segment never renders on the server shell.
export const instant = false;

export const metadata: Metadata = { title: "Quản lý ca" };

export default function ManageShiftsPage() {
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-semibold">Quản lý ca</h1>
      <ShiftBoard />
    </div>
  );
}
