"use client";

import { useState, type FormEvent } from "react";
import { ErrorMessage } from "@/components/ui/error-message";
import { Loading } from "@/components/ui/loading";
import { useFetch } from "@/hooks/use-fetch";
import { useMutation } from "@/hooks/use-mutation";
import { PERMISSION_LABELS } from "@/lib/employees/permission-labels";
import type { Branch } from "@/types/branch";
import type { ManagerPermission } from "@/types/employee";

type ManagerAccess = { branchIds: string[]; permissions: ManagerPermission[] };

const PERMISSIONS = Object.keys(PERMISSION_LABELS) as ManagerPermission[];

const checkboxClass =
  "size-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700 dark:focus-visible:outline-blue-400";

function toggle<T>(list: T[], item: T, checked: boolean) {
  return checked ? [...list, item] : list.filter((value) => value !== item);
}

function ManagerAccessFields({
  managerId,
  branches,
  initial,
}: {
  managerId: string;
  branches: Branch[];
  initial: ManagerAccess;
}) {
  const { mutate, isPending, error } = useMutation();
  const [branchIds, setBranchIds] = useState(initial.branchIds);
  const [permissions, setPermissions] = useState(initial.permissions);
  const [saved, setSaved] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaved(false);
    try {
      await mutate(`/api/admin/managers/${managerId}/access`, {
        method: "PUT",
        body: { branchIds, permissions },
      });
    } catch {
      return;
    }
    setSaved(true);
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <fieldset className="flex flex-col gap-2">
        <legend className="mb-2 font-medium">Chi nhánh phụ trách</legend>
        {branches.map((branch) => (
          <label key={branch.id} className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={branchIds.includes(branch.id)}
              onChange={(event) => setBranchIds(toggle(branchIds, branch.id, event.target.checked))}
              className={checkboxClass}
            />
            {branch.isActive ? branch.name : `${branch.name} (ngừng hoạt động)`}
          </label>
        ))}
      </fieldset>
      <fieldset className="flex flex-col gap-2">
        <legend className="mb-2 font-medium">Quyền</legend>
        {PERMISSIONS.map((permission) => (
          <label key={permission} className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={permissions.includes(permission)}
              onChange={(event) => setPermissions(toggle(permissions, permission, event.target.checked))}
              className={checkboxClass}
            />
            {PERMISSION_LABELS[permission]}
          </label>
        ))}
      </fieldset>
      {error && <ErrorMessage message={error} />}
      <div role="status">{saved ? "Đã lưu." : null}</div>
      <button
        type="submit"
        disabled={isPending}
        className="w-fit rounded bg-blue-700 px-4 py-2 font-medium text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700 dark:focus-visible:outline-blue-400 disabled:opacity-60"
      >
        Lưu phân quyền
      </button>
    </form>
  );
}

export function ManagerAccessForm({ managerId }: { managerId: string }) {
  const branches = useFetch<Branch[]>("/api/admin/branches");
  const access = useFetch<ManagerAccess>(`/api/admin/managers/${managerId}/access`);

  return (
    <section aria-labelledby="manager-access-heading" className="flex flex-col gap-4">
      <h2 id="manager-access-heading" className="text-xl font-semibold">
        Phân quyền quản lý
      </h2>
      {branches.error || access.error ? (
        <ErrorMessage message={(branches.error ?? access.error) as string} />
      ) : branches.data && access.data ? (
        <ManagerAccessFields
          key={managerId}
          managerId={managerId}
          branches={branches.data}
          initial={access.data}
        />
      ) : (
        <Loading label="Đang tải..." />
      )}
    </section>
  );
}
