// One row from competitions.php?year=YYYY
export type MeetListingRow = {
  cid: number;
  name: string;
  federation: string;
  date: string | null;
  country: string | null;
  town: string | null;
};

// One parsed lifter row from onecompetition_dtl.php?cid=N
export type LifterDetailRow = {
  position: number | null;
  name: string;
  countryIso3: string | null;
  bodyweightKg: number | null;
  weightClassKg: string;
  equipment: 'Raw' | 'Single' | null;
  attempts: ParsedAttempt[];
  bestSqKg: number | null;
  bestBpKg: number | null;
  bestDlKg: number | null;
  totalKg: number | null;
  place: number | null;
};

export type ParsedAttempt = {
  lift: 'SQ' | 'BP' | 'DL';
  attemptNo: 1 | 2 | 3;
  weightKg: number;
  result: 'good' | 'no_lift';
};

export type MatchFailureReason =
  | 'no_meet_match'
  | 'no_entry_match'
  | 'ambiguous_entry_match';
