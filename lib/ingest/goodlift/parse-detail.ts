import { parse, HTMLElement } from 'node-html-parser';
import type { LifterDetailRow, ParsedAttempt } from './types';

export type ParseDetailOpts = { equipmentHint: 'Raw' | 'Single' };

// The detail page renders one giant table. Each weight class header row
// (<tr><td colspan='X' class='wclass_header'>-66kg</td></tr>) precedes the
// lifter rows for that class. Each lifter row is a single <tr> with 20 cells:
//   # | name | Born/BW | Team | SQ1 | SQ2 | SQ3 | bestSQ | SQpl |
//   BP1..3 | bestBP | BPpl | DL1..3 | bestDL | DLpl | Total
//
// Attempt cells have class 'goodlift' (made) or 'nolift' (missed).
// The first .place cell (after the SQ triplet) holds the competition standing
// after squats, which GoodLift uses as the overall place column.
export function parseCompetitionDetail(html: string, opts: ParseDetailOpts): LifterDetailRow[] {
  const root = parse(html);
  const rows: LifterDetailRow[] = [];
  let currentClass = '';

  const trs = root.querySelectorAll('tr');
  for (const tr of trs) {
    const classHeader = tr.querySelector('.wclass_header');
    if (classHeader) {
      const txt = classHeader.text.trim().replace(/\s/g, '');
      // Normalise: strip trailing "kg" but keep the leading +/- sign
      currentClass = txt.replace(/kg$/i, '');
      continue;
    }

    const totalCell = tr.querySelector('.lifter_total');
    if (!totalCell) continue;

    const lifter = parseLifterRow(tr, currentClass, opts.equipmentHint);
    if (lifter) rows.push(lifter);
  }
  return rows;
}

