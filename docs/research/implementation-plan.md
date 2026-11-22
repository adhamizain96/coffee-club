# Coffee Club overhaul: implementation plan

Date: 2026-11-22. This file is a plan only. No app code, schema, config, or database was changed while writing it.

Source: `docs/research/overhaul-brief.md`, with your decisions from 2026-11-22 applied. Claim labels ([V], [I], [A], [U]) follow the brief.

**Ground rules for every phase:**
- **Prisma 7 setup stays as is.** The DB URL lives in `prisma.config.ts`, the client is imported from `@/generated/prisma/client`, the app uses the PrismaPg adapter, and the seed reads `SEED_DATABASE_URL` with a fallback to `DATABASE_URL`.
- **Tag labels keep their current split.** `src/lib/tag-display.ts` handles chips and `src/components/TagBadge.tsx` handles badges. New label sets (status, region, hours) go in their own modules, never in either of those files.
- **Read the Next 16 docs first.** Before touching a Next API, read its guide in `node_modules/next/dist/docs/` (AGENTS.md).
- **No dependency installs or upgrades.** Nothing in this plan needs a new package. `next/og` ships with Next.
- **One phase = one reviewable diff.** I don't commit.
- **Docs move with the code.** Every phase updates CLAUDE.md and README in the same diff when it changes a documented behavior.
- **Database writes and paid API calls need your approval.** They are listed in the registers at the end and tagged inline as **[W-n]** (DB write) or **[P-n]** (paid call).

---

## How schema changes are applied

- **Verified state:**
  - The repo has no `prisma/migrations/` folder.
  - Schema changes have gone through `npm run db:push`, which is the documented path in CLAUDE.md.
  - `prisma.config.ts` names a migrations path that has never been used.
- **Plan:** keep `db:push` as the path, and make every schema change "expand, then contract":
  1. Add columns as nullable, or with a default.
  2. Backfill the data.
  3. Only then tighten a column to required, in its own small phase.
  
  Every change here is additive except the single tightening step (Phase 1.6).
- **Unknown:** how production's schema is applied today. See question 1.
  - If it's `db push` against the production URL, every phase's production apply is one approval.
  - If you'd rather adopt `prisma migrate` first, do it as a separate phase before 1.3. Baselining with `migrate resolve` writes a `_prisma_migrations` table, which is itself a DB write.
- **After every schema edit,** run `npx prisma generate` (local files only, no DB) before building.

## Standard validation (referenced as "V-std")

1. `npm run lint`. Expect 0 errors. The baseline is 4 `no-img-element` warnings; phases that remove an `<img>` lower that count.
2. `npm run build`. TypeScript and the production bundle must pass.
3. Run locally: `npx prisma dev`, then `npm run db:push` **[W-1]**, then `npm run db:seed` **[W-2]**, then `npm run dev`.
   - This loads Google Maps JS in the browser **[P-1]**.
   - Until Phase 1.2 ships, it also triggers `/api/ratings` **[P-2]**.
4. Smoke-test every route the phase touches, plus the CLAUDE.md smoke list: `/`, `/submit`, `/admin/login`, `/api/cafes`, `/api/cafes?amenities=wifi&vibes=cozy`, and the admin gate (no cookie returns 307 on pages and 401 on APIs; logout returns 303).
5. Screenshots of every changed page at desktop 1440×900 and mobile 390×844, using browser automation against `localhost`. I'll confirm before opening a browser (question 9).

---

# Part 1: Prerequisites

Order: 1.1 → 1.2 → 1.3 → 1.4 → 1.5 → 1.6 → 1.7 → 1.8 → 1.9.

The Google phase is second on purpose. Every app run before it triggers up to 64 Places calls on a cold cache [V code, `api/ratings/route.ts:17-26`].

## Phase 1.1: Seed guard (no schema change)

**Goal:** `db:seed` can only run against a local database, and it says where it's writing before it touches anything.

**Files:** `prisma/seed.ts` (top of `main()`, before line 822), plus a sentence each in `CLAUDE.md` and `README.md`.

**Changes:**
- Parse the connection string with `new URL()`.
- Allow only the hosts `localhost`, `127.0.0.1` and `::1`.
- Otherwise print `Refusing to seed non-local host <host>` and `process.exit(1)`. There is no override flag, which matches your decision that the seed is local-only.
- Log `host:port/database` before writing. Never log the username, password or query string.

**Schema / backfill:** none.

**Risks:**
- A local setup using a hostname alias (e.g. a Docker service name) gets refused. If so, add that host to the allowlist explicitly.
- Deletes still happen in this phase. Phase 1.4 removes them.

**Validation:**
- V-std steps 1–2.
- Run `npm run db:seed` with `SEED_DATABASE_URL` pointed at a fake non-local host (e.g. `postgres://x@example.invalid:5432/db`) and confirm it refuses before connecting. That makes no DB write.
- Run it once against local **[W-2]** and confirm it seeds normally.

**Done:**
- [ ] Non-local hosts are refused with exit code 1.
- [ ] No credentials appear in the output.
- [ ] Local seed is unchanged.
- [ ] CLAUDE.md and README mention the guard.

## Phase 1.2: Google: drop reviews, decide ratings

**Goal:** remove Google reviews. Then do one of:
- **Variant A (recommended):** remove Google ratings entirely.
- **Variant B:** keep ratings, using the new Places API, stored on `Cafe`, with no bulk lookups.

This phase is blocked on question 2 (A or B).

**Files, both variants:**
- Delete `src/components/GoogleReviews.tsx`.
- `src/app/cafes/[id]/page.tsx`: remove the import, line 67's call and line 185's section.
- `src/lib/google-places.ts`: remove the `reviews` field and the `GoogleReview` type, and fix the line 3 comment.

