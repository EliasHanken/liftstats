// Raw CSV columns from openpowerlifting.csv. Strings only — OPL serializes everything.
// We model all columns we read; unknown columns are ignored by the parser.
export type OplRawRow = {
  Name: string;
  Sex: 'M' | 'F' | 'Mx';
  Event: string;                     // 'SBD', 'B', 'BD', etc.
  Equipment: string;                 // 'Raw', 'Wraps', 'Single-ply', 'Multi-ply', 'Unlimited', 'Straps'
  Age: string;                       // fractional, e.g. '23.5'
  AgeClass: string;
  Division: string;
  BodyweightKg: string;
  WeightClassKg: string;             // e.g. '83', '90', '105+', '120+'
  Best3SquatKg: string;
  Best3BenchKg: string;
  Best3DeadliftKg: string;
  TotalKg: string;
  Place: string;                     // '1', '2', '3', 'DQ', 'DD', 'NS', etc.
  Dots: string;
  Wilks: string;
  Goodlift: string;                  // GL points
  Tested: string;                    // 'Yes' or empty
  Country: string;                   // lifter country, ISO-3
  Federation: string;
  Date: string;                      // YYYY-MM-DD
  MeetCountry: string;
  MeetTown: string;
  MeetName: string;
};

// Normalized shape we hand to the DB layer. One per CSV row.
export type NormalizedRow = {
  lifter: {
    name: string;
    slug: string;                    // derived from name + sex
    sex: 'M' | 'F' | 'Mx';
    country: string | null;
  };
  meet: {
    sourceMeetId: string;            // sha1(fed||date||name||country||town).slice(0,16)
    federation: string;
    date: string;                    // YYYY-MM-DD
    name: string;
    country: string | null;
    town: string | null;
  };
  entry: {
    equipment: 'Raw' | 'Wraps' | 'Single' | 'Multi' | 'Unlimited';
    weightClassKg: string;           // numeric, '-1' for SHW (we keep '+' classes as positive max)
    bodyweightKg: string | null;
    age: string | null;
    ageClass: string | null;
    division: string | null;
    bestSqKg: string | null;
    bestBpKg: string | null;
    bestDlKg: string | null;
    totalKg: string | null;
    place: number | null;            // numeric only; DQ/DD/NS become null
    glPoints: string | null;
    wilks: string | null;
    dots: string | null;
  };
};

// Rows we skip with a structured reason. Useful for diagnostics.
export type SkipReason =
  | 'unsupported_equipment'          // e.g. 'Straps' on a SBD meet
  | 'missing_required_field'         // missing name, date, federation, etc.
  | 'unknown_sex';
