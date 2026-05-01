import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import SubmitForm from "./SubmitForm";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Suggest a cafe — Coffee Club",
  description:
    "Know a Chicagoland cafe we should add? Submit it for review.",
};

export default async function SubmitPage() {
  const tags = await prisma.tag.findMany({ select: { id: true, name: true } });
  const tagsByName: Record<string, string> = Object.fromEntries(
    tags.map((t) => [t.name, t.id])
  );

  return (
    <div>
      {/* Mobile (below lg): floating pill pair — matches cafes/[id] header */}
      <div className="lg:hidden fixed top-3 left-3 right-3 z-40">
        <div className="max-w-md mx-auto flex items-center justify-between gap-2">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 rounded-xl bg-white/95 backdrop-blur-md border border-stone-200/60 shadow-lg px-3.5 py-2 text-sm font-medium text-stone-700 hover:bg-white hover:text-amber-700 transition-colors"
          >
            <svg
              className="h-3.5 w-3.5"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2}
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M15.75 19.5 8.25 12l7.5-7.5"
              />
            </svg>
            Back to map
          </Link>
          <span className="inline-flex items-center gap-2 rounded-xl bg-white/95 backdrop-blur-md border border-stone-200/60 shadow-lg px-3.5 py-2 text-sm font-semibold tracking-tight text-stone-900">
            <span className="flex items-center justify-center h-5 w-5 rounded-md bg-amber-100 shrink-0">
              <svg
                className="h-3 w-3 text-amber-700"
                viewBox="0 0 24 24"
                fill="currentColor"
              >
                <path d="M2 21V17H4V10C4 7.83 4.87 5.93 6.26 4.57L7.67 5.98C6.63 7 6 8.42 6 10V17H11V3H13V7H18C19.1 7 20 7.9 20 9V12C20 13.1 19.1 14 18 14H13V17H18V21H2ZM13 12H18V9H13V12Z" />
              </svg>
            </span>
            Coffee Club
          </span>
        </div>
      </div>

      {/* Desktop (lg+): sticky bar */}
      <div className="hidden lg:flex sticky top-0 z-40 bg-white/80 backdrop-blur-sm border-b border-gray-200 px-4 sm:px-6 lg:px-8 py-3 items-center gap-3">
        <Link
          href="/"
          className="inline-flex items-center gap-1 text-sm font-medium text-gray-600 hover:text-amber-700 transition-colors"
        >
          <svg
            className="h-4 w-4"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={2}
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M15.75 19.5 8.25 12l7.5-7.5"
            />
          </svg>
          Back to map
        </Link>
        <span className="text-sm text-gray-300">|</span>
        <span className="text-sm font-bold tracking-tight text-amber-700">
          Coffee Club
        </span>
      </div>

      <div className="mx-auto max-w-2xl px-4 sm:px-6 lg:px-8 pt-20 pb-12 lg:pt-10">
        <h1 className="text-2xl font-bold text-gray-900 sm:text-3xl">
          Suggest a cafe
        </h1>
        <p className="mt-3 text-base text-gray-700 leading-relaxed">
          Know a Chicagoland cafe we should add? Tell us about it. Submissions
          go into a review queue — we add approved cafes to the map within a
          few weeks.{" "}
          <strong className="font-semibold text-gray-900">
            No email is collected
          </strong>{" "}
          and we don&apos;t send notifications, so keep an eye on the map if
          you&apos;re curious whether yours made it.
        </p>

        <div className="mt-8">
          <SubmitForm tagsByName={tagsByName} />
        </div>
      </div>
    </div>
  );
}
