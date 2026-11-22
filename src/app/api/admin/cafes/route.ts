import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { slugify, uniqueSlug } from "@/lib/slug";
import { validateCafeFields, allTagsExist, type CafeFields } from "@/lib/cafe-validation";

export const dynamic = "force-dynamic";

// Gated by src/proxy.ts (matcher /api/admin/:path*).

/** POST — create a cafe directly (no submission). Returns { cafeId, slug }. */
export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => null)) as Partial<Record<keyof CafeFields, unknown>> | null;
  if (!body || typeof body !== "object") {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const validated = validateCafeFields(body);
  if (!validated.ok) return Response.json({ errors: validated.errors }, { status: 400 });
  const { tagIds, ...fields } = validated.data;
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
