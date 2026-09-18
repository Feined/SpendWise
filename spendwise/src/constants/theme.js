/**
 * SpendWise Design Tokens & Theme Engine
 * 
 * Provides calibrated color palettes for:
 * - Day Mode (warm off-white, calm, fresh, trustworthy)
 * - Night Mode (graphite/slate, low glare, comfortable for nighttime)
 * - 5 Curated Accents (Emerald, Ocean, Indigo, Coral, Amber)
 */

export const THEME_MODES = {
  DAY: 'day',
  NIGHT: 'night',
  SYSTEM: 'system'
};

export const ACCENT_COLORS = {
  EMERALD: {
    id: 'emerald',
    name: 'Emerald',
    label: 'Radiant Emerald',
    primary: '#10b981',
    hover: '#059669',
    ring: 'rgba(16, 185, 129, 0.35)',
    subtle: 'rgba(16, 185, 129, 0.12)',
    badgeBg: 'rgba(16, 185, 129, 0.15)',
    badgeText: '#10b981'
  },
  OCEAN: {
    id: 'ocean',
    name: 'Ocean',
    label: 'Deep Azure',
    primary: '#0284c7',
    hover: '#0369a1',
    ring: 'rgba(2, 132, 199, 0.35)',
    subtle: 'rgba(2, 132, 199, 0.12)',
    badgeBg: 'rgba(2, 132, 199, 0.15)',
    badgeText: '#0284c7'
  },
  INDIGO: {
    id: 'indigo',
    name: 'Indigo',
    label: 'Electric Indigo',
    primary: '#6366f1',
    hover: '#4f46e5',
    ring: 'rgba(99, 102, 241, 0.35)',
    subtle: 'rgba(99, 102, 241, 0.12)',
    badgeBg: 'rgba(99, 102, 241, 0.15)',
    badgeText: '#6366f1'
  },
  CORAL: {
    id: 'coral',
    name: 'Coral',
    label: 'Vibrant Coral',
    primary: '#f43f5e',
    hover: '#e11d48',
    ring: 'rgba(244, 63, 94, 0.35)',
    subtle: 'rgba(244, 63, 94, 0.12)',
    badgeBg: 'rgba(244, 63, 94, 0.15)',
    badgeText: '#f43f5e'
  },
  AMBER: {
    id: 'amber',
    name: 'Amber',
    label: 'Warm Amber',
    primary: '#f59e0b',
    hover: '#d97706',
    ring: 'rgba(245, 158, 11, 0.35)',
    subtle: 'rgba(245, 158, 11, 0.12)',
    badgeBg: 'rgba(245, 158, 11, 0.15)',
    badgeText: '#f59e0b'
  }
};

/**
 * Returns active accent config by id, falling back to emerald.
 */
export function getAccentConfig(accentId) {
  return ACCENT_COLORS[accentId?.toUpperCase()] || ACCENT_COLORS.EMERALD;
}

/**
 * Applies theme and accent color CSS variables to document.documentElement.
 */
export function applyThemeToDocument(themeMode = THEME_MODES.SYSTEM, accentId = 'emerald') {
  if (typeof document === 'undefined') return;

  const root = document.documentElement;
  const accent = getAccentConfig(accentId);

  // Determine effective theme
  let effectiveTheme = themeMode;
  if (themeMode === THEME_MODES.SYSTEM) {
    const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    effectiveTheme = prefersDark ? THEME_MODES.NIGHT : THEME_MODES.DAY;
  }

  // Set class on root element
  if (effectiveTheme === THEME_MODES.DAY) {
    root.classList.remove('theme-night', 'dark');
    root.classList.add('theme-day');
    root.style.colorScheme = 'light';
  } else {
    root.classList.remove('theme-day');
    root.classList.add('theme-night', 'dark');
    root.style.colorScheme = 'dark';
  }

  // Inject dynamic accent CSS variables
  root.style.setProperty('--color-accent', accent.primary);
  root.style.setProperty('--color-accent-hover', accent.hover);
  root.style.setProperty('--color-accent-ring', accent.ring);
  root.style.setProperty('--color-accent-subtle', accent.subtle);
  root.style.setProperty('--color-accent-badge-bg', accent.badgeBg);
  root.style.setProperty('--color-accent-badge-text', accent.badgeText);
}
