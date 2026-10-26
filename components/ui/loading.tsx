export function Loading({ label }: { label: string }) {
  return (
    <p role="status" className="flex items-center gap-3 text-sm font-medium text-[var(--muted)]">
      <span aria-hidden="true" className="flex gap-1">
        <span className="size-1.5 animate-pulse rounded-full bg-[var(--accent)]" />
        <span className="size-1.5 animate-pulse rounded-full bg-[var(--accent)] [animation-delay:150ms]" />
        <span className="size-1.5 animate-pulse rounded-full bg-[var(--accent)] [animation-delay:300ms]" />
      </span>
      {label}
    </p>
  );
}
