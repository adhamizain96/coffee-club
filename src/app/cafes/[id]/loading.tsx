export default function CafeDetailLoading() {
  return (
    <div className="animate-pulse">
      {/* Hero image skeleton */}
      <div className="w-full h-64 sm:h-80 md:h-96 bg-stone-200" />

      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Title / neighborhood / address */}
        <div>
          <div className="h-8 w-64 bg-stone-200 rounded" />
          <div className="mt-2 h-4 w-32 bg-stone-200 rounded" />
          <div className="mt-1 h-3 w-48 bg-stone-200 rounded" />
        </div>

        {/* Tags */}
        <div className="flex gap-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-6 w-20 bg-stone-200 rounded-full" />
          ))}
        </div>

        {/* Description */}
        <div className="space-y-2">
          <div className="h-4 w-full bg-stone-200 rounded" />
          <div className="h-4 w-5/6 bg-stone-200 rounded" />
          <div className="h-4 w-2/3 bg-stone-200 rounded" />
        </div>

        {/* Curator's note */}
        <div>
          <div className="h-5 w-32 bg-stone-200 rounded mb-3" />
          <div className="rounded-xl bg-stone-100 p-5 space-y-2">
            <div className="h-4 w-full bg-stone-200 rounded" />
            <div className="h-4 w-5/6 bg-stone-200 rounded" />
            <div className="h-4 w-3/4 bg-stone-200 rounded" />
          </div>
        </div>

        {/* Notes */}
        <div>
          <div className="h-5 w-40 bg-stone-200 rounded mb-4" />
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="mb-4 rounded-lg bg-stone-100 p-4 space-y-2"
            >
              <div className="h-3 w-full bg-stone-200 rounded" />
              <div className="h-3 w-4/5 bg-stone-200 rounded" />
              <div className="h-3 w-24 bg-stone-200 rounded mt-3" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
