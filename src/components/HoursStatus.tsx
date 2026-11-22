"use client";

import { useClientNow } from "@/hooks/useClientNow";
import { getStatusAt, isEarlyBird, isLateNight, statusLine, type WeeklyHours } from "@/lib/hours";

/** "Open · closes 3pm" line for cards and the map popup. Renders nothing until the client knows the time. */
export function HoursStatusLine({ hours, className = "" }: { hours: WeeklyHours | null; className?: string }) {
  const now = useClientNow();
  if (!hours || !now) return null;
  const status = getStatusAt(hours, now);
  return (
    <p className={`text-[11px] font-medium ${status.open ? "text-emerald-700" : "text-stone-400"} ${className}`}>
      {statusLine(status)}
    </p>
  );
}

/** Hours-derived badges (replace the retired early_bird / late_night tags). Deterministic, so safe to SSR. */
export function HoursBadges({ hours }: { hours: WeeklyHours | null }) {
  if (!hours) return null;
  const badges = [isEarlyBird(hours) && "Early Bird", isLateNight(hours) && "Late Night"].filter(Boolean) as string[];
  return (
    <>
      {badges.map((label) => (
        <span
          key={label}
          className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium bg-sky-50 text-sky-700 ring-1 ring-sky-600/20"
        >
          {label}
        </span>
      ))}
    </>
  );
}
