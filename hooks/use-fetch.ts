import { useEffect, useState } from "react";

type FetchResult<T> = {
  key: string;
  data: T | null;
  error: string | null;
};

export function useFetch<T>(url: string | null) {
  const [result, setResult] = useState<FetchResult<T> | null>(null);
  const [reloadCount, setReloadCount] = useState(0);
  const key = `${url}#${reloadCount}`;

  useEffect(() => {
    if (url === null) return;
    const controller = new AbortController();

    fetch(url, { signal: controller.signal })
      .then(async (response) => {
        const body = await response.json();
        if (!response.ok) {
          throw new Error(body.error ?? response.statusText);
        }
        setResult({ key, data: body as T, error: null });
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        const message =
          error instanceof Error ? error.message : "Request failed";
        setResult({ key, data: null, error: message });
      });

    return () => controller.abort();
  }, [url, key]);

  // Keying the result by url and reload count means a response for an old request never shows as current data.
  const isCurrent = result?.key === key;

  return {
    data: isCurrent ? result.data : null,
    error: isCurrent ? result.error : null,
    isLoading: url !== null && !isCurrent,
    reload: () => setReloadCount((count) => count + 1),
  };
}
