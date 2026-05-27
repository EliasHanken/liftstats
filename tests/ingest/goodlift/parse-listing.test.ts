import { describe, it, expect, beforeAll } from 'vitest';
import { parseCompetitionListing } from '@/lib/ingest/goodlift/parse-listing';
import fs from 'node:fs/promises';
import path from 'node:path';

describe('parseCompetitionListing', () => {
  let html: string;
  beforeAll(async () => {
    html = await fs.readFile(
      path.resolve('tests/ingest/goodlift/fixtures/competitions-2024.html'),
      'utf8',
    );
  });

  it('returns a non-empty array of meets', () => {
    const meets = parseCompetitionListing(html);
    expect(meets.length).toBeGreaterThan(10);
  });

  it('every meet has a positive cid and a non-empty name', () => {
    const meets = parseCompetitionListing(html);
    for (const m of meets) {
      expect(m.cid).toBeGreaterThan(0);
      expect(m.name.length).toBeGreaterThan(0);
    }
  });

  it('parses an EPF meet correctly', () => {
    const meets = parseCompetitionListing(html);
    const epf = meets.find((m) => m.federation.includes('European Powerlifting'));
    expect(epf).toBeDefined();
    expect(epf!.name.toLowerCase()).toContain('european');
  });

  it('cid values are unique across the listing', () => {
    const meets = parseCompetitionListing(html);
    const cids = new Set(meets.map((m) => m.cid));
    expect(cids.size).toBe(meets.length);
  });
});
