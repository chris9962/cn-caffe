import { LoginForm } from "@/components/auth/login-form";
import { AppMark } from "@/components/ui/app-mark";

// Pine hills fading into morning mist, with a few wild sunflowers (dã quỳ) in front.
function HillsMotif() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 600 260"
      preserveAspectRatio="xMidYMax slice"
      className="pointer-events-none absolute inset-x-0 bottom-0 h-44 w-full sm:h-56 lg:h-72"
    >
      <path d="M0 150 C80 110 150 120 230 95 C320 68 400 110 480 92 C540 80 580 88 600 84 V260 H0 Z" fill="#ffffff" opacity="0.07" />
      <g fill="#ffffff" opacity="0.1">
        <path d="M70 128 l14 -40 l14 40 Z M88 132 l10 -30 l10 30 Z" />
        <path d="M410 104 l16 -46 l16 46 Z M436 108 l11 -32 l11 32 Z" />
        <path d="M520 98 l12 -34 l12 34 Z" />
      </g>
      <path d="M0 200 C90 160 180 175 270 150 C360 125 450 165 600 140 V260 H0 Z" fill="#1d2a22" opacity="0.35" />
      <g fill="#1d2a22" opacity="0.45">
        <path d="M150 178 l18 -54 l18 54 Z M176 182 l12 -36 l12 36 Z" />
        <path d="M330 152 l15 -44 l15 44 Z" />
      </g>
      <path d="M0 236 C120 214 240 226 360 210 C460 198 540 214 600 206 V260 H0 Z" fill="#1d2a22" opacity="0.55" />
      <g fill="var(--bloom)">
        <circle cx="470" cy="214" r="6" />
        <circle cx="492" cy="222" r="4.5" />
        <circle cx="512" cy="210" r="5" />
      </g>
    </svg>
  );
}

export function LoginScreen() {
  return (
    <main className="min-h-dvh lg:grid lg:grid-cols-[minmax(25rem,1fr)_minmax(30rem,1fr)]">
      <section className="relative min-h-[24rem] overflow-hidden bg-[linear-gradient(170deg,#6f8f74_0%,#4d6d54_45%,#33493a_100%)] px-5 pt-6 pb-24 text-[var(--surface)] sm:px-8 lg:flex lg:min-h-dvh lg:flex-col lg:p-10 xl:p-14">
        <div aria-hidden="true" className="absolute -top-24 -right-16 size-72 rounded-full bg-[var(--bloom)] opacity-20 blur-3xl" />
        <div aria-hidden="true" className="absolute top-1/3 -left-24 size-64 rounded-full bg-white opacity-10 blur-3xl" />
        <HillsMotif />

        <div className="relative z-10 flex items-center gap-3">
          <AppMark size="large" inverse />
          <div>
            <p className="font-[family-name:var(--font-display)] text-xl font-medium">Cỏ Ngọt</p>
            <p className="text-xs text-[color-mix(in_oklab,var(--surface)_70%,transparent)]">Chấm công · Tính lương</p>
          </div>
        </div>

        <div className="relative z-10 mt-12 max-w-xl lg:my-auto">
          <h1 className="font-[family-name:var(--font-display)] text-[clamp(2.3rem,8vw,4.2rem)] leading-[1.08] font-medium tracking-[-0.02em]">
            Chấm công và xem lương
            <br />
            <em className="font-normal">ngay trên điện thoại.</em>
          </h1>
          <p className="mt-5 max-w-md text-sm leading-7 text-[color-mix(in_oklab,var(--surface)_78%,transparent)] sm:text-base">
            Vào ca bằng một ảnh và vị trí. Xem lại ca đã làm và lương từng tháng.
          </p>
        </div>
      </section>

      <section className="relative -mt-10 min-h-[calc(100dvh-21rem)] rounded-t-[2.25rem] bg-[var(--background)] px-5 pt-10 pb-10 sm:px-8 lg:mt-0 lg:flex lg:min-h-dvh lg:items-center lg:rounded-none lg:px-[clamp(3rem,8vw,8rem)]">
        <div className="mx-auto w-full max-w-md lg:mx-0">
          <div className="mb-8">
            <h2 className="font-[family-name:var(--font-display)] text-3xl font-medium tracking-[-0.02em] sm:text-4xl">
              Đăng nhập
            </h2>
            <p className="ui-lead mt-3">Dùng số điện thoại và mật khẩu quản lý cung cấp.</p>
          </div>
          <LoginForm />
          <p className="mt-8 text-center text-xs leading-5 text-[var(--muted)] lg:text-left">
            Quên mật khẩu? Liên hệ quản lý để đặt lại.
          </p>
        </div>
      </section>
    </main>
  );
}
