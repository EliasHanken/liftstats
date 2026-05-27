# Plan 1 — Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stand up the Next.js + Drizzle + Neon foundation so subsequent plans (OPL ingest, lifter profile, etc.) have a working repo, a queryable database, CI, and a deployed health endpoint to build on.

**Architecture:** A Next.js 16 App Router project on Vercel, talking to Neon Postgres (via Vercel Marketplace) through Drizzle ORM. All six tables from the spec exist as migrations from day one — even the ones later plans will populate — so we never block on schema changes. Tests run against pglite (in-process Postgres in WASM) so CI needs no Docker.

**Tech Stack:** Next.js 16, React 19, TypeScript, Tailwind v4, shadcn/ui, Drizzle ORM, drizzle-kit, @neondatabase/serverless, @electric-sql/pglite, Vitest, zod, GitHub Actions, Vercel Cron.

---

### Task 1: Initialize repo + scaffold Next.js

**Files:**
- Create: `package.json`, `tsconfig.json`, `next.config.ts`, `app/layout.tsx`, `app/page.tsx`, `app/globals.css`, `.gitignore`, `README.md`

- [ ] **Step 1: Initialize git**

Run from project root `C:\Users\elias\Documents\_dev\styrkeloft-page-norge`:

```bash
git init -b main
```

- [ ] **Step 2: Scaffold Next.js**

Run:

```bash
npx create-next-app@latest . --typescript --tailwind --app --src-dir=false --import-alias="@/*" --use-npm --eslint --no-turbopack --yes
```

This creates the App Router project, TypeScript, Tailwind v4, ESLint, and `@/*` import alias. We disable Turbopack because tests interact better with Webpack; we can re-enable for dev later.

If the directory has dotfiles in it from earlier steps (e.g. `docs/` from brainstorming), `create-next-app` will refuse. Use `--force` if so:

```bash
npx create-next-app@latest . --typescript --tailwind --app --src-dir=false --import-alias="@/*" --use-npm --eslint --no-turbopack --yes --force
```

- [ ] **Step 3: Verify it runs**

Run:

```bash
npm run dev
```

Open `http://localhost:3000` in browser. Expected: default Next.js landing page renders. Kill the server (Ctrl-C).

- [ ] **Step 4: Replace `app/page.tsx` with a placeholder**

Overwrite `app/page.tsx`:

```tsx
export default function HomePage() {
  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100 p-8">
      <h1 className="text-2xl font-semibold">Powerlifting Stats</h1>
      <p className="text-zinc-400 mt-2">Coming soon.</p>
    </main>
  );
}
```

- [ ] **Step 5: Set dark theme defaults in `app/layout.tsx`**

Overwrite `app/layout.tsx`:

```tsx
import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Powerlifting Stats',
  description: 'Powerlifting analytics — equipped vs raw, missed lifts, competitiveness.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className="bg-zinc-950 text-zinc-100 antialiased">{children}</body>
    </html>
  );
}
```

- [ ] **Step 6: Append `.gitignore`**

Append to `.gitignore`:

```
# project-local
.env*.local
.env
.env.test
/.superpowers/
/tmp/
*.pgdata/
```

- [ ] **Step 7: Write a minimal `README.md`**

Overwrite `README.md`:

```markdown
# Powerlifting Stats

Public stats site for global powerlifting data. See `docs/superpowers/specs/2026-05-27-powerlifting-stats-design.md` for the design.

## Development

```bash
npm install
npm run dev          # localhost:3000
npm run test         # vitest
npm run lint
npm run typecheck
```

Requires Node.js 24+ and a `DATABASE_URL` pointing at a Neon Postgres instance.
```

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "feat: scaffold Next.js 16 app with dark theme"
```

---

### Task 2: Add typecheck and lint scripts

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Add scripts**

Open `package.json`. In the `"scripts"` object, ensure these entries exist (add or update):

```json
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "typecheck": "tsc --noEmit",
    "test": "vitest run",
    "test:watch": "vitest"
  }
}
```

- [ ] **Step 2: Run typecheck**

Run:

```bash
npm run typecheck
```

Expected: exit code 0, no errors.

- [ ] **Step 3: Commit**

```bash
git add package.json
git commit -m "chore: add typecheck and test scripts"
```

---

### Task 3: Add zod and the env loader

**Files:**
- Create: `lib/env.ts`
- Create: `.env.example`

- [ ] **Step 1: Install zod**

Run:

```bash
npm install zod
```

- [ ] **Step 2: Create `lib/env.ts`**

```ts
import { z } from 'zod';

