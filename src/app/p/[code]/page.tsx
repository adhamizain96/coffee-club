import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { REGIONS, REGION_LABELS } from "@/lib/regions";
import { loadShare } from "./share-data";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ code: string }> }): Promise<Metadata> {
  const { code } = await params;
  const share = await loadShare(code);
  if (!share) return { title: "Passport not found — Coffee Club", robots: { index: false } };
  const title = `${share.stamped} Chicagoland cafes stamped — Coffee Club passport`;
  return {
    title,
    description: `A Coffee Club passport: ${share.stamped} cafes across ${share.areas} of 5 areas, city and suburbs.`,
    robots: { index: false },
    openGraph: { title },
  };
}

export default async function SharedPassportPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const share = await loadShare(code);
  if (!share) notFound();

  return (
    <main className="min-h-screen bg-stone-50 px-4 py-12">
      <div className="mx-auto max-w-lg rounded-2xl border border-amber-200 bg-white p-6 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-700">Coffee Club passport</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-stone-900">
          {share.stamped} {share.stamped === 1 ? "cafe" : "cafes"} stamped
        </h1>
        <p className="mt-1 text-sm text-stone-600">
          Across {share.areas} of 5 Chicagoland areas, out of {share.allCafes} curated cafes.
        </p>
        <ul className="mt-5 space-y-2">
          {REGIONS.map((r) => (
            <li key={r}>
              <div className="flex justify-between text-sm">
                <span className="text-stone-700">{REGION_LABELS[r]}</span>
                <span className="font-semibold text-stone-900">
                  {share.counts[r]} / {share.totals[r]}
                </span>
              </div>
              <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-stone-100">
                <div className="h-full rounded-full bg-amber-600" style={{ width: `${share.totals[r] ? (share.counts[r] / share.totals[r]) * 100 : 0}%` }} />
              </div>
            </li>
          ))}
        </ul>
        <Link href="/passport" className="mt-6 inline-flex items-center rounded-lg bg-amber-600 px-4 py-2 text-sm font-medium text-white hover:bg-amber-700">
          Start your own passport
        </Link>
      </div>
    </main>
  );
}
