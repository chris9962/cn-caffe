"use client";

import { useState, type FormEvent } from "react";
import { ErrorMessage } from "@/components/ui/error-message";
import { Loading } from "@/components/ui/loading";
import { useFetch } from "@/hooks/use-fetch";
import { useMutation } from "@/hooks/use-mutation";
import { formatDate } from "@/lib/date";
import { EMPLOYMENT_TYPE_LABELS } from "@/lib/employees/labels";
import { formatMoney } from "@/lib/payroll/format";
import type { Employee, EmploymentType } from "@/types/employee";
import type { PayRate } from "@/types/payroll";

const UNIT: Record<EmploymentType, string> = { part_time: "/giờ", full_time: "/tháng" };

type PayRateSectionProps = { employee: Employee };

export function PayRateSection({ employee }: PayRateSectionProps) {
  const ratesUrl = `/api/admin/employees/${employee.id}/pay-rates`;
  const rates = useFetch<PayRate[]>(ratesUrl);
  const save = useMutation<PayRate>();
  const remove = useMutation();
  // The profile's employment type is only the default for a new rate; each rate carries its own.
  const [employmentType, setEmploymentType] = useState<EmploymentType>(employee.employmentType);
  const [amount, setAmount] = useState("");
  const [effectiveFrom, setEffectiveFrom] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    try {
      await save.mutate(ratesUrl, {
        method: "POST",
        body: { employmentType, amount: Number(amount), effectiveFrom },
      });
    } catch {
      return;
    }
    setAmount("");
    setEffectiveFrom("");
    rates.reload();
  }

  async function handleDelete(rate: PayRate) {
    const label = `${formatMoney(rate.amount)}${UNIT[rate.employmentType]} từ ${formatDate(rate.effectiveFrom)}`;
    if (!window.confirm(`Xoá mức lương ${label}? Các tháng đã chốt không bị ảnh hưởng.`)) return;
    try {
      await remove.mutate(`${ratesUrl}/${rate.id}`, { method: "DELETE" });
    } catch {
      return;
    }
    rates.reload();
  }

  return (
    <section aria-labelledby="pay-rate-heading" className="ui-card flex max-w-2xl flex-col gap-5">
      <div>
        <h2 id="pay-rate-heading" className="ui-heading">
          Mức lương
        </h2>
        <p className="ui-hint mt-1">
          Mỗi ca dùng mức lương có hiệu lực vào ngày của ca. Thêm mức mới khi tăng lương hoặc đổi loại nhân viên.
        </p>
      </div>

      {rates.error ? (
        <ErrorMessage message={rates.error} />
      ) : !rates.data ? (
        <Loading label="Đang tải mức lương..." />
      ) : rates.data.length === 0 ? (
        <p className="rounded-2xl bg-[var(--warning-soft)] px-4 py-3 text-sm text-[var(--warning)]">
          Chưa có mức lương. Ca của nhân viên này sẽ chưa được tính tiền.
        </p>
      ) : (
        <ul className="flex flex-col divide-y divide-[var(--line)] rounded-2xl border border-[var(--line)]">
          {rates.data.map((rate) => (
            <li key={rate.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
              <div>
                <p className="font-semibold">
                  {formatMoney(rate.amount)}
                  <span className="font-normal text-[var(--muted)]">{UNIT[rate.employmentType]}</span>
                </p>
                <p className="ui-hint">
                  {EMPLOYMENT_TYPE_LABELS[rate.employmentType]} · từ {formatDate(rate.effectiveFrom)}
                </p>
              </div>
              <button
                type="button"
                onClick={() => handleDelete(rate)}
                disabled={remove.isPending}
                className="ui-btn-danger min-h-10 px-4 text-sm"
              >
                Xoá
                <span className="sr-only"> mức lương từ {formatDate(rate.effectiveFrom)}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
      {remove.error && <ErrorMessage message={remove.error} />}

      <form onSubmit={handleSubmit} className="flex flex-col gap-4 border-t border-[var(--line)] pt-5">
        <h3 className="ui-label">Thêm mức lương</h3>
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="rate-type" className="ui-label">
              Loại
            </label>
            <select
              id="rate-type"
              value={employmentType}
              onChange={(event) => setEmploymentType(event.target.value as EmploymentType)}
              className="ui-field"
            >
              <option value="part_time">{EMPLOYMENT_TYPE_LABELS.part_time}</option>
              <option value="full_time">{EMPLOYMENT_TYPE_LABELS.full_time}</option>
            </select>
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="rate-amount" className="ui-label">
              Số tiền (đồng{UNIT[employmentType]})
            </label>
            <input
              id="rate-amount"
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
            <label htmlFor="rate-from" className="ui-label">
              Áp dụng từ ngày
            </label>
            <input
              id="rate-from"
              type="date"
              required
              value={effectiveFrom}
              onChange={(event) => setEffectiveFrom(event.target.value)}
              className="ui-field"
            />
          </div>
        </div>
        {save.error && <ErrorMessage message={save.error} />}
        <button type="submit" disabled={save.isPending} className="ui-btn">
          {save.isPending ? "Đang thêm..." : "Thêm mức lương"}
        </button>
      </form>
    </section>
  );
}
