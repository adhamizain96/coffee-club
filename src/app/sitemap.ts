import type { MetadataRoute } from "next";
import { prisma } from "@/lib/prisma";
import { SITE_URL } from "@/lib/site";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const cafes = await prisma.cafe.findMany({ select: { slug: true } });
  return [
    { url: `${SITE_URL}/`, changeFrequency: "weekly", priority: 1 },
    { url: `${SITE_URL}/passport`, changeFrequency: "monthly", priority: 0.6 },
    { url: `${SITE_URL}/submit`, changeFrequency: "yearly", priority: 0.3 },
    ...cafes.map((c) => ({ url: `${SITE_URL}/cafes/${c.slug}`, changeFrequency: "monthly" as const, priority: 0.8 })),
  ];
}
