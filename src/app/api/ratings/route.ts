import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getGooglePlaceData } from "@/lib/google-places";

export const dynamic = "force-dynamic";

/**
 * GET /api/ratings
 * Returns a map of cafeId → { rating, userRatingTotal } for all cafes.
 * Google Places data is cached in-memory (1 hour) by getGooglePlaceData.
 */
export async function GET() {
  const cafes = await prisma.cafe.findMany({
    select: { id: true, name: true, address: true },
  });

  const results = await Promise.all(
    cafes.map(async (cafe) => {
      const placeData = await getGooglePlaceData(cafe.name, cafe.address);
      return {
        id: cafe.id,
        rating: placeData.rating,
        userRatingTotal: placeData.userRatingTotal,
      };
    })
  );

  const ratingsMap: Record<string, { rating: number | null; userRatingTotal: number | null }> = {};
  for (const r of results) {
    ratingsMap[r.id] = { rating: r.rating, userRatingTotal: r.userRatingTotal };
  }

  return NextResponse.json(ratingsMap);
}
