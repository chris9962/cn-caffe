"use client";

import { useState, type FormEvent } from "react";
import { ErrorMessage } from "@/components/ui/error-message";
import { useMutation } from "@/hooks/use-mutation";

const inputClass =
  "w-full rounded border border-zinc-500 px-3 py-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700";

export function ChangePasswordForm({ onChanged }: { onChanged: () => void }) {
  const { mutate, isPending, error } = useMutation();
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [mismatch, setMismatch] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (password !== confirmation) {
      setMismatch(true);
      return;
    }
    setMismatch(false);
    try {
      await mutate("/api/auth/change-password", {
        method: "POST",
        body: { password },
      });
    } catch {
      return;
    }
    onChanged();
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <h1 className="text-2xl font-semibold">Đổi mật khẩu</h1>
      <p>Bạn phải đổi mật khẩu trước khi tiếp tục.</p>
      <div className="flex flex-col gap-1">
        <label htmlFor="new-password" className="font-medium">
          Mật khẩu mới
        </label>
        <input
          id="new-password"
          type="password"
          autoComplete="new-password"
          required
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          className={inputClass}
        />
      </div>
      <div className="flex flex-col gap-1">
        <label htmlFor="confirm-password" className="font-medium">
          Nhập lại mật khẩu mới
        </label>
        <input
          id="confirm-password"
          type="password"
          autoComplete="new-password"
          required
          value={confirmation}
          onChange={(event) => setConfirmation(event.target.value)}
          className={inputClass}
        />
      </div>
      {mismatch && <ErrorMessage message="Hai mật khẩu không khớp." />}
      {error && <ErrorMessage message={error} />}
      <button
        type="submit"
        disabled={isPending}
        className="rounded bg-blue-700 px-4 py-2 font-medium text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700 disabled:opacity-60"
      >
        Đổi mật khẩu
      </button>
    </form>
  );
}
