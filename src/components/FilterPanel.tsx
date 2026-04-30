"use client";

import { useState } from "react";

const CORE_AMENITY_TAGS = [
  { value: "wifi", label: "WiFi" },
  { value: "outlets", label: "Outlets" },
  { value: "outdoor_seating", label: "Outdoor" },
  { value: "pet_friendly", label: "Pets OK" },
  { value: "parking", label: "Parking" },
] as const;

const SEATING_TAGS = [
  { value: "bar_seating", label: "Bar" },
  { value: "communal_tables", label: "Communal" },
  { value: "couch_seating", label: "Couches" },
] as const;

const WORK_TAGS = [
  { value: "laptop_friendly", label: "Laptops" },
  { value: "meeting_space", label: "Meetings" },
  { value: "no_laptops", label: "No Laptops" },
] as const;

const FOOD_TAGS = [
  { value: "full_menu", label: "Full Menu" },
  { value: "pastries_only", label: "Pastries" },
  { value: "vegan_options", label: "Vegan" },
] as const;

const NOISE_TAGS = [
  { value: "whisper_quiet", label: "Quiet" },
  { value: "moderate_noise", label: "Moderate" },
  { value: "bustling", label: "Bustling" },
] as const;

const HOURS_TAGS = [
  { value: "early_bird", label: "Early Bird" },
  { value: "late_night", label: "Late Night" },
  { value: "weekend_brunch", label: "Brunch" },
] as const;

const VIBE_TAGS = [
  { value: "cozy", label: "Cozy" },
  { value: "study-friendly", label: "Study" },
  { value: "quiet", label: "Quiet" },
  { value: "lively", label: "Lively" },
  { value: "bright", label: "Bright" },
  { value: "date-spot", label: "Date Spot" },
] as const;

interface FilterPanelProps {
  selectedAmenities: string[];
  selectedVibes: string[];
  onAmenitiesChange: (amenities: string[]) => void;
  onVibesChange: (vibes: string[]) => void;
  /**
   * Where to anchor the dropdown panel relative to the trigger button.
   * - undefined (default): renders in normal flow under the button (desktop legacy behavior)
   * - "right": absolute, right-aligned to the trigger (mobile floating header)
   */
  dropdownAlign?: "right";
}

function ToggleChip({
  label,
  selected,
  onClick,
}: {
  label: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full px-2.5 py-1 text-xs font-medium transition-all duration-150 ${
        selected
          ? "bg-stone-900 text-white shadow-sm"
          : "bg-stone-100 text-stone-600 hover:bg-stone-200 hover:text-stone-800"
      }`}
    >
      {label}
    </button>
  );
}

function FilterGroup({
  title,
  tags,
  selected,
  onToggle,
}: {
  title: string;
  tags: ReadonlyArray<{ value: string; label: string }>;
  selected: string[];
  onToggle: (value: string) => void;
}) {
  return (
    <div>
      <h3 className="text-[10px] font-semibold text-stone-400 uppercase tracking-widest mb-1.5">
        {title}
      </h3>
      <div className="flex flex-wrap gap-1.5">
        {tags.map((tag) => (
          <ToggleChip
            key={tag.value}
            label={tag.label}
            selected={selected.includes(tag.value)}
            onClick={() => onToggle(tag.value)}
          />
        ))}
      </div>
    </div>
  );
}

export default function FilterPanel({
  selectedAmenities,
  selectedVibes,
  onAmenitiesChange,
  onVibesChange,
  dropdownAlign,
}: FilterPanelProps) {
  const [open, setOpen] = useState(false);

  const activeCount = selectedAmenities.length + selectedVibes.length;

  function toggleAmenity(value: string) {
    onAmenitiesChange(
      selectedAmenities.includes(value)
        ? selectedAmenities.filter((a) => a !== value)
        : [...selectedAmenities, value]
    );
  }

  function toggleVibe(value: string) {
    onVibesChange(
      selectedVibes.includes(value)
        ? selectedVibes.filter((v) => v !== value)
        : [...selectedVibes, value]
    );
  }

  function clearAll() {
    onAmenitiesChange([]);
    onVibesChange([]);
  }

  return (
    <div className={dropdownAlign === "right" ? "relative" : undefined}>
      {/* Toggle button */}
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className={`inline-flex items-center gap-2 rounded-xl px-3.5 py-2 text-sm font-medium shadow-lg transition-all duration-200 ${
          open || activeCount > 0
            ? "bg-stone-900 text-white hover:bg-stone-800"
            : "bg-white/95 backdrop-blur-md text-stone-700 border border-stone-200/60 hover:bg-white"
        }`}
      >
        <svg
          className="h-3.5 w-3.5"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={2}
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M10.5 6h9.75M10.5 6a1.5 1.5 0 1 1-3 0m3 0a1.5 1.5 0 1 0-3 0M3.75 6H7.5m3 12h9.75m-9.75 0a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m-3.75 0H7.5m9-6h3.75m-3.75 0a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m-9.75 0h9.75"
          />
        </svg>
        Filters
        {activeCount > 0 && (
          <span className={`inline-flex items-center justify-center rounded-full h-5 w-5 text-[10px] font-bold ${
            open || activeCount > 0
              ? "bg-white text-stone-900"
              : "bg-amber-600 text-white"
          }`}>
            {activeCount}
          </span>
        )}
      </button>

      {/* Expandable filter dropdown */}
      {open && (
        <div
          className={`mt-2 rounded-2xl bg-white/95 backdrop-blur-md border border-stone-200/60 p-4 shadow-2xl w-72 max-h-[65vh] overflow-y-auto ${
            dropdownAlign === "right" ? "absolute right-0 top-full" : ""
          }`}
        >
          <div className="space-y-3.5">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-stone-900">
                Filters
              </span>
              {activeCount > 0 && (
                <button
                  type="button"
                  onClick={clearAll}
                  className="text-xs text-stone-400 hover:text-stone-600 font-medium transition-colors"
                >
                  Clear all
                </button>
              )}
            </div>

            <div className="h-px bg-stone-100" />

            <FilterGroup
              title="Amenities"
              tags={CORE_AMENITY_TAGS}
              selected={selectedAmenities}
              onToggle={toggleAmenity}
            />
            <FilterGroup
              title="Seating"
              tags={SEATING_TAGS}
              selected={selectedAmenities}
              onToggle={toggleAmenity}
            />
            <FilterGroup
              title="Work"
              tags={WORK_TAGS}
              selected={selectedAmenities}
              onToggle={toggleAmenity}
            />
            <FilterGroup
              title="Food"
              tags={FOOD_TAGS}
              selected={selectedAmenities}
              onToggle={toggleAmenity}
            />
            <FilterGroup
              title="Noise"
              tags={NOISE_TAGS}
              selected={selectedAmenities}
              onToggle={toggleAmenity}
            />
            <FilterGroup
              title="Hours"
              tags={HOURS_TAGS}
              selected={selectedAmenities}
              onToggle={toggleAmenity}
            />

            <div className="h-px bg-stone-100" />

            <FilterGroup
              title="Vibes"
              tags={VIBE_TAGS}
              selected={selectedVibes}
              onToggle={toggleVibe}
            />
          </div>
        </div>
      )}
    </div>
  );
}
