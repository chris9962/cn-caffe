import { useState } from "react";

type MutationOptions = {
  method: "POST" | "PATCH" | "PUT" | "DELETE";
  body?: unknown;
};

export function useMutation<TResult = unknown>() {
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function mutate(url: string, { method, body }: MutationOptions) {
    setIsPending(true);
    setError(null);
    try {
      const isFormData = body instanceof FormData;
      const response = await fetch(url, {
        method,
        headers:
          body === undefined || isFormData
            ? undefined
            : { "Content-Type": "application/json" },
        body:
          body === undefined || isFormData ? (body as FormData | undefined) : JSON.stringify(body),
      });
      const responseBody = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(responseBody.error ?? response.statusText);
      }
      return responseBody as TResult;
    } catch (caught) {
      const message =
        caught instanceof Error ? caught.message : "Request failed";
      setError(message);
      throw new Error(message);
    } finally {
      setIsPending(false);
    }
  }

  return { mutate, isPending, error };
}
