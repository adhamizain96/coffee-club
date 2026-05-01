import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { SubmissionStatus } from "@/generated/prisma/client";
import { geocodeAddress, type GeocodeResult } from "@/lib/geocode";
import EditApprovalForm from "./EditApprovalForm";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Review submission — Coffee Club admin",
  robots: { index: false, follow: false },
};

function normalizeWebsite(value: string): string {
  if (/^https?:\/\//i.test(value)) return value;
  return `https://${value}`;
}

export default async function EditApprovalPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const submission = await prisma.cafeSubmission.findUnique({
    where: { id },
  });
  if (!submission) notFound();
  if (submission.status !== SubmissionStatus.PENDING) {
    // Already reviewed — bounce back to queue with a clear filter so the user
    // can see what state it's in.
    return (
      <div className="min-h-screen bg-stone-50">
        <main className="mx-auto max-w-2xl px-4 py-12">
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
            <p className="text-sm text-amber-900">
              This submission has already been{" "}
              <strong>{submission.status.toLowerCase()}</strong>. Approvals are
              one-shot; head back to the queue to view the audit row.
            </p>
            <Link
              href={`/admin/submissions?status=${submission.status.toLowerCase()}`}
              className="mt-3 inline-flex text-xs font-medium text-amber-700 hover:text-amber-800"
            >
              ← Back to queue
            </Link>
          </div>
        </main>
      </div>
    );
  }

  // Fetch all tags so the chip picker can render every option (suggested ones
  // are pre-checked via initialTagIds below).
  const allTags = await prisma.tag.findMany({
    select: { id: true, name: true },
  });
  const tagsByName: Record<string, string> = Object.fromEntries(
    allTags.map((t) => [t.name, t.id])
  );

  // Geocode the submitter's address up front so the form can pre-fill
  // formatted address, lat/lng, and (if Google returned one) neighborhood.
  // Any failure drops a friendly error into the page state instead of crashing.
  let initialGeocode: GeocodeResult | null = null;
  let geocodeError: string | null = null;
  try {
    initialGeocode = await geocodeAddress(submission.address);
    if (!initialGeocode) {
      geocodeError =
        "Google couldn't find this address. Edit the address below and click Re-geocode.";
    }
  } catch (err) {
    console.error("edit page geocode error:", err);
    geocodeError =
      "Geocoding service failed. Check that NEXT_PUBLIC_GOOGLE_MAPS_API_KEY is set and the daily quota isn't exhausted, then edit the address below and click Re-geocode.";
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
        <div className="mb-5">
          <Link
            href="/admin/submissions"
            className="text-xs font-medium text-stone-500 hover:text-amber-700 transition-colors"
          >
            ← Back to queue
          </Link>
          <h2 className="mt-1 text-xl font-bold text-stone-900">
            Review &amp; approve
          </h2>
          <p className="mt-1 text-sm text-stone-500">
            Pre-filled from the submitter&apos;s answers and Google&apos;s
            geocode. Refine before publishing — the cafe goes live the moment
            you click Approve.
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
          <EditApprovalForm
            submissionId={submission.id}
            initialName={submission.cafeName}
            initialAddress={submission.address}
            initialDescription={submission.whyYouLikeIt ?? ""}
            initialTagIds={submission.suggestedTagIds}
            initialGeocode={initialGeocode}
            initialGeocodeError={geocodeError}
            tagsByName={tagsByName}
          />

          <aside className="rounded-lg border border-stone-200 bg-white p-4 h-fit space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-stone-500">
              Submission context
            </h3>
            <div className="space-y-2 text-sm">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wide text-stone-400">
                  Submitter
                </p>
                <p className="text-stone-900 font-medium">
                  {submission.submitterName}
                </p>
              </div>
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wide text-stone-400">
                  Original address
                </p>
                <p className="text-stone-700 break-words">{submission.address}</p>
              </div>
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wide text-stone-400">
                  Website
                </p>
                <a
                  href={normalizeWebsite(submission.website)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-amber-700 hover:text-amber-800 underline-offset-2 hover:underline break-words"
                >
                  {submission.website}
                </a>
              </div>
              {submission.whyYouLikeIt && (
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-stone-400">
                    Why they like it
                  </p>
                  <p className="text-stone-700 italic">
                    &ldquo;{submission.whyYouLikeIt}&rdquo;
                  </p>
                </div>
              )}
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wide text-stone-400">
                  Submitted
                </p>
                <p className="text-stone-700">
                  {submission.createdAt.toLocaleString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                    hour: "numeric",
                    minute: "2-digit",
                  })}
                </p>
              </div>
            </div>
          </aside>
        </div>
      </main>
    </div>
  );
}
