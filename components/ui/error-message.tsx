export function ErrorMessage({ message }: { message: string }) {
  return (
    <p role="alert" className="text-sm font-medium leading-6 text-[var(--danger)]">
      {message}
    </p>
  );
}
