@AGENTS.md

# Coffee Club

Curated cafe discovery platform for Chicago and surrounding suburbs, built with Next.js 16, TypeScript, Prisma 7, PostgreSQL, and Tailwind CSS.

## Collaboration Style

You are my implementation-focused collaborator.

Priorities, in order:

1. Correctness
2. Direct usefulness
3. Clarity
4. Maintainability
5. Efficiency

### General Behavior

- Do the work directly when asked. Prefer execution over commentary.
- Preserve my intent, wording, structure, and design direction unless improvement is clearly needed.
- Make the smallest effective change that solves the problem well.
- Avoid unnecessary rewrites, dependencies, and complexity.
- Be explicit about assumptions when needed.
- Do not invent facts, outputs, tests, or results.
- If something is uncertain, say so clearly and proceed with the best grounded approach.
- When multiple valid options exist, choose the simplest production-quality one.
- Only ask clarifying questions when absolutely necessary to avoid likely failure.

### Response Style

- Be clear, concise, and practical. Avoid filler and repetition.
- Keep outputs easy to scan. Use headings and bullets only when they help.
- Start with the result or conclusion.
- Summarize key changes or findings clearly.
- Mention assumptions, risks, and deferred items only when relevant.
- Do not over-apologize, repeatedly restate the problem, or produce bloated explanations.

### Coding Standards

- Prefer clean, maintainable, production-quality code.
- Prefer surgical edits over broad rewrites.
- Preserve existing functionality unless intentionally improving it.
- Remove dead code and unused imports in touched areas.
- Keep naming consistent with the codebase.
- Favor simple, high-leverage refactors over broad rewrites.
- Prefer explicitness over magic. Use descriptive names.
- Add comments only where they genuinely clarify non-obvious logic.
- Preserve or improve type safety. Do not weaken types without a strong reason.
- Be mindful of performance, bundle size, and runtime cost.
- Respect accessibility fundamentals and semantic HTML.
- Account for loading, empty, and error states in UI work.

### Debugging

- Identify the likely root cause first. Inspect the relevant code path before proposing a fix.
- Fix the issue cleanly. Explain the cause in plain language.
- Fix highest-confidence, highest-impact issues first. Note remaining concerns separately.

### Documentation and Plans

- Make content immediately usable. Keep structure intuitive and specific.
- Avoid vague or generic language.

## Architecture Notes

- **Prisma v7** — DB connection URL is configured in `prisma.config.ts`, not in `schema.prisma`. The `datasource` block in the schema has no `url` field.
- **PrismaPg adapter** — The app uses `@prisma/adapter-pg`, which requires a raw `postgres://` connection string. The `prisma+postgres://` proxy URL only works for Prisma CLI operations (migrations, `db push`).
- **Migrations** — Schema changes go through Prisma Migrate (`prisma/migrations/`). `0_init` is a baseline that matches the production schema as of 2026-11-22. New migrations are additive and nullable so the currently deployed code keeps working before the new code ships. Generate SQL with `npx prisma migrate diff --from-migrations prisma/migrations --to-schema prisma/schema.prisma --script` (or `migrate dev --create-only`), apply with `npm run db:migrate:deploy`. Vercel builds do **not** run migrations; apply them to production by hand with the **direct** (unpooled) URL before deploying code that needs them. `db push` is no longer used.
- **Generated client** — Import from `@/generated/prisma/client`, not `@prisma/client`. Output is at `src/generated/prisma/`.
- **Seed script** — Uses `SEED_DATABASE_URL` (falls back to `DATABASE_URL`) because seeding runs via `tsx` outside the Prisma proxy and needs a direct PostgreSQL connection. It is **local-only**: it refuses any host other than `localhost`, `127.0.0.1`, or `::1` before connecting, and logs `host:port/db` (never credentials). There is no override. It upserts by `slug` and never deletes notes, submissions, or cafes missing from `seed.ts`; the only delete is stale `CafeTag` links on cafes the seed owns. It refuses to run if any cafe has a null slug (backfill first).
- **Filtering logic** — Amenities use **AND** (cafe must have all selected); vibes use **OR** (cafe must have at least one selected).
- **Public site is unauthenticated** — Notes are anonymous (optional name field only). Public cafe submissions at `/submit` write to `CafeSubmission` with `status = PENDING`; they do *not* create `Cafe` rows directly.
- **Admin gate** — `src/proxy.ts` (Next 16 Proxy) gates `/admin/*` and `/api/admin/*`:
  - HMAC-signed cookie verified in `src/lib/admin-auth.ts`.
  - `ADMIN_PASSWORD` is both the login password **and** the HMAC signing secret — rotating it logs out every active session.
  - Bypass list (`PROXY_BYPASS_PATHS`): `/admin/login`, `/api/admin/login`, `/api/admin/logout`. Login bypasses so the admin can't lock themselves out; logout bypasses so it stays idempotent — clicking it with an expired/missing cookie still clears the cookie and redirects to `/admin/login` instead of returning 401.
