import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { rateLimit } from "@/lib/rate-limit";
import { SubmissionStatus } from "@/generated/prisma/client";

export const dynamic = "force-dynamic";

const SUBMISSION_RATE_LIMIT = {
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3,
  bucket: "submissions",
} as const;

const CAFE_NAME_MIN = 2;
const CAFE_NAME_MAX = 100;
const ADDRESS_MIN = 5;
const ADDRESS_MAX = 200;
const WHY_MAX = 280;
const SUBMITTER_NAME_MIN = 1;
const SUBMITTER_NAME_MAX = 50;

// Bare-domain pattern: at least one dot, optional path. Matches inputs like
// "instagram.com/handle" that aren't full URLs but are still meaningful.
const DOMAIN_REGEX = /^[\w-]+(\.[\w-]+)+(\/.*)?$/i;

function normalizeAddress(s: string): string {
  return s
    .toLowerCase()
    .replace(/\s+/g, " ")
    .replace(/[\s.,;]+$/g, "")
    .trim();
}

function isValidWebsite(value: string): boolean {
  if (!value) return false;
  try {
    const u = new URL(value);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return DOMAIN_REGEX.test(value);
  }
}

export async function POST(request: NextRequest) {
  try {
    // Rate limit
    const forwarded = request.headers.get("x-forwarded-for");
    const ip = forwarded?.split(",")[0]?.trim() ?? "unknown";
    const { allowed, retryAfterMs } = rateLimit(ip, SUBMISSION_RATE_LIMIT);
    if (!allowed) {
      const retryAfterSec = Math.ceil(retryAfterMs / 1000);
      return Response.json(
        {
          error: `Too many submissions. Try again in ${retryAfterSec} seconds.`,
        },
        {
          status: 429,
          headers: { "Retry-After": String(retryAfterSec) },
        }
      );
    }

    // Parse body
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return Response.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const {
      cafeName,
      address,
      website,
      whyYouLikeIt,
      suggestedTagIds,
      submitterName,
      companyName,
    } = body as {
      cafeName?: unknown;
      address?: unknown;
      website?: unknown;
      whyYouLikeIt?: unknown;
      suggestedTagIds?: unknown;
      submitterName?: unknown;
      companyName?: unknown;
    };

    // Honeypot: silent success, no insert. Bots populate hidden fields.
    if (typeof companyName === "string" && companyName.trim().length > 0) {
      return Response.json({}, { status: 200 });
    }

    // Field validation
    const errors: Record<string, string> = {};

    const cafeNameStr = typeof cafeName === "string" ? cafeName.trim() : "";
    if (
      !cafeNameStr ||
      cafeNameStr.length < CAFE_NAME_MIN ||
      cafeNameStr.length > CAFE_NAME_MAX
    ) {
      errors.cafeName = `Cafe name must be ${CAFE_NAME_MIN}–${CAFE_NAME_MAX} characters.`;
    }

    const addressStr = typeof address === "string" ? address.trim() : "";
    if (
      !addressStr ||
      addressStr.length < ADDRESS_MIN ||
      addressStr.length > ADDRESS_MAX
    ) {
      errors.address = `Address must be ${ADDRESS_MIN}–${ADDRESS_MAX} characters.`;
    }

    const websiteStr = typeof website === "string" ? website.trim() : "";
    if (!websiteStr || !isValidWebsite(websiteStr)) {
      errors.website =
        "Enter a website URL or domain (e.g. instagram.com/handle).";
    }

    let whyStr: string | null = null;
    if (whyYouLikeIt !== undefined && whyYouLikeIt !== null && whyYouLikeIt !== "") {
      if (typeof whyYouLikeIt !== "string") {
        errors.whyYouLikeIt = "Must be text.";
      } else if (whyYouLikeIt.length > WHY_MAX) {
        errors.whyYouLikeIt = `Keep it under ${WHY_MAX} characters.`;
      } else {
        whyStr = whyYouLikeIt;
      }
    }

    let tagIds: string[] = [];
    if (suggestedTagIds !== undefined && suggestedTagIds !== null) {
      if (
        !Array.isArray(suggestedTagIds) ||
        !suggestedTagIds.every((t) => typeof t === "string")
      ) {
        errors.suggestedTagIds = "Tags must be a list of tag IDs.";
      } else {
        tagIds = suggestedTagIds as string[];
      }
    }

    const submitterNameStr =
      typeof submitterName === "string" ? submitterName.trim() : "";
    if (
      !submitterNameStr ||
      submitterNameStr.length < SUBMITTER_NAME_MIN ||
      submitterNameStr.length > SUBMITTER_NAME_MAX
    ) {
      errors.submitterName = `Name must be ${SUBMITTER_NAME_MIN}–${SUBMITTER_NAME_MAX} characters.`;
    }

    if (Object.keys(errors).length > 0) {
      return Response.json({ errors }, { status: 400 });
    }

    // Verify all suggested tag IDs exist (deferred until field validation passes)
    if (tagIds.length > 0) {
      const existing = await prisma.tag.findMany({
        where: { id: { in: tagIds } },
        select: { id: true },
      });
      if (existing.length !== tagIds.length) {
        return Response.json(
          { errors: { suggestedTagIds: "One or more tags are invalid." } },
          { status: 400 }
        );
      }
    }

    // Dedup against any pending or already-approved submission for the same address
    const normalizedAddress = normalizeAddress(addressStr);
    const existingSubmission = await prisma.cafeSubmission.findFirst({
      where: {
        normalizedAddress,
        status: { in: [SubmissionStatus.PENDING, SubmissionStatus.APPROVED] },
      },
      select: { id: true },
    });
    if (existingSubmission) {
      return Response.json(
        { error: "This cafe has already been suggested." },
        { status: 409 }
      );
    }

    const created = await prisma.cafeSubmission.create({
      data: {
        cafeName: cafeNameStr,
        address: addressStr,
        normalizedAddress,
        website: websiteStr,
        whyYouLikeIt: whyStr,
        suggestedTagIds: tagIds,
        submitterName: submitterNameStr,
      },
      select: { id: true },
    });

    return Response.json({ id: created.id }, { status: 201 });
  } catch (error) {
    console.error("POST /api/submissions error:", error);
    return Response.json(
      { error: "Failed to create submission" },
      { status: 500 }
    );
  }
}
