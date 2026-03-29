/**
 * Fetches Google Places data (rating, reviews) for a cafe.
 * Uses the Places API (New) — Text Search to find the place, then Place Details for reviews.
 */

export interface GoogleReview {
  authorName: string;
  rating: number;
  text: string;
  relativeTime: string;
  profilePhotoUrl?: string;
}

export interface GooglePlaceData {
  rating: number | null;
  userRatingTotal: number | null;
  reviews: GoogleReview[];
  placeId: string | null;
}

const API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? "";

/**
 * Search for a place by name + address, then fetch its details including reviews.
 * Results are cached in memory for the lifetime of the server process.
 */
const cache = new Map<string, { data: GooglePlaceData; ts: number }>();
const CACHE_TTL = 1000 * 60 * 60; // 1 hour

export async function getGooglePlaceData(
  cafeName: string,
  address: string
): Promise<GooglePlaceData> {
  const cacheKey = `${cafeName}|${address}`;
  const cached = cache.get(cacheKey);
  if (cached && Date.now() - cached.ts < CACHE_TTL) {
    return cached.data;
  }

  const empty: GooglePlaceData = { rating: null, userRatingTotal: null, reviews: [], placeId: null };

  if (!API_KEY) return empty;

  try {
    // Step 1: Text Search to find the place ID
    const searchUrl = `https://maps.googleapis.com/maps/api/place/findplacefromtext/json?input=${encodeURIComponent(
      `${cafeName} ${address}`
    )}&inputtype=textquery&fields=place_id&key=${API_KEY}`;

    const searchRes = await fetch(searchUrl, { next: { revalidate: 3600 } });
    const searchData = await searchRes.json();

    if (
      searchData.status !== "OK" ||
      !searchData.candidates?.length
    ) {
      cache.set(cacheKey, { data: empty, ts: Date.now() });
      return empty;
    }

    const placeId = searchData.candidates[0].place_id;

    // Step 2: Place Details for rating + reviews
    const detailsUrl = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=rating,user_ratings_total,reviews&key=${API_KEY}`;

    const detailsRes = await fetch(detailsUrl, { next: { revalidate: 3600 } });
    const detailsData = await detailsRes.json();

    if (detailsData.status !== "OK" || !detailsData.result) {
      cache.set(cacheKey, { data: { ...empty, placeId }, ts: Date.now() });
      return { ...empty, placeId };
    }

    const result = detailsData.result;
    const reviews: GoogleReview[] = (result.reviews ?? []).map(
      (r: {
        author_name?: string;
        rating?: number;
        text?: string;
        relative_time_description?: string;
        profile_photo_url?: string;
      }) => ({
        authorName: r.author_name ?? "Anonymous",
        rating: r.rating ?? 0,
        text: r.text ?? "",
        relativeTime: r.relative_time_description ?? "",
        profilePhotoUrl: r.profile_photo_url,
      })
    );

    const data: GooglePlaceData = {
      rating: result.rating ?? null,
      userRatingTotal: result.user_ratings_total ?? null,
      reviews,
      placeId,
    };

    cache.set(cacheKey, { data, ts: Date.now() });
    return data;
  } catch {
    cache.set(cacheKey, { data: empty, ts: Date.now() });
    return empty;
  }
}
