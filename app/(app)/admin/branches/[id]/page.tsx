import type { Metadata } from "next";
import { Suspense } from "react";
import { BranchDetail, BranchDetailSkeleton } from "@/components/branches/branch-detail";

// AppShell resolves the session client-side, so this segment never renders on the server shell.
export const instant = false;

export const metadata: Metadata = { title: "Chi tiết chi nhánh" };

export default function BranchDetailPage({ params }: { params: Promise<{ id: string }> }) {
  return (
    <Suspense fallback={<BranchDetailSkeleton />}>
      <BranchDetail params={params} />
    </Suspense>
  );
}
