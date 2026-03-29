import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { rateLimit } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    // Rate limiting by IP
    const forwarded = request.headers.get("x-forwarded-for");
    const ip = forwarded?.split(",")[0]?.trim() ?? "unknown";
    const { allowed, retryAfterMs } = rateLimit(ip);

    if (!allowed) {
      const retryAfterSec = Math.ceil(retryAfterMs / 1000);
      return Response.json(
        {
          error: `Rate limit exceeded. Try again in ${retryAfterSec} seconds.`,
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
      return Response.json(
        { error: "Invalid JSON body" },
        { status: 400 }
      );
    }

    const { cafe_id, content, author_name } = body as {
      cafe_id?: string;
      content?: string;
      author_name?: string;
    };

    // Validate required fields
    if (!cafe_id || typeof cafe_id !== "string") {
      return Response.json(
        { error: "cafe_id is required and must be a string" },
        { status: 400 }
      );
    }

    if (!content || typeof content !== "string" || content.trim().length === 0) {
      return Response.json(
        { error: "content is required and must not be empty" },
        { status: 400 }
      );
    }

    if (content.length > 500) {
      return Response.json(
        { error: "content must be 500 characters or fewer" },
        { status: 400 }
      );
    }

    if (author_name !== undefined && typeof author_name !== "string") {
      return Response.json(
        { error: "author_name must be a string if provided" },
        { status: 400 }
      );
    }

    // Verify cafe exists
    const cafe = await prisma.cafe.findUnique({ where: { id: cafe_id } });
    if (!cafe) {
      return Response.json(
        { error: `Cafe with id "${cafe_id}" not found` },
        { status: 404 }
      );
    }

    // Create the note
    const note = await prisma.note.create({
      data: {
        cafeId: cafe_id,
        content: content.trim(),
        authorName: author_name?.trim() || null,
      },
    });

    return Response.json(
      {
        id: note.id,
        content: note.content,
        authorName: note.authorName,
        createdAt: note.createdAt.toISOString(),
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("POST /api/notes error:", error);
    return Response.json(
      { error: "Failed to create note" },
      { status: 500 }
    );
  }
}