- **Admin cafe editor** — `/admin/cafes` lists all cafes; `/admin/cafes/new` creates one directly (no submission; `POST /api/admin/cafes` generates the slug and sets `addedAt`); `/admin/cafes/[id]/edit` updates curated fields and replaces tags (`PATCH /api/admin/cafes/[id]`; the slug never changes). Saving is blocked until the current address has been geocoded. Approve, create, and edit all validate through `src/lib/cafe-validation.ts`; the forms share `src/app/admin/AdminFormParts.tsx`. This editor is how production cafe data changes now that the seed is local-only.
- **Freshness** — `Cafe.status` (`OPEN` / `TEMPORARILY_CLOSED` / `CLOSED`; null means open) and `Cafe.curatorVisitedAt` are set in the admin editor. Closed cafes stay listed with a label, a muted map pin, and a banner on the detail page; never delete them. The "New" badge shows for 30 days after `createdAt` (`NEW_BADGE_DAYS` in `src/lib/freshness.ts`) and is computed server-side to avoid hydration mismatches. Status labels live in `src/lib/freshness.ts`, not in the tag label files. The map popup uses `getTagLabel()` from `tag-display.ts` for vibe chips.
- **Hours** — `Cafe.hours` is weekly JSON (`src/lib/hours.ts`), evaluated in `America/Chicago` (DST-safe via `Intl`). An empty day = closed; close <= open runs past midnight. `hoursCheckedAt` is required whenever hours are set and is shown to users with `hoursSourceUrl`. Null hours render "Hours not listed" (plus the website link if set). The open/closed line is computed client-side only (`src/components/CafeHours.tsx`, `useSyncExternalStore`) so cached renders never show a stale status. Run `npx tsx scripts/check-hours.ts` after touching `hours.ts`. Never fabricate or estimate hours.
- **Hours filters and badges** — The filter panel has a "When" group (Open now, Early Bird, Late Night) derived from hours (`src/hooks/useCafes.ts`); they AND with amenities, and cafes without listed hours never match (the list says how many were left out). Early Bird = opens by 7:00 on at least one weekday; Late Night = open until 9pm or later on at least one day (`src/lib/hours.ts`). The `early_bird` / `late_night` tags are retired (`RETIRED_TAG_NAMES` in `tag-display.ts`): hidden in every read, not offered in pickers, and removed from the seed. `weekend_brunch` stays and now sits in the Food chip group.
- **Regions** — `Cafe.region` (`CITY`, `NORTH`, `NORTHWEST`, `WEST`, `SOUTH`; nullable) drives the "Area" filter (OR) and passport grouping. Labels and the municipality lookup (`regionForAddress`) live in `src/lib/regions.ts`; add a town there before importing a cafe from it. The admin editor pre-fills region from the geocoded town.
- **Passport (browser-only)** — `src/lib/passport.ts` stores `{ version: 1, visited, wantToTry }` (slug -> ISO date) in localStorage under `coffee-club:passport:v1`; `usePassport()` reads it via `useSyncExternalStore` (empty on the server, synced across tabs via the `storage` event, falls back to memory if storage throws). Keyed by slug, which is why slugs must never change. No accounts or server state.
- **Note moderation** — `/admin/notes` lists every note (filter all/visible/hidden). `PATCH /api/admin/notes/[id]` `{ hidden }` sets/clears `Note.hiddenAt`; `DELETE` removes the note permanently (two-step confirm in the UI). Every public note read (`/cafes/[slug]`, `/api/cafes/[id]`) filters `hiddenAt: null`. Admin pages share `src/app/admin/AdminHeader.tsx`.
- **Submission → cafe approval** — `POST /api/admin/submissions/[id]/approve` runs one atomic transaction:
  - Latches the submission `PENDING → APPROVED` via `updateMany` (race-safe against double-approval).
  - Creates the `Cafe` with a unique `slug` and with `submitterName` and `addedAt` backfilled from the submission.
  - Inserts `CafeTag` rows for the chosen tags.
  - Backlinks `submission.approvedCafeId → cafe.id`.
  - The edit page (`/admin/submissions/[id]/edit`) pre-fills from the submission plus a server-side Google geocode (`src/lib/geocode.ts`). New cafes appear on the public site immediately — no rebuild required.

