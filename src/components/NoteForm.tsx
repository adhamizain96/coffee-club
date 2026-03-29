"use client";

import { useState } from "react";

const MAX_CONTENT_LENGTH = 500;

interface NoteFormProps {
  cafeId: string;
  onSuccess: () => void;
}

export default function NoteForm({ cafeId, onSuccess }: NoteFormProps) {
  const [authorName, setAuthorName] = useState("");
  const [content, setContent] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const contentLength = content.length;
  const contentOverLimit = contentLength > MAX_CONTENT_LENGTH;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const trimmedContent = content.trim();
    if (!trimmedContent) {
      setError("Note content is required.");
      return;
    }

    if (trimmedContent.length > MAX_CONTENT_LENGTH) {
      setError(`Content must be ${MAX_CONTENT_LENGTH} characters or fewer.`);
      return;
    }

    setSubmitting(true);

    try {
      const res = await fetch("/api/notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cafe_id: cafeId,
          content: trimmedContent,
          author_name: authorName.trim() || undefined,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        setError(data?.error ?? `Something went wrong (${res.status}).`);
        return;
      }

      setContent("");
      setAuthorName("");
      onSuccess();
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label
          htmlFor="author_name"
          className="block text-sm font-medium text-gray-700 mb-1"
        >
          Name{" "}
          <span className="text-gray-400 font-normal">(optional)</span>
        </label>
        <input
          id="author_name"
          type="text"
          value={authorName}
          onChange={(e) => setAuthorName(e.target.value)}
          placeholder="Anonymous"
          className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none"
          disabled={submitting}
        />
      </div>

      <div>
        <label
          htmlFor="content"
          className="block text-sm font-medium text-gray-700 mb-1"
        >
          Your note
        </label>
        <textarea
          id="content"
          rows={4}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Share your experience at this cafe..."
          className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none resize-y"
          disabled={submitting}
        />
        <div className="mt-1 flex justify-end">
          <span
            className={`text-xs ${
              contentOverLimit ? "text-red-600 font-medium" : "text-gray-400"
            }`}
          >
            {contentLength}/{MAX_CONTENT_LENGTH}
          </span>
        </div>
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={submitting || contentOverLimit}
        className="inline-flex items-center rounded-lg bg-amber-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-amber-700 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {submitting ? "Submitting..." : "Leave a note"}
      </button>
    </form>
  );
}
