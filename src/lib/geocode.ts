// Google Maps Geocoding API wrapper.
// Used by the admin approval flow (server-side) and scripts/geocode-cafes.ts.
//
// Reads NEXT_PUBLIC_GOOGLE_MAPS_API_KEY at call time. The key must be
// unrestricted or IP-restricted — referrer-only browser keys fail with
// REQUEST_DENIED when called from server contexts.

export interface GeocodeResult {
  lat: number;
  lng: number;
  formattedAddress: string;
  locationType: string;
  neighborhood: string | null;
}

interface GeocodeApiResponse {
  status: string;
  error_message?: string;
  results?: Array<{
    formatted_address: string;
    geometry: {
      location: { lat: number; lng: number };
      location_type: string;
    };
    address_components: Array<{
      long_name: string;
      short_name: string;
      types: string[];
    }>;
  }>;
}

// Priority order for neighborhood derivation. Picks the most specific match.
const NEIGHBORHOOD_TYPES = [
  "neighborhood",
  "sublocality_level_1",
  "sublocality",
  "locality",
] as const;

function pickNeighborhood(
  components: Array<{ long_name: string; types: string[] }>
): string | null {
  for (const type of NEIGHBORHOOD_TYPES) {
    const hit = components.find((c) => c.types.includes(type));
    if (hit) return hit.long_name;
  }
  return null;
}

/**
 * Geocode a free-form address.
 *
 * Returns null when the API responds with ZERO_RESULTS, so callers can return
 * a clean 422 to the user. Throws on any other failure (network, missing API
 * key, REQUEST_DENIED, OVER_QUERY_LIMIT, etc.) so callers surface a 500.
 */
export async function geocodeAddress(
  address: string
): Promise<GeocodeResult | null> {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  if (!apiKey) {
    throw new Error("NEXT_PUBLIC_GOOGLE_MAPS_API_KEY is not set");
  }

  const url =
    "https://maps.googleapis.com/maps/api/geocode/json?address=" +
    encodeURIComponent(address) +
    "&key=" +
    apiKey;

  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Geocoding API HTTP ${res.status}`);
  }

  const data = (await res.json()) as GeocodeApiResponse;

  if (data.status === "ZERO_RESULTS") {
    return null;
  }
  if (data.status !== "OK" || !data.results?.length) {
    const detail = data.error_message ? `: ${data.error_message}` : "";
    throw new Error(`Geocoding API ${data.status}${detail}`);
  }

  const r = data.results[0];
  return {
    lat: r.geometry.location.lat,
    lng: r.geometry.location.lng,
    formattedAddress: r.formatted_address,
    locationType: r.geometry.location_type,
    neighborhood: pickNeighborhood(r.address_components),
  };
}
