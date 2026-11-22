# Coffee Club overhaul: research brief

Date: 2026-11-22. Scope: read-only research. No app code, schema, config, or database was changed.

**Claim labels**
- **[V] Verified.** Checked in this session, either in the code (file:line) or on a page that was fetched.
- **[I] Inferred.** Reasoned from verified facts, but not directly checked.
- **[A] Assumption.** Not checked.
- **[U] Unverified source.** Taken from a search snippet or memory, or the page was blocked. Used mostly in Phase 2.

There was no `docs/` folder before this file, so `docs/research/` is a new convention.

**Corrections from the plan pass (2026-11-22).** I re-checked every [V] code claim against the files. Fixes:
- `CafeMap.tsx:~292` is now line 296.
- The Near me range is 370-390.
- `seed.ts` `CAFE_IMAGES` spans lines 24-59.
- Image hosts total 16, not about 14.
- "Curator note below the fold" is now [I]. It was never rendered.
- The Places legacy and r2.dev claims are now [U]. They came from search-result summaries, not fetched pages.
- The suburbs-coverage claim now states which guides were actually checked.
- New finding: Groundswell's neighborhood and description say Oak Park, but its address is in Forest Park (1.6 #9).

---

## TL;DR

- **Coffee Club's real edge is not "a cafe map".**
  - It is curated suburbs. 22 of the 32 cafes are outside the city [V]. Sprudge and The Infatuation cover the city only [V], Time Out's list appears to as well [I], and Eater and Axios weren't checked.
  - It is also structured filters. No Chicago editorial guide offers wifi, outlet, or noise as a filter [V].
  - Lead with both.
- **The biggest missing piece is a reason to come back without an account.** The field's best answer is a passport or crawl:
  - the Scoundrel's dive bar passport [V]
  - Cuppa Crawl punch cards [U]
  - campus coffee crawls [U]
  - Untappd badges [V]

  All of that works with localStorage.
- **The biggest trust gap is freshness and hours.**
  - Hours exist only as 3 tags [V].
  - There is no "last visited" or "updated" signal [V].
  - Dead or zombie finders show how staleness kills this category: Bean Hunter, Workfrom, Foursquare City Guide [V].
- **Recommended overhaul: "Chicagoland Coffee Passport".** It has four parts:
  - stable cafe slugs and a safe seed
  - structured hours with "Open now"
  - freshness fields
  - a localStorage passport with regions, a share card, shareable filter URLs, and OG images
- **Five prerequisites must land first** (section 5). The seed wipes notes and admin-approved cafes, and it regenerates every cafe ID. 9 of the 32 images are hotlinked from a third party's rate-limited dev bucket.

---

## Phase 1: Repo audit

### 1.1 Stack and health [V]

- **Stack:** Next.js 16.2.1 (App Router, Turbopack), React 19.2.4, Prisma 7.6 with `@prisma/adapter-pg`, Tailwind v4, `@vis.gl/react-google-maps`, `vaul` (bottom sheet), and Vercel Analytics.
- **`npm run lint`:** exit 0. 0 errors, 4 warnings, all `@next/next/no-img-element`:
  - `src/app/cafes/[id]/page.tsx:117`
  - `src/components/CafeCard.tsx:68`
  - `src/components/CafeMap.tsx:265`
  - `src/components/GoogleReviews.tsx:96`

  This matches the "4 known warnings" in CLAUDE.md.
- **`npm run build`:** exit 0. TypeScript passed. 19 routes; everything is dynamic except `/_not-found`, `/manifest.webmanifest` and `/submit/thanks`. The build read `.env` and did no database writes [V].
- **`git status`:** clean before and after the build.
- **`npm outdated`:** 22 packages behind. The notable ones:

  | Package | Current | Wanted | Latest |
  |---|---|---|---|
  | next | 16.2.1 | 16.2.1 (pinned) | 16.4.6 |
  | eslint-config-next | 16.2.1 | 16.2.1 (pinned) | 16.4.6 |
  | prisma / @prisma/client / adapter-pg | 7.6.0 | 7.10.1 | 7.10.1 (prisma latest is 8.0.0-rc.34) |
  | @vis.gl/react-google-maps | 1.8.1 | 1.10.2 | 1.10.2 |
  | react / react-dom | 19.2.4 | 19.2.4 (pinned) | 19.3.1 |
  | typescript | 5.9.3 | 5.9.3 | 7.0.2 |
  | eslint | 9.39.4 | 9.39.5 | 10.15.0 |

  Nothing was upgraded. All in-range updates are patch or minor.
- **Odd dependency:** `@esbuild/linux-x64` and `lightningcss-linux-x64-gnu` are direct dependencies in `package.json`. That is probably a workaround for Vercel builds [I]. It's harmless locally, but worth a comment.

### 1.2 Routes and features [V]