**Variant A files:**
- Delete `src/lib/google-places.ts` and `src/app/api/ratings/route.ts`.
- Remove the ratings state, fetch and props from `src/app/HomeContent.tsx` (lines 16, 29, 32-38, and the `ratings=` props).
- Remove the rating chip and prop from `src/components/CafeCard.tsx`, `CafeList.tsx` and `CafeMap.tsx`.
- Remove the detail-page rating chip (`page.tsx:131-138`).
- Update CLAUDE.md, which mentions the Places cache and `/api/ratings` in Known Behaviors and the smoke list.

**Variant B files:**
- Rewrite `src/lib/google-places.ts` as a single-place lookup using Places API (New) Text Search with a field mask of `places.id,places.rating,places.userRatingCount`. Check the exact field names and SKU against Google's current docs at implementation time; they were not checked here.
- Remove `/api/ratings`.
- `HomeContent` reads ratings from cafe props.
- The detail page refreshes one cafe after the response, using `after()` (read its Next 16 doc first), only when the stored value is older than `GOOGLE_RATING_TTL_DAYS`.
- `GOOGLE_RATING_TTL_DAYS` is a required env var with **no default**. When it's unset, nothing refreshes.

**Schema:**
- Variant A: none.
- Variant B: add `googlePlaceId String?`, `googleRating Float?`, `googleRatingCount Int?` and `googleRatingFetchedAt DateTime?` to `Cafe`. All nullable, applied with `db:push` **[W-1]** locally and **[W-3]** in production.

**Backfill:**
- Variant A: none.
- Variant B: none required. Ratings fill in as detail pages are viewed. Each refresh is a runtime production write **[W-4]** and a Places call **[P-3]**.

**Risks:**
- **Variant B and Google's terms:** Google Maps Platform terms restrict storing Places content other than the place ID [U, from memory; not checked]. Storing a rating for a long period may break them. Check before choosing B.
- **Variant B and the cards:** ratings show only for cafes someone has viewed recently. The cards will look inconsistent.
- **Either variant:** the Maps JS key stays. `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` is still used by the map, `src/lib/geocode.ts` and `scripts/geocode-cafes.ts`.

**Validation:**
- V-std.
- Search `src/` for `/api/ratings`, `GoogleReviews`, `findplacefromtext` and `place/details`. Expect no hits (Variant A), or only the new endpoint (Variant B).
- Network tab on `/`: no ratings request.
- Lint warnings drop to 3 (`GoogleReviews.tsx:96` is gone).

