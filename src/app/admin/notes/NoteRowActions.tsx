"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface NoteRowActionsProps {
  noteId: string;
  hidden: boolean;
}

export default function NoteRowActions({ noteId, hidden }: NoteRowActionsProps) {
  const router = useRouter();
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function send(method: "PATCH" | "DELETE", body?: object) {
    setError(null);
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/notes/${noteId}`, {
        method,
        headers: body ? { "Content-Type": "application/json" } : undefined,
        body: body ? JSON.stringify(body) : undefined,
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        setError(data?.error ?? `Request failed (${res.status}).`);
        return;
      }
      setConfirmingDelete(false);
      router.refresh();
    } catch {
      setError("Network error. Try again.");
    } finally {
      setBusy(false);
    }
  }

  const buttonClass =
    "inline-flex items-center rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors disabled:opacity-50";

  return (
    <div className="flex flex-col items-end gap-1.5">
      {!confirmingDelete ? (
        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled={busy}
            onClick={() => send("PATCH", { hidden: !hidden })}
            className={`${buttonClass} border-stone-300 bg-white text-stone-700 hover:bg-stone-50`}
          >
            {hidden ? "Unhide" : "Hide"}
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => setConfirmingDelete(true)}
            className={`${buttonClass} border-red-200 bg-white text-red-700 hover:bg-red-50`}
          >
            Delete
          </button>
        </div>
      ) : (
        <div className="flex items-center gap-2">
          <span className="text-xs text-stone-600">Delete permanently?</span>
          <button
            type="button"
            disabled={busy}
            onClick={() => send("DELETE")}
            className={`${buttonClass} border-red-600 bg-red-600 text-white hover:bg-red-700`}
          >
            Yes, delete
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => setConfirmingDelete(false)}
            className={`${buttonClass} border-stone-300 bg-white text-stone-700 hover:bg-stone-50`}
          >
            Cancel
          </button>
        </div>
      )}
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}
