// Structured weekly hours, evaluated in Chicago time.
//
// Stored on Cafe.hours as JSON: { mon: [{ open: "07:00", close: "15:00" }], ..., sun: [] }.
// An empty array means closed that day. close <= open means the interval runs
// past midnight into the next day ("17:00"-"02:00"); "00:00"-"00:00" is 24h.

export const DAY_KEYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"] as const;
export type DayKey = (typeof DAY_KEYS)[number];
export interface HoursInterval {
  open: string;
  close: string;
}
export type WeeklyHours = Record<DayKey, HoursInterval[]>;

export const DAY_LABELS: Record<DayKey, string> = {
  mon: "Mon",
  tue: "Tue",
  wed: "Wed",
  thu: "Thu",
  fri: "Fri",
  sat: "Sat",
  sun: "Sun",
};

export const CAFE_TIME_ZONE = "America/Chicago";

/** Hours-derived badges (these replace the retired early_bird / late_night tags). */
export const EARLY_BIRD_OPENS_BY = "07:00"; // opens at or before this on at least one weekday
export const LATE_NIGHT_OPEN_UNTIL = "21:00"; // open until at least this on at least one day

const HHMM = /^([01]\d|2[0-3]):([0-5]\d)$/;

export function toMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}

/** Validates unknown JSON into WeeklyHours, or null if malformed. */
export function parseWeeklyHours(value: unknown): WeeklyHours | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const out = {} as WeeklyHours;
  for (const day of DAY_KEYS) {
    const intervals = (value as Record<string, unknown>)[day];
    if (!Array.isArray(intervals)) return null;
    const parsed: HoursInterval[] = [];
    for (const iv of intervals) {
      if (!iv || typeof iv !== "object") return null;
      const { open, close } = iv as Record<string, unknown>;
      if (typeof open !== "string" || typeof close !== "string" || !HHMM.test(open) || !HHMM.test(close)) return null;
      parsed.push({ open, close });
    }
    parsed.sort((a, b) => toMinutes(a.open) - toMinutes(b.open));
    out[day] = parsed;
  }
  return out;
}

/** Day of week and minutes since midnight in Chicago for an instant. DST-safe. */
export function chicagoClock(date: Date): { day: DayKey; minutes: number } {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: CAFE_TIME_ZONE,
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  const day = get("weekday").toLowerCase().slice(0, 3) as DayKey;
  return { day, minutes: Number(get("hour")) * 60 + Number(get("minute")) };
}

function dayOffset(day: DayKey, offset: number): DayKey {
  const i = DAY_KEYS.indexOf(day);
  return DAY_KEYS[(i + offset + 7) % 7];
}

function isOvernight(iv: HoursInterval): boolean {
  return toMinutes(iv.close) <= toMinutes(iv.open);
}

export interface OpenStatus {
  open: boolean;
  /** "HH:MM" the current interval closes (when open). */
  closesAt?: string;
  /** Next opening: day and time (when closed). */
  opensAt?: { day: DayKey; time: string; today: boolean };
}

export function getStatusAt(hours: WeeklyHours, date: Date): OpenStatus {
  const { day, minutes } = chicagoClock(date);

  // Yesterday's overnight interval still running this morning?
  for (const iv of hours[dayOffset(day, -1)]) {
    if (isOvernight(iv) && minutes < toMinutes(iv.close)) return { open: true, closesAt: iv.close };
  }
  for (const iv of hours[day]) {
    const o = toMinutes(iv.open);
    const c = toMinutes(iv.close);
    if (isOvernight(iv) ? minutes >= o : minutes >= o && minutes < c) {
      return { open: true, closesAt: iv.close };
    }
  }

  // Closed: find the next opening within the coming week.
  const laterToday = hours[day].find((iv) => toMinutes(iv.open) > minutes);
  if (laterToday) return { open: false, opensAt: { day, time: laterToday.open, today: true } };
  for (let i = 1; i <= 7; i++) {
    const d = dayOffset(day, i);
    if (hours[d].length > 0) return { open: false, opensAt: { day: d, time: hours[d][0].open, today: false } };
  }
  return { open: false };
}

/** "07:00" -> "7am", "15:30" -> "3:30pm", "00:00" -> "12am". */
export function formatTime(hhmm: string): string {
  const [h, m] = hhmm.split(":").map(Number);
  const suffix = h < 12 ? "am" : "pm";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return m === 0 ? `${h12}${suffix}` : `${h12}:${String(m).padStart(2, "0")}${suffix}`;
}

export function formatIntervals(intervals: HoursInterval[]): string {
  if (intervals.length === 0) return "Closed";
  return intervals
    .map((iv) => (iv.open === "00:00" && iv.close === "00:00" ? "Open 24 hours" : `${formatTime(iv.open)}–${formatTime(iv.close)}`))
    .join(", ");
}

/** Short status line for cards and the map: "Open · closes 3pm" / "Closed · opens 7am". */
export function statusLine(status: OpenStatus): string {
  if (status.open) return status.closesAt ? `Open · closes ${formatTime(status.closesAt)}` : "Open";
  if (!status.opensAt) return "Closed";
  const when = status.opensAt.today ? "" : ` ${DAY_LABELS[status.opensAt.day]}`;
  return `Closed · opens${when} ${formatTime(status.opensAt.time)}`;
}

export function isEarlyBird(hours: WeeklyHours): boolean {
  const limit = toMinutes(EARLY_BIRD_OPENS_BY);
  return (["mon", "tue", "wed", "thu", "fri"] as const).some((d) => hours[d].some((iv) => toMinutes(iv.open) <= limit));
}

export function isLateNight(hours: WeeklyHours): boolean {
  const limit = toMinutes(LATE_NIGHT_OPEN_UNTIL);
  return DAY_KEYS.some((d) => hours[d].some((iv) => isOvernight(iv) || toMinutes(iv.close) >= limit));
}

/** "Mon: 7am–3pm" rows for display. */
export function hoursRows(hours: WeeklyHours): { day: DayKey; label: string; text: string }[] {
  return DAY_KEYS.map((day) => ({ day, label: DAY_LABELS[day], text: formatIntervals(hours[day]) }));
}

/** Parses the admin editor's per-day text ("7:00-15:00, 17:00-21:00" or "closed"). */
export function parseDayText(text: string): HoursInterval[] | null {
  const t = text.trim().toLowerCase();
  if (t === "" || t === "closed") return [];
  const out: HoursInterval[] = [];
  for (const part of t.split(",")) {
    const m = part.trim().match(/^(\d{1,2}):(\d{2})\s*[-–]\s*(\d{1,2}):(\d{2})$/);
    if (!m) return null;
    const open = `${m[1].padStart(2, "0")}:${m[2]}`;
    const close = `${m[3].padStart(2, "0")}:${m[4]}`;
    if (!HHMM.test(open) || !HHMM.test(close)) return null;
    out.push({ open, close });
  }
  return out;
}

export function dayText(intervals: HoursInterval[]): string {
  return intervals.length === 0 ? "closed" : intervals.map((iv) => `${iv.open}-${iv.close}`).join(", ");
}
