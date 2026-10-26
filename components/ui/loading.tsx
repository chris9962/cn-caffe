export function Loading({ label }: { label: string }) {
  return (
    <p role="status" className="flex items-center gap-3 text-sm font-medium text-[var(--muted)]">
      <span aria-hidden="true" className="size-2 animate-pulse rounded-full bg-[var(--accent)]" />
      {label}
    </p>
  );
}
