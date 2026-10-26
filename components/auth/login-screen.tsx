import { LoginForm } from "@/components/auth/login-form";
import { AppMark } from "@/components/ui/app-mark";

function ShiftMotif() {
  return (
    <div aria-hidden="true" className="relative mt-10 hidden min-h-52 overflow-hidden rounded-[2rem] border border-[color-mix(in_oklab,var(--surface)_16%,transparent)] lg:block">
      <div className="absolute inset-y-0 left-[32%] w-px bg-[color-mix(in_oklab,var(--surface)_12%,transparent)]" />
      <div className="absolute inset-y-0 left-[64%] w-px bg-[color-mix(in_oklab,var(--surface)_12%,transparent)]" />
      <div className="absolute inset-x-0 top-1/2 h-px bg-[color-mix(in_oklab,var(--surface)_12%,transparent)]" />
      <div className="absolute right-5 bottom-5 size-24 rounded-full bg-[var(--accent)]" />
      <div className="absolute top-5 left-5">
        <p className="text-xs font-bold uppercase tracking-[0.14em] text-[color-mix(in_oklab,var(--surface)_60%,transparent)]">Ca sáng</p>
        <p className="mt-2 text-5xl font-extrabold tracking-[-0.07em]">08:30</p>
      </div>
      <div className="absolute right-8 bottom-11 z-10 flex size-10 items-center justify-center rounded-full bg-[var(--foreground)] text-[var(--surface)]">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="size-5">
          <path d="M5 12h14m-5-5 5 5-5 5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
    </div>
  );
}

export function LoginScreen() {
  return (
    <main className="min-h-dvh lg:grid lg:grid-cols-[minmax(25rem,0.9fr)_minmax(30rem,1.1fr)]">
      <section className="relative min-h-[23rem] overflow-hidden bg-[var(--foreground)] px-5 pt-6 pb-16 text-[var(--surface)] sm:px-8 lg:flex lg:min-h-dvh lg:flex-col lg:justify-between lg:p-10 xl:p-14">
        <div aria-hidden="true" className="absolute -top-28 -right-24 size-64 rounded-full bg-[var(--accent)] opacity-15 sm:size-80" />
        <div className="relative z-10 flex items-center gap-3">
          <AppMark size="large" />
          <div>
            <p className="text-lg font-extrabold tracking-[-0.04em]">Chấm công</p>
            <p className="text-xs text-[color-mix(in_oklab,var(--surface)_60%,transparent)]">Gọn từng ca, rõ từng giờ</p>
          </div>
        </div>

        <div className="relative z-10 mt-14 max-w-xl lg:mt-auto">
          <p className="mb-3 text-xs font-bold uppercase tracking-[0.16em] text-[var(--accent)]">Bắt đầu ngày làm việc</p>
          <h1 className="text-[clamp(2.6rem,10vw,5.2rem)] leading-[0.98] font-extrabold tracking-[-0.065em]">
            Vào ca đúng giờ.
            <br />
            Về nhà nhẹ đầu.
          </h1>
          <p className="mt-5 max-w-md text-sm leading-6 text-[color-mix(in_oklab,var(--surface)_67%,transparent)] sm:text-base">
            Chấm công bằng ảnh và vị trí, xem lại mọi ca làm ngay trên điện thoại.
          </p>
          <ShiftMotif />
        </div>
      </section>

      <section className="relative -mt-8 min-h-[calc(100dvh-21rem)] rounded-t-[2rem] bg-[var(--background)] px-5 pt-9 pb-10 sm:px-8 lg:mt-0 lg:flex lg:min-h-dvh lg:items-center lg:rounded-none lg:px-[clamp(3rem,8vw,8rem)]">
        <div className="mx-auto w-full max-w-md lg:mx-0">
          <div className="mb-8">
            <p className="mb-2 text-xs font-bold uppercase tracking-[0.14em] text-[var(--accent-strong)]">Xin chào</p>
            <h2 className="text-3xl font-extrabold tracking-[-0.05em] sm:text-4xl">Đăng nhập để vào ca</h2>
            <p className="mt-3 text-sm leading-6 text-[var(--muted)]">Dùng số điện thoại và mật khẩu do quản lý cung cấp.</p>
          </div>
          <LoginForm />
          <p className="mt-8 text-center text-xs leading-5 text-[var(--muted)] lg:text-left">
            Gặp vấn đề đăng nhập? Liên hệ quản lý trực tiếp của bạn.
          </p>
        </div>
      </section>
    </main>
  );
}
