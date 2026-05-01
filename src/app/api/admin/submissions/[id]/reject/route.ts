import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { SubmissionStatus } from "@/generated/prisma/client";

export const dynamic = "force-dynamic";

const REASON_MAX = 1000;

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    let reason: string | null = null;
    try {
      const body = (await request.json().catch(() => null)) as
        | { reason?: unknown }
        | null;
      if (body?.reason !== undefined && body.reason !== null) {
        if (typeof body.reason !== "string") {
          return Response.json(
            { error: "reason must be a string" },
            { status: 400 }
          );
        }
        const trimmed = body.reason.trim();
        if (trimmed.length > REASON_MAX) {
          return Response.json(
            { error: `reason must be ${REASON_MAX} characters or fewer` },
            { status: 400 }
          );
        }
        reason = trimmed.length > 0 ? trimmed : null;
      }
    } catch {
      // empty body is fine — reason stays null
    }

    const existing = await prisma.cafeSubmission.findUnique({
      where: { id },
      select: { id: true, status: true },
    });
    if (!existing) {
      return Response.json({ error: "Submission not found" }, { status: 404 });
    }
    if (existing.status !== SubmissionStatus.PENDING) {
      return Response.json(
        { error: `Submission is already ${existing.status.toLowerCase()}` },
        { status: 400 }
      );
    }

    await prisma.cafeSubmission.update({
      where: { id },
      data: {
        status: SubmissionStatus.REJECTED,
        reviewedAt: new Date(),
        rejectionReason: reason,
      },
    });

    return Response.json({}, { status: 200 });
  } catch (error) {
    console.error("POST /api/admin/submissions/[id]/reject error:", error);
    return Response.json(
      { error: "Failed to reject submission" },
      { status: 500 }
    );
  }
}
