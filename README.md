# Coffee Club

A curated cafe discovery site for Chicago and the surrounding suburbs. Browse cafes, filter by amenities and vibes, read curator-written reviews, and leave anonymous community notes. Visitors can suggest cafes via `/submit`; suggestions land in a moderation queue at `/admin/submissions` where the curator reviews, edits, and publishes them. Public viewing is unauthenticated; the admin queue is gated by a single `ADMIN_PASSWORD`.

## Tech Stack

- Next.js 16 (App Router)
- TypeScript
- Prisma 7 ORM
- PostgreSQL
- Tailwind CSS v4

## Prerequisites

- Node.js 18+
- npm
- Git

## Local Setup

### 1. Clone and install

```bash
git clone https://github.com/adhamizain96/coffee-club.git
cd coffee-club
npm install
```

`prisma generate` runs automatically via the `postinstall` script.

### 2. Set up environment variables

```bash
cp .env.example .env
```

Required variables in `.env`:

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | Raw `postgres://` connection string. Used by the app (PrismaPg adapter) and the seed script. For local dev, set to the URL printed by `npx prisma dev` (typically port 51214). |
| `PRISMA_PROXY_URL` | The `prisma+postgres://` proxy URL printed by `npx prisma dev`. Used by `prisma.config.ts` for CLI operations like `db push` and migrations. |
| `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` | Google Maps JavaScript API key for the map view, the Geocoding API for `scripts/geocode-cafes.ts`, and the server-side geocode in the admin approval flow. The geocode script needs a key that is unrestricted or allows the local IP — referrer-only browser keys will fail server-side. |
| `ADMIN_PASSWORD` | Password for `/admin/login`. Doubles as the HMAC signing secret for the admin session cookie, so rotating it logs out every active session. Admin routes 401/redirect cleanly when unset, so builds without it still succeed. |
| `SEED_DATABASE_URL` *(optional)* | Override for the seed script when `DATABASE_URL` points at a non-direct connection. Falls back to `DATABASE_URL`. |

### 3. Start the Prisma dev server

```bash
npx prisma dev
```

This starts a local PostgreSQL instance managed by Prisma. Leave it running in its own terminal. It prints a connection URL — update your `.env` with the **raw PostgreSQL URL** (`postgres://...`), not the proxy URL:

```
DATABASE_URL="postgres://postgres:postgres@localhost:51214/template1?sslmode=disable"
```

The port may vary — use the one printed by `npx prisma dev`.

### 4. Push schema and seed

In a new terminal:

```bash
npx prisma db push
npm run db:seed
```

This creates all tables and populates the database with 32 curated cafes (Chicago + Chicagoland suburbs), predefined tags, and sample community notes.

### 5. Start the dev server

```bash
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000).

### Terminal Layout

Local dev needs three terminals — the Prisma dev server and the Next.js dev server both run in the foreground, and a third is needed for one-time commands like `db:push` and `db:seed`:

| Terminal | Command | Purpose |
|----------|---------|---------|
| 1 | `npx prisma dev` | Local PostgreSQL server (long-running) |
| 2 | `npx prisma db push` then `npm run db:seed` | One-time schema push + seed |
| 3 | `npm run dev` | Next.js dev server (long-running) |

**Shutdown order** (to avoid Prisma `EBUSY` errors next time):
stop Terminal 3 first, then Terminal 1. Always Ctrl+C — never close the window.

### Troubleshooting: `EBUSY` on `npx prisma dev`

If `npx prisma dev` fails with:

```
ERROR  EBUSY: resource busy or locked, unlink
  '...\prisma-dev-nodejs\Data\durable-streams\default\durable-streams.sqlite-shm'
