import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@/generated/prisma/client";
import {
  validateCafeFields,
  validateCafeAdminFields,
  validateCafeHoursFields,
  validateRegion,
  allTagsExist,
  type CafeFields,
  type CafeAdminFields,
  type CafeHoursFields,
} from "@/lib/cafe-validation";

export const dynamic = "force-dynamic";

// Gated by src/proxy.ts (matcher /api/admin/:path*).

/** PATCH — update an existing cafe's curated fields and replace its tags.
 *  The slug never changes. Returns { cafeId, slug }. */
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = (await request.json().catch(() => null)) as Partial<Record<keyof CafeFields | keyof CafeAdminFields | keyof CafeHoursFields | "region", unknown>> | null;
  if (!body || typeof body !== "object") {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const validated = validateCafeFields(body);
  const adminValidated = validateCafeAdminFields(body);
  const hoursValidated = validateCafeHoursFields(body);
  const regionValidated = validateRegion(body.region);
  if (!validated.ok || !adminValidated.ok || !hoursValidated.ok || !regionValidated.ok) {
    return Response.json(
      {
        errors: {
          ...(validated.ok ? {} : validated.errors),
          ...(adminValidated.ok ? {} : adminValidated.errors),
          ...(hoursValidated.ok ? {} : hoursValidated.errors),
          ...(regionValidated.ok ? {} : { region: regionValidated.error }),
        },
      },
      { status: 400 }
    );
  }
  const { tagIds, ...coreFields } = validated.data;
  const { hours, ...hoursMeta } = hoursValidated.data;
  const fields = {
    ...coreFields,
    ...adminValidated.data,
    ...hoursMeta,
    region: regionValidated.region,
    // Prisma needs DbNull (not JS null) to clear a Json column.
    hours: hours ? (hours as unknown as Prisma.InputJsonValue) : Prisma.DbNull,
  };
  if (!(await allTagsExist(prisma, tagIds))) {
    return Response.json({ errors: { tagIds: "One or more tags are invalid." } }, { status: 400 });
  }

  try {
    const existing = await prisma.cafe.findUnique({ where: { id }, select: { id: true } });
    if (!existing) return Response.json({ error: "Cafe not found" }, { status: 404 });

    const cafe = await prisma.$transaction(async (tx) => {
      const updated = await tx.cafe.update({ where: { id }, data: fields, select: { id: true, slug: true } });
      await tx.cafeTag.deleteMany({ where: { cafeId: id, tagId: { notIn: tagIds } } });
      if (tagIds.length > 0) {
        await tx.cafeTag.createMany({ data: tagIds.map((tagId) => ({ cafeId: id, tagId })), skipDuplicates: true });
      }
      return updated;
    });
    return Response.json({ cafeId: cafe.id, slug: cafe.slug });
  } catch (error) {
    console.error("PATCH /api/admin/cafes/[id] error:", error);
    return Response.json({ error: "Failed to update cafe" }, { status: 500 });
  }
}
