"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useMutation } from "@/hooks/use-mutation";
import type { CurrentUser } from "@/types/employee";

type NavItem = { href: string; label: string };

function getNavItems(user: CurrentUser): NavItem[] {
  const isAdminOrDirector = user.role === "admin" || user.role === "director";
  const items: NavItem[] = [
    { href: "/check-in", label: "Check in" },
    { href: "/my-shifts", label: "Ca của tôi" },
  ];
  if (isAdminOrDirector || user.permissions.includes("shifts.view")) {
    items.push({ href: "/manage/shifts", label: "Quản lý ca" });
  }
  if (isAdminOrDirector) {
    items.push(
      { href: "/admin/employees", label: "Nhân viên" },
      { href: "/admin/branches", label: "Chi nhánh" },
    );
  }
  return items;
}

const focusClass =
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700 dark:focus-visible:outline-blue-400";

export function AppNav({ user }: { user: CurrentUser }) {
  const pathname = usePathname();
  const router = useRouter();
  const { mutate, isPending } = useMutation();

  async function handleLogout() {
    try {
      await mutate("/api/auth/logout", { method: "POST" });
    } catch {
      return;
    }
    router.replace("/login");
  }

  return (
    <nav aria-label="Điều hướng chính" className="border-b border-zinc-300">
      <ul className="mx-auto flex max-w-3xl flex-wrap items-center gap-x-4 gap-y-2 p-4">
        {getNavItems(user).map((item) => (
          <li key={item.href}>
            <Link
              href={item.href}
              aria-current={pathname === item.href ? "page" : undefined}
              className={`rounded px-1 py-1 aria-[current=page]:font-bold aria-[current=page]:underline ${focusClass}`}
            >
              {item.label}
            </Link>
          </li>
        ))}
        <li className="ml-auto">
          <button
            type="button"
            onClick={handleLogout}
            disabled={isPending}
            className={`rounded px-1 py-1 underline ${focusClass}`}
          >
            Đăng xuất
          </button>
        </li>
      </ul>
    </nav>
  );
}
