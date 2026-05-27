import { describe, it, expect } from 'vitest';
import { transformRow } from '@/lib/ingest/opl/transform';
import type { OplRawRow } from '@/lib/ingest/opl/types';

const baseRow: OplRawRow = {
  Name: 'John Haack',
  Sex: 'M',
  Event: 'SBD',
  Equipment: 'Raw',
  Age: '32.5',
  AgeClass: 'Open',
  Division: 'Open',
  BodyweightKg: '89.8',
  WeightClassKg: '90',
  Best3SquatKg: '377.5',
  Best3BenchKg: '272.5',
  Best3DeadliftKg: '400.0',
  Squat1Kg: '350.0',
  Squat2Kg: '370.0',
  Squat3Kg: '-377.5',
  Squat4Kg: '',
  Bench1Kg: '260.0',
  Bench2Kg: '272.5',
  Bench3Kg: '',
  Bench4Kg: '',
  Deadlift1Kg: '380.0',
  Deadlift2Kg: '400.0',
  Deadlift3Kg: '420.0',
  Deadlift4Kg: '',
  TotalKg: '1050.0',
  Place: '1',
  Dots: '',
  Wilks: '',
  Goodlift: '124.86',
  Tested: '',
  Country: 'USA',
  Federation: 'WRPF',
  Date: '2024-09-01',
  MeetCountry: 'USA',
  MeetTown: 'Las Vegas',
  MeetName: 'WRPF Showdown',
};

describe('transformRow', () => {
  it('produces a normalized row for a clean Raw SBD entry', () => {
    const r = transformRow(baseRow);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.row.lifter.name).toBe('John Haack');
    expect(r.row.lifter.slug).toMatch(/^john-haack(-m)?$/);
    expect(r.row.lifter.sex).toBe('M');
    expect(r.row.entry.equipment).toBe('Raw');
    expect(r.row.entry.totalKg).toBe('1050.0');
    expect(r.row.entry.glPoints).toBe('124.86');
    expect(r.row.entry.place).toBe(1);
    expect(r.row.meet.federation).toBe('WRPF');
    expect(r.row.meet.sourceMeetId).toMatch(/^[0-9a-f]{16}$/);
  });

  it('normalizes "Single-ply" to "Single" and "Multi-ply" to "Multi"', () => {
    expect((transformRow({ ...baseRow, Equipment: 'Single-ply' }) as any).row.entry.equipment).toBe('Single');
    expect((transformRow({ ...baseRow, Equipment: 'Multi-ply' }) as any).row.entry.equipment).toBe('Multi');
  });

  it('skips Straps equipment (deadlift-only with straps, not powerlifting)', () => {
    const r = transformRow({ ...baseRow, Equipment: 'Straps' });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.reason).toBe('unsupported_equipment');
  });

  it('parses non-numeric Place (DQ, DD, NS) as null', () => {
    for (const p of ['DQ', 'DD', 'NS', 'G']) {
      const r = transformRow({ ...baseRow, Place: p });
      expect(r.ok).toBe(true);
      if (!r.ok) return;
      expect(r.row.entry.place).toBeNull();
    }
  });

  it('empty numeric strings become null, not "0"', () => {
    const r = transformRow({ ...baseRow, Best3SquatKg: '', Best3BenchKg: '', Goodlift: '' });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.row.entry.bestSqKg).toBeNull();
    expect(r.row.entry.bestBpKg).toBeNull();
    expect(r.row.entry.glPoints).toBeNull();
  });

  it('preserves "+" in superheavy class strings (e.g. "120+")', () => {
    const r = transformRow({ ...baseRow, WeightClassKg: '120+' });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.row.entry.weightClassKg).toBe('120+');
  });

  it('skips rows missing Name', () => {
    const r = transformRow({ ...baseRow, Name: '' });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.reason).toBe('missing_required_field');
  });

  it('skips rows missing Date', () => {
    const r = transformRow({ ...baseRow, Date: '' });
    expect(r.ok).toBe(false);
  });

  it('skips rows with unknown Sex', () => {
    const r = transformRow({ ...baseRow, Sex: 'U' as any });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.reason).toBe('unknown_sex');
  });

  it('two lifters with the same name but different sex get different slugs', () => {
    const m = transformRow(baseRow);
    const f = transformRow({ ...baseRow, Sex: 'F' });
    if (!m.ok || !f.ok) throw new Error('expected both to succeed');
    expect(m.row.lifter.slug).not.toEqual(f.row.lifter.slug);
  });

  it('maps Tested="Yes" to true and empty Tested to false', () => {
    const tested = transformRow({ ...baseRow, Tested: 'Yes' });
    const untested = transformRow({ ...baseRow, Tested: '' });
    expect(tested.ok).toBe(true);
    expect(untested.ok).toBe(true);
    if (!tested.ok || !untested.ok) return;
    expect(tested.row.entry.tested).toBe(true);
    expect(untested.row.entry.tested).toBe(false);
  });

  it('parses non-empty attempts with OPL sign convention', () => {
    const r = transformRow(baseRow);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const a = r.row.entry.attempts;
    expect(a).toHaveLength(8);
    expect(a.filter((x) => x.lift === 'SQ')).toEqual([
      { lift: 'SQ', attemptNo: 1, weightKg: 350,   result: 'good' },
      { lift: 'SQ', attemptNo: 2, weightKg: 370,   result: 'good' },
      { lift: 'SQ', attemptNo: 3, weightKg: 377.5, result: 'no_lift' },
    ]);
    expect(a.filter((x) => x.lift === 'BP')).toHaveLength(2);
    expect(a.filter((x) => x.lift === 'DL').every((x) => x.result === 'good')).toBe(true);
  });

  it('skips attempts entirely when all cells empty (older meets)', () => {
    const r = transformRow({
      ...baseRow,
      Squat1Kg: '', Squat2Kg: '', Squat3Kg: '', Squat4Kg: '',
      Bench1Kg: '', Bench2Kg: '', Bench3Kg: '', Bench4Kg: '',
      Deadlift1Kg: '', Deadlift2Kg: '', Deadlift3Kg: '', Deadlift4Kg: '',
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.row.entry.attempts).toEqual([]);
  });
});
