import type { Metadata } from "next";
import { BranchCreate } from "@/components/branches/branch-create";
import { BackLink } from "@/components/ui/back-link";

// AppShell resolves the session client-side, so this segment never renders on the server shell.
export const instant = false;

export const metadata: Metadata = { title: "Thêm chi nhánh" };

export default function NewBranchPage() {
  return (
    <div className="flex flex-col gap-4">
      <BackLink href="/admin/branches" label="Danh sách chi nhánh" />
      <h1 className="ui-title">Thêm chi nhánh</h1>
      <BranchCreate />
    </div>
  );
}
