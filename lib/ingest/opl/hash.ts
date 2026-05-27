import { createHash } from 'node:crypto';

export type MeetKey = {
  federation: string;
  date: string;
  name: string;
  country: string | null;
  town: string | null;
};

export function meetSourceId(k: MeetKey): string {
  const parts = [k.federation, k.date, k.name, k.country ?? '', k.town ?? ''];
  return createHash('sha1').update(parts.join('||')).digest('hex').slice(0, 16);
}
