import { forwardRef } from "react";
import Link from "next/link";
import TagBadge from "./TagBadge";
import type { TagDTO } from "@/lib/types";

interface CafeCardProps {
  id: string;
  name: string;
  neighborhood: string;
  imageUrl: string;
  description: string;
  tags: TagDTO[];
  isHighlighted?: boolean;
  onCardClick?: (cafeId: string) => void;
  rating?: number | null;
}

const CafeCard = forwardRef<HTMLAnchorElement, CafeCardProps>(function CafeCard(
  { id, name, neighborhood, imageUrl, description, tags, isHighlighted, onCardClick, rating },
  ref
) {
  return (
    <Link
      ref={ref}
      href={`/cafes/${id}`}
      onClick={(e) => {
        if (onCardClick) {
          e.preventDefault();
          onCardClick(id);
        }
      }}
      className={`group block rounded-2xl overflow-hidden transition-all duration-200 ${
        isHighlighted
          ? "ring-2 ring-amber-400 shadow-lg bg-white"
          : "bg-white hover:shadow-md"
      }`}
    >
      <div className="aspect-[16/10] overflow-hidden bg-stone-200">
        <img
          src={imageUrl}
          alt={name}
          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
          loading="lazy"
        />
      </div>

      <div className="p-3.5">
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-sm font-semibold text-stone-900 group-hover:text-amber-800 transition-colors line-clamp-1 leading-tight">
            {name}
          </h3>
          {rating != null && (
            <span className="inline-flex items-center gap-1 shrink-0 text-xs font-medium text-amber-700 bg-amber-50 rounded-full px-2 py-0.5">
              <svg className="h-3 w-3 text-amber-400" viewBox="0 0 20 20" fill="currentColor">
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
              </svg>
              {rating.toFixed(1)}
            </span>
          )}
        </div>

        <p className="text-xs text-stone-400 mt-0.5">{neighborhood}</p>

        <p className="text-xs text-stone-500 line-clamp-2 mt-1.5 leading-relaxed">
          {description}
        </p>

        {tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2.5">
            {tags.map((tag) => (
              <TagBadge key={tag.id} name={tag.name} type={tag.type} />
            ))}
          </div>
        )}
      </div>
    </Link>
  );
});

export default CafeCard;
