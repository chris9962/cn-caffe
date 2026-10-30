import { AttendanceExemptOverview } from "@/components/employees/attendance-exempt-overview";

// AppShell resolves the session client-side, so this segment never renders on the server shell.
export const instant = false;

export default function OverviewPage() {
  return <AttendanceExemptOverview />;
}
