export function ErrorMessage({ message }: { message: string }) {
  return (
    <p role="alert" className="text-red-700 dark:text-red-400">
      {message}
    </p>
  );
}
