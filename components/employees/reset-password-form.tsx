"use client";

import { useState, type FormEvent } from "react";
import { ErrorMessage } from "@/components/ui/error-message";
import { useMutation } from "@/hooks/use-mutation";

const inputClass =
  "ui-field";

export function ResetPasswordForm({ employeeId }: { employeeId: string }) {
  const { mutate, isPending, error } = useMutation();
  const [password, setPassword] = useState("");
  const [saved, setSaved] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaved(false);
    try {
      await mutate(`/api/admin/employees/${employeeId}/reset-password`, {
        method: "POST",
        body: { password },
      });
    } catch {
      return;
    }
    setPassword("");
    setSaved(true);
  }

  return (
    <form onSubmit={handleSubmit} className="ui-card flex max-w-2xl flex-col gap-5">
      <h2 className="ui-heading">Đặt lại mật khẩu</h2>
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
      <div role="status" className="ui-saved">{saved ? "Đã lưu." : null}</div>
      <button
        type="submit"
        disabled={isPending}
        className="ui-btn"
      >
        Đặt lại mật khẩu
      </button>
    </form>
  );
}
