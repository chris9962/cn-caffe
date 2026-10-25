export const INTERNAL_EMAIL_DOMAIN = "nhanvien.local";

export function normalizePhone(input: string): string | null {
  const stripped = input.replace(/[\s.\-()]/g, "");
  let digits = stripped;
  if (stripped.startsWith("+84")) digits = stripped.slice(1);
  else if (stripped.startsWith("0")) digits = `84${stripped.slice(1)}`;
  return /^84\d{9}$/.test(digits) ? digits : null;
}

export function phoneToEmail(normalizedPhone: string): string {
  return `${normalizedPhone}@${INTERNAL_EMAIL_DOMAIN}`;
}
