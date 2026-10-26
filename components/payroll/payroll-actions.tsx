"use client";

import { useState, type FormEvent } from "react";
import { ErrorMessage } from "@/components/ui/error-message";
import { useMutation } from "@/hooks/use-mutation";
import { formatMonthLabel } from "@/lib/payroll/format";
import type { PayrollMonth } from "@/types/payroll";

type PayrollActionsProps = { payroll: PayrollMonth; onChanged: () => void };

function CloseMonth({ payroll, onChanged }: PayrollActionsProps) {
  const { mutate, isPending, error } = useMutation<{ version: number }>();
  const blockers = payroll.blockingShifts.length;
  const reason = !payroll.hasEnded
    ? "Tháng chưa kết thúc nên chưa chốt được."
    : blockers > 0
      ? `Còn ${blockers} ca cần xử lý trước khi chốt.`
      : null;

  async function handleClose() {
    const label = formatMonthLabel(payroll.month);
    if (!window.confirm(`Chốt lương ${label}? Sau khi chốt, ca, cấu hình và khoản cộng trừ của tháng sẽ bị khoá.`)) return;
    try {
      await mutate("/api/admin/payroll/close", { method: "POST", body: { month: payroll.month } });
    } catch {
      return;
    }
    onChanged();
  }

  return (
    <div className="flex flex-col gap-2">
      <button type="button" onClick={handleClose} disabled={isPending || reason !== null} className="ui-btn">
        {isPending ? "Đang chốt..." : "Chốt lương tháng"}
      </button>
      {reason && <p className="ui-hint">{reason}</p>}
      {error && <ErrorMessage message={error} />}
    </div>
  );
}

function ReopenMonth({ payroll, onChanged }: PayrollActionsProps) {
  const { mutate, isPending, error } = useMutation();
  const [reason, setReason] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    try {
      await mutate("/api/admin/payroll/reopen", { method: "POST", body: { month: payroll.month, reason } });
    } catch {
      return;
    }
    setReason("");
    onChanged();
  }

  return (
    <details>
      <summary className="ui-link w-fit cursor-pointer list-none text-sm">Mở lại tháng để sửa</summary>
      <form onSubmit={handleSubmit} className="mt-3 flex flex-col gap-3">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="reopen-reason" className="ui-label">
            Lý do mở lại
          </label>
          <textarea
            id="reopen-reason"
            required
            rows={2}
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            className="ui-field min-h-20 py-3"
          />
          <p className="ui-hint">Phiếu lương hiện tại được giữ lại thành một phiên bản cũ. Nhân viên sẽ thấy lương tạm tính.</p>
        </div>
        {error && <ErrorMessage message={error} />}
        <button type="submit" disabled={isPending} className="ui-btn-danger">
          {isPending ? "Đang mở lại..." : "Mở lại tháng"}
        </button>
      </form>
    </details>
  );
}

export function PayrollActions({ payroll, onChanged }: PayrollActionsProps) {
  const isViewingOldVersion = payroll.shownVersion !== null && payroll.shownVersion !== payroll.versions[0]?.version;
  const exportUrl = `/api/admin/payroll/export?month=${payroll.month}${
    payroll.shownVersion === null ? "" : `&version=${payroll.shownVersion}`
  }`;

  return (
    <section aria-label="Thao tác bảng lương" className="ui-card flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3">
        {payroll.status === "closed" ? (
          <span className="rounded-full bg-[var(--success-soft)] px-3 py-1 text-sm font-semibold text-[var(--success)]">
            Đã chốt · phiên bản {payroll.versions[0]?.version}
          </span>
        ) : (
          <span className="rounded-full bg-[var(--bloom-soft)] px-3 py-1 text-sm font-semibold text-[var(--warning)]">
            Đang mở · lương tạm tính
          </span>
        )}
        {isViewingOldVersion && <span className="ui-hint">Đang xem phiên bản cũ {payroll.shownVersion}.</span>}
      </div>
      <div className="flex flex-wrap items-start gap-3">
        {payroll.status !== "closed" && <CloseMonth payroll={payroll} onChanged={onChanged} />}
        {payroll.shownVersion !== null && (
          <a href={exportUrl} download className="ui-btn-quiet">
            Tải Excel
          </a>
        )}
      </div>
      {payroll.status === "closed" && !isViewingOldVersion && <ReopenMonth payroll={payroll} onChanged={onChanged} />}
    </section>
  );
}
