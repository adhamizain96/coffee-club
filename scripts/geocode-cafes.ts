// One-off geocoder for prisma/seed.ts.
//
// Reads each cafe entry from prisma/seed.ts, geocodes the address against the
// Google Maps Geocoding API, prints a delta table (in meters), and rewrites
// the latitude/longitude lines in place.
//
// Run from the project root:
//   npx tsx scripts/geocode-cafes.ts            # geocode + write
//   npx tsx scripts/geocode-cafes.ts --check    # geocode + report only (no write)
//
// Requires NEXT_PUBLIC_GOOGLE_MAPS_API_KEY in .env (must be unrestricted or
// allow server IPs — referrer-only browser keys will fail with REQUEST_DENIED).

import "dotenv/config";
import * as fs from "node:fs/promises";
import * as path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
if (!apiKey) {
  console.error("NEXT_PUBLIC_GOOGLE_MAPS_API_KEY missing in .env");
  process.exit(1);
}

const checkOnly = process.argv.includes("--check");
const seedPath = path.join(__dirname, "..", "prisma", "seed.ts");

interface ParsedCafe {
  name: string;
  address: string;
  oldLat: number;
  oldLng: number;
}

interface GeocodeResult extends ParsedCafe {
  newLat: number;
  newLng: number;
  deltaMeters: number;
  locationType: string;
  formattedAddress: string;
}

function haversineMeters(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6_371_000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

function parseCafes(src: string): ParsedCafe[] {
  // Each cafe in the array has a consistent structure. We anchor on `address`
  // (unique per entry) and capture the latitude/longitude immediately after.
  const re =
    /name:\s*"([^"]+)",[\s\S]*?address:\s*"([^"]+)",[\s\S]*?latitude:\s*(-?\d+\.?\d*),\s*\n?\s*longitude:\s*(-?\d+\.?\d*)/g;
  const out: ParsedCafe[] = [];
  for (const m of src.matchAll(re)) {
    out.push({
      name: m[1],
      address: m[2],
      oldLat: parseFloat(m[3]),
      oldLng: parseFloat(m[4]),
    });
  }
  return out;
}

async function geocode(address: string): Promise<{
  lat: number;
  lng: number;
  locationType: string;
  formattedAddress: string;
}> {
  const url =
    "https://maps.googleapis.com/maps/api/geocode/json?address=" +
    encodeURIComponent(address) +
    "&key=" +
    apiKey;
  const res = await fetch(url);
  const data = (await res.json()) as {
    status: string;
    error_message?: string;
    results?: Array<{
      formatted_address: string;
      geometry: {
        location: { lat: number; lng: number };
        location_type: string;
      };
    }>;
  };
  if (data.status !== "OK" || !data.results?.length) {
    throw new Error(`${data.status}${data.error_message ? ": " + data.error_message : ""}`);
  }
  const r = data.results[0];
  return {
    lat: r.geometry.location.lat,
    lng: r.geometry.location.lng,
    locationType: r.geometry.location_type,
    formattedAddress: r.formatted_address,
  };
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function patchSeed(src: string, results: GeocodeResult[]): string {
  let updated = src;
  const failures: string[] = [];
  for (const r of results) {
    const escAddr = escapeRegex(r.address);
    const re = new RegExp(
      `(address:\\s*"${escAddr}",[\\s\\S]*?latitude:\\s*)-?\\d+\\.?\\d*(\\s*,\\s*\\n?\\s*longitude:\\s*)-?\\d+\\.?\\d*`
    );
    const before = updated;
    updated = updated.replace(re, `$1${r.newLat}$2${r.newLng}`);
    if (updated === before) failures.push(r.name);
  }
  if (failures.length) {
    console.warn(`\nWARNING: could not patch ${failures.length} cafe(s):`);
    for (const n of failures) console.warn("  " + n);
  }
  return updated;
}

async function main() {
  const src = await fs.readFile(seedPath, "utf8");
  const cafes = parseCafes(src);
  console.log(`Parsed ${cafes.length} cafes from ${path.relative(process.cwd(), seedPath)}\n`);

  const results: GeocodeResult[] = [];
  for (const cafe of cafes) {
    process.stdout.write(`  ${cafe.name.padEnd(36)} ... `);
    try {
      const g = await geocode(cafe.address);
      const deltaMeters = haversineMeters(cafe.oldLat, cafe.oldLng, g.lat, g.lng);
      results.push({
        ...cafe,
        newLat: g.lat,
        newLng: g.lng,
        deltaMeters,
        locationType: g.locationType,
        formattedAddress: g.formattedAddress,
      });
      console.log(
        `${g.lat.toFixed(6)}, ${g.lng.toFixed(6)}  (${deltaMeters.toFixed(0)}m, ${g.locationType})`
      );
    } catch (err) {
      console.log(`FAILED: ${(err as Error).message}`);
    }
    // tiny delay — Google rate limit is 50 QPS but politeness costs little
    await new Promise((r) => setTimeout(r, 30));
  }

  // Sort by delta (largest first) so review-worthy cafes surface at the top
  const byDelta = [...results].sort((a, b) => b.deltaMeters - a.deltaMeters);

  console.log("\n=== Delta table (sorted by distance moved) ===");
  console.log(
    "Δ (m)".padStart(8) +
      "  " +
      "Name".padEnd(36) +
      "Old (lat, lng)".padEnd(26) +
      "New (lat, lng)".padEnd(26) +
      "Loc type"
  );
  for (const r of byDelta) {
    const flag = r.deltaMeters > 200 ? " ⚠️" : "";
    console.log(
      r.deltaMeters.toFixed(0).padStart(8) +
        "  " +
        r.name.padEnd(36) +
        `${r.oldLat.toFixed(4)}, ${r.oldLng.toFixed(4)}`.padEnd(26) +
        `${r.newLat.toFixed(4)}, ${r.newLng.toFixed(4)}`.padEnd(26) +
        r.locationType +
        flag
    );
  }

  const overThreshold = byDelta.filter((r) => r.deltaMeters > 200);
  if (overThreshold.length) {
    console.log(`\n${overThreshold.length} cafe(s) moved > 200m — review formatted_address:`);
    for (const r of overThreshold) {
      console.log(`  ${r.name}`);
      console.log(`    input:     ${r.address}`);
      console.log(`    formatted: ${r.formattedAddress}`);
    }
  }

  // Write updated seed (skipped in --check mode)
  if (checkOnly) {
    console.log("\n--check: skipping write. Re-run without --check to apply.");
    return;
  }
  const patched = patchSeed(src, results);
  if (patched !== src) {
    await fs.writeFile(seedPath, patched, "utf8");
    console.log(`\nWrote updated coordinates to ${path.relative(process.cwd(), seedPath)}`);
  } else {
    console.log("\nNo changes written.");
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