**Done:**
- [ ] No reviews UI and no reviews field.
- [ ] No bulk Places lookups anywhere.
- [ ] Variant A: no Places code at all. Variant B: TTL env var documented in `.env.example` (a config file, so I'll touch it only with your OK) and in CLAUDE.md.
- [ ] Screenshots: home and a detail page at both sizes.

## Phase 1.3: Slugs, expand (nullable column, seed slugs, backfill script)

**Goal:** every cafe gets a stable, human-readable slug, without changing any route yet.

**Files:**
- **New `src/lib/slug.ts`:**
  - `slugify(name)`: NFKD normalize, strip diacritics, lowercase, turn runs of non-`[a-z0-9]` into `-`, trim the dashes.
  - `uniqueSlug(base, isTaken)`: appends `-2`, `-3` and so on until the slug is free.
  - `CUID_SHAPE = /^c[a-z0-9]{24}$/`. A slug must never match it (see the 1.5 risks).
- **`prisma/schema.prisma`:** add `slug String? @unique` to `Cafe`.
- **`prisma/seed.ts`:**
  - Add an explicit `slug` to the `CafeSeed` interface and to all 32 entries.
  - Put it on the line right after `name:`. The geocode script's regex `name: … [\s\S]*? address: … latitude … longitude` (`scripts/geocode-cafes.ts:60-61, 83-85`) still matches when `slug` sits between `name` and `address`.
  - Slugs are written by hand from `slugify(name)` and shown in the diff for review. Example: "Dark Matter Coffee — Star Lounge" becomes `dark-matter-coffee-star-lounge`.
  - `create` writes `slug`. The deletes are still present until 1.4.
- **New `scripts/backfill-slugs.ts`** (tsx, same adapter setup as the seed):
  - Dry run by default.
  - Prints `host:port/db` and a table of id, name and proposed slug for every cafe whose `slug` is null.
  - `--apply` writes inside one transaction.
  - Idempotent: it only touches rows where `slug` is null.
  - Refuses any slug that matches `CUID_SHAPE`.
- **`src/lib/types.ts`:** add `slug` to `CafeListItem`.
- **`src/app/page.tsx`:** select and map `slug`. It isn't used for links yet.

**Schema:** nullable unique column, applied with `db:push` **[W-1]** locally and **[W-5]** in production.

**Backfill:**
- Locally, reseeding covers it **[W-2]**.
- In production:
  1. Run `npx tsx scripts/backfill-slugs.ts` as a dry run. That's read-only, but it connects to production, so I'll ask before running it.
  2. You review the table.
  3. Run `--apply` **[W-6]**.

**Re-geocode:** CLAUDE.md requires it after any seed edit. That's `npx tsx scripts/geocode-cafes.ts`, 32 Geocoding calls **[P-4]**, and `--check` makes the same calls. No address changes in this phase, so see question 8.

**Risks:**
- Two cafes with the same name. `uniqueSlug` handles it. Today's 32 names are unique [V, seed name list].
- Slugs must never change once published. Renaming a cafe does **not** regenerate its slug. Document that in CLAUDE.md.

**Validation:**
- V-std.
- After the local seed, every cafe has a non-null, unique slug (read-only check script or `npx prisma studio`).
- Run the backfill dry run against a local DB where a slug was nulled by hand **[W-1 local]**. It proposes the right slug, and `--apply` fixes it.
- The geocode `--check` output shows 32 parsed cafes, which proves the regex still matches.

**Done:**
- [ ] Column added.
- [ ] 32 seed slugs reviewed.
- [ ] Backfill script defaults to a dry run and is idempotent.
- [ ] Production backfill applied **after your approval**.
- [ ] Geocode script parses all 32.

## Phase 1.4: Non-destructive seed (upsert by slug)

**Goal:** reseeding never deletes notes, admin-approved cafes, or submissions.

**Files:** `prisma/seed.ts` (`main()`, lines 819-878), plus `CLAUDE.md` and `README.md`. Both currently say the seed "wipes existing rows first" and must be corrected.

**Changes:**
- Remove the four `deleteMany()` calls (lines 823-826).
- **Tags:** `upsert` by `name`, which is already `@unique`.
- **Cafes:** `upsert` by `slug`.
  - The `update` branch writes only seed-owned curated fields: name, description, address, neighborhood, lat/lng, `imageUrl` and `ownerReview`, plus the fields later phases add.
  - It never touches `submitterName` or `addedAt`.
- **Sample notes:** created only on the `create` branch. They are never deleted, and never recreated on later runs.
- **Tag links for seed cafes,** inside one `$transaction` per cafe:
  - delete `CafeTag` rows where the `cafeId` is that cafe and the `tagId` isn't in the seed's list
  - `createMany` the rest with `skipDuplicates`
  
  This is the only delete left, and it's limited to tag links on cafes the seed itself owns.
- **Cafes missing from the seed** (admin-approved, or later removed from `seed.ts`) are never touched.
- `CAFE_IMAGES` stays positional, per CLAUDE.md.

**Schema:** none.

**Risks:**
- An admin edit to a seed-owned cafe's curated fields in a local DB is overwritten by the next reseed. That's local-only, which matches the decision.
- Tags removed from `amenityTags` stay in the DB as orphans. That's harmless and documented.

**Validation (all local, [W-2]):**
1. Seed twice. Cafe, tag and note counts are identical after both runs.
2. Add a note through the UI **[W-7 local]**, approve a test submission through the admin flow **[W-7 local]**, then reseed. The note, the approved cafe, the submission and its `approvedCafeId` all survive.
3. V-std steps 1–2.

**Done:**
- [ ] No unscoped `deleteMany` in `seed.ts`.
- [ ] Double-seed is idempotent.
- [ ] UI notes, approved cafes and submissions survive a reseed.
- [ ] Docs corrected.

## Phase 1.5: Slug routing, old-ID redirects, slugs in the approval flow

**Goal:** public URLs become `/cafes/[slug]`, and old `/cafes/<cuid>` links get a real 308.

**Files:**
- **Rename the folder** `src/app/cafes/[id]/` to `src/app/cafes/[slug]/`. That covers `page.tsx`, `loading.tsx`, `error.tsx` and `CafeDetailNotes.tsx`.
  - `page.tsx` and `generateMetadata` look up by `slug`.
  - `CafeDetailNotes` keeps refetching `/api/cafes/${cafe.id}`, since the API stays ID-based.
- **`src/proxy.ts`:**
  - Add `"/cafes/:path*"` to `matcher`.
  - For `/cafes/<seg>` where `seg` matches `CUID_SHAPE`: look up the cafe by `id` and return `NextResponse.redirect(…/cafes/<slug>, 308)`. Anything else passes through with no DB call.
  - Admin gating is unchanged and still applies only to `/admin` and `/api/admin`.
- **Update the link sites:**
  - `src/components/CafeCard.tsx:58`
  - `src/components/CafeMap.tsx:304`
  - `src/app/admin/submissions/page.tsx:212` (use the related cafe's slug)
  - `src/app/admin/submissions/[id]/edit/EditApprovalForm.tsx:175`
- **`src/app/api/admin/submissions/[id]/approve/route.ts`:**
  - Inside the existing transaction, generate the slug with `uniqueSlug(slugify(name), …)`, checking with `tx.cafe.findUnique`, and pass it to `tx.cafe.create` (line 185).
  - Return `{ cafeId, slug }`.
- **`CLAUDE.md`:** update the Known Behaviors entry, which names `/cafes/<bad-id>` and `src/app/cafes/[id]/page.tsx`.

**Why the redirect goes in the proxy:**
- The detail route streams; it has `loading.tsx` [V].
- In a streaming context, `permanentRedirect` sends a client-side meta tag instead of a 308 [V, `node_modules/next/dist/docs/01-app/03-api-reference/04-functions/permanentRedirect.md:11`]. That's the same reason `notFound()` returns 200 here.
- The proxy runs on Node.js by default [V, `proxy.md:219`], so Prisma works there.
- The in-page fallback (look up by id, then `permanentRedirect`) would also work, but it returns a 200 with a client-side redirect.

**Schema / backfill:** none. Depends on 1.3's production backfill being applied.

**Risks:**
- **The ID-shape check.** Prisma's `cuid()` is assumed to produce 25-character IDs starting with `c` [I]. Confirm against a real local row before coding the regex.
- **Proxy cost.** The proxy now imports Prisma. Each old-ID hit costs one extra query; slug requests cost none.
- **Old IDs that are already dead.** IDs from before any past production reseed are already broken and can't be redirected.
- **Collisions.** A cafe name that slugifies to cuid shape is blocked in 1.3.

**Validation:**
- V-std.
- `curl -I localhost:3000/cafes/<a real cuid>` returns `308` with `location: /cafes/<slug>`.
- A bad slug shows the not-found UI (status 200, as documented).
- A test approval **[W-7 local]** lands on `/cafes/<new-slug>`.
- Cards and map popups link to slugs.
- Screenshots: detail page at both sizes.

**Done:**
- [ ] Routes use slugs.
- [ ] Old IDs return 308.
- [ ] The approval flow creates slugs.
- [ ] All 4 link sites updated.
- [ ] CLAUDE.md updated.

## Phase 1.6: Slugs, contract (make required)

**Goal:** `slug String @unique`, not nullable.

**Files:** `prisma/schema.prisma`, plus removing now-unneeded null handling in `types.ts` and `page.tsx`.

**Schema:** a tightening change. `db:push` fails if any row still has a null slug, and that failure is the safety check. Apply locally **[W-1]** and in production **[W-8]**, only after you confirm the 1.3 backfill finished.

**Risks:** if production has rows created between 1.3 and 1.5 without a slug, the push fails. Re-run the backfill (dry run, then **[W-6]**).

**Validation:** V-std, plus a read-only count of `slug IS NULL`, which must be 0 before the push.

**Done:**
- [ ] Column required in both environments.
- [ ] Build passes.

## Phase 1.7: Note moderation

**Goal:** you can hide, unhide or delete any community note from the admin area. Hidden notes never render.

**Files:**
- **`prisma/schema.prisma`:** add `hiddenAt DateTime? @map("hidden_at")` to `Note`.
- **Public reads filter `hiddenAt: null`:**
  - `src/app/cafes/[slug]/page.tsx` (the `notes` include, currently line 45)
  - `src/app/api/cafes/[id]/route.ts:20-22`
  - Any note counts added later.
- **New `src/app/admin/notes/page.tsx`:**
  - All notes, newest first, showing the cafe name (linked), content, author, date and hidden state.
  - `robots: { index: false }`, matching the other admin pages.
  - Pagination via a `?page=` param only if the count warrants it. There's no fixed page size to invent; today's volume is small [I].
- **New `src/app/admin/notes/NoteRowActions.tsx`:** Hide/Unhide, and Delete with a two-step inline confirm. Don't use `window.confirm`.
- **New API routes:** `src/app/api/admin/notes/[id]/route.ts` with `PATCH { hidden: boolean }` and `DELETE`. These are gated by the existing proxy matcher with no change [V, `proxy.ts:11-13`].
- **`src/app/admin/submissions/page.tsx`:** add a "Notes" link in the admin header.

**Schema:** nullable column, applied locally **[W-1]** and in production **[W-9]**.

**Backfill:** none.

**Risks:**
- Hard delete can't be undone. Question 6 asks whether to offer it at all.
- The note POST route (`api/notes/route.ts`) returns the new note even if it's later hidden. That's fine.

**Validation:**
- V-std.
- Locally **[W-7]**: post a note, hide it (it's gone from the detail page and from `/api/cafes/[id]`), unhide it (it's back), delete it.
- Without a cookie, `PATCH` and `DELETE` return 401.
- Screenshots: `/admin/notes` desktop, and the detail page before and after hiding.

**Done:**
- [ ] Hide, unhide and delete work.
- [ ] Hidden notes are absent from every public read.
- [ ] Routes are gated.
- [ ] CLAUDE.md architecture notes updated.

## Phase 1.8: Admin cafe editor (my addition, see "decisions I think are wrong")

**Goal:** edit existing cafes in production without the seed. This becomes the data-entry path for every field Part 2 adds:
- status and last-visited date
- hours and the hours-checked date
- region

**Files:**
- **New `src/lib/cafe-validation.ts`:** pull the field rules and constants out of `api/admin/submissions/[id]/approve/route.ts:7-141` so the approve route and the new PATCH share one validator. The approve route changes only to import it.
- **New `src/app/admin/cafes/page.tsx`:** a list showing name, slug, neighborhood and edit link. Later phases add columns for status, region, hours-checked date and last-visited date.
- **New `src/app/admin/cafes/[id]/edit/page.tsx` and `CafeEditForm.tsx`:**
  - Reuse the field layout from `EditApprovalForm.tsx`, extracting shared field components only where they're actually identical.
  - Fields: name, description, address, neighborhood, lat/lng with a "Geocode" button (an existing endpoint, `/api/admin/geocode`; each click is a Geocoding call **[P-5]**), image URL, curator review and tags.
  - The slug is shown read-only.
- **New `src/app/api/admin/cafes/[id]/route.ts`:** `PATCH`. It validates through `cafe-validation.ts` and replaces the tags inside one transaction.
- **Admin header:** add a "Cafes" link.
- **Out of scope:** "Create a cafe without a submission" (question 5).

**Schema:** none.

**Risks:**
- A production edit is a live write **[W-10]** that you make through the UI. That's the intended workflow, but it's still a write.
- Editing an address doesn't re-geocode automatically. The button is explicit.

**Validation:**
- V-std.
- Locally **[W-7]**: edit a cafe's description and tags, then confirm the public page reflects it.
- The validator rejects bad lat/lng exactly as the approve route does.
- Unauthenticated PATCH returns 401.
- Screenshot: the editor on desktop.

**Done:**
- [ ] Existing cafes are editable.
- [ ] The validator is shared, and the approve route behaves the same as before.
- [ ] Routes are gated.

## Phase 1.9: Fallback for broken images (my addition)

**Goal:** keep the hotlinks (your decision), but replace a dead image with a neutral placeholder instead of a broken-image icon.

**Files:**
- **New `src/components/CafeImage.tsx`:** a client component wrapping `<img>`. `onError` swaps in a styled placeholder showing the cafe initial and the neighborhood.
- **Use it in:**
  - `CafeCard.tsx:68`
  - `CafeMap.tsx:265`
  - `cafes/[slug]/page.tsx:117`
- This keeps the current `<img>` choice, so the lint warnings move into the one component (net count drops by 2).

**Schema / backfill:** none.

**Risks:** the placeholder design needs a light review. It has to look intentional, not like an error.

**Validation:**
- V-std.
- Locally, temporarily point one seed `imageUrl` at an invalid URL **[W-2]**, check the placeholder on the card, popup and detail page, then revert.
- Screenshots at both sizes.

**Done:**
- [ ] No broken-image icon anywhere.
- [ ] The placeholder has been reviewed.

---

# Part 2: Features (priority order from the brief's recommended scope)

The brief's shortlist ranked the passport first. Its build order is different (freshness, then hours, then passport), because the passport needs `status` (closed label) and `region`. This plan follows the build order.

## Phase 2.1: Freshness (status, curator last visited, New badge)

**Goal:**
- Every cafe has a status of OPEN, TEMPORARILY_CLOSED or CLOSED, and closed cafes stay visible with a label.
- Cafes show a "Curator visited <Month Year>" line.
- Recently added cafes show a "New" badge.

**Files:**
- **`prisma/schema.prisma`:**
  - New enum `CafeStatus { OPEN TEMPORARILY_CLOSED CLOSED }`.
  - On `Cafe`: `status CafeStatus @default(OPEN)` and `lastVisitedAt DateTime? @map("last_visited_at")`.
- **New `src/lib/freshness.ts`:**
  - Status labels and styles.
  - `isNew(addedAt, now)`, using `NEW_BADGE_DAYS`. You supply the number (question 3); no default is invented.
  - `formatVisited(date)` (month and year).
- **`src/lib/types.ts`:** add `status`, `lastVisitedAt` and `addedAt` to `CafeListItem`.
- **`src/app/page.tsx`:** map the new fields.
- **`src/components/CafeCard.tsx`:** add a status pill (when not OPEN) and a "New" badge.
- **`src/components/CafeMap.tsx`:**
  - Muted marker style for non-OPEN cafes.
  - The popup shows the status.
  - Also fix line 296: replace the hand-rolled vibe label with `getTagLabel()`. The popup is a chip context, so it uses `tag-display.ts`. This closes the "third label source" finding and keeps the two-file split.
- **`src/app/cafes/[slug]/page.tsx`:** status banner and the "Curator visited" line.
- **`prisma/seed.ts`:** optional `status` and `lastVisitedAt` per entry, after `longitude` so the geocode regex is untouched.
- **Admin editor (1.8):** status select and last-visited date input. Status column on `/admin/cafes`.

**Schema:** enum plus a column with a default plus a nullable column, applied locally **[W-1]** and in production **[W-11]**. Existing rows become OPEN.

**Backfill:**
- `lastVisitedAt` stays null until you enter it in the admin editor **[W-10]**.
- **Never guess a date.** A null shows nothing. It does not show "unknown".
- Seed values are entered by you, or left null.

**Risks:**
- The "New" badge needs `addedAt`. Seed cafes have none [V], so they never show "New" unless you set it.
- A closed cafe showing in "near me" results could annoy users. It's muted and labeled, per your decision.

**Validation:**
- V-std.
- Locally, set one cafe to CLOSED and one with a recent `addedAt` **[W-2]**.
- Check the card, the muted pin, the popup and the detail banner.
- Confirm the popup vibe labels now match the filter chips.
- Screenshots: home and detail at both sizes.

**Done:**
- [ ] Status is shown everywhere a cafe appears.
- [ ] Closed cafes are visible and labeled.
- [ ] "Curator visited" renders only when set.
- [ ] "New" badge works with your `NEW_BADGE_DAYS`.
- [ ] Map label fixed.
- [ ] The admin editor can set the new fields.

## Phase 2.2: Structured hours (model and display)

**Goal:** each cafe stores its weekly hours and the date you checked them. The detail page shows them along with "Hours checked <date>".

**Files:**
- **`prisma/schema.prisma`:** on `Cafe`, add `hours Json?` and `hoursCheckedAt DateTime? @map("hours_checked_at")`.
- **New `src/lib/hours.ts`:**
  - Types: `WeeklyHours = Record<"mon"|…|"sun", { open: "HH:MM"; close: "HH:MM" }[]>`. An empty array means closed that day. `close <= open` means the interval runs past midnight.
  - `parseWeeklyHours(json): WeeklyHours | null`, which validates and rejects malformed data.
  - `formatHoursTable(hours)` for display.
  - `getStatusAt(hours, date)` returns `{ open: boolean; closesAt?: string; opensAt?: string }`, computed in `America/Chicago` through `Intl.DateTimeFormat` parts (correct across DST changes).
- **New `scripts/check-hours.ts`:** plain assertions run with `npx tsx`. The repo has no test runner, and adding one would be a dependency. Cases to cover:
  - overnight intervals
  - days marked closed
  - a time exactly at open or close
  - the DST-change Sunday in March and in November
  - malformed input
- **`src/app/cafes/[slug]/page.tsx`:** a weekly hours table and "Hours checked <date>". If `hours` is null: "Hours not listed" plus a link to the cafe's site, if one is ever added.
- **Admin editor:** a 7-row hours input (add or remove intervals per day) and a "checked on" date that defaults to empty. Never auto-fill today's date.
- **`prisma/seed.ts`:** optional `hours` and `hoursCheckedAt` per entry, after `longitude`.

**Schema:** two nullable columns, applied locally **[W-1]** and in production **[W-12]**.

**Backfill:**
- You enter real hours from each cafe's official site, through the admin editor **[W-10]**.
- **No hours are fabricated, estimated, or pulled from paid APIs.** Cafes without hours show "Hours not listed".

**Risks:**
- Wrong hours are worse than none. The "checked" date must be visible.
- Holiday and seasonal hours are out of scope. Say so in the UI copy.
- The existing `early_bird`, `late_night` and `weekend_brunch` tags may now contradict the structured hours (question 7).

**Validation:**
- `npx tsx scripts/check-hours.ts` passes.
- V-std.
- Locally, enter hours for 2 cafes **[W-2]**, including one overnight interval.
- Screenshots: detail page at both sizes, plus the admin hours editor.

**Done:**
- [ ] The hours library and its assertions pass.
- [ ] The detail page shows the hours and the checked date.
- [ ] The admin editor can enter hours.
- [ ] Null hours are handled.

## Phase 2.3: "Open now" filter and badges

**Goal:** an "Open now" filter chip, plus a "Closes 3pm" / "Opens 7am" badge on cards and in the popup.

**Files:**
- **`src/hooks/useCafes.ts`:** add an `openNow: boolean` option. When it's on, keep only cafes where `status === OPEN`, `hours` is non-null, and `getStatusAt(hours, now).open` is true. Cafes without hours are excluded and counted.
- **`src/components/FilterPanel.tsx`:** an "Open now" toggle, separate from tags, so `tag-display.ts` doesn't change.
- **`src/app/HomeContent.tsx`:** state, a "N cafes have no listed hours" note when the filter is on, and passing `hours` through.
- **`src/components/CafeCard.tsx` and `CafeMap.tsx` popup:** the hours badge.
- **`src/lib/types.ts`:** add `hours` to `CafeListItem`.
- **`src/app/page.tsx`:** map `hours`.

**Client-only time:** compute "now" after mount and on `visibilitychange`, and render a neutral state on the server to avoid hydration mismatches. No polling interval is invented.

**Schema / backfill:** none.

**Risks:**
- **Few cafes with hours means a thin filter.** Ship this after enough hours are entered (question 4).
- **The device clock and timezone don't matter**, since the computation is pinned to `America/Chicago`.

**Validation:**
- V-std.
- Temporarily override `now` in dev (via a `?now=` param read only when `NODE_ENV === "development"`, removed before review) to test morning, late-night and closed-day states.
- Screenshots: filter on and off at both sizes.

**Done:**
- [ ] The filter works.
- [ ] Badges are correct.
- [ ] No hydration warnings in the console.
- [ ] Cafes without hours are counted and explained.

## Phase 2.4: Regions

**Goal:** every cafe belongs to one region, and users can filter by it. The passport builds on this.

**Files:**
- **`prisma/schema.prisma`:** new enum `Region { CITY NORTH_SHORE NORTHWEST WEST SOUTH }`, and `region Region?` on `Cafe`.
- **New `src/lib/regions.ts`:** labels, display order and an optional short blurb. These are separate from the tag label files.
- **`src/components/FilterPanel.tsx`:** region chips, single- or multi-select (OR).
- **`src/hooks/useCafes.ts`:** region filter.
- **Admin editor:** region select. Region column in the list.
- **`prisma/seed.ts`:** `region` per entry, after `longitude`.
- **`src/lib/types.ts` and `src/app/page.tsx`:** map `region`.

**Proposed assignment** [I, from the addresses in `seed.ts`; you approve or change it]:

| Region | Cafes |
|---|---|
| CITY (10) | Metric, Sawada, Osmium, Wormhole, Dark Matter Star Lounge, Bridgeport Coffeehouse, Dollop Streeterville, Sip of Hope, Two Mile (Beverly), Beverly Bakery |
| NORTH_SHORE (11) | Colectivo Evanston, Backlot, Brothers K, Newport, Reprise (all Evanston), Central Station (Wilmette), Glenview Grind, Bean Bar (Northbrook), Complimentary, Harmony (both Highland Park), Hometown (Lake Forest) |
| NORTHWEST (4) | Gerry's (Arlington Heights), Two Libras (Palatine), Sayfani (Schaumburg), Conscious Cup (Barrington) |
| WEST (6) | Groundswell (Forest Park address), Kribi (Oak Park), Five & Hoek (Wheaton), Sparrow (Naperville), Café La Fortuna (Hinsdale), Owl & Lark (La Grange) |
| SOUTH (1) | Pekoe & Bean (Tinley Park) |

**Schema:** enum plus a nullable column, applied locally **[W-1]** and in production **[W-13]**. It's nullable so admin-approved cafes without a region don't block the push.

**Backfill:** in production, set regions through the admin editor (32 edits) **[W-10]**. Or, with your approval, use a dry-run-default `scripts/backfill-regions.ts` that applies the approved table above, keyed by slug **[W-14]**.

**Risks:**
- SOUTH has 1 cafe, which makes a weak passport region (question 10).
- Glenview and Northbrook count as "North Shore" only loosely.
- A cafe with a null region must still appear everywhere. It just counts toward no region.

**Validation:**
- V-std.
- Locally, filter by each region and confirm the counts match the table.
- Screenshots: filters at both sizes.

**Done:**
- [ ] Table approved.
- [ ] Regions set in both environments.
- [ ] Filter works.
- [ ] Null-region cafes handled.

## Phase 2.5: Passport core (localStorage)

**Goal:** "Been here" and "Want to try" toggles on cards and detail pages, saved in the browser and keyed by slug.

**Files:**
- **New `src/lib/passport.ts`:**
  - Storage key `coffee-club:passport:v1` holding `{ version: 1, visited: Record<slug, isoDate>, wantToTry: Record<slug, isoDate> }`.
  - Every read and write is wrapped in try/catch.
  - A version field for future migrations.
- **New `src/hooks/usePassport.ts`:**
  - `useSyncExternalStore`, following the pattern in `src/components/IosInstallHint.tsx`.
  - Subscribes to the `storage` event so other tabs stay in sync.
  - SSR snapshot is empty.
- **New `src/components/PassportToggle.tsx`:** two compact buttons with `aria-pressed`.
- **`CafeCard.tsx`:** the toggle, kept from interfering with the card link or pin button. Same `stopPropagation` pattern as `onPinClick` (lines 109-114).
- **`src/app/cafes/[slug]/page.tsx`:** the toggle near the title. It's a client island, so the page stays a server component.

**Schema / backfill:** none. No DB writes at all.

**Risks:**
- Data lives on one device, and private mode or clearing site data erases it. Say so in a one-line note; export comes in 2.7.
- A slug renamed later would orphan stamps. Slugs are immutable (1.3).

**Validation:**
- V-std.
- Toggle, reload and the state persists.
- Change it in a second tab and the first tab updates.
- With storage blocked (a private window), the toggles still render and fail quietly.
- Screenshots: card and detail at both sizes.

**Done:**
- [ ] Toggles persist.
- [ ] No SSR mismatch.
- [ ] Works when storage is blocked.

## Phase 2.6: Passport page and badges

**Goal:** a `/passport` page with a stamp grid grouped by region, progress per region, and 5 to 8 "next goal" badges.

**Files:**
- **New `src/app/passport/page.tsx`:** a server component that fetches all cafes (slug, name, region, status, neighborhood) and renders the client grid.
- **New `src/app/passport/PassportGrid.tsx`:**
  - Region sections in `regions.ts` order.
  - Stamped and unstamped cafes, with closed cafes labeled (they still count).
  - A "Want to try" list.
- **New `src/lib/passport-badges.ts`:** badge definitions as pure functions of `(visitedSlugs, cafes)`. You approve the badge list and names before implementation (question 11).
- **Navigation:** add a "Passport" link in the home headers (mobile pills at `HomeContent.tsx:117-145`, desktop panel header at `193-214`) and in the detail headers.

**Schema / backfill:** none.

**Risks:**
- Badges can feel gimmicky. Keep the count small, with copy you write.
- The empty state needs care. It's the first thing a reviewer sees on `/passport`.

**Validation:**
- V-std.
- Empty, partial and complete states for one region.
- A closed cafe still shows as stamped.
- Screenshots of all three states at both sizes.

**Done:**
- [ ] Page renders all states.
- [ ] Badges match the approved list.
- [ ] Nav links added.

## Phase 2.7: Passport share card and export/import

**Goal:**
- A shareable progress card without server state.
- JSON export and import, so a passport can move between devices without accounts.

**Files:**
- **New `src/app/p/[code]/page.tsx` and `opengraph-image.tsx`:**
  - `code` encodes only region counts (e.g. `c4-ns6-nw1-w0-s0`), never slugs.
  - The image is text-only (counts, brand). It doesn't fetch any cafe photos, so it doesn't depend on the hotlinks.
  - `params` usage per `opengraph-image.md:221-240` [V].
  - The page validates `code` against the real per-region totals, and an invalid code goes to `notFound()`.
- **`PassportGrid.tsx`:** a "Share" button (Web Share API if available, otherwise copy the link), plus "Export" (download JSON) and "Import" (file input). Import validates `version` and drops unknown slugs.

**Schema / backfill:** none.

**Risks:**
- The card shows counts only, so nothing personal is exposed.
- Import must never run code from the file. Parse it as JSON and validate it.

**Validation:**
- V-std.
- Open `/p/<code>`, then check the `og:image` render at `/p/<code>/opengraph-image`.
- An invalid code returns not-found.
- Round-trip export then import in a fresh profile.
- Screenshots: share page and card.

**Done:**
- [ ] Card renders.
- [ ] Codes are validated.
- [ ] Export and import round-trip.

## Phase 2.8: Shareable filter URLs, search, distance sort

**Goal:**
- Filters, region, open-now and the selected cafe live in the URL (`?amenities=wifi&vibes=cozy&region=WEST&open=1&cafe=<slug>`).
- Name and neighborhood search.
- Sort by distance after "Near me".

**Files:**
- **`src/app/page.tsx`:** read the page `searchParams` prop and pass the initial state to `HomeContent`. The route is already `force-dynamic` [V, line 5], so this avoids `useSearchParams` and its Suspense requirement [V, `use-search-params.md:179-182`].
- **`src/app/HomeContent.tsx`:** write state back with `router.replace(…, { scroll: false })`. Check the Next 16 docs at implementation time for whether `window.history.replaceState` is preferred.
- **New `src/components/SearchBox.tsx`:** a diacritic-insensitive match on name and neighborhood.
- **`src/hooks/useCafes.ts`:** a search term, plus an optional sort by haversine distance.
- **`src/components/CafeMap.tsx`:** lift `userLocation` (currently local state near line 370) up to `HomeContent` through a callback, so the list can sort.

**Schema / backfill:** none.

**Risks:**
- URL churn on every chip toggle. Use `replace`, not `push`.
- Invalid params must be ignored, not crash the page.

**Validation:**
- V-std.
- Paste a filtered URL in a fresh tab and the same view loads.
- Back and Forward behave.
- Search with "cafe" matches "Café".
- Distance sort orders cafes correctly after granting location.
- Screenshots at both sizes.

**Done:**
- [ ] URLs reproduce the view.
- [ ] Search and sort work.
- [ ] Bad params are ignored.

## Phase 2.9: Positioning, OG per cafe, sitemap and robots

**Goal:** the first screen states the concept (the curated guide that covers the suburbs), shared links show a proper card, and search engines get a sitemap.

**Files:**
- **`src/app/HomeContent.tsx`:**
  - Replace the subtitle at line 205 with your positioning line (copy from you, placeholder in the diff).
  - Add a one-line region summary, e.g. "10 in the city, 22 in the suburbs", computed from data, never hard-coded.
  - Same treatment for the mobile sheet header (lines 162-171).
- **`src/app/layout.tsx`:** `openGraph` and `twitter` metadata, plus `metadataBase`, which needs the production URL (question 12).
- **New `src/app/cafes/[slug]/opengraph-image.tsx`:** text-only (name, neighborhood, region, brand). It doesn't fetch the hotlinked photo.
- **New `src/app/sitemap.ts`:** `/`, `/submit`, `/passport`, and every cafe by slug.
- **New `src/app/robots.ts`:** allow `/`, disallow `/admin` and `/api`.
- **Out of scope:** the stone/gray palette (commit `9cc6d8c`), which is still open per your instruction.

**Schema / backfill:** none.

**Risks:**
- Positioning copy is yours to write.
- The claim that no other guide covers the suburbs is [V] for Sprudge and The Infatuation only. Don't make that claim in the UI; state what Coffee Club covers instead.

**Validation:**
- V-std.
- `curl localhost:3000/sitemap.xml` and `/robots.txt`.
- Open `/cafes/<slug>/opengraph-image`.
- Check the meta tags in the page source.
- Screenshots of the first screen at both sizes.

**Done:**
- [ ] New first-screen copy is in place.
- [ ] OG cards render.
- [ ] Sitemap and robots are served.

## Phase 2.10 (stretch): Curated crawls

Only if 2.1–2.9 ship cleanly.

**Goal:** 2 or 3 hand-built routes, each with a stamp-all badge.

**Files:** new `src/app/crawls/page.tsx` and `src/app/crawls/[slug]/page.tsx`, a map overlay in `CafeMap.tsx` (straight lines in visit order; the Directions API is paid and not used), and a badge hook in `passport-badges.ts`.

**Schema:** new models `Collection { id, slug @unique, title, blurb }` and `CollectionCafe { collectionId, cafeId, position, @@unique([collectionId, cafeId]) }`. Applied locally **[W-1]** and in production **[W-15]**. Content is entered through a small admin form or a reviewed script **[W-16]**.

**Risks:** routes break when a cafe closes (show the status, don't remove the stop). Scope creep.

**Done:**
- [ ] 2 or 3 crawls live.
- [ ] Closed stops are labeled.
- [ ] Badge works.

---

# Deferred (not in this overhaul)

- **Your own photos.** Planned field: `Cafe.photoUrl String?` (self-hosted, your own photos) plus `photoCredit String?`. Display prefers `photoUrl` over `imageUrl`. Add it when you have photos; it's a one-column expand with no backfill.
- **Stone palette revert** (`9cc6d8c`): open, per your instruction.
- **Work attributes, drink prices, Metra station mapping:** high upkeep, per the brief.
- **Single-select noise levels:** the empty-result issue from brief 1.6 #5. It changes filter semantics, so it needs your call.
- **City coverage refresh** (e.g. Sprudge's 2026 picks): ongoing content work, done through the admin editor after 1.8.
- **Dependency upgrades** (Next 16.4.x, Prisma 7.10.x): a separate diff, after this overhaul.
- **The Groundswell location mismatch:** a content fix after you confirm the right town (question 13). In the seed it's an address or neighborhood edit, followed by re-geocoding **[P-4]**.

---

# Approval registers

## Database writes

Nothing here runs without your explicit OK for that specific action.

| ID | What | Where | Phases |
|---|---|---|---|
| W-1 | `npm run db:push` | Local dev DB | every schema phase |
| W-2 | `npm run db:seed` (local-only after 1.1) | Local dev DB | validation in most phases |
| W-3 | Schema apply: Google rating columns (Variant B only) | **Production** | 1.2 |
| W-4 | Runtime rating refresh writes (Variant B only) | **Production** | 1.2 onward |
| W-5 | Schema apply: `slug` nullable unique | **Production** | 1.3 |
| W-6 | `scripts/backfill-slugs.ts --apply` | **Production** | 1.3 (re-run in 1.6 if needed) |
| W-7 | Test notes, approvals and edits through the UI | Local dev DB | 1.4, 1.5, 1.7, 1.8 |
| W-8 | Schema apply: `slug` required | **Production** | 1.6 |
| W-9 | Schema apply: `Note.hiddenAt` | **Production** | 1.7 |
| W-10 | Your admin-editor edits (status, last visited, hours, region, content) | **Production** | 1.8 onward |
| W-11 | Schema apply: `CafeStatus`, `status`, `lastVisitedAt` | **Production** | 2.1 |
| W-12 | Schema apply: `hours`, `hoursCheckedAt` | **Production** | 2.2 |
| W-13 | Schema apply: `Region`, `region` | **Production** | 2.4 |
| W-14 | `scripts/backfill-regions.ts --apply` (optional) | **Production** | 2.4 |
| W-15 | Schema apply: `Collection`, `CollectionCafe` | **Production** | 2.10 |
| W-16 | Crawl content entry | **Production** | 2.10 |

Read-only production connections (backfill dry runs, null-slug counts) aren't writes, but they still connect to production. I'll ask before each one.

## Paid API calls

| ID | What | When |
|---|---|---|
| P-1 | Google Maps JS map loads | Any local app run with the key set |
| P-2 | Up to 64 Places calls on a cold cache via `/api/ratings` | Any local app run before Phase 1.2 lands |
| P-3 | Single-cafe Places (New) lookups | Variant B only, at runtime |
| P-4 | `scripts/geocode-cafes.ts` (32 Geocoding calls; `--check` too) | After seed edits, per CLAUDE.md |
| P-5 | Admin "Geocode" button | Each click, 1.8 onward |

---

# Questions blocking specific phases

1. **How is production's schema applied today?** Blocks every production schema apply. Is it `db push` from your machine against the production URL, something in Vercel, or never done?
2. **Ratings:** Variant A (drop) or B (Places New, stored on `Cafe`)? Blocks 1.2.
3. **`NEW_BADGE_DAYS`:** what window? Blocks 2.1's badge.
4. **Hours sourcing:** will you enter hours for all 32 before 2.3 ships, and is "Hours not listed" acceptable for the rest? Affects when 2.3 ships.
5. **Creating a cafe without a submission:** do you need an admin create page, or is submitting through `/submit` and then approving fine? Affects 1.8's scope.
6. **Note moderation:** offer hard delete, or hide only? Blocks 1.7.
7. **Hours tags:** keep, remove, or derive `early_bird`, `late_night` and `weekend_brunch` once structured hours exist? Needed before 2.3.
8. **Re-geocoding:** may it run only when an address actually changes, instead of after every seed edit? Affects P-4 cost in 1.3, 2.1, 2.2 and 2.4.
9. **Screenshots:** OK to drive Chrome against `localhost` for screenshots during implementation?
10. **Regions:** approve the table in 2.4. SOUTH has 1 cafe; keep it, or merge it?
11. **Passport badges:** do you want to write the badge list, or have me propose 5 to 8 for you to edit?
12. **Production URL:** needed for `metadataBase` in 2.9.
13. **Groundswell:** Oak Park or Forest Park?

**Still open, not decided here (per your instruction):** whether `db:seed` has ever run against production, and the stone palette revert (`9cc6d8c`).
