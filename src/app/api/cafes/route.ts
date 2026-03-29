import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const amenitiesParam = searchParams.get("amenities");
    const vibesParam = searchParams.get("vibes");

    const amenities = amenitiesParam
      ? amenitiesParam.split(",").filter(Boolean)
      : [];
    const vibes = vibesParam ? vibesParam.split(",").filter(Boolean) : [];

    // Build the where clause for filtering
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: any = {};

    if (amenities.length > 0 || vibes.length > 0) {
      where.AND = [];

      // Amenities: AND logic — cafe must have ALL selected amenity tags
      for (const amenity of amenities) {
        where.AND.push({
          tags: {
            some: {
              tag: { name: amenity, type: "AMENITY" },
            },
          },
        });
      }

      // Vibes: OR logic — cafe must have AT LEAST ONE selected vibe tag
      if (vibes.length > 0) {
        where.AND.push({
          tags: {
            some: {
              tag: { name: { in: vibes }, type: "VIBE" },
            },
          },
        });
      }
    }

    const cafes = await prisma.cafe.findMany({
      where,
      include: {
        tags: {
          include: {
            tag: true,
          },
        },
      },
      orderBy: { name: "asc" },
    });

    const result = cafes.map((cafe) => ({
      id: cafe.id,
      name: cafe.name,
      description: cafe.description,
      address: cafe.address,
      neighborhood: cafe.neighborhood,
      imageUrl: cafe.imageUrl,
      latitude: cafe.latitude,
      longitude: cafe.longitude,
      ownerReview: cafe.ownerReview,
      tags: cafe.tags.map((ct) => ({
        id: ct.tag.id,
        name: ct.tag.name,
        type: ct.tag.type,
      })),
    }));

    return Response.json(result);
  } catch (error) {
    console.error("GET /api/cafes error:", error);
    return Response.json(
      { error: "Failed to fetch cafes" },
      { status: 500 }
    );
  }
}
