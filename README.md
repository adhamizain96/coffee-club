# Coffee Club

A curated cafe discovery site for Chicago and the surrounding suburbs. Browse cafes, filter by amenities and vibes, read curator-written reviews, and leave anonymous community notes. Cafes are hand-picked and managed by the site owner — there is no user authentication or user-submitted listings.

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
| `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` | Google Maps JavaScript API key for the map view, and the Geocoding API for `scripts/geocode-cafes.ts`. The geocode script needs a key that is unrestricted or allows the local IP — referrer-only browser keys will fail server-side. |
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
│   │   └── api/
│   │       ├── cafes/
│   │       │   ├── route.ts       # GET /api/cafes (list + filter)
│   │       │   └── [id]/route.ts  # GET /api/cafes/[id] (detail)
│   │       └── notes/route.ts     # POST /api/notes (submit note)
│   ├── components/
│   │   ├── FilterPanel.tsx  # Amenity/vibe filter sidebar + mobile drawer
│   │   ├── CafeCard.tsx     # Cafe card with image, tags, link
│   │   ├── CafeList.tsx     # Responsive grid of CafeCards
│   │   ├── TagBadge.tsx     # Colored pill for amenity/vibe tags
│   │   ├── NotesList.tsx    # List of community notes
│   │   └── NoteForm.tsx     # Note submission form with validation
│   ├── hooks/
│   │   └── useCafes.ts     # Client-side filtering hook (AND/OR logic)
│   └── lib/
│       ├── prisma.ts       # Prisma client singleton (PrismaPg adapter)
│       ├── types.ts        # Shared TypeScript types and DTOs
│       └── rate-limit.ts   # In-memory rate limiter for note submission
├── .env.example            # Environment variable template
└── package.json
```

## Deployment (Vercel)

- Set `DATABASE_URL` in Vercel environment variables pointing to a production PostgreSQL instance (e.g., Neon, Supabase, or Railway). Must be a raw `postgres://` connection string.
- Set `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` in Vercel — without it the map view won't render. Restrict the production key by HTTP referrer to your Vercel domain(s).
- `prisma generate` runs automatically during the build via the `postinstall` script.
- Run `npx prisma db push` against your production database before the first deployment.
- Optionally seed production with `npm run db:seed`.

## Adding Cafes

Cafes are curated, not user-submitted. To add or modify cafes, update the seed data in `prisma/seed.ts` and re-run `npm run db:seed`, or insert records directly into the database.

Conventions when adding to `prisma/seed.ts`:

- Append the new cafe to the `cafes` array.
- Append a corresponding `imageUrl` to `CAFE_IMAGES` at the **same index**. Each cafe is matched to its image by array position. Use a real photo of the actual cafe — official site, official Instagram, or a reputable publication. No stock photos, no Yelp/Google user uploads, no AI-generated images.
- Use only real, currently operating cafes — verify before adding.
- After adding, run `npx tsx scripts/geocode-cafes.ts` to lock in accurate coordinates from the address rather than estimating.

Predefined tags (defined as `as const` in `prisma/seed.ts`):

- **Amenities**: `wifi`, `outlets`, `outdoor_seating`, `pet_friendly`, `parking`, `bar_seating`, `communal_tables`, `couch_seating`, `laptop_friendly`, `meeting_space`, `no_laptops`, `full_menu`, `pastries_only`, `vegan_options`, `whisper_quiet`, `moderate_noise`, `bustling`, `early_bird`, `late_night`, `weekend_brunch`
- **Vibes**: `cozy`, `study-friendly`, `quiet`, `lively`, `bright`, `date-spot`

Filter logic in `useCafes`: amenities use **AND** (cafe must have all selected), vibes use **OR** (cafe must have at least one selected).
