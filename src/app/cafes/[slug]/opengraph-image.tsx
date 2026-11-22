import { ImageResponse } from "next/og";
import { prisma } from "@/lib/prisma";
import { REGION_LABELS } from "@/lib/regions";
import { normalizeStatus, STATUS_LABELS } from "@/lib/freshness";

// Per-cafe share card. Text-only on purpose: cafe photos are third-party
// hotlinks, and the card shouldn't depend on them.
export const alt = "A cafe on Coffee Club";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const cafe = await prisma.cafe.findUnique({
    where: { slug },
    select: { name: true, neighborhood: true, region: true, status: true, description: true },
  });
  const status = normalizeStatus(cafe?.status);

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: 72,
          background: "linear-gradient(135deg, #fffbeb 0%, #f5f5f4 60%, #e7e5e4 100%)",
          color: "#1c1917",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", fontSize: 28, letterSpacing: 6, color: "#b45309", fontWeight: 700 }}>COFFEE CLUB</div>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ display: "flex", fontSize: cafe && cafe.name.length > 28 ? 76 : 96, fontWeight: 800, lineHeight: 1.05 }}>
            {cafe?.name ?? "Coffee Club"}
          </div>
          {cafe && (
            <div style={{ display: "flex", fontSize: 38, color: "#57534e", marginTop: 20 }}>
              {[cafe.neighborhood, cafe.region ? REGION_LABELS[cafe.region] : null, status !== "OPEN" ? STATUS_LABELS[status] : null]
                .filter(Boolean)
                .join("  ·  ")}
            </div>
          )}
          {cafe && (
            <div style={{ display: "flex", fontSize: 28, color: "#78716c", marginTop: 24, maxWidth: 1000 }}>
              {cafe.description.length > 140 ? `${cafe.description.slice(0, 137)}…` : cafe.description}
            </div>
          )}
        </div>
        <div style={{ display: "flex", fontSize: 24, color: "#78716c" }}>coffee-club.dev · the curated guide that leaves the city</div>
      </div>
    ),
    { ...size }
  );
}