## Known Behaviors

- **Cafe URLs are `/cafes/<slug>`.** Old `/cafes/<cuid>` links get a real 308 to the slug from `src/proxy.ts` (only cuid-shaped segments trigger a DB lookup). It's done in the proxy because the detail route streams, and a redirect from a streamed page would be a client-side meta refresh with a 200. The approval route generates a unique slug inside its transaction. `/api/cafes/[id]` stays id-based.
- **`/cafes/<bad-slug>` returns HTTP 200 + the not-found UI, not 404.** Reproduces in production builds. The `notFound()` call in `src/app/cafes/[slug]/page.tsx` renders `src/app/not-found.tsx` and Next.js injects `<meta name="robots" content="noindex">`, but the response status stays 200. This is documented Next.js 16 behavior for streamed responses (see `node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/not-found.md`). Search engines respect the noindex; only programmatic clients keying off the status code are affected. Don't "fix" without checking whether a refactor away from streamed rendering is justified.
- **Rate limiter is per-process** (`src/lib/rate-limit.ts`). Per Vercel function instance, so budgets reset across cold starts. Acceptable for current traffic; swap in Redis if scale demands it.
- **No Google ratings or reviews.** Removed in the overhaul (no Places API calls anywhere). The Maps key is used only for the map, `src/lib/geocode.ts`, and `scripts/geocode-cafes.ts`.
- **Honeypot path still increments the rate-limit counter.** `POST /api/submissions` runs `rateLimit()` *before* the honeypot check, so bots tripping the honeypot also burn into their per-IP budget. Intentional — bots should not get unlimited free attempts.

## Seed File Conventions (`prisma/seed.ts`)

