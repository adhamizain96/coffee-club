export type TagType = "AMENITY" | "VIBE";

export interface TagDTO {
  id: string;
  name: string;
  type: TagType;
}

export interface CafeListItem {
  id: string;
  name: string;
  description: string;
  neighborhood: string;
  imageUrl: string;
  latitude: number;
  longitude: number;
  tags: TagDTO[];
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
