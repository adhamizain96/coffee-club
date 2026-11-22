import { useEffect, useRef } from "react";
import Link from "next/link";
import TagBadge from "./TagBadge";
import CafeImage from "./CafeImage";
import FreshnessBadges from "./FreshnessBadges";
import PassportToggle from "./PassportToggle";
import { HoursBadges, HoursStatusLine } from "./HoursStatus";
import type { WeeklyHours } from "@/lib/hours";
import type { CafeStatusValue } from "@/lib/freshness";
import type { TagDTO } from "@/lib/types";

interface CafeCardProps {
  id: string;
  /** Public URL key; falls back to id for rows not yet backfilled. */
  slug: string | null;
  name: string;
  neighborhood: string;
  imageUrl: string | null;
  status: CafeStatusValue;
  isNew: boolean;
  hours: WeeklyHours | null;
  description: string;
  tags: TagDTO[];
  isHighlighted?: boolean;
  /**
   * - "pan"      → tapping the card body calls `onCardClick` (desktop pan-on-click).
   * - "navigate" → tapping the card body navigates to /cafes/[id] (mobile default).
   */
  mode?: "pan" | "navigate";
  onCardClick?: (cafeId: string) => void;
  /** When provided, renders a small map-pin icon button. Tapping it calls this handler instead of navigating. */
  onPinClick?: (cafeId: string) => void;
}

export default function CafeCard({
  id,
  slug,
  name,
  neighborhood,
  imageUrl,
  status,
  isNew,
  hours,
  description,
  tags,
  isHighlighted,
  mode = "pan",
  onCardClick,
  onPinClick,
}: CafeCardProps) {
  // Self-scroll into view when this card becomes the highlighted one. This
  // owns the scroll behavior locally instead of having the parent juggle a
  // ref-per-card map (which trips react-hooks/refs on render).
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (isHighlighted) {
      ref.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [isHighlighted]);

  return (
    <div
      ref={ref}
      className={`relative group block rounded-2xl overflow-hidden transition-all duration-200 ${
        isHighlighted
          ? "ring-2 ring-amber-400 shadow-lg bg-white"
          : "bg-white hover:shadow-md"
      }`}
    >
      <Link
        href={`/cafes/${slug ?? id}`}
        onClick={(e) => {
          if (mode === "pan" && onCardClick) {
            e.preventDefault();
            onCardClick(id);
          }
        }}
        className="block"
      >
        <div className="aspect-[16/10] overflow-hidden bg-stone-200">
          <CafeImage
            src={imageUrl}
            name={name}
            neighborhood={neighborhood}
            loading="lazy"
            className={`transition-transform duration-300 group-hover:scale-105 ${status === "CLOSED" ? "grayscale opacity-70" : ""}`}
          />
        </div>

        <div className="p-3.5">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-sm font-semibold text-stone-900 group-hover:text-amber-800 transition-colors line-clamp-1 leading-tight">
              {name}
            </h3>
            <FreshnessBadges status={status} isNew={isNew} />
          </div>

          <p className="text-xs text-stone-400 mt-0.5">{neighborhood}</p>
          <HoursStatusLine hours={hours} className="mt-0.5" />

          <p className="text-xs text-stone-500 line-clamp-2 mt-1.5 leading-relaxed">
            {description}
          </p>

          {tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2.5">
              {tags.map((tag) => (
                <TagBadge key={tag.id} name={tag.name} type={tag.type} />
              ))}
              <HoursBadges hours={hours} />
            </div>
          )}
        </div>
      </Link>

      <PassportToggle slug={slug} name={name} />

      {onPinClick && (
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onPinClick(id);
          }}
          aria-label="Show on map"
          className="absolute top-2 right-2 z-10 h-8 w-8 flex items-center justify-center rounded-full bg-white/90 backdrop-blur-sm text-stone-700 shadow-md hover:bg-white hover:text-amber-700 transition-colors"
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
              d="M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z"
            />
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1 1 15 0Z"
            />
          </svg>
        </button>
      )}
    </div>
  );
}
