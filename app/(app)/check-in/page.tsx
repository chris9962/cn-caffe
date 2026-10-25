import { CheckInPanel } from "@/components/attendance/check-in-panel";

// AppShell resolves the session client-side, so this segment never renders on the server shell.
export const instant = false;

export default function CheckInPage() {
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-semibold">Check in</h1>
      <CheckInPanel />
    </div>
  );
}
