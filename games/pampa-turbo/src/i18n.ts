export type Lang = 'es' | 'en';

export interface Dictionary {
  metaDescription: string;
  title: string;
  eyebrow: string;
  logoLine1: string;
  logoLine2: string;
  tagline: string;
  pilotName: string;
  pilotSub: string;
  pilotQuote: string;
  startButton: string;
  controlsCopy: string;
  hudSpeed: string;
  hudTimer: string;
  hudScore: string;
  hudMate: string;
  pauseEyebrow: string;
  pauseTitle: string;
  resumeButton: string;
  resultEyebrowDefault: string;
  resultFailEyebrow: string;
  resultSuccessTitle: string;
  resultFailTitle: string;
  resultCopySuccess: (secondsLeft: string) => string;
  resultCopyFail: string;
  resultScoreLabel: string;
  resultBestLabel: string;
  retryButton: string;
  backToVoidcade: string;
  soundOn: string;
  soundOff: string;
  langButtonLabel: string;
  startMessage: string;
  forkWarning: (cityA: string, cityB: string) => string;
  forkChosen: (cityName: string, flavorText: string) => string;
  finishStretch: string;
  collisionMessages: string[];
  overtakeMessage: string;
  pickupMessage: string;
  routeName: (cityName: string) => string;
  routePending: string;
  ariaSteerLeft: string;
  ariaSteerRight: string;
  ariaMateBoost: string;
  ariaAccelerate: string;
  ariaPause: string;
  ariaHud: string;
  ariaTouchControls: string;
}

const es: Dictionary = {
  metaDescription: 'Pampa Turbo: una carrera arcade argentina original, rápida y absurda.',
  title: 'Pampa Turbo — Arcade rutero',
  eyebrow: 'Un arcade rutero original',
  logoLine1: 'PAMPA',
  logoLine2: 'TURBO',
  tagline: 'Franquito “El Misil” recorre Argentina de punta a punta y te lleva de acompañante.',
  pilotName: 'FRANQUITO “EL MISIL”',
  pilotSub: 'Auto 79 · Club Atlético Apuro',
  pilotQuote: '“Si entra el termo, entra el auto.”',
  startButton: 'ARRANCAR',
  controlsCopy: '<b>← → / A D</b> para doblar · <b>↑ / W</b> para acelerar<br /><b>Espacio</b> para tomar mate turbo',
  hudSpeed: 'VELOCIDAD',
  hudTimer: 'LLEGADA EN',
  hudScore: 'PUNTOS',
  hudMate: 'MATE TURBO',
  pauseEyebrow: 'Parada técnica',
  pauseTitle: 'PAUSA',
  resumeButton: 'SEGUIR',
  resultEyebrowDefault: 'Fin de la ruta',
  resultFailEyebrow: 'La provoleta no perdona',
  resultSuccessTitle: '¡LLEGASTE!',
  resultFailTitle: '¡SE ENFRIÓ!',
  resultCopySuccess: (secondsLeft) =>
    `Franquito llegó con ${secondsLeft} segundos de sobra. El aplauso fue casi tan fuerte como el escape.`,
  resultCopyFail: 'El asado sigue ahí, pero tu dignidad quedó unos kilómetros atrás. Otra vuelta lo arregla.',
  resultScoreLabel: 'Puntos',
  resultBestLabel: 'Mejor',
  retryButton: 'OTRA VUELTA',
  backToVoidcade: 'Volver a Voidcade',
  soundOn: 'Silenciar sonido',
  soundOff: 'Activar sonido',
  langButtonLabel: 'English',
  startMessage: '¡El asado no espera! Pisalo, Franquito.',
  forkWarning: (cityA, cityB) => `Bifurcación: izquierda a ${cityA}, derecha a ${cityB}.`,
  forkChosen: (cityName, flavorText) => `¡Rumbo a ${cityName}! ${flavorText}`,
  finishStretch: '¡Ya se huele la provoleta! Último esfuerzo.',
  collisionMessages: [
    '¡Ese tractor pidió DRS tarde!',
    'Toquecito técnico. La pintura era opcional.',
    '¡El acompañante grita más que vos!',
  ],
  overtakeMessage: '¡Finito como cortar salame! +420',
  pickupMessage: '¡Mate recargado! Ahora sí, papá. +300',
  routeName: (cityName) => `rumbo a ${cityName}`,
  routePending: 'por decidir',
  ariaSteerLeft: 'Doblar a la izquierda',
  ariaSteerRight: 'Doblar a la derecha',
  ariaMateBoost: 'Mate turbo',
  ariaAccelerate: 'Acelerar',
  ariaPause: 'Pausar',
  ariaHud: 'Estado de carrera',
  ariaTouchControls: 'Controles táctiles',
};

