// Chicagoland regions: the city plus suburb areas. Used for the region filter
// and for grouping the passport. Stored on Cafe.region.

export const REGIONS = ["CITY", "NORTH", "NORTHWEST", "WEST", "SOUTH"] as const;
export type RegionValue = (typeof REGIONS)[number];

export const REGION_LABELS: Record<RegionValue, string> = {
  CITY: "Chicago",
  NORTH: "North Shore & North",
  NORTHWEST: "Northwest Suburbs",
  WEST: "West Suburbs",
  SOUTH: "South & Southwest",
};

/** Short labels for chips. */
export const REGION_CHIP_LABELS: Record<RegionValue, string> = {
  CITY: "Chicago",
  NORTH: "North",
  NORTHWEST: "Northwest",
  WEST: "West",
  SOUTH: "South",
};

// Municipality -> region. Used by the data scripts and as the admin default.
// Lowercase keys; anything not listed must be assigned by hand.
const LOCALITY_REGION: Record<string, RegionValue> = {
  chicago: "CITY",
  // North Shore & north suburbs
  evanston: "NORTH", skokie: "NORTH", wilmette: "NORTH", kenilworth: "NORTH", winnetka: "NORTH",
  glencoe: "NORTH", "highland park": "NORTH", highwood: "NORTH", "lake forest": "NORTH", "lake bluff": "NORTH",
  libertyville: "NORTH", deerfield: "NORTH", northbrook: "NORTH", glenview: "NORTH", niles: "NORTH",
  "morton grove": "NORTH", "park ridge": "NORTH", "des plaines": "NORTH", lincolnwood: "NORTH",
  "vernon hills": "NORTH", mundelein: "NORTH", gurnee: "NORTH", waukegan: "NORTH",
  // Northwest suburbs
  "arlington heights": "NORTHWEST", "mount prospect": "NORTHWEST", palatine: "NORTHWEST",
  "rolling meadows": "NORTHWEST", schaumburg: "NORTHWEST", "hoffman estates": "NORTHWEST",
  barrington: "NORTHWEST", "crystal lake": "NORTHWEST", elgin: "NORTHWEST",
  // West suburbs (incl. Fox Valley and DuPage)
  "oak park": "WEST", "forest park": "WEST", "river forest": "WEST", berwyn: "WEST", riverside: "WEST",
  "la grange": "WEST", "western springs": "WEST", hinsdale: "WEST", "clarendon hills": "WEST",
  elmhurst: "WEST", "villa park": "WEST", lombard: "WEST", "glen ellyn": "WEST", wheaton: "WEST",
  "downers grove": "WEST", westmont: "WEST", lisle: "WEST", naperville: "WEST", aurora: "WEST",
  batavia: "WEST", geneva: "WEST", "st. charles": "WEST", "st charles": "WEST", brookfield: "WEST",
  // South & southwest suburbs
  "oak lawn": "SOUTH", "evergreen park": "SOUTH", "blue island": "SOUTH", alsip: "SOUTH",
  "orland park": "SOUTH", "tinley park": "SOUTH", "palos park": "SOUTH", "palos heights": "SOUTH",
  "palos hills": "SOUTH", lemont: "SOUTH", "homer glen": "SOUTH", lockport: "SOUTH", joliet: "SOUTH",
  plainfield: "SOUTH", romeoville: "SOUTH", bolingbrook: "SOUTH", mokena: "SOUTH", frankfort: "SOUTH",
  "new lenox": "SOUTH", homewood: "SOUTH", flossmoor: "SOUTH", "olympia fields": "SOUTH",
  "park forest": "SOUTH", "chicago heights": "SOUTH", matteson: "SOUTH", lansing: "SOUTH", monee: "SOUTH",
  burbank: "SOUTH", darien: "SOUTH", woodridge: "SOUTH",
};

/** "123 Main St, Oak Park, IL 60302" -> "oak park". */
export function localityFromAddress(address: string): string | null {
  const parts = address.split(",").map((p) => p.trim());
  // Expect "... , City, IL 60xxx"
  const stateIdx = parts.findIndex((p) => /^IL(\s+\d{5})?$/i.test(p));
  if (stateIdx > 0) return parts[stateIdx - 1].toLowerCase();
  return parts.length >= 3 ? parts[parts.length - 2].toLowerCase() : null;
}

export function regionForAddress(address: string): RegionValue | null {
  const locality = localityFromAddress(address);
  return locality ? LOCALITY_REGION[locality] ?? null : null;
}

export function isRegion(value: unknown): value is RegionValue {
  return typeof value === "string" && (REGIONS as readonly string[]).includes(value);
}
