/**
 * Theme constants — mirrors the Biryani Darbaar web app colour palette.
 *
 * Primary source: tailwind.config.js + global.css from the web project.
 */

export const Colors = {
  /** Brand primary — rich crimson red */
  primary: '#EA1F27',
  /** Darker red variant used in PWA manifest and native status bars */
  primaryDark: '#b30000',
  /** Warm golden yellow accent */
  accent: '#F4C145',
  /** Soft orange border / badge colour */
  orange: '#f4a261',

  /** Page / screen background */
  background: '#ffffff',
  /** Warm off-white used for section backgrounds */
  backgroundWarm: '#f7f2e7',

  /** Main body text — near-black charcoal */
  textPrimary: '#1a202c',
  /** Secondary / muted text */
  textSecondary: '#4a5568',
  /** Light dividers and borders */
  border: '#e5e7eb',

  /** Loading / error overlay tints */
  overlayLight: 'rgba(255,255,255,0.92)',
  overlayDark: 'rgba(0,0,0,0.45)',

  /** Status bar (matches splash + primary brand) */
  statusBar: '#EA1F27',
} as const;

export const FontSize = {
  xs: 12,
  sm: 14,
  base: 16,
  lg: 18,
  xl: 20,
  '2xl': 24,
  '3xl': 30,
} as const;

export const Spacing = {
  1: 4,
  2: 8,
  3: 12,
  4: 16,
  6: 24,
  8: 32,
  12: 48,
  16: 64,
} as const;

/** The live URL rendered inside the WebView */
export const WEBSITE_URL = 'https://biryanidarbaar.com/';
