import type { CafeStatusValue } from "./freshness";
import type { WeeklyHours } from "./hours";

export type TagType = "AMENITY" | "VIBE";

export interface TagDTO {
  id: string;
  name: string;
  type: TagType;
}

export interface CafeListItem {
  id: string;
  slug: string | null;
  name: string;
  description: string;
  neighborhood: string;
  imageUrl: string | null;
  latitude: number;
  longitude: number;
  tags: TagDTO[];
  status: CafeStatusValue;
  /** Parsed weekly hours, or null when not listed (or the cafe isn't open). */
  hours: WeeklyHours | null;
  /** Computed server-side so server and client render the same badge. */
  isNew: boolean;
}

export interface CafeDetail extends CafeListItem {
  address: string;
  latitude: number;
  longitude: number;
  ownerReview: string;
  createdAt: string;
  notes: NoteDTO[];
}

export interface NoteDTO {
  id: string;
  content: string;
  authorName: string | null;
  createdAt: string;
}

export interface CreateNotePayload {
  cafe_id: string;
  content: string;
  author_name?: string;
}

export interface ApiError {
  error: string;
}
