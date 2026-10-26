"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { AppMark } from "@/components/ui/app-mark";
import { ROLE_LABELS } from "@/lib/employees/labels";
import { useMutation } from "@/hooks/use-mutation";
import type { CurrentUser } from "@/types/employee";

type NavIcon = "home" | "clock" | "calendar" | "review" | "people" | "branch" | "wallet" | "sliders";
type NavItem = { href: string; label: string; shortLabel: string; icon: NavIcon };

function getNavItems(user: CurrentUser): NavItem[] {
  const isAdminOrDirector = user.role === "admin" || user.role === "director";
  const items: NavItem[] = [];
  if (user.requiresAttendance) {
    items.push(
      { href: "/check-in", label: "Chấm công", shortLabel: "Chấm công", icon: "clock" },
      { href: "/my-shifts", label: "Ca của tôi", shortLabel: "Ca của tôi", icon: "calendar" },
    );
  } else if (!isAdminOrDirector && !user.permissions.includes("shifts.view")) {
    items.push({ href: "/overview", label: "Tổng quan", shortLabel: "Tổng quan", icon: "home" });
  }
  if (isAdminOrDirector || user.permissions.includes("shifts.view")) {
    items.push({ href: "/manage/shifts", label: "Quản lý ca", shortLabel: "Quản lý", icon: "review" });
  }
  if (isAdminOrDirector) {
    items.push(
      { href: "/admin/employees", label: "Nhân viên", shortLabel: "Nhân sự", icon: "people" },
      { href: "/admin/branches", label: "Chi nhánh", shortLabel: "Chi nhánh", icon: "branch" },
      { href: "/admin/payroll", label: "Bảng lương", shortLabel: "Lương", icon: "wallet" },
      { href: "/admin/monthly-config", label: "Cấu hình tháng", shortLabel: "Cấu hình", icon: "sliders" },
    );
  } else {
    if (user.permissions.includes("payroll.view")) {
      items.push({ href: "/admin/payroll", label: "Bảng lương", shortLabel: "Bảng lương", icon: "wallet" });
    }
    items.push({ href: "/my-pay", label: "Lương của tôi", shortLabel: "Lương", icon: "wallet" });
  }
  return items;
}

const focusClass = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]";

const iconPaths: Record<NavIcon, ReactNode> = {
  home: (
    <>
      <path d="m3.5 10 8.5-7 8.5 7" />
      <path d="M5.5 9v11h13V9M9.5 20v-6h5v6" />
    </>
  ),
  clock: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 7.5V12l3 2" />
    </>
  ),
  calendar: (
    <>
      <rect x="3.5" y="5" width="17" height="15" rx="3" />
      <path d="M8 3v4M16 3v4M3.5 9.5h17M8 14h3M14 14h2" />
    </>
  ),
  review: (
    <>
      <path d="M5 4.5h14a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-11a2 2 0 0 1 2-2Z" />
      <path d="m7 12 2.5 2.5L17 8" />
    </>
  ),
  people: (
    <>
      <circle cx="9" cy="8.5" r="3" />
      <path d="M3.5 19c.5-4 2.2-6 5.5-6s5 2 5.5 6M15 6.5a3 3 0 0 1 0 5.8M16 13.5c2.7.5 4 2.3 4.5 5.5" />
    </>
  ),
  branch: (
    <>
      <path d="M12 21s7-5.1 7-12a7 7 0 1 0-14 0c0 6.9 7 12 7 12Z" />
      <circle cx="12" cy="9" r="2.5" />
    </>
  ),
  wallet: (
    <>
      <path d="M4 7.5A2.5 2.5 0 0 1 6.5 5H18v3" />
      <path d="M4 7.5v10A2.5 2.5 0 0 0 6.5 20H20V8H6.5A2.5 2.5 0 0 1 4 5.5" />
      <path d="M16 14h1.5" />
    </>
  ),
  sliders: (
    <>
      <path d="M5 7h9M18 7h1M5 17h3M12 17h7" />
      <circle cx="16" cy="7" r="2" />
      <circle cx="10" cy="17" r="2" />
    </>
  ),
};

function AppNavIcon({ name }: { name: NavIcon }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="size-6"
    >
      {iconPaths[name]}
    </svg>
  );
}

