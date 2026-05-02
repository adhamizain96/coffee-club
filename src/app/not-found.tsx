import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-20 text-center">
      <div className="text-5xl mb-4">&#9749;</div>
      <h2 className="text-2xl font-bold text-stone-900 mb-2">Page not found</h2>
      <p className="text-stone-500 mb-6">
        We couldn&apos;t find what you&apos;re looking for. It may have been
        moved or doesn&apos;t exist.
      </p>
      <Link
        href="/"
        className="inline-flex items-center rounded-lg bg-amber-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-amber-700 transition-colors"
      >
        Back to all cafes
      </Link>
    </div>
  );
}
