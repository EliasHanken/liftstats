# Powerlifting Stats Site — Design Spec

**Date**: 2026-05-27
**Status**: Draft, awaiting user review
**Owner**: streafe@gmail.com

## Goal

A public Next.js site that lets anyone search powerlifters worldwide and explore their stats in depth — with a focus on comparisons that aren't easy to do elsewhere: equipped vs raw, missed lifts, competitiveness within a meet's flight, and national-population breakdowns.

The site is global from day one (not Norway-only), but the design preserves the user's specific interest in Norwegian equipped-vs-raw differences via the `/nations` page.

## Non-goals (MVP)

- Selection-committee / national team roster tooling (the JR VM spreadsheet use case) — deferred to v2
- Authenticated user accounts, saved lifters
- Head-to-head two-lifter comparison page
- PR timeline widget on lifter profiles
- Admin UI for managing GoodLift meet whitelist
- Slack/email alerting on ingest failure
- Mobile-first design (responsive, but desktop is the primary target)

## Architecture

```
┌──────────────────────── Vercel ────────────────────────┐
│  Next.js 16 (App Router, Server Components, Cache      │
│  Components)                                           │
│   ├─ /                                                 │
│   ├─ /search?q=...                                     │
│   ├─ /lifter/[slug]        ← MVP centerpiece           │
│   ├─ /meet/[id]                                        │
│   ├─ /nations                                          │
│   ├─ /api/health                                       │
│   ├─ /api/cron/ingest-opl                              │
│   └─ /api/cron/ingest-goodlift                         │
└────────────────────┬───────────────────────────────────┘
                     │ (server-side)
                     ▼
              ┌──────────────┐         ┌─────────────────┐
              │ Neon Postgres│◄────────│ OPL weekly CSV  │
              │  (Vercel     │         │ (cron, full     │
              │  Marketplace)│         │  diff)          │
              │              │         └─────────────────┘
              │ lifter       │
              │ meet         │         ┌─────────────────┐
              │ entry        │◄────────│ GoodLift scraper│
              │ attempt      │         │ (cron, reads    │
              │ ingest_run   │         │  goodlift_      │
              │ goodlift_    │         │  targets)       │
              │  targets     │         └─────────────────┘
              └──────────────┘
```

**Stack:**
- **Next.js 16** on Vercel — App Router, Server Components, Cache Components (`use cache` + `cacheTag`).
- **Neon Postgres** via Vercel Marketplace — auto-wired env vars, generous free tier.
- **Drizzle ORM** — lighter cold starts on Fluid Compute than Prisma, easier SQL escape hatch for aggregates.
- **Tailwind + shadcn/ui** for the dark/minimal UI.
- **Recharts** for charts (client components only; rest of the app is server-rendered).
- **Vercel Cron** for the two weekly ingest jobs.
- **Vitest** for unit + integration tests, GitHub Actions for CI.

**Visual direction:** dark background, big readable numbers, breathable card layouts (Strava/Apple-Health energy) but with the data density of an analytics dashboard. Confirmed during brainstorming.

## Data model

Six tables managed by Drizzle.

### `lifter`

One row per unique person. Dedup follows OPL's name+sex heuristic.

| Column | Type | Notes |
|---|---|---|
| `id` | serial PK | |
| `slug` | text unique | e.g. `john-haack`, `yasmina-havnen` |
| `name` | text | OPL canonical name |
| `sex` | enum('M','F','Mx') | |
| `birth_year` | int nullable | from OPL where available |
| `primary_fed` | text nullable | most-recent federation, denormalized for UI |
| `country` | text nullable | ISO-3, derived from federations |
| `created_at` | timestamptz | |

### `meet`

One row per competition.

| Column | Type | Notes |
|---|---|---|
| `id` | serial PK | |
| `source` | enum('opl','goodlift') | which ingester created the master record |
| `source_meet_id` | text | OPL MeetID or GoodLift URL slug |
| `federation` | text | 'IPF', 'NSF', 'USAPL'… |
| `date` | date | |
| `name` | text | |
| `country` | text nullable | ISO-3 |
| `town` | text nullable | |
| `has_attempts` | bool | true when GoodLift attempt data is loaded for this meet |

Unique constraint: `(source, source_meet_id)`.

### `entry`

One row per (lifter, meet, division/class). This is the grain that powers everything.