const schema = z.object({
  DATABASE_URL: z.string().url(),
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
});

export const env = schema.parse({
  DATABASE_URL: process.env.DATABASE_URL,
  NODE_ENV: process.env.NODE_ENV,
});

export type Env = z.infer<typeof schema>;
```

- [ ] **Step 3: Create `.env.example`**

```
# Required: Neon Postgres connection string (pooled).
# In production, set via Vercel Marketplace -> Neon integration -> auto-populates.
DATABASE_URL="postgresql://user:pass@host/db?sslmode=require"

# Required for local tests only (pglite uses an in-memory URL).
# DATABASE_URL_TEST is not used by env.ts — tests construct their own client.
```

- [ ] **Step 4: Verify typecheck**

Run:

```bash
npm run typecheck
```

Expected: exit code 0.

- [ ] **Step 5: Commit**

```bash
git add lib/env.ts .env.example
git commit -m "feat: zod-validated env loader"
```

---

### Task 4: Install Drizzle + Postgres dependencies

**Files:**
- Modify: `package.json` (via npm install)

- [ ] **Step 1: Install runtime + dev deps**

Run:

```bash
npm install drizzle-orm @neondatabase/serverless
npm install -D drizzle-kit @types/pg
```

- [ ] **Step 2: Verify install**

Run:

```bash
npx drizzle-kit --version
```

Expected: prints a version like `drizzle-kit: 0.30.x`.

- [ ] **Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: install drizzle and neon driver"
```

---

### Task 5: Define the Drizzle schema

**Files:**
- Create: `lib/db/schema.ts`

- [ ] **Step 1: Write `lib/db/schema.ts`**

