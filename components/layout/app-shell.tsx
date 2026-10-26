"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";
import { ChangePasswordForm } from "@/components/auth/change-password-form";
import { AppNav } from "@/components/layout/app-nav";
import { ErrorMessage } from "@/components/ui/error-message";
import { Loading } from "@/components/ui/loading";
import { useFetch } from "@/hooks/use-fetch";
import type { CurrentUser } from "@/types/employee";

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { data: user, error, isLoading, reload } =
    useFetch<CurrentUser>("/api/me");

  const attendanceRoute = pathname === "/check-in" || pathname.startsWith("/my-shifts");
  const needsAttendanceRedirect = Boolean(user && !user.requiresAttendance && attendanceRoute);

  useEffect(() => {
    let active = true;
    if (user && needsAttendanceRedirect) {
      const canManageShifts =
        user.role === "admin" ||
        user.role === "director" ||
        user.permissions.includes("shifts.view");
      queueMicrotask(() => {
        if (active) router.replace(canManageShifts ? "/manage/shifts" : "/overview");
      });
    }
    return () => {
      active = false;
    };
  }, [needsAttendanceRedirect, router, user]);

  if (isLoading) {
    return (
      <main className="mx-auto flex min-h-dvh w-full max-w-md items-center justify-center p-6">
        <Loading label="Đang mở ứng dụng..." />
      </main>
    );
  }

  if (error || !user) {
    return (
      <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center gap-4 p-6">
        <ErrorMessage message="Phiên đăng nhập đã hết hạn." />
        <Link
          href="/login"
          className="flex min-h-12 w-fit items-center rounded-full bg-[var(--foreground)] px-5 font-semibold text-[var(--surface)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]"
        >
          Đăng nhập lại
        </Link>
      </main>
    );
  }

  if (needsAttendanceRedirect) {
    return (
      <main className="mx-auto flex min-h-dvh w-full max-w-md items-center justify-center p-6">
        <Loading label="Đang mở trang phù hợp..." />
      </main>
    );
  }

  if (user.mustChangePassword) {
    return (
      <main className="mx-auto flex min-h-dvh w-full max-w-sm items-center p-6">
        <ChangePasswordForm onChanged={reload} />
      </main>
    );
  }

  return (
    <div className="min-h-dvh md:grid md:grid-cols-[17rem_minmax(0,1fr)]">
      <AppNav user={user} />
      <main className="mx-auto w-full max-w-5xl px-4 pt-5 pb-[calc(6.75rem+env(safe-area-inset-bottom))] sm:px-6 md:px-8 md:py-8 lg:px-10">
        {children}
      </main>
    </div>
  );
}
