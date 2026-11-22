import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import AdminHeader from "../../AdminHeader";
import CafeForm from "../CafeForm";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Add cafe — Coffee Club admin",
  robots: { index: false, follow: false },
};

export default async function NewCafePage() {
  const tags = await prisma.tag.findMany({ select: { id: true, name: true } });
  const tagsByName = Object.fromEntries(tags.map((t) => [t.name, t.id]));

  return (
    <div className="min-h-screen bg-stone-50">
      <AdminHeader active="/admin/cafes" />
      <main className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 py-8">
        <Link href="/admin/cafes" className="text-xs font-medium text-stone-500 hover:text-amber-700">
          ← All cafes
        </Link>
        <h2 className="mt-2 text-xl font-bold text-stone-900">Add a cafe</h2>
        <p className="mt-1 mb-5 text-sm text-stone-500">Publishes immediately. The slug is generated from the name.</p>
        <CafeForm
          tagsByName={tagsByName}
          initial={{
            name: "",
            address: "",
            latitude: null,
            longitude: null,
            neighborhood: "",
            description: "",
            imageUrl: "",
            ownerReview: "",
            tagIds: [],
          }}
        />
      </main>
    </div>
  );
}
