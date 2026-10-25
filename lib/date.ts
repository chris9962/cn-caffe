const MONTH = /^(\d{4})-(0[1-9]|1[0-2])$/;

// hourCycle "h23" stops some engines from printing midnight as "24".
const vietnamFormatter = new Intl.DateTimeFormat("en-US", {
  timeZone: "Asia/Ho_Chi_Minh",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

function vietnamParts(date: Date) {
  const parts = Object.fromEntries(vietnamFormatter.formatToParts(date).map((part) => [part.type, part.value]));
  return { year: parts.year, month: parts.month, day: parts.day, hour: parts.hour, minute: parts.minute };
}

export function monthRange(month: string): { from: string; to: string } | null {
  const match = MONTH.exec(month);
  if (!match) return null;

  const year = Number(match[1]);
  const monthNumber = Number(match[2]);
  const to =
    monthNumber === 12 ? `${year + 1}-01-01` : `${match[1]}-${String(monthNumber + 1).padStart(2, "0")}-01`;
  return { from: `${month}-01`, to };
}

export function currentMonth(now: Date = new Date()): string {
  const { year, month } = vietnamParts(now);
  return `${year}-${month}`;
}

// Vietnam has no daylight saving time, so the offset is always +07:00.
export function toVietnamIso(localDateTime: string): string {
  return `${localDateTime.slice(0, 16)}:00+07:00`;
}

export function toVietnamLocalInput(iso: string): string {
  const { year, month, day, hour, minute } = vietnamParts(new Date(iso));
  return `${year}-${month}-${day}T${hour}:${minute}`;
}

export function formatDateTime(iso: string): string {
  const { year, month, day, hour, minute } = vietnamParts(new Date(iso));
  return `${day}/${month}/${year} ${hour}:${minute}`;
}

export function formatDuration(minutes: number): string {
  const total = Math.floor(minutes);
  const hours = Math.floor(total / 60);
  const rest = total % 60;
  if (hours === 0) return `${rest} phút`;
  return rest === 0 ? `${hours} giờ` : `${hours} giờ ${rest} phút`;
}
