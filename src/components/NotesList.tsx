import type { NoteDTO } from "@/lib/types";

interface NotesListProps {
  notes: NoteDTO[];
}

function formatDate(iso: string): string {
  const date = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60_000);
  const diffHours = Math.floor(diffMs / 3_600_000);
  const diffDays = Math.floor(diffMs / 86_400_000);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;

  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: date.getFullYear() !== now.getFullYear() ? "numeric" : undefined,
  });
}

export default function NotesList({ notes }: NotesListProps) {
  if (notes.length === 0) {
    return (
      <div className="py-10 text-center">
        <div className="text-3xl mb-2">&#128221;</div>
        <p className="text-gray-500">
          No notes yet. Be the first to leave one.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {notes.map((note) => (
        <div
          key={note.id}
          className="rounded-lg border border-gray-100 bg-gray-50 p-4"
        >
          <p className="text-gray-800 text-sm leading-relaxed whitespace-pre-line">
            {note.content}
          </p>
          <div className="mt-2 flex items-center gap-2 text-xs text-gray-500">
            <span className="font-medium">
              {note.authorName || "Anonymous"}
            </span>
            <span aria-hidden="true">&middot;</span>
            <time dateTime={note.createdAt}>{formatDate(note.createdAt)}</time>
          </div>
        </div>
      ))}
    </div>
  );
}
