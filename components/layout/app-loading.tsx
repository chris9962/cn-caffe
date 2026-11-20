import { AppMark } from "@/components/ui/app-mark";

export function AppLoading({ label }: { label: string }) {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-3.5">
      <div className="animate-pulse motion-reduce:animate-none">
        <AppMark size="large" loading="eager" />
      </div>
      <p role="status" className="text-sm text-[var(--muted)]">
        {label}
      </p>
    </div>
  );
}
