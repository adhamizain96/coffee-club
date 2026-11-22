import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import AdminHeader from "../../../AdminHeader";
import CafeForm from "../../CafeForm";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Edit cafe — Coffee Club admin",
  robots: { index: false, follow: false },
};

export default async function EditCafePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [cafe, tags] = await Promise.all([
    prisma.cafe.findUnique({ where: { id }, include: { tags: { select: { tagId: true } } } }),
    prisma.tag.findMany({ select: { id: true, name: true } }),
  ]);
  if (!cafe) notFound();
  const tagsByName = Object.fromEntries(tags.map((t) => [t.name, t.id]));

  return (
    <div className="min-h-screen bg-stone-50">
      <AdminHeader active="/admin/cafes" />
      <main className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 py-8">
        <Link href="/admin/cafes" className="text-xs font-medium text-stone-500 hover:text-amber-700">
          ← All cafes
        </Link>
        <h2 className="mt-2 mb-5 text-xl font-bold text-stone-900">Edit {cafe.name}</h2>
        <CafeForm
          cafeId={cafe.id}
          slug={cafe.slug}
          tagsByName={tagsByName}
          initial={{
            name: cafe.name,
            address: cafe.address,
            latitude: cafe.latitude,
            longitude: cafe.longitude,
            neighborhood: cafe.neighborhood,
            description: cafe.description,
            imageUrl: cafe.imageUrl ?? "",
            ownerReview: cafe.ownerReview,
            tagIds: cafe.tags.map((t) => t.tagId),
          }}
        />
      </main>
    </div>
  );
}
