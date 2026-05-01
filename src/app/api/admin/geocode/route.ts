import { NextRequest } from "next/server";
import { geocodeAddress } from "@/lib/geocode";

export const dynamic = "force-dynamic";

const ADDRESS_MIN = 5;
const ADDRESS_MAX = 200;

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json().catch(() => null)) as
      | { address?: unknown }
      | null;
    const raw =
      typeof body?.address === "string" ? body.address.trim() : "";

    if (raw.length < ADDRESS_MIN || raw.length > ADDRESS_MAX) {
      return Response.json(
        { error: `Address must be ${ADDRESS_MIN}-${ADDRESS_MAX} characters` },
        { status: 400 }
      );
    }

    let result;
    try {
      result = await geocodeAddress(raw);
    } catch (err) {
      console.error("admin geocode error:", err);
      return Response.json(
        {
          error:
            "Geocoding service failed. Check that NEXT_PUBLIC_GOOGLE_MAPS_API_KEY is set and the daily quota isn't exhausted.",
        },
        { status: 500 }
      );
    }

    if (!result) {
      return Response.json(
        {
          error:
            "Google couldn't find this address. Try refining it (e.g. add the city or state).",
        },
        { status: 422 }
      );
    }

    return Response.json({ result }, { status: 200 });
  } catch (error) {
    console.error("POST /api/admin/geocode error:", error);
    return Response.json(
      { error: "Failed to geocode" },
      { status: 500 }
    );
  }
}
