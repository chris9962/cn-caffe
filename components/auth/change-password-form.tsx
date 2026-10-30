"use client";

import { useState, type FormEvent } from "react";
import { ErrorMessage } from "@/components/ui/error-message";
import { useMutation } from "@/hooks/use-mutation";

const inputClass =
  "ui-field";

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
    <form onSubmit={handleSubmit} className="ui-card flex max-w-2xl flex-col gap-5">
      <div>
        <p className="ui-eyebrow mb-2">Lần đầu đăng nhập</p>
        <h1 className="ui-title">Đổi mật khẩu</h1>
        <p className="ui-lead mt-2">Bạn cần đặt mật khẩu mới trước khi tiếp tục.</p>
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="new-password" className="ui-label">
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
      <div className="flex flex-col gap-1.5">
        <label htmlFor="confirm-password" className="ui-label">
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
        className="ui-btn"
      >
        Lưu mật khẩu
      </button>
    </form>
  );
}
