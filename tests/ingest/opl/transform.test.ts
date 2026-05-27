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

  it('strips trailing "+" from superheavy class strings (e.g. "120+" → "120") for numeric DB column', () => {
    const r = transformRow({ ...baseRow, WeightClassKg: '120+' });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.row.entry.weightClassKg).toBe('120');
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
});
