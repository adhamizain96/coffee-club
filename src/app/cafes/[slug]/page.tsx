import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import type { TagDTO, NoteDTO } from "@/lib/types";
import Link from "next/link";
import TagBadge from "@/components/TagBadge";
import CafeImage from "@/components/CafeImage";
import FreshnessBadges from "@/components/FreshnessBadges";
import PassportToggle from "@/components/PassportToggle";
import { formatVisited, isNewCafe, normalizeStatus, STATUS_LABELS } from "@/lib/freshness";
import CafeHours from "@/components/CafeHours";
import { parseWeeklyHours } from "@/lib/hours";
import { RETIRED_TAG_NAMES } from "@/lib/tag-display";
import { REGION_LABELS } from "@/lib/regions";
import { HoursBadges } from "@/components/HoursStatus";
import CafeDetailNotes from "./CafeDetailNotes";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const cafe = await prisma.cafe.findUnique({
    where: { slug },
    select: { name: true, neighborhood: true, description: true },
  });

  if (!cafe) {
    return { title: "Cafe not found — Coffee Club" };
  }

  return {
    title: `${cafe.name} — Coffee Club`,
    description: cafe.description,
  };
}

export default async function CafeDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const cafe = await prisma.cafe.findUnique({
    where: { slug },
    include: {
      tags: { include: { tag: true } },
      notes: { where: { hiddenAt: null }, orderBy: { createdAt: "desc" } },
    },
  });

  if (!cafe) {
    notFound();
  }

  const status = normalizeStatus(cafe.status);

  const tags: TagDTO[] = cafe.tags.filter((ct) => !RETIRED_TAG_NAMES.has(ct.tag.name)).map((ct) => ({
    id: ct.tag.id,
    name: ct.tag.name,
    type: ct.tag.type,
  }));

  const notes: NoteDTO[] = cafe.notes.map((n) => ({
    id: n.id,
    content: n.content,
    authorName: n.authorName,
    createdAt: n.createdAt.toISOString(),
  }));

  return (
    <div>
      {/* Mobile (below lg): floating pill pair — matches the home view header */}
      <div className="lg:hidden fixed top-3 left-3 right-3 z-40">
        <div className="max-w-md mx-auto flex items-center justify-between gap-2">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 rounded-xl bg-white/95 backdrop-blur-md border border-stone-200/60 shadow-lg px-3.5 py-2 text-sm font-medium text-stone-700 hover:bg-white hover:text-amber-700 transition-colors"
          >
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
            </svg>
            Back to map
          </Link>
          <span className="inline-flex items-center gap-2 rounded-xl bg-white/95 backdrop-blur-md border border-stone-200/60 shadow-lg px-3.5 py-2 text-sm font-semibold tracking-tight text-stone-900">
            <span className="flex items-center justify-center h-5 w-5 rounded-md bg-amber-100 shrink-0">
              <svg className="h-3 w-3 text-amber-700" viewBox="0 0 24 24" fill="currentColor">
                <path d="M2 21V17H4V10C4 7.83 4.87 5.93 6.26 4.57L7.67 5.98C6.63 7 6 8.42 6 10V17H11V3H13V7H18C19.1 7 20 7.9 20 9V12C20 13.1 19.1 14 18 14H13V17H18V21H2ZM13 12H18V9H13V12Z" />
              </svg>
            </span>
            Coffee Club
          </span>
        </div>
      </div>

      {/* Desktop (lg+): original sticky bar — preserved */}
      <div className="hidden lg:flex sticky top-0 z-40 bg-white/80 backdrop-blur-sm border-b border-gray-200 px-4 sm:px-6 lg:px-8 py-3 items-center gap-3">
        <Link
          href="/"
          className="inline-flex items-center gap-1 text-sm font-medium text-gray-600 hover:text-amber-700 transition-colors"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
          </svg>
          Back to map
        </Link>
        <span className="text-sm text-gray-300">|</span>
        <span className="text-sm font-bold tracking-tight text-amber-700">Coffee Club</span>
        <Link
          href="/passport"
          className="ml-auto text-sm font-medium text-amber-700 hover:text-amber-800 transition-colors"
        >
          Your passport →
        </Link>
        <Link
          href="/submit"
          className="text-sm font-medium text-stone-500 hover:text-amber-800 transition-colors"
        >
          Suggest a cafe →
        </Link>
      </div>

      {/* Hero image */}
      <div className="w-full h-64 sm:h-80 md:h-96 bg-gray-200 overflow-hidden">
        <CafeImage src={cafe.imageUrl} name={cafe.name} neighborhood={cafe.neighborhood} variant="hero" loading="eager" />
      </div>

      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 py-8">
        {status !== "OPEN" && (
          <div role="status" className="mb-5 rounded-xl border border-stone-300 bg-stone-100 px-4 py-3 text-sm text-stone-700">
            <strong className="font-semibold">{STATUS_LABELS[status]}.</strong>{" "}
            {status === "CLOSED"
              ? "This cafe has closed. It stays listed so the history (and your passport stamps) are kept."
              : "This cafe is temporarily closed. Check its own channels before you go."}
          </div>
        )}

        {/* Cafe info */}
        <h1 className="text-2xl font-bold text-gray-900 sm:text-3xl">
          {cafe.name}
        </h1>
        <div className="mt-1 flex flex-wrap items-center gap-2">
          <p className="text-gray-500">{cafe.neighborhood}</p>
          <FreshnessBadges status={status} isNew={isNewCafe(cafe.createdAt)} size="md" />
        </div>
        <p className="mt-0.5 text-sm text-gray-400">
          {cafe.address}
          {cafe.region && <span className="text-gray-300"> · </span>}
          {cafe.region && <span>{REGION_LABELS[cafe.region]}</span>}
        </p>

        <div className="mt-4">
          <PassportToggle slug={cafe.slug} name={cafe.name} variant="inline" />
        </div>

        {cafe.curatorVisitedAt && (
          <p className="mt-1 text-xs text-gray-500">Curator visited {formatVisited(cafe.curatorVisitedAt)}</p>
        )}

        {(cafe.submitterName || cafe.addedAt) && (
          <p className="mt-1 text-xs text-gray-400">
            {cafe.submitterName && <>Suggested by {cafe.submitterName}</>}
            {cafe.submitterName && cafe.addedAt && <span className="mx-1.5">·</span>}
            {cafe.addedAt && (
              <>
                Added{" "}
                {new Intl.DateTimeFormat("en-US", {
                  month: "long",
                  year: "numeric",
                }).format(cafe.addedAt)}
              </>
            )}
          </p>
        )}

        {/* Tags */}
        {tags.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-2">
            {tags.map((tag) => (
              <TagBadge key={tag.id} name={tag.name} type={tag.type} />
            ))}
            <HoursBadges hours={status === "OPEN" ? parseWeeklyHours(cafe.hours) : null} />
          </div>
        )}

        <CafeHours
          hours={status === "OPEN" ? parseWeeklyHours(cafe.hours) : null}
          checkedAt={cafe.hoursCheckedAt}
          sourceUrl={cafe.hoursSourceUrl}
          website={cafe.website}
          closed={status !== "OPEN"}
        />

        {/* Description */}
        <p className="mt-6 text-gray-700 leading-relaxed">
          {cafe.description}
        </p>

        {/* Owner review */}
        <section className="mt-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-3">
            Curator&apos;s Note
          </h2>
          <div className="rounded-xl bg-amber-50 border border-amber-100 p-5">
            <p className="text-gray-800 leading-relaxed italic">
              &ldquo;{cafe.ownerReview}&rdquo;
            </p>
          </div>
        </section>

        {/* Community Notes */}
        <CafeDetailNotes cafeId={cafe.id} initialNotes={notes} />
      </div>
    </div>
  );
}
