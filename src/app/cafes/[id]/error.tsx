"use client";

export default function CafeDetailError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 py-20 text-center">
      <div className="text-4xl mb-4">&#9888;&#65039;</div>
      <h2 className="text-xl font-semibold text-gray-900 mb-2">
        Something went wrong
      </h2>
      <p className="text-gray-500 mb-6">
        We couldn&apos;t load this cafe. Please try again.
      </p>
      <button
        onClick={reset}
        className="inline-flex items-center rounded-lg bg-amber-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-amber-700 transition-colors"
      >
        Try again
      </button>
    </div>
  );
}
