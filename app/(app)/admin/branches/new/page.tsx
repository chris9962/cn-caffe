import type { Metadata } from "next";
import { BranchCreate } from "@/components/branches/branch-create";

export const metadata: Metadata = { title: "Thêm chi nhánh" };

export default function NewBranchPage() {
  return (
    <div className="flex flex-col gap-4">
      <h1 className="ui-title">Thêm chi nhánh</h1>
      <BranchCreate />
    </div>
  );
}