```

A previous Prisma dev process did not release its handle on the durable-streams SQLite files. This is most likely after a hard kill (Ctrl+C during a write, closing the terminal, sleep/wake) and is occasionally amplified by Defender briefly opening the file for real-time scanning during the unlink.

**Shutdown order to prevent it**: stop `npm run dev` first (Terminal 3), then `npx prisma dev` (Terminal 1). Always Ctrl+C — never just close the window.

**One-step recovery**:

```powershell
.\scripts\dev-reset.ps1
```

The script surgically stops project-tied node processes (it never blanket-kills `node.exe`), removes the stale `durable-streams\default` folder, and prints the restart sequence. The main PostgreSQL data in `...\prisma-dev-nodejs\Data\default\.pglite` is left alone, so re-seeding is optional.

## Scripts

| Script | What it does |
|---|---|
| `npm run dev` | Start the Next.js dev server. |
| `npm run build` | Production build. |
| `npm run lint` | Run ESLint. |
| `npm run db:push` | Push the Prisma schema to the database. |
| `npm run db:seed` | Insert all 32 curated cafes, tags, and sample notes. Wipes existing rows in `cafe_tags`, `notes`, `cafes`, `tags` first. |
| `npx tsx scripts/geocode-cafes.ts` | Re-geocode every cafe address against the Google Maps Geocoding API and rewrite the `latitude`/`longitude` lines in `prisma/seed.ts` in place. Prints a delta table; flags any cafe that moves >200 m. |
| `.\scripts\dev-reset.ps1` *(Windows)* | Recover from `EBUSY` on `npx prisma dev`. Surgically stops project-tied node processes (no blanket kill) and removes the stale `durable-streams\default` folder. See Troubleshooting above. |

## Project Structure

```
coffee-club/
├── prisma/
│   ├── schema.prisma       # Database schema (Cafe, Tag, CafeTag, Note)
│   └── seed.ts             # 32 cafes, tags, sample notes, image URL list
├── prisma.config.ts        # Prisma CLI config (DB URL for migrations)
├── scripts/
│   ├── dev-reset.ps1       # PowerShell helper for Prisma EBUSY recovery
│   └── geocode-cafes.ts    # Re-geocode cafe addresses via Google Maps
├── src/
│   ├── proxy.ts            # Next 16 Proxy — gates /admin/* and /api/admin/* behind signed cookie
│   ├── app/
│   │   ├── layout.tsx      # Root layout with header
│   │   ├── page.tsx        # Homepage (server component, fetches cafes)
│   │   ├── HomeContent.tsx  # Homepage client component (filter state)
│   │   ├── loading.tsx     # Homepage loading skeleton
│   │   ├── error.tsx       # Homepage error boundary
│   │   ├── not-found.tsx   # 404 page
│   │   ├── cafes/[id]/
│   │   │   ├── page.tsx    # Cafe detail page (server component)
│   │   │   ├── CafeDetailNotes.tsx  # Notes + form (client component)
│   │   │   ├── loading.tsx # Detail page loading skeleton
│   │   │   └── error.tsx   # Detail page error boundary
│   │   ├── submit/
│   │   │   ├── page.tsx       # Public submission form (server shell + tag fetch)
│   │   │   ├── SubmitForm.tsx # Client form with validation + honeypot
│   │   │   └── thanks/page.tsx # Confirmation landing page
│   │   ├── admin/
│   │   │   ├── login/page.tsx # Password form (single field)
│   │   │   └── submissions/
│   │   │       ├── page.tsx                # Queue with status filter
│   │   │       ├── SubmissionRowActions.tsx # Reject button + reason prompt
│   │   │       └── [id]/edit/
│   │   │           ├── page.tsx              # Pre-fill form with server-side geocode
│   │   │           └── EditApprovalForm.tsx  # Edit cafe fields then approve
│   │   └── api/
│   │       ├── cafes/
│   │       │   ├── route.ts       # GET /api/cafes (list + filter)
│   │       │   └── [id]/route.ts  # GET /api/cafes/[id] (detail)
│   │       ├── notes/route.ts     # POST /api/notes (submit note)
│   │       ├── ratings/route.ts   # GET /api/ratings (Google Places ratings batch)
│   │       ├── submissions/route.ts # POST /api/submissions (public submit)
│   │       └── admin/
│   │           ├── login/route.ts             # POST — set HMAC-signed cookie
│   │           ├── logout/route.ts            # POST — clear cookie
│   │           ├── geocode/route.ts           # POST — re-geocode address inside the edit form
│   │           └── submissions/[id]/
│   │               ├── approve/route.ts       # POST — atomic submission→cafe transaction
│   │               └── reject/route.ts        # POST — mark REJECTED with optional internal note
│   ├── components/
│   │   ├── FilterPanel.tsx  # Amenity/vibe filter sidebar + mobile drawer
│   │   ├── CafeCard.tsx     # Cafe card with image, tags, link
│   │   ├── CafeList.tsx     # Responsive grid of CafeCards
│   │   ├── CafeMap.tsx      # Google Maps view + clustering
│   │   ├── CafeMapLoader.tsx # Dynamic-import wrapper for the map
│   │   ├── TagBadge.tsx     # Colored pill for amenity/vibe tags
│   │   ├── NotesList.tsx    # List of community notes
│   │   ├── NoteForm.tsx     # Note submission form with validation
│   │   ├── GoogleReviews.tsx # Google Places reviews block on detail page
│   │   └── IosInstallHint.tsx # PWA install prompt for iOS Safari
│   ├── hooks/
│   │   └── useCafes.ts     # Client-side filtering hook (AND/OR logic)
│   └── lib/
│       ├── prisma.ts       # Prisma client singleton (PrismaPg adapter)
│       ├── types.ts        # Shared TypeScript types and DTOs
│       ├── tag-display.ts  # Tag chip labels + category groupings
│       ├── rate-limit.ts   # In-memory rate limiter (notes + submissions)
│       ├── geocode.ts      # Server-side Google Geocoding wrapper used in approve flow
│       ├── google-places.ts # Server-side Google Places lookup with cache
│       └── admin-auth.ts   # HMAC-signed cookie + constant-time password compare
├── .env.example            # Environment variable template
└── package.json
```

## Deployment (Vercel)

### Environment variables

Set on **Production + Preview + Development** before the first build:

- `DATABASE_URL` — raw `postgres://` connection string with `?sslmode=require`. For providers that expose both a pooled and a direct URL (Neon, Supabase): use the **pooled** URL here. Vercel functions are serverless and will exhaust direct connections under load. The PrismaPg + node-pg combo is safe with PgBouncer transaction-mode pooling because it doesn't use server-side prepared statements.
- `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` — must be set **before** the first build. `NEXT_PUBLIC_*` vars are inlined into the JS bundle at build time, not read at runtime; adding it after deploy requires a rebuild. The same key is also used **server-side** by `/api/ratings`, the cafe detail page (Place Details lookups), and the admin approval geocode, so the key must have **Places API** and **Geocoding API** enabled in addition to Maps JavaScript API. Referrer restrictions don't block server-side calls — set the primary referrer to `https://coffee-club.dev/*` and add `https://*.vercel.app/*` as a preview/fallback referrer.
- `ADMIN_PASSWORD` — required for the moderation queue at `/admin/submissions`. Mark it **Sensitive** in Vercel and set it on Production + Preview + Development. Without it, every admin route 401/redirects, so visitors can still submit but you can't review.

