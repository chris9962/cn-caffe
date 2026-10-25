const GOOGLE_HOSTS = new Set([
  "google.com",
  "www.google.com",
  "google.com.vn",
  "www.google.com.vn",
  "maps.google.com",
  "maps.google.com.vn",
]);
const SHORT_LINK_HOSTS = new Set(["maps.app.goo.gl", "goo.gl"]);

type Coordinates = { latitude: number; longitude: number };

function toCoordinates(latitude: string | undefined, longitude: string | undefined): Coordinates | null {
  const lat = Number(latitude);
  const lng = Number(longitude);
  const valid = latitude !== undefined && longitude !== undefined && Math.abs(lat) <= 90 && Math.abs(lng) <= 180;
  return valid ? { latitude: lat, longitude: lng } : null;
}

function parseUrl(url: string): URL | null {
  try {
    return new URL(url);
  } catch {
    return null;
  }
}

export function parseGoogleMapsCoordinates(url: string): Coordinates | null {
  const parsed = parseUrl(url);
  if (!parsed || !GOOGLE_HOSTS.has(parsed.hostname)) return null;

  const path = decodeURIComponent(parsed.pathname);
  // `!3d!4d` is the pin itself; `@` is only the map viewport.
  const pin = /!3d(-?\d+(?:\.\d+)?)!4d(-?\d+(?:\.\d+)?)/.exec(path);
  if (pin) return toCoordinates(pin[1], pin[2]);

  const viewport = /@(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/.exec(path);
  if (viewport) return toCoordinates(viewport[1], viewport[2]);

  for (const key of ["q", "query", "ll"]) {
    const value = parsed.searchParams.get(key);
    const match = value && /^\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)\s*$/.exec(value);
    if (match) return toCoordinates(match[1], match[2]);
  }

  const search = /\/search\/(-?\d+(?:\.\d+)?),\+?\s*(-?\d+(?:\.\d+)?)/.exec(path);
  return search ? toCoordinates(search[1], search[2]) : null;
}

export async function resolveGoogleMapsUrl(url: string, fetchImpl: typeof fetch = fetch): Promise<string> {
  const parsed = parseUrl(url);
  if (!parsed || (!GOOGLE_HOSTS.has(parsed.hostname) && !SHORT_LINK_HOSTS.has(parsed.hostname))) {
    throw new Error("invalid_map_link");
  }
  if (!SHORT_LINK_HOSTS.has(parsed.hostname)) return url;

  const response = await fetchImpl(url, { redirect: "follow" });
  // Only the final URL matters; skip downloading the HTML.
  await response.body?.cancel();
  return response.url;
}
