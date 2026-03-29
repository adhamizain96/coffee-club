import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const cafe = await prisma.cafe.findUnique({
      where: { id },
      include: {
        tags: {
          include: {
            tag: true,
          },
        },
        notes: {
          orderBy: { createdAt: "desc" },
        },
      },
    });

    if (!cafe) {
      return Response.json(
        { error: `Cafe with id "${id}" not found` },
        { status: 404 }
      );
    }

    const result = {
      id: cafe.id,
      name: cafe.name,
      description: cafe.description,
      address: cafe.address,
      neighborhood: cafe.neighborhood,
      latitude: cafe.latitude,
      longitude: cafe.longitude,
      imageUrl: cafe.imageUrl,
      ownerReview: cafe.ownerReview,
      createdAt: cafe.createdAt.toISOString(),
      tags: cafe.tags.map((ct) => ({
        id: ct.tag.id,
        name: ct.tag.name,
        type: ct.tag.type,
      })),
      notes: cafe.notes.map((note) => ({
        id: note.id,
        content: note.content,
        authorName: note.authorName,
        createdAt: note.createdAt.toISOString(),
      })),
    };

    return Response.json(result);
  } catch (error) {
    console.error("GET /api/cafes/[id] error:", error);
    return Response.json(
      { error: "Failed to fetch cafe" },
      { status: 500 }
    );
  }
}
