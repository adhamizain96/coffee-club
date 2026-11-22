"use client";

import { useRef, useState } from "react";
import { REGIONS } from "@/lib/regions";
import { encodeShareCode, type RegionCounts } from "@/lib/passport-share";
import { getPassportSnapshot, mergePassport, parsePassport, writePassport, type PassportData } from "@/lib/passport";
import type { PassportCafe } from "@/lib/passport-badges";

export default function PassportActions({ cafes, passport }: { cafes: PassportCafe[]; passport: PassportData }) {
  const [message, setMessage] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  function shareUrl(): string {
    const counts = Object.fromEntries(REGIONS.map((r) => [r, 0])) as RegionCounts;
    for (const c of cafes) if (c.region && passport.visited[c.slug]) counts[c.region]++;
    return `${window.location.origin}/p/${encodeShareCode(counts)}`;
  }

  async function handleShare() {
    const url = shareUrl();
    try {
      if (navigator.share) {
        await navigator.share({ title: "My Coffee Club passport", url });
        return;
      }
      await navigator.clipboard.writeText(url);
      setMessage("Link copied. It shares your counts per area, not which cafes.");
    } catch {
      setMessage(`Share this link: ${url}`);
    }
  }

  function handleExport() {
    const blob = new Blob([JSON.stringify(getPassportSnapshot(), null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `coffee-club-passport-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  async function handleImport(file: File) {
    try {
      const parsed = parsePassport(JSON.parse(await file.text()));
      if (!parsed) {
        setMessage("That file isn't a Coffee Club passport export.");
        return;
      }
      const known = new Set(cafes.map((c) => c.slug));
      const merged = mergePassport(getPassportSnapshot(), parsed, known);
      writePassport(merged);
      setMessage(`Imported. You now have ${Object.keys(merged.visited).length} stamps.`);
    } catch {
      setMessage("Couldn't read that file.");
    } finally {
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  const btn = "inline-flex items-center rounded-lg border border-stone-300 bg-white px-3 py-1.5 text-xs font-medium text-stone-700 hover:bg-stone-50";
  return (
    <div className="mt-4">
      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={handleShare} className="inline-flex items-center rounded-lg bg-amber-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-amber-700">
          Share progress
        </button>
        <button type="button" onClick={handleExport} className={btn}>
          Export backup
        </button>
        <button type="button" onClick={() => fileRef.current?.click()} className={btn}>
          Import backup
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="application/json,.json"
          className="sr-only"
          aria-label="Import passport backup file"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void handleImport(f);
          }}
        />
      </div>
      {message && (
        <p role="status" className="mt-2 text-xs text-stone-600 break-all">
          {message}
        </p>
      )}
    </div>
  );
}
