"use client";

import { useRouter } from "next/navigation";
import { BranchForm } from "@/components/branches/branch-form";

export function BranchCreate() {
  const router = useRouter();
  return <BranchForm onSaved={() => router.push("/admin/branches")} />;
}
