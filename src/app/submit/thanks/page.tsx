import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Thanks — Coffee Club",
  description: "Your cafe suggestion is in the queue.",
};

export default function ThanksPage() {
  return (
    <div>
      {/* Mobile (below lg): floating pill pair */}
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

      <div className="mx-auto max-w-xl px-4 sm:px-6 lg:px-8 pt-20 pb-12 lg:pt-16">
        <div className="rounded-2xl bg-amber-50 border border-amber-100 p-6 sm:p-8">
          <div className="flex items-center gap-2.5 mb-3">
            <span className="flex items-center justify-center h-8 w-8 rounded-lg bg-amber-100">
              <svg
                className="h-4 w-4 text-amber-700"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={2.5}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="m4.5 12.75 6 6 9-13.5"
                />
              </svg>
            </span>
            <h1 className="text-xl font-bold text-gray-900 sm:text-2xl">
              Thanks!
            </h1>
          </div>
          <p className="text-base text-gray-700 leading-relaxed">
            Your suggestion is in the queue. Approved cafes get added to the
            map within a few weeks. We don&apos;t send confirmation emails —
            check the map if you&apos;re curious whether yours made it.
          </p>
        </div>

        <div className="mt-6">
          <Link
            href="/"
            className="inline-flex items-center rounded-lg bg-amber-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-amber-700 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2 transition-colors"
          >
            Back to the map
          </Link>
        </div>
      </div>
    </div>
  );
}
