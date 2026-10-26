"use client";

import { useRouter } from "next/navigation";
import { useId, useState, type FormEvent } from "react";
import { BranchPicker } from "@/components/attendance/branch-picker";
import { MISSING_TIMES_MESSAGE, ShiftTimeFields, type ShiftTimes } from "@/components/shifts/shift-time-fields";
import { ErrorMessage } from "@/components/ui/error-message";
import { Loading } from "@/components/ui/loading";
import { useFetch } from "@/hooks/use-fetch";
import { useMutation } from "@/hooks/use-mutation";
import { toVietnamIso } from "@/lib/date";
import { isAdmin, managedBranches } from "@/lib/shifts/access";
import type { Branch } from "@/types/branch";
import type { CurrentUser } from "@/types/employee";
import type { Shift } from "@/types/shift";

type EmployeeOption = { id: string; fullName: string };

export function ManualShiftForm() {
  const router = useRouter();
  const me = useFetch<CurrentUser>("/api/me");
  const employees = useFetch<EmployeeOption[]>("/api/employees");
  const branches = useFetch<Branch[]>("/api/branches");
  const { mutate, isPending, error } = useMutation<Shift>();
  const [employeeId, setEmployeeId] = useState("");
  const [branchId, setBranchId] = useState("");
  const [times, setTimes] = useState<ShiftTimes>({ checkIn: "", checkOut: "" });
  const [inputError, setInputError] = useState<string | null>(null);
  const employeeSelectId = useId();

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (employeeId === "" || branchId === "") {
      setInputError("Bạn chọn nhân viên và chi nhánh.");
      return;
    }
    // toVietnamIso does not validate, so an empty input would reach the API as a malformed time.
    if (times.checkIn === "" || times.checkOut === "") {
      setInputError(MISSING_TIMES_MESSAGE);
      return;
    }
    setInputError(null);
    let shift: Shift;
    try {
      shift = await mutate("/api/shifts", {
        method: "POST",
        body: {
          employeeId,
          branchId,
          checkInAt: toVietnamIso(times.checkIn),
          checkOutAt: toVietnamIso(times.checkOut),
        },
      });
    } catch {
      return;
    }
    router.push(`/manage/shifts/${shift.id}`);
  }

  const loadError = me.error ?? employees.error ?? branches.error;
  if (loadError) return <ErrorMessage message={loadError} />;
  if (!me.data || !employees.data || !branches.data) return <Loading label="Đang tải..." />;

  const user = me.data;
  // Managers may not add their own shifts; only an admin or director may.
  const employeeOptions = isAdmin(user) ? employees.data : employees.data.filter((item) => item.id !== user.id);
  const message = inputError ?? error;

  return (
    // noValidate: Chrome blocks a half-filled datetime-local with an English bubble; the check below says it in Vietnamese.
    <form onSubmit={handleSubmit} noValidate className="ui-card flex max-w-2xl flex-col gap-5">
      <div className="flex flex-col gap-1.5">
        <label htmlFor={employeeSelectId} className="ui-label">
          Nhân viên
        </label>
        <select
          id={employeeSelectId}
          value={employeeId}
          onChange={(event) => setEmployeeId(event.target.value)}
          className="ui-field"
        >
          <option value="">Chọn nhân viên</option>
          {employeeOptions.map((employee) => (
            <option key={employee.id} value={employee.id}>
              {employee.fullName}
            </option>
          ))}
        </select>
      </div>
      <BranchPicker branches={managedBranches(user, branches.data)} value={branchId} onChange={setBranchId} />
      <ShiftTimeFields value={times} onChange={setTimes} />
      {message && <ErrorMessage message={message} />}
      <button
        type="submit"
        disabled={isPending}
        className="ui-btn"
      >
        Thêm ca
      </button>
    </form>
  );
}