| Column | Type | Notes |
|---|---|---|
| `id` | serial PK | |
| `lifter_id` | FK → lifter | |
| `meet_id` | FK → meet | |
| `equipment` | enum('Raw','Wraps','Single','Multi','Unlimited') | |
| `weight_class_kg` | numeric | e.g. 83, 93, 120; -1 for SHW |
| `bodyweight_kg` | numeric | |
| `age` | numeric nullable | OPL gives fractional age |
| `age_class` | text nullable | 'Junior', 'Open', 'Sub-Junior', 'Masters 1'… |
| `division` | text nullable | raw division label as recorded |
| `best_sq_kg` | numeric nullable | |
| `best_bp_kg` | numeric nullable | |
| `best_dl_kg` | numeric nullable | |
| `total_kg` | numeric nullable | |
| `place` | int nullable | 1, 2, 3, 0=DQ, NULL=unknown |
| `gl_points` | numeric nullable | |
| `wilks` | numeric nullable | |
| `dots` | numeric nullable | |
| `flight_size` | int nullable | # of entries in same (meet, equipment, weight_class_kg, sex). Denormalized at ingest. |

Unique constraint: `(lifter_id, meet_id, equipment, weight_class_kg)`.

### `attempt`

Only populated when the parent meet has `has_attempts = true` (i.e., GoodLift data was scraped). Empty for OPL-only meets.

| Column | Type | Notes |
|---|---|---|
| `id` | serial PK | |
| `entry_id` | FK → entry (cascade) | |
| `lift` | enum('SQ','BP','DL') | |
| `attempt_no` | int | 1, 2, 3 |
| `weight_kg` | numeric | |
| `result` | enum('good','no_lift','skipped') | |

Unique constraint: `(entry_id, lift, attempt_no)`.

### `ingest_run`

Bookkeeping for cron health.

| Column | Type | Notes |
|---|---|---|
| `id` | serial PK | |
| `source` | enum('opl','goodlift') | |
| `started_at` | timestamptz | |
| `finished_at` | timestamptz nullable | |
| `status` | enum('running','ok','error') | |
| `rows_added` | int default 0 | |
| `rows_updated` | int default 0 | |
| `error` | text nullable | |

### `goodlift_targets`

Whitelist of meets the GoodLift ingester should scrape. Seeded once via SQL.

| Column | Type | Notes |
|---|---|---|
| `id` | serial PK | |
| `goodlift_url` | text unique | full URL or stable slug |
| `added_at` | timestamptz default now() | |
| `note` | text nullable | optional, e.g. "IPF Worlds 2024 Open" |
| `last_attempted_at` | timestamptz nullable | set by the ingester regardless of success |
| `last_status` | enum('ok','error','pending') default 'pending' | |
| `last_error` | text nullable | most recent parser/HTTP error message |

### Indexes (MVP)

- `entry(lifter_id) include (meet_id, gl_points)` — profile timeline
- `entry(meet_id, equipment, weight_class_kg, sex)` — flight_size + rivals
- `meet(date desc)` — chronological joins
- `lifter(slug)` — profile route
- `lifter` GIN on `name` using `pg_trgm` — fuzzy search
- Partial: `entry(gl_points desc) where equipment='Raw'` — raw leaderboards (used by `/nations`)

## Pages

### `/` (landing)

Search bar, "last updated: X days ago" pulled from `ingest_run`, a few featured lifters / recent meets.

### `/search?q=…`

Server-rendered, paginated. Uses `pg_trgm` similarity for fuzzy lifter-name matching. Results show name, country, primary federation, best GL — linked to `/lifter/[slug]`.

### `/lifter/[slug]` — MVP centerpiece

Composition, top to bottom (each is its own server component file unless noted):

| Component | Behavior |
|---|---|
| `<LifterHeader>` | name · sex · weight-class history · country · best-ever GL (with eq/raw badges) |
| `<EqVsRawCard>` | two-column: best SQ/BP/DL/Total/GL per side, delta in middle, mini timeline. Hidden if lifter only competes in one discipline. |
| `<GlProgressionChart>` (client) | line chart, x=date, y=GL, two series for eq/raw. Hover shows meet name + place. |
| `<AttemptSuccessCard>` | per-lift success rates (1st/2nd/3rd attempts) from entries with `attempt` data. Shows "based on N of M meets" caveat. Hidden if 0 meets covered. |
| `<MeetsTable>` | chronological. Columns: date · meet · class · eq · SQ/BP/DL · total · GL · place · "N of M" competitiveness · attempts (if any). Sortable. |
| `<RivalsPanel>` | top 5 closest GL in same class+equipment+sex+federation, linked to their profiles. Hidden if <3 found. |

