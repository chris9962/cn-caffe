"use client";

import { useState, type FormEvent } from "react";
import { ErrorMessage } from "@/components/ui/error-message";
import { Loading } from "@/components/ui/loading";
import { MonthPicker } from "@/components/ui/month-picker";
import { useFetch } from "@/hooks/use-fetch";
import { useMutation } from "@/hooks/use-mutation";
import { currentMonth } from "@/lib/date";
import { formatMonthLabel } from "@/lib/payroll/format";
import type { MonthlyConfig } from "@/types/payroll";

function MonthlyConfigFields({ config, onSaved }: { config: MonthlyConfig; onSaved: () => void }) {
  const { mutate, isPending, error } = useMutation<MonthlyConfig>();
  const [overtimeStart, setOvertimeStart] = useState(config.overtimeStart);
  const [overtimeEnd, setOvertimeEnd] = useState(config.overtimeEnd);
  const [overtimeHourlyRate, setOvertimeHourlyRate] = useState(String(config.overtimeHourlyRate));
  const [maxShiftHours, setMaxShiftHours] = useState(String(config.maxShiftMinutes / 60));
  const [saved, setSaved] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaved(false);
    try {
      await mutate("/api/admin/monthly-config", {
        method: "PUT",
        body: {
          month: config.month,
          overtimeStart,
          overtimeEnd,
          overtimeHourlyRate: Number(overtimeHourlyRate),
          maxShiftMinutes: Math.round(Number(maxShiftHours) * 60),
        },
      });
    } catch {
      return;
    }
    setSaved(true);
    onSaved();
  }

  return (
    <form onSubmit={handleSubmit} className="ui-card flex max-w-2xl flex-col gap-5">
      <h2 className="ui-heading">{formatMonthLabel(config.month)}</h2>
      {config.isLocked && (
        <p className="rounded-2xl bg-[var(--bloom-soft)] px-4 py-3 text-sm text-[var(--warning)]">
          Tháng này đã chốt lương nên không sửa được. Mở lại tháng ở Bảng lương nếu cần sửa.
        </p>
      )}
      <fieldset disabled={config.isLocked} className="flex flex-col gap-5 disabled:opacity-60">
        <legend className="sr-only">Khung tăng ca</legend>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="overtime-start" className="ui-label">
              Tăng ca bắt đầu lúc
            </label>
            <input
              id="overtime-start"
              type="time"
              required
              value={overtimeStart}
              onChange={(event) => setOvertimeStart(event.target.value)}
              className="ui-field"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="overtime-end" className="ui-label">
              Tăng ca kết thúc lúc
            </label>
            <input
              id="overtime-end"
              type="time"
              required
              value={overtimeEnd}
              onChange={(event) => setOvertimeEnd(event.target.value)}
              aria-describedby="overtime-end-hint"
              className="ui-field"
            />
            <p id="overtime-end-hint" className="ui-hint">
              Giờ kết thúc sớm hơn giờ bắt đầu nghĩa là sáng hôm sau, ví dụ 23:00 → 06:00.
            </p>
          </div>
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="overtime-rate" className="ui-label">
            Lương tăng ca (đồng/giờ)
          </label>
          <input
            id="overtime-rate"
            type="number"
            inputMode="numeric"
            min={0}
            step={1}
            required
            value={overtimeHourlyRate}
            onChange={(event) => setOvertimeHourlyRate(event.target.value)}
            aria-describedby="overtime-rate-hint"
            className="ui-field"
          />
          <p id="overtime-rate-hint" className="ui-hint">
            Một mức chung cho mọi nhân viên bán thời gian. Giờ làm trong khung tăng ca chỉ tính theo mức này,
            không tính thêm lương giờ thường.
          </p>
        </div>
        <div className="flex flex-col gap-1.5">
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
        <div className="flex flex-wrap items-center gap-3">
          <button type="submit" disabled={isPending} className="ui-btn">
            {isPending ? "Đang lưu..." : "Lưu cấu hình"}
          </button>
          <p role="status" className="ui-saved">
            {saved ? "Đã lưu." : null}
          </p>
        </div>
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
        <Loading label="Đang tải cấu hình..." />
      ) : (
        // Keyed so switching months resets the inputs to that month's values.
        <MonthlyConfigFields key={`${data.month}-${data.isLocked}`} config={data} onSaved={reload} />
      )}
    </div>
  );
}