function parseLifterRow(
  tr: HTMLElement,
  weightClassKg: string,
  equipment: 'Raw' | 'Single',
): LifterDetailRow | null {
  const nameAnchor = tr.querySelector('.lifter_name a');
  // Replace non-breaking spaces and normalise whitespace
  const name = (nameAnchor?.text ?? '').replace(/ /g, ' ').replace(/\s+/g, ' ').trim();
  if (name.length === 0) return null;

  const positionText = tr.querySelector('.lifter_number')?.text.trim() ?? '';
  const position = /^\d+/.test(positionText) ? parseInt(positionText, 10) : null;

  // Country: the <img title='Spain'> inside .lifter_country
  const flag = tr.querySelector('.lifter_country img');
  const countryTitle = flag?.getAttribute('title') ?? '';
  const countryIso3 = countryFromTitle(countryTitle.trim());

  // Bodyweight: lifter-info text is "YYYY/BW/rank"
  const infoText = tr.querySelector('.lifter-info')?.text ?? '';
  const bwMatch = infoText.match(/\/(\d+(?:\.\d+)?)\//);
  const bodyweightKg = bwMatch ? parseFloat(bwMatch[1]) : null;

  const allTds = tr.querySelectorAll('td');

  // Attempt cells: class list contains 'result' AND ('goodlift' or 'nolift')
  const attemptCells = allTds.filter((td) => {
    const cls = td.getAttribute('class') ?? '';
    return /\bresult\b/.test(cls) && /\b(goodlift|nolift)\b/.test(cls);
  });
  if (attemptCells.length < 9) return null;

  const liftOrder: ('SQ' | 'BP' | 'DL')[] = ['SQ', 'SQ', 'SQ', 'BP', 'BP', 'BP', 'DL', 'DL', 'DL'];
  const attempts: ParsedAttempt[] = [];
  for (let i = 0; i < 9; i++) {
    const td = attemptCells[i];
    const cls = td.getAttribute('class') ?? '';
    const text = td.text.trim().replace(/[^\d.]/g, '');
    const weight = text === '' ? NaN : parseFloat(text);
    if (!Number.isFinite(weight)) {
      attempts.push({
        lift: liftOrder[i],
        attemptNo: ((i % 3) + 1) as 1 | 2 | 3,
        weightKg: 0,
        result: 'no_lift',
      });
      continue;
    }
    attempts.push({
      lift: liftOrder[i],
      attemptNo: ((i % 3) + 1) as 1 | 2 | 3,
      weightKg: weight,
      result: /\bnolift\b/.test(cls) ? 'no_lift' : 'good',
    });
  }

  // Best cells: class 'result' WITHOUT 'goodlift'/'nolift'
  const bestCells = allTds.filter((td) => {
    const cls = td.getAttribute('class') ?? '';
    return /\bresult\b/.test(cls) && !/\b(goodlift|nolift)\b/.test(cls);
  });
  const bestSqKg = bestCells[0] ? numOrNull(bestCells[0].text) : null;
  const bestBpKg = bestCells[1] ? numOrNull(bestCells[1].text) : null;
  const bestDlKg = bestCells[2] ? numOrNull(bestCells[2].text) : null;

  const totalText = tr.querySelector('.lifter_total')?.text ?? '';
  const totalKg = numOrNull(totalText);

  // Place: GoodLift shows per-lift place columns. The FIRST .place cell
  // (after squats) holds the competition standing after the squat round,
  // which corresponds to the overall competition rank in this layout.
  const placeNodes = tr.querySelectorAll('.place p');
  const firstPlaceText = placeNodes[0]?.text?.trim() ?? '';
  const place = /^\d+$/.test(firstPlaceText) ? parseInt(firstPlaceText, 10) : null;

  return {
    position,
    name,
    countryIso3,
    bodyweightKg,
    weightClassKg,
    equipment,
    attempts,
    bestSqKg,
    bestBpKg,
    bestDlKg,
    totalKg,
    place,
  };
}

function numOrNull(s: string | undefined): number | null {
  if (!s) return null;
  const cleaned = s.replace(/[^\d.]/g, '');
  if (cleaned === '') return null;
  const n = parseFloat(cleaned);
  return Number.isFinite(n) ? n : null;
}

const COUNTRY_TITLE_TO_ISO3: Record<string, string> = {
  'Norway': 'NOR',
  'U.S.America': 'USA',
  'USA': 'USA',
  'Spain': 'ESP',
  'France': 'FRA',
  'Canada': 'CAN',
  'Japan': 'JPN',
  'Singapore': 'SGP',
  'Chinese Taipei': 'TPE',
  'New Zealand': 'NZL',
  'Thailand': 'THA',
  'China': 'CHN',
  'US Virgin Islands': 'ISV',
  'United Kingdom': 'GBR',
  'Great Britain': 'GBR',
  'Germany': 'DEU',
  'Italy': 'ITA',
  'Sweden': 'SWE',
  'Denmark': 'DNK',
  'Finland': 'FIN',
  'Netherlands': 'NLD',
  'Iceland': 'ISL',
  'Poland': 'POL',
  'Russia': 'RUS',
  'Ukraine': 'UKR',
  'Switzerland': 'CHE',
  'Austria': 'AUT',
  'Belgium': 'BEL',
  'Australia': 'AUS',
  'South Africa': 'ZAF',
  'Brazil': 'BRA',
  'Argentina': 'ARG',
  'Mexico': 'MEX',
  'Israel': 'ISR',
  'Colombia': 'COL',
  'Venezuela': 'VEN',
  'Philippines': 'PHI',
  'Indonesia': 'INA',
  'Malaysia': 'MAS',
  'Czech Republic': 'CZE',
  'Slovakia': 'SVK',
  'Hungary': 'HUN',
  'Romania': 'ROU',
  'Bulgaria': 'BUL',
  'Serbia': 'SRB',
  'Croatia': 'CRO',
  'Latvia': 'LAT',
  'Lithuania': 'LTU',
  'Estonia': 'EST',
  'Georgia': 'GEO',
  'Armenia': 'ARM',
  'Kazakhstan': 'KAZ',
  'Uzbekistan': 'UZB',
  'Mongolia': 'MGL',
  'India': 'IND',
  'Iran': 'IRI',
  'Turkey': 'TUR',
  'Egypt': 'EGY',
  'Nigeria': 'NGR',
  'Kenya': 'KEN',
};

function countryFromTitle(title: string): string | null {
  if (!title) return null;
  if (COUNTRY_TITLE_TO_ISO3[title]) return COUNTRY_TITLE_TO_ISO3[title];
  return null;
}
