import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { SubmissionStatus } from "@/generated/prisma/client";
import { slugify, uniqueSlug } from "@/lib/slug";
import { validateCafeFields, allTagsExist, type CafeFields } from "@/lib/cafe-validation";

export const dynamic = "force-dynamic";

// Sentinel error used inside the approve transaction to signal a known
// business-logic failure (vs. an unexpected throw). Caught at the route
// boundary and mapped to 400/404.
class ApproveError extends Error {
  constructor(public code: "NOT_FOUND" | "NOT_PENDING") {
    super(code);
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const body = (await request.json().catch(() => null)) as
      | Partial<Record<keyof CafeFields, unknown>>
      | null;
    if (!body || typeof body !== "object") {
      return Response.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const validated = validateCafeFields(body);
    if (!validated.ok) {
      return Response.json({ errors: validated.errors }, { status: 400 });
    }
    const { name, address, latitude, longitude, neighborhood, description, imageUrl, ownerReview, tagIds } =
      validated.data;

    // Verify all tag IDs exist (deferred until field validation passes)
    if (!(await allTagsExist(prisma, tagIds))) {
      return Response.json({ errors: { tagIds: "One or more tags are invalid." } }, { status: 400 });
    }

    // Atomic: claim the PENDING row, then create cafe + tags + backfill.
    // The updateMany WHERE filter on status=PENDING is the race-safety latch:
    // two concurrent approvals will serialize on the row lock and the loser
    // sees count=0 (because the winner already flipped status), then throws
    // and rolls back its half-built cafe.
    let cafeId: string;
    let slug: string;
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

        const cafeSlug = await uniqueSlug(slugify(name), async (candidate) =>
          Boolean(await tx.cafe.findUnique({ where: { slug: candidate }, select: { id: true } }))
        );

        const cafe = await tx.cafe.create({
          data: {
            name,
            slug: cafeSlug,
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
          select: { id: true, slug: true },
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

        return { cafeId: cafe.id, slug: cafe.slug! };
      });
      cafeId = result.cafeId;
      slug = result.slug;
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

    return Response.json({ cafeId, slug }, { status: 200 });
  } catch (error) {
    console.error("POST /api/admin/submissions/[id]/approve error:", error);
    return Response.json(
      { error: "Failed to approve submission" },
      { status: 500 }
    );
  }
}