const en: Dictionary = {
  metaDescription: 'Pampa Turbo: an original, fast and absurd Argentine arcade racer.',
  title: 'Pampa Turbo — Road Arcade',
  eyebrow: 'An original road arcade',
  logoLine1: 'PAMPA',
  logoLine2: 'TURBO',
  tagline: 'Franquito “The Missile” is racing across Argentina, and you\'re riding shotgun.',
  pilotName: 'FRANQUITO “THE MISSILE”',
  pilotSub: 'Car 79 · Atlético Apuro Club',
  pilotQuote: '“If the thermos fits, the car fits.”',
  startButton: 'START',
  controlsCopy: '<b>← → / A D</b> to steer · <b>↑ / W</b> to accelerate<br /><b>Space</b> for mate turbo boost',
  hudSpeed: 'SPEED',
  hudTimer: 'ARRIVAL IN',
  hudScore: 'SCORE',
  hudMate: 'MATE TURBO',
  pauseEyebrow: 'Pit stop',
  pauseTitle: 'PAUSED',
  resumeButton: 'RESUME',
  resultEyebrowDefault: 'End of the road',
  resultFailEyebrow: 'The provoleta shows no mercy',
  resultSuccessTitle: 'YOU MADE IT!',
  resultFailTitle: 'IT WENT COLD!',
  resultCopySuccess: (secondsLeft) =>
    `Franquito rolled in with ${secondsLeft} seconds to spare. The cheering was almost as loud as the exhaust.`,
  resultCopyFail: 'The asado is still out there, but your dignity is a few kilometers back. Another lap fixes that.',
  resultScoreLabel: 'Score',
  resultBestLabel: 'Best',
  retryButton: 'ANOTHER LAP',
  backToVoidcade: 'Back to Voidcade',
  soundOn: 'Mute sound',
  soundOff: 'Unmute sound',
  langButtonLabel: 'Español',
  startMessage: 'The asado won\'t wait! Floor it, Franquito!',
  forkWarning: (cityA, cityB) => `Fork ahead: left to ${cityA}, right to ${cityB}.`,
  forkChosen: (cityName, flavorText) => `Heading to ${cityName}! ${flavorText}`,
  finishStretch: 'You can almost smell the provoleta! Last push!',
  collisionMessages: [
    'That tractor asked for DRS way too late!',
    'Just a little bump. The paint job was optional anyway.',
    'Your co-pilot screams louder than you do!',
  ],
  overtakeMessage: 'Sliced through like salami! +420',
  pickupMessage: 'Mate refilled! Now we\'re talking. +300',
  routeName: (cityName) => `on the way to ${cityName}`,
  routePending: 'undecided',
  ariaSteerLeft: 'Steer left',
  ariaSteerRight: 'Steer right',
  ariaMateBoost: 'Mate turbo boost',
  ariaAccelerate: 'Accelerate',
  ariaPause: 'Pause',
  ariaHud: 'Race status',
  ariaTouchControls: 'Touch controls',
};

const DICTIONARIES: Record<Lang, Dictionary> = { es, en };
const STORAGE_KEY = 'pampa-turbo-lang';

export function loadLang(): Lang {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored === 'es' || stored === 'en') return stored;
  return navigator.language.toLowerCase().startsWith('en') ? 'en' : 'es';
}

export function saveLang(lang: Lang): void {
  localStorage.setItem(STORAGE_KEY, lang);
}

export function dictionaryFor(lang: Lang): Dictionary {
  return DICTIONARIES[lang];
}

export function localeFor(lang: Lang): string {
  return lang === 'en' ? 'en-US' : 'es-AR';
}
