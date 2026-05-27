import {
  pgTable, pgEnum, serial, text, integer, numeric, boolean,
  timestamp, date, uniqueIndex, index,
} from 'drizzle-orm/pg-core';

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
}, (t) => [
  // pg_trgm index is added in a follow-up SQL migration in Task 7
  index('lifter_name_idx').on(t.name),
  index('lifter_country_idx').on(t.country),
]);

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
}, (t) => [
  uniqueIndex('meet_source_meetid_unique').on(t.source, t.sourceMeetId),
  index('meet_date_idx').on(t.date),
]);

// --- entry ---
export const entry = pgTable('entry', {
  id: serial('id').primaryKey(),
  lifterId: integer('lifter_id').notNull().references(() => lifter.id, { onDelete: 'cascade' }),
  meetId: integer('meet_id').notNull().references(() => meet.id, { onDelete: 'cascade' }),
  equipment: equipmentEnum('equipment').notNull(),
  weightClassKg: text('weight_class_kg').notNull(),
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
  tested: boolean('tested'),
}, (t) => [
  uniqueIndex('entry_lifter_meet_eq_class_unique')
    .on(t.lifterId, t.meetId, t.equipment, t.weightClassKg),
  index('entry_lifter_idx').on(t.lifterId),
  index('entry_flight_lookup_idx')
    .on(t.meetId, t.equipment, t.weightClassKg),
]);

// --- attempt ---
export const attempt = pgTable('attempt', {
  id: serial('id').primaryKey(),
  entryId: integer('entry_id').notNull().references(() => entry.id, { onDelete: 'cascade' }),
  lift: liftEnum('lift').notNull(),
  attemptNo: integer('attempt_no').notNull(),
  weightKg: numeric('weight_kg').notNull(),
  result: attemptResultEnum('result').notNull(),
}, (t) => [
  uniqueIndex('attempt_entry_lift_no_unique').on(t.entryId, t.lift, t.attemptNo),
]);

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
