// Shareable passport summary: per-region stamp counts only (never slugs), e.g.
// "c4-n6-nw1-w0-s2". The share page validates counts against real totals.

import { REGIONS, type RegionValue } from "./regions";

const PREFIX: Record<RegionValue, string> = { CITY: "c", NORTH: "n", NORTHWEST: "nw", WEST: "w", SOUTH: "s" };
const MAX_CODE_LENGTH = 64;

export type RegionCounts = Record<RegionValue, number>;

export function encodeShareCode(counts: RegionCounts): string {
  return REGIONS.map((r) => `${PREFIX[r]}${Math.max(0, Math.floor(counts[r]))}`).join("-");
}

/** Returns counts, or null if the code is malformed or exceeds the given per-region totals. */
export function decodeShareCode(code: string, totals: RegionCounts): RegionCounts | null {
  if (code.length > MAX_CODE_LENGTH) return null;
  const parts = code.split("-");
  if (parts.length !== REGIONS.length) return null;
  const counts = {} as RegionCounts;
  for (let i = 0; i < REGIONS.length; i++) {
    const region = REGIONS[i];
    const m = parts[i].match(new RegExp(`^${PREFIX[region]}(\\d{1,4})$`));
    if (!m) return null;
    const n = Number(m[1]);
    if (n > totals[region]) return null;
    counts[region] = n;
  }
  return counts;
}

export function totalStamps(counts: RegionCounts): number {
  return REGIONS.reduce((sum, r) => sum + counts[r], 0);
}
