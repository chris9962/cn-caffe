export function Loading({ label }: { label: string }) {
  return (
    <p role="status" className="text-zinc-700 dark:text-zinc-300">
      {label}
    </p>
  );
}
