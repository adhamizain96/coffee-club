// Passport badges: pure functions of (stamped slugs, cafe list). Six total.
// Closed cafes keep their stamps (they count toward totals), but "Area
// Complete" only requires the cafes that are still open.

import { REGIONS, REGION_LABELS, type RegionValue } from "./regions";
import type { CafeStatusValue } from "./freshness";

export interface PassportCafe {
  slug: string;
  name: string;
  neighborhood: string;
  region: RegionValue | null;
  status: CafeStatusValue;
}

export interface BadgeProgress {
  id: string;
  title: string;
  description: string;
  earned: boolean;
  /** Progress toward the badge, e.g. 3 of 10. */
  current: number;
  target: number;
  /** One-line nudge toward the next step when not earned. */
  hint: string;
}

const SUBURBAN: RegionValue[] = REGIONS.filter((r) => r !== "CITY");

export function computeBadges(visited: ReadonlySet<string>, cafes: PassportCafe[]): BadgeProgress[] {
  const stamped = cafes.filter((c) => visited.has(c.slug));
  const count = stamped.length;
  const regionsStamped = new Set(stamped.map((c) => c.region).filter((r): r is RegionValue => !!r));
  const suburbanStamped = SUBURBAN.filter((r) => regionsStamped.has(r)).length;
  const places = new Set(stamped.map((c) => c.neighborhood.trim().toLowerCase())).size;

  // Area Complete: best region by share of its open cafes stamped.
  let best: { region: RegionValue; done: number; total: number } | null = null;
  for (const region of REGIONS) {
    const open = cafes.filter((c) => c.region === region && c.status === "OPEN");
    if (open.length === 0) continue;
    const done = open.filter((c) => visited.has(c.slug)).length;
    const candidate = { region, done, total: open.length };
    if (!best || done / open.length > best.done / best.total || (done === best.done && open.length < best.total)) best = candidate;
  }

  const badge = (b: Omit<BadgeProgress, "earned">): BadgeProgress => ({ ...b, earned: b.current >= b.target });
  const left = (n: number, noun: string) => `${n} more ${noun}${n === 1 ? "" : "s"} to go`;

  return [
    badge({
      id: "first-stamp",
      title: "First Stamp",
      description: "Stamp your first cafe.",
      current: Math.min(count, 1),
      target: 1,
      hint: "Tap the stamp on any cafe you've been to.",
    }),
    badge({
      id: "regular",
      title: "Regular",
      description: "Stamp 10 cafes.",
      current: Math.min(count, 10),
      target: 10,
      hint: left(Math.max(0, 10 - count), "cafe"),
    }),
    badge({
      id: "leaves-the-city",
      title: "Leaves the City",
      description: "Stamp cafes in 3 different suburban areas.",
      current: Math.min(suburbanStamped, 3),
      target: 3,
      hint: left(Math.max(0, 3 - suburbanStamped), "suburban area"),
    }),
    badge({
      id: "all-five-areas",
      title: "All Five Areas",
      description: `Stamp at least one cafe in each area: ${REGIONS.map((r) => REGION_LABELS[r]).join(", ")}.`,
      current: regionsStamped.size,
      target: REGIONS.length,
      hint: `Still missing: ${REGIONS.filter((r) => !regionsStamped.has(r)).map((r) => REGION_LABELS[r]).join(", ") || "none"}.`,
    }),
    badge({
      id: "neighborhood-hopper",
      title: "Neighborhood Hopper",
      description: "Stamp cafes in 8 different neighborhoods or towns.",
      current: Math.min(places, 8),
      target: 8,
      hint: left(Math.max(0, 8 - places), "neighborhood"),
    }),
    badge({
      id: "area-complete",
      title: "Area Complete",
      description: "Stamp every open cafe in one area.",
      current: best?.done ?? 0,
      target: best?.total ?? 1,
      hint: best ? `Closest: ${REGION_LABELS[best.region]}, ${best.done} of ${best.total}.` : "No areas yet.",
    }),
  ];
}
