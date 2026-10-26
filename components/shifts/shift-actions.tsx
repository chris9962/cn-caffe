"use client";

import { useId } from "react";
import { ErrorMessage } from "@/components/ui/error-message";
import { useMutation } from "@/hooks/use-mutation";
import type { Shift } from "@/types/shift";

const focusClass =
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700 dark:focus-visible:outline-blue-400";

type ShiftActionsProps = {
  shift: Shift;
  onStart: () => void;
  onDone: () => void;
};

export function ShiftActions({ shift, onStart, onDone }: ShiftActionsProps) {
  const { mutate, isPending, error } = useMutation<Shift>();
  const headingId = useId();

  async function review(decision: "approve" | "reject") {
    onStart();
    try {
      await mutate(`/api/shifts/${shift.id}/review`, { method: "POST", body: { decision } });
    } catch {
      return;
    }
    onDone();
  }

  if (shift.status === "rejected") return null;

  return (
    <section aria-labelledby={headingId} className="flex flex-col gap-4">
      <h2 id={headingId} className="text-xl font-semibold">
        Duyệt ca
      </h2>
      <div className="flex flex-wrap gap-2">
        {shift.status === "pending_review" && (
          <button
            type="button"
            disabled={isPending}
            onClick={() => review("approve")}
            className={`w-fit rounded bg-blue-700 px-4 py-2 font-medium text-white ${focusClass} disabled:opacity-60`}
          >
            Duyệt
          </button>
        )}
        <button
          type="button"
          disabled={isPending}
          onClick={() => review("reject")}
          className={`w-fit rounded border border-red-700 px-4 py-2 font-medium text-red-700 dark:border-red-400 dark:text-red-400 ${focusClass} disabled:opacity-60`}
        >
          Từ chối
        </button>
      </div>
      {error && <ErrorMessage message={error} />}
    </section>
  );
}