```ts
import {
  pgTable, pgEnum, serial, text, integer, numeric, boolean,
  timestamp, date, uniqueIndex, index,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

// --- enums ---
export const sexEnum = pgEnum('sex', ['M', 'F', 'Mx']);
export const sourceEnum = pgEnum('source', ['opl', 'goodlift']);
export const equipmentEnum = pgEnum('equipment', ['Raw', 'Wraps', 'Single', 'Multi', 'Unlimited']);
export const liftEnum = pgEnum('lift', ['SQ', 'BP', 'DL']);
export const attemptResultEnum = pgEnum('attempt_result', ['good', 'no_lift', 'skipped']);
export const ingestStatusEnum = pgEnum('ingest_status', ['running', 'ok', 'error']);
export const targetStatusEnum = pgEnum('target_status', ['ok', 'error', 'pending']);

// --- lifter ---
export const lifter = pgTable('lifter', {
  id: serial('id').primaryKey(),
  slug: text('slug').notNull().unique(),
  name: text('name').notNull(),
  sex: sexEnum('sex').notNull(),
  birthYear: integer('birth_year'),
  primaryFed: text('primary_fed'),
  country: text('country'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  // pg_trgm index is added in a follow-up SQL migration in Task 8
  nameIdx: index('lifter_name_idx').on(t.name),
}));

// --- meet ---
export const meet = pgTable('meet', {
  id: serial('id').primaryKey(),
  source: sourceEnum('source').notNull(),
  sourceMeetId: text('source_meet_id').notNull(),
  federation: text('federation').notNull(),
  date: date('date').notNull(),
  name: text('name').notNull(),
  country: text('country'),
  town: text('town'),
  hasAttempts: boolean('has_attempts').notNull().default(false),
}, (t) => ({
  sourceMeetUnique: uniqueIndex('meet_source_meetid_unique').on(t.source, t.sourceMeetId),
  dateIdx: index('meet_date_idx').on(t.date),
}));

// --- entry ---
export const entry = pgTable('entry', {
  id: serial('id').primaryKey(),
  lifterId: integer('lifter_id').notNull().references(() => lifter.id, { onDelete: 'cascade' }),
  meetId: integer('meet_id').notNull().references(() => meet.id, { onDelete: 'cascade' }),
  equipment: equipmentEnum('equipment').notNull(),
  weightClassKg: numeric('weight_class_kg').notNull(),
  bodyweightKg: numeric('bodyweight_kg'),
  age: numeric('age'),
  ageClass: text('age_class'),
  division: text('division'),
  bestSqKg: numeric('best_sq_kg'),
  bestBpKg: numeric('best_bp_kg'),
  bestDlKg: numeric('best_dl_kg'),
  totalKg: numeric('total_kg'),
  place: integer('place'),
  glPoints: numeric('gl_points'),
  wilks: numeric('wilks'),
  dots: numeric('dots'),
  flightSize: integer('flight_size'),
}, (t) => ({
  uniq: uniqueIndex('entry_lifter_meet_eq_class_unique')
    .on(t.lifterId, t.meetId, t.equipment, t.weightClassKg),
  lifterIdx: index('entry_lifter_idx').on(t.lifterId),
  flightLookupIdx: index('entry_flight_lookup_idx')
    .on(t.meetId, t.equipment, t.weightClassKg),
}));

// --- attempt ---
export const attempt = pgTable('attempt', {
  id: serial('id').primaryKey(),
  entryId: integer('entry_id').notNull().references(() => entry.id, { onDelete: 'cascade' }),
  lift: liftEnum('lift').notNull(),
  attemptNo: integer('attempt_no').notNull(),
  weightKg: numeric('weight_kg').notNull(),
  result: attemptResultEnum('result').notNull(),
}, (t) => ({
  uniq: uniqueIndex('attempt_entry_lift_no_unique').on(t.entryId, t.lift, t.attemptNo),
}));

// --- ingest_run ---
export const ingestRun = pgTable('ingest_run', {
  id: serial('id').primaryKey(),
  source: sourceEnum('source').notNull(),
  startedAt: timestamp('started_at', { withTimezone: true }).notNull().defaultNow(),
  finishedAt: timestamp('finished_at', { withTimezone: true }),
  status: ingestStatusEnum('status').notNull().default('running'),
  rowsAdded: integer('rows_added').notNull().default(0),
  rowsUpdated: integer('rows_updated').notNull().default(0),
  error: text('error'),
});

// --- goodlift_targets ---
export const goodliftTargets = pgTable('goodlift_targets', {
  id: serial('id').primaryKey(),
  goodliftUrl: text('goodlift_url').notNull().unique(),
  addedAt: timestamp('added_at', { withTimezone: true }).notNull().defaultNow(),
  note: text('note'),
  lastAttemptedAt: timestamp('last_attempted_at', { withTimezone: true }),
  lastStatus: targetStatusEnum('last_status').notNull().default('pending'),
  lastError: text('last_error'),
});
```

- [ ] **Step 2: Run typecheck**

Run:

```bash
npm run typecheck
```

Expected: exit code 0.

- [ ] **Step 3: Commit**

```bash
git add lib/db/schema.ts
git commit -m "feat: drizzle schema for 6 core tables"
```

---

### Task 6: Configure drizzle-kit and generate the first migration

**Files:**
- Create: `drizzle.config.ts`
- Create: `lib/db/migrations/0000_initial.sql` (generated)
- Create: `lib/db/migrations/meta/_journal.json` (generated)

- [ ] **Step 1: Create `drizzle.config.ts`**

```ts
import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  schema: './lib/db/schema.ts',
  out: './lib/db/migrations',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
  verbose: true,
  strict: true,
});
```

- [ ] **Step 2: Add migration scripts to `package.json`**

In `"scripts"`:

```json
"db:generate": "drizzle-kit generate",
"db:migrate": "drizzle-kit migrate",
"db:studio": "drizzle-kit studio"
```

- [ ] **Step 3: Generate migration**

Run:

```bash
npm run db:generate
```

Expected: prints `0 errors`, creates `lib/db/migrations/0000_*.sql` and `lib/db/migrations/meta/_journal.json`.

