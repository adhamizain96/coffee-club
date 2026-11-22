// Shared validation for curator-entered cafe fields. Used by the submission
// approve route and the admin cafe create/edit routes so the rules can't drift.

import type { PrismaClient } from "@/generated/prisma/client";

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
