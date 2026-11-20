import type { Metadata } from "next";
import { Suspense } from "react";
import { ShiftDetail, ShiftDetailSkeleton } from "@/components/shifts/shift-detail";
import { BackLink } from "@/components/ui/back-link";

// AppShell resolves the session client-side, so this segment never renders on the server shell.
export const instant = false;

export const metadata: Metadata = { title: "Chi tiết ca" };

export default function ShiftDetailPage({ params }: { params: Promise<{ id: string }> }) {
  return (
    <div className="flex flex-col gap-3">
      <BackLink href="/manage/shifts" label="Danh sách ca" />
      <Suspense fallback={<ShiftDetailSkeleton />}>
        {params.then(({ id }) => (
          <ShiftDetail shiftId={id} />
        ))}
      </Suspense>
    </div>
  );
}
