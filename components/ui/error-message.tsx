export function ErrorMessage({ message, id }: { message: string; id?: string }) {
  return (
    <p id={id} role="alert" className="text-sm font-medium leading-6 text-[var(--danger)]">
      {message}
    </p>
  );
}
