import { prisma } from "@/lib/prisma";
import type { CafeListItem } from "@/lib/types";
import HomeContent from "./HomeContent";

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

  const cafeList: CafeListItem[] = cafes.map((cafe) => ({
    id: cafe.id,
    name: cafe.name,
    description: cafe.description,
    neighborhood: cafe.neighborhood,
    imageUrl: cafe.imageUrl,
    latitude: cafe.latitude,
    longitude: cafe.longitude,
    tags: cafe.tags.map((ct) => ({
      id: ct.tag.id,
      name: ct.tag.name,
      type: ct.tag.type,
    })),
  }));

  return <HomeContent cafes={cafeList} />;
}
