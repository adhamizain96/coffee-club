import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { validateCafeFields, allTagsExist, type CafeFields } from "@/lib/cafe-validation";

export const dynamic = "force-dynamic";

// Gated by src/proxy.ts (matcher /api/admin/:path*).

/** PATCH — update an existing cafe's curated fields and replace its tags.
 *  The slug never changes. Returns { cafeId, slug }. */
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
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
