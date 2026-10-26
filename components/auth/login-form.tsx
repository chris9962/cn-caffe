"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { ErrorMessage } from "@/components/ui/error-message";
import { useMutation } from "@/hooks/use-mutation";

const inputClass =
  "min-h-14 w-full rounded-2xl border border-[var(--line)] bg-[var(--surface)] px-4 text-base font-semibold outline-none transition-colors placeholder:font-normal placeholder:text-[color-mix(in_oklab,var(--muted)_65%,transparent)] focus:border-[var(--foreground)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]";

function PasswordVisibilityIcon({ visible }: { visible: boolean }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="size-5"
    >
      {visible ? (
        <>
          <path d="M3 3l18 18" />
          <path d="M10.6 10.7a2 2 0 0 0 2.7 2.7M9.9 4.3A10.5 10.5 0 0 1 12 4c5.5 0 9 6 9 6a16 16 0 0 1-2.1 2.8M6.6 6.6C4.2 8.1 3 10 3 10s3.5 6 9 6a9.8 9.8 0 0 0 3.3-.6" />
        </>
      ) : (
        <>
          <path d="M3 12s3.5-6 9-6 9 6 9 6-3.5 6-9 6-9-6-9-6Z" />
          <circle cx="12" cy="12" r="2.5" />
        </>
      )}
    </svg>
  );
}

export function LoginForm() {
  const router = useRouter();
  const { mutate, isPending, error } = useMutation();
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    try {
      await mutate("/api/auth/login", {
        method: "POST",
        body: { phone, password },
      });
    } catch {
      return;
    }
    router.replace("/");
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      <div className="flex flex-col gap-2">
        <label htmlFor="phone" className="text-sm font-bold">
          Số điện thoại
        </label>
        <input
          id="phone"
          type="tel"
          inputMode="tel"
          autoComplete="username"
          placeholder="0912 345 678"
          required
          value={phone}
          onChange={(event) => setPhone(event.target.value)}
          className={inputClass}
        />
      </div>
      <div className="flex flex-col gap-2">
        <label htmlFor="password" className="text-sm font-bold">
          Mật khẩu
        </label>
        <div className="relative">
          <input
            id="password"
            type={isPasswordVisible ? "text" : "password"}
            autoComplete="current-password"
            placeholder="Nhập mật khẩu"
            required
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className={`${inputClass} pr-14`}
          />
          <button
            type="button"
            onClick={() => setIsPasswordVisible((visible) => !visible)}
            aria-label={isPasswordVisible ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
            aria-pressed={isPasswordVisible}
            className="absolute inset-y-0 right-1 inline-flex w-12 items-center justify-center rounded-xl text-[var(--muted)] focus-visible:outline-2 focus-visible:outline-offset-[-4px] focus-visible:outline-[var(--accent)]"
          >
            <PasswordVisibilityIcon visible={isPasswordVisible} />
          </button>
        </div>
      </div>
      {error && (
        <div className="rounded-2xl bg-[#f9dddd] px-4 py-3">
          <ErrorMessage message={error} />
        </div>
      )}
      <button
        type="submit"
        disabled={isPending}
        className="flex min-h-14 w-full items-center justify-center rounded-2xl bg-[var(--accent)] px-5 text-base font-bold text-[var(--foreground)] transition-transform active:scale-[.98] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--foreground)] disabled:opacity-50"
      >
        {isPending ? "Đang đăng nhập..." : "Đăng nhập"}
      </button>
    </form>
  );
}
