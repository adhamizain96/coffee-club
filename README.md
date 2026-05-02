# Coffee Club

A curated cafe discovery site for Chicago and the surrounding suburbs. Browse cafes, filter by amenities and vibes, read curator-written reviews, and leave anonymous community notes. Visitors can suggest new cafes; the curator reviews them in a moderation queue.

- **Public site** — unauthenticated. Anyone can browse and submit suggestions.
- **Admin queue** — gated by a single `ADMIN_PASSWORD`.

## Tech Stack

- Next.js 16 (App Router, React 19)
- TypeScript
- Prisma 7 + PostgreSQL
- Tailwind CSS v4
- Google Maps (Maps JavaScript, Geocoding, Places)

## Prerequisites

- Node.js 20+
- npm
- Git

## Getting Started

### 1. Clone and install

```bash
git clone https://github.com/adhamizain96/coffee-club.git
cd coffee-club
npm install
```

`prisma generate` runs automatically via `postinstall`.

### 2. Configure environment

```bash
cp .env.example .env
```

Fill in the values listed in [Environment Variables](#environment-variables). For local dev you can leave `ADMIN_PASSWORD` blank — admin routes 401 cleanly when it's unset.

### 3. Start the local database

```bash
npx prisma dev
```

Starts a Prisma-managed PostgreSQL instance. Leave it running. The command prints two URLs — copy them into `.env`:

- The **raw `postgres://`** URL → `DATABASE_URL`
- The **`prisma+postgres://`** URL → `PRISMA_PROXY_URL`

```env
DATABASE_URL="postgres://postgres:postgres@localhost:51214/template1?sslmode=disable"
```

The port may vary — use the one printed by `npx prisma dev`.

### 4. Push schema and seed

In a new terminal:

```bash
npx prisma db push
npm run db:seed
```

Seeds 32 curated cafes (Chicago + suburbs), tags, and sample notes. Wipes `cafe_tags`, `notes`, `cafes`, and `tags` first; **does not** touch the `cafe_submissions` queue.

### 5. Run the app

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Local Development

### Terminal layout

Local dev needs three terminals:

| # | Command | Purpose |
|---|---------|---------|
| 1 | `npx prisma dev` | Local PostgreSQL (long-running) |
| 2 | `npx prisma db push` then `npm run db:seed` | Schema push + seed (one-shot) |
| 3 | `npm run dev` | Next.js dev server (long-running) |

### Shutdown order

Always Ctrl+C — never close the window.

1. Stop **Terminal 3** (`npm run dev`) first.
2. Then stop **Terminal 1** (`npx prisma dev`).

Stopping in the wrong order leaves a stale handle on the durable-streams SQLite file, which causes `EBUSY` on the next `npx prisma dev`.

### Recovering from `EBUSY` (Windows)

Symptom:

```
ERROR  EBUSY: resource busy or locked, unlink
  '...\prisma-dev-nodejs\Data\durable-streams\default\durable-streams.sqlite-shm'
```

Common causes: a hard kill, the wrong shutdown order, or Defender real-time scanning during the unlink.

One-step recovery:

```powershell
.\scripts\dev-reset.ps1
```

The script surgically stops project-tied node processes (it never blanket-kills `node.exe`), removes the stale `durable-streams\default` folder, and prints the restart sequence. The main PostgreSQL data in `...\Data\default\.pglite` is preserved, so re-seeding is optional.

Optional: add the Prisma data dir to Defender exclusions to reduce transient `EBUSY` (requires admin):

```powershell
Add-MpPreference -ExclusionPath "$env:LOCALAPPDATA\prisma-dev-nodejs"
```

## Environment Variables

| Variable | Required | Purpose |
|---|---|---|
| `DATABASE_URL` | yes | Raw `postgres://` connection. Used by the app (PrismaPg adapter) and the seed script. |
| `PRISMA_PROXY_URL` | local dev | `prisma+postgres://` URL from `npx prisma dev`. Used by `prisma.config.ts` for `db push` and migrations. |
| `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` | yes | Map view (browser) + Geocoding + Places (server). Enable all three APIs on the key. The geocode script needs an unrestricted or IP-restricted key — referrer-only browser keys fail server-side. |
| `ADMIN_PASSWORD` | for moderation | Password for `/admin/login`. Doubles as the HMAC signing secret for the admin cookie, so rotating it logs out every active session. Admin routes 401/redirect cleanly when unset. |
| `SEED_DATABASE_URL` | optional | Override DB URL for the seed script only. Falls back to `DATABASE_URL`. |

Production-specific notes are in [Deployment](#deployment-vercel).

## Scripts

| Script | What it does |
|---|---|
| `npm run dev` | Start the Next.js dev server. |
| `npm run build` | Production build. |
| `npm run lint` | Run ESLint. |
| `npm run db:push` | Push the Prisma schema to the database. |
| `npm run db:seed` | Insert 32 curated cafes, tags, and sample notes. Wipes `cafe_tags`, `notes`, `cafes`, `tags` first; leaves `cafe_submissions` alone. |
| `npx tsx scripts/geocode-cafes.ts` | Re-geocode every cafe address against the Google Maps Geocoding API and rewrite `latitude`/`longitude` in `prisma/seed.ts` in place. Prints a delta table; flags any cafe that moves >200 m. |
| `.\scripts\dev-reset.ps1` *(Windows)* | Recover from `EBUSY` on `npx prisma dev`. See [Recovering from `EBUSY`](#recovering-from-ebusy-windows). |

## Project Structure

```
coffee-club/
├── prisma/
│   ├── schema.prisma            # Cafe, Tag, CafeTag, Note, CafeSubmission
│   └── seed.ts                  # 32 cafes, tags, sample notes, image URL list
├── prisma.config.ts             # Prisma CLI config (DB URL for migrations)
├── scripts/
│   ├── dev-reset.ps1            # PowerShell helper for Prisma EBUSY recovery
│   └── geocode-cafes.ts         # Re-geocode cafe addresses via Google Maps
├── src/
│   ├── proxy.ts                 # Next 16 Proxy — gates /admin/* behind signed cookie
│   ├── app/
│   │   ├── layout.tsx           # Root layout
│   │   ├── page.tsx             # Homepage (server)
│   │   ├── HomeContent.tsx      # Homepage client (filter state)
│   │   ├── loading.tsx · error.tsx · not-found.tsx
│   │   ├── cafes/[id]/          # Detail page + notes form
│   │   ├── submit/              # /submit + /submit/thanks (public submission)
│   │   ├── admin/
│   │   │   ├── login/           # Password form
│   │   │   └── submissions/     # Queue + per-row reject + edit/approve
│   │   └── api/
│   │       ├── cafes/           # GET list + GET detail
│   │       ├── notes/           # POST community note
│   │       ├── ratings/         # GET Google Places ratings batch
│   │       ├── submissions/     # POST public submission
│   │       └── admin/           # login · logout · geocode · approve · reject
│   ├── components/              # FilterPanel, CafeCard, CafeMap, etc.
│   ├── hooks/useCafes.ts        # Client-side filtering (AND/OR logic)
│   └── lib/
│       ├── prisma.ts            # Prisma client (PrismaPg adapter)
│       ├── types.ts             # Shared types and DTOs
│       ├── tag-display.ts       # Tag chip labels + groupings
│       ├── rate-limit.ts        # In-memory rate limiter (notes + submissions)
│       ├── geocode.ts           # Server-side Google Geocoding wrapper
│       ├── google-places.ts     # Server-side Google Places lookup with cache
│       └── admin-auth.ts        # HMAC-signed cookie + constant-time compare
├── .env.example
└── package.json
```

## Cafe Submissions

Cafes reach the map two ways:

1. **Curator-seeded** — added to `prisma/seed.ts` and applied via `npm run db:seed`. Used for the initial 32 and any large batched additions.
2. **Visitor-suggested** — submitted at `/submit`, reviewed at `/admin/submissions`, published with one click.

### Visitor flow (`/submit`)

The form ([`src/app/submit/SubmitForm.tsx`](src/app/submit/SubmitForm.tsx)) is linked from the home page header and the cafe detail bar. It collects:

| Field | Constraints |
|---|---|
| Cafe name | 2–100 chars |
| Address | 5–200 chars; geocoded on approval |
| Website | Required; full URL or bare domain (`instagram.com/handle`) |
| Why you like it | Optional, ≤280 chars; pre-fills the description on the approval form |
| Suggested tags | Optional; pre-checked on the approval form |
| Submitter name | 1–50 chars; published as "Suggested by [name]" if approved |

`POST /api/submissions` ([route](src/app/api/submissions/route.ts)):

- Rate-limited to **3 submissions per IP per hour** (in-memory).
- Honeypot field `companyName` — bots populate it; the API returns a silent 200 with no insert, so bots get no signal.
- Validates field lengths, normalizes the address (lowercase, collapsed whitespace, trailing punctuation stripped), and dedupes against any existing `PENDING` or `APPROVED` submission with the same normalized address (returns 409).
- On success, writes a `CafeSubmission` row with `status = PENDING` and redirects to `/submit/thanks`.

No email is collected and no notifications are sent — submitters re-check the map later.

### Curator flow (`/admin/submissions`)

Every `/admin/*` and `/api/admin/*` route is gated by [`src/proxy.ts`](src/proxy.ts) (Next 16 Proxy), which verifies an HMAC-signed cookie. Three paths always pass through: `/admin/login` and `/api/admin/login` so you can't lock yourself out, and `/api/admin/logout` so it stays idempotent — clicking it with an expired/missing cookie still clears the browser cookie and redirects to `/admin/login` instead of returning 401.

#### 1. Sign in

Visit `/admin/login` and enter `ADMIN_PASSWORD`. The session cookie expires after 30 days. Because the password doubles as the HMAC signing secret, rotating it instantly invalidates every active session ([`src/lib/admin-auth.ts`](src/lib/admin-auth.ts)).

#### 2. Triage the queue

`/admin/submissions` shows a tab filter (`pending` is the default; also `approved`, `rejected`, `all`). Each row surfaces:

- Submitter's note and suggested tag chips
- Address (linked to Google Maps)
- Website
- Submission timestamp + review timestamp (if any)

Pending rows expose two inline actions: **Reject** and **Approve**.

#### 3. Reject

Inline button — prompts for an optional internal note. `POST /api/admin/submissions/[id]/reject` marks the row `REJECTED`, stamps `reviewedAt`, and stores the note in `rejectionReason`. The note is **internal only** — never shown to the submitter.

#### 4. Approve

Opens `/admin/submissions/[id]/edit`, pre-filled with:

- Cafe name, address, and "why you like it" (used as the description draft)
- Submitter's tags, pre-checked on a chip picker covering all tags
- A server-side Google geocode — formatted address, lat/lng, neighborhood (when available)

If geocoding fails, the form shows a banner and a **Re-geocode** button so you can correct the address and retry without leaving the page.

Fill in the remaining cafe fields (image URL, owner review, neighborhood if Google didn't return one), tweak anything the visitor got wrong, and submit. `POST /api/admin/submissions/[id]/approve` runs everything in one atomic transaction:

- Latches the submission `PENDING → APPROVED` via `updateMany` filtered on `status = PENDING` (race-safe against double-approval).
- Creates the `Cafe` row with `submitterName` and `addedAt` backfilled from the submission.
- Inserts `CafeTag` rows for the chosen tags.
- Backlinks `submission.approvedCafeId → cafe.id` so the queue can deep-link to the published cafe.

The new cafe appears on the public map and detail page immediately — no rebuild needed.

#### 5. Sign out

Header button → `POST /api/admin/logout` clears the cookie.

### Adding cafes via seed

Use the seed for the initial set or large batched additions:

- Append the new cafe to the `cafes` array in `prisma/seed.ts`.
- Append a corresponding image URL to `CAFE_IMAGES` at the **same index**. Cafes match images by array position.
- Use a real photo of the actual cafe — official site, official Instagram, or a reputable publication. **No** stock photos, **no** Yelp/Google user uploads, **no** AI-generated images.
- Use only real, currently operating cafes — verify before adding.
- After adding, run `npx tsx scripts/geocode-cafes.ts` to lock in accurate coordinates from the address.

### Tag reference

Defined as `as const` in `prisma/seed.ts`.

**Amenities** — filter logic is **AND** (cafe must have all selected):

`wifi`, `outlets`, `outdoor_seating`, `pet_friendly`, `parking`, `bar_seating`, `communal_tables`, `couch_seating`, `laptop_friendly`, `meeting_space`, `no_laptops`, `full_menu`, `pastries_only`, `vegan_options`, `whisper_quiet`, `moderate_noise`, `bustling`, `early_bird`, `late_night`, `weekend_brunch`

**Vibes** — filter logic is **OR** (cafe must have at least one selected):

`cozy`, `study-friendly`, `quiet`, `lively`, `bright`, `date-spot`

## Deployment (Vercel)

### Environment variables

Set on **Production + Preview + Development** before the first build:

- **`DATABASE_URL`** — `postgres://` with `?sslmode=require`. For providers offering both pooled and direct URLs (Neon, Supabase): use the **pooled** URL. Vercel functions are serverless and exhaust direct connections under load. PrismaPg + node-pg is safe with PgBouncer transaction-mode pooling because it doesn't use server-side prepared statements.
- **`NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`** — must be set **before** the first build. `NEXT_PUBLIC_*` vars are inlined into the JS bundle at build time, so changes after deploy require a rebuild. The key is also used **server-side** for `/api/ratings`, the cafe detail page (Place Details), and the admin geocode — enable **Maps JavaScript**, **Places**, and **Geocoding** APIs. Referrer restrictions don't block server calls; set the primary referrer to `https://coffee-club.dev/*` and add `https://*.vercel.app/*` for previews.
- **`ADMIN_PASSWORD`** — required for the moderation queue. Mark **Sensitive** in Vercel. Without it, every admin route 401/redirects, so visitors can still submit but you can't review.

### Initial database setup

Use the **direct** (non-pooled) URL — `db push` and the seed script need session-mode connections, not transaction-mode pooling:

```bash
DATABASE_URL='postgres://...direct-url...?sslmode=require' npx prisma db push
DATABASE_URL='postgres://...direct-url...?sslmode=require' npm run db:seed
```

`prisma generate` runs automatically during the Vercel build via `postinstall`. No build command override needed.

### Known limitations

- **`/cafes/<bad-id>` returns HTTP 200, not 404.** The not-found UI from `src/app/not-found.tsx` renders correctly and Next.js injects `<meta name="robots" content="noindex">`, but the response status stays 200. This is documented Next.js 16 behavior for streamed responses (see `node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/not-found.md`: *"Next.js will return a `200` HTTP status code for streamed responses, and `404` for non-streamed responses"*). Search engines respect the `noindex` meta, so SEO is unaffected; only programmatic clients that key off the status code are.
- **In-memory rate limiter** (`src/lib/rate-limit.ts`) and **Google Places cache** (`src/lib/google-places.ts`) are per-process. Each Vercel function invocation may land in a fresh process, so rate-limit budgets reset between cold starts and the cache amortizes only within a warm function. For higher traffic, swap in a Redis-backed limiter.
- **Submission rate-limit keys on `x-forwarded-for`** with a fallback bucket of `"unknown"`. Behind Vercel the header is set, so this is fine in production. Direct (no-proxy) traffic all collapses into the `unknown` bucket and a single bad actor can starve everyone.

### Deployment Protection

Vercel enables **Deployment Protection** by default on Hobby projects, gating every deployment behind a Vercel SSO challenge. For a public site, disable it:

**Project Settings → Deployment Protection → Vercel Authentication: Disabled**

Runtime setting — no redeploy needed.
