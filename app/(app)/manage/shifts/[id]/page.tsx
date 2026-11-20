import type { Metadata } from "next";
import { Suspense } from "react";
import { ShiftDetail, ShiftDetailSkeleton } from "@/components/shifts/shift-detail";

// AppShell resolves the session client-side, so this segment never renders on the server shell.
export const instant = false;

export const metadata: Metadata = { title: "Chi tiết ca" };

export default function ShiftDetailPage({ params }: { params: Promise<{ id: string }> }) {
  return (
    <Suspense fallback={<ShiftDetailSkeleton />}>
      {params.then(({ id }) => (
        <ShiftDetail shiftId={id} />
      ))}
    </Suspense>
  );
}