| Route | What it does |
|---|---|
| `/` | Server-fetches all cafes (`src/app/page.tsx:8`) and renders `HomeContent`: a full-viewport Google map with clustering, client-side filtering (`src/hooks/useCafes.ts`), and ratings fetched from `/api/ratings` on mount (`HomeContent.tsx:33-38`). |
| `/cafes/[id]` | Hero image, tag badges, description, curator note, Google rating and reviews (server-side Places call, `page.tsx:67`), community notes plus a note form, and "Suggested by / Added" for approved submissions. |
| `/submit`, `/submit/thanks` | Public cafe suggestion form. Honeypot, rate limit at 3/hour, address normalization. Writes a `CafeSubmission` with status PENDING. |
| `/admin/login`, `/admin/submissions`, `/admin/submissions/[id]/edit` | Admin queue gated by an HMAC cookie. Approve or reject, edit before approving, server geocode. |
| `/api/cafes`, `/api/cafes/[id]` | JSON. Amenities use AND, vibes use OR (`api/cafes/route.ts:24-44`). The UI does not use these; it filters client-side. |
| `/api/notes` | POST only. Anonymous, 500 characters max, 5/min per IP (in memory). |
| `/api/ratings` | Google rating for every cafe. |
| PWA | `manifest.ts`, icons, and an iOS install hint (localStorage dismissal). |

### 1.3 UX flows (read from code, not viewed in a browser)

- **Mobile (below `lg`)** [V]:
  - Floating header pills: logo, "Suggest", and a filter dropdown (`HomeContent.tsx:117-145`).
  - A non-dismissable `vaul` sheet with snaps at 15%, 50% and 92%.
  - Tapping a marker selects the cafe and lifts the sheet to 50%. Tapping a card goes to the detail page, and the pin button pans the map.
  - The detail page has floating "Back to map" pills.
- **Desktop** [V]:
  - Full map with a 380px right-hand panel.
  - Clicking a card pans the map. Clicking a marker toggles a popup card (`CafeMap.tsx:240-300`).
  - The filter panel sits in the map control bar.
- **Shared** [V]:
  - "Near me" geolocation pans the map only. Nothing is sorted by distance (`CafeMap.tsx:370-390`).
  - Satellite toggle.
- **Missing** [V]:
  - No name search, no sort.
  - Filters are not in the URL (grep found no `useSearchParams` in public routes), so a filtered view can't be shared.
  - No sitemap, robots file, or OpenGraph metadata outside the admin `robots` blocks.
- **Not checked:** rendered visuals, real-device behavior, and Lighthouse scores. The app was not launched.

### 1.4 Data model [V] (`prisma/schema.prisma`)

- **`Cafe`:** a `cuid` id, name, description, address, neighborhood, lat/lng, `imageUrl`, `ownerReview`, `createdAt`, and `submitterName` and `addedAt` (both optional).
- **What `Cafe` lacks:** slug, hours, status (open or closed), region, website, Instagram, last-visited date, and price.
- **Tags:** `Tag` (with a type of AMENITY or VIBE) joined to cafes through `CafeTag`.
- **`Note`:** cascades on cafe delete.
- **`CafeSubmission`:** `approvedCafe` is a relation with `onDelete: SetNull`.

### 1.5 Suspected issues: verdicts

**1. "prisma/seed.ts deletes all tables, including community notes": CONFIRMED, with a correction and a wider blast radius** [V]
- `prisma/seed.ts:823-826` runs `deleteMany()` on `cafeTag`, `note`, `cafe` and `tag`, with no WHERE clause and no environment guard.
- It does **not** delete `cafe_submissions`, so "all tables" is slightly off. The README states the same.
- What else it destroys:
  - **Cafes approved through the admin flow.** These live only in the database, not in `seed.ts`, so they are deleted along with their tags and notes.
  - **The link from their submissions to the cafe.** `approvedCafeId` is set to NULL by `onDelete: SetNull` (`schema.prisma`, `CafeSubmission.approvedCafe`). Each submission still says APPROVED but points at nothing.
  - **Every cafe ID.** IDs are `@default(cuid())` and are recreated on every run. Every shared `/cafes/<id>` link, bookmark and search-indexed URL breaks after a reseed. So would any future localStorage passport keyed by ID [V for the mechanism; I for the consequence].
- Whether production has ever been reseeded is unknown [A]. See the open questions.

**2. "Cafe images are hotlinked from third-party sites": CONFIRMED** [V]
- All 32 `imageUrl` values are absolute third-party URLs (`seed.ts:24-59`). They are rendered with plain `<img>` (the lint warnings above), and `next.config.ts` `remotePatterns` is unused because nothing uses `next/image`. That list also names only 8 of the 16 hosts.
- A HEAD and GET check from this machine found:
  - 23 of 32 return 200 with an image content type.
  - **9 of 32 fail.** These are all the joe.coffee R2 URLs (`pub-…r2.dev`, indexes 11, 12, 17, 18, 19, 22, 25, 29, 31).
  - Both curl (schannel) and Node fail with a TLS error (`ERR_SSL_PACKET_LENGTH_TOO_LONG`). That usually means something on the local network is intercepting, so whether those URLs are down for the public is **unverified**.
- Independent of that, Cloudflare documents `r2.dev` URLs as "not intended for production", rate-limited, and returning 429 when throttled [U, search-result summary of developers.cloudflare.com/r2/platform/limits; page not fetched]. They also sit in someone else's bucket and can disappear without notice [I].
- 4 images exceed the 600 KB guideline in the seed comment:

  | Index | Cafe | Size |
  |---|---|---|
  | 0 | Metric | 1.07 MB |
  | 2 | Osmium | 1.08 MB |
  | 4 | Dark Matter | 908 KB |
  | 9 | Sip of Hope | 884 KB |

