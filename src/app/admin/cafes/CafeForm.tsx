"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { TAG_CATEGORIES } from "@/lib/tag-display";
import type { GeocodeResult } from "@/lib/geocode";
import { Field, TagGroup, adminInputClass } from "../AdminFormParts";

export interface CafeFormValues {
  name: string;
  address: string;
  latitude: number | null;
  longitude: number | null;
  neighborhood: string;
  description: string;
  imageUrl: string;
  ownerReview: string;
  tagIds: string[];
  status: "OPEN" | "TEMPORARILY_CLOSED" | "CLOSED";
  /** YYYY-MM-DD or "". */
  curatorVisitedAt: string;
}

interface CafeFormProps {
  /** Present when editing an existing cafe. */
  cafeId?: string;
  slug?: string | null;
  initial: CafeFormValues;
  /** DB Tag.name -> Tag.id, for the chip picker. */
  tagsByName: Record<string, string>;
}

export default function CafeForm({ cafeId, slug, initial, tagsByName }: CafeFormProps) {
  const router = useRouter();
  const isEdit = Boolean(cafeId);

  const [name, setName] = useState(initial.name);
  const [address, setAddress] = useState(initial.address);
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(
    initial.latitude != null && initial.longitude != null ? { lat: initial.latitude, lng: initial.longitude } : null
  );
  // The address the current coordinates belong to. Saving is blocked while the
  // address differs, so a pin can't silently drift from its address.
  const [geocodedFor, setGeocodedFor] = useState(isEdit ? initial.address.trim() : "");
  const [neighborhood, setNeighborhood] = useState(initial.neighborhood);
  const [description, setDescription] = useState(initial.description);
  const [imageUrl, setImageUrl] = useState(initial.imageUrl);
  const [ownerReview, setOwnerReview] = useState(initial.ownerReview);
  const [selectedTagIds, setSelectedTagIds] = useState<Set<string>>(new Set(initial.tagIds));
  const [status, setStatus] = useState(initial.status);
  const [curatorVisitedAt, setCuratorVisitedAt] = useState(initial.curatorVisitedAt);

  const [geocoding, setGeocoding] = useState(false);
  const [geocodeNote, setGeocodeNote] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [topError, setTopError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const addressIsStale = !coords || address.trim() !== geocodedFor;

  function toggleTag(id: string) {
    setSelectedTagIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function handleGeocode() {
    setGeocodeNote(null);
    setGeocoding(true);
    try {
      const res = await fetch("/api/admin/geocode", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ address: address.trim() }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setGeocodeNote(data?.error ?? `Geocode failed (${res.status}).`);
        return;
      }
      const result = data?.result as GeocodeResult;
      setCoords({ lat: result.lat, lng: result.lng });
      setAddress(result.formattedAddress);
      setGeocodedFor(result.formattedAddress.trim());
      if (!neighborhood.trim() && result.neighborhood) setNeighborhood(result.neighborhood);
    } catch {
      setGeocodeNote("Network error during geocode. Try again.");
    } finally {
      setGeocoding(false);
    }
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setTopError(null);
    setErrors({});
    if (addressIsStale || !coords) {
      setTopError("Geocode the address before saving.");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(isEdit ? `/api/admin/cafes/${cafeId}` : "/api/admin/cafes", {
        method: isEdit ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          address,
          latitude: coords.lat,
          longitude: coords.lng,
          neighborhood,
          description,
          imageUrl,
          ownerReview,
          tagIds: Array.from(selectedTagIds),
          status,
          curatorVisitedAt,
        }),
      });
      const data = await res.json().catch(() => null);
      if (res.ok && data?.cafeId) {
        router.push(`/admin/cafes?saved=${encodeURIComponent(data.slug ?? data.cafeId)}`);
        router.refresh();
        return;
      }
      if (res.status === 400 && data?.errors) {
        setErrors(data.errors as Record<string, string>);
        setTopError("Fix the highlighted fields.");
        return;
      }
      setTopError(data?.error ?? `Save failed (${res.status}).`);
    } catch {
      setTopError("Network error. Try again.");
    } finally {
      setSaving(false);
    }
  }

  const disabled = saving || geocoding;

  return (
    <form onSubmit={handleSave} className="rounded-lg border border-stone-200 bg-white p-5 space-y-5">
      {isEdit && slug && (
        <p className="text-xs text-stone-500">
          Public URL: <code className="text-stone-700">/cafes/{slug}</code> (never changes)
        </p>
      )}

      <Field id="name" label="Cafe name" error={errors.name}>
        <input id="name" type="text" value={name} onChange={(e) => setName(e.target.value)} className={adminInputClass} disabled={disabled} />
      </Field>

      <Field
        id="address"
        label="Address"
        error={errors.address ?? errors.latitude ?? errors.longitude}
        helper={
          addressIsStale
            ? "Geocode this address before saving."
            : `Geocoded: ${coords!.lat.toFixed(5)}, ${coords!.lng.toFixed(5)}`
        }
      >
        <div className="flex gap-2">
          <input
            id="address"
            type="text"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            className={`${adminInputClass} flex-1`}
            disabled={disabled}
          />
          <button
            type="button"
            onClick={handleGeocode}
            disabled={disabled || address.trim().length < 5}
            className="shrink-0 inline-flex items-center rounded-lg border border-stone-300 bg-white px-3 py-2 text-xs font-medium text-stone-700 hover:bg-stone-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {geocoding ? "Geocoding..." : "Geocode"}
          </button>
        </div>
        {geocodeNote && <p className="mt-1 text-xs text-red-600">{geocodeNote}</p>}
      </Field>

      <Field id="neighborhood" label="Neighborhood or suburb" error={errors.neighborhood}>
        <input
          id="neighborhood"
          type="text"
          value={neighborhood}
          onChange={(e) => setNeighborhood(e.target.value)}
          className={adminInputClass}
          disabled={disabled}
          placeholder="e.g. Andersonville, Evanston"
        />
      </Field>

      <Field id="description" label="Description" helper="Short and factual." error={errors.description}>
        <textarea id="description" rows={3} value={description} onChange={(e) => setDescription(e.target.value)} className={`${adminInputClass} resize-y`} disabled={disabled} />
      </Field>

      <Field
        id="imageUrl"
        label="Image URL (optional)"
        helper="Real photo of the actual cafe (official site, official Instagram, or a reputable publication). Leave empty to show the placeholder."
        error={errors.imageUrl}
      >
        <input id="imageUrl" type="url" value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} placeholder="https://…" className={adminInputClass} disabled={disabled} />
      </Field>

      <div className="grid gap-5 sm:grid-cols-2">
        <Field id="status" label="Status" helper="Closed cafes stay listed with a label." error={errors.status}>
          <select
            id="status"
            value={status}
            onChange={(e) => setStatus(e.target.value as CafeFormValues["status"])}
            className={adminInputClass}
            disabled={disabled}
          >
            <option value="OPEN">Open</option>
            <option value="TEMPORARILY_CLOSED">Temporarily closed</option>
            <option value="CLOSED">Closed</option>
          </select>
        </Field>
        <Field id="curatorVisitedAt" label="Curator last visited" helper="Leave empty if you haven't visited." error={errors.curatorVisitedAt}>
          <input
            id="curatorVisitedAt"
            type="date"
            value={curatorVisitedAt}
            onChange={(e) => setCuratorVisitedAt(e.target.value)}
            className={adminInputClass}
            disabled={disabled}
          />
        </Field>
      </div>

      <Field id="ownerReview" label="Curator's note" error={errors.ownerReview}>
        <textarea id="ownerReview" rows={4} value={ownerReview} onChange={(e) => setOwnerReview(e.target.value)} className={`${adminInputClass} resize-y`} disabled={disabled} />
      </Field>

      <div>
        <span className="block text-sm font-medium text-gray-700 mb-2">Tags</span>
        <div className="space-y-3">
          {TAG_CATEGORIES.map((cat, i) => {
            const prev = TAG_CATEGORIES[i - 1];
            const needsDivider = prev && prev.kind === "AMENITY" && cat.kind === "VIBE";
            return (
              <div key={cat.title}>
                {needsDivider && <div className="h-px bg-stone-100 my-3" />}
                <TagGroup title={cat.title} tags={cat.tags} tagsByName={tagsByName} selected={selectedTagIds} onToggle={toggleTag} disabled={disabled} />
              </div>
            );
          })}
        </div>
        {errors.tagIds && <p className="mt-1 text-xs text-red-600">{errors.tagIds}</p>}
      </div>

      {topError && <div className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">{topError}</div>}

      <button
        type="submit"
        disabled={disabled || addressIsStale}
        className="inline-flex items-center rounded-lg bg-amber-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-amber-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {saving ? "Saving..." : isEdit ? "Save changes" : "Create cafe"}
      </button>
    </form>
  );
}
