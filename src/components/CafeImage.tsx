"use client";

import { useCallback, useState } from "react";

interface CafeImageProps {
  src: string | null;
  name: string;
  neighborhood: string;
  className?: string;
  loading?: "lazy" | "eager";
  /** "hero" renders a larger placeholder for the detail page. */
  variant?: "card" | "hero";
}

/**
 * Cafe photo with a designed placeholder for cafes without a photo, or whose
 * hotlinked image fails. Cafe photos are third-party URLs, so they're
 * intentionally plain <img> rather than next/image.
 */
export default function CafeImage({ src, name, neighborhood, className = "", loading, variant = "card" }: CafeImageProps) {
  // Track which src failed, so a new src automatically gets a fresh attempt.
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  const failed = src !== null && failedSrc === src;

  // An image can fail before hydration attaches onError; the ref callback
  // catches that case when the element mounts.
  const imgRef = useCallback(
    (img: HTMLImageElement | null) => {
      if (img && img.complete && img.naturalWidth === 0) setFailedSrc(img.getAttribute("src"));
    },
    []
  );

  if (!src || failed) {
    const initial = name.trim().charAt(0).toUpperCase() || "C";
    const hero = variant === "hero";
    return (
      <div
        role="img"
        aria-label={`${name}, ${neighborhood} (no photo yet)`}
        className={`relative flex h-full w-full flex-col items-center justify-center overflow-hidden bg-gradient-to-br from-amber-50 via-stone-100 to-stone-200 ${className}`}
      >
        <svg
          aria-hidden="true"
          viewBox="0 0 24 24"
          fill="currentColor"
          className={`absolute text-amber-900/[0.06] ${hero ? "h-72 w-72 -right-10 -bottom-16" : "h-40 w-40 -right-6 -bottom-10"}`}
        >
          <path d="M2 21V17H4V10C4 7.83 4.87 5.93 6.26 4.57L7.67 5.98C6.63 7 6 8.42 6 10V17H11V3H13V7H18C19.1 7 20 7.9 20 9V12C20 13.1 19.1 14 18 14H13V17H18V21H2ZM13 12H18V9H13V12Z" />
        </svg>
        <span
          aria-hidden="true"
          className={`font-serif font-semibold text-amber-800/80 leading-none ${hero ? "text-7xl" : "text-5xl"}`}
        >
          {initial}
        </span>
        <span aria-hidden="true" className={`mt-2 font-medium uppercase tracking-[0.2em] text-stone-500 ${hero ? "text-xs" : "text-[10px]"}`}>
          {neighborhood}
        </span>
      </div>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element -- third-party hotlinked photos
    <img
      ref={imgRef}
      src={src}
      alt={name}
      loading={loading}
      onError={() => setFailedSrc(src)}
      className={`h-full w-full object-cover ${className}`}
    />
  );
}
