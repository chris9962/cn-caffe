import { useEffect, useState } from "react";

const FALLBACK_ERROR = "Không thể kết nối. Bạn thử lại sau.";

class ApiError extends Error {}

function errorText(body: unknown) {
  const text = (body as { error?: unknown } | null)?.error;
  return typeof text === "string" && text !== "" ? text : FALLBACK_ERROR;
}

type FetchResult<T> = {
  url: string;
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
        const body = await response.json().catch(() => null);
        if (!response.ok) {
          throw new ApiError(errorText(body));
        }
        setResult({ url, key, data: body as T, error: null });
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        // Only errors thrown above carry Vietnamese text; network errors get the fallback.
        const message = error instanceof ApiError ? error.message : FALLBACK_ERROR;
        setResult({ url, key, data: null, error: message });
      });

    return () => controller.abort();
  }, [url, key]);

  // Keying the result by url and reload count means a response for an old request never shows as current data.
  const isCurrent = result?.key === key;

  // A reload of the same url keeps showing the last good data so callers do not unmount while refetching.
  const staleData = result?.url === url ? result.data : null;

  return {
    data: isCurrent ? result.data : staleData,
    error: isCurrent ? result.error : null,
    isLoading: url !== null && !isCurrent,
    reload: () => setReloadCount((count) => count + 1),
  };
}
