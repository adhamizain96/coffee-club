import { useMemo } from "react";
import type { CafeListItem } from "@/lib/types";
import { getStatusAt, isEarlyBird, isLateNight } from "@/lib/hours";
import type { RegionValue } from "@/lib/regions";

export type HoursFilter = "open_now" | "early_bird" | "late_night";

export const HOURS_FILTERS: ReadonlyArray<{ name: HoursFilter; label: string }> = [
  { name: "open_now", label: "Open now" },
  { name: "early_bird", label: "Early Bird" },
  { name: "late_night", label: "Late Night" },
];

interface UseCafesOptions {
  cafes: CafeListItem[];
  selectedAmenities: string[];
  selectedVibes: string[];
  /** Hours-derived filters; AND with each other and with amenities. */
  selectedHours?: HoursFilter[];
  /** Regions use OR: a cafe in any selected region matches. */
  selectedRegions?: RegionValue[];
  /** Client clock. While null (SSR/hydration) "Open now" doesn't filter. */
  now?: Date | null;
}

export function useCafes({
  cafes,
  selectedAmenities,
  selectedVibes,
  selectedHours = [],
  selectedRegions = [],
  now = null,
}: UseCafesOptions): CafeListItem[] {
  return useMemo(() => {
    return cafes.filter((cafe) => {
      const cafeTagNames = cafe.tags.map((t) => t.name);

      // Amenities: AND logic — cafe must have ALL selected amenity tags
      if (selectedAmenities.length > 0) {
        const hasAll = selectedAmenities.every((a) => cafeTagNames.includes(a));
        if (!hasAll) return false;
      }

      // Vibes: OR logic — cafe must have AT LEAST ONE selected vibe tag
      if (selectedVibes.length > 0) {
        const hasAny = selectedVibes.some((v) => cafeTagNames.includes(v));
        if (!hasAny) return false;
      }

      if (selectedRegions.length > 0 && (!cafe.region || !selectedRegions.includes(cafe.region))) return false;

      // Hours filters: cafes without listed hours (or not open) never match.
      for (const filter of selectedHours) {
        if (filter === "open_now" && !now) continue;
        if (!cafe.hours || cafe.status !== "OPEN") return false;
        if (filter === "open_now" && !getStatusAt(cafe.hours, now!).open) return false;
        if (filter === "early_bird" && !isEarlyBird(cafe.hours)) return false;
        if (filter === "late_night" && !isLateNight(cafe.hours)) return false;
      }

      return true;
    });
  }, [cafes, selectedAmenities, selectedVibes, selectedHours, selectedRegions, now]);
}