- [ ] **Step 4: Verify the SQL is plausible**

Open the generated `.sql` file. Expected: contains `CREATE TYPE ... AS ENUM` for each enum and `CREATE TABLE` for all 6 tables, plus the indexes and unique constraints.

- [ ] **Step 5: Commit**

```bash
git add drizzle.config.ts lib/db/migrations package.json
git commit -m "feat: drizzle config and initial migration"
```

---

### Task 7: Add pg_trgm extension migration

The Drizzle schema doesn't model Postgres extensions. We need `pg_trgm` for fuzzy lifter search in Plan 3. Add it now via a custom SQL migration so it's available from day one.

**Files:**
- Create: `lib/db/migrations/0001_pg_trgm.sql`
- Modify: `lib/db/migrations/meta/_journal.json`

- [ ] **Step 1: Create the SQL file**

Create `lib/db/migrations/0001_pg_trgm.sql`:

```sql
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE INDEX IF NOT EXISTS lifter_name_trgm_idx ON lifter USING gin (name gin_trgm_ops);
```

- [ ] **Step 2: Append to migration journal**

Open `lib/db/migrations/meta/_journal.json`. It looks like:

```json
{
  "version": "7",
  "dialect": "postgresql",
  "entries": [
    { "idx": 0, "version": "7", "when": <number>, "tag": "0000_initial", "breakpoints": true }
  ]
}
```

Append a second entry (preserve the existing `idx: 0` entry; do not modify it):

```json
{ "idx": 1, "version": "7", "when": 1748352000000, "tag": "0001_pg_trgm", "breakpoints": true }
```

The exact filename of `0000_*.sql` may differ from `0000_initial.sql` (drizzle-kit uses a random adjective). Use whatever `tag` the journal already has for idx 0 — don't rename anything. Just add the new idx-1 entry referring to your new file `0001_pg_trgm`.

- [ ] **Step 3: Commit**

```bash
git add lib/db/migrations/
git commit -m "feat: pg_trgm extension and lifter name gin index"
```

---

### Task 8: Create the Drizzle client singleton

**Files:**
- Create: `lib/db/index.ts`

- [ ] **Step 1: Write `lib/db/index.ts`**

```ts
import { drizzle, NeonHttpDatabase } from 'drizzle-orm/neon-http';
import { neon } from '@neondatabase/serverless';
import * as schema from './schema';
import { env } from '@/lib/env';

declare global {
  var __db: NeonHttpDatabase<typeof schema> | undefined;
}

function makeClient() {
  const sql = neon(env.DATABASE_URL);
  return drizzle(sql, { schema });
}

export const db: NeonHttpDatabase<typeof schema> =
  globalThis.__db ?? (globalThis.__db = makeClient());

export { schema };
```

We attach the client to `globalThis` so Next.js dev's hot reload doesn't create a new client per change.

- [ ] **Step 2: Typecheck**

Run:

```bash
npm run typecheck
```

Expected: exit code 0.

- [ ] **Step 3: Commit**

```bash
git add lib/db/index.ts
git commit -m "feat: drizzle client singleton with neon-http driver"
```

---

### Task 9: Install Vitest and pglite

**Files:**
- Modify: `package.json` (via npm install)
- Create: `vitest.config.ts`

- [ ] **Step 1: Install**

Run:

```bash
npm install -D vitest @vitest/coverage-v8 @electric-sql/pglite drizzle-orm-pglite-adapter
```

If `drizzle-orm-pglite-adapter` does not exist on npm at the time of execution, install only the others — we will use the pglite driver directly via `drizzle-orm/pglite`, which ships with Drizzle:

```bash
npm install -D vitest @vitest/coverage-v8 @electric-sql/pglite
```

- [ ] **Step 2: Create `vitest.config.ts`**

```ts
import { defineConfig } from 'vitest/config';
import path from 'node:path';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    setupFiles: [],
    hookTimeout: 30_000,
    testTimeout: 30_000,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    },
  },
});
```

- [ ] **Step 3: Commit**

```bash
git add package.json package-lock.json vitest.config.ts
git commit -m "chore: install vitest and pglite for tests"
```

