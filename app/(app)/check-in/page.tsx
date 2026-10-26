import type { Metadata } from "next";
import { CheckInPanel } from "@/components/attendance/check-in-panel";

// AppShell resolves the session client-side, so this segment never renders on the server shell.
export const instant = false;

export const metadata: Metadata = { title: "Check in" };

export default function CheckInPage() {
  return <CheckInPanel />;
}
