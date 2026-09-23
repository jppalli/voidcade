import type { Lang } from '../i18n';

/** A named place the road passes through or forks toward. Distances are
 * measured in the same world units as PampaTurbo's `distance` odometer. */
export interface CityMarker {
  id: string;
  distance: number;
  nameEs: string;
  nameEn: string;
  /** Flavor line shown once the player locks in this branch (fork cities only). */
  flavorEs?: string;
  flavorEn?: string;
}

/** Cities passed along the shared trunk road, signposted but not chosen. */
export const WAYPOINT_CITIES: CityMarker[] = [
  { id: 'obelisco', distance: 40, nameEs: 'OBELISCO', nameEn: 'OBELISCO' },
  { id: 'rosario', distance: 380, nameEs: 'ROSARIO', nameEn: 'ROSARIO' },
];

/** The two branches offered at the fork. Order matches the -1 (left) / 1 (right) sides. */
export const FORK_CITIES: [CityMarker, CityMarker] = [
  {
    id: 'cordoba',
    distance: 0,
    nameEs: 'CÓRDOBA',
    nameEn: 'CÓRDOBA',
    flavorEs: 'Curvas, sierras y cero señal.',
    flavorEn: 'Hairpin turns, hills, and zero signal.',
  },
  {
    id: 'mardelplata',
    distance: 0,
    nameEs: 'MAR DEL PLATA',
    nameEn: 'MAR DEL PLATA',
    flavorEs: 'Viento de frente y peinado de costado.',
    flavorEn: 'A headwind and hair blowing sideways.',
  },
];

/** The finish-line city, themed as the asado destination. */
export const FINISH_CITY: CityMarker = {
  id: 'asado',
  distance: 0,
  nameEs: 'EL ASADO',
  nameEn: 'THE ASADO',
};

export function cityName(city: CityMarker, lang: Lang): string {
  return lang === 'en' ? city.nameEn : city.nameEs;
}

export function cityFlavor(city: CityMarker, lang: Lang): string {
  const line = lang === 'en' ? city.flavorEn : city.flavorEs;
  return line ?? '';
}

/** Builds the two-line road sign copy for the fork, in the active language. */
export function forkSignLines(lang: Lang): [string, string] {
  const [left, right] = FORK_CITIES;
  const leftName = cityName(left, lang);
  const rightName = cityName(right, lang);
  return [`${leftName}  ←`, `→  ${rightName}`];
}

export function finishSignLines(lang: Lang): [string, string] {
  return [cityName(FINISH_CITY, lang), lang === 'en' ? 'FINISH' : 'META'];
}
