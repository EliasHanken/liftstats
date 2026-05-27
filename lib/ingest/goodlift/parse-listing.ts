import { parse } from 'node-html-parser';
import type { MeetListingRow } from './types';

// Parse a date string like "12 Feb - 18 Feb" to an ISO start date, given the
// listing year (passed explicitly from the caller). Returns null if the format
// is unrecognised.
// Expected formats in listing cells (no year in the cell):
//   "15 Jun - 23 Jun"   (range — take start)
//   "25 Jan"            (single day)
//   "12 Dec - 04 Jan"   (year-crossing — take start)
function parseListingDate(cellText: string, year: number): string | null {
  const trimmed = cellText.trim();
  const m = trimmed.match(/^(\d{1,2})\s+([A-Za-z]{3,9})/);
  if (!m) return null;
  const day = parseInt(m[1], 10);
  const monthName = m[2].toLowerCase().slice(0, 3);
  const months: Record<string, number> = {
    jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6,
    jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12,
  };
  const month = months[monthName];
  if (!month) return null;
  const mm = String(month).padStart(2, '0');
  const dd = String(day).padStart(2, '0');
  return `${year}-${mm}-${dd}`;
}

/**
 * Parse the GoodLift competitions listing page and return one row per unique
 * competition (identified by cid).
 *
 * The `year` parameter must be supplied by the caller (it is the year used in
 * the URL query string, e.g. ?year=2024). The listing HTML cells contain dates
 * like "15 Jun - 23 Jun" with no year embedded.
 *
 * Each row in the listing looks like:
 *   <tr>
 *     <td><a class='mainlink' href='onecompetition.php?lid=0&cid=888'>Meet name</a></td>
 *     <td><span class='badge-federation EPF' title='European Powerlifting Federation'></span></td>
 *     <td><span class='gender male'></span></td>
 *     <td>12 Feb - 18 Feb</td>
 *     <td>Malaga,&nbsp;Spain</td>
 *   </tr>
 */
export function parseCompetitionListing(html: string, year: number): MeetListingRow[] {
  const root = parse(html);

  const anchors = root.querySelectorAll('a[href*="onecompetition.php"]');

  const seen = new Set<number>();
  const rows: MeetListingRow[] = [];

  for (const a of anchors) {
    const href = a.getAttribute('href') ?? '';
    const cidMatch = href.match(/cid=(\d+)/);
    if (!cidMatch) continue;
    const cid = parseInt(cidMatch[1], 10);
    if (seen.has(cid)) continue;
    seen.add(cid);

    const name = a.text.trim();
    if (name.length === 0) continue;

    // Walk up to the nearest <TR>
    let tr: ReturnType<typeof root.querySelector> = a.parentNode as any;
    while (tr && tr.rawTagName?.toUpperCase() !== 'TR') {
      tr = tr.parentNode as any;
    }

    if (!tr) {
      rows.push({ cid, name, federation: '', date: null, country: null, town: null });
      continue;
    }

    // Federation: from the title attribute of the badge-federation span
    const fedSpan = tr.querySelector('[class*="badge-federation"]');
    const federation = fedSpan?.getAttribute('title') ?? '';

    // The <td> children give us: [0]=name link, [1]=federation badge, [2]=gender, [3]=date, [4]=location
    const tds = tr.querySelectorAll('td');
    const dateRaw = tds[3]?.text?.trim() ?? '';
    const locationRaw = tds[4]?.text?.replace(/ /g, ' ').trim() ?? '';

    const date = dateRaw ? parseListingDate(dateRaw, year) : null;

    // locationRaw is "Town, Country" — split on last comma
    let town: string | null = null;
    let country: string | null = null;
    if (locationRaw) {
      const commaIdx = locationRaw.lastIndexOf(',');
      if (commaIdx !== -1) {
        town = locationRaw.slice(0, commaIdx).trim() || null;
        country = locationRaw.slice(commaIdx + 1).trim() || null;
      } else {
        country = locationRaw || null;
      }
    }

    rows.push({ cid, name, federation, date, country, town });
  }

  return rows;
}
