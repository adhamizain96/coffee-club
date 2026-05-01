// Source of truth for tag presentation in *chip* contexts: the homepage
// Filters panel and the /submit form's tag picker. Labels here are short
// (single word where possible) so they fit in narrow chip rows.
//
// Longer descriptive labels for tag *badges* — used on cafe detail pages and
// cards where there's room — live in `src/components/TagBadge.tsx`. The two
// sets are intentionally different because the contexts have different space
// constraints; do not unify without a UX reason.
//
// The DB Tag.name field stays canonical (e.g. "bar_seating") — this module
// only controls display.

export type TagKind = "AMENITY" | "VIBE";

export interface TagDisplay {
  /** DB Tag.name — the canonical key. */
  name: string;
  /** Human-readable label for the UI. */
  label: string;
}

export interface TagCategory {
  /** Group heading shown in the UI. */
  title: string;
  /**
   * AMENITY categories share a single filter slot on the homepage; VIBE is its
   * own slot. Renderers also use this to place the divider between sections.
   */
  kind: TagKind;
  tags: ReadonlyArray<TagDisplay>;
}

export const TAG_CATEGORIES: ReadonlyArray<TagCategory> = [
  {
    title: "Amenities",
    kind: "AMENITY",
    tags: [
      { name: "wifi", label: "WiFi" },
      { name: "outlets", label: "Outlets" },
      { name: "outdoor_seating", label: "Outdoor" },
      { name: "pet_friendly", label: "Pets OK" },
      { name: "parking", label: "Parking" },
    ],
  },
  {
    title: "Seating",
    kind: "AMENITY",
    tags: [
      { name: "bar_seating", label: "Bar" },
      { name: "communal_tables", label: "Communal" },
      { name: "couch_seating", label: "Couches" },
    ],
  },
  {
    title: "Work",
    kind: "AMENITY",
    tags: [
      { name: "laptop_friendly", label: "Laptops" },
      { name: "meeting_space", label: "Meetings" },
      { name: "no_laptops", label: "No Laptops" },
    ],
  },
  {
    title: "Food",
    kind: "AMENITY",
    tags: [
      { name: "full_menu", label: "Full Menu" },
      { name: "pastries_only", label: "Pastries" },
      { name: "vegan_options", label: "Vegan" },
    ],
  },
  {
    title: "Noise",
    kind: "AMENITY",
    tags: [
      { name: "whisper_quiet", label: "Quiet" },
      { name: "moderate_noise", label: "Moderate" },
      { name: "bustling", label: "Bustling" },
    ],
  },
  {
    title: "Hours",
    kind: "AMENITY",
    tags: [
      { name: "early_bird", label: "Early Bird" },
      { name: "late_night", label: "Late Night" },
      { name: "weekend_brunch", label: "Brunch" },
    ],
  },
  {
    title: "Vibes",
    kind: "VIBE",
    tags: [
      { name: "cozy", label: "Cozy" },
      { name: "study-friendly", label: "Study" },
      { name: "quiet", label: "Quiet" },
      { name: "lively", label: "Lively" },
      { name: "bright", label: "Bright" },
      { name: "date-spot", label: "Date Spot" },
    ],
  },
];

/**
 * Look up the display label for a Tag.name. Falls back to the raw name when no
 * mapping exists, so callers always have something printable.
 */
export function getTagLabel(name: string): string {
  for (const cat of TAG_CATEGORIES) {
    const hit = cat.tags.find((t) => t.name === name);
    if (hit) return hit.label;
  }
  return name;
}
