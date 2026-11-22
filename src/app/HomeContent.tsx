"use client";

import { useState, useCallback, useEffect, useMemo } from "react";
import Link from "next/link";
import { Drawer } from "vaul";
import type { CafeListItem } from "@/lib/types";
import { useCafes, type HoursFilter } from "@/hooks/useCafes";
import { useClientNow } from "@/hooks/useClientNow";
import type { RegionValue } from "@/lib/regions";
import FilterPanel from "@/components/FilterPanel";
import CafeList from "@/components/CafeList";
import CafeMapLoader from "@/components/CafeMapLoader";
import SearchBox from "@/components/SearchBox";
import { serializeHomeView, type HomeViewState } from "@/lib/home-filters";
import { distanceMiles, formatMiles, type LatLng } from "@/lib/geo";

interface HomeContentProps {
  cafes: CafeListItem[];
  /** Parsed from the URL on the server so a shared link opens the same view. */
  initialView: HomeViewState;
}

const SNAP_POINTS: (number | string)[] = [0.15, 0.5, 0.92];

export default function HomeContent({ cafes, initialView }: HomeContentProps) {
  const initialCafe = initialView.cafe ? cafes.find((c) => c.slug === initialView.cafe) ?? null : null;
  const [selectedAmenities, setSelectedAmenities] = useState<string[]>(initialView.amenities);
  const [selectedVibes, setSelectedVibes] = useState<string[]>(initialView.vibes);
  const [selectedHours, setSelectedHours] = useState<HoursFilter[]>(initialView.hours);
  const [selectedRegions, setSelectedRegions] = useState<RegionValue[]>(initialView.regions);
  const [query, setQuery] = useState(initialView.query);
  const [userLocation, setUserLocation] = useState<LatLng | null>(null);
  const now = useClientNow();
  const [selectedCafeId, setSelectedCafeId] = useState<string | null>(initialCafe?.id ?? null);
  const [panTarget, setPanTarget] = useState<{
    lat: number;
    lng: number;
    zoom: number;
  } | null>(initialCafe ? { lat: initialCafe.latitude, lng: initialCafe.longitude, zoom: 15 } : null);
  const [snap, setSnap] = useState<number | string | null>(SNAP_POINTS[1]);

  const filteredCafes = useCafes({
    cafes,
    selectedAmenities,
    selectedVibes,
    selectedHours,
    selectedRegions,
    query,
    origin: userLocation,
    now,
  });

  // Keep the URL in sync so the current view can be shared. replaceState (not
  // push) so filter toggles don't flood the back button.
  const selectedSlug = cafes.find((c) => c.id === selectedCafeId)?.slug ?? null;
  useEffect(() => {
    const qs = serializeHomeView({
      amenities: selectedAmenities,
      vibes: selectedVibes,
      hours: selectedHours,
      regions: selectedRegions,
      query,
      cafe: selectedSlug,
    });
    const next = window.location.pathname + qs;
    if (next !== window.location.pathname + window.location.search) {
      window.history.replaceState(null, "", next);
    }
  }, [selectedAmenities, selectedVibes, selectedHours, selectedRegions, query, selectedSlug]);

  const distanceLabels = useMemo(() => {
    if (!userLocation) return undefined;
    return Object.fromEntries(
      filteredCafes.map((c) => [c.id, formatMiles(distanceMiles(userLocation, { lat: c.latitude, lng: c.longitude }))])
    );
  }, [filteredCafes, userLocation]);

  const clearAll = useCallback(() => {
    setSelectedAmenities([]);
    setSelectedVibes([]);
    setSelectedHours([]);
    setSelectedRegions([]);
    setQuery("");
  }, []);

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
      selectedHours={selectedHours}
      onHoursChange={setSelectedHours}
      selectedRegions={selectedRegions}
      onRegionsChange={setSelectedRegions}
    />
  );

  const filteredCount = filteredCafes.length;
  const filterActive = selectedAmenities.length > 0 || selectedVibes.length > 0 || selectedHours.length > 0 || selectedRegions.length > 0 || query.trim().length > 0;
  const hoursUnknownCount =
    selectedHours.length > 0 ? cafes.filter((c) => c.status === "OPEN" && !c.hours).length : 0;
  const hoursNote =
    hoursUnknownCount > 0
      ? `${hoursUnknownCount} ${hoursUnknownCount === 1 ? "cafe has" : "cafes have"} no listed hours and ${hoursUnknownCount === 1 ? "isn't" : "aren't"} included.`
      : null;

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
          onMapClick={handleMapClick}
          mobileSheetSnap={snap}
          onUserLocation={setUserLocation}
        />
      </div>

      {/* ===== Mobile (below lg): floating header + bottom sheet ===== */}
      <div className="lg:hidden absolute top-3 left-3 right-3 z-30">
        <div className="max-w-md mx-auto flex items-center justify-between gap-2">
          <h1 className="inline-flex items-center gap-2 whitespace-nowrap rounded-xl bg-white/95 backdrop-blur-md border border-stone-200/60 shadow-lg px-3.5 py-2 text-sm font-semibold tracking-tight text-stone-900">
            <span className="flex items-center justify-center h-5 w-5 rounded-md bg-amber-100 shrink-0">
              <svg className="h-3 w-3 text-amber-700" viewBox="0 0 24 24" fill="currentColor">
                <path d="M2 21V17H4V10C4 7.83 4.87 5.93 6.26 4.57L7.67 5.98C6.63 7 6 8.42 6 10V17H11V3H13V7H18C19.1 7 20 7.9 20 9V12C20 13.1 19.1 14 18 14H13V17H18V21H2ZM13 12H18V9H13V12Z" />
              </svg>
            </span>
            Coffee Club
          </h1>
          <Link
            href="/passport"
            aria-label="Your passport"
            className="ml-auto inline-flex items-center justify-center rounded-xl bg-white/95 backdrop-blur-md border border-stone-200/60 shadow-lg h-9 w-9 text-stone-700 hover:text-amber-700 transition-colors"
          >
            <svg aria-hidden="true" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><circle cx="12" cy="12" r="8.5" /><path d="M8.5 12.5l2.3 2.3 4.7-5" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </Link>
          <Link
            href="/submit"
            className="inline-flex items-center gap-1 rounded-xl bg-amber-600 hover:bg-amber-700 text-white shadow-lg px-3 py-2 text-sm font-medium transition-colors"
            aria-label="Suggest a cafe"
          >
            <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            <span className="hidden min-[400px]:inline">Suggest</span>
          </Link>
          <FilterPanel
            selectedAmenities={selectedAmenities}
            selectedVibes={selectedVibes}
            onAmenitiesChange={setSelectedAmenities}
            onVibesChange={setSelectedVibes}
            selectedHours={selectedHours}
            onHoursChange={setSelectedHours}
            selectedRegions={selectedRegions}
            onRegionsChange={setSelectedRegions}
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
              <div className="px-4 pb-3 shrink-0">
                <SearchBox id="search-mobile" value={query} onChange={setQuery} />
                {userLocation && <p className="mt-2 text-[11px] text-stone-500">Sorted by distance from you</p>}
              </div>
              <Drawer.Description className="sr-only">
                List of {filteredCount} curated cafes. Drag the handle to expand or collapse.
              </Drawer.Description>
              <div className="flex-1 overflow-y-auto px-4 pb-6">
                {hoursNote && <p className="mb-3 text-xs text-stone-500">{hoursNote}</p>}
                <CafeList
                  cafes={filteredCafes}
                  selectedCafeId={selectedCafeId}
                  mode="navigate"
                  onPinClick={handlePinClick}
                  distanceLabels={distanceLabels}
                  onClearFilters={filterActive ? clearAll : undefined}
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
                <h1 className="text-base font-bold tracking-tight text-stone-900">
                  Coffee Club
                </h1>
                <p className="text-xs text-stone-400 leading-tight">
                  Curated by Zain. Suggested by you.
                </p>
                <div className="mt-1 flex items-center gap-3">
                  <Link
                    href="/passport"
                    className="text-xs font-medium text-amber-700 hover:text-amber-800 transition-colors"
                  >
                    Your passport →
                  </Link>
                  <Link
                    href="/submit"
                    className="text-xs font-medium text-stone-500 hover:text-amber-800 transition-colors"
                  >
                    Suggest a cafe →
                  </Link>
                </div>
              </div>
            </div>
            <div className="flex items-center justify-between mt-3 pt-3 border-t border-stone-100">
              <span data-cafe-count aria-live="polite" className="text-xs font-medium text-stone-500 uppercase tracking-wide">
                {filteredCount} {filteredCount === 1 ? "cafe" : "cafes"}
              </span>
              {filterActive && (
                <span className="text-[10px] font-medium text-amber-700 bg-amber-50 rounded-full px-2 py-0.5">
                  Filtered
                </span>
              )}
            </div>
          </div>

          <div className="px-5 pb-3 shrink-0">
            <SearchBox id="search-desktop" value={query} onChange={setQuery} />
            {userLocation && <p className="mt-2 text-[11px] text-stone-500">Sorted by distance from you</p>}
          </div>

          {/* Scrollable cafe list */}
          <div className="flex-1 overflow-y-auto p-4">
            {hoursNote && <p className="mb-3 text-xs text-stone-500">{hoursNote}</p>}
            <CafeList
              cafes={filteredCafes}
              selectedCafeId={selectedCafeId}
              mode="pan"
              onCardClick={handleCardClick}
              distanceLabels={distanceLabels}
              onClearFilters={filterActive ? clearAll : undefined}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
