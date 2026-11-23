// Apply a reviewed list of removals (default: data/removals-2026-11-22.json):
// delete cafes (their CafeTag links and notes cascade), delete tags (their
// CafeTag links cascade), delete notes, and hide notes.
//
//   npx tsx scripts/apply-removals.ts                    # dry run (default)
//   npx tsx scripts/apply-removals.ts --apply            # writes, in one transaction
//   npx tsx scripts/apply-removals.ts --file <path>      # another removals file
//
// Every entry names the values the row must still have (cafe name, note
// content, ...). Any mismatch aborts before anything is written. Rows already
// gone are reported and skipped, so re-running is safe.
// Target: DATABASE_URL (direct/unpooled URL for production).

import "dotenv/config";
import * as fs from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

interface Removals {
  deleteCafes?: { slug: string; name: string; reason: string }[];
  deleteTags?: { name: string; reason: string }[];
  deleteNotes?: { id: string; content: string; authorName?: string | null; reason: string }[];
  hideNotes?: { id: string; content: string; reason: string }[];
}

const apply = process.argv.includes("--apply");
const fileIndex = process.argv.indexOf("--file");
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const file =
  fileIndex >= 0 ? path.resolve(process.argv[fileIndex + 1]) : path.join(__dirname, "..", "data", "removals-2026-11-22.json");

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error("DATABASE_URL is not set.");
  process.exit(1);
}
const target = new URL(connectionString);
console.log(`Target: ${target.hostname}:${target.port || "5432"}${target.pathname}  (${apply ? "APPLY" : "dry run"})`);
console.log(`File: ${path.relative(process.cwd(), file)}`);

const removals: Removals = JSON.parse(fs.readFileSync(file, "utf8"));
const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });

async function counts() {
  const [cafes, notes, cafeTags, tags, submissions] = await Promise.all([
    prisma.cafe.count(),
    prisma.note.count(),
    prisma.cafeTag.count(),
    prisma.tag.count(),
    prisma.cafeSubmission.count(),
  ]);
  return { cafes, notes, cafeTags, tags, submissions };
}

async function main() {
  const problems: string[] = [];
  const plan: string[] = [];
  const cafeIds: string[] = [];
  const tagIds: string[] = [];
  const deleteNoteIds: string[] = [];
  const hideNoteIds: string[] = [];

  for (const r of removals.deleteCafes ?? []) {
    const cafe = await prisma.cafe.findUnique({
      where: { slug: r.slug },
      select: { id: true, name: true, _count: { select: { notes: true, tags: true } } },
    });
    if (!cafe) { plan.push(`  cafe ${r.slug}: already gone`); continue; }
    if (cafe.name !== r.name) { problems.push(`cafe ${r.slug}: name is "${cafe.name}", expected "${r.name}"`); continue; }
    cafeIds.push(cafe.id);
    plan.push(`  delete cafe ${r.slug} (${cafe._count.tags} tag links, ${cafe._count.notes} notes cascade)`);
  }
  for (const r of removals.deleteTags ?? []) {
    const tag = await prisma.tag.findUnique({ where: { name: r.name }, select: { id: true, _count: { select: { cafes: true } } } });
    if (!tag) { plan.push(`  tag ${r.name}: already gone`); continue; }
    tagIds.push(tag.id);
    plan.push(`  delete tag ${r.name} (${tag._count.cafes} cafe links cascade)`);
  }
  for (const r of removals.deleteNotes ?? []) {
    const note = await prisma.note.findUnique({ where: { id: r.id }, select: { content: true, authorName: true } });
    if (!note) { plan.push(`  note ${r.id}: already gone`); continue; }
    if (note.content !== r.content) { problems.push(`note ${r.id}: content does not match`); continue; }
    if (r.authorName !== undefined && note.authorName !== r.authorName) { problems.push(`note ${r.id}: author does not match`); continue; }
    deleteNoteIds.push(r.id);
    plan.push(`  delete note ${r.id} ("${note.content.slice(0, 50)}")`);
  }
  for (const r of removals.hideNotes ?? []) {
    const note = await prisma.note.findUnique({ where: { id: r.id }, select: { content: true, hiddenAt: true } });
    if (!note) { plan.push(`  note ${r.id}: gone, nothing to hide`); continue; }
    if (note.content !== r.content) { problems.push(`note ${r.id}: content does not match`); continue; }
    if (note.hiddenAt) { plan.push(`  note ${r.id}: already hidden`); continue; }
    hideNoteIds.push(r.id);
    plan.push(`  hide note ${r.id} ("${note.content.slice(0, 50)}")`);
  }

  console.log(plan.join("\n"));
  if (problems.length) {
    console.error("\nAborted, nothing written. Guard mismatches:\n  " + problems.join("\n  "));
    process.exit(1);
  }
  const before = await counts();
  console.log(`\nBefore: ${JSON.stringify(before)}`);
  if (!apply) {
    console.log("Dry run: nothing written. Re-run with --apply to write.");
    return;
  }
  await prisma.$transaction(async (tx) => {
    if (cafeIds.length) await tx.cafe.deleteMany({ where: { id: { in: cafeIds } } });
    if (tagIds.length) await tx.tag.deleteMany({ where: { id: { in: tagIds } } });
    if (deleteNoteIds.length) await tx.note.deleteMany({ where: { id: { in: deleteNoteIds } } });
    if (hideNoteIds.length) await tx.note.updateMany({ where: { id: { in: hideNoteIds }, hiddenAt: null }, data: { hiddenAt: new Date() } });
  });
  console.log(`After:  ${JSON.stringify(await counts())}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
