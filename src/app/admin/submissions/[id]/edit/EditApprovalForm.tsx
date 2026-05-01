"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { TAG_CATEGORIES, type TagDisplay } from "@/lib/tag-display";
import type { GeocodeResult } from "@/lib/geocode";

interface EditApprovalFormProps {
  submissionId: string;
  initialName: string;
  /** The submitter's raw address — used as the address field default when the
   * server-side geocode failed. */
  initialAddress: string;
  initialDescription: string;
  initialTagIds: string[];
  /** Server-side geocode result, or null if geocoding failed at page load. */
  initialGeocode: GeocodeResult | null;
  initialGeocodeError: string | null;
  /** DB Tag.name -> Tag.id, for resolving the chip picker. */
  tagsByName: Record<string, string>;
}

export default function EditApprovalForm({
  submissionId,
  initialName,
  initialAddress,
  initialDescription,
  initialTagIds,
  initialGeocode,
  initialGeocodeError,
  tagsByName,
}: EditApprovalFormProps) {
  const router = useRouter();

  const [name, setName] = useState(initialName);
  const [address, setAddress] = useState(
    initialGeocode?.formattedAddress ?? initialAddress
  );
  const [neighborhood, setNeighborhood] = useState(
    initialGeocode?.neighborhood ?? ""
  );
  const [description, setDescription] = useState(initialDescription);
  const [imageUrl, setImageUrl] = useState("");
  const [ownerReview, setOwnerReview] = useState("");
  const [selectedTagIds, setSelectedTagIds] = useState<Set<string>>(
    new Set(initialTagIds)
  );

  const [geocode, setGeocode] = useState<GeocodeResult | null>(initialGeocode);
  const [geocodeError, setGeocodeError] = useState<string | null>(
    initialGeocodeError
  );
  const [regeocoding, setRegeocoding] = useState(false);

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [topError, setTopError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const addressIsStale =
    geocode !== null && address.trim() !== geocode.formattedAddress;

  function toggleTag(id: string) {
    setSelectedTagIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function handleRegeocode() {
    setGeocodeError(null);
    setRegeocoding(true);
    try {
      const res = await fetch("/api/admin/geocode", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ address: address.trim() }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setGeocodeError(data?.error ?? `Geocode failed (${res.status}).`);
        setGeocode(null);
        return;
      }
      const result = data?.result as GeocodeResult;
      setGeocode(result);
      setAddress(result.formattedAddress);
      // Pre-fill neighborhood only if the curator hasn't already typed one,
      // so re-geocoding doesn't trample their edit.
      if (!neighborhood.trim() && result.neighborhood) {
        setNeighborhood(result.neighborhood);
      }
    } catch {
      setGeocodeError("Network error during geocode. Try again.");
      setGeocode(null);
    } finally {
      setRegeocoding(false);
    }
  }

  function validateClient(): boolean {
    const e: Record<string, string> = {};
    if (name.trim().length < 2 || name.trim().length > 100) {
      e.name = "Name must be 2–100 characters.";
    }
    if (address.trim().length < 5 || address.trim().length > 200) {
      e.address = "Address must be 5–200 characters.";
    }
    if (
      neighborhood.trim().length < 1 ||
      neighborhood.trim().length > 100
    ) {
      e.neighborhood = "Neighborhood is required.";
    }
    if (description.trim().length < 1 || description.trim().length > 2000) {
      e.description = "Description is required.";
    }
    if (!imageUrl.trim()) {
      e.imageUrl = "Image URL is required.";
    } else {
      try {
        const u = new URL(imageUrl.trim());
        if (u.protocol !== "http:" && u.protocol !== "https:") {
          e.imageUrl = "Image URL must use http or https.";
        }
      } catch {
        e.imageUrl = "Image URL must be a valid URL.";
      }
    }
    if (
      ownerReview.trim().length < 1 ||
      ownerReview.trim().length > 2000
    ) {
      e.ownerReview = "Owner review is required.";
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleApprove(e: React.FormEvent) {
    e.preventDefault();
    setTopError(null);

    if (!geocode) {
      setTopError("Geocode the address before approving.");
      return;
    }
    if (!validateClient()) return;

    setSubmitting(true);
    try {
      const res = await fetch(
        `/api/admin/submissions/${submissionId}/approve`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: name.trim(),
            address: address.trim(),
            latitude: geocode.lat,
            longitude: geocode.lng,
            neighborhood: neighborhood.trim(),
            description: description.trim(),
            imageUrl: imageUrl.trim(),
            ownerReview: ownerReview.trim(),
            tagIds: Array.from(selectedTagIds),
          }),
        }
      );

      const data = await res.json().catch(() => null);

      if (res.status === 200 && data?.cafeId) {
        router.push(`/cafes/${data.cafeId}`);
        return;
      }

      if (res.status === 400 && data?.errors) {
        setErrors(data.errors as Record<string, string>);
        setTopError("Please fix the errors below.");
      } else {
        setTopError(data?.error ?? `Approve failed (${res.status}).`);
      }
    } catch {
      setTopError("Network error. Try again.");
    } finally {
      setSubmitting(false);
    }
  }

  const inputClass =
    "block w-full rounded-lg border border-stone-300 px-3 py-2 text-sm text-stone-900 placeholder:text-stone-400 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none disabled:opacity-50 disabled:cursor-not-allowed";

  const approveDisabled =
    submitting || regeocoding || geocode === null;

  return (
    <form
      onSubmit={handleApprove}
      className="rounded-lg border border-stone-200 bg-white p-5 space-y-5"
    >
      {/* Geocode status banner */}
      {geocode === null ? (
        <div className="rounded-lg bg-red-50 border border-red-200 px-3 py-2.5 text-sm text-red-800">
          <p className="font-medium">Could not geocode this address.</p>
          {geocodeError && <p className="mt-0.5 text-xs">{geocodeError}</p>}
          <p className="mt-1 text-xs">
            Approve is disabled until a valid geocode lands.
          </p>
        </div>
      ) : addressIsStale ? (
        <div className="rounded-lg bg-amber-50 border border-amber-200 px-3 py-2.5 text-xs text-amber-800">
          Address has been edited since the last geocode. Click{" "}
          <strong>Re-geocode</strong> below to refresh lat/lng before approving,
          or the cafe will be plotted at the old coordinates.
        </div>
      ) : (
        <div className="rounded-lg bg-emerald-50 border border-emerald-200 px-3 py-2 text-xs text-emerald-800">
          Geocoded ✓ {geocode.lat.toFixed(5)}, {geocode.lng.toFixed(5)} (
          {geocode.locationType.toLowerCase().replace(/_/g, " ")})
        </div>
      )}

      <Field id="name" label="Cafe name" error={errors.name}>
        <input
          id="name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className={inputClass}
          disabled={submitting}
        />
      </Field>

      <Field
        id="address"
        label="Address"
        error={errors.address}
        helper="Edit if needed, then click Re-geocode."
      >
        <div className="flex gap-2">
          <input
            id="address"
            type="text"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            className={`${inputClass} flex-1`}
            disabled={submitting}
          />
          <button
            type="button"
            onClick={handleRegeocode}
            disabled={submitting || regeocoding}
            className="shrink-0 inline-flex items-center rounded-lg border border-stone-300 bg-white px-3 py-2 text-xs font-medium text-stone-700 hover:bg-stone-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {regeocoding ? "Geocoding..." : "Re-geocode"}
          </button>
        </div>
      </Field>

      <Field
        id="neighborhood"
        label="Neighborhood"
        helper="Auto-filled from Google when available — edit freely."
        error={errors.neighborhood}
      >
        <input
          id="neighborhood"
          type="text"
          value={neighborhood}
          onChange={(e) => setNeighborhood(e.target.value)}
          className={inputClass}
          disabled={submitting}
          placeholder="e.g. West Loop, Andersonville, Wicker Park"
        />
      </Field>

      <Field
        id="description"
        label="Description"
        helper="Public-facing summary. Pre-filled from the submitter's note — refine into curator voice."
        error={errors.description}
      >
        <textarea
          id="description"
          rows={3}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className={`${inputClass} resize-y`}
          disabled={submitting}
        />
      </Field>

      <Field
        id="imageUrl"
        label="Image URL"
        helper="Direct image link (jpg/png/webp). Real photo of the actual cafe — see CLAUDE.md for the rules."
        error={errors.imageUrl}
      >
        <input
          id="imageUrl"
          type="url"
          value={imageUrl}
          onChange={(e) => setImageUrl(e.target.value)}
          placeholder="https://…"
          className={inputClass}
          disabled={submitting}
        />
      </Field>

      <Field
        id="ownerReview"
        label="Curator's note"
        helper="Your take on the cafe in your own voice — renders italicized in the amber box on the detail page."
        error={errors.ownerReview}
      >
        <textarea
          id="ownerReview"
          rows={4}
          value={ownerReview}
          onChange={(e) => setOwnerReview(e.target.value)}
          className={`${inputClass} resize-y`}
          disabled={submitting}
        />
      </Field>

      <div>
        <span className="block text-sm font-medium text-gray-700 mb-2">
          Tags
        </span>
        <div className="space-y-3">
          {TAG_CATEGORIES.map((cat, i) => {
            const prev = TAG_CATEGORIES[i - 1];
            const needsDivider =
              prev && prev.kind === "AMENITY" && cat.kind === "VIBE";
            return (
              <div key={cat.title}>
                {needsDivider && <div className="h-px bg-stone-100 my-3" />}
                <TagGroup
                  title={cat.title}
                  tags={cat.tags}
                  tagsByName={tagsByName}
                  selected={selectedTagIds}
                  onToggle={toggleTag}
                  disabled={submitting}
                />
              </div>
            );
          })}
        </div>
      </div>

      {topError && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">
          {topError}
        </div>
      )}

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={approveDisabled}
          className="inline-flex items-center rounded-lg bg-amber-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-amber-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {submitting ? "Approving..." : "Approve & publish"}
        </button>
        {geocode === null && (
          <span className="text-xs text-stone-500">
            (Approve disabled until geocode lands)
          </span>
        )}
      </div>
    </form>
  );
}

function Field({
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
      <label
        htmlFor={id}
        className="block text-sm font-medium text-gray-700 mb-1"
      >
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

function TagGroup({
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
      <h3 className="text-[10px] font-semibold text-stone-400 uppercase tracking-widest mb-1.5">
        {title}
      </h3>
      <div className="flex flex-wrap gap-1.5">
        {renderable.map((tag) => {
          const isSelected = selected.has(tag.id);
          return (
            <button
              key={tag.id}
              type="button"
              onClick={() => onToggle(tag.id)}
              disabled={disabled}
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
