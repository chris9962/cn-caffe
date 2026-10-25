import { useEffect, useState } from "react";

type FetchResult<T> = {
  url: string;
  data: T | null;
  error: string | null;
};

export function useFetch<T>(url: string) {
  const [result, setResult] = useState<FetchResult<T> | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    fetch(url, { signal: controller.signal })
      .then(async (response) => {
        const body = await response.json();
        if (!response.ok) {
          throw new Error(body.error ?? response.statusText);
        }
        setResult({ url, data: body as T, error: null });
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        const message =
          error instanceof Error ? error.message : "Request failed";
        setResult({ url, data: null, error: message });
      });

    return () => controller.abort();
  }, [url]);

  // Keying the result by url means a response for an old url never shows as current data.
  const isCurrent = result?.url === url;

  return {
    data: isCurrent ? result.data : null,
    error: isCurrent ? result.error : null,
    isLoading: !isCurrent,
  };
}
