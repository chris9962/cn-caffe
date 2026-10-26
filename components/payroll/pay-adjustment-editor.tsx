"use client";

import { useState, type FormEvent } from "react";
import { ErrorMessage } from "@/components/ui/error-message";
import { useMutation } from "@/hooks/use-mutation";
import { formatSignedMoney } from "@/lib/payroll/format";
import type { PayAdjustment, Payslip } from "@/types/payroll";

type PayAdjustmentEditorProps = { payslip: Payslip; onChanged: () => void };

// Adds and removes one person's bonuses and deductions for the open month, inside their payslip drawer.
export function PayAdjustmentEditor({ payslip, onChanged }: PayAdjustmentEditorProps) {
  const save = useMutation<PayAdjustment>();
  const remove = useMutation();
  const [kind, setKind] = useState<"add" | "deduct">("add");
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const value = Number(amount);
    try {
      await save.mutate("/api/admin/pay-adjustments", {
        method: "POST",
        body: { employeeId: payslip.employeeId, month: payslip.month, amount: kind === "add" ? value : -value, note },
      });
    } catch {
      return;
    }
    setAmount("");
    setNote("");
    onChanged();
  }

  async function handleDelete(id: string, label: string) {
    if (!window.confirm(`Xoá khoản ${label}?`)) return;
    try {
      await remove.mutate(`/api/admin/pay-adjustments/${id}`, { method: "DELETE" });
    } catch {
      return;
    }
    onChanged();
  }

  return (
    <section aria-labelledby="adjustment-editor-heading" className="flex flex-col gap-4 border-t border-[var(--line)] pt-5">
      <h3 id="adjustment-editor-heading" className="ui-label">
        Khoản cộng, trừ
      </h3>

      {payslip.adjustments.length > 0 && (
        <ul className="flex flex-col divide-y divide-[var(--line)] rounded-2xl border border-[var(--line)]">
          {payslip.adjustments.map((item) => (
            <li key={item.id} className="flex items-center justify-between gap-3 px-4 py-2.5">
              <div className="min-w-0 text-sm">
                <p className={`font-semibold ${item.amount > 0 ? "text-[var(--success)]" : "text-[var(--danger)]"}`}>
                  {formatSignedMoney(item.amount)}
                </p>
                <p className="ui-hint truncate">{item.note}</p>
              </div>
              <button
                type="button"
                onClick={() => handleDelete(item.id, `${formatSignedMoney(item.amount)} (${item.note})`)}
                disabled={remove.isPending}
                className="ui-btn-danger min-h-9 px-3 text-sm"
              >
                Xoá<span className="sr-only"> khoản {item.note}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
      {remove.error && <ErrorMessage message={remove.error} />}

      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <fieldset className="flex gap-2">
          <legend className="sr-only">Loại khoản</legend>
          {(["add", "deduct"] as const).map((value) => (
            <label
              key={value}
              className="flex min-h-11 flex-1 cursor-pointer items-center justify-center rounded-2xl border border-[var(--line)] bg-[var(--background)] px-3 text-sm font-semibold has-[:checked]:border-[var(--accent)] has-[:checked]:bg-[var(--accent-soft)] has-[:checked]:text-[var(--accent-strong)] has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-[var(--accent)]"
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
        </fieldset>
        <div className="grid gap-3 sm:grid-cols-[10rem_minmax(0,1fr)]">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="adjustment-amount" className="ui-label">
              Số tiền (đồng)
            </label>
            <input
              id="adjustment-amount"
              type="number"
              inputMode="numeric"
              min={1}
              step={1}
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
    </section>
  );
}
