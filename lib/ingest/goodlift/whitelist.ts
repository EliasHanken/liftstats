import type { MeetListingRow } from './types';

export const WHITELIST: { federation: RegExp; namePattern: RegExp }[] = [
  {
    federation: /International Powerlifting Federation/i,
    namePattern: /World.*Championship/i,
  },
  {
    federation: /European Powerlifting Federation/i,
    namePattern: /European.*Championship/i,
  },
  {
    federation: /(Norwegian|Norges)[\s\S]*Federation|Norges Styrkel[øo]ftforbund|Norwegian Powerlifting/i,
    namePattern: /./,
  },
];

export function isWhitelisted(meet: MeetListingRow): boolean {
  return WHITELIST.some(
    (rule) => rule.federation.test(meet.federation) && rule.namePattern.test(meet.name),
  );
}
