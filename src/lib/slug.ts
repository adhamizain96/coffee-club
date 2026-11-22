// Stable, human-readable cafe identifiers used in public URLs (/cafes/[slug]).
// Slugs never change once published: renaming a cafe does not regenerate it.

/** Shape of Prisma's default `cuid()` ids. A slug must never look like one,
 *  because old `/cafes/<cuid>` links are redirected by matching this shape. */
export const CUID_SHAPE = /^c[a-z0-9]{24}$/;

export const SLUG_SHAPE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

const COMBINING_MARKS = /[̀-ͯ]/g;
const APOSTROPHES = /['’]/g;

/** "Café La Fortuna" -> "cafe-la-fortuna"; "Gerry's Café" -> "gerrys-cafe". */
export function slugify(name: string): string {
  return name
    .normalize("NFKD")
    .replace(COMBINING_MARKS, "")
    .toLowerCase()
    .replace(APOSTROPHES, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function isValidSlug(slug: string): boolean {
  return SLUG_SHAPE.test(slug) && !CUID_SHAPE.test(slug);
}

/**
 * Returns `base`, or `base-2`, `base-3`, ... — the first candidate that is a
 * valid slug and not already taken.
 */
export async function uniqueSlug(
  base: string,
  isTaken: (candidate: string) => Promise<boolean> | boolean
): Promise<string> {
  const root = base || "cafe";
  for (let n = 1; ; n++) {
    const candidate = n === 1 ? root : `${root}-${n}`;
    if (!isValidSlug(candidate)) continue;
    if (!(await isTaken(candidate))) return candidate;
  }
}
