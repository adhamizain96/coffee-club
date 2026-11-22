import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import AdminHeader from "../AdminHeader";
import NoteRowActions from "./NoteRowActions";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Notes — Coffee Club admin",
  robots: { index: false, follow: false },
};

const FILTERS = [
  { value: "all", label: "All" },
  { value: "visible", label: "Visible" },
  { value: "hidden", label: "Hidden" },
] as const;
type Filter = (typeof FILTERS)[number]["value"];

export default async function AdminNotesPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string }>;
}) {
  const { filter: rawFilter } = await searchParams;
  const filter: Filter = FILTERS.some((f) => f.value === rawFilter) ? (rawFilter as Filter) : "all";

  const notes = await prisma.note.findMany({
    where:
      filter === "hidden" ? { hiddenAt: { not: null } } : filter === "visible" ? { hiddenAt: null } : undefined,
    orderBy: { createdAt: "desc" },
    include: { cafe: { select: { name: true, slug: true, id: true } } },
  });

  const dateFormat = new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "America/Chicago",
  });

  return (
    <div className="min-h-screen bg-stone-50">
      <AdminHeader active="/admin/notes" />
      <main className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-8">
        <h2 className="text-xl font-bold text-stone-900">Community notes</h2>
        <p className="mt-1 text-sm text-stone-500">
          Hidden notes never appear on the public site. Delete removes a note permanently.
        </p>

        <nav className="mt-5 flex flex-wrap gap-1.5">
          {FILTERS.map((f) => (
            <Link
              key={f.value}
              href={f.value === "all" ? "/admin/notes" : `/admin/notes?filter=${f.value}`}
              className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                f.value === filter
                  ? "bg-stone-900 text-white shadow-sm"
                  : "bg-white border border-stone-200 text-stone-600 hover:bg-stone-100"
              }`}
            >
              {f.label}
            </Link>
          ))}
        </nav>

        <p className="mt-4 text-xs text-stone-500">{notes.length} {notes.length === 1 ? "note" : "notes"}</p>

        <ul className="mt-2 space-y-3">
          {notes.length === 0 && (
            <li className="rounded-lg border border-stone-200 bg-white px-4 py-10 text-center text-sm text-stone-500">
              No notes in this view.
            </li>
          )}
          {notes.map((note) => (
            <li
              key={note.id}
              className={`rounded-lg border bg-white p-4 flex flex-col sm:flex-row sm:items-start gap-3 ${
                note.hiddenAt ? "border-stone-200 opacity-70" : "border-stone-200"
              }`}
            >
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2 text-xs text-stone-500">
                  <Link
                    href={`/cafes/${note.cafe.slug ?? note.cafe.id}`}
                    className="font-semibold text-stone-800 hover:text-amber-700"
                  >
                    {note.cafe.name}
                  </Link>
                  <span aria-hidden="true">·</span>
                  <span>{note.authorName || "Anonymous"}</span>
                  <span aria-hidden="true">·</span>
                  <time dateTime={note.createdAt.toISOString()}>{dateFormat.format(note.createdAt)}</time>
                  {note.hiddenAt && (
                    <span className="rounded-full bg-stone-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-stone-600">
                      Hidden
                    </span>
                  )}
                </div>
                <p className="mt-1.5 text-sm text-stone-800 whitespace-pre-line break-words">{note.content}</p>
              </div>
              <NoteRowActions noteId={note.id} hidden={!!note.hiddenAt} />
            </li>
          ))}
        </ul>
      </main>
    </div>
  );
}
