// Assertions for src/lib/hours.ts. Run: npx tsx scripts/check-hours.ts
// (The repo has no test runner; this exits non-zero on the first failure.)

import assert from "node:assert/strict";
import {
  parseWeeklyHours,
  getStatusAt,
  chicagoClock,
  formatTime,
  formatIntervals,
  statusLine,
  isEarlyBird,
  isLateNight,
  parseDayText,
  type WeeklyHours,
} from "../src/lib/hours";

const days = (iv: { open: string; close: string }[]) => ({ mon: iv, tue: iv, wed: iv, thu: iv, fri: iv, sat: iv, sun: iv });
const regular = parseWeeklyHours({ ...days([{ open: "07:00", close: "15:00" }]), sun: [] })!;
const overnight = parseWeeklyHours({ ...days([{ open: "17:00", close: "02:00" }]), mon: [] })!;
let n = 0;
const check = (name: string, fn: () => void) => {
  fn();
  n++;
  console.log(`ok  ${name}`);
};

// 2026-11-23 is a Monday. Chicago is UTC-6 (CST) then.
const chi = (iso: string) => new Date(iso);

check("parse rejects malformed", () => {
  assert.equal(parseWeeklyHours(null), null);
  assert.equal(parseWeeklyHours({ mon: [] }), null);
  assert.equal(parseWeeklyHours({ ...days([{ open: "7:00", close: "15:00" }]) }), null);
  assert.equal(parseWeeklyHours({ ...days([{ open: "25:00", close: "15:00" }]) }), null);
});
check("clock: Monday 9:30 CST", () => {
  assert.deepEqual(chicagoClock(chi("2026-11-23T15:30:00Z")), { day: "mon", minutes: 570 });
});
check("open mid-interval", () => {
  assert.deepEqual(getStatusAt(regular, chi("2026-11-23T15:30:00Z")), { open: true, closesAt: "15:00" });
});
check("exactly at open is open", () => {
  assert.equal(getStatusAt(regular, chi("2026-11-23T13:00:00Z")).open, true); // 07:00 CST
});
check("exactly at close is closed, next opening tomorrow", () => {
  const s = getStatusAt(regular, chi("2026-11-23T21:00:00Z")); // 15:00 CST Mon
  assert.equal(s.open, false);
  assert.deepEqual(s.opensAt, { day: "tue", time: "07:00", today: false });
});
check("before open: opens later today", () => {
  assert.deepEqual(getStatusAt(regular, chi("2026-11-23T11:00:00Z")).opensAt, { day: "mon", time: "07:00", today: true }); // 05:00
});
check("closed day (Sunday) -> opens Monday", () => {
  const s = getStatusAt(regular, chi("2026-11-22T18:00:00Z")); // Sun 12:00 CST
  assert.equal(s.open, false);
  assert.deepEqual(s.opensAt, { day: "mon", time: "07:00", today: false });
});
check("overnight: open after open time", () => {
  assert.deepEqual(getStatusAt(overnight, chi("2026-11-25T05:00:00Z")), { open: true, closesAt: "02:00" }); // Tue 23:00 CST
});
check("overnight: still open early next morning", () => {
  assert.equal(getStatusAt(overnight, chi("2026-11-25T07:30:00Z")).open, true); // Wed 01:30 CST, from Tue
});
check("overnight: closed after 2am", () => {
  assert.equal(getStatusAt(overnight, chi("2026-11-25T08:30:00Z")).open, false); // Wed 02:30 CST
});
check("overnight: Sunday's interval carries into Monday (Monday itself closed)", () => {
  assert.equal(getStatusAt(overnight, chi("2026-11-23T07:00:00Z")).open, true); // Mon 01:00 CST
});
check("DST start Sunday 2026-03-08: 10:00 CDT is Sunday 600", () => {
  assert.deepEqual(chicagoClock(chi("2026-03-08T15:00:00Z")), { day: "sun", minutes: 600 });
});
check("DST end Sunday 2026-11-01: 10:00 CST is Sunday 600", () => {
  assert.deepEqual(chicagoClock(chi("2026-11-01T16:00:00Z")), { day: "sun", minutes: 600 });
});
check("summer (CDT) Monday 14:59 open, 15:00 closed", () => {
  assert.equal(getStatusAt(regular, chi("2026-07-13T19:59:00Z")).open, true);
  assert.equal(getStatusAt(regular, chi("2026-07-13T20:00:00Z")).open, false);
});
check("formatting", () => {
  assert.equal(formatTime("07:00"), "7am");
  assert.equal(formatTime("15:30"), "3:30pm");
  assert.equal(formatTime("00:00"), "12am");
  assert.equal(formatTime("12:00"), "12pm");
  assert.equal(formatIntervals([]), "Closed");
  assert.equal(formatIntervals([{ open: "00:00", close: "00:00" }]), "Open 24 hours");
  assert.equal(statusLine({ open: true, closesAt: "15:00" }), "Open · closes 3pm");
  assert.equal(statusLine({ open: false, opensAt: { day: "tue", time: "07:00", today: false } }), "Closed · opens Tue 7am");
});
check("24h interval is always open", () => {
  const all = parseWeeklyHours(days([{ open: "00:00", close: "00:00" }])) as WeeklyHours;
  assert.equal(getStatusAt(all, chi("2026-11-23T09:00:00Z")).open, true);
});
check("derived badges", () => {
  assert.equal(isEarlyBird(regular), true);
  assert.equal(isLateNight(regular), false);
  assert.equal(isLateNight(overnight), true);
  assert.equal(isEarlyBird(overnight), false);
});
check("admin day text parsing", () => {
  assert.deepEqual(parseDayText("7:00-15:00, 17:00-21:30"), [
    { open: "07:00", close: "15:00" },
    { open: "17:00", close: "21:30" },
  ]);
  assert.deepEqual(parseDayText("closed"), []);
  assert.equal(parseDayText("7am-3pm"), null);
  assert.equal(parseDayText("25:00-26:00"), null);
});

console.log(`\n${n} checks passed`);