### Initial database setup

Use the **direct** (non-pooled) connection URL for these — `prisma db push` and the seed script need a session-mode connection, not transaction-mode pooling:

```bash
DATABASE_URL='postgres://...direct-url...?sslmode=require' npx prisma db push
DATABASE_URL='postgres://...direct-url...?sslmode=require' npm run db:seed
```

`prisma generate` runs automatically during the Vercel build via the `postinstall` script — no build command override needed.

### Deployment Protection

Vercel enables **Deployment Protection** by default on Hobby projects, gating every deployment behind a Vercel SSO challenge. For a public site, disable it: **Project Settings → Deployment Protection → Vercel Authentication: Disabled**. This is a runtime setting — no redeploy needed.

## Cafe Submissions

There are two ways a cafe can land on the map:

1. **Curator-seeded** — added directly to `prisma/seed.ts` and applied via `npm run db:seed`. Use for the initial 32 cafes and any large batched additions.
2. **Visitor-suggested** — submitted at `/submit`, reviewed by the curator at `/admin/submissions`, and published with one click.

### Visitor flow (`/submit`)

`/submit` is linked from the home page header (mobile + desktop) and the cafe detail bar. The form (`src/app/submit/SubmitForm.tsx`) collects:

- **Cafe name** (2–100 chars)
- **Address** (5–200 chars) — full street address; the admin flow geocodes it on approval.
- **Website** (required) — accepts a full URL or a bare domain like `instagram.com/handle`.
- **Why you like it** (optional, ≤280 chars) — pre-fills the description on the approval form.
- **Suggested tags** (optional) — pre-checked on the approval form.
- **Submitter name** (1–50 chars) — published as "Suggested by [name]" if approved.

