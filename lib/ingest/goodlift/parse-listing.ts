import { parse } from 'node-html-parser';
import type { MeetListingRow } from './types';

// Month abbreviation to two-digit month map
const MONTH_MAP: Record<string, string> = {
  Jan: '01', Feb: '02', Mar: '03', Apr: '04',
  May: '05', Jun: '06', Jul: '07', Aug: '08',
  Sep: '09', Oct: '10', Nov: '11', Dec: '12',
};

// Extract year from the HTML page title or year selection links, defaulting to
// current year if not found. This lets date strings like "12 Feb - 18 Feb" be
// converted to ISO dates relative to the listing's year.
function extractYear(html: string): string {
  const m = html.match(/competitions\.php\?year=(\d{4})['"]\s*class=['"]current_mitem/);
  if (m) return m[1];
  // fallback: look for any year=YYYY currently selected
  const m2 = html.match(/competitions\.php\?year=(\d{4})/);
  if (m2) return m2[1];
  return String(new Date().getFullYear());
}

// Parse a date string like "12 Feb - 18 Feb" to an ISO start date, given the
// listing year. Returns null if the format is unrecognised.
function parseDateRange(raw: string, year: string): string | null {
  // "DD Mon - DD Mon" or "DD Mon - DD Mon" with non-breaking spaces
  const normalised = raw.replace(/ /g, ' ').trim();
  const m = normalised.match(/^(\d{1,2})\s+([A-Za-z]{3})/);
  if (!m) return null;
  const day = m[1].padStart(2, '0');
  const mon = MONTH_MAP[m[2]];
  if (!mon) return null;
  return `${year}-${mon}-${day}`;
}

/**
 * Parse the GoodLift competitions listing page and return one row per unique
 * competition (identified by cid).
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
export function parseCompetitionListing(html: string): MeetListingRow[] {
  const root = parse(html);
  const year = extractYear(html);

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

    const date = dateRaw ? parseDateRange(dateRaw, year) : null;

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
