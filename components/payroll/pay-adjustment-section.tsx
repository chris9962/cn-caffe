"use client";

import { useState, type FormEvent } from "react";
import { ErrorMessage } from "@/components/ui/error-message";
import { Loading } from "@/components/ui/loading";
import { useFetch } from "@/hooks/use-fetch";
import { useMutation } from "@/hooks/use-mutation";
import { formatSignedMoney } from "@/lib/payroll/format";
import type { Employee } from "@/types/employee";
import type { PayAdjustment } from "@/types/payroll";

type PayAdjustmentSectionProps = { month: string; isLocked: boolean; onChanged: () => void };

export function PayAdjustmentSection({ month, isLocked, onChanged }: PayAdjustmentSectionProps) {
  const adjustments = useFetch<PayAdjustment[]>(`/api/admin/pay-adjustments?month=${month}`);
  const employees = useFetch<Employee[]>("/api/admin/employees");
  const save = useMutation<PayAdjustment>();
  const remove = useMutation();
  const [employeeId, setEmployeeId] = useState("");
  const [kind, setKind] = useState<"add" | "deduct">("add");
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const value = Number(amount);
    try {
      await save.mutate("/api/admin/pay-adjustments", {
        method: "POST",
        body: { employeeId, month, amount: kind === "add" ? value : -value, note },
      });
    } catch {
      return;
    }
    setAmount("");
    setNote("");
    adjustments.reload();
    onChanged();
  }

  async function handleDelete(item: PayAdjustment) {
    if (!window.confirm(`Xoá khoản ${formatSignedMoney(item.amount)} của ${item.employeeName}?`)) return;
    try {
      await remove.mutate(`/api/admin/pay-adjustments/${item.id}`, { method: "DELETE" });
    } catch {
      return;
    }
    adjustments.reload();
    onChanged();
  }

  return (
    <section aria-labelledby="adjustments-heading" className="ui-card flex flex-col gap-5">
      <h2 id="adjustments-heading" className="ui-heading">
        Khoản cộng, trừ
      </h2>

      {adjustments.error ? (
        <ErrorMessage message={adjustments.error} />
      ) : !adjustments.data ? (
        <Loading label="Đang tải..." />
      ) : adjustments.data.length === 0 ? (
        <p className="ui-hint">Tháng này chưa có khoản nào.</p>
      ) : (
        <ul className="flex flex-col divide-y divide-[var(--line)] rounded-2xl border border-[var(--line)]">
          {adjustments.data.map((item) => (
            <li key={item.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
              <div className="min-w-0">
                <p className="font-semibold">
                  {item.employeeName}{" "}
                  <span className={item.amount > 0 ? "text-[var(--success)]" : "text-[var(--danger)]"}>
                    {formatSignedMoney(item.amount)}
                  </span>
                </p>
                <p className="ui-hint">{item.note}</p>
              </div>
              {!isLocked && (
                <button
                  type="button"
                  onClick={() => handleDelete(item)}
                  disabled={remove.isPending}
                  className="ui-btn-danger min-h-10 px-4 text-sm"
                >
                  Xoá<span className="sr-only"> khoản của {item.employeeName}</span>
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
      {remove.error && <ErrorMessage message={remove.error} />}

      {!isLocked && (
        <form onSubmit={handleSubmit} className="flex flex-col gap-4 border-t border-[var(--line)] pt-5">
          <h3 className="ui-label">Thêm khoản</h3>
          <div className="grid gap-4">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="adjustment-employee" className="ui-label">
                Nhân viên
              </label>
              <select
                id="adjustment-employee"
                required
                value={employeeId}
                onChange={(event) => setEmployeeId(event.target.value)}
                className="ui-field"
              >
                <option value="">Chọn nhân viên</option>
                {employees.data?.map((employee) => (
                  <option key={employee.id} value={employee.id}>
                    {employee.fullName}
                    {employee.isActive ? "" : " (đã nghỉ)"}
                  </option>
                ))}
              </select>
            </div>
            <fieldset className="flex flex-col gap-1.5">
              <legend className="ui-label mb-1.5">Loại</legend>
              <div className="flex gap-2">
                {(["add", "deduct"] as const).map((value) => (
                  <label
                    key={value}
                    className="flex min-h-12 flex-1 cursor-pointer items-center justify-center gap-2 rounded-2xl border border-[var(--line)] bg-[var(--background)] px-3 text-sm font-semibold has-[:checked]:border-[var(--accent)] has-[:checked]:bg-[var(--accent-soft)] has-[:checked]:text-[var(--accent-strong)] has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-[var(--accent)]"
                  >
                    <input
                      type="radio"
                      name="adjustment-kind"
                      value={value}
                      checked={kind === value}
                      onChange={() => setKind(value)}
                      className="sr-only"
                    />
                    {value === "add" ? "+ Cộng thêm" : "− Trừ"}
                  </label>
                ))}
              </div>
            </fieldset>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="adjustment-amount" className="ui-label">
                Số tiền (đồng)
              </label>
              <input
                id="adjustment-amount"
                type="number"
                inputMode="numeric"
                min={1}
                step={1000}
                required
                value={amount}
                onChange={(event) => setAmount(event.target.value)}
                className="ui-field"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="adjustment-note" className="ui-label">
                Lý do
              </label>
              <input
                id="adjustment-note"
                type="text"
                required
                placeholder="Ví dụ: thưởng doanh số"
                value={note}
                onChange={(event) => setNote(event.target.value)}
                className="ui-field"
              />
            </div>
          </div>
          {save.error && <ErrorMessage message={save.error} />}
          <button type="submit" disabled={save.isPending} className="ui-btn">
            {save.isPending ? "Đang thêm..." : "Thêm khoản"}
          </button>
        </form>
      )}
    </section>
  );
}
