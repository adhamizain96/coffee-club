import { prisma } from "@/lib/prisma";
import type { CafeListItem } from "@/lib/types";
import HomeContent from "./HomeContent";
import { isNewCafe, normalizeStatus } from "@/lib/freshness";
import { parseWeeklyHours } from "@/lib/hours";
import { RETIRED_TAG_NAMES } from "@/lib/tag-display";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const cafes = await prisma.cafe.findMany({
    include: {
      tags: {
        include: { tag: true },
      },
    },
    orderBy: { name: "asc" },
  });

  const now = new Date();
  const cafeList: CafeListItem[] = cafes.map((cafe) => ({
    status: normalizeStatus(cafe.status),
    region: cafe.region,
    hours: normalizeStatus(cafe.status) === "OPEN" ? parseWeeklyHours(cafe.hours) : null,
    isNew: isNewCafe(cafe.createdAt, now),
    id: cafe.id,
    slug: cafe.slug,
    name: cafe.name,
    description: cafe.description,
    neighborhood: cafe.neighborhood,
    imageUrl: cafe.imageUrl,
    latitude: cafe.latitude,
    longitude: cafe.longitude,
    tags: cafe.tags.filter((ct) => !RETIRED_TAG_NAMES.has(ct.tag.name)).map((ct) => ({
      id: ct.tag.id,
      name: ct.tag.name,
      type: ct.tag.type,
    })),
  }));

  return <HomeContent cafes={cafeList} />;
}