- Rights to display these photos have not been established either way [A]. See the open questions.

**3. "Hours are static tags with no open-now logic": CONFIRMED** [V]
- Hours exist only as `early_bird`, `late_night` and `weekend_brunch` amenity tags (`seed.ts:72-73`, `tag-display.ts:81-89`).
- The schema has no hours field, and nothing in `src/` computes open or closed status.

### 1.6 Other material findings

1. **The Google Places integration uses the legacy API, despite a comment saying otherwise** [V].
   - `google-places.ts:3` says "Places API (New)".
   - The calls at lines 46 and 64 are legacy `findplacefromtext/json` and `details/json`.
   - Google's docs say legacy Places can't be enabled for new Cloud projects [U, search-result summary of developers.google.com legacy docs; page not fetched, and the cutoff date in the summary is unconfirmed]. A new key or project would quietly lose ratings and reviews; the code catches errors and returns empty [I].
2. **`/api/ratings` makes up to 64 paid Places calls on every cold cache** [V for code, I for cost].
   - The flow is 32 cafes × (find + details), triggered by every home page load (`api/ratings/route.ts:17-26`, `HomeContent.tsx:33`).
   - The cache is per process (CLAUDE.md), and the details request includes `reviews`, which Google bills at a higher SKU [I]. Cost scales with cold starts, not with traffic.
3. **Notes can't be moderated** [V]. The only database write for notes is `prisma.note.create` (`api/notes/route.ts:83`). There is no admin view, no delete or hide, and no report button. Spam or abuse stays up until someone edits the database by hand.
4. **A third tag-label source** [V]. The map popup builds vibe labels on the fly (`CafeMap.tsx:296`, `v.name.replace("-", " ")…`), bypassing both `tag-display.ts` and `TagBadge.tsx`. The two-source split is intentional per your note; this third one is not documented.
5. **Overlapping noise tags lead to empty results** [V by logic].
   - Noise levels (`whisper_quiet`, `moderate_noise`, `bustling`) are amenities, and amenities use AND. Picking two noise levels always returns zero cafes.
   - `quiet` (a vibe) duplicates `whisper_quiet` (an amenity), and both show as "Quiet" in the chips (`tag-display.ts:76, 96`).
6. **Inconsistent visual system** [V].
   - Home uses `stone-*` and the detail page uses `gray-*` (`cafes/[id]/page.tsx:95-113`, `NotesList.tsx`).
   - The unifying style commit was reverted (`9cc6d8c`).
   - A reviewer will notice the change in tone between pages [I].
7. **No signals for closures or freshness** [V]. The only freshness information is the seed comment "addresses confirmed open in 2026" (`seed.ts:367`). Users get no "last visited" or "verified" date.
8. **Coverage skews to the suburbs; the city list is thin and dated** [V].
   - There are 10 city cafes, and none of Sprudge's 8 "Cafes We Love in 2026" are included: Afro Joe's, Allez, Dayglow, Four Letter Word, Milli by Metric, Necessary & Sufficient, Prequel, Side Practice.
   - Evanston has 5 of the 32 entries.
9. **A location mismatch in the data** [V]. Groundswell (index 7) has `neighborhood: "Oak Park"`, and its description says "in Oak Park", but its address is "7228 Madison St, Forest Park, IL 60130" (`seed.ts:289-291`). Which one is correct hasn't been checked.

---

## Phase 2: Competitive research

Two research passes ran on 2026-11-22. V means the page was fetched and seen. U means it came from a search snippet or memory, or the page was blocked.

**Couldn't verify:**
- Eater Chicago (fetch refused) and Axios Chicago (403).
- europeancoffeetrip.com main site (403; its App Store and business pages were fetched).
- Brian's Coffee Spot, Block Club, Swarm, Atlas Obscura, Yelp and Nomad List (not reached).

### 2.1 Product profiles

