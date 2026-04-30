"use client";

import { useEffect, useRef, createRef } from "react";
import CafeCard from "./CafeCard";
import type { CafeListItem } from "@/lib/types";
import type { RatingsMap } from "@/app/HomeContent";

interface CafeListProps {
  cafes: CafeListItem[];
  selectedCafeId?: string | null;
  mode?: "pan" | "navigate";
  onCardClick?: (cafeId: string) => void;
  onPinClick?: (cafeId: string) => void;
  ratings?: RatingsMap;
}

export default function CafeList({
  cafes,
  selectedCafeId,
  mode,
  onCardClick,
  onPinClick,
  ratings,
}: CafeListProps) {
  const cardRefs = useRef<Map<string, React.RefObject<HTMLDivElement | null>>>(
    new Map()
  );

  // Ensure refs exist for all current cafes
  for (const cafe of cafes) {
    if (!cardRefs.current.has(cafe.id)) {
      cardRefs.current.set(cafe.id, createRef<HTMLDivElement>());
    }
  }

  useEffect(() => {
    if (selectedCafeId) {
      const ref = cardRefs.current.get(selectedCafeId);
      if (ref?.current) {
        ref.current.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    }
  }, [selectedCafeId]);

  if (cafes.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center px-4">
        <div className="text-3xl mb-2 opacity-40">&#9749;</div>
        <h3 className="text-sm font-semibold text-stone-700 mb-1">
          No cafes match
        </h3>
        <p className="text-xs text-stone-400">
          Try adjusting your filters.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {cafes.map((cafe) => (
        <CafeCard
          key={cafe.id}
          ref={cardRefs.current.get(cafe.id)}
          id={cafe.id}
          name={cafe.name}
          neighborhood={cafe.neighborhood}
          imageUrl={cafe.imageUrl}
          description={cafe.description}
          tags={cafe.tags}
          isHighlighted={cafe.id === selectedCafeId}
          mode={mode}
          onCardClick={onCardClick}
          onPinClick={onPinClick}
          rating={ratings?.[cafe.id]?.rating ?? null}
        />
      ))}
    </div>
  );
}
