// Shared validation for curator-entered cafe fields. Used by the submission
// approve route and the admin cafe create/edit routes so the rules can't drift.

import type { PrismaClient } from "@/generated/prisma/client";
import { DAY_KEYS, parseDayText, type WeeklyHours } from "@/lib/hours";

export const CAFE_LIMITS = {
  name: { min: 2, max: 100 },
  address: { min: 5, max: 200 },
  neighborhood: { min: 1, max: 100 },
  description: { min: 1, max: 2000 },
  ownerReview: { min: 1, max: 2000 },
} as const;

export interface CafeFields {
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  neighborhood: string;
  description: string;
  imageUrl: string | null;
  ownerReview: string;
  tagIds: string[];
}

export type CafeFieldErrors = Partial<Record<keyof CafeFields, string>>;

export function isValidHttpUrl(value: string): boolean {
  try {
    const u = new URL(value);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

function text(v: unknown): string {
  return typeof v === "string" ? v.trim() : "";
}

function finite(v: unknown): number {
  return typeof v === "number" && Number.isFinite(v) ? v : NaN;
}

/** Validates and normalizes the core cafe fields. Does not check tag existence. */
export function validateCafeFields(
  body: Partial<Record<keyof CafeFields, unknown>>
): { ok: true; data: CafeFields } | { ok: false; errors: CafeFieldErrors } {
  const errors: CafeFieldErrors = {};
  const L = CAFE_LIMITS;

  const name = text(body.name);
  if (name.length < L.name.min || name.length > L.name.max) {
    errors.name = `Name must be ${L.name.min}-${L.name.max} characters.`;
  }
  const address = text(body.address);
  if (address.length < L.address.min || address.length > L.address.max) {
    errors.address = `Address must be ${L.address.min}-${L.address.max} characters.`;
  }
  const latitude = finite(body.latitude);
  if (Number.isNaN(latitude) || latitude < -90 || latitude > 90) {
    errors.latitude = "Latitude must be a number between -90 and 90.";
  }
  const longitude = finite(body.longitude);
  if (Number.isNaN(longitude) || longitude < -180 || longitude > 180) {
    errors.longitude = "Longitude must be a number between -180 and 180.";
  }
  const neighborhood = text(body.neighborhood);
  if (neighborhood.length < L.neighborhood.min || neighborhood.length > L.neighborhood.max) {
    errors.neighborhood = `Neighborhood must be ${L.neighborhood.min}-${L.neighborhood.max} characters.`;
  }
  const description = text(body.description);
  if (description.length < L.description.min || description.length > L.description.max) {
    errors.description = `Description must be ${L.description.min}-${L.description.max} characters.`;
  }
  // Optional: empty means "no photo yet" (the UI shows a placeholder).
  const imageUrlText = text(body.imageUrl);
  const imageUrl = imageUrlText || null;
  if (imageUrlText && !isValidHttpUrl(imageUrlText)) {
    errors.imageUrl = "Image URL must be a valid http(s) URL.";
  }
  const ownerReview = text(body.ownerReview);
  if (ownerReview.length < L.ownerReview.min || ownerReview.length > L.ownerReview.max) {
    errors.ownerReview = `Owner review must be ${L.ownerReview.min}-${L.ownerReview.max} characters.`;
  }
  let tagIds: string[] = [];
  if (body.tagIds !== undefined && body.tagIds !== null) {
    if (!Array.isArray(body.tagIds) || !body.tagIds.every((t) => typeof t === "string")) {
      errors.tagIds = "Tags must be a list of tag IDs.";
    } else {
      tagIds = Array.from(new Set(body.tagIds as string[]));
    }
  }

  if (Object.keys(errors).length > 0) return { ok: false, errors };
  return {
    ok: true,
    data: { name, address, latitude, longitude, neighborhood, description, imageUrl, ownerReview, tagIds },
  };
}

/** True when every id exists in the tags table. */
export async function allTagsExist(prisma: Pick<PrismaClient, "tag">, tagIds: string[]): Promise<boolean> {
  if (tagIds.length === 0) return true;
  const found = await prisma.tag.count({ where: { id: { in: tagIds } } });
  return found === tagIds.length;
}

// ---------------------------------------------------------------------------
// Admin-only fields (status, curator visit). Kept separate so the submission
// approve route doesn't need them.
// ---------------------------------------------------------------------------

export const CAFE_STATUSES = ["OPEN", "TEMPORARILY_CLOSED", "CLOSED"] as const;
export type CafeStatusInput = (typeof CAFE_STATUSES)[number];

export interface CafeAdminFields {
  status: CafeStatusInput;
  curatorVisitedAt: Date | null;
}

const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;

/** Parses "YYYY-MM-DD" into a Date at noon UTC so it lands on the same calendar day in Chicago. */
export function parseDateOnly(value: string): Date | null {
  if (!DATE_ONLY.test(value)) return null;
  const d = new Date(`${value}T12:00:00Z`);
  return Number.isNaN(d.getTime()) || d.toISOString().slice(0, 10) !== value ? null : d;
}

export function validateCafeAdminFields(
  body: Partial<Record<keyof CafeAdminFields, unknown>>
): { ok: true; data: CafeAdminFields } | { ok: false; errors: Partial<Record<keyof CafeAdminFields, string>> } {
  const errors: Partial<Record<keyof CafeAdminFields, string>> = {};
  const status = body.status === undefined || body.status === null || body.status === "" ? "OPEN" : body.status;
  if (typeof status !== "string" || !(CAFE_STATUSES as readonly string[]).includes(status)) {
    errors.status = "Status must be OPEN, TEMPORARILY_CLOSED, or CLOSED.";
  }
  let curatorVisitedAt: Date | null = null;
  const rawVisit = typeof body.curatorVisitedAt === "string" ? body.curatorVisitedAt.trim() : "";
  if (rawVisit) {
    curatorVisitedAt = parseDateOnly(rawVisit);
    if (!curatorVisitedAt) errors.curatorVisitedAt = "Visit date must be YYYY-MM-DD.";
    else if (curatorVisitedAt.getTime() > Date.now() + 24 * 60 * 60 * 1000) errors.curatorVisitedAt = "Visit date cannot be in the future.";
  }
  if (Object.keys(errors).length > 0) return { ok: false, errors };
  return { ok: true, data: { status: status as CafeStatusInput, curatorVisitedAt } };
}

// ---------------------------------------------------------------------------
// Hours + website (admin only)
// ---------------------------------------------------------------------------

export interface CafeHoursFields {
  hours: WeeklyHours | null;
  hoursCheckedAt: Date | null;
  hoursSourceUrl: string | null;
  website: string | null;
}

/** Body shape: hours = { mon: "7:00-15:00", ..., sun: "closed" } (admin text) or null for "not listed". */
export function validateCafeHoursFields(
  body: Partial<Record<keyof CafeHoursFields, unknown>>
): { ok: true; data: CafeHoursFields } | { ok: false; errors: Partial<Record<keyof CafeHoursFields, string>> } {
  const errors: Partial<Record<keyof CafeHoursFields, string>> = {};
  let hours: WeeklyHours | null = null;
  if (body.hours !== undefined && body.hours !== null) {
    if (typeof body.hours !== "object" || Array.isArray(body.hours)) {
      errors.hours = "Hours must be an object of day -> text.";
    } else {
      const parsed = {} as WeeklyHours;
      const bad: string[] = [];
      for (const day of DAY_KEYS) {
        const raw = (body.hours as Record<string, unknown>)[day];
        const intervals = parseDayText(typeof raw === "string" ? raw : "");
        if (!intervals) bad.push(day);
        else parsed[day] = intervals;
      }
      if (bad.length) errors.hours = `Use 24h "7:00-15:00" (comma-separated) or "closed". Check: ${bad.join(", ")}.`;
      else hours = parsed;
    }
  }
  let hoursCheckedAt: Date | null = null;
  const rawChecked = typeof body.hoursCheckedAt === "string" ? body.hoursCheckedAt.trim() : "";
  if (rawChecked) {
    hoursCheckedAt = parseDateOnly(rawChecked);
    if (!hoursCheckedAt) errors.hoursCheckedAt = "Checked date must be YYYY-MM-DD.";
  }
  if (hours && !hoursCheckedAt) errors.hoursCheckedAt = "Add the date you checked these hours.";
  const urlField = (key: "hoursSourceUrl" | "website") => {
    const v = typeof body[key] === "string" ? (body[key] as string).trim() : "";
    if (v && !isValidHttpUrl(v)) errors[key] = "Must be a valid http(s) URL.";
    return v || null;
  };
  const hoursSourceUrl = urlField("hoursSourceUrl");
  const website = urlField("website");
  if (Object.keys(errors).length > 0) return { ok: false, errors };
  return { ok: true, data: { hours, hoursCheckedAt, hoursSourceUrl, website } };
}
