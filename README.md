# Coffee Club

A curated cafe discovery site for Chicago and the surrounding suburbs. Users can browse cafes, filter by amenities and vibes, read curator-written reviews, and leave anonymous community notes. Cafes are hand-picked and managed by the site owner — there is no user authentication or user-submitted cafe listings.

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

### Step 1 — Clone the repo

```bash
git clone <repo-url>
cd coffee-club
```

### Step 2 — Install dependencies

```bash
npm install
```

This also runs `prisma generate` automatically via the `postinstall` script.

### Step 3 — Set up environment variables

```bash
cp .env.example .env
```

The `.env.example` file contains a placeholder `DATABASE_URL`. For local development using Prisma's built-in dev server (Step 4), this will be overwritten automatically — no manual edits needed.

### Step 4 — Start the Prisma dev server

```bash
npx prisma dev
```

This starts a local PostgreSQL instance managed by Prisma. Leave this running in its own terminal. It will print a connection URL — the `.env` file will need `DATABASE_URL` set to the **raw PostgreSQL URL** (the `postgres://...` line), not the proxy URL.

After starting, update your `.env`:

```
DATABASE_URL="postgres://postgres:postgres@localhost:51214/template1?sslmode=disable"
```

The port may vary — use the one printed by `npx prisma dev`.

### Step 5 — Push the database schema

In a new terminal:

```bash
npx prisma db push
```

This creates all tables in your local PostgreSQL instance.

### Step 6 — Seed the database

```bash
npm run db:seed
```

This populates the database with 10 curated Chicago-area cafes, predefined tags, and sample community notes.

### Step 7 — Start the dev server

```bash
npm run dev
```

### Step 8 — Open the app

Visit [http://localhost:3000](http://localhost:3000) in your browser.

### Terminal Layout

You'll need three terminal windows running simultaneously:

| Terminal | Command | Purpose |
|----------|---------|---------|
| 1 | `npx prisma dev` | Local PostgreSQL server |
| 2 | `npm run dev` | Next.js dev server |
| 3 | (ad hoc) | Running commands like `db push`, `db:seed`, etc. |

## Project Structure

```
coffee-club/
├── prisma/
│   ├── schema.prisma       # Database schema (Cafe, Tag, CafeTag, Note)
│   └── seed.ts             # Seed script with 10 cafes + tags + notes
├── prisma.config.ts        # Prisma CLI config (DB URL for migrations)
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

The app is configured for Vercel deployment. Key requirements:

- Set `DATABASE_URL` in Vercel environment variables, pointing to a production PostgreSQL instance (e.g., Neon, Supabase, or Railway). This must be a raw `postgres://` connection string.
- The `postinstall` script runs `prisma generate` automatically during the build.
- Run `npx prisma db push` against your production database before the first deployment to create tables.
- Seed the production database with `npm run db:seed` if you want the sample data.

## Adding Cafes

Cafes are curated and not user-submitted. To add or modify cafes, update the seed data in `prisma/seed.ts` and re-run `npm run db:seed`, or insert records directly into the database. The predefined tags are:

- **Amenities**: wifi, outlets, outdoor_seating, pet_friendly, parking
- **Vibes**: cozy, study-friendly, quiet, lively, bright, date-spot
