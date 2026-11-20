import type { Metadata } from "next";
import { Suspense } from "react";
import { BranchDetail, BranchDetailSkeleton } from "@/components/branches/branch-detail";
import { BackLink } from "@/components/ui/back-link";

// AppShell resolves the session client-side, so this segment never renders on the server shell.
export const instant = false;

export const metadata: Metadata = { title: "Chi tiết chi nhánh" };

export default function BranchDetailPage({ params }: { params: Promise<{ id: string }> }) {
  return (
    <div className="flex flex-col gap-3">
      <BackLink href="/admin/branches" label="Danh sách chi nhánh" />
      <Suspense fallback={<BranchDetailSkeleton />}>
        <BranchDetail params={params} />
      </Suspense>
    </div>
  );
}
