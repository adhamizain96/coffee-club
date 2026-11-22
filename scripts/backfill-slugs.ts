// Backfill Cafe.slug for rows where it is null.
//
//   npx tsx scripts/backfill-slugs.ts            # dry run (default): prints the plan, writes nothing
//   npx tsx scripts/backfill-slugs.ts --apply    # writes, in one transaction
//
// Target: DATABASE_URL (use the direct/unpooled URL for production).
// Slugs come from prisma/seed.ts when a cafe's name matches a seed entry, so
// production and local slugs agree. Otherwise slugify(name), made unique.
// Idempotent: only rows with slug IS NULL are touched.

import "dotenv/config";
import * as fs from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { slugify, uniqueSlug, isValidSlug } from "../src/lib/slug";

const apply = process.argv.includes("--apply");
const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error("DATABASE_URL is not set.");
  process.exit(1);
}
const target = new URL(connectionString);
console.log(`Target: ${target.hostname}:${target.port || "5432"}${target.pathname}  (${apply ? "APPLY" : "dry run"})`);

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const seedSrc = fs.readFileSync(path.join(__dirname, "..", "prisma", "seed.ts"), "utf8");
const seedSlugByName = new Map<string, string>();
for (const m of seedSrc.matchAll(/\n\s+name:\s*"([^"]+)",\s*\n\s+slug:\s*"([^"]+)",/g)) {
  seedSlugByName.set(m[1], m[2]);
}

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });

async function main() {
  const all = await prisma.cafe.findMany({ select: { id: true, name: true, slug: true }, orderBy: { createdAt: "asc" } });
  const taken = new Set(all.map((c) => c.slug).filter((s): s is string => !!s));
  const pending = all.filter((c) => !c.slug);
  const plan: { id: string; name: string; slug: string; source: string }[] = [];

  for (const cafe of pending) {
    const fromSeed = seedSlugByName.get(cafe.name);
    const base = fromSeed && isValidSlug(fromSeed) ? fromSeed : slugify(cafe.name);
    const slug = await uniqueSlug(base, (s) => taken.has(s));
    taken.add(slug);
    plan.push({ id: cafe.id, name: cafe.name, slug, source: fromSeed && slug === fromSeed ? "seed" : "slugify" });
  }

  console.log(`${all.length} cafes, ${pending.length} without a slug.`);
  for (const p of plan) console.log(`  ${p.id}  ${p.slug.padEnd(40)} ${p.source.padEnd(8)} ${p.name}`);

  if (!apply) {
    console.log("\nDry run: nothing written. Re-run with --apply to write.");
    return;
  }
  await prisma.$transaction(
    plan.map((p) => prisma.cafe.updateMany({ where: { id: p.id, slug: null }, data: { slug: p.slug } }))
  );
  const remaining = await prisma.cafe.count({ where: { slug: null } });
  console.log(`\nApplied ${plan.length} slugs. Cafes still without a slug: ${remaining}.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
