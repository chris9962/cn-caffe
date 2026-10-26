"use client";

import { useState, type FormEvent } from "react";
import { ErrorMessage } from "@/components/ui/error-message";
import { SideDrawer } from "@/components/ui/side-drawer";
import { useMutation } from "@/hooks/use-mutation";
import { formatMonthLabel } from "@/lib/payroll/format";
import type { PayrollMonth } from "@/types/payroll";

type PayrollActionsProps = { payroll: PayrollMonth; onChanged: () => void };

function CloseButton({ payroll, onChanged }: PayrollActionsProps) {
  const { mutate, isPending, error } = useMutation<{ version: number }>();
  const hint = !payroll.hasEnded
    ? "Chốt được khi hết tháng"
    : payroll.blockingShifts.length > 0
      ? `Còn ${payroll.blockingShifts.length} ca cần xử lý`
      : null;

  async function handleClose() {
    if (!window.confirm(`Chốt lương ${formatMonthLabel(payroll.month).toLowerCase()}? Ca và khoản cộng trừ của tháng sẽ bị khoá.`)) {
      return;
    }
    try {
      await mutate("/api/admin/payroll/close", { method: "POST", body: { month: payroll.month } });
    } catch {
      return;
    }
    onChanged();
  }

  return (
    // The hint sits below the button without pushing it out of line with the month field.
    <div className="relative">
      <button
        type="button"
        onClick={handleClose}
        disabled={isPending || hint !== null}
        aria-describedby={hint ? "close-hint" : undefined}
        className="ui-btn"
      >
        {isPending ? "Đang chốt..." : "Chốt lương"}
      </button>
      {hint && (
        <p id="close-hint" className="ui-hint absolute top-full right-0 mt-1 text-xs whitespace-nowrap">
          {hint}
        </p>
      )}
      {error && (
        <div className="absolute top-full right-0 mt-1 w-72 text-right">
          <ErrorMessage message={error} />
        </div>
      )}
    </div>
  );
}

function ReopenButton({ payroll, onChanged }: PayrollActionsProps) {
  const { mutate, isPending, error } = useMutation();
  const [isOpen, setIsOpen] = useState(false);
  const [reason, setReason] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    try {
      await mutate("/api/admin/payroll/reopen", { method: "POST", body: { month: payroll.month, reason } });
    } catch {
      return;
    }
    setReason("");
    setIsOpen(false);
    onChanged();
  }

  return (
    <>
      <button type="button" onClick={() => setIsOpen(true)} className="ui-btn-quiet">
        Mở lại
      </button>
      <SideDrawer
        open={isOpen}
        onClose={() => setIsOpen(false)}
        title={<p className="font-[family-name:var(--font-display)] text-xl font-medium">Mở lại {formatMonthLabel(payroll.month).toLowerCase()}</p>}
      >
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="reopen-reason" className="ui-label">
              Lý do
            </label>
            <textarea
              id="reopen-reason"
              required
              rows={3}
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              className="ui-field min-h-24 py-3"
            />
            <p className="ui-hint">Phiếu lương hiện tại được giữ lại thành phiên bản cũ.</p>
          </div>
          {error && <ErrorMessage message={error} />}
          <button type="submit" disabled={isPending} className="ui-btn-danger">
            {isPending ? "Đang mở lại..." : "Mở lại tháng"}
          </button>
        </form>
      </SideDrawer>
    </>
  );
}

export function PayrollActions({ payroll, onChanged }: PayrollActionsProps) {
  const latestVersion = payroll.versions[0]?.version ?? null;
  const isViewingOldVersion = payroll.shownVersion !== null && payroll.shownVersion !== latestVersion;
  const exportUrl = `/api/admin/payroll/export?month=${payroll.month}${
    payroll.shownVersion === null ? "" : `&version=${payroll.shownVersion}`
  }`;

  return (
    <div className="flex flex-wrap items-start gap-2">
      {payroll.shownVersion !== null && (
        <a href={exportUrl} download className="ui-btn-quiet">
          Tải Excel
        </a>
      )}
      {payroll.status === "closed" && !isViewingOldVersion && <ReopenButton payroll={payroll} onChanged={onChanged} />}
      {payroll.status !== "closed" && <CloseButton payroll={payroll} onChanged={onChanged} />}
    </div>
  );
}
