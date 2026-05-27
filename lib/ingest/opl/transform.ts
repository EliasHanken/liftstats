import type { OplRawRow, NormalizedRow, SkipReason, ParsedAttempt } from './types';
import { meetSourceId } from './hash';

export type TransformResult =
  | { ok: true; row: NormalizedRow }
  | { ok: false; reason: SkipReason };

const EQUIPMENT_MAP: Record<string, NormalizedRow['entry']['equipment'] | null> = {
  'Raw': 'Raw',
  'Wraps': 'Wraps',
  'Single-ply': 'Single',
  'Multi-ply': 'Multi',
  'Unlimited': 'Unlimited',
  'Straps': null,                   // unsupported
};

function emptyToNull(s: string): string | null {
  return s === '' ? null : s;
}

function parsePlace(p: string): number | null {
  if (p === '') return null;
  const n = parseInt(p, 10);
  return Number.isFinite(n) ? n : null;
}

function parseAttempt(raw: string, lift: 'SQ' | 'BP' | 'DL', attemptNo: 1 | 2 | 3 | 4): ParsedAttempt | null {
  if (raw === '' || raw === '0' || raw === '0.0') return null;
  const n = parseFloat(raw);
  if (!Number.isFinite(n)) return null;
  return {
    lift,
    attemptNo,
    weightKg: Math.abs(n),
    result: n < 0 ? 'no_lift' : 'good',
  };
}

function slugify(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function transformRow(row: OplRawRow): TransformResult {
  if (!row.Name || !row.Date || !row.Federation || !row.MeetName) {
    return { ok: false, reason: 'missing_required_field' };
  }
  if (row.Sex !== 'M' && row.Sex !== 'F' && row.Sex !== 'Mx') {
    return { ok: false, reason: 'unknown_sex' };
  }
  const equipment = EQUIPMENT_MAP[row.Equipment];
  if (equipment === null || equipment === undefined) {
    return { ok: false, reason: 'unsupported_equipment' };
  }

  // Slug: name-based, with a sex suffix to disambiguate cross-sex name collisions.
  // We rely on the (slug) unique index — collisions within a sex are rare in OPL data,
  // and dedup is handled at upsert time via the slug as natural key.
  const slug = slugify(row.Name) + (row.Sex === 'M' ? '' : '-' + row.Sex.toLowerCase());

  const attempts: ParsedAttempt[] = [];
  const SQ_COLS: [string, 1 | 2 | 3 | 4][] = [[row.Squat1Kg, 1], [row.Squat2Kg, 2], [row.Squat3Kg, 3], [row.Squat4Kg, 4]];
  const BP_COLS: [string, 1 | 2 | 3 | 4][] = [[row.Bench1Kg, 1], [row.Bench2Kg, 2], [row.Bench3Kg, 3], [row.Bench4Kg, 4]];
  const DL_COLS: [string, 1 | 2 | 3 | 4][] = [[row.Deadlift1Kg, 1], [row.Deadlift2Kg, 2], [row.Deadlift3Kg, 3], [row.Deadlift4Kg, 4]];
  for (const [raw, no] of SQ_COLS) { const a = parseAttempt(raw, 'SQ', no); if (a) attempts.push(a); }
  for (const [raw, no] of BP_COLS) { const a = parseAttempt(raw, 'BP', no); if (a) attempts.push(a); }
  for (const [raw, no] of DL_COLS) { const a = parseAttempt(raw, 'DL', no); if (a) attempts.push(a); }

  return {
    ok: true,
    row: {
      lifter: {
        name: row.Name,
        slug,
        sex: row.Sex,
        country: emptyToNull(row.Country),
      },
      meet: {
        sourceMeetId: meetSourceId({
          federation: row.Federation,
          date: row.Date,
          name: row.MeetName,
          country: emptyToNull(row.MeetCountry),
          town: emptyToNull(row.MeetTown),
        }),
        federation: row.Federation,
        date: row.Date,
        name: row.MeetName,
        country: emptyToNull(row.MeetCountry),
        town: emptyToNull(row.MeetTown),
      },
      entry: {
        equipment,
        weightClassKg: row.WeightClassKg,
        bodyweightKg: emptyToNull(row.BodyweightKg),
        age: emptyToNull(row.Age),
        ageClass: emptyToNull(row.AgeClass),
        division: emptyToNull(row.Division),
        bestSqKg: emptyToNull(row.Best3SquatKg),
        bestBpKg: emptyToNull(row.Best3BenchKg),
        bestDlKg: emptyToNull(row.Best3DeadliftKg),
        totalKg: emptyToNull(row.TotalKg),
        place: parsePlace(row.Place),
        glPoints: emptyToNull(row.Goodlift),
        wilks: emptyToNull(row.Wilks),
        dots: emptyToNull(row.Dots),
        tested: row.Tested === 'Yes',
        attempts,
      },
    },
  };
}
