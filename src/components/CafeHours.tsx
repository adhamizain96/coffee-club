"use client";

import { useSyncExternalStore } from "react";
import { getStatusAt, hoursRows, statusLine, chicagoClock, type WeeklyHours } from "@/lib/hours";

interface CafeHoursProps {
  hours: WeeklyHours | null;
  checkedAt: Date | string | null;
  sourceUrl: string | null;
  website: string | null;
  /** Closed / temporarily closed cafes don't show hours. */
  closed?: boolean;
}

// "now" is read on the client only (the server renders a neutral state), so a
// cached or slow render never shows a stale open/closed line.
const subscribe = (onChange: () => void) => {
  const id = window.setInterval(onChange, 60_000);
  document.addEventListener("visibilitychange", onChange);
  return () => {
    window.clearInterval(id);
    document.removeEventListener("visibilitychange", onChange);
  };
};
const getMinuteSnapshot = () => Math.floor(Date.now() / 60_000);
const getServerSnapshot = () => null;

export default function CafeHours({ hours, checkedAt, sourceUrl, website, closed }: CafeHoursProps) {
  const minute = useSyncExternalStore(subscribe, getMinuteSnapshot, getServerSnapshot);
  const now = minute === null ? null : new Date(minute * 60_000);

  if (closed) return null;

  const checked = checkedAt
    ? new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "America/Chicago" }).format(
        typeof checkedAt === "string" ? new Date(checkedAt) : checkedAt
      )
    : null;

  if (!hours) {
    return (
      <section className="mt-6" aria-labelledby="hours-heading">
        <h2 id="hours-heading" className="text-lg font-semibold text-gray-900 mb-2">Hours</h2>
        <p className="text-sm text-gray-500">
          Hours not listed.
          {website && (
            <>
              {" "}
              Check{" "}
              <a href={website} target="_blank" rel="noopener noreferrer" className="font-medium text-amber-700 hover:text-amber-800 underline-offset-2 hover:underline">
                the cafe&apos;s website
              </a>{" "}
              before you go.
            </>
          )}
        </p>
      </section>
    );
  }

  const status = now ? getStatusAt(hours, now) : null;
  const today = now ? chicagoClock(now).day : null;

  return (
    <section className="mt-6" aria-labelledby="hours-heading">
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 mb-2">
        <h2 id="hours-heading" className="text-lg font-semibold text-gray-900">Hours</h2>
        {status && (
          <span className={`text-sm font-medium ${status.open ? "text-emerald-700" : "text-stone-500"}`}>{statusLine(status)}</span>
        )}
      </div>
      <dl className="grid grid-cols-[3rem_1fr] gap-x-3 gap-y-1 text-sm max-w-xs">
        {hoursRows(hours).map((row) => (
          <div key={row.day} className="contents">
            <dt className={row.day === today ? "font-semibold text-gray-900" : "text-gray-500"}>{row.label}</dt>
            <dd className={row.day === today ? "font-semibold text-gray-900" : "text-gray-700"}>{row.text}</dd>
          </div>
        ))}
      </dl>
      <p className="mt-2 text-xs text-gray-400">
        Chicago time. Holiday hours may differ.
        {checked && <> Hours checked {checked}</>}
        {checked && sourceUrl && (
          <>
            {" "}
            (
            <a href={sourceUrl} target="_blank" rel="noopener noreferrer" className="underline-offset-2 hover:underline">
              source
            </a>
            )
          </>
        )}
        {checked && "."}
      </p>
      {website && (
        <p className="mt-1 text-xs">
          <a href={website} target="_blank" rel="noopener noreferrer" className="font-medium text-amber-700 hover:text-amber-800 underline-offset-2 hover:underline">
            Website
          </a>
        </p>
      )}
    </section>
  );
}
