export const CANBERRA_TIME_ZONE = "Australia/Sydney";

export type CanberraPeriod = "AM" | "PM";

export type CanberraDateTimeInput = {
  date: string;
  hour: number;
  minute: number;
  period: CanberraPeriod;
};

type CanberraDateTimeParts = {
  date: string;
  hour24: number;
  minute: number;
};

function pad(value: number) {
  return String(value).padStart(2, "0");
}

function to24Hour(hour: number, period: CanberraPeriod) {
  if (period === "AM") return hour === 12 ? 0 : hour;
  return hour === 12 ? 12 : hour + 12;
}

function to12Hour(hour24: number): { hour: number; period: CanberraPeriod } {
  if (hour24 === 0) return { hour: 12, period: "AM" };
  if (hour24 < 12) return { hour: hour24, period: "AM" };
  if (hour24 === 12) return { hour: 12, period: "PM" };
  return { hour: hour24 - 12, period: "PM" };
}

function formatOffset(offsetMinutes: number) {
  const sign = offsetMinutes >= 0 ? "+" : "-";
  const absoluteMinutes = Math.abs(offsetMinutes);
  return `${sign}${pad(Math.floor(absoluteMinutes / 60))}:${pad(absoluteMinutes % 60)}`;
}

function getCanberraOffsetMinutes(date: Date) {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: CANBERRA_TIME_ZONE,
    timeZoneName: "shortOffset",
  });
  const timeZoneName = formatter.formatToParts(date).find((part) => part.type === "timeZoneName")?.value ?? "GMT+10";
  const match = timeZoneName.match(/^GMT([+-])(\d{1,2})(?::?(\d{2}))?$/);

  if (!match) return 10 * 60;

  const sign = match[1] === "-" ? -1 : 1;
  const hours = Number(match[2]);
  const minutes = Number(match[3] ?? "0");
  return sign * (hours * 60 + minutes);
}

function canberraLocalPartsToIso(date: string, hour24: number, minute: number) {
  const [year, month, day] = date.split("-").map(Number);
  const localAsUtc = Date.UTC(year, month - 1, day, hour24, minute, 0);
  const firstOffset = getCanberraOffsetMinutes(new Date(localAsUtc));
  let instantMs = localAsUtc - firstOffset * 60_000;
  const finalOffset = getCanberraOffsetMinutes(new Date(instantMs));

  if (finalOffset !== firstOffset) {
    instantMs = localAsUtc - finalOffset * 60_000;
  }

  return `${date}T${pad(hour24)}:${pad(minute)}:00${formatOffset(finalOffset)}`;
}

export function canberraSelectionToIso(input: CanberraDateTimeInput) {
  return canberraLocalPartsToIso(input.date, to24Hour(input.hour, input.period), input.minute);
}

export function parseCanberraDateTimeParts(value: string | null | undefined): CanberraDateTimeParts | null {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;

  const parts = new Intl.DateTimeFormat("en-AU", {
    timeZone: CANBERRA_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);

  const byType = Object.fromEntries(parts.map((part) => [part.type, part.value]));

  return {
    date: `${byType.year}-${byType.month}-${byType.day}`,
    hour24: Number(byType.hour),
    minute: Number(byType.minute),
  };
}

export function parseCanberraSelectorDefault(value: string | null | undefined) {
  const parts = parseCanberraDateTimeParts(value);
  if (!parts) return null;
  const { hour, period } = to12Hour(parts.hour24);
  return {
    date: parts.date,
    hour,
    minute: parts.minute,
    period,
  };
}

export function formatCanberraDateTime(value: string | null | undefined) {
  if (!value) return "Not set";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Invalid date";

  return new Intl.DateTimeFormat("en-AU", {
    dateStyle: "long",
    timeStyle: "short",
    timeZone: CANBERRA_TIME_ZONE,
  }).format(date);
}

export function formatCanberraTime(value: string | null | undefined) {
  if (!value) return "No time";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Invalid time";

  return new Intl.DateTimeFormat("en-AU", {
    timeStyle: "short",
    timeZone: CANBERRA_TIME_ZONE,
  }).format(date);
}

export function getCanberraDateKey(value: string | null | undefined) {
  return parseCanberraDateTimeParts(value)?.date ?? "";
}

export function addCanberraCalendarInterval(
  value: string,
  frequency: "daily" | "weekly" | "fortnightly" | "monthly",
  offset: number
) {
  const parts = parseCanberraDateTimeParts(value);
  if (!parts) throw new Error("Event date must be a valid Canberra timestamp.");

  const [year, month, day] = parts.date.split("-").map(Number);
  const localDate = new Date(Date.UTC(year, month - 1, day, parts.hour24, parts.minute, 0));

  if (frequency === "daily") localDate.setUTCDate(localDate.getUTCDate() + offset);
  if (frequency === "weekly") localDate.setUTCDate(localDate.getUTCDate() + offset * 7);
  if (frequency === "fortnightly") localDate.setUTCDate(localDate.getUTCDate() + offset * 14);
  if (frequency === "monthly") localDate.setUTCMonth(localDate.getUTCMonth() + offset);

  const nextDate = [
    localDate.getUTCFullYear(),
    pad(localDate.getUTCMonth() + 1),
    pad(localDate.getUTCDate()),
  ].join("-");

  return canberraLocalPartsToIso(nextDate, parts.hour24, parts.minute);
}

export function isUnambiguousTimestamp(value: string) {
  return /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(Z|[+-]\d{2}:\d{2})$/.test(value);
}
