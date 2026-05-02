"use client";

import { useState, useCallback, useEffect } from "react";
import Link from "next/link";
import { Drawer } from "vaul";
import type { CafeListItem } from "@/lib/types";
import { useCafes } from "@/hooks/useCafes";
import FilterPanel from "@/components/FilterPanel";
import CafeList from "@/components/CafeList";
import CafeMapLoader from "@/components/CafeMapLoader";

interface HomeContentProps {
  cafes: CafeListItem[];
}

export type RatingsMap = Record<string, { rating: number | null; userRatingTotal: number | null }>;

const SNAP_POINTS: (number | string)[] = [0.15, 0.5, 0.92];

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
  const [snap, setSnap] = useState<number | string | null>(SNAP_POINTS[1]);

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
    const isDesktop =
      typeof window !== "undefined" &&
      window.matchMedia("(min-width: 1024px)").matches;

    if (isDesktop) {
      // Preserve desktop toggle-popup behavior.
      setSelectedCafeId((prev) => (prev === cafeId ? null : cafeId));
      return;
    }

    // Mobile: select the cafe and lift the sheet to half so the
    // (already auto-scrolled) card lands in view.
    setSelectedCafeId(cafeId);
    setSnap(SNAP_POINTS[1]);
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

  const handleMapClick = useCallback(() => {
    setSnap(SNAP_POINTS[0]);
  }, []);

  const handlePinClick = useCallback(
    (cafeId: string) => {
      const cafe = cafes.find((c) => c.id === cafeId);
      if (!cafe) return;
      setSelectedCafeId(cafeId);
      setPanTarget({ lat: cafe.latitude, lng: cafe.longitude, zoom: 15 });
      setSnap(SNAP_POINTS[0]);
    },
    [cafes]
  );

  const desktopFilterPanel = (
    <FilterPanel
      selectedAmenities={selectedAmenities}
      selectedVibes={selectedVibes}
      onAmenitiesChange={setSelectedAmenities}
      onVibesChange={setSelectedVibes}
    />
  );

  const filteredCount = filteredCafes.length;
  const filterActive = selectedAmenities.length > 0 || selectedVibes.length > 0;

  return (
    <div className="relative h-screen overflow-hidden">
      {/* Full-viewport map background */}
      <div className="absolute inset-0 z-0">
        <CafeMapLoader
          cafes={filteredCafes}
          selectedCafeId={selectedCafeId}
          onMarkerClick={handleMarkerClick}
          panTarget={panTarget}
          controlBarSlot={desktopFilterPanel}
          ratings={ratings}
          onMapClick={handleMapClick}
          mobileSheetSnap={snap}
        />
      </div>

      {/* ===== Mobile (below lg): floating header + bottom sheet ===== */}
      <div className="lg:hidden absolute top-3 left-3 right-3 z-30">
        <div className="max-w-md mx-auto flex items-center justify-between gap-2">
          <h1 className="inline-flex items-center gap-2 rounded-xl bg-white/95 backdrop-blur-md border border-stone-200/60 shadow-lg px-3.5 py-2 text-sm font-semibold tracking-tight text-stone-900">
            <span className="flex items-center justify-center h-5 w-5 rounded-md bg-amber-100 shrink-0">
              <svg className="h-3 w-3 text-amber-700" viewBox="0 0 24 24" fill="currentColor">
                <path d="M2 21V17H4V10C4 7.83 4.87 5.93 6.26 4.57L7.67 5.98C6.63 7 6 8.42 6 10V17H11V3H13V7H18C19.1 7 20 7.9 20 9V12C20 13.1 19.1 14 18 14H13V17H18V21H2ZM13 12H18V9H13V12Z" />
              </svg>
            </span>
            Coffee Club
          </h1>
          <Link
            href="/submit"
            className="inline-flex items-center gap-1 rounded-xl bg-amber-600 hover:bg-amber-700 text-white shadow-lg px-3 py-2 text-sm font-medium transition-colors"
            aria-label="Suggest a cafe"
          >
            <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            Suggest
          </Link>
          <FilterPanel
            selectedAmenities={selectedAmenities}
            selectedVibes={selectedVibes}
            onAmenitiesChange={setSelectedAmenities}
            onVibesChange={setSelectedVibes}
            dropdownAlign="right"
          />
        </div>
      </div>

      <div className="lg:hidden">
        <Drawer.Root
          open
          modal={false}
          dismissible={false}
          snapPoints={SNAP_POINTS}
          activeSnapPoint={snap}
          setActiveSnapPoint={setSnap}
        >
          <Drawer.Portal>
            <Drawer.Content
              data-vaul-no-drag-on-content
              className="fixed inset-x-0 bottom-0 z-20 flex flex-col rounded-t-2xl bg-white border-t border-stone-200/60 shadow-2xl h-full max-h-[100svh] focus:outline-none lg:hidden"
            >
              <Drawer.Handle className="mx-auto mt-2 mb-1 h-1.5 w-10 shrink-0 rounded-full bg-stone-300" />
              <div className="px-5 pt-1 pb-3 shrink-0 flex items-center justify-between">
                <Drawer.Title className="text-xs font-medium text-stone-500 uppercase tracking-wide">
                  {filteredCount} {filteredCount === 1 ? "cafe" : "cafes"}
                </Drawer.Title>
                {filterActive && (
                  <span className="text-[10px] font-medium text-amber-700 bg-amber-50 rounded-full px-2 py-0.5">
                    Filtered
                  </span>
                )}
              </div>
              <Drawer.Description className="sr-only">
                List of {filteredCount} curated cafes. Drag the handle to expand or collapse.
              </Drawer.Description>
              <div className="flex-1 overflow-y-auto px-4 pb-6">
                <CafeList
                  cafes={filteredCafes}
                  selectedCafeId={selectedCafeId}
                  mode="navigate"
                  onPinClick={handlePinClick}
                  ratings={ratings}
                />
              </div>
            </Drawer.Content>
          </Drawer.Portal>
        </Drawer.Root>
      </div>

      {/* ===== Desktop (lg+): right-anchored side panel — preserved ===== */}
      <div className="hidden lg:block absolute z-10 top-3 right-3 bottom-3 w-[380px]">
        <div className="h-full bg-white/95 backdrop-blur-md rounded-2xl border border-stone-200/60 shadow-2xl overflow-hidden flex flex-col">
          {/* Panel header */}
          <div className="px-5 pt-4 pb-3 shrink-0">
            <div className="flex items-center gap-2.5 mb-1">
              <div className="flex items-center justify-center h-8 w-8 rounded-lg bg-amber-100">
                <svg className="h-4 w-4 text-amber-700" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M2 21V17H4V10C4 7.83 4.87 5.93 6.26 4.57L7.67 5.98C6.63 7 6 8.42 6 10V17H11V3H13V7H18C19.1 7 20 7.9 20 9V12C20 13.1 19.1 14 18 14H13V17H18V21H2ZM13 12H18V9H13V12Z" />
                </svg>
              </div>
              <div>
                <h1 className="font-serif text-base font-bold tracking-tight text-stone-900">
                  Coffee Club
                </h1>
                <p className="text-xs text-stone-400 leading-tight">
                  Curated by Zain. Suggested by you.
                </p>
                <Link
                  href="/submit"
                  className="inline-block mt-1 text-xs font-medium text-amber-700 hover:text-amber-800 transition-colors"
                >
                  Suggest a cafe →
                </Link>
              </div>
            </div>
            <div className="flex items-center justify-between mt-3 pt-3 border-t border-stone-100">
              <span className="text-xs font-medium text-stone-500 uppercase tracking-wide">
                {filteredCount} {filteredCount === 1 ? "cafe" : "cafes"}
              </span>
              {filterActive && (
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
              mode="pan"
              onCardClick={handleCardClick}
              ratings={ratings}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
