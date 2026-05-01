import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { SubmissionStatus } from "@/generated/prisma/client";
import { getTagLabel } from "@/lib/tag-display";
import SubmissionRowActions from "./SubmissionRowActions";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Submissions queue — Coffee Club",
  robots: { index: false, follow: false },
};

type StatusFilter = "pending" | "approved" | "rejected" | "all";

const FILTER_OPTIONS: ReadonlyArray<{ value: StatusFilter; label: string }> = [
  { value: "pending", label: "Pending" },
  { value: "approved", label: "Approved" },
  { value: "rejected", label: "Rejected" },
  { value: "all", label: "All" },
];

function parseStatus(value: string | undefined): StatusFilter {
  const v = value?.toLowerCase();
  if (v === "approved" || v === "rejected" || v === "all") return v;
  return "pending";
}

function relativeTime(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} minute${minutes === 1 ? "" : "s"} ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days} day${days === 1 ? "" : "s"} ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months} month${months === 1 ? "" : "s"} ago`;
  const years = Math.floor(months / 12);
  return `${years} year${years === 1 ? "" : "s"} ago`;
}

function normalizeWebsite(value: string): string {
  if (/^https?:\/\//i.test(value)) return value;
  return `https://${value}`;
}

function statusBadge(status: SubmissionStatus) {
  const map = {
    PENDING: "bg-amber-50 text-amber-700 ring-amber-600/20",
    APPROVED: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
    REJECTED: "bg-stone-100 text-stone-600 ring-stone-600/20",
  } as const;
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ring-1 ring-inset ${map[status]}`}
    >
      {status.toLowerCase()}
    </span>
  );
}

export default async function AdminSubmissionsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status: rawStatus } = await searchParams;
  const status = parseStatus(rawStatus);

  const where =
    status === "all"
      ? {}
      : { status: status.toUpperCase() as SubmissionStatus };

  const submissions = await prisma.cafeSubmission.findMany({
    where,
    orderBy: { createdAt: "asc" },
  });

  // Resolve all referenced suggested-tag IDs in one query
  const allTagIds = Array.from(
    new Set(submissions.flatMap((s) => s.suggestedTagIds))
  );
  const tagsById: Record<string, string> = {};
  if (allTagIds.length > 0) {
    const tagRows = await prisma.tag.findMany({
      where: { id: { in: allTagIds } },
      select: { id: true, name: true },
    });
    for (const t of tagRows) tagsById[t.id] = t.name;
  }

  return (
    <div className="min-h-screen bg-stone-50">
      <header className="border-b border-stone-200 bg-white">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between gap-3">
          <div className="flex items-baseline gap-3">
            <h1 className="text-base font-bold text-stone-900">
              Coffee Club admin
            </h1>
            <Link
              href="/"
              className="text-xs font-medium text-stone-500 hover:text-amber-700 transition-colors"
            >
              Back to map
            </Link>
          </div>
          <form method="POST" action="/api/admin/logout">
            <button
              type="submit"
              className="text-xs font-medium text-stone-500 hover:text-stone-800 transition-colors"
            >
              Sign out
            </button>
          </form>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-8">
        <h2 className="text-xl font-bold text-stone-900">Submissions queue</h2>
        <p className="mt-1 text-sm text-stone-500">
          Review pending suggestions, approve via the edit page, or reject with
          an optional internal note.
        </p>

        <nav className="mt-5 flex flex-wrap gap-1.5">
          {FILTER_OPTIONS.map((opt) => {
            const isActive = opt.value === status;
            const href =
              opt.value === "pending"
                ? "/admin/submissions"
                : `/admin/submissions?status=${opt.value}`;
            return (
              <Link
                key={opt.value}
                href={href}
                className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                  isActive
                    ? "bg-stone-900 text-white shadow-sm"
                    : "bg-white border border-stone-200 text-stone-600 hover:bg-stone-100"
                }`}
              >
                {opt.label}
              </Link>
            );
          })}
        </nav>

        <div className="mt-6 space-y-3">
          {submissions.length === 0 ? (
            <div className="rounded-lg border border-stone-200 bg-white px-4 py-10 text-center">
              <p className="text-sm text-stone-500">
                {status === "pending"
                  ? "No pending submissions. The queue is clear."
                  : status === "approved"
                  ? "No approved submissions yet."
                  : status === "rejected"
                  ? "No rejected submissions."
                  : "No submissions."}
              </p>
            </div>
          ) : (
            submissions.map((s) => {
              const mapsHref = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                s.address
              )}`;
              const websiteHref = normalizeWebsite(s.website);
              const tagLabels = s.suggestedTagIds
                .map((id) => tagsById[id])
                .filter((name): name is string => Boolean(name))
                .map((name) => getTagLabel(name));

              return (
                <article
                  key={s.id}
                  className="rounded-lg border border-stone-200 bg-white p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="text-base font-semibold text-stone-900">
                        {s.cafeName}
                      </h3>
                      <p className="mt-0.5 text-xs text-stone-500">
                        <a
                          href={mapsHref}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="hover:text-amber-700 transition-colors underline-offset-2 hover:underline"
                        >
                          {s.address}
                        </a>
                      </p>
                      <p className="mt-0.5 text-xs text-stone-500">
                        <a
                          href={websiteHref}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="hover:text-amber-700 transition-colors underline-offset-2 hover:underline"
                        >
                          {s.website}
                        </a>
                      </p>
                    </div>
                    <div className="shrink-0 flex items-center gap-2">
                      {statusBadge(s.status)}
                      {s.status === SubmissionStatus.APPROVED &&
                        s.approvedCafeId && (
                          <Link
                            href={`/cafes/${s.approvedCafeId}`}
                            className="text-[10px] font-semibold text-amber-700 hover:text-amber-800 underline-offset-2 hover:underline"
                          >
                            View cafe →
                          </Link>
                        )}
                    </div>
                  </div>

                  {s.whyYouLikeIt && (
                    <p className="mt-3 text-sm text-stone-700 leading-relaxed">
                      &ldquo;{s.whyYouLikeIt}&rdquo;
                    </p>
                  )}

                  {tagLabels.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {tagLabels.map((label, i) => (
                        <span
                          key={`${label}-${i}`}
                          className="inline-flex items-center rounded-full bg-stone-100 px-2 py-0.5 text-[10px] font-medium text-stone-600"
                        >
                          {label}
                        </span>
                      ))}
                    </div>
                  )}

                  <div className="mt-3 flex items-center gap-2 text-[11px] text-stone-400">
                    <span>
                      Submitted by{" "}
                      <span className="text-stone-600 font-medium">
                        {s.submitterName}
                      </span>
                    </span>
                    <span>·</span>
                    <span>{relativeTime(s.createdAt)}</span>
                    {s.reviewedAt && (
                      <>
                        <span>·</span>
                        <span>reviewed {relativeTime(s.reviewedAt)}</span>
                      </>
                    )}
                  </div>

                  {s.status === SubmissionStatus.REJECTED &&
                    s.rejectionReason && (
                      <div className="mt-3 rounded-md bg-stone-50 border border-stone-200 px-3 py-2">
                        <p className="text-[10px] font-semibold uppercase tracking-wide text-stone-500 mb-0.5">
                          Internal reason
                        </p>
                        <p className="text-xs text-stone-700">
                          {s.rejectionReason}
                        </p>
                      </div>
                    )}

                  {s.status === SubmissionStatus.PENDING && (
                    <SubmissionRowActions submissionId={s.id} />
                  )}
                </article>
              );
            })
          )}
        </div>
      </main>
    </div>
  );
}
