import { ImageResponse } from "next/og";
import { REGIONS, REGION_LABELS } from "@/lib/regions";
import { loadShare } from "./share-data";

// Text-only card (no cafe photos, so it doesn't depend on third-party hotlinks).
export const alt = "A Coffee Club passport";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const share = await loadShare(code);

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
        <div style={{ display: "flex", fontSize: 28, letterSpacing: 6, color: "#b45309", fontWeight: 700 }}>COFFEE CLUB PASSPORT</div>
        {share ? (
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ display: "flex", fontSize: 120, fontWeight: 800, lineHeight: 1 }}>
              {`${share.stamped} cafes stamped`}
            </div>
            <div style={{ display: "flex", fontSize: 36, color: "#57534e", marginTop: 16 }}>
              {`Across ${share.areas} of 5 Chicagoland areas`}
            </div>
            <div style={{ display: "flex", gap: 28, marginTop: 40 }}>
              {REGIONS.map((r) => (
                <div key={r} style={{ display: "flex", flexDirection: "column" }}>
                  <div style={{ display: "flex", fontSize: 44, fontWeight: 700 }}>{`${share.counts[r]}/${share.totals[r]}`}</div>
                  <div style={{ display: "flex", fontSize: 22, color: "#78716c" }}>{REGION_LABELS[r]}</div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div style={{ display: "flex", fontSize: 72, fontWeight: 800 }}>The curated guide that leaves the city</div>
        )}
        <div style={{ display: "flex", fontSize: 24, color: "#78716c" }}>coffee-club.dev</div>
      </div>
    ),
    { ...size }
  );
}
