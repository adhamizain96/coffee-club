"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface SubmissionRowActionsProps {
  submissionId: string;
}

export default function SubmissionRowActions({
  submissionId,
}: SubmissionRowActionsProps) {
  const router = useRouter();

  const [rejectOpen, setRejectOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function confirmReject() {
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch(`/api/admin/submissions/${submissionId}/reject`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(reason.trim() ? { reason: reason.trim() } : {}),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        setError(data?.error ?? `Reject failed (${res.status}).`);
        return;
      }
      setRejectOpen(false);
      setReason("");
      router.refresh();
    } catch {
      setError("Network error. Try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mt-3 flex flex-col gap-2">
      {!rejectOpen && (
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href={`/admin/submissions/${submissionId}/edit`}
            className="inline-flex items-center rounded-lg bg-amber-600 px-3 py-1.5 text-xs font-medium text-white shadow-sm hover:bg-amber-700 transition-colors"
          >
            Review &amp; approve
          </Link>
          <button
            type="button"
            onClick={() => setRejectOpen(true)}
            className="inline-flex items-center rounded-lg border border-stone-300 bg-white px-3 py-1.5 text-xs font-medium text-stone-700 hover:bg-stone-50 transition-colors"
          >
            Reject
          </button>
        </div>
      )}

      {rejectOpen && (
        <div className="rounded-lg border border-stone-200 bg-stone-50 p-3 space-y-2">
          <label className="block text-xs font-medium text-stone-700">
            Reason{" "}
            <span className="text-stone-400 font-normal">
              (optional, internal — never shown publicly)
            </span>
          </label>
          <textarea
            rows={2}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="e.g. closed, duplicate, not in coverage area"
            disabled={submitting}
            className="block w-full rounded-md border border-stone-300 px-2.5 py-1.5 text-xs text-stone-900 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none disabled:opacity-50"
          />
          {error && (
            <p className="text-xs text-red-600">{error}</p>
          )}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={confirmReject}
              disabled={submitting}
              className="inline-flex items-center rounded-lg bg-red-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {submitting ? "Rejecting..." : "Confirm reject"}
            </button>
            <button
              type="button"
              onClick={() => {
                setRejectOpen(false);
                setReason("");
                setError(null);
              }}
              disabled={submitting}
              className="inline-flex items-center rounded-lg border border-stone-300 bg-white px-3 py-1.5 text-xs font-medium text-stone-700 hover:bg-stone-50 disabled:opacity-50 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
