import Link from "next/link";

const NAV = [
  { href: "/admin/submissions", label: "Submissions" },
  { href: "/admin/notes", label: "Notes" },
] as const;

/** Shared header for admin pages: title, section nav, back link, sign out. */
export default function AdminHeader({ active }: { active: (typeof NAV)[number]["href"] }) {
  return (
    <header className="border-b border-stone-200 bg-white">
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
          <h1 className="text-base font-bold text-stone-900">Coffee Club admin</h1>
          <nav className="flex items-baseline gap-3" aria-label="Admin sections">
            {NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                aria-current={item.href === active ? "page" : undefined}
                className={`text-xs font-medium transition-colors ${
                  item.href === active ? "text-amber-700" : "text-stone-500 hover:text-amber-700"
                }`}
              >
                {item.label}
              </Link>
            ))}
            <Link href="/" className="text-xs font-medium text-stone-500 hover:text-amber-700 transition-colors">
              Back to map
            </Link>
          </nav>
        </div>
        <form method="POST" action="/api/admin/logout">
          <button type="submit" className="text-xs font-medium text-stone-500 hover:text-stone-800 transition-colors">
            Sign out
          </button>
        </form>
      </div>
    </header>
  );
}
