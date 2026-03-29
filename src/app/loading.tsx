export default function HomeLoading() {
  return (
    <div className="relative" style={{ height: "calc(100vh - 3.5rem)" }}>
      {/* Map skeleton */}
      <div className="absolute inset-0 bg-gray-200 animate-pulse" />

      {/* Filter panel skeleton — top-left */}
      <div className="absolute top-4 left-4 z-10">
        <div className="h-10 w-28 bg-white/80 rounded-lg shadow-md" />
      </div>

      {/* Cafe list panel skeleton — right side */}
      <div className="absolute z-10 lg:top-4 lg:right-4 lg:bottom-4 lg:w-96 bottom-0 left-0 right-0 lg:left-auto max-h-[45vh] lg:max-h-none">
        <div className="h-full bg-white/90 lg:rounded-xl border border-gray-200 shadow-lg overflow-hidden animate-pulse">
          <div className="px-4 py-3 border-b border-gray-200/80">
            <div className="h-4 w-24 bg-gray-200 rounded" />
          </div>
          <div className="p-4 space-y-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className="rounded-xl border border-gray-200 bg-white overflow-hidden"
              >
                <div className="aspect-[16/10] bg-gray-200" />
                <div className="p-4 space-y-2">
                  <div className="h-5 w-3/4 bg-gray-200 rounded" />
                  <div className="h-3 w-1/3 bg-gray-200 rounded" />
                  <div className="h-3 w-full bg-gray-200 rounded" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
