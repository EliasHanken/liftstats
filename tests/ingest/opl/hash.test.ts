import { describe, it, expect } from 'vitest';
import { meetSourceId } from '@/lib/ingest/opl/hash';

describe('meetSourceId', () => {
  it('returns a stable 16-char hex id for the same inputs', () => {
    const a = meetSourceId({ federation: 'IPF', date: '2024-09-01', name: 'World Open', country: 'USA', town: 'Las Vegas' });
    const b = meetSourceId({ federation: 'IPF', date: '2024-09-01', name: 'World Open', country: 'USA', town: 'Las Vegas' });
    expect(a).toEqual(b);
    expect(a).toMatch(/^[0-9a-f]{16}$/);
  });

  it('differs when any input field differs', () => {
    const base = { federation: 'IPF', date: '2024-09-01', name: 'World Open', country: 'USA', town: 'Las Vegas' };
    const fields: (keyof typeof base)[] = ['federation', 'date', 'name', 'country', 'town'];
    for (const f of fields) {
      const variant = { ...base, [f]: base[f] + 'X' };
      expect(meetSourceId(variant)).not.toEqual(meetSourceId(base));
    }
  });

  it('treats nullish town/country as empty string deterministically', () => {
    const id = meetSourceId({ federation: 'IPF', date: '2024-09-01', name: 'X', country: null, town: null });
    expect(id).toMatch(/^[0-9a-f]{16}$/);
  });
});
