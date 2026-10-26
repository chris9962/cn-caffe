type AppMarkProps = {
  size?: "default" | "large";
  inverse?: boolean;
};

// A sprig of sweet grass (cỏ ngọt) over a warm cup.
export function AppMark({ size = "default", inverse = false }: AppMarkProps) {
  return (
    <span
      aria-hidden="true"
      className={`inline-flex shrink-0 items-center justify-center ${
        size === "large" ? "size-14 rounded-[1.25rem]" : "size-10 rounded-[14px]"
      } ${inverse ? "bg-[var(--surface)] text-[var(--accent)]" : "bg-[var(--accent)] text-[var(--surface)]"}`}
    >
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={size === "large" ? "size-8" : "size-6"}
      >
        <path d="M12 12.5V6.5" />
        <path d="M12 9c-.2-2.2 1-3.8 3.4-4.4.2 2.3-1 3.9-3.4 4.4Z" />
        <path d="M12 10.5c-.3-1.9-1.6-3.1-3.6-3.3-.1 2 1.3 3.2 3.6 3.3Z" />
        <path d="M6 12.5h12v2a5 5 0 0 1-5 5h-2a5 5 0 0 1-5-5v-2Z" />
        <path d="M18 13.5h.8a1.7 1.7 0 0 1 0 3.4H17.6" />
      </svg>
    </span>
  );
}
