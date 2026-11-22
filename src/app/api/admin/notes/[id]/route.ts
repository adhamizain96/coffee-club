import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// Gated by src/proxy.ts (matcher /api/admin/:path*).

/** PATCH { hidden: boolean } — hide or unhide a community note. */
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = (await request.json().catch(() => null)) as { hidden?: unknown } | null;
  if (!body || typeof body.hidden !== "boolean") {
    return Response.json({ error: "Body must be { hidden: boolean }." }, { status: 400 });
  }
  try {
    const result = await prisma.note.updateMany({
      where: { id },
      data: { hiddenAt: body.hidden ? new Date() : null },
    });
    if (result.count === 0) return Response.json({ error: "Note not found" }, { status: 404 });
    return Response.json({ id, hidden: body.hidden });
  } catch (error) {
    console.error("PATCH /api/admin/notes/[id] error:", error);
    return Response.json({ error: "Failed to update note" }, { status: 500 });
  }
}

/** DELETE — permanently delete a community note. Cannot be undone. */
export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const result = await prisma.note.deleteMany({ where: { id } });
    if (result.count === 0) return Response.json({ error: "Note not found" }, { status: 404 });
    return Response.json({ id, deleted: true });
  } catch (error) {
    console.error("DELETE /api/admin/notes/[id] error:", error);
    return Response.json({ error: "Failed to delete note" }, { status: 500 });
  }
}
