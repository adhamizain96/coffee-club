"use client";

import { useState, useCallback } from "react";
import type { NoteDTO } from "@/lib/types";
import NotesList from "@/components/NotesList";
import NoteForm from "@/components/NoteForm";

interface CafeDetailNotesProps {
  cafeId: string;
  initialNotes: NoteDTO[];
}

export default function CafeDetailNotes({
  cafeId,
  initialNotes,
}: CafeDetailNotesProps) {
  const [notes, setNotes] = useState<NoteDTO[]>(initialNotes);

  const refreshNotes = useCallback(async () => {
    try {
      const res = await fetch(`/api/cafes/${cafeId}`);
      if (res.ok) {
        const data = await res.json();
        setNotes(data.notes);
      }
    } catch {
      // Silently fail — user still sees their old list plus the form cleared
    }
  }, [cafeId]);

  return (
    <>
      <section className="mt-10">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          Community Notes
        </h2>
        <NotesList notes={notes} />
      </section>

      <section className="mt-8 border-t border-gray-200 pt-8">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          Leave a Note
        </h2>
        <NoteForm cafeId={cafeId} onSuccess={refreshNotes} />
      </section>
    </>
  );
}
