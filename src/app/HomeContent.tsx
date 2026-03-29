"use client";

import { useState, useCallback, useEffect } from "react";
import type { CafeListItem } from "@/lib/types";
import { useCafes } from "@/hooks/useCafes";
import FilterPanel from "@/components/FilterPanel";
import CafeList from "@/components/CafeList";
import CafeMapLoader from "@/components/CafeMapLoader";

interface HomeContentProps {
  cafes: CafeListItem[];
}

export type RatingsMap = Record<string, { rating: number | null; userRatingTotal: number | null }>;

export default function HomeContent({ cafes }: HomeContentProps) {
  const [selectedAmenities, setSelectedAmenities] = useState<string[]>([]);
  const [selectedVibes, setSelectedVibes] = useState<string[]>([]);
  const [selectedCafeId, setSelectedCafeId] = useState<string | null>(null);
  const [panTarget, setPanTarget] = useState<{
    lat: number;
    lng: number;
    zoom: number;
  } | null>(null);
  const [ratings, setRatings] = useState<RatingsMap>({});

  // Fetch Google ratings for all cafes on mount
  useEffect(() => {
    fetch("/api/ratings")
      .then((res) => res.json())
      .then((data: RatingsMap) => setRatings(data))
      .catch(() => {});
  }, []);

  const filteredCafes = useCafes({
    cafes,
    selectedAmenities,
    selectedVibes,
  });

  const handleMarkerClick = useCallback((cafeId: string) => {
    setSelectedCafeId((prev) => (prev === cafeId ? null : cafeId));
  }, []);

  const handleCardClick = useCallback(
    (cafeId: string) => {
      const cafe = cafes.find((c) => c.id === cafeId);
      if (!cafe) return;
      setSelectedCafeId(cafeId);
      setPanTarget({ lat: cafe.latitude, lng: cafe.longitude, zoom: 15 });
    },
    [cafes]
  );

  const filterPanel = (
    <FilterPanel
      selectedAmenities={selectedAmenities}
      selectedVibes={selectedVibes}
      onAmenitiesChange={setSelectedAmenities}
      onVibesChange={setSelectedVibes}
    />
  );

  return (
    <div className="relative h-screen">
      {/* Full-viewport map background */}
      <div className="absolute inset-0 z-0">
        <CafeMapLoader
          cafes={filteredCafes}
          selectedCafeId={selectedCafeId}
          onMarkerClick={handleMarkerClick}
          panTarget={panTarget}
          controlBarSlot={filterPanel}
          ratings={ratings}
        />
      </div>

      {/* Overlay: Cafe list panel — right side on desktop, bottom on mobile */}
      <div className="absolute z-10 lg:top-3 lg:right-3 lg:bottom-3 lg:w-[380px] bottom-0 left-0 right-0 lg:left-auto max-h-[45vh] lg:max-h-none">
        <div className="h-full bg-white/95 backdrop-blur-md lg:rounded-2xl border border-stone-200/60 shadow-2xl overflow-hidden flex flex-col">
          {/* Panel header */}
          <div className="px-5 pt-4 pb-3 shrink-0">
            <div className="flex items-center gap-2.5 mb-1">
              <div className="flex items-center justify-center h-8 w-8 rounded-lg bg-amber-100">
                <svg className="h-4 w-4 text-amber-700" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M2 21V17H4V10C4 7.83 4.87 5.93 6.26 4.57L7.67 5.98C6.63 7 6 8.42 6 10V17H11V3H13V7H18C19.1 7 20 7.9 20 9V12C20 13.1 19.1 14 18 14H13V17H18V21H2ZM13 12H18V9H13V12Z" />
                </svg>
              </div>
              <div>
                <h1 className="text-base font-bold tracking-tight text-stone-900">
                  Coffee Club
                </h1>
                <p className="text-xs text-stone-400 leading-tight">
                  Chicagoland cafe discovery
                </p>
              </div>
            </div>
            <div className="flex items-center justify-between mt-3 pt-3 border-t border-stone-100">
              <span className="text-xs font-medium text-stone-500 uppercase tracking-wide">
                {filteredCafes.length}{" "}
                {filteredCafes.length === 1 ? "cafe" : "cafes"}
              </span>
              {(selectedAmenities.length > 0 || selectedVibes.length > 0) && (
                <span className="text-[10px] font-medium text-amber-700 bg-amber-50 rounded-full px-2 py-0.5">
                  Filtered
                </span>
              )}
            </div>
          </div>

          {/* Scrollable cafe list */}
          <div className="flex-1 overflow-y-auto p-4">
            <CafeList
              cafes={filteredCafes}
              selectedCafeId={selectedCafeId}
              onCardClick={handleCardClick}
              ratings={ratings}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
