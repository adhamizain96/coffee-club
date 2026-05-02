"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import {
  APIProvider,
  Map,
  AdvancedMarker,
  useMap,
} from "@vis.gl/react-google-maps";
import type { CafeListItem } from "@/lib/types";
import type { RatingsMap } from "@/app/HomeContent";
import { MarkerClusterer } from "@googlemaps/markerclusterer";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Convert a vaul snap value to a CSS length for use in `calc(...)`. */
function snapToCss(snap: number | string | null | undefined): string {
  if (typeof snap === "number") return `${snap * 100}svh`;
  if (typeof snap === "string") return snap;
  return "15svh"; // fallback to peek
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

/** Custom zoom controls */
function ZoomControls() {
  const map = useMap();
  return (
    <div className="inline-flex items-center rounded-xl bg-white/95 backdrop-blur-md border border-stone-200/60 shadow-lg overflow-hidden">
      <button
        type="button"
        onClick={() => map?.setZoom((map.getZoom() ?? 11) + 1)}
        className="px-2.5 py-2 text-stone-600 hover:bg-stone-50 hover:text-stone-900 transition-colors text-sm font-bold"
        aria-label="Zoom in"
      >
        +
      </button>
      <div className="w-px h-5 bg-stone-200" />
      <button
        type="button"
        onClick={() => map?.setZoom((map.getZoom() ?? 11) - 1)}
        className="px-2.5 py-2 text-stone-600 hover:bg-stone-50 hover:text-stone-900 transition-colors text-sm font-bold"
        aria-label="Zoom out"
      >
        &minus;
      </button>
    </div>
  );
}

/** Applies the current map type id to the Google map instance. */
function MapTypeSync({ isSatellite }: { isSatellite: boolean }) {
  const map = useMap();
  useEffect(() => {
    map?.setMapTypeId(isSatellite ? "satellite" : "roadmap");
  }, [map, isSatellite]);
  return null;
}

/** Desktop map type toggle — labelled pill */
function MapTypeToggle({
  isSatellite,
  onToggle,
}: {
  isSatellite: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={`inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-sm font-medium shadow-lg transition-all duration-200 ${
        isSatellite
          ? "bg-stone-900 text-white hover:bg-stone-800"
          : "bg-white/95 backdrop-blur-md text-stone-700 border border-stone-200/60 hover:bg-white"
      }`}
    >
      <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 6.75V15m6-6v8.25m.503 3.498 4.875-2.437c.381-.19.622-.58.622-1.006V4.82c0-.836-.88-1.38-1.628-1.006l-3.869 1.934c-.317.159-.69.159-1.006 0L9.503 3.252a1.125 1.125 0 0 0-1.006 0L3.622 5.689C3.24 5.88 3 6.27 3 6.695V19.18c0 .836.88 1.38 1.628 1.006l3.869-1.934c.317-.159.69-.159 1.006 0l4.994 2.497c.317.158.69.158 1.006 0Z" />
      </svg>
      {isSatellite ? "Map" : "Satellite"}
    </button>
  );
}

/** Pans / zooms the map when a cafe is selected from the list panel */
function MapController({
  target,
}: {
  target: { lat: number; lng: number; zoom: number } | null;
}) {
  const map = useMap();
  const prevTarget = useRef<typeof target>(null);

  useEffect(() => {
    if (!map || !target) return;
    if (
      prevTarget.current &&
      prevTarget.current.lat === target.lat &&
      prevTarget.current.lng === target.lng &&
      prevTarget.current.zoom === target.zoom
    )
      return;

    map.panTo({ lat: target.lat, lng: target.lng });
    map.setZoom(target.zoom);
    prevTarget.current = target;
  }, [map, target]);

  return null;
}

/** Custom coffee-coloured pin SVG */
function CafePin({ highlighted }: { highlighted?: boolean }) {
  const size = highlighted ? 40 : 30;

  return (
    <div
      className={`transition-transform duration-200 motion-reduce:transition-none ${
        highlighted ? "scale-110 -translate-y-1" : ""
      }`}
      style={{ filter: highlighted ? "drop-shadow(0 4px 8px rgba(180,83,9,0.35))" : "drop-shadow(0 2px 4px rgba(0,0,0,0.2))" }}
    >
      <svg
        width={size}
        height={size * 1.4}
        viewBox="0 0 24 34"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M12 0C5.4 0 0 5.4 0 12c0 9 12 22 12 22s12-13 12-22C24 5.4 18.6 0 12 0z"
          fill={highlighted ? "#92400e" : "#d97706"}
        />
        <circle cx="12" cy="11" r="5.5" fill="white" />
        {/* Coffee cup icon */}
        <path
          d="M8.5 9.5h5v3.5c0 1.1-.9 2-2 2h-1c-1.1 0-2-.9-2-2v-3.5zm5 1h1c.55 0 1 .45 1 1s-.45 1-1 1h-1v-2z"
          fill={highlighted ? "#92400e" : "#d97706"}
        />
      </svg>
    </div>
  );
}

/** Blue dot for user's location */
function UserLocationMarker({ position }: { position: google.maps.LatLngLiteral }) {
  return (
    <AdvancedMarker position={position} zIndex={999}>
      <div className="relative flex items-center justify-center">
        <span className="absolute inline-flex h-6 w-6 rounded-full bg-blue-400 opacity-30 animate-ping" />
        <span className="relative inline-flex h-3.5 w-3.5 rounded-full bg-blue-500 border-2 border-white shadow-lg" />
      </div>
    </AdvancedMarker>
  );
}

// ---------------------------------------------------------------------------
// Clustered markers
// ---------------------------------------------------------------------------

function ClusteredMarkers({
  cafes,
  selectedCafeId,
  onMarkerClick,
  infoCafe,
  onInfoClose,
  ratings,
}: {
  cafes: CafeListItem[];
  selectedCafeId: string | null;
  onMarkerClick: (cafe: CafeListItem) => void;
  infoCafe: CafeListItem | null;
  onInfoClose: () => void;
  ratings?: RatingsMap;
}) {
  const map = useMap();
  const clustererRef = useRef<MarkerClusterer | null>(null);
  const markersRef = useRef<Map<string, google.maps.marker.AdvancedMarkerElement>>(
    new globalThis.Map()
  );

  useEffect(() => {
    if (!map) return;
    if (!clustererRef.current) {
      clustererRef.current = new MarkerClusterer({ map, markers: [] });
    }
    return () => {
      clustererRef.current?.clearMarkers();
      clustererRef.current = null;
    };
  }, [map]);

  useEffect(() => {
    if (!clustererRef.current) return;
    const currentIds = new Set(cafes.map((c) => c.id));
    for (const [id, marker] of markersRef.current) {
      if (!currentIds.has(id)) {
        clustererRef.current.removeMarker(marker);
        markersRef.current.delete(id);
      }
    }
  }, [cafes]);

  const setMarkerRef = useCallback(
    (marker: google.maps.marker.AdvancedMarkerElement | null, id: string) => {
      if (!clustererRef.current) return;
      if (marker) {
        if (!markersRef.current.has(id)) {
          markersRef.current.set(id, marker);
          clustererRef.current.addMarker(marker);
        }
      } else {
        const existing = markersRef.current.get(id);
        if (existing) {
          clustererRef.current.removeMarker(existing);
          markersRef.current.delete(id);
        }
      }
    },
    []
  );

  return (
    <>
      {cafes.map((cafe) => (
        <AdvancedMarker
          key={cafe.id}
          position={{ lat: cafe.latitude, lng: cafe.longitude }}
          ref={(marker) => setMarkerRef(marker, cafe.id)}
          onClick={() => onMarkerClick(cafe)}
          zIndex={cafe.id === selectedCafeId ? 100 : 1}
        >
          <CafePin highlighted={cafe.id === selectedCafeId} />
        </AdvancedMarker>
      ))}

      {infoCafe && (
        <AdvancedMarker
          position={{ lat: infoCafe.latitude, lng: infoCafe.longitude }}
          zIndex={200}
          style={{ transform: "translate(0, -60px)" }}
        >
          <div
            className="hidden lg:block w-[280px] rounded-2xl bg-white shadow-2xl border border-stone-200/60 overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close button */}
            <button
              type="button"
              onClick={onInfoClose}
              className="absolute top-2 right-2 z-10 h-7 w-7 flex items-center justify-center rounded-full bg-white/80 backdrop-blur-sm text-stone-500 hover:text-stone-900 hover:bg-white shadow-md transition-colors"
              aria-label="Close"
            >
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
              </svg>
            </button>

            {/* Image */}
            <div className="aspect-[16/10] overflow-hidden bg-stone-200">
              <img
                src={infoCafe.imageUrl}
                alt={infoCafe.name}
                className="h-full w-full object-cover"
              />
            </div>

            {/* Content — mirrors CafeCard */}
            <div className="p-3.5">
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-sm font-semibold text-stone-900 line-clamp-1 leading-tight">
                  {infoCafe.name}
                </h3>
                {ratings?.[infoCafe.id]?.rating != null && (
                  <span className="inline-flex items-center gap-1 shrink-0 text-xs font-medium text-amber-700 bg-amber-50 rounded-full px-2 py-0.5">
                    <svg className="h-3 w-3 text-amber-400" viewBox="0 0 20 20" fill="currentColor">
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                    {ratings[infoCafe.id].rating!.toFixed(1)}
                  </span>
                )}
              </div>

              <p className="text-xs text-stone-400 mt-0.5">{infoCafe.neighborhood}</p>

              {(() => {
                const vibes = infoCafe.tags.filter((t) => t.type === "VIBE").slice(0, 3);
                return vibes.length > 0 ? (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {vibes.map((v) => (
                      <span key={v.id} className="rounded-full bg-amber-100 text-amber-800 px-2 py-0.5 text-[10px] font-medium">
                        {v.name.replace("-", " ").replace(/\b\w/g, (c) => c.toUpperCase())}
                      </span>
                    ))}
                  </div>
                ) : null;
              })()}

              <a
                href={`/cafes/${infoCafe.id}`}
                className="inline-flex items-center gap-1 text-xs text-amber-700 hover:text-amber-900 font-semibold transition-colors mt-2.5"
              >
                View details
                <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                </svg>
              </a>
            </div>
          </div>
        </AdvancedMarker>
      )}
    </>
  );
}

// ---------------------------------------------------------------------------
// Main exported component
// ---------------------------------------------------------------------------

export interface CafeMapProps {
  cafes: CafeListItem[];
  selectedCafeId: string | null;
  onMarkerClick: (cafeId: string) => void;
  panTarget: { lat: number; lng: number; zoom: number } | null;
  /** Slot for the filter panel — rendered in the desktop top control bar alongside zoom/map-type */
  controlBarSlot?: React.ReactNode;
  ratings?: RatingsMap;
  /** Fired when the user taps the map background (no marker hit). */
  onMapClick?: () => void;
  /**
   * Active vaul sheet snap point on mobile (number 0–1 = svh fraction, string = px).
   * Drives the bottom offset of the mobile control cluster so it sits just above
   * the sheet's top edge at every snap.
   */
  mobileSheetSnap?: number | string | null;
}

export default function CafeMapInner({
  cafes,
  selectedCafeId,
  onMarkerClick,
  panTarget,
  controlBarSlot,
  ratings,
  onMapClick,
  mobileSheetSnap,
}: CafeMapProps) {
  const [infoCafe, setInfoCafe] = useState<CafeListItem | null>(null);
  const [userLocation, setUserLocation] = useState<google.maps.LatLngLiteral | null>(null);
  const [geoError, setGeoError] = useState<string | null>(null);
  const [locating, setLocating] = useState(false);
  const [isSatellite, setIsSatellite] = useState(false);

  const handleToggleSatellite = useCallback(() => {
    setIsSatellite((prev) => !prev);
  }, []);

  const handleMarkerClick = useCallback(
    (cafe: CafeListItem) => {
      setInfoCafe((prev) => (prev?.id === cafe.id ? null : cafe));
      onMarkerClick(cafe.id);
    },
    [onMarkerClick]
  );

  const handleNearMe = useCallback(() => {
    if (!navigator.geolocation) {
      setGeoError("Geolocation is not supported by your browser.");
      return;
    }
    setLocating(true);
    setGeoError(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setLocating(false);
      },
      (err) => {
        if (err.code === err.PERMISSION_DENIED) {
          setGeoError("Location access denied. Enable it in browser settings.");
        } else {
          setGeoError("Unable to determine your location.");
        }
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }, []);

  const [userPanTarget, setUserPanTarget] = useState<{
    lat: number;
    lng: number;
    zoom: number;
  } | null>(null);

  // Adjust userPanTarget when either source prop changes. Done during render
  // (with prev-value tracking) instead of in useEffect — React explicitly
  // sanctions this for "derive state from prop changes" cases, and avoids
  // the cascading-render hit that effect-driven setState produces.
  // https://react.dev/reference/react/useState#storing-information-from-previous-renders
  const [prevUserLocation, setPrevUserLocation] = useState(userLocation);
  if (userLocation !== prevUserLocation) {
    setPrevUserLocation(userLocation);
    if (userLocation) {
      setUserPanTarget({
        lat: userLocation.lat,
        lng: userLocation.lng,
        zoom: 14,
      });
    }
  }

  const [prevPanTarget, setPrevPanTarget] = useState(panTarget);
  if (panTarget !== prevPanTarget) {
    setPrevPanTarget(panTarget);
    if (panTarget) setUserPanTarget(null);
  }

  const effectivePanTarget = userPanTarget ?? panTarget;

  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? "";

  return (
    <APIProvider apiKey={apiKey}>
      <div className="relative h-full w-full">
        <Map
          defaultCenter={{ lat: 41.8781, lng: -87.6298 }}
          defaultZoom={11}
          mapId="coffee-club-map"
          gestureHandling="greedy"
          disableDefaultUI
          className="h-full w-full"
          onClick={onMapClick}
        >
          <MapController target={effectivePanTarget} />
          <MapTypeSync isSatellite={isSatellite} />
          <ClusteredMarkers
            cafes={cafes}
            selectedCafeId={selectedCafeId}
            onMarkerClick={handleMarkerClick}
            infoCafe={infoCafe}
            onInfoClose={() => setInfoCafe(null)}
            ratings={ratings}
          />
          {userLocation && <UserLocationMarker position={userLocation} />}
        </Map>

        {/* Desktop top control bar — filters, zoom, map type. Hidden below lg. */}
        <div className="absolute top-3 left-3 z-10 hidden lg:flex items-start gap-2">
          {controlBarSlot}
          <ZoomControls />
          <MapTypeToggle isSatellite={isSatellite} onToggle={handleToggleSatellite} />
        </div>

        {/* Desktop Near Me button — bottom center. Hidden below lg. */}
        <button
          type="button"
          onClick={handleNearMe}
          disabled={locating}
          className="absolute bottom-6 left-1/2 -translate-x-1/2 z-10 hidden lg:inline-flex items-center gap-2 rounded-xl bg-white/95 backdrop-blur-md border border-stone-200/60 px-4 py-2.5 text-sm font-medium text-stone-700 shadow-lg hover:bg-white hover:shadow-xl transition-all duration-200 disabled:opacity-50"
        >
          <svg
            className={`h-4 w-4 ${locating ? "animate-pulse text-blue-500" : "text-stone-500"}`}
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={2}
            stroke="currentColor"
          >
            <circle cx="12" cy="12" r="3" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 2v3m0 14v3m10-10h-3M5 12H2" />
          </svg>
          {locating ? "Locating..." : "Near Me"}
        </button>

        {/* Mobile floating control cluster — bottom-right, slides with the sheet edge. */}
        <div
          className="lg:hidden absolute right-3 z-10 flex flex-col gap-2 transition-[bottom] duration-300 ease-out motion-reduce:transition-none"
          style={{ bottom: `calc(${snapToCss(mobileSheetSnap)} + 12px)` }}
        >
          <button
            type="button"
            onClick={handleToggleSatellite}
            aria-pressed={isSatellite}
            aria-label={isSatellite ? "Show map view" : "Show satellite view"}
            className={`h-11 w-11 flex items-center justify-center rounded-xl shadow-lg transition-all duration-200 ${
              isSatellite
                ? "bg-stone-900 text-white hover:bg-stone-800"
                : "bg-white/95 backdrop-blur-md text-stone-700 border border-stone-200/60 hover:bg-white"
            }`}
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 6.75V15m6-6v8.25m.503 3.498 4.875-2.437c.381-.19.622-.58.622-1.006V4.82c0-.836-.88-1.38-1.628-1.006l-3.869 1.934c-.317.159-.69.159-1.006 0L9.503 3.252a1.125 1.125 0 0 0-1.006 0L3.622 5.689C3.24 5.88 3 6.27 3 6.695V19.18c0 .836.88 1.38 1.628 1.006l3.869-1.934c.317-.159.69-.159 1.006 0l4.994 2.497c.317.158.69.158 1.006 0Z" />
            </svg>
          </button>

          <button
            type="button"
            onClick={handleNearMe}
            disabled={locating}
            aria-label={locating ? "Locating" : "Show my location"}
            className="h-11 w-11 flex items-center justify-center rounded-xl bg-white/95 backdrop-blur-md border border-stone-200/60 text-stone-700 shadow-lg hover:bg-white hover:shadow-xl transition-all duration-200 disabled:opacity-50"
          >
            <svg
              className={`h-5 w-5 ${locating ? "animate-pulse text-blue-500" : "text-stone-600"}`}
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2}
              stroke="currentColor"
            >
              <circle cx="12" cy="12" r="3" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 2v3m0 14v3m10-10h-3M5 12H2" />
            </svg>
          </button>
        </div>

        {/* Geo error toast */}
        {geoError && (
          <div className="absolute bottom-20 left-1/2 -translate-x-1/2 z-10 max-w-xs rounded-xl bg-red-50/95 backdrop-blur-md border border-red-200/60 px-4 py-2.5 text-xs text-red-700 shadow-lg flex items-center gap-2">
            <span className="flex-1">{geoError}</span>
            <button
              type="button"
              onClick={() => setGeoError(null)}
              className="shrink-0 font-semibold hover:text-red-900 transition-colors"
            >
              Dismiss
            </button>
          </div>
        )}
      </div>
    </APIProvider>
  );
}
