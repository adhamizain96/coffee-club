import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Admin sign-in — Coffee Club",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function AdminLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <div className="min-h-screen flex items-center justify-center bg-stone-50 px-4">
      <form
        method="POST"
        action="/api/admin/login"
        className="w-full max-w-sm bg-white rounded-2xl border border-stone-200 shadow-lg p-6 space-y-4"
      >
        <div>
          <h1 className="text-lg font-bold text-stone-900">Admin sign-in</h1>
          <p className="text-xs text-stone-500 mt-1">
            Coffee Club moderation queue
          </p>
        </div>

        <div>
          <label
            htmlFor="password"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Password
          </label>
          <input
            id="password"
            type="password"
            name="password"
            required
            autoFocus
            autoComplete="current-password"
            className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none"
          />
        </div>

        {error && (
          <p className="text-sm text-red-600">Incorrect password.</p>
        )}

        <button
          type="submit"
          className="w-full inline-flex items-center justify-center rounded-lg bg-amber-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-amber-700 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2 transition-colors"
        >
          Sign in
        </button>
      </form>
    </div>
  );
}
