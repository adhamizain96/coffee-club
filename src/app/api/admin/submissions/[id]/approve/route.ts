import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { SubmissionStatus } from "@/generated/prisma/client";

export const dynamic = "force-dynamic";

const NAME_MIN = 2;
const NAME_MAX = 100;
const ADDRESS_MIN = 5;
const ADDRESS_MAX = 200;
const NEIGHBORHOOD_MIN = 1;
const NEIGHBORHOOD_MAX = 100;
const DESCRIPTION_MIN = 1;
const DESCRIPTION_MAX = 2000;
const OWNER_REVIEW_MIN = 1;
const OWNER_REVIEW_MAX = 2000;

// Sentinel error used inside the approve transaction to signal a known
// business-logic failure (vs. an unexpected throw). Caught at the route
// boundary and mapped to 400/404.
class ApproveError extends Error {
  constructor(public code: "NOT_FOUND" | "NOT_PENDING") {
    super(code);
  }
}

interface ApprovePayload {
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  neighborhood: string;
  description: string;
  imageUrl: string;
  ownerReview: string;
  tagIds: string[];
}

function isValidImageUrl(value: string): boolean {
  try {
    const u = new URL(value);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const body = (await request.json().catch(() => null)) as
      | Partial<Record<keyof ApprovePayload, unknown>>
      | null;
    if (!body || typeof body !== "object") {
      return Response.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const errors: Record<string, string> = {};

    const name =
      typeof body.name === "string" ? body.name.trim() : "";
    if (name.length < NAME_MIN || name.length > NAME_MAX) {
      errors.name = `Name must be ${NAME_MIN}-${NAME_MAX} characters.`;
    }

    const address =
      typeof body.address === "string" ? body.address.trim() : "";
    if (address.length < ADDRESS_MIN || address.length > ADDRESS_MAX) {
      errors.address = `Address must be ${ADDRESS_MIN}-${ADDRESS_MAX} characters.`;
    }

    const latitude =
      typeof body.latitude === "number" && Number.isFinite(body.latitude)
        ? body.latitude
        : NaN;
    if (Number.isNaN(latitude) || latitude < -90 || latitude > 90) {
      errors.latitude = "Latitude must be a number between -90 and 90.";
    }

    const longitude =
      typeof body.longitude === "number" && Number.isFinite(body.longitude)
        ? body.longitude
        : NaN;
    if (Number.isNaN(longitude) || longitude < -180 || longitude > 180) {
      errors.longitude = "Longitude must be a number between -180 and 180.";
    }

    const neighborhood =
      typeof body.neighborhood === "string" ? body.neighborhood.trim() : "";
    if (
      neighborhood.length < NEIGHBORHOOD_MIN ||
      neighborhood.length > NEIGHBORHOOD_MAX
    ) {
      errors.neighborhood = `Neighborhood must be ${NEIGHBORHOOD_MIN}-${NEIGHBORHOOD_MAX} characters.`;
    }

    const description =
      typeof body.description === "string" ? body.description.trim() : "";
    if (
      description.length < DESCRIPTION_MIN ||
      description.length > DESCRIPTION_MAX
    ) {
      errors.description = `Description must be ${DESCRIPTION_MIN}-${DESCRIPTION_MAX} characters.`;
    }

    const imageUrl =
      typeof body.imageUrl === "string" ? body.imageUrl.trim() : "";
    if (!imageUrl) {
      errors.imageUrl = "Image URL is required.";
    } else if (!isValidImageUrl(imageUrl)) {
      errors.imageUrl = "Image URL must be a valid http(s) URL.";
    }

    const ownerReview =
      typeof body.ownerReview === "string" ? body.ownerReview.trim() : "";
    if (
      ownerReview.length < OWNER_REVIEW_MIN ||
      ownerReview.length > OWNER_REVIEW_MAX
    ) {
      errors.ownerReview = `Owner review must be ${OWNER_REVIEW_MIN}-${OWNER_REVIEW_MAX} characters.`;
    }

    let tagIds: string[] = [];
    if (body.tagIds !== undefined && body.tagIds !== null) {
      if (
        !Array.isArray(body.tagIds) ||
        !body.tagIds.every((t) => typeof t === "string")
      ) {
        errors.tagIds = "Tags must be a list of tag IDs.";
      } else {
        tagIds = body.tagIds as string[];
      }
    }

    if (Object.keys(errors).length > 0) {
      return Response.json({ errors }, { status: 400 });
    }

    // Verify all tag IDs exist (deferred until field validation passes)
    if (tagIds.length > 0) {
      const existing = await prisma.tag.findMany({
        where: { id: { in: tagIds } },
        select: { id: true },
      });
      if (existing.length !== tagIds.length) {
        return Response.json(
          { errors: { tagIds: "One or more tags are invalid." } },
          { status: 400 }
        );
      }
    }

    // Atomic: claim the PENDING row, then create cafe + tags + backfill.
    // The updateMany WHERE filter on status=PENDING is the race-safety latch:
    // two concurrent approvals will serialize on the row lock and the loser
    // sees count=0 (because the winner already flipped status), then throws
    // and rolls back its half-built cafe.
    let cafeId: string;
    try {
      const result = await prisma.$transaction(async (tx) => {
        const current = await tx.cafeSubmission.findUnique({
          where: { id },
          select: { status: true, submitterName: true },
        });
        if (!current) throw new ApproveError("NOT_FOUND");
        if (current.status !== SubmissionStatus.PENDING) {
          throw new ApproveError("NOT_PENDING");
        }

        const claimed = await tx.cafeSubmission.updateMany({
          where: { id, status: SubmissionStatus.PENDING },
          data: {
            status: SubmissionStatus.APPROVED,
            reviewedAt: new Date(),
          },
        });
        if (claimed.count === 0) {
          throw new ApproveError("NOT_PENDING");
        }

        const cafe = await tx.cafe.create({
          data: {
            name,
            description,
            address,
            neighborhood,
            latitude,
            longitude,
            imageUrl,
            ownerReview,
            submitterName: current.submitterName,
            addedAt: new Date(),
          },
          select: { id: true },
        });

        if (tagIds.length > 0) {
          await tx.cafeTag.createMany({
            data: tagIds.map((tagId) => ({ cafeId: cafe.id, tagId })),
          });
        }

        await tx.cafeSubmission.update({
          where: { id },
          data: { approvedCafeId: cafe.id },
        });

        return { cafeId: cafe.id };
      });
      cafeId = result.cafeId;
    } catch (err) {
      if (err instanceof ApproveError) {
        if (err.code === "NOT_FOUND") {
          return Response.json(
            { error: "Submission not found" },
            { status: 404 }
          );
        }
        return Response.json(
          {
            error:
              "Submission is not pending — already approved or rejected.",
          },
          { status: 400 }
        );
      }
      throw err;
    }

    return Response.json({ cafeId }, { status: 200 });
  } catch (error) {
    console.error("POST /api/admin/submissions/[id]/approve error:", error);
    return Response.json(
      { error: "Failed to approve submission" },
      { status: 500 }
    );
  }
}
