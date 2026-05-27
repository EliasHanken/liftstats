import type { OplRawRow, NormalizedRow, SkipReason } from './types';
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
      },
    },
  };
}
