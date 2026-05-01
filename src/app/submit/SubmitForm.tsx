"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { TAG_CATEGORIES, type TagDisplay } from "@/lib/tag-display";

const CAFE_NAME_MAX = 100;
const ADDRESS_MAX = 200;
const WHY_MAX = 280;
const SUBMITTER_NAME_MAX = 50;

interface SubmitFormProps {
  /** Map of DB Tag.name → Tag.id, fetched server-side. */
  tagsByName: Record<string, string>;
}

export default function SubmitForm({ tagsByName }: SubmitFormProps) {
  const router = useRouter();

  const [cafeName, setCafeName] = useState("");
  const [address, setAddress] = useState("");
  const [website, setWebsite] = useState("");
  const [whyYouLikeIt, setWhyYouLikeIt] = useState("");
  const [submitterName, setSubmitterName] = useState("");
  const [companyName, setCompanyName] = useState(""); // honeypot
  const [selectedTagIds, setSelectedTagIds] = useState<Set<string>>(new Set());

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [topError, setTopError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const whyOverLimit = whyYouLikeIt.length > WHY_MAX;

  function toggleTag(id: string) {
    setSelectedTagIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function validateClient(): boolean {
    const e: Record<string, string> = {};
    const cafeNameTrim = cafeName.trim();
    if (cafeNameTrim.length < 2 || cafeNameTrim.length > CAFE_NAME_MAX) {
      e.cafeName = `Cafe name must be 2–${CAFE_NAME_MAX} characters.`;
    }
    const addressTrim = address.trim();
    if (addressTrim.length < 5 || addressTrim.length > ADDRESS_MAX) {
      e.address = `Address must be 5–${ADDRESS_MAX} characters.`;
    }
    if (!website.trim()) {
      e.website = "Website is required.";
    }
    if (whyOverLimit) {
      e.whyYouLikeIt = `Keep it under ${WHY_MAX} characters.`;
    }
    const nameTrim = submitterName.trim();
    if (nameTrim.length < 1 || nameTrim.length > SUBMITTER_NAME_MAX) {
      e.submitterName = `Name must be 1–${SUBMITTER_NAME_MAX} characters.`;
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setTopError(null);

    if (!validateClient()) {
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/submissions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cafeName: cafeName.trim(),
          address: address.trim(),
          website: website.trim(),
          whyYouLikeIt: whyYouLikeIt.trim() || undefined,
          suggestedTagIds: Array.from(selectedTagIds),
          submitterName: submitterName.trim(),
          companyName, // honeypot — server reads this
        }),
      });

      if (res.status === 201) {
        router.push("/submit/thanks");
        return;
      }

      // Honeypot success path is also a 200 — treat it the same so bots get
      // no signal from us either.
      if (res.status === 200) {
        router.push("/submit/thanks");
        return;
      }

      const data = await res.json().catch(() => null);

      if (res.status === 400 && data?.errors) {
        setErrors(data.errors as Record<string, string>);
        setTopError("Please fix the errors below.");
      } else if (res.status === 409) {
        setTopError(data?.error ?? "This cafe has already been suggested.");
      } else if (res.status === 429) {
        setTopError(
          data?.error ?? "Too many submissions. Try again later."
        );
      } else {
        setTopError(data?.error ?? "Something went wrong. Try again.");
      }
    } catch {
      setTopError("Network error. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  const inputClass =
    "block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none disabled:opacity-50 disabled:cursor-not-allowed";

  return (
    <form onSubmit={handleSubmit} className="space-y-5" noValidate>
      <Field
        id="cafeName"
        label="Cafe name"
        error={errors.cafeName}
      >
        <input
          id="cafeName"
          type="text"
          value={cafeName}
          onChange={(e) => setCafeName(e.target.value)}
          maxLength={CAFE_NAME_MAX + 20}
          className={inputClass}
          disabled={submitting}
          autoComplete="off"
        />
      </Field>

      <Field
        id="address"
        label="Address"
        helper="Full street address — we'll geocode on approval."
        error={errors.address}
      >
        <input
          id="address"
          type="text"
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          maxLength={ADDRESS_MAX + 20}
          className={inputClass}
          disabled={submitting}
          autoComplete="off"
        />
      </Field>

      <Field
        id="website"
        label="Website"
        helper="Website or social handle (e.g. instagram.com/handle)."
        error={errors.website}
      >
        <input
          id="website"
          type="text"
          value={website}
          onChange={(e) => setWebsite(e.target.value)}
          className={inputClass}
          disabled={submitting}
          autoComplete="off"
        />
      </Field>

      <Field
        id="whyYouLikeIt"
        label={
          <>
            Why you like it{" "}
            <span className="text-gray-400 font-normal">(optional)</span>
          </>
        }
        error={errors.whyYouLikeIt}
      >
        <textarea
          id="whyYouLikeIt"
          rows={3}
          value={whyYouLikeIt}
          onChange={(e) => setWhyYouLikeIt(e.target.value)}
          placeholder="One or two lines on what makes it good."
          className={`${inputClass} resize-y`}
          disabled={submitting}
        />
        <div className="mt-1 flex justify-end">
          <span
            className={`text-xs ${
              whyOverLimit ? "text-red-600 font-medium" : "text-gray-400"
            }`}
          >
            {whyYouLikeIt.length}/{WHY_MAX}
          </span>
        </div>
      </Field>

      <div>
        <span className="block text-sm font-medium text-gray-700 mb-2">
          Suggested tags{" "}
          <span className="text-gray-400 font-normal">(optional)</span>
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

      <Field
        id="submitterName"
        label="Your name"
        helper={"This will appear publicly as “Suggested by [your name]” if your cafe is approved."}
        error={errors.submitterName}
      >
        <input
          id="submitterName"
          type="text"
          value={submitterName}
          onChange={(e) => setSubmitterName(e.target.value)}
          maxLength={SUBMITTER_NAME_MAX + 10}
          className={inputClass}
          disabled={submitting}
          autoComplete="off"
        />
      </Field>

      {/* Honeypot — bots fill this; humans never see it */}
      <input
        type="text"
        name="companyName"
        value={companyName}
        onChange={(e) => setCompanyName(e.target.value)}
        tabIndex={-1}
        aria-hidden="true"
        autoComplete="off"
        className="absolute left-[-9999px] w-px h-px overflow-hidden"
      />

      {topError && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">
          {topError}
        </div>
      )}

      <button
        type="submit"
        disabled={submitting || whyOverLimit}
        className="inline-flex items-center rounded-lg bg-amber-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-amber-700 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {submitting ? "Submitting..." : "Send suggestion"}
      </button>
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
  // Skip helper entries with no matching DB row, so dev-state drift can't crash
  // the form. The mapped array stays in display order from TAG_CATEGORIES.
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
