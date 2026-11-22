"use client";

import CafeCard from "./CafeCard";
import type { CafeListItem } from "@/lib/types";

interface CafeListProps {
  cafes: CafeListItem[];
  selectedCafeId?: string | null;
  mode?: "pan" | "navigate";
  onCardClick?: (cafeId: string) => void;
  onPinClick?: (cafeId: string) => void;
}

export default function CafeList({
  cafes,
  selectedCafeId,
  mode,
  onCardClick,
  onPinClick,
}: CafeListProps) {
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
          id={cafe.id}
          slug={cafe.slug}
          name={cafe.name}
          neighborhood={cafe.neighborhood}
          imageUrl={cafe.imageUrl}
          status={cafe.status}
          isNew={cafe.isNew}
          hours={cafe.hours}
          description={cafe.description}
          tags={cafe.tags}
          isHighlighted={cafe.id === selectedCafeId}
          mode={mode}
          onCardClick={onCardClick}
          onPinClick={onPinClick}
        />
      ))}
    </div>
  );
}