---

### Task 10: Build the pglite test DB helper

This helper boots an in-process Postgres, applies every migration, and returns a Drizzle client bound to it. Each test gets a fresh instance.

**Files:**
- Create: `lib/test/db.ts`

- [ ] **Step 1: Write the helper**

```ts
import { PGlite } from '@electric-sql/pglite';
import { drizzle } from 'drizzle-orm/pglite';
import * as schema from '@/lib/db/schema';
import fs from 'node:fs/promises';
import path from 'node:path';

export type TestDb = Awaited<ReturnType<typeof createTestDb>>;

export async function createTestDb() {
  const client = new PGlite();
  const db = drizzle(client, { schema });

  // Apply migrations in order, executing the raw SQL files.
  const migrationsDir = path.resolve('lib/db/migrations');
  const files = (await fs.readdir(migrationsDir))
    .filter((f) => f.endsWith('.sql'))
    .sort();

  for (const file of files) {
    const sql = await fs.readFile(path.join(migrationsDir, file), 'utf8');
    // Drizzle uses statement-breakpoints; split on them and execute each piece.
    const statements = sql
      .split('--> statement-breakpoint')
      .map((s) => s.trim())
      .filter((s) => s.length > 0);
    for (const statement of statements) {
      try {
        await client.exec(statement);
      } catch (err) {
        // pglite may not support pg_trgm; if so, skip the trgm migration silently.
        if (statement.includes('pg_trgm')) continue;
        throw err;
      }
    }
  }

  return {
    db,
    client,
    async close() {
      await client.close();
    },
  };
}
```

- [ ] **Step 2: Typecheck**

Run:

```bash
npm run typecheck
```