- 32 cafes total: indexes 0–9 are the original Chicago entries, 10–31 are Chicagoland suburban additions.
- Every entry has an explicit `slug` (stable public URL key, `src/lib/slug.ts`). Slugs never change once published, even if the cafe is renamed. Keep `slug` right after `name` (the geocode script's parser expects `name`, then `address`, then `latitude`/`longitude`).
- `scripts/backfill-slugs.ts` fills `slug` for rows where it's null (dry run by default, `--apply` to write; uses seed slugs when names match).
- `imageUrl` is matched to the cafe **by position** in `CAFE_IMAGES`. Adding a cafe to `cafes` means adding its image URL to `CAFE_IMAGES` at the same index.
- `imageUrl` is optional. Cafes without a photo (or with a broken hotlink) render a designed placeholder via `src/components/CafeImage.tsx`. Don't download or self-host third-party photos.
- Photos must be real images of the actual cafe — official site, official Instagram, or a reputable publication. Verify HTTP 200 + image content-type before commit. No stock images, no Yelp/Google user uploads, no AI-generated images.
- Cafes must be real, currently operating businesses. Verify before adding. Do not fabricate names, addresses, or coordinates.
- Coordinates: do not estimate by eye. Re-geocode only when an address is added or changed (each run makes one paid Geocoding call per cafe, `--check` included). `npx tsx scripts/geocode-cafes.ts` overwrites lat/lng in place and prints a delta table. Edits that don't touch an address (tags, reviews, hours, slugs) don't need a re-geocode.

## Local Dev Workflow

Three terminals:

| # | Command | Notes |
|---|---|---|
| 1 | `npx prisma dev` | Local PostgreSQL — long-running. Print connection URL goes into `.env`. |
| 2 | `npm run db:migrate:deploy` then `npm run db:seed` | One-time per setup, plus whenever a migration or the seed changes. |
| 3 | `npm run dev` | Next.js dev server — long-running. |

**Shutdown order**: stop Terminal 3 first, then Terminal 1. Always Ctrl+C — never close the window. Wrong order causes EBUSY on the next `npx prisma dev` because the durable-streams SQLite handle isn't released cleanly.

**EBUSY recovery on Windows**: run `.\scripts\dev-reset.ps1`. It surgically stops project-tied node processes (filters by command-line match — never blanket-kills `node.exe`) and removes the stale `durable-streams\default` folder. The main `.pglite` data is preserved.

**Defender exclusion** (recommended, requires admin): adding the Prisma data dir to Defender exclusions reduces transient EBUSY caused by real-time scanning during file unlinks.

```powershell
Add-MpPreference -ExclusionPath "$env:LOCALAPPDATA\prisma-dev-nodejs"
```

## Commands

```bash
npx prisma dev                       # Start local PostgreSQL (Terminal 1, must run before dev server)
npm run dev                          # Start Next.js dev server (Terminal 3)
npm run db:migrate:deploy            # Apply pending migrations (local, or production with the direct URL)
npm run db:migrate:status            # Show applied/pending migrations
npm run db:seed                      # Upsert seed cafes by slug (local only; never deletes notes, submissions, or admin-added cafes)
npx prisma generate                  # Regenerate Prisma client
npm run build                        # Production build
npm run lint                         # Run ESLint
npx tsx scripts/geocode-cafes.ts     # Re-geocode all cafes; rewrites lat/lng in seed.ts in place
.\scripts\dev-reset.ps1              # (Windows) recover from prisma dev EBUSY
```

## Validation Quick-Reference

Run before push, in this order:

1. `npm run lint` — Vercel runs lint, `next build` does not. 0 errors and 0 warnings expected (the one intentional `<img>` for hotlinked cafe photos lives in `src/components/CafeImage.tsx` with an inline disable).
2. `npm run build` — verifies TypeScript + production bundle.
3. End-to-end smoke (with `npx prisma dev` + `npm run dev` running): hit `/`, `/submit`, `/admin/login`, `/api/cafes`, `/api/cafes?amenities=wifi&vibes=cozy`. Confirm admin gate (no cookie → 307 for pages, 401 for non-bypass APIs; logout always 303 to `/admin/login`).

## Environment Variables

- `DATABASE_URL` — Raw `postgres://` connection string. Used by the app (PrismaPg adapter) and the seed script.
- `PRISMA_PROXY_URL` — `prisma+postgres://` proxy URL printed by `npx prisma dev`. Used by `prisma.config.ts` for `db push` and migrations.
- `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` — Maps JavaScript API key for the map view, the Geocoding API for `scripts/geocode-cafes.ts`, and the server-side geocode in the admin approval flow (`src/lib/geocode.ts`). Needs an unrestricted or IP-restricted key; referrer-only browser keys fail server-side with `REQUEST_DENIED`.
- `ADMIN_PASSWORD` — Password for `/admin/login`. Doubles as the HMAC signing secret for the admin session cookie, so rotating it logs out every active session. Admin routes 401/redirect cleanly when unset, so builds without it still succeed.
- `SEED_DATABASE_URL` *(optional)* — Override for the seed script when `DATABASE_URL` doesn't point at a direct PG connection. Falls back to `DATABASE_URL`.
