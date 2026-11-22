import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { normalizeStatus } from "@/lib/freshness";
import type { PassportCafe } from "@/lib/passport-badges";
import PassportGrid from "./PassportGrid";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Your passport — Coffee Club",
  description: "Stamp the Chicagoland cafes you've been to, city and suburbs. Saved in your browser, no account needed.",
};

export default async function PassportPage() {
  const rows = await prisma.cafe.findMany({
    where: { slug: { not: null } },
    select: { slug: true, name: true, neighborhood: true, region: true, status: true },
    orderBy: { name: "asc" },
  });
  const cafes: PassportCafe[] = rows.map((c) => ({
    slug: c.slug!,
    name: c.name,
    neighborhood: c.neighborhood,
    region: c.region,
    status: normalizeStatus(c.status),
  }));

  return (
    <div className="min-h-screen bg-stone-50">
      <div className="sticky top-0 z-40 bg-white/90 backdrop-blur-sm border-b border-stone-200 px-4 sm:px-6 lg:px-8 py-3 flex items-center gap-3">
        <Link href="/" className="inline-flex items-center gap-1 text-sm font-medium text-stone-600 hover:text-amber-700 transition-colors">
          <svg aria-hidden="true" className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
          </svg>
          Back to map
        </Link>
        <span className="text-sm text-stone-300" aria-hidden="true">|</span>
        <span className="text-sm font-bold tracking-tight text-amber-700">Coffee Club</span>
      </div>
      <main className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-8">
        <PassportGrid cafes={cafes} />
      </main>
    </div>
  );
}
