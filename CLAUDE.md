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
