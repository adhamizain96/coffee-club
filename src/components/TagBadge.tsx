import type { TagType } from "@/lib/types";

const TAG_LABELS: Record<string, string> = {
  // Core amenities
  wifi: "WiFi",
  outlets: "Outlets",
  outdoor_seating: "Outdoor Seating",
  pet_friendly: "Pet Friendly",
  parking: "Parking",
  // Seating
  bar_seating: "Bar Seating",
  communal_tables: "Communal Tables",
  couch_seating: "Couch Seating",
  // Work Friendliness
  laptop_friendly: "Laptop Friendly",
  meeting_space: "Meeting Space",
  no_laptops: "No Laptops",
  // Food Options
  full_menu: "Full Menu",
  pastries_only: "Pastries Only",
  vegan_options: "Vegan Options",
  // Noise Level
  whisper_quiet: "Whisper Quiet",
  moderate_noise: "Moderate",
  bustling: "Bustling",
  // Hours
  early_bird: "Early Bird",
  late_night: "Late Night",
  weekend_brunch: "Weekend Brunch",
  // Vibes
  cozy: "Cozy",
  "study-friendly": "Study Friendly",
  quiet: "Quiet",
  lively: "Lively",
  bright: "Bright",
  "date-spot": "Date Spot",
};

interface TagBadgeProps {
  name: string;
  type: TagType;
}

export default function TagBadge({ name, type }: TagBadgeProps) {
  const label = TAG_LABELS[name] ?? name;

  const baseClasses =
    "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium";
  const colorClasses =
    type === "AMENITY"
      ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-600/20"
      : "bg-violet-50 text-violet-700 ring-1 ring-violet-600/20";

  return <span className={`${baseClasses} ${colorClasses}`}>{label}</span>;
}
