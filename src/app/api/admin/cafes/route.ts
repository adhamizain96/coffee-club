import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@/generated/prisma/client";
import { slugify, uniqueSlug } from "@/lib/slug";
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

/** POST — create a cafe directly (no submission). Returns { cafeId, slug }. */
export async function POST(request: NextRequest) {
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
    const cafe = await prisma.$transaction(async (tx) => {
      const slug = await uniqueSlug(slugify(fields.name), async (candidate) =>
        Boolean(await tx.cafe.findUnique({ where: { slug: candidate }, select: { id: true } }))
      );
      return tx.cafe.create({
        data: {
          ...fields,
          slug,
          addedAt: new Date(),
          tags: { create: tagIds.map((tagId) => ({ tagId })) },
        },
        select: { id: true, slug: true },
      });
    });
    return Response.json({ cafeId: cafe.id, slug: cafe.slug }, { status: 201 });
  } catch (error) {
    console.error("POST /api/admin/cafes error:", error);
    return Response.json({ error: "Failed to create cafe" }, { status: 500 });
  }
}
