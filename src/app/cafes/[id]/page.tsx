import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import type { TagDTO, NoteDTO } from "@/lib/types";
import Link from "next/link";
import TagBadge from "@/components/TagBadge";
import GoogleReviews from "@/components/GoogleReviews";
import CafeDetailNotes from "./CafeDetailNotes";
import { getGooglePlaceData } from "@/lib/google-places";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const cafe = await prisma.cafe.findUnique({
    where: { id },
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
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const cafe = await prisma.cafe.findUnique({
    where: { id },
    include: {
      tags: { include: { tag: true } },
      notes: { orderBy: { createdAt: "desc" } },
    },
  });

  if (!cafe) {
    notFound();
  }

  const tags: TagDTO[] = cafe.tags.map((ct) => ({
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

  // Fetch Google Places data (rating + reviews) — runs server-side, cached for 1 hour
  const placeData = await getGooglePlaceData(cafe.name, cafe.address);

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
      <div className="hidden lg:flex sticky top-0 z-40 bg-white/80 backdrop-blur-sm border-b border-stone-200 px-4 sm:px-6 lg:px-8 py-3 items-center gap-3">
        <Link
          href="/"
          className="inline-flex items-center gap-1 text-sm font-medium text-stone-600 hover:text-amber-700 transition-colors"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
          </svg>
          Back to map
        </Link>
        <span className="text-sm text-stone-300">|</span>
        <span className="text-sm font-bold tracking-tight text-amber-700">Coffee Club</span>
        <Link
          href="/submit"
          className="ml-auto text-sm font-medium text-amber-700 hover:text-amber-800 transition-colors"
        >
          Suggest a cafe →
        </Link>
      </div>

      {/* Hero image */}
      <div className="w-full h-64 sm:h-80 md:h-96 bg-stone-200 overflow-hidden">
        <img
          src={cafe.imageUrl}
          alt={cafe.name}
          className="w-full h-full object-cover"
        />
      </div>

      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 py-8">
        {/* Cafe info */}
        <h1 className="font-serif text-2xl font-bold text-stone-900 sm:text-3xl">
          {cafe.name}
        </h1>
        <div className="mt-1 flex items-center gap-3">
          <p className="text-stone-500">{cafe.neighborhood}</p>
          {placeData.rating && (
            <span className="inline-flex items-center gap-1 text-sm font-medium text-amber-700 bg-amber-50 rounded-full px-2.5 py-0.5">
              <svg className="h-3.5 w-3.5 text-amber-400" viewBox="0 0 20 20" fill="currentColor">
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
              </svg>
              {placeData.rating.toFixed(1)}
            </span>
          )}
        </div>
        <p className="mt-0.5 text-sm text-stone-400">{cafe.address}</p>

        {(cafe.submitterName || cafe.addedAt) && (
          <p className="mt-1 text-xs text-stone-400">
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
          </div>
        )}

        {/* Description */}
        <p className="mt-6 text-stone-700 leading-relaxed">
          {cafe.description}
        </p>

        {/* Owner review */}
        <section className="mt-8">
          <h2 className="font-serif text-lg font-semibold text-stone-900 mb-3">
            Curator&apos;s Note
          </h2>
          <div className="rounded-xl bg-amber-50 border border-amber-100 p-5">
            <p className="text-stone-800 leading-relaxed italic">
              &ldquo;{cafe.ownerReview}&rdquo;
            </p>
          </div>
        </section>

        {/* Google Reviews */}
        <GoogleReviews placeData={placeData} />

        {/* Community Notes */}
        <CafeDetailNotes cafeId={cafe.id} initialNotes={notes} />
      </div>
    </div>
  );
}
