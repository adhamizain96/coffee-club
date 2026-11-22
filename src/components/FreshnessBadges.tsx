import { STATUS_LABELS, type CafeStatusValue } from "@/lib/freshness";

/** "New" and non-open status pills, shared by cards, the map popup, and the detail page. */
export default function FreshnessBadges({
  status,
  isNew,
  size = "sm",
}: {
  status: CafeStatusValue;
  isNew: boolean;
  size?: "sm" | "md";
}) {
  const pad = size === "md" ? "px-2.5 py-0.5 text-xs" : "px-2 py-0.5 text-[10px]";
  return (
    <>
      {status !== "OPEN" && (
        <span className={`inline-flex items-center shrink-0 rounded-full bg-stone-800 font-semibold uppercase tracking-wide text-white ${pad}`}>
          {STATUS_LABELS[status]}
        </span>
      )}
      {isNew && status === "OPEN" && (
        <span className={`inline-flex items-center shrink-0 rounded-full bg-amber-100 font-semibold uppercase tracking-wide text-amber-800 ${pad}`}>
          New
        </span>
      )}
    </>
  );
}
