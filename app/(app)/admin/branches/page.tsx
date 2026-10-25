import Link from "next/link";
import { BranchList } from "@/components/branches/branch-list";

export default function BranchesPage() {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-2xl font-semibold">Chi nhánh</h1>
        <Link
          href="/admin/branches/new"
          className="rounded bg-blue-700 px-4 py-2 font-medium text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700 dark:focus-visible:outline-blue-400"
        >
          Thêm chi nhánh
        </Link>
      </div>
      <BranchList />
    </div>
  );
}
