"use client";

import { useState, type FormEvent } from "react";
import { ErrorMessage } from "@/components/ui/error-message";
import { MoneyField } from "@/components/ui/money-field";
import { MonthPicker } from "@/components/ui/month-picker";
import { FormSkeleton } from "@/components/ui/skeleton";
import { TimeField } from "@/components/ui/time-field";
import { useFetch } from "@/hooks/use-fetch";
import { useMutation } from "@/hooks/use-mutation";
import { useToast } from "@/hooks/use-toast";
import { currentMonth } from "@/lib/date";
import { formatMonthLabel } from "@/lib/payroll/format";
import type { MonthlyConfig } from "@/types/payroll";

function MonthlyConfigFields({ config, onSaved }: { config: MonthlyConfig; onSaved: () => void }) {
  const { mutate, isPending, error } = useMutation<MonthlyConfig>();
  const [overtimeStart, setOvertimeStart] = useState(config.overtimeStart);
  const [overtimeEnd, setOvertimeEnd] = useState(config.overtimeEnd);
  const [overtimeHourlyRate, setOvertimeHourlyRate] = useState(String(config.overtimeHourlyRate));
  const [maxShiftHours, setMaxShiftHours] = useState(String(config.maxShiftMinutes / 60));
  const [fullTimeDailyHours, setFullTimeDailyHours] = useState(String(config.fullTimeDailyMinutes / 60));
  const [fullTimeOvertimeRate, setFullTimeOvertimeRate] = useState(String(config.fullTimeOvertimeHourlyRate));
  const showToast = useToast();

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    try {
      await mutate("/api/admin/monthly-config", {
        method: "PUT",
        body: {
          month: config.month,
          overtimeStart,
          overtimeEnd,
          overtimeHourlyRate: Number(overtimeHourlyRate),
          maxShiftMinutes: Math.round(Number(maxShiftHours) * 60),
          fullTimeDailyMinutes: Math.round(Number(fullTimeDailyHours) * 60),
          fullTimeOvertimeHourlyRate: Number(fullTimeOvertimeRate),
        },
      });
    } catch {
      return;
    }
    showToast("Đã lưu cấu hình.");
    onSaved();
  }

  return (
    <form onSubmit={handleSubmit} className="ui-card flex max-w-2xl flex-col gap-5">
      <h2 className="ui-heading">{formatMonthLabel(config.month)}</h2>
      {config.isLocked && (
        <p className="rounded-lg bg-[var(--bloom-soft)] px-4 py-3 text-sm text-[var(--warning)]">
          Tháng này đã chốt lương nên không sửa được. Mở lại tháng ở Bảng lương nếu cần sửa.
        </p>
      )}
      <fieldset disabled={config.isLocked} className="flex flex-col gap-5 disabled:opacity-60">
        <legend className="sr-only">Cấu hình lương tháng</legend>
        <h3 className="ui-label">Bán thời gian</h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="overtime-start" className="ui-label">
              Tăng ca bắt đầu lúc
            </label>
            <TimeField id="overtime-start" required value={overtimeStart} onChange={setOvertimeStart} />
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="overtime-end" className="ui-label">
              Tăng ca kết thúc lúc
            </label>
            <TimeField
              id="overtime-end"
              required
              value={overtimeEnd}
              onChange={setOvertimeEnd}
              describedBy="overtime-end-hint"
            />
            <p id="overtime-end-hint" className="ui-hint">
              Giờ kết thúc sớm hơn giờ bắt đầu nghĩa là sáng hôm sau, ví dụ 23:00 → 06:00.
            </p>
          </div>
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="overtime-rate" className="ui-label">
            Lương tăng ca bán thời gian (đồng/giờ)
          </label>
          <MoneyField
            id="overtime-rate"
            required
            value={overtimeHourlyRate}
            onChange={setOvertimeHourlyRate}
            aria-describedby="overtime-rate-hint"
            className="ui-field"
          />
          <p id="overtime-rate-hint" className="ui-hint">
            Một mức chung cho mọi nhân viên bán thời gian. Giờ làm trong khung tăng ca chỉ tính theo mức này,
            không tính thêm theo mức lương của nhân viên.
          </p>
        </div>
        <h3 className="ui-label border-t border-[var(--line)] pt-5">Toàn thời gian</h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="full-time-daily-hours" className="ui-label">
              Số giờ thường mỗi ngày
            </label>
            <input
              id="full-time-daily-hours"
              type="number"
              inputMode="decimal"
              min={0.5}
              max={24}
              step={0.5}
              required
              value={fullTimeDailyHours}
              onChange={(event) => setFullTimeDailyHours(event.target.value)}
              aria-describedby="full-time-daily-hint"
              className="ui-field"
            />
            <p id="full-time-daily-hint" className="ui-hint">
              Giờ làm trong ngày đến mức này tính theo mức lương của từng nhân viên.
            </p>
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="full-time-overtime-rate" className="ui-label">
              Lương tăng ca toàn thời gian (đồng/giờ)
            </label>
            <MoneyField
              id="full-time-overtime-rate"
              required
              value={fullTimeOvertimeRate}
              onChange={setFullTimeOvertimeRate}
              aria-describedby="full-time-overtime-hint"
              className="ui-field"
            />
            <p id="full-time-overtime-hint" className="ui-hint">
              Một mức chung cho giờ làm vượt số giờ thường của ngày, không tính thêm theo mức lương của nhân viên.
            </p>
          </div>
        </div>
        <div className="flex flex-col gap-1.5 border-t border-[var(--line)] pt-5">
          <label htmlFor="max-shift-hours" className="ui-label">
            Thời lượng tối đa của một ca (giờ)
          </label>
          <input
            id="max-shift-hours"
            type="number"
            inputMode="decimal"
            min={1}
            max={48}
            step={0.5}
            required
            value={maxShiftHours}
            onChange={(event) => setMaxShiftHours(event.target.value)}
            aria-describedby="max-shift-hint"
            className="ui-field"
          />
          <p id="max-shift-hint" className="ui-hint">Ca dài hơn mức này sẽ chờ quản lý duyệt.</p>
        </div>
        {error && <ErrorMessage message={error} />}
        <button type="submit" disabled={isPending} className="ui-btn">
          {isPending ? "Đang lưu…" : "Lưu cấu hình"}
        </button>
      </fieldset>
    </form>
  );
}

export function MonthlyConfigForm() {
  const [month, setMonth] = useState(() => currentMonth());
  const { data, error, isLoading, reload } = useFetch<MonthlyConfig>(
    month === "" ? null : `/api/admin/monthly-config?month=${encodeURIComponent(month)}`,
  );

  return (
    <div className="flex flex-col gap-5">
      <MonthPicker value={month} onChange={setMonth} />
      {error ? (
        <ErrorMessage message={error} />
      ) : !data || (isLoading && data.month !== month) ? (
        <FormSkeleton label="Đang tải cấu hình tháng" fields={6} />
      ) : (
        // Keyed so switching months resets the inputs to that month's values.
        <MonthlyConfigFields key={`${data.month}-${data.isLocked}`} config={data} onSaved={reload} />
      )}
    </div>
  );
}
