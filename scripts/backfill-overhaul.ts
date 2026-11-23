// Backfill the overhaul fields on existing cafes:
//   - data/cafes-existing-updates.json (by slug): hours, website, status
//     (closures), and verified corrections to name, address, region,
//     description, ownerReview, imageUrl, and tags (`amenities` + `vibes`
//     together replace the cafe's tags).
//   - region for every cafe whose region is null, derived from its address.
//
//   npx tsx scripts/backfill-overhaul.ts            # dry run (default)
//   npx tsx scripts/backfill-overhaul.ts --apply    # writes, in one transaction
//
// Target: DATABASE_URL (direct/unpooled URL for production). Never deletes
// cafes, notes, submissions, or tags (only the CafeTag links a tag list
// replaces); idempotent.

import "dotenv/config";
import * as fs from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";
import { PrismaClient, Prisma } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { parseWeeklyHours } from "../src/lib/hours";
import { isRegion, regionForAddress, type RegionValue as Region } from "../src/lib/regions";

type Update = {
  status?: "OPEN" | "TEMPORARILY_CLOSED" | "CLOSED";
  name?: string;
  address?: string;
  neighborhood?: string;
  description?: string;
  ownerReview?: string;
  imageUrl?: string | null;
  region?: Region;
  amenities?: string[];
  vibes?: string[];
  latitude?: number;
  longitude?: number;
  website?: string | null;
  hours?: unknown;
  hoursSourceUrl?: string | null;
  hoursCheckedAt?: string | null;
};

const apply = process.argv.includes("--apply");
const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error("DATABASE_URL is not set.");
  process.exit(1);
}
const target = new URL(connectionString);
console.log(`Target: ${target.hostname}:${target.port || "5432"}${target.pathname}  (${apply ? "APPLY" : "dry run"})`);

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const updates: Record<string, Update> = JSON.parse(
  fs.readFileSync(path.join(__dirname, "..", "data", "cafes-existing-updates.json"), "utf8")
);

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });

async function main() {
  const cafes = await prisma.cafe.findMany({
    select: { id: true, slug: true, name: true, address: true, region: true, status: true, hours: true },
  });
  const bySlug = new Map(cafes.map((c) => [c.slug, c]));
  const missing = Object.keys(updates).filter((s) => !bySlug.has(s));
  if (missing.length) console.log(`Slugs in the updates file but not in the DB (skipped): ${missing.join(", ")}`);

  const tags = await prisma.tag.findMany({ select: { id: true, name: true } });
  const tagIdByName = new Map(tags.map((t) => [t.name, t.id]));

  const ops: { id: string; label: string; data: Prisma.CafeUpdateInput; tagIds?: string[] }[] = [];
  for (const [slug, u] of Object.entries(updates)) {
    const cafe = bySlug.get(slug);
    if (!cafe) continue;
    const data: Prisma.CafeUpdateInput = {};
    for (const key of ["status", "name", "address", "neighborhood", "description", "ownerReview", "imageUrl", "latitude", "longitude", "website", "hoursSourceUrl"] as const) {
      if (u[key] !== undefined) (data as Record<string, unknown>)[key] = u[key];
    }
    if (u.region !== undefined) {
      if (!isRegion(u.region)) throw new Error(`Bad region for ${slug}: ${u.region}`);
      data.region = u.region;
    }
    let tagIds: string[] | undefined;
    if (u.amenities !== undefined || u.vibes !== undefined) {
      const names = [...(u.amenities ?? []), ...(u.vibes ?? [])];
      const unknown = names.filter((n) => !tagIdByName.has(n));
      if (unknown.length) throw new Error(`Unknown tags for ${slug}: ${unknown.join(", ")}`);
      tagIds = names.map((n) => tagIdByName.get(n)!);
    }
    if (u.hours !== undefined) {
      const hours = u.hours === null ? null : parseWeeklyHours(u.hours);
      if (u.hours !== null && !hours) throw new Error(`Malformed hours for ${slug}`);
      data.hours = hours ? (hours as unknown as Prisma.InputJsonValue) : Prisma.DbNull;
      data.hoursCheckedAt = u.hoursCheckedAt ? new Date(`${u.hoursCheckedAt}T12:00:00Z`) : null;
    }
    const address = (u.address ?? cafe.address) as string;
    if (!cafe.region) {
      const region = regionForAddress(address);
      if (region) data.region = region;
    }
    const changes = [...Object.keys(data), ...(tagIds ? ["tags"] : [])];
    if (changes.length) ops.push({ id: cafe.id, label: `${slug}: ${changes.join(", ")}${u.status && u.status !== "OPEN" ? ` (${u.status})` : ""}`, data, tagIds });
  }
  // Region for cafes not in the updates file (e.g. admin-approved cafes).
  for (const cafe of cafes) {
    if (cafe.region || (cafe.slug && updates[cafe.slug])) continue;
    const region = regionForAddress(cafe.address);
    ops.push(
      region
        ? { id: cafe.id, label: `${cafe.slug}: region`, data: { region } }
        : { id: cafe.id, label: `${cafe.slug}: NO REGION for "${cafe.address}" (assign in admin)`, data: {} }
    );
  }

  const writes = ops.filter((o) => Object.keys(o.data).length || o.tagIds);
  console.log(`${cafes.length} cafes in DB; ${writes.length} to update.`);
  for (const o of ops) console.log(`  ${o.label}`);
  if (!apply) {
    console.log("\nDry run: nothing written. Re-run with --apply to write.");
    return;
  }
  await prisma.$transaction(
    async (tx) => {
      for (const o of writes) {
        if (Object.keys(o.data).length) await tx.cafe.update({ where: { id: o.id }, data: o.data });
        if (o.tagIds) {
          await tx.cafeTag.deleteMany({ where: { cafeId: o.id, tagId: { notIn: o.tagIds } } });
          await tx.cafeTag.createMany({ data: o.tagIds.map((tagId) => ({ cafeId: o.id, tagId })), skipDuplicates: true });
        }
      }
    },
    { timeout: 120_000 }
  );
  const noRegion = await prisma.cafe.count({ where: { region: null } });
  const withHours = await prisma.cafe.count({ where: { NOT: { hours: { equals: Prisma.DbNull } } } });
  const closed = await prisma.cafe.count({ where: { status: "CLOSED" } });
  console.log(`\nApplied. Cafes without region: ${noRegion}. With hours: ${withHours}. Closed: ${closed}.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
