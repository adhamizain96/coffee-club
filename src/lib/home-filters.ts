// Home page view state <-> URL query, so a filtered view can be shared:
//   /?amenities=wifi,outlets&vibes=cozy&when=open_now&area=WEST,NORTH&q=fortuna&cafe=metric-coffee
// Unknown values are dropped silently; a bad link never breaks the page.

import { TAG_CATEGORIES } from "./tag-display";
import { REGIONS, type RegionValue } from "./regions";

export type HoursFilter = "open_now" | "early_bird" | "late_night";
export const HOURS_FILTER_NAMES: readonly HoursFilter[] = ["open_now", "early_bird", "late_night"];

export interface HomeViewState {
  amenities: string[];
  vibes: string[];
  hours: HoursFilter[];
  regions: RegionValue[];
  query: string;
  cafe: string | null;
}

const AMENITY_NAMES = new Set(TAG_CATEGORIES.filter((c) => c.kind === "AMENITY").flatMap((c) => c.tags.map((t) => t.name)));
const VIBE_NAMES = new Set(TAG_CATEGORIES.filter((c) => c.kind === "VIBE").flatMap((c) => c.tags.map((t) => t.name)));
const MAX_QUERY = 80;
const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

type Params = Record<string, string | string[] | undefined>;

function list(params: Params, key: string): string[] {
  const raw = params[key];
  const value = Array.isArray(raw) ? raw.join(",") : raw ?? "";
  return Array.from(new Set(value.split(",").map((v) => v.trim()).filter(Boolean)));
}

export function parseHomeView(params: Params): HomeViewState {
  const rawQuery = params.q;
  const query = (Array.isArray(rawQuery) ? rawQuery[0] : rawQuery ?? "").slice(0, MAX_QUERY);
  const rawCafe = params.cafe;
  const cafe = Array.isArray(rawCafe) ? rawCafe[0] : rawCafe;
  return {
    amenities: list(params, "amenities").filter((n) => AMENITY_NAMES.has(n)),
    vibes: list(params, "vibes").filter((n) => VIBE_NAMES.has(n)),
    hours: list(params, "when").filter((n): n is HoursFilter => (HOURS_FILTER_NAMES as readonly string[]).includes(n)),
    regions: list(params, "area").filter((n): n is RegionValue => (REGIONS as readonly string[]).includes(n)),
    query,
    cafe: cafe && SLUG.test(cafe) ? cafe : null,
  };
}

/** Query string for the state ("" when nothing is set). Stable order for clean URLs. */
export function serializeHomeView(state: HomeViewState): string {
  const p = new URLSearchParams();
  if (state.amenities.length) p.set("amenities", state.amenities.join(","));
  if (state.vibes.length) p.set("vibes", state.vibes.join(","));
  if (state.hours.length) p.set("when", state.hours.join(","));
  if (state.regions.length) p.set("area", state.regions.join(","));
  if (state.query.trim()) p.set("q", state.query.trim());
  if (state.cafe) p.set("cafe", state.cafe);
  const s = p.toString().replace(/%2C/gi, ",");
  return s ? `?${s}` : "";
}

/** Case- and accent-insensitive: "cafe" matches "Café". */
export function normalizeSearch(text: string): string {
  return text
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim();
}
