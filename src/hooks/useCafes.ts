import { useMemo } from "react";
import type { CafeListItem } from "@/lib/types";

interface UseCafesOptions {
  cafes: CafeListItem[];
  selectedAmenities: string[];
  selectedVibes: string[];
}

export function useCafes({
  cafes,
  selectedAmenities,
  selectedVibes,
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

      return true;
    });
  }, [cafes, selectedAmenities, selectedVibes]);
}
