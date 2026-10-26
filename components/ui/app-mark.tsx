type AppMarkProps = {
  size?: "default" | "large";
  inverse?: boolean;
};

export function AppMark({ size = "default", inverse = false }: AppMarkProps) {
  return (
    <span
      aria-hidden="true"
      className={`inline-flex shrink-0 items-center justify-center bg-[var(--accent)] font-extrabold tracking-[-0.08em] ${
        size === "large" ? "size-14 rounded-[1.15rem] text-2xl" : "size-10 rounded-[14px] text-lg"
      } ${inverse ? "text-[var(--surface)]" : "text-[var(--foreground)]"}`}
    >
      ca
    </span>
  );
}
