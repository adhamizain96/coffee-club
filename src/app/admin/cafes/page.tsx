import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import AdminHeader from "../AdminHeader";
import { STATUS_LABELS, normalizeStatus } from "@/lib/freshness";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Cafes — Coffee Club admin",
  robots: { index: false, follow: false },
};

export default async function AdminCafesPage({
  searchParams,
}: {
  searchParams: Promise<{ saved?: string }>;
}) {
  const { saved } = await searchParams;
  const cafes = await prisma.cafe.findMany({
    orderBy: { name: "asc" },
    select: { id: true, name: true, slug: true, neighborhood: true, status: true, curatorVisitedAt: true },
  });

  return (
    <div className="min-h-screen bg-stone-50">
      <AdminHeader active="/admin/cafes" />
      <main className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-xl font-bold text-stone-900">Cafes</h2>
            <p className="mt-1 text-sm text-stone-500">{cafes.length} cafes. Edit details or add one directly.</p>
          </div>
          <Link
            href="/admin/cafes/new"
            className="inline-flex items-center rounded-lg bg-amber-600 px-3 py-1.5 text-xs font-medium text-white shadow-sm hover:bg-amber-700 transition-colors"
          >
            Add cafe
          </Link>
        </div>

        {saved && (
          <p role="status" className="mt-4 rounded-lg bg-emerald-50 border border-emerald-200 px-3 py-2 text-xs text-emerald-800">
            Saved <code>{saved}</code>.
          </p>
        )}

        <div className="mt-5 overflow-x-auto rounded-lg border border-stone-200 bg-white">
          <table className="min-w-full text-sm">
            <thead className="bg-stone-50 text-left text-xs font-semibold uppercase tracking-wide text-stone-500">
              <tr>
                <th scope="col" className="px-4 py-2">Name</th>
                <th scope="col" className="px-4 py-2">Neighborhood</th>
                <th scope="col" className="px-4 py-2">Status</th>
                <th scope="col" className="px-4 py-2">Visited</th>
                <th scope="col" className="px-4 py-2">Slug</th>
                <th scope="col" className="px-4 py-2"><span className="sr-only">Actions</span></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {cafes.map((cafe) => (
                <tr key={cafe.id}>
                  <td className="px-4 py-2 font-medium text-stone-900">{cafe.name}</td>
                  <td className="px-4 py-2 text-stone-600">{cafe.neighborhood}</td>
                  <td className="px-4 py-2 text-xs text-stone-600">{STATUS_LABELS[normalizeStatus(cafe.status)]}</td>
                  <td className="px-4 py-2 text-xs text-stone-500">{cafe.curatorVisitedAt ? cafe.curatorVisitedAt.toISOString().slice(0, 10) : "—"}</td>
                  <td className="px-4 py-2 text-xs text-stone-500"><code>{cafe.slug ?? "—"}</code></td>
                  <td className="px-4 py-2 text-right whitespace-nowrap">
                    <Link href={`/admin/cafes/${cafe.id}/edit`} className="text-xs font-semibold text-amber-700 hover:text-amber-800">
                      Edit
                    </Link>
                    <span className="mx-2 text-stone-300" aria-hidden="true">|</span>
                    <Link href={`/cafes/${cafe.slug ?? cafe.id}`} className="text-xs font-medium text-stone-500 hover:text-stone-800">
                      View
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  );
}
