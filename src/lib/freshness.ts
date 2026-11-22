// Freshness signals: open/closed status, "New" badge, curator-visited date.
// Labels live here (not in tag-display.ts / TagBadge.tsx, which are for tags).

export type CafeStatusValue = "OPEN" | "TEMPORARILY_CLOSED" | "CLOSED";

/** A cafe counts as "New" for this many days after it was added. */
export const NEW_BADGE_DAYS = 30;

export const STATUS_LABELS: Record<CafeStatusValue, string> = {
  OPEN: "Open",
  TEMPORARILY_CLOSED: "Temporarily closed",
  CLOSED: "Closed",
};

/** Null status (rows created before the column existed) means OPEN. */
export function normalizeStatus(status: string | null | undefined): CafeStatusValue {
  return status === "CLOSED" || status === "TEMPORARILY_CLOSED" ? status : "OPEN";
}

export function isNewCafe(createdAt: Date, now: Date = new Date()): boolean {
  const ageMs = now.getTime() - createdAt.getTime();
  return ageMs >= 0 && ageMs < NEW_BADGE_DAYS * 24 * 60 * 60 * 1000;
}

/** "October 2026" — month precision is all a visit date needs. */
export function formatVisited(date: Date): string {
  return new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric", timeZone: "America/Chicago" }).format(date);
}