export function AppNav({ user }: { user: CurrentUser }) {
  const pathname = usePathname();
  const router = useRouter();
  const { mutate, isPending } = useMutation();
  const items = getNavItems(user);
  const homeHref = items[0]?.href ?? "/overview";
  const initials = user.fullName
    .split(/\s+/)
    .slice(-2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();

  async function handleLogout() {
    try {
      await mutate("/api/auth/logout", { method: "POST" });
    } catch {
      return;
    }
    router.replace("/login");
  }

  function isActive(href: string) {
    return pathname === href || pathname.startsWith(`${href}/`);
  }

  return (
    <>
      <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-[var(--line)] bg-[color-mix(in_oklab,var(--background)_92%,transparent)] px-4 backdrop-blur-md md:hidden">
        <Link href={homeHref} aria-label="Trang chính" className={`rounded-[14px] ${focusClass}`}>
          <AppMark />
        </Link>
        <div className="flex min-w-0 items-center gap-3">
          <div className="min-w-0 text-right">
            <p className="truncate text-sm font-semibold">{user.fullName}</p>
            <p className="text-xs text-[var(--muted)]">{ROLE_LABELS[user.role]}</p>
          </div>
          <button
            type="button"
            onClick={handleLogout}
            disabled={isPending}
            aria-label="Đăng xuất"
            className={`inline-flex size-11 shrink-0 items-center justify-center rounded-full bg-[var(--accent-soft)] text-xs font-semibold text-[var(--accent-strong)] ${focusClass} disabled:opacity-50`}
          >
            {initials}
          </button>
        </div>
      </header>

      <aside className="sticky top-0 hidden h-dvh flex-col border-r border-[var(--line)] bg-[var(--surface)] p-5 md:flex">
        <Link href={homeHref} className={`mb-10 flex w-fit items-center gap-3 rounded-2xl ${focusClass}`}>
          <AppMark />
          <span>
            <span className="block font-[family-name:var(--font-display)] text-xl font-medium">Cỏ Ngọt</span>
            <span className="block text-xs text-[var(--muted)]">Chấm công · Tính lương</span>
          </span>
        </Link>

        <nav aria-label="Điều hướng chính" className="flex-1">
          <ul className="flex flex-col gap-1.5">
            {items.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  aria-current={isActive(item.href) ? "page" : undefined}
                  className={`flex min-h-12 items-center gap-3 rounded-2xl px-3.5 text-sm font-semibold transition-colors text-[var(--muted)] hover:bg-[var(--background)] hover:text-[var(--foreground)] aria-[current=page]:bg-[var(--accent-soft)] aria-[current=page]:text-[var(--accent-strong)] ${focusClass}`}
                >
                  <AppNavIcon name={item.icon} />
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div className="border-t border-[var(--line)] pt-5">
          <div className="mb-4 flex items-center gap-3">
            <span className="inline-flex size-11 shrink-0 items-center justify-center rounded-full bg-[var(--accent-soft)] text-xs font-semibold text-[var(--accent-strong)]">
              {initials}
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">{user.fullName}</p>
              <p className="text-xs text-[var(--muted)]">{user.phone}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleLogout}
            disabled={isPending}
            className="ui-btn-quiet w-full"
          >
            {isPending ? "Đang đăng xuất..." : "Đăng xuất"}
          </button>
        </div>
      </aside>

      <nav
        aria-label="Điều hướng chính"
        className="fixed inset-x-0 bottom-0 z-40 border-t border-[var(--line)] bg-[color-mix(in_oklab,var(--surface)_94%,transparent)] px-2 pt-2 pb-[max(.5rem,env(safe-area-inset-bottom))] backdrop-blur-xl md:hidden"
      >
        <ul className="mx-auto flex max-w-lg items-start justify-around">
          {items.map((item) => (
            <li key={item.href} className="min-w-0 flex-1">
              <Link
                href={item.href}
                aria-current={isActive(item.href) ? "page" : undefined}
                className={`group relative flex min-h-14 flex-col items-center justify-center gap-1 rounded-2xl px-1 text-[10px] font-semibold text-[var(--muted)] transition-colors aria-[current=page]:text-[var(--accent-strong)] ${focusClass}`}
              >
                <span className="absolute top-0 h-0.5 w-6 scale-x-0 rounded-full bg-[var(--bloom)] transition-transform group-aria-[current=page]:scale-x-100" />
                <AppNavIcon name={item.icon} />
                <span className="w-full truncate text-center">{item.shortLabel}</span>
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </>
  );
}
