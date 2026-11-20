"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { BranchForm } from "@/components/branches/branch-form";

export function BranchCreate() {
  const router = useRouter();
  // Next keeps this page alive after leaving it, so a new key empties the form for the next branch.
  const [formKey, setFormKey] = useState(0);
  return (
    <BranchForm
      key={formKey}
      onSaved={() => {
        setFormKey((key) => key + 1);
        router.push("/admin/branches");
      }}
    />
  );
}
