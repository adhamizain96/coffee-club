"use client";

import { useMemo } from "react";
import Link from "next/link";
import { usePassport } from "@/hooks/usePassport";
import { computeBadges, type PassportCafe } from "@/lib/passport-badges";
import { REGIONS, REGION_LABELS, type RegionValue } from "@/lib/regions";
import { STATUS_LABELS } from "@/lib/freshness";
import PassportActions from "./PassportActions";

export default function PassportGrid({ cafes }: { cafes: PassportCafe[] }) {
  const { passport, toggleVisited } = usePassport();
  const visited = useMemo(() => new Set(Object.keys(passport.visited)), [passport.visited]);
  const badges = useMemo(() => computeBadges(visited, cafes), [visited, cafes]);
  const stampedCount = cafes.filter((c) => visited.has(c.slug)).length;
  const wantToTry = cafes.filter((c) => passport.wantToTry[c.slug]);

  const groups: { key: RegionValue | "UNASSIGNED"; label: string; cafes: PassportCafe[] }[] = [
    ...REGIONS.map((r) => ({ key: r, label: REGION_LABELS[r], cafes: cafes.filter((c) => c.region === r) })),
    { key: "UNASSIGNED" as const, label: "Other", cafes: cafes.filter((c) => !c.region) },
  ].filter((g) => g.cafes.length > 0);

  return (
    <div>
      <header>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-700">Coffee passport</p>
        <h1 className="mt-1 text-3xl font-bold tracking-tight text-stone-900">
          {stampedCount} of {cafes.length} stamped
        </h1>
        <p className="mt-2 max-w-xl text-sm text-stone-600">
          Stamp the cafes you&apos;ve been to, across the city and the suburbs. Your passport lives in this browser only: no
          account, nothing sent anywhere. Clearing site data erases it.
        </p>
        <div className="mt-4 h-2 w-full max-w-md overflow-hidden rounded-full bg-stone-200" role="progressbar" aria-valuemin={0} aria-valuemax={cafes.length} aria-valuenow={stampedCount} aria-label="Cafes stamped">
          <div className="h-full rounded-full bg-amber-600 transition-all" style={{ width: `${cafes.length ? (stampedCount / cafes.length) * 100 : 0}%` }} />
        </div>
        <PassportActions cafes={cafes} passport={passport} />
      </header>

      {stampedCount === 0 && (
        <div className="mt-6 rounded-2xl border border-dashed border-stone-300 bg-white p-6 text-center">
          <p className="text-sm font-semibold text-stone-800">No stamps yet</p>
          <p className="mt-1 text-sm text-stone-500">
            Tap the stamp on any cafe card, or the &ldquo;Mark as been here&rdquo; button on a cafe page. You can also stamp right here.
          </p>
          <Link href="/" className="mt-3 inline-flex items-center rounded-lg bg-amber-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-amber-700">
            Find a cafe on the map
          </Link>
        </div>
      )}

      <section className="mt-8" aria-labelledby="badges-heading">
        <h2 id="badges-heading" className="text-lg font-semibold text-stone-900">Badges</h2>
        <ul className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {badges.map((b) => (
            <li key={b.id} className={`rounded-xl border p-4 ${b.earned ? "border-amber-300 bg-amber-50" : "border-stone-200 bg-white"}`}>
              <div className="flex items-center justify-between gap-2">
                <p className={`text-sm font-semibold ${b.earned ? "text-amber-900" : "text-stone-800"}`}>{b.title}</p>
                <span className={`text-xs font-semibold ${b.earned ? "text-amber-700" : "text-stone-400"}`}>
                  {b.earned ? "Earned" : `${b.current}/${b.target}`}
                </span>
              </div>
              <p className="mt-1 text-xs text-stone-600">{b.description}</p>
              {!b.earned && <p className="mt-1 text-xs text-stone-400">{b.hint}</p>}
            </li>
          ))}
        </ul>
      </section>

      {wantToTry.length > 0 && (
        <section className="mt-8" aria-labelledby="want-heading">
          <h2 id="want-heading" className="text-lg font-semibold text-stone-900">Want to try</h2>
          <ul className="mt-3 flex flex-wrap gap-2">
            {wantToTry.map((c) => (
              <li key={c.slug}>
                <Link href={`/cafes/${c.slug}`} className="inline-flex rounded-full border border-stone-200 bg-white px-3 py-1 text-sm text-stone-700 hover:border-amber-500 hover:text-amber-800">
                  {c.name}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="mt-8 space-y-8" aria-label="Stamps by area">
        {groups.map((g) => {
          const done = g.cafes.filter((c) => visited.has(c.slug)).length;
          return (
            <div key={g.key}>
              <div className="flex items-baseline justify-between gap-2">
                <h2 className="text-lg font-semibold text-stone-900">{g.label}</h2>
                <span className="text-xs font-medium text-stone-500">{done} of {g.cafes.length}</span>
              </div>
              <ul className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
                {g.cafes.map((c) => {
                  const stamped = visited.has(c.slug);
                  return (
                    <li key={c.slug} className={`relative rounded-xl border p-3 ${stamped ? "border-amber-400 bg-amber-50" : "border-stone-200 bg-white"}`}>
                      <Link href={`/cafes/${c.slug}`} className="block pr-8">
                        <span className="block text-sm font-semibold leading-tight text-stone-900 line-clamp-2">{c.name}</span>
                        <span className="mt-0.5 block text-xs text-stone-500">{c.neighborhood}</span>
                        {c.status !== "OPEN" && (
                          <span className="mt-1 inline-block rounded-full bg-stone-800 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-white">
                            {STATUS_LABELS[c.status]}
                          </span>
                        )}
                      </Link>
                      <button
                        type="button"
                        onClick={() => toggleVisited(c.slug)}
                        aria-pressed={stamped}
                        aria-label={stamped ? `Remove stamp for ${c.name}` : `Stamp ${c.name}`}
                        className={`absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full border text-xs font-bold transition-colors ${
                          stamped ? "border-amber-600 bg-amber-600 text-white" : "border-stone-300 bg-white text-stone-400 hover:border-amber-500 hover:text-amber-700"
                        }`}
                      >
                        <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2.5}>
                          <path d="M6 12.5l4 4 8-9" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        })}
      </section>
    </div>
  );
}