Page uses `use cache` with `cacheTag('lifter:{id}')` so the weekly ingest can invalidate exactly the affected lifters.

**Empty-state principle:** every widget self-checks its preconditions. A lifter with one meet should render a real-looking profile, not a broken page.

### `/meet/[id]`

Lightweight. Leaderboard for the meet, links to lifter profiles. Exists primarily to make links from profiles navigable.

### `/nations`

Country picker; optional secondary country for compare mode.

| Component | Behavior |
|---|---|
| `<CountryPicker>` | single-select primary, optional secondary |
| `<PopulationSummary>` | total lifters · #eq · #raw · #compete-in-both · gender split |
| `<GlDistribution>` (client) | box plot or histogram of GL, two series (eq/raw), per sex |
| `<TopByDiscipline>` | top 10 GL eq + top 10 GL raw side by side, linked to profiles |
| `<WeightClassHeatmap>` (client) | class × equipment grid, cell = count of active lifters |
| `<EqVsRawDelta>` (client) | scatter of lifters with both disciplines: x=raw GL, y=eq GL, diagonal y=x reference; outliers labeled |
| `<HeadToHead>` | when 2nd country picked, every widget above renders side-by-side |

"Active lifter" definition: anyone with at least one entry in the last 24 months. Avoids polluting populations with retired lifters.

Page uses `use cache` with `cacheLife('weeks')` and `cacheTag('nation:{country}')`.

### API routes

- `GET /api/health` → JSON with DB connectivity status + most recent `ingest_run` per source.
- `GET /api/cron/ingest-opl` — Vercel Cron weekly, Sunday 02:00 UTC.
- `GET /api/cron/ingest-goodlift` — Vercel Cron weekly, Sunday 04:00 UTC (after OPL).

## Ingest pipeline

### OPL ingest

1. Fetch `openpowerlifting-latest.zip` from `openpowerlifting.gitlab.io`. Stream to `/tmp`.
2. Unzip, stream-parse the CSV row by row (no full load into memory).
3. For each row: upsert `lifter` (by OPL Name+Sex); upsert `meet` (by OPL MeetID); upsert `entry` (by lifter_id + meet_id + equipment + class).
4. After all rows: recompute `flight_size` per `(meet_id, equipment, weight_class_kg, sex)` using a single SQL window-function pass.
5. Collect touched `lifter_id` set → `revalidateTag('lifter:{id}')` for each. Bulk `revalidateTag('nations')` and `revalidateTag('search')`.
6. Write `ingest_run` row with `status='ok'`, counts, duration.

**Memory budget:** stream parsing keeps peak memory ~50MB. Postgres upserts batched in chunks of 1000 → ~3000 round-trips for ~3M rows, ~5-8min on Neon's pooler. Within the 800s Fluid Compute ceiling on Pro.

**If we exceed the budget later:** shard by `Date` year ranges, run multiple weekly jobs.

**Idempotency:** all writes are upserts; a retry after a partial failure is safe. An `ingest_run` row with `status='running'` older than 1h is treated as failed; a new run may start.

### GoodLift ingest

1. Read meet whitelist from `goodlift_targets` table.
2. Seed whitelist (one-time SQL): all NSF meets + IPF Worlds, Europeans, Junior/Sub-Junior versions from 2015 onward.
3. For each whitelisted meet where `has_attempts = false`:
   - Fetch GoodLift HTML for that meet
   - Parse 9 attempts per lifter
   - Match lifters to existing `lifter` rows by `(name, sex, meet, class)`; fall back to creating a new lifter if no match (logged)
   - Insert `attempt` rows (cascade-replace any prior attempts for that entry)
   - Set `meet.has_attempts = true`
4. Invalidate `cacheTag('lifter:{id}')` for touched lifters and `cacheTag('meet:{id}')`.

**Scraping etiquette:** 1 req/sec, identifying `User-Agent` with a contact email, skip already-ingested meets, log per-meet HTTP failures but continue the run.