`POST /api/submissions` (`src/app/api/submissions/route.ts`):

- Rate-limits **3 submissions per IP per hour** (in-memory, see `src/lib/rate-limit.ts`).
- Honeypot field `companyName` — bots fill it; on hit the API returns a silent 200 with no insert, so bots get no signal.
- Validates field lengths, normalizes the address (lowercase, collapsed whitespace, trailing punctuation stripped), and dedupes against any existing `PENDING` or `APPROVED` submission with the same normalized address (returns 409).
- On success, writes a `CafeSubmission` row with `status = PENDING` and redirects to `/submit/thanks`.

No email is collected and no notifications are sent — submitters re-check the map later to see if their cafe made it.

### Curator flow (`/admin/submissions`)

The admin gate is enforced by `src/proxy.ts` (Next 16 Proxy, formerly Middleware): every `/admin/*` and `/api/admin/*` route requires a valid HMAC-signed cookie. `/admin/login` and `/api/admin/login` are always allowed through so you can never get locked out.

1. **Sign in** at `/admin/login` with `ADMIN_PASSWORD`. The cookie expires after 30 days. `ADMIN_PASSWORD` doubles as the HMAC signing secret, so rotating it instantly logs out every active session. See `src/lib/admin-auth.ts`.
2. **Queue** at `/admin/submissions` lists submissions with a tab filter (`pending` is the default; `approved`, `rejected`, `all` are also available). Each row shows the submitter's note, suggested tag chips, the address (linked to Google Maps), and the website. Pending rows show inline action buttons.
3. **Reject** (inline button, prompts for an optional internal note) → `POST /api/admin/submissions/[id]/reject`. Marks `REJECTED`, stamps `reviewedAt`, stores the note in `rejectionReason`. The note is internal only — never shown to the submitter.
4. **Approve** opens `/admin/submissions/[id]/edit`, pre-filled with:
   - The submitter's cafe name, address, and "why you like it" (as the description draft).
   - Their suggested tags, pre-selected on a chip picker showing every available tag.
   - A server-side Google geocode of the submitted address — formatted address, lat/lng, and (when Google returns one) neighborhood. If the geocode fails, the form shows a banner and a **Re-geocode** button so you can correct the address and retry without leaving the page.

   You then fill in the remaining cafe fields (image URL, owner review, neighborhood if Google didn't return one), tweak anything the visitor got wrong, and submit. `POST /api/admin/submissions/[id]/approve` runs everything in one atomic transaction:
   - Latches the row from `PENDING → APPROVED` via `updateMany` filtered on `status = PENDING` — race-safe against double-approval.
   - Creates the `Cafe` row with `submitterName` and `addedAt` backfilled from the submission.
   - Inserts `CafeTag` rows for the chosen tags.
   - Backlinks `submission.approvedCafeId → cafe.id` so the queue can deep-link to the published cafe.

   The new cafe appears on the public map and detail page immediately — no rebuild needed.

5. **Sign out** via the header button (`POST /api/admin/logout` clears the cookie).

### Curator-seeded conventions (`prisma/seed.ts`)

When adding cafes directly to the seed:

- Append the new cafe to the `cafes` array.
- Append a corresponding `imageUrl` to `CAFE_IMAGES` at the **same index**. Each cafe is matched to its image by array position. Use a real photo of the actual cafe — official site, official Instagram, or a reputable publication. No stock photos, no Yelp/Google user uploads, no AI-generated images.
- Use only real, currently operating cafes — verify before adding.
- After adding, run `npx tsx scripts/geocode-cafes.ts` to lock in accurate coordinates from the address rather than estimating.

### Predefined tags

Defined as `as const` in `prisma/seed.ts`:

- **Amenities**: `wifi`, `outlets`, `outdoor_seating`, `pet_friendly`, `parking`, `bar_seating`, `communal_tables`, `couch_seating`, `laptop_friendly`, `meeting_space`, `no_laptops`, `full_menu`, `pastries_only`, `vegan_options`, `whisper_quiet`, `moderate_noise`, `bustling`, `early_bird`, `late_night`, `weekend_brunch`
- **Vibes**: `cozy`, `study-friendly`, `quiet`, `lively`, `bright`, `date-spot`

Filter logic in `useCafes`: amenities use **AND** (cafe must have all selected), vibes use **OR** (cafe must have at least one selected).
