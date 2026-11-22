"use client";

import { usePassport } from "@/hooks/usePassport";

interface PassportToggleProps {
  slug: string | null;
  name: string;
  /** "overlay": compact icon buttons on a card image. "inline": labeled buttons on the detail page. */
  variant?: "overlay" | "inline";
}

function StampIcon({ filled }: { filled: boolean }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4" fill={filled ? "currentColor" : "none"} stroke="currentColor" strokeWidth={2}>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M8.5 12.5l2.3 2.3 4.7-5" fill="none" strokeLinecap="round" strokeLinejoin="round" stroke={filled ? "white" : "currentColor"} />
    </svg>
  );
}

function BookmarkIcon({ filled }: { filled: boolean }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4" fill={filled ? "currentColor" : "none"} stroke="currentColor" strokeWidth={2}>
      <path d="M6.5 3.75h11a.75.75 0 0 1 .75.75v15.6a.4.4 0 0 1-.63.33L12 16.5l-5.62 3.93a.4.4 0 0 1-.63-.33V4.5a.75.75 0 0 1 .75-.75z" strokeLinejoin="round" />
    </svg>
  );
}

export default function PassportToggle({ slug, name, variant = "overlay" }: PassportToggleProps) {
  const { passport, toggleVisited, toggleWantToTry } = usePassport();
  if (!slug) return null;
  const visited = Boolean(passport.visited[slug]);
  const wanted = Boolean(passport.wantToTry[slug]);

  // Cards wrap everything in a link; keep these clicks from navigating.
  const guard = (fn: () => void) => (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    fn();
  };

  if (variant === "overlay") {
    const base =
      "h-8 w-8 flex items-center justify-center rounded-full backdrop-blur-sm shadow-md transition-colors";
    return (
      <div className="absolute top-2 left-2 z-10 flex gap-1.5">
        <button
          type="button"
          onClick={guard(() => toggleVisited(slug))}
          aria-pressed={visited}
          aria-label={visited ? `Remove ${name} from your passport` : `Stamp ${name}: been here`}
          title={visited ? "Been here" : "Mark as been here"}
          className={`${base} ${visited ? "bg-amber-600 text-white" : "bg-white/90 text-stone-700 hover:text-amber-700"}`}
        >
          <StampIcon filled={visited} />
        </button>
        {!visited && (
          <button
            type="button"
            onClick={guard(() => toggleWantToTry(slug))}
            aria-pressed={wanted}
            aria-label={wanted ? `Remove ${name} from want to try` : `Save ${name} to want to try`}
            title={wanted ? "Want to try" : "Save to want to try"}
            className={`${base} ${wanted ? "bg-stone-900 text-white" : "bg-white/90 text-stone-700 hover:text-amber-700"}`}
          >
            <BookmarkIcon filled={wanted} />
          </button>
        )}
      </div>
    );
  }

  const pill = "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium transition-colors border";
  return (
    <div className="flex flex-wrap gap-2">
      <button
        type="button"
        onClick={() => toggleVisited(slug)}
        aria-pressed={visited}
        className={`${pill} ${visited ? "bg-amber-600 border-amber-600 text-white" : "bg-white border-stone-300 text-stone-700 hover:border-amber-500 hover:text-amber-700"}`}
      >
        <StampIcon filled={visited} />
        {visited ? "Been here" : "Mark as been here"}
      </button>
      {!visited && (
        <button
          type="button"
          onClick={() => toggleWantToTry(slug)}
          aria-pressed={wanted}
          className={`${pill} ${wanted ? "bg-stone-900 border-stone-900 text-white" : "bg-white border-stone-300 text-stone-700 hover:border-stone-500"}`}
        >
          <BookmarkIcon filled={wanted} />
          {wanted ? "Want to try" : "Save to want to try"}
        </button>
      )}
    </div>
  );
}
