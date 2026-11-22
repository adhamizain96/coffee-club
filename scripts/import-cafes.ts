// Import researched cafes from data/cafes-new.json, upserting by slug.
//
//   npx tsx scripts/import-cafes.ts            # dry run (default): prints the plan and counts
//   npx tsx scripts/import-cafes.ts --apply    # writes, in one transaction
//
// Target: DATABASE_URL (direct/unpooled URL for production).
// Never deletes cafes, notes, or submissions. New cafes get status OPEN, no
// image (placeholder), no curator visit, and addedAt = now. Re-running updates
// the imported fields and tags of cafes whose slug is in the file.

import "dotenv/config";
import * as fs from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";
import { PrismaClient, Prisma, TagType } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { parseWeeklyHours } from "../src/lib/hours";
import { isRegion } from "../src/lib/regions";
import { isValidSlug } from "../src/lib/slug";

interface ImportCafe {
  name: string;
  slug: string;
  address: string;
  neighborhood: string;
  region: string;
  latitude: number;
  longitude: number;
  website: string | null;
  description: string;
  ownerReview: string;
  hours: unknown;
  hoursSourceUrl: string | null;
  hoursCheckedAt: string | null;
  amenities: string[];
  vibes: string[];
}

const apply = process.argv.includes("--apply");
const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error("DATABASE_URL is not set.");
  process.exit(1);
}
const target = new URL(connectionString);
console.log(`Target: ${target.hostname}:${target.port || "5432"}${target.pathname}  (${apply ? "APPLY" : "dry run"})`);

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const cafes: ImportCafe[] = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "cafes-new.json"), "utf8"));

// Validate the file before touching the database.
const problems: string[] = [];
const seen = new Set<string>();
for (const c of cafes) {
  if (!isValidSlug(c.slug)) problems.push(`${c.name}: bad slug ${c.slug}`);
  if (seen.has(c.slug)) problems.push(`${c.name}: duplicate slug ${c.slug}`);
  seen.add(c.slug);
  if (!isRegion(c.region)) problems.push(`${c.name}: bad region ${c.region}`);
  if (c.hours !== null && !parseWeeklyHours(c.hours)) problems.push(`${c.name}: malformed hours`);
  if (c.hours !== null && !c.hoursCheckedAt) problems.push(`${c.name}: hours without a checked date`);
  if (!Number.isFinite(c.latitude) || !Number.isFinite(c.longitude)) problems.push(`${c.name}: missing coordinates`);
}
if (problems.length) {
  console.error("data/cafes-new.json failed validation:\n  " + problems.join("\n  "));
  process.exit(1);
}

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });

async function main() {
  const allTagNames = Array.from(new Set(cafes.flatMap((c) => [...c.amenities, ...c.vibes])));
  const existingTags = await prisma.tag.findMany({ where: { name: { in: allTagNames } }, select: { id: true, name: true } });
  const missingTags = allTagNames.filter((n) => !existingTags.some((t) => t.name === n));
  const existingCafes = await prisma.cafe.findMany({ where: { slug: { in: cafes.map((c) => c.slug) } }, select: { slug: true } });
  const existingSlugs = new Set(existingCafes.map((c) => c.slug));
  const toCreate = cafes.filter((c) => !existingSlugs.has(c.slug));
  const toUpdate = cafes.filter((c) => existingSlugs.has(c.slug));

  const before = await prisma.cafe.count();
  console.log(`${cafes.length} cafes in file: ${toCreate.length} to create, ${toUpdate.length} to update. Cafes in DB now: ${before}.`);
  if (missingTags.length) console.log(`Tags missing from DB (will be created): ${missingTags.join(", ")}`);
  for (const c of toCreate) console.log(`  + ${c.slug.padEnd(44)} ${c.region.padEnd(9)} ${c.name}`);
  for (const c of toUpdate) console.log(`  ~ ${c.slug.padEnd(44)} ${c.region.padEnd(9)} ${c.name}`);

  if (!apply) {
    console.log(`\nDry run: nothing written. Expected cafe count after apply: ${before + toCreate.length}.`);
    return;
  }

  await prisma.$transaction(
    async (tx) => {
      const tagIds = new Map(existingTags.map((t) => [t.name, t.id]));
      for (const name of missingTags) {
        const type = cafes.some((c) => c.vibes.includes(name)) ? TagType.VIBE : TagType.AMENITY;
        const tag = await tx.tag.upsert({ where: { name }, update: {}, create: { name, type } });
        tagIds.set(name, tag.id);
      }
      const now = new Date();
      for (const c of cafes) {
        const hours = c.hours === null ? null : parseWeeklyHours(c.hours);
        const data = {
          name: c.name,
          address: c.address,
          neighborhood: c.neighborhood,
          region: c.region as "CITY" | "NORTH" | "NORTHWEST" | "WEST" | "SOUTH",
          latitude: c.latitude,
          longitude: c.longitude,
          website: c.website,
          description: c.description,
          ownerReview: c.ownerReview,
          hours: hours ? (hours as unknown as Prisma.InputJsonValue) : Prisma.DbNull,
          hoursSourceUrl: c.hoursSourceUrl,
          hoursCheckedAt: c.hoursCheckedAt ? new Date(`${c.hoursCheckedAt}T12:00:00Z`) : null,
        };
        const desired = [...c.amenities, ...c.vibes].map((n) => tagIds.get(n)!);
        if (!existingSlugs.has(c.slug)) {
          await tx.cafe.create({
            data: {
              ...data,
              slug: c.slug,
              status: "OPEN",
              imageUrl: null,
              addedAt: now,
              tags: { create: desired.map((tagId) => ({ tagId })) },
            },
          });
        } else {
          const cafe = await tx.cafe.update({ where: { slug: c.slug }, data, select: { id: true } });
          await tx.cafeTag.deleteMany({ where: { cafeId: cafe.id, tagId: { notIn: desired } } });
          await tx.cafeTag.createMany({ data: desired.map((tagId) => ({ cafeId: cafe.id, tagId })), skipDuplicates: true });
        }
      }
    },
    { timeout: 120_000 }
  );
  const after = await prisma.cafe.count();
  console.log(`\nApplied. Cafes in DB: ${before} -> ${after} (+${after - before}).`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