**1. Time Out Chicago, "The 40 best coffee shops in Chicago"** (Chicago editorial). [timeout.com/chicago/restaurants/best-coffee-shops-in-chicago](https://www.timeout.com/chicago/restaurants/best-coffee-shops-in-chicago)
- **What it does:** A numbered ranking of 40 shops. Each entry has a neighborhood, "Vibe", "Specialties", a price tier, and **standard prices for drip, latte and matcha latte** [V].
- **Hook:** "Best of" authority plus price comparison [V].
- **Memorable:** The fixed drink-price set [V].
- **Retention:** Newsletter and related articles only [V].
- **Content model:** Staff editorial [V].
- **Weak points:**
  - Conflicting dates: the page says Jul 30 2024, the title says 2023, the footer says 2026 [V].
  - No addresses, no map, no filters [V].
  - A neighborhood tag contradicts its own text [V].

**2. The Infatuation Chicago, "Best coffee shops to get work done"** (Chicago editorial, work use case). [theinfatuation.com/chicago/guides/the-best-chicago-coffee-shops-to-get-work-done](https://www.theinfatuation.com/chicago/guides/the-best-chicago-coffee-shops-to-get-work-done)
- **What it does:** 44 spots split into North, West and South Side, with "Perfect For" use-case tags, some 0–10 scores, Map View and Save [V].
- **Hook:** Opinionated, practical work notes [V]:
  - wifi off on weekends at La Colombe
  - no wifi after 6pm at Cafe Mustache
  - a free conference room at Vigo
  - benches discouraged for laptops
- **Memorable:** Brand voice, plus "Perfect For" tags [V].
- **Retention:** Save spot, newsletter, app [V].
- **Content model:** 3 bylined writers. **Updated Sept 23, 2026** [V].
- **Weak points:**
  - The best work details are prose only, not filterable [V].
  - No hours or open-now [V].
  - City only [V].

**3. Sprudge, "Chicago Coffee Guide: 8 Cafes We Love In 2026"** (trade-press editorial). [sprudge.com/the-sprudge-guide-to-coffee-in-chicago-438548.html](https://sprudge.com/the-sprudge-guide-to-coffee-in-chicago-438548.html)
- **What it does:** 8 picks by a Chicago-native editor (Jan 6, 2026). Each has a neighborhood, address, site and Instagram [V].
- **Hook:** Credibility with coffee people. It names roasters, equipment and pastry partners [V].
- **Memorable:** A first-person expert voice [V].
- **Retention:** Possibly an annual edition (year in the title) [U].
- **Content model:** One expert, no UGC [V].
- **Weak points:** Only 8 picks, all within city limits. No map, no amenities [V].

**4. Cuppa Chicago (Instagram) and Cuppa Crawl** (Chicago creator and event). [chicago.citycast.fm/food-drink/chicago-best-coffee-shops](https://chicago.citycast.fm/food-drink/chicago-best-coffee-shops)
- **What it does:** One creator documented about 200 Chicago shops over 5 years [V].
- **Cuppa Crawl 2026** [U]:
  - Ran Feb 27–Mar 1.
  - Limited-edition punch card. Do the full crawl or a few stops.
- **City Cast's companion list** sorts picks into themed categories [V]: Best Coffee, Working/Studying, Events, Unique Decor, Non-Coffee, Music, Bites.
- **Hook:** A "visited them all" personal journey, plus a yearly in-person event [V, U].
- **Retention:** Social following plus a time-limited event [U].
- **Content model:** One creator [V].
- **Weak points:** Instagram is hard to search or filter [I]. The crawl details are unverified [U].

**5. Scoundrel's Field Guide, Chicago Dive Bar Passport & Stamp** (Chicago physical passport). [scoundrelsfieldguide.com/product/chicago-dive-bar-passport-stamp/](https://scoundrelsfieldguide.com/product/chicago-dive-bar-passport-stamp/)
- **What it does:** $14.99 for a pocket passport of 50 bars, each with a short history and a tip. Includes a map, check-off, a rating space and notes, plus **a stamp you use yourself** [V].
- **Hook:** Completing the collection [V].
- **Memorable:** Self-stamping, with no involvement from the bars [V/I].
- **Retention:** The 50/50 goal [V]. No rewards [V].
- **Content model:** One author [V].
- **Weak points:** Print can't track closures, and there's no stated update policy [V].
- **Related formats:** Campus coffee-crawl punch cards (4–5 stamps for a mug) and the Andersonville Coffee & Cocoa Crawl [U]. A 2014–15 Chicago "Indie Coffee Passport" sold for $25 for 22 shops [U].

**6. Beli** (ranking app, check-in and passport category). [apps.apple.com/us/app/beli/id1478375386](https://apps.apple.com/us/app/beli/id1478375386), [Wikipedia](https://en.wikipedia.org/wiki/Beli_(app))
- **What it does:** You rank each place head-to-head against places you've already ranked. The app builds a personal score, a taste profile, a "Want to Try" list and map, and a friends feed [V].
- **Hook:** Gamified personal ranking [V].
- **Memorable:** Pairwise comparison [V].
- **Retention:** Streaks, leaderboards, a 187-school university competition, and features unlocked by inviting friends [V].
- **Content model:** All UGC. 75M+ reviews in 30k cities (Sep 2025) [V].
- **Weak points:**
  - Ranking is tedious [V].
  - Comparing unlike places skews scores [V].
  - Tags feel random [V].
  - Criticized for streak pressure and privacy [V].
  - No coffee-specific features [V].

**7. Untappd** (check-in and badges). [badges.untappd.com](https://badges.untappd.com)
- **What it does:** Check in drinks and venues to earn badges. 340 are active [V].
- **Badge types** [V]:
  - Milestones (1, 50, 500, 2,500 unique beers)
  - Style badges with up to 100 levels ("Try 5 more for Level 2!")
  - Venue-type and travel badges
  - Social and time badges (Brew Crawl: 3 bars in one night)
  - Seasonal and sponsored badges
- **Hook:** Collecting [V].
- **Memorable:** Every badge shows the next goal [V].
- **Retention:** Seasonal and limited-time badges [V].
- **Content model:** Check-ins are UGC; the brand designs the badges [V].
- **Weak points:** Rewards volume and streaks over taste [V].

**8. joe.coffee** (cafe finder plus order-ahead). [joe.coffee](https://joe.coffee), [App Store](https://apps.apple.com/us/app/joe-coffee-order-ahead/id1437558382)
- **What it does:** A network of indie shops with order-ahead and cross-shop rewards. Calls itself "largest indie coffee network in the U.S." [V].
- **Hook:** Skip the line, with rewards that "follow you from shop to shop" [V].
- **Memorable:** One loyalty wallet across unrelated indie shops [V].
- **Retention:** Points and a wallet [V]. App rating 4.8 from 24K ratings [V].
- **Content model:** Shop-claimed listings, transactional [V].
- **Weak points:**
  - Wallet complaints: $25 minimum load, balance cutoff [V, a few reviews].
  - No vibe or work attributes [V].
- **Relevance:** This is the source of 9 of Coffee Club's images [V].

**9. European Coffee Trip** (curated specialty finder). [App Store id1524488773](https://apps.apple.com/app/id1524488773), [business.europeancoffeetrip.com](https://business.europeancoffeetrip.com)
- **What it does:** About 6,500 hand-reviewed specialty cafes in 43 countries, with roaster profiles, an offline database, trip planning, **open or closed status plus hours**, and a "laptop friendly" filter [V].
- **Hook:** Gatekept specialty-only selection. Paying doesn't buy inclusion [V].
- **Memorable:** House and guest roaster on each cafe [V].
- **Retention:** Trip planning. Tip jar and ads, no subscription [V].
- **Content model:** Editorial review plus owner claims. Owners keep hours and photos current; premium owners get 10 photos instead of 1 [V].
- **Weak points:** Criteria not published, no US coverage, and the free review queue takes several weeks [V].

**10. Google Maps / Business Profile** (baseline finder). [support.google.com/business/answer/9049526](https://support.google.com/business/answer/9049526), [/6263531](https://support.google.com/business/answer/6263531)
- **What it does:** Hours and owner or customer Yes/No attributes such as Wi-Fi. Edits are reviewed within 10 minutes to 30 days. **Live busyness and popular times** come from Location History [V].
- **Hook:** Default habit, and the only real crowd data [V].
- **Memorable:** None for taste [I].
- **Retention:** Local Guides points [U].
- **Content model:** Owners plus volunteers, with mostly UGC photos [U].
- **Weak points:** No curation, binary attributes, thin noise and outlet data [U].

**11. LaptopFriendly** (work-spot finder, alive). [laptopfriendly.co/chicago](https://laptopfriendly.co/chicago)
- **What it does:** A city map and list with Wi-Fi, Sockets and Quiet filters, and "best times to work" from the community [V].
- **Hook:** Work-specific attributes [V].
- **Memorable:** A single % score per venue [V].
- **Retention:** Ambassadors and Discord [V].
- **Content model:** User suggestions approved by a curation team [V].
- **Weak points:**
  - **19 Chicago places.** Many scores show "XX%" [V].
  - The latest Chicago activity was "2 months ago" [V].
  - Photos are uncredited [V].

**12. Bloom: Specialty Coffee Map** (new specialty app, 2025–26). [App Store id6765944778](https://apps.apple.com/app/id6765944778)
- **What it does:** Every shop is reviewed by a curator. Submitters pass an eligibility quiz and include a menu photo [V].
- **Quality tiers:** Named tiers from "Hidden gem" to "Exceptional", with **tier-colored pins** [V].
- **Hook:** A visible curation standard [V].
- **Memorable:** Tiered pins [V].
- **Retention:** Offline saves [V].
- **Content model:** Curator-gated submissions [V].
- **Weak points:** 1 rating, no work attributes [V].

**Cautionary cases** (not profiled):
- **Workfrom (work-spot finder):** pivoted from places to people in 2020 [U]. Its domain has lapsed and is parked [V].
- **Bean Hunter:** newest content is Dec 2021, footer says © 2020, and the city field renders "in undefined" [V].
- **Foursquare:** shut City Guide in Dec 2024 and open-sourced its places data. Its CTO said accurate place data is "a problem best solved by an open source community" [V, The Register].
- **Robusta:** launched Dec 2025, and its last update was Dec 31, 2025 [V].

### 2.2 Patterns across the field

- **Freshness wins trust.**
  - The best guides show dates: Infatuation's "Updated" date, Sprudge's year in the title [V].
  - The failures show staleness: Time Out's three conflicting dates, Bean Hunter, LaptopFriendly's "2 months ago" [V].
- **Hours and open-now** come only from products with owner-maintained data (Google, European Coffee Trip) [V]. Editorial guides bury closing times in prose [V].
- **Work attributes are either structured but sparse** (LaptopFriendly, European Coffee Trip's single filter, Google's yes/no) **or rich but unstructured** (Infatuation) [V]. Nobody has both for Chicago [I].
- **Collection mechanics work offline and without accounts.** Scoundrel's passport is literally a paper book [V], and punch-card crawls run in Chicago every year [U]. Account-based versions (Beli, Untappd) add leaderboards and friends.
- **Chicago guides organize by:** neighborhood (all of them), region (Infatuation), use case (Infatuation, City Cast), or rank (Time Out) [V]. **None covers the suburbs** among those fetched [V for Sprudge and Infatuation; I for Time Out, whose URL and list are city-scoped].
- **Solo upkeep is the killer.** Every dead or zombie product relied on UGC or community data it couldn't sustain [V/U]. Curator-gated, small-and-accurate (Sprudge, Bloom, Scoundrel's) is the format that holds up for a single maintainer [I].

---

## Phase 3: Synthesis

### 3.1 Gap analysis

| Dimension | Field best | Coffee Club today | Gap |
|---|---|---|---|
| Concept clarity | Sprudge, Scoundrel's: one sentence explains it | "Curated by Zain. Suggested by you." Looks like a generic map finder at first glance [I] | **Large** (portfolio) |
| Structured work filters | LaptopFriendly (sparse), European Coffee Trip (1 filter) | 20 amenity tags, AND/OR filtering [V] | **Lead.** Underplayed |
| Suburbs coverage | None of the Chicago guides | 22 of 32 cafes [V] | **Lead.** Not stated anywhere in the UI [V] |
| Hours / open now | Google, European Coffee Trip | Tags only [V] | **Large** (real users) |
| Freshness signals | Infatuation dates | None [V] | **Large** |
| Reason to return | Passport, badges, Want to Try | Notes only [V] | **Large** |
| Shareability | Every guide has stable URLs | IDs regenerate on reseed; filters not in URL; no OG [V] | **Large** |
| City coverage / currency | Sprudge 2026, Infatuation (44) | 10 city cafes, none of Sprudge's 2026 picks [V] | Medium (content work) |
| Voice | Sprudge, Infatuation | Curator notes exist [V], but they come after the hero, tags and description on the detail page [V], so they're likely below the fold [I] | Small to medium |
| Photos | Owner-supplied, credited | Hotlinked, uncredited, 9 at risk [V] | **Prerequisite** |

### 3.2 Candidate directions

**A. "Chicagoland Coffee Passport"**
- **Concept:** a collectible, region-based checklist of curated cafes, stored in localStorage.
- **Evidence:**
  - Scoundrel's dive bar passport (50 places, self-stamped, no rewards) [V].
  - Cuppa Crawl and campus punch cards [U].
  - Untappd's "next goal" badges [V].
  - Beli's "Want to Try" [V].
  - Suburbs are unserved by guides [V].
- **Why it fits:** It works without accounts, it uses curation (the asset you already have), and it gives a reviewer a memorable hook in one visit [I].

**B. "The trustworthy guide": freshness and open now**
- **Concept:** every cafe shows hours and "Open now", a "Curator last visited" date and a status. Plus a "What's new" log.
- **Evidence:**
  - Infatuation's "Updated" date [V].
  - The staleness failures (Bean Hunter, Workfrom, Time Out's dates) [V].
  - Only owner-maintained products have hours [V].

**C. "Work from here, honestly"**
- **Concept:** turn the Infatuation-style prose nuance into structured fields: wifi rules (weekends, time limits), outlet density, laptop policy, best hours.
- **Evidence:**
  - Infatuation's rich but unfilterable notes [V].
  - LaptopFriendly's sparse structure [V].
- **Risk:** Upkeep is the highest of any direction, because these policies change often [I].

**D. Curated crawls and collections**
- **Concept:** 3 to 6 hand-made routes, such as "North Shore Saturday", "Metra UP-North crawl" or "South Side roasters", each with an order, an approximate walk or drive, and a stamp page.
- **Evidence:**
  - City Cast themed categories [V].
  - Cuppa Crawl [U].
  - Andersonville crawl [U].
  - European Coffee Trip trip planning [V].
- **Fit:** Pairs naturally with direction A.

**E. "Suburbs-first" positioning**
- **Concept:** organize by region and Metra line instead of only the map, and say "the guide that leaves the city" in the hero.
- **Evidence:** Suburb coverage is the one thing no competitor has [V]. Metra line and station data is static, so upkeep is near zero [I].

**F. Polish and shareability baseline**
- **Concept:** stable slugs, filter state in the URL, OG cards, sitemap, a consistent palette, self-hosted images.
- **Evidence:** Every serious guide has shareable stable URLs [V]. A reviewer judges polish in one visit [A, from your brief].

### 3.3 Ranked shortlist of concrete changes

Scores run 1 to 5. Upkeep means your ongoing solo effort after launch. Prerequisites are in section 5 and are not repeated here.

**1. Coffee passport (localStorage)**
- **What it is:**
  - "Been here" and "Want to try" toggles on cards and the detail page.
  - Progress per region (City, North Shore, NW, West, South).
  - A few "next goal" badges, e.g. "3 of 5 Evanston", "All South Side roasters".
  - A `/passport` page with a stamp grid.
  - A share card made with `next/og`. It encodes progress in the URL and needs no server state.
- **Scores:** portfolio 5, real users 4. **Upkeep:** low. **Effort:** M.
- **Files:**
  - new `src/app/passport/page.tsx`
  - new `src/hooks/usePassport.ts`
  - new `src/app/passport/opengraph-image.tsx`
  - `CafeCard.tsx`, `cafes/[id]/page.tsx`, `HomeContent.tsx`
- **Schema:** `Cafe.region` (enum or string).
- **Risks:**
  - localStorage is per-device and can be cleared. Say so in the UI and offer a JSON export.
  - Must key by slug, not cuid.
  - Badges can feel gimmicky if overdone. Keep it to 5 to 8.

**2. Structured hours plus "Open now"**
- **What it is:** Weekly hours per cafe. An "Open now" filter chip and a badge ("Closes 3pm"). Computed in `America/Chicago` on the client, with a "Hours checked {date}" line and a link to the cafe's site.
- **Scores:** portfolio 4, real users 5. **Upkeep:** medium (32 cafes; a monthly spot-check is realistic [A]). **Effort:** M.
- **Files:** `schema.prisma`, `seed.ts`, `types.ts`, `useCafes.ts`, `FilterPanel.tsx`, `CafeCard.tsx`, the detail page, the admin edit form.
- **Schema:** `Cafe.hours Json` (a 7-day array of open/close ranges) plus `hoursCheckedAt DateTime?`. A separate `CafeHours` table would be over-engineering at this size [I].
- **Risks:**
  - Wrong hours are worse than no hours. Show the checked date prominently.
  - Hours must be entered by hand. Pulling from Places costs money and would bring the legacy-API dependency back.
  - Retire the `early_bird` and `late_night` tags or derive them from hours.

**3. Freshness layer**
- **What it is:**
  - `lastVisitedAt` ("Curator visited Oct 2026").
  - `status` (OPEN, TEMP_CLOSED, CLOSED). Closed cafes stay viewable with a label instead of being deleted, which keeps passport stamps valid.
  - A "New" badge from `addedAt`.
  - A `/whats-new` changelog driven by those dates.
- **Scores:** portfolio 4, real users 4. **Upkeep:** low. **Effort:** S.
- **Files:** `schema.prisma`, `seed.ts`, card and detail page, new `src/app/whats-new/page.tsx`, filtering in `page.tsx` (hide CLOSED from the map by default).
- **Schema:** `status` enum, `lastVisitedAt DateTime?`.
- **Risks:** Dates go stale too. Showing "visited 14 months ago" honestly beats hiding it.

**4. Shareable state, search and sort**
- **What it is:** Filters and the selected cafe in the URL (`?amenities=wifi&vibes=cozy&cafe=metric-coffee`), a name and neighborhood search box, and "Sort by distance" when "Near me" is active.
- **Scores:** portfolio 3, real users 4. **Upkeep:** low. **Effort:** S.
- **Files:** `HomeContent.tsx`, `FilterPanel.tsx`, `useCafes.ts`, `CafeMap.tsx`.
- **Schema:** none.
- **Risks:** Read the Next 16 `useSearchParams` and Suspense docs in `node_modules/next/dist/docs/` first (AGENTS.md).

**5. Concept-forward first screen, plus OG and sitemap**
- **What it is:**
  - A one-line positioning statement in the panel or sheet header: "32 cafes, city and suburbs, one curator".
  - An "Editor's pick this month" slot.
  - `generateMetadata` OG images per cafe and `sitemap.ts`.
  - The `stone` palette applied to the detail page.
- **Scores:** portfolio 5, real users 2. **Upkeep:** low (one monthly pick). **Effort:** S.
- **Files:** `HomeContent.tsx`, `layout.tsx`, `cafes/[id]/page.tsx` (+ `opengraph-image.tsx`), new `src/app/sitemap.ts` and `robots.ts`, `NotesList.tsx`.
- **Schema:** optional `Cafe.featuredAt`.
- **Risks:** The palette work was reverted once (`9cc6d8c`). Find out why before redoing it.

**6. Curated crawls (collections)**
- **What it is:** 3 to 6 hand-built routes with an order, a blurb and a "stamp all" badge. They show on a `/crawls` page and as a map overlay.
- **Scores:** portfolio 5, real users 4. **Upkeep:** medium (routes break when a cafe closes; mitigated by `status`). **Effort:** M.
- **Files:** new `src/app/crawls/[slug]/page.tsx`, `CafeMap.tsx` (polyline), `seed.ts`.
- **Schema:** `Collection` (slug, title, blurb) plus `CollectionCafe` (order).
- **Risks:**
  - Scope creep.
  - Drawing routes needs Directions, a paid API. Use straight-line order with no routing.

**7. Region and Metra browse**
- **What it is:** Region tabs, plus optional "nearest Metra station" per suburban cafe.
- **Scores:** portfolio 3, real users 3. **Upkeep:** low. **Effort:** S (region) to M (Metra).
- **Files:** `FilterPanel.tsx`, `tag-display.ts`, `seed.ts`.
- **Schema:** `Cafe.region` (shared with #1), optional `metraStation String?`.
- **Risks:** Metra data must be checked by hand. Don't estimate it.

**8. Structured work attributes (direction C)**
- **What it is:** Wifi rules, laptop policy, outlet density, best work hours.
- **Scores:** portfolio 3, real users 4. **Upkeep:** high. **Effort:** M.
- **Files:** schema, seed, `TagBadge`, `tag-display`, detail page.
- **Schema:** several fields or a `workNotes Json`.
- **Risks:** The highest staleness risk. Policies change without notice [I].

**9. City coverage refresh**
- **What it is:** Add notable 2025–26 city shops (e.g. the Sprudge picks) using the existing seed and geocode rules.
- **Scores:** portfolio 2, real users 4. **Upkeep:** medium (ongoing). **Effort:** content only.
- **Files:** `seed.ts`, image assets.
- **Schema:** none.
- **Risks:** Every addition needs verified photos, address and geocoding (CLAUDE.md rules).

**10. Drink-price comparison (Time Out style)**
- **Scores:** portfolio 2, real users 3. **Upkeep:** high. **Effort:** S.
- **Schema:** price fields.
- **Recommendation:** Defer. Prices drift quickly [I].

### 3.4 Parked: needs auth

- Passport synced across devices, and a verified check-in history.
- Friends feed, leaderboards and streaks (Beli and Untappd style).
- Personal rankings and taste profile (Beli).
- Notes tied to identity: edit or delete your own note, reputation.
- Saved lists shared with friends (a server-side "Want to try").
- Real rewards or partner perks at cafes (joe-style). These also need business relationships.

A no-auth stand-in for cross-device sync: export and import passport JSON, or encode it in a share URL (#1).

### 3.5 Recommended scope for one focused overhaul

**Theme:** "Chicagoland Coffee Passport: the curated guide that leaves the city, and tells you what's open."

**In scope, in order:**
1. Prerequisites P1–P5 (section 5).
2. #3 Freshness layer (S).
3. #2 Hours and Open now (M).
4. #1 Passport with regions and share card (M), including the `region` part of #7.
5. #4 URL state, search and distance sort (S).
6. #5 Concept-forward first screen, OG, sitemap and palette (S).

**Stretch:** #6 with 2 or 3 crawls, only if the above ships clean.

**Defer:** #8 work attributes (upkeep), #10 prices (upkeep), the Metra mapping in #7, the Google Places migration beyond the decision in P3, and the city coverage refresh (#9), which is ongoing content work and should run alongside, not inside, the code overhaul.

**Why this cut:**
- The passport gives the portfolio its hook.
- Hours and freshness answer the real user's first question ("is it open, is this still true?").
- Everything except hours is low-upkeep for a solo curator [I].

---

## 5. Prerequisite fixes (must land before feature work)

**P1. Make the seed safe** (`prisma/seed.ts:819-826`)
- At minimum:
  - Refuse to run unless a specific flag is set (e.g. `SEED_ALLOW_RESET=1`).
  - Print the target host before deleting.
- Better: switch to `upsert` keyed by a stable slug so community notes, admin-approved cafes and submission links survive.
- **Why first:** every feature below adds data (hours, status, regions) that a reseed would otherwise wipe or orphan.

**P2. Stable cafe slugs**
- Add `Cafe.slug String @unique`, route `/cafes/[slug]`, and redirect old IDs if any were ever shared.
- **Why first:** the passport, crawls, OG URLs and shareable filters all key off cafe identity, and cuids change on every reseed [V].

**P3. Decide the future of Google Places**
- Choose one:
  - Drop ratings and reviews. Recommended for a curated-voice product, since it removes the cost and legacy-API risk [I].
  - Migrate to Places API (New) with field masks, persist `placeId` and rating on `Cafe`, and stop the per-load fan-out in `/api/ratings`.
- Either way, fix the incorrect "(New)" comment at `google-places.ts:3`.
- This is your decision; see the open questions.

**P4. Self-host and optimize images**
- Download the approved photos once (subject to the rights question), store them in `public/cafes/<slug>.webp` or Vercel Blob, render with `next/image`, and credit the source on the detail page.
- This removes the r2.dev dependency (9 images) and the 4 oversized files, and clears the lint warnings.
- Adding the sources to `remotePatterns` alone is not enough, because r2.dev is rate-limited [V].

**P5. Minimal note moderation**
- Add a `Note.hiddenAt DateTime?` plus a hide button in the admin area.
- **Why first:** the passport and share features aim to bring more traffic, and right now there's no way to remove spam [V].

**Not blocking, but cheap to include:**
- Merge the third tag-label source (`CafeMap.tsx:296`) into `getTagLabel`.
- Make noise levels single-select so filtering can't return zero results.
- Upgrade the Prisma and Next patch/minor versions in a separate commit. Nothing was upgraded during this research.

---

## 6. Open questions

1. **Production database:** has `db:seed` ever been run against production? Are there real community notes or admin-approved cafes there today? This decides how urgent P1 is.
2. **Image rights:** do you have permission from the cafes, or a policy you're comfortable with, to self-host their official photos? Or would you rather shoot your own over time?
3. **Google ratings and reviews:** keep them (and migrate to Places New) or drop them in favor of the curator's voice?
4. **Hours upkeep:** are you willing to check hours for about 32 cafes on a regular cadence? You set the cadence; this brief doesn't assume one.
5. **Region taxonomy for the passport:** which split do you want?
   - City / North Shore / Northwest / West / South
   - Metra lines
   - Something else
6. **Seed vs. admin as the source of truth:** after P1, should new curated cafes still be added in `seed.ts`, or only through the admin flow? The answer changes how upsert should work.
7. **The reverted stone palette (`9cc6d8c`):** was the revert about taste or a bug? It affects item #5.
