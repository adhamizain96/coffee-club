// Small form building blocks shared by the admin approve and cafe forms.

import type { TagDisplay } from "@/lib/tag-display";

export const adminInputClass =
  "block w-full rounded-lg border border-stone-300 px-3 py-2 text-sm text-stone-900 placeholder:text-stone-400 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none disabled:opacity-50 disabled:cursor-not-allowed";

export function Field({
  id,
  label,
  helper,
  error,
  children,
}: {
  id: string;
  label: React.ReactNode;
  helper?: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium text-gray-700 mb-1">
        {label}
      </label>
      {children}
      {error ? (
        <p className="mt-1 text-xs text-red-600">{error}</p>
      ) : helper ? (
        <p className="mt-1 text-xs text-gray-500">{helper}</p>
      ) : null}
    </div>
  );
}

export function TagGroup({
  title,
  tags,
  tagsByName,
  selected,
  onToggle,
  disabled,
}: {
  title: string;
  tags: ReadonlyArray<TagDisplay>;
  tagsByName: Record<string, string>;
  selected: Set<string>;
  onToggle: (id: string) => void;
  disabled: boolean;
}) {
  const renderable = tags
    .map((t) => ({ id: tagsByName[t.name], label: t.label }))
    .filter((t): t is { id: string; label: string } => Boolean(t.id));

  if (renderable.length === 0) return null;

  return (
    <div>
      <h3 className="text-[10px] font-semibold text-stone-400 uppercase tracking-widest mb-1.5">{title}</h3>
      <div className="flex flex-wrap gap-1.5">
        {renderable.map((tag) => {
          const isSelected = selected.has(tag.id);
          return (
            <button
              key={tag.id}
              type="button"
              onClick={() => onToggle(tag.id)}
              disabled={disabled}
              aria-pressed={isSelected}
              className={`rounded-full px-2.5 py-1 text-xs font-medium transition-all duration-150 disabled:opacity-50 ${
                isSelected
                  ? "bg-stone-900 text-white shadow-sm"
                  : "bg-stone-100 text-stone-600 hover:bg-stone-200 hover:text-stone-800"
              }`}
            >
              {tag.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
