import { useState } from "react";

const FALLBACK_ERROR = "Không thể kết nối. Bạn thử lại sau.";

class ApiError extends Error {}

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
      const responseBody = await response.json().catch(() => null);
      if (!response.ok) {
        const text = responseBody?.error;
        throw new ApiError(
          typeof text === "string" && text !== "" ? text : FALLBACK_ERROR,
        );
      }
      return responseBody as TResult;
    } catch (caught) {
      // Only errors thrown above carry Vietnamese text; network errors get the fallback.
      const message = caught instanceof ApiError ? caught.message : FALLBACK_ERROR;
      setError(message);
      throw new Error(message);
    } finally {
      setIsPending(false);
    }
  }

  return { mutate, isPending, error };
}
