/** Design tokens ported from the prototype's src/index.css :root variables. */
export const colors = {
  ink: '#083d40',
  deep: '#063236',
  green: '#188044',
  lime: '#69b734',
  red: '#ed1b3b',
  yellow: '#f4c52f',
  cream: '#f7f6ed',
  shell: '#e9eee8',
  white: '#ffffff',
} as const;

/** Avatar colours, assigned to players in creation order (prototype PLAYER_COLORS). */
export const PLAYER_COLORS = ['#ed1b3b', '#f1ba28', '#2e9366', '#4b87d5', '#b067ce', '#ef773f'] as const;

export const MAX_PLAYERS = 6;
export const MIN_PAR = 2;
export const MAX_PAR = 6;
export const MAX_STROKES = 12;

/** Venue brand shown above venue names ("ADVENTURE GOLF · SANDTON"). */
export const BRAND = 'Adventure Golf';

/**
 * Font family names as registered with expo-font in app/_layout.tsx.
 * Prototype mapping (Tailwind preflight resets heading weights): h1-h3 -> Fredoka 500 (`display`),
 * <strong>/<b> in Fredoka -> 700 (`displayBold`).
 */
export const fonts = {
  body: 'DMSans_400Regular',
  bodyMedium: 'DMSans_500Medium',
  bodySemi: 'DMSans_600SemiBold',
  bodyBold: 'DMSans_700Bold',
  display: 'Fredoka_500Medium',
  displayBold: 'Fredoka_700Bold',
} as const;

/** CSS letter-spacing in em -> React Native px. */
export const em = (value: number, fontSize: number) => value * fontSize;
