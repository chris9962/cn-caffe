import type { Metadata } from "next";
import Link from "next/link";
import { BranchList } from "@/components/branches/branch-list";

export const metadata: Metadata = { title: "Chi nhánh" };

export default function BranchesPage() {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="ui-title">Chi nhánh</h1>
        <Link
          href="/admin/branches/new"
          className="ui-btn"
        >
          Thêm chi nhánh
        </Link>
      </div>
      <BranchList />
    </div>
  );
}
