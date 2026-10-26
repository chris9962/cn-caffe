import type { Metadata } from "next";
import { Suspense } from "react";
import { ShiftDetail } from "@/components/shifts/shift-detail";
import { Loading } from "@/components/ui/loading";

// AppShell resolves the session client-side, so this segment never renders on the server shell.
export const instant = false;

export const metadata: Metadata = { title: "Chi tiết ca" };

export default function ShiftDetailPage({ params }: { params: Promise<{ id: string }> }) {
  return (
    <Suspense fallback={<Loading label="Đang tải..." />}>
      {params.then(({ id }) => (
        <ShiftDetail shiftId={id} />
      ))}
    </Suspense>
  );
}
