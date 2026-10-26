"use client";

import { useId } from "react";
import { ErrorMessage } from "@/components/ui/error-message";
import { useMutation } from "@/hooks/use-mutation";
import type { Shift } from "@/types/shift";


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
    <section aria-labelledby={headingId} className="ui-card flex max-w-2xl flex-col gap-4">
      <h2 id={headingId} className="ui-heading">
        Duyệt ca
      </h2>
      <div className="flex flex-wrap gap-2">
        {shift.status === "pending_review" && (
          <button
            type="button"
            disabled={isPending}
            onClick={() => review("approve")}
            className={"ui-btn"}
          >
            Duyệt
          </button>
        )}
        <button
          type="button"
          disabled={isPending}
          onClick={() => review("reject")}
          className={"ui-btn-danger"}
        >
          Từ chối
        </button>
      </div>
      {error && <ErrorMessage message={error} />}
    </section>
  );
}
