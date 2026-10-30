"use client";

import { useState, type FormEvent } from "react";
import { ErrorMessage } from "@/components/ui/error-message";
import { useMutation } from "@/hooks/use-mutation";
import { useToast } from "@/hooks/use-toast";

const inputClass =
  "ui-field";

export function ResetPasswordForm({ employeeId, onDone }: { employeeId: string; onDone: () => void }) {
  const { mutate, isPending, error } = useMutation();
  const [password, setPassword] = useState("");
  const showToast = useToast();

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    try {
      await mutate(`/api/admin/employees/${employeeId}/reset-password`, {
        method: "POST",
        body: { password },
      });
    } catch {
      return;
    }
    setPassword("");
    showToast("Đã đặt lại mật khẩu.");
    onDone();
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      <div className="flex flex-col gap-1.5">
        <label htmlFor="reset-password" className="ui-label">
          Mật khẩu mới
        </label>
        <input
          id="reset-password"
          type="password"
          autoComplete="new-password"
          required
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          className={inputClass}
        />
      </div>
      {error && <ErrorMessage message={error} />}
      <button
        type="submit"
        disabled={isPending}
        className="ui-btn w-full"
      >
        Đặt lại mật khẩu
      </button>
    </form>
  );
}