Expected: exit code 0. (If pglite's `drizzle-orm/pglite` import is unresolved, your Drizzle version may be too old — bump to latest.)

- [ ] **Step 3: Commit**

```bash
git add lib/test/db.ts
git commit -m "feat: pglite-based test db helper"
```

---

### Task 11: Write the schema integration test (failing first)

**Files:**
- Create: `tests/schema.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createTestDb, type TestDb } from '@/lib/test/db';
import { lifter, meet, entry, attempt, ingestRun, goodliftTargets } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

describe('schema migrations + inserts', () => {
  let t: TestDb;
  beforeAll(async () => { t = await createTestDb(); });
  afterAll(async () => { await t.close(); });

  it('can insert and read a lifter', async () => {
    await t.db.insert(lifter).values({
      slug: 'john-haack',
      name: 'John Haack',
      sex: 'M',
      country: 'USA',
    });
    const rows = await t.db.select().from(lifter).where(eq(lifter.slug, 'john-haack'));
    expect(rows).toHaveLength(1);
    expect(rows[0].name).toBe('John Haack');
  });

  it('can insert a meet + entry + attempt linked correctly', async () => {
    const [m] = await t.db.insert(meet).values({
      source: 'goodlift',
      sourceMeetId: 'sbd-pro-2024',
      federation: 'IPF',
      date: '2024-09-01',
      name: 'SBD Pro 2024',
      country: 'USA',
      hasAttempts: true,
    }).returning();

    const [l] = await t.db.insert(lifter).values({
      slug: 'jesus-olivares',
      name: 'Jesus Olivares',
      sex: 'M',
      country: 'USA',
    }).returning();

    const [e] = await t.db.insert(entry).values({
      lifterId: l.id,
      meetId: m.id,
      equipment: 'Raw',
      weightClassKg: '120',
      bodyweightKg: '160.0',
      bestSqKg: '450',
      bestBpKg: '270',
      bestDlKg: '420',
      totalKg: '1140',
      glPoints: '127.5',
    }).returning();

    await t.db.insert(attempt).values([
      { entryId: e.id, lift: 'SQ', attemptNo: 1, weightKg: '430', result: 'good' },
      { entryId: e.id, lift: 'SQ', attemptNo: 2, weightKg: '450', result: 'good' },
      { entryId: e.id, lift: 'SQ', attemptNo: 3, weightKg: '465', result: 'no_lift' },
    ]);

    const attempts = await t.db.select().from(attempt).where(eq(attempt.entryId, e.id));
    expect(attempts).toHaveLength(3);
    expect(attempts.filter((a) => a.result === 'good')).toHaveLength(2);
  });

  it('records an ingest run', async () => {
    const [run] = await t.db.insert(ingestRun).values({
      source: 'opl',
      status: 'ok',
      rowsAdded: 1234,
      rowsUpdated: 56,
    }).returning();
    expect(run.id).toBeGreaterThan(0);
    expect(run.status).toBe('ok');
  });

  it('records a goodlift target', async () => {
    const [tgt] = await t.db.insert(goodliftTargets).values({
      goodliftUrl: 'https://goodlift.info/results.php?c_id=123',
      note: 'NSF Norgesmesterskap 2024',
    }).returning();
    expect(tgt.lastStatus).toBe('pending');
  });
});
```

- [ ] **Step 2: Run the test (expect failure)**

Run:

```bash
npm run test
```

Expected: FAIL — most likely "cannot find module" or "schema not found" or pglite version error. Read the error carefully.

- [ ] **Step 3: Iterate until green**

Common fixes:
- If `drizzle-orm/pglite` is missing, install `npm install drizzle-orm@latest`.
- If the migration SQL has syntax pglite doesn't understand (rare; pglite is Postgres-faithful), simplify the migration file.
- If enum types cause issues, ensure the migration file's enum statements precede the table statements.

Once tests pass, expected output:

```
 ✓ tests/schema.test.ts (4 tests) ...
```

- [ ] **Step 4: Commit**

```bash
git add tests/schema.test.ts
git commit -m "test: schema integration tests against pglite"
```

---

### Task 12: Implement `/api/health` (TDD with DI, no module mocking)

We extract the read logic into a plain function that takes a `db` argument. The route handler is a thin wrapper around it. This avoids `vi.mock` hoisting headaches and gives us a normal unit test against pglite.

**Files:**
- Create: `lib/db/health.ts`
- Create: `tests/health.test.ts`
- Create: `app/api/health/route.ts`

- [ ] **Step 1: Write the failing test**

Create `tests/health.test.ts`:

```ts
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createTestDb, type TestDb } from '@/lib/test/db';
import { getHealthSummary } from '@/lib/db/health';
import { ingestRun } from '@/lib/db/schema';

describe('getHealthSummary', () => {
  let t: TestDb;
  beforeAll(async () => { t = await createTestDb(); });
  afterAll(async () => { await t.close(); });

  it('returns null per source when no runs exist', async () => {
    const result = await getHealthSummary(t.db);
    expect(result).toEqual({ opl: null, goodlift: null });
  });

  it('returns the latest run for each source', async () => {
    await t.db.insert(ingestRun).values([
      { source: 'opl', status: 'ok', rowsAdded: 100 },
      { source: 'opl', status: 'ok', rowsAdded: 200 }, // newer
      { source: 'goodlift', status: 'error', error: 'boom' },
    ]);
    const result = await getHealthSummary(t.db);
    expect(result.opl).toMatchObject({ status: 'ok', rowsAdded: 200 });
    expect(result.goodlift).toMatchObject({ status: 'error' });
  });
});
```

- [ ] **Step 2: Run, see it fail**

Run:

```bash
npm run test -- tests/health.test.ts
```

Expected: FAIL — `Cannot find module '@/lib/db/health'`.

- [ ] **Step 3: Implement the read function**

Create `lib/db/health.ts`:

```ts
import { desc, eq } from 'drizzle-orm';
import { ingestRun } from './schema';

type AnyDb = {
  select: (...args: unknown[]) => any;
};

export type IngestSummary = {
  status: 'running' | 'ok' | 'error';
  rowsAdded: number;
  rowsUpdated: number;
  finishedAt: string | null;
  error: string | null;
} | null;

export type HealthSummary = {
  opl: IngestSummary;
  goodlift: IngestSummary;
};

async function lastRun(db: AnyDb, source: 'opl' | 'goodlift'): Promise<IngestSummary> {
  const rows = await db
    .select()
    .from(ingestRun)
    .where(eq(ingestRun.source, source))
    .orderBy(desc(ingestRun.startedAt))
    .limit(1);
  if (rows.length === 0) return null;
  const r = rows[0];
  return {
    status: r.status,
    rowsAdded: r.rowsAdded,
    rowsUpdated: r.rowsUpdated,
    finishedAt: r.finishedAt ? new Date(r.finishedAt).toISOString() : null,
    error: r.error ?? null,
  };
}

export async function getHealthSummary(db: AnyDb): Promise<HealthSummary> {
  const [opl, goodlift] = await Promise.all([lastRun(db, 'opl'), lastRun(db, 'goodlift')]);
  return { opl, goodlift };
}
```

The `AnyDb` type is loose because both `NeonHttpDatabase` and the pglite-backed test client expose the same query interface but have different generic types. A precise union here adds noise without value.

- [ ] **Step 4: Run, see it pass**

Run:

```bash
npm run test -- tests/health.test.ts
```

Expected: PASS (both `it` blocks).

- [ ] **Step 5: Implement the route handler**

Create `app/api/health/route.ts`:

```ts
import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getHealthSummary } from '@/lib/db/health';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const ingest = await getHealthSummary(db);
    return NextResponse.json({ status: 'ok', ingest });
  } catch (err) {
    return NextResponse.json(
      { status: 'error', error: err instanceof Error ? err.message : 'unknown' },
      { status: 500 },
    );
  }
}
```

- [ ] **Step 6: Run typecheck + full test**

Run:

```bash
npm run typecheck && npm run test
```

Expected: both exit 0.

- [ ] **Step 7: Commit**

```bash
git add app/api/health/route.ts lib/db/health.ts tests/health.test.ts
git commit -m "feat: /api/health endpoint with ingest_run summary"
```

---

### Task 13: Set up shadcn/ui

shadcn isn't strictly needed for the foundation, but installing it once means later plans can `npx shadcn add button` without re-running init.

**Files:**
- Create: `components.json`, `lib/utils.ts`, `app/globals.css` (modified)

- [ ] **Step 1: Run shadcn init**

Run:

```bash
npx shadcn@latest init --yes --base-color zinc
```

Answer "yes" to non-interactive prompts if any. This creates `components.json`, updates `app/globals.css` with shadcn's CSS variables, and creates `lib/utils.ts`.

- [ ] **Step 2: Verify a component install works**

Run:

```bash
npx shadcn@latest add button
```

Expected: creates `components/ui/button.tsx`.

- [ ] **Step 3: Use it on the landing page to prove it renders**

Replace `app/page.tsx`:

```tsx
import { Button } from '@/components/ui/button';

export default function HomePage() {
  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100 p-8">
      <h1 className="text-2xl font-semibold">Powerlifting Stats</h1>
      <p className="text-zinc-400 mt-2">Coming soon.</p>
      <Button className="mt-6" variant="secondary">Placeholder</Button>
    </main>
  );
}
```

- [ ] **Step 4: Build the project**

Run:

```bash
npm run build
```

Expected: build succeeds. No runtime — just compile-time check.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: shadcn/ui init with zinc base"
```

---

### Task 14: GitHub Actions CI

**Files:**
- Create: `.github/workflows/ci.yml`

- [ ] **Step 1: Write the workflow**

```yaml
name: CI

on:
  push:
    branches: [main]
  pull_request:

jobs:
  ci:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '24'
          cache: 'npm'
      - run: npm ci
      - run: npm run lint
      - run: npm run typecheck
      - run: npm run test
      - run: npm run build
        env:
          # placeholder so env.ts parses; build never runs DB queries.
          DATABASE_URL: 'postgresql://placeholder@localhost/placeholder?sslmode=require'
```

- [ ] **Step 2: Commit**

```bash
git add .github/workflows/ci.yml
git commit -m "ci: add github actions for lint/typecheck/test/build"
```

The workflow will run once the repo is pushed to GitHub (Task 16).

---

### Task 15: Provision Neon via Vercel Marketplace (manual + documented)

This task is half-manual — the user signs up for Vercel, installs the Neon integration, and gets a `DATABASE_URL`. Document it so future plans don't re-derive it.

**Files:**
- Create: `docs/setup.md`

- [ ] **Step 1: Document the setup**

Create `docs/setup.md`:

```markdown
# One-Time Setup

## 1. Vercel + Neon

1. Create a Vercel account (free) and import this repo as a new project.
2. From Vercel project Settings → Storage → "Connect Database" → Marketplace → Neon. Install Neon, create a database named `powerlifting`.
3. Vercel auto-creates `DATABASE_URL`, `DATABASE_URL_UNPOOLED`, and related env vars under both Preview and Production environments.

## 2. Local development

1. Install Vercel CLI: `npm i -g vercel`
2. Link the project: `vercel link`
3. Pull env to local: `vercel env pull .env.local`
4. Run migrations against the dev database: `npm run db:migrate`
5. `npm run dev` — http://localhost:3000

## 3. Deploy

Pushing to `main` triggers a Vercel preview deploy. The `vercel --prod` CLI or the Vercel dashboard promotes to production.
```

- [ ] **Step 2: Commit**

```bash
git add docs/setup.md
git commit -m "docs: one-time setup instructions"
```

- [ ] **Step 3: User performs the manual steps**

The user follows `docs/setup.md` step 1, then comes back with a real `DATABASE_URL` available in Vercel. No code changes needed.

---

### Task 16: First deploy + verify

**Files:** none (operational).

- [ ] **Step 1: Push the repo to GitHub**

Create a GitHub repo named `styrkeloft-page-norge` (or whatever the user prefers). Then:

```bash
git remote add origin git@github.com:<user>/styrkeloft-page-norge.git
git push -u origin main
```

- [ ] **Step 2: Confirm CI passed**

Open the repo's Actions tab. Expected: the `CI` workflow ran and passed (green check).

- [ ] **Step 3: Confirm Vercel deployed**

Open the Vercel dashboard for the linked project. Expected: a successful production deploy.

- [ ] **Step 4: Run migrations against production Neon**

From local with `.env.local` already populated:

```bash
npm run db:migrate
```

Expected: prints "applied 2 migrations" (the initial schema + pg_trgm).

- [ ] **Step 5: Hit `/api/health` in production**

Open `https://<your-vercel-domain>/api/health` in browser. Expected JSON:

```json
{
  "status": "ok",
  "ingest": { "opl": null, "goodlift": null }
}
```

If the response is `{ "status": "error", ... }` — the most common cause is `DATABASE_URL` not reaching the deployed function. Check Vercel project env vars; the Neon integration should have populated them across all environments.

- [ ] **Step 6: Tag the foundation release**

```bash
git tag v0.1.0
git push --tags
```

---

## Self-Review (done by plan author)

**Spec coverage check** — every Foundation-relevant requirement in the spec maps to a task:

- 6 tables → Task 5, 6, 7 (schema, migration, pg_trgm)
- Drizzle ORM → Task 4, 5, 8
- Neon via Vercel Marketplace → Task 15
- `/api/health` → Task 12
- Tailwind + shadcn dark theme → Task 1, 13
- Vitest + integration test → Task 9, 10, 11
- GitHub Actions CI → Task 14
- First deploy → Task 16

Deferred to later plans (correctly): ingest pipelines, profile pages, nation dashboard, meet pages, search UI.

**Placeholder scan**: every step has concrete commands or full code. No "TODO" / "implement later" / "handle errors appropriately" left in.

**Type consistency**: `db` exported from `lib/db/index.ts` is used by the route handler and the test mock. `schema` is re-exported alongside it so callers use `schema.ingestRun`, `schema.lifter`, etc. consistently. Test helper `createTestDb()` returns the same `db` shape (Drizzle client) so tests can swap it in.

---

## Done when

- `npm run lint && npm run typecheck && npm run test && npm run build` all pass locally
- CI is green on GitHub
- Vercel preview + production deploys both succeed
- `/api/health` returns 200 with `{ status: 'ok', ingest: { opl: null, goodlift: null } }` in production
- Repo is tagged `v0.1.0`

Plan 2 (OPL ingest) starts here.
