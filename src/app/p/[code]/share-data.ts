import { prisma } from "@/lib/prisma";
import { REGIONS } from "@/lib/regions";
import { decodeShareCode, totalStamps, type RegionCounts } from "@/lib/passport-share";

/** Region totals from the database, used to validate a share code. */
export async function loadShare(code: string) {
  const grouped = await prisma.cafe.groupBy({ by: ["region"], _count: { _all: true }, where: { slug: { not: null } } });
  const totals = Object.fromEntries(REGIONS.map((r) => [r, 0])) as RegionCounts;
  for (const g of grouped) if (g.region) totals[g.region] = g._count._all;
  const counts = decodeShareCode(code, totals);
  if (!counts) return null;
  const allCafes = REGIONS.reduce((s, r) => s + totals[r], 0);
  return { counts, totals, stamped: totalStamps(counts), allCafes, areas: REGIONS.filter((r) => counts[r] > 0).length };
}