**HTML schema drift:** parser throws on unexpected structure → that meet's error is logged, run continues, `ingest_run.error` captures the count + a sample meet URL.

**Whitelist management in MVP:** SQL seed script + manual SQL inserts to add new meets. Admin UI deferred to v1.5.

### Reliability

- `ingest_run` is the single source of truth for "did the last run work?". Surfaced via `/api/health` and on the landing page as "last updated".
- No in-run retries. Next weekly run is the retry (because everything is upsert).
- No external alerting in MVP — Vercel uptime monitor on `/api/health` is enough.

## Error handling

**Read paths.** Never crash on missing data. Each widget renders its own empty state. The lifter profile for a one-meet lifter should look real.

**Ingest paths.** Fail fast. Log to `ingest_run.error`. Move on.

**DB unreachable.** Next.js error boundary at the route level renders "stats temporarily unavailable" + the most recent successful ingest time (read from a build-time static asset as a fallback).

**Known failure modes:**

- GoodLift HTML parsing throws on a single meet → that meet is skipped, error captured with the meet URL.
- OPL CSV adds a new column → parser uses named columns and ignores unknown ones. Throws only if a required column disappears.
- Lifter dedup collision (two distinct people sharing name+sex+birth_year) → no auto-handling in MVP; manual SQL merge when discovered.

## Testing

- **Unit (Vitest):**
  - OPL CSV row → entry transform
  - GoodLift HTML → attempts parser, with 3-4 saved real meet HTML fixtures committed to the repo
  - flight_size SQL window query against a seeded local Postgres
- **Integration (one test):**
  - Run the full OPL ingest against a local Postgres with a 100-row CSV sample. Assert row counts. Assert a known lifter's profile data matches expectations.
- **No browser E2E for MVP.** TypeScript + the integration test are enough.
- **CI:** GitHub Actions runs unit + integration tests on PR. Vercel runs build + type check on every push.

## Risk register

| Risk | Likelihood | Mitigation |
|---|---|---|
| GoodLift HTML structure changes, breaks parser | Medium | Fixture-based tests catch regression locally; per-meet errors don't kill the run; `ingest_run` surfaces failures fast |
| OPL CSV exceeds Vercel function timeout | Low-Medium | Stream parsing well under 800s today; if it grows, shard by year |
| Lifter dedup wrong (joins two real people) | Low | Trust OPL's heuristic; manual SQL merge if discovered |
| Neon free tier storage exceeded | Low | ~3M entries × ~200B ≈ 600MB. Vercel Marketplace Neon starts at ~3GB. Upgrade if needed (cheap). |
| GoodLift considers our scraping abuse | Low | 1 req/sec, identifying UA, no re-scraping. Standard polite-scraper hygiene |
| OPL data quality issues (missing GL, wrong class) | Medium | Render NULL fields as "—", never assume a column exists, log unusual rows but don't fail |

## Open questions (none blocking MVP)

- Should we recompute GL/Wilks/DOTS ourselves vs trust OPL's columns? Defaulting to trust OPL; revisit if discrepancies surface.
- Federation-specific weight-class normalization (USAPL vs IPF classes) — for MVP we use the class as recorded in OPL. Cross-federation comparisons on `/nations` may want IPF-canonical normalization in v1.5.

## What ships in MVP (recap)

- All 6 tables + Drizzle schema + migrations
- OPL weekly cron ingest
- GoodLift weekly cron ingest with SQL-seeded whitelist
- Routes: `/`, `/search`, `/lifter/[slug]`, `/meet/[id]`, `/nations`, `/api/health`, ingest cron endpoints
- Lifter profile widgets: header, eq-vs-raw, GL chart, attempt success, meets table (with competitiveness), rivals
- Nations page widgets: country picker, population summary, GL distribution, top-by-discipline, weight-class heatmap, eq-vs-raw delta, head-to-head
- Dark + minimal UI, Tailwind + shadcn/ui
- `pg_trgm` fuzzy lifter search
- Vitest unit + one integration test
- GitHub Actions CI

## Explicitly deferred (v1.5 / v2)

- PR timeline widget on profile
- `/compare/[a]/[b]` two-lifter head-to-head
- Selection / nomination roster tool (the JR VM use case)
- Admin UI for GoodLift meet whitelist
- Authenticated user accounts, saved lifters
- Slack/email alerting on ingest failure
- Cross-federation weight class normalization
