"use client";

import { use } from "react";
import { BranchForm } from "@/components/branches/branch-form";
import { ErrorMessage } from "@/components/ui/error-message";
import { Loading } from "@/components/ui/loading";
import { useFetch } from "@/hooks/use-fetch";
import { useToast } from "@/hooks/use-toast";
import type { Branch } from "@/types/branch";

export function BranchDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { data, error, isLoading, reload } = useFetch<Branch[]>("/api/admin/branches");
  const showToast = useToast();

  function handleSaved() {
    showToast("Đã lưu chi nhánh.");
    reload();
  }

  // The API has no single-branch endpoint, so the list response is the source.
  const branch = data?.find((item) => item.id === id);

  return (
    <div className="flex flex-col gap-8">
      {error ? (
        <ErrorMessage message={error} />
      ) : data === null && isLoading ? (
        <Loading label="Đang tải..." />
      ) : !branch ? (
        <ErrorMessage message="Không tìm thấy chi nhánh." />
      ) : (
        <>
          <h1 className="ui-title">{branch.name}</h1>
          <BranchForm key={branch.id} branch={branch} onSaved={handleSaved} />
        </>
      )}
    </div>
  );
}
