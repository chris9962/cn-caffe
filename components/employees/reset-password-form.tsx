"use client";

import { useState, type FormEvent } from "react";
import { ErrorMessage } from "@/components/ui/error-message";
import { useMutation } from "@/hooks/use-mutation";

const inputClass =
  "w-full rounded border border-zinc-500 px-3 py-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700 dark:focus-visible:outline-blue-400";

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
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <h2 className="text-xl font-semibold">Đặt lại mật khẩu</h2>
      <div className="flex flex-col gap-1">
        <label htmlFor="reset-password" className="font-medium">
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
      <div role="status">{saved ? "Đã lưu." : null}</div>
      <button
        type="submit"
        disabled={isPending}
        className="w-fit rounded bg-blue-700 px-4 py-2 font-medium text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700 dark:focus-visible:outline-blue-400 disabled:opacity-60"
      >
        Đặt lại mật khẩu
      </button>
    </form>
  );
}
