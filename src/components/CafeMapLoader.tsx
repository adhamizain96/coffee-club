"use client";

import dynamic from "next/dynamic";
import type { CafeListItem } from "@/lib/types";
import type { RatingsMap } from "@/app/HomeContent";

const CafeMapInner = dynamic(() => import("./CafeMap"), {
  ssr: false,
  loading: () => (
    <div className="h-full w-full bg-stone-100 animate-pulse flex items-center justify-center">
      <span className="text-stone-400 text-sm">Loading map...</span>
    </div>
  ),
});

interface CafeMapLoaderProps {
  cafes: CafeListItem[];
  selectedCafeId: string | null;
  onMarkerClick: (cafeId: string) => void;
  panTarget: { lat: number; lng: number; zoom: number } | null;
  controlBarSlot?: React.ReactNode;
  ratings?: RatingsMap;
}

export default function CafeMapLoader({
  cafes,
  selectedCafeId,
  onMarkerClick,
  panTarget,
  controlBarSlot,
  ratings,
}: CafeMapLoaderProps) {
  return (
    <CafeMapInner
      cafes={cafes}
      selectedCafeId={selectedCafeId}
      onMarkerClick={onMarkerClick}
      panTarget={panTarget}
      controlBarSlot={controlBarSlot}
      ratings={ratings}
    />
  );
}
