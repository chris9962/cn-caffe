"use client";

import { useId } from "react";
import { ErrorMessage } from "@/components/ui/error-message";
import { useMutation } from "@/hooks/use-mutation";
import type { Shift } from "@/types/shift";


type ShiftActionsProps = {
  shift: Shift;
  onDone: (message: string) => void;
};

export function ShiftActions({ shift, onDone }: ShiftActionsProps) {
  const { mutate, isPending, error } = useMutation<Shift>();
  const headingId = useId();

  async function review(decision: "approve" | "reject") {
    try {
      await mutate(`/api/shifts/${shift.id}/review`, { method: "POST", body: { decision } });
    } catch {
      return;
    }
    onDone(decision === "approve" ? "Đã duyệt ca." : "Đã từ chối ca.");
  }

  if (shift.status === "rejected") return null;

  const isWaiting = shift.status === "pending_review";

  return (
    <section
      aria-labelledby={headingId}
      className={
        isWaiting
          ? // Stays in reach while the manager scrolls through the photos; 4.75rem clears the phone bottom nav.
            "sticky bottom-[calc(4.75rem+env(safe-area-inset-bottom))] z-30 flex max-w-2xl flex-col gap-3 rounded-lg border border-[var(--line)] bg-[var(--surface)] p-3 shadow-[0_-12px_32px_-20px_rgba(44,58,49,0.45)] md:bottom-6"
          : "ui-card flex max-w-2xl flex-col gap-4"
      }
    >
      <h2 id={headingId} className={isWaiting ? "sr-only" : "ui-heading"}>
        Duyệt ca
      </h2>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={isPending}
          onClick={() => review("reject")}
          className={"ui-btn-danger"}
        >
          Từ chối
        </button>
        {isWaiting && (
          <button
            type="button"
            disabled={isPending}
            onClick={() => review("approve")}
            className={"ui-btn flex-1"}
          >
            Duyệt
          </button>
        )}
      </div>
      {error && <ErrorMessage message={error} />}
    </section>
  );
}
