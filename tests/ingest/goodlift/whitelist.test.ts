import { describe, it, expect } from 'vitest';
import { isWhitelisted } from '@/lib/ingest/goodlift/whitelist';
import type { MeetListingRow } from '@/lib/ingest/goodlift/types';

function meet(overrides: Partial<MeetListingRow>): MeetListingRow {
  return {
    cid: 1, name: '', federation: '', date: null, country: null, town: null,
    ...overrides,
  };
}

describe('isWhitelisted', () => {
  it('keeps IPF Open World championships', () => {
    expect(isWhitelisted(meet({
      federation: 'International Powerlifting Federation',
      name: "World Open Classic Powerlifting Championships",
    }))).toBe(true);
  });

  it('keeps EPF European championships', () => {
    expect(isWhitelisted(meet({
      federation: 'European Powerlifting Federation',
      name: "European Open Men's Classic Powerlifting Championships",
    }))).toBe(true);
  });

  it('keeps IPF Junior and Sub-Junior World championships', () => {
    expect(isWhitelisted(meet({
      federation: 'International Powerlifting Federation',
      name: "World Junior & Sub-Junior Classic Powerlifting Championships",
    }))).toBe(true);
  });

  it('rejects non-whitelisted federations', () => {
    expect(isWhitelisted(meet({
      federation: 'Asian Powerlifting Federation',
      name: 'Asian Open Championships',
    }))).toBe(false);
  });

  it('rejects regional / open meets even within IPF', () => {
    expect(isWhitelisted(meet({
      federation: 'International Powerlifting Federation',
      name: 'Some Random Open',
    }))).toBe(false);
  });

  it('keeps NSF (Norwegian) federation meets', () => {
    expect(isWhitelisted(meet({
      federation: 'Norwegian Powerlifting Federation',
      name: 'NSF Norgesmesterskap Klassisk 2024',
    }))).toBe(true);
  });

  it('keeps meets whose federation field uses the Norwegian spelling', () => {
    expect(isWhitelisted(meet({
      federation: 'Norges Styrkeløftforbund',
      name: 'Junior NM 2024',
    }))).toBe(true);
  });

  it('still rejects unrelated regional meets', () => {
    expect(isWhitelisted(meet({
      federation: 'Asian Powerlifting Federation',
      name: 'Asian Open Championships',
    }))).toBe(false);
  });
});
