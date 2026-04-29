/**
 * Builds Coffee Club PWA install icons from a single inline SVG source.
 *
 * Outputs PNGs to public/icons/ — referenced by app/manifest.ts and
 * app/layout.tsx (apple-touch-icon).
 *
 * Run: node scripts/build-pwa-icons.mjs
 *
 * Re-run only when icon design changes. Generated PNGs are committed.
 */

import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const OUT_DIR = resolve(ROOT, "public/icons");

// Coffee Club brand: amber-700 canvas, cream coffee mug. Full-bleed amber so
// the same artwork doubles as a maskable icon (Android adaptive icons crop
// to the inner ~80% safe zone — the mug + steam sit well inside that).
const AMBER = "#b45309";
const CREAM = "#fef3c7";
const COFFEE = "#78350f";
const GLOW = "#fbbf24";

const SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <rect width="512" height="512" fill="${AMBER}"/>
  <circle cx="256" cy="280" r="160" fill="${GLOW}" opacity="0.08"/>
  <!-- Steam: 3 rising wisps -->
  <g stroke="${CREAM}" stroke-width="11" stroke-linecap="round" fill="none" opacity="0.85">
    <path d="M212 130 q 12 22 0 44 q -12 22 0 44"/>
    <path d="M256 110 q 12 22 0 44 q -12 22 0 44 q 12 22 0 44"/>
    <path d="M300 130 q 12 22 0 44 q -12 22 0 44"/>
  </g>
  <!-- Mug handle (drawn behind body) -->
  <path d="M362 300 q 56 0 56 50 q 0 50 -56 50" stroke="${CREAM}" stroke-width="22" stroke-linejoin="round" fill="none"/>
  <!-- Mug body with rounded bottom -->
  <path d="M146 282 L 146 340 a 60 60 0 0 0 60 60 L 306 400 a 60 60 0 0 0 60 -60 L 366 282 Z" fill="${CREAM}"/>
  <!-- Top rim -->
  <ellipse cx="256" cy="282" rx="110" ry="16" fill="${CREAM}"/>
  <!-- Coffee surface -->
  <ellipse cx="256" cy="282" rx="92" ry="11" fill="${COFFEE}"/>
</svg>`;

const targets = [
  { name: "icon-192.png", size: 192 },
  { name: "icon-512.png", size: 512 },
  { name: "icon-maskable-512.png", size: 512 },
  { name: "apple-icon-180.png", size: 180 },
];

await mkdir(OUT_DIR, { recursive: true });

for (const { name, size } of targets) {
  const out = resolve(OUT_DIR, name);
  await sharp(Buffer.from(SVG))
    .resize(size, size)
    .png({ compressionLevel: 9 })
    .toFile(out);
  console.log(`✓ ${name} (${size}×${size})`);
}

await writeFile(resolve(OUT_DIR, "icon.svg"), SVG, "utf8");
console.log("✓ icon.svg (source)");
