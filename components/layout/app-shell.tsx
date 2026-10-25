"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { ChangePasswordForm } from "@/components/auth/change-password-form";
import { AppNav } from "@/components/layout/app-nav";
import { ErrorMessage } from "@/components/ui/error-message";
import { Loading } from "@/components/ui/loading";
import { useFetch } from "@/hooks/use-fetch";
import type { CurrentUser } from "@/types/employee";

export function AppShell({ children }: { children: ReactNode }) {
  const { data: user, error, isLoading, reload } =
    useFetch<CurrentUser>("/api/me");

  if (isLoading) {
    return (
      <main className="mx-auto w-full max-w-3xl p-4">
        <Loading label="Đang tải..." />
      </main>
    );
  }

  if (error || !user) {
    return (
      <main className="mx-auto flex w-full max-w-3xl flex-col gap-2 p-4">
        <ErrorMessage message="Phiên đăng nhập đã hết hạn." />
        <Link
          href="/login"
          className="w-fit rounded underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700 dark:focus-visible:outline-blue-400"
        >
          Đăng nhập lại
        </Link>
      </main>
    );
  }

  if (user.mustChangePassword) {
    return (
      <main className="mx-auto w-full max-w-sm p-4">
        <ChangePasswordForm onChanged={reload} />
      </main>
    );
  }

  return (
    <>
      <AppNav user={user} />
      <main className="mx-auto w-full max-w-3xl p-4">{children}</main>
    </>
  );
}
