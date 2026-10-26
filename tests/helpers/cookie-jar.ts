type Cookie = { name: string; value: string };

const cookies = new Map<string, string>();

export const cookieJar = {
  getAll(): Cookie[] {
    return [...cookies].map(([name, value]) => ({ name, value }));
  },
  get(name: string): Cookie | undefined {
    const value = cookies.get(name);
    return value === undefined ? undefined : { name, value };
  },
  set(name: string, value: string, options?: { maxAge?: number }) {
    // @supabase/ssr removes a cookie by setting maxAge 0; a browser drops it, so the jar does too.
    if (options?.maxAge !== undefined && options.maxAge <= 0) cookies.delete(name);
    else cookies.set(name, value);
  },
  delete(name: string) {
    cookies.delete(name);
  },
  clear() {
    cookies.clear();
  },
};
