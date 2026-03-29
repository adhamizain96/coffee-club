@AGENTS.md

# Coffee Club

Curated cafe discovery platform for Chicago and surrounding suburbs, built with Next.js 16, TypeScript, Prisma 7, PostgreSQL, and Tailwind CSS.

## Architecture Notes

- **Prisma v7**: DB connection URL is configured in `prisma.config.ts`, not in `schema.prisma`. The `datasource` block in the schema has no `url` field.
- **PrismaPg adapter**: The app uses `@prisma/adapter-pg` which requires a raw `postgres://` connection string. The `prisma+postgres://` proxy URL only works for Prisma CLI operations (migrations, db push).
- **Generated client**: Import from `@/generated/prisma/client`, not `@prisma/client`. Output is at `src/generated/prisma/`.
- **Seed script**: Uses `SEED_DATABASE_URL` (falls back to `DATABASE_URL`) because seeding runs via `tsx` outside the Prisma proxy and needs a direct PostgreSQL connection.
- **Filtering logic**: Amenities use AND (cafe must have all selected), vibes use OR (cafe must have at least one selected).
- **No auth**: No authentication system. Notes are anonymous (optional name field only). Cafes are curated/owner-controlled.

## Commands

```bash
npx prisma dev          # Start local PostgreSQL (must be running before dev server)
npm run dev             # Start Next.js dev server
npm run db:push         # Push schema to database
npm run db:seed         # Seed database with sample data
npx prisma generate     # Regenerate Prisma client
npm run build           # Production build
npm run lint            # Run ESLint
```

## Environment Variables

- `DATABASE_URL` — Raw PostgreSQL connection string (used by the app and seed script)
- `PRISMA_PROXY_URL` — Prisma dev proxy URL (used by `prisma.config.ts` for CLI operations)
