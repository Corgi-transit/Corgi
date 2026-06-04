export const ROUTES = {
  home: '/',
  passengerPortal: '/passenger-portal',
  driverPortal: '/driver-portal',
  adminConsole: '/admin-console',
  pitchDeck: '/pitch-deck',
} as const;

/** PDF in /public — encoded for URL safety */
export const PITCH_DECK_PDF_URL = '/My%20Pitch%20deck.pdf';

export type AppPath = (typeof ROUTES)[keyof typeof ROUTES];

export function getPathname(): string {
  const path = window.location.pathname;
  return path === '' ? ROUTES.home : path;
}

export function navigate(path: string, replace = false): void {
  const target = path === '' ? ROUTES.home : path;
  if (replace) {
    window.history.replaceState(null, '', target);
  } else {
    window.history.pushState(null, '', target);
  }
  window.dispatchEvent(new PopStateEvent('popstate'));
}

export function isPortalPath(path: string): boolean {
  return (
    path === ROUTES.passengerPortal ||
    path === ROUTES.driverPortal ||
    path === ROUTES.adminConsole
  );
}

/** Redirect old hash URLs (e.g. /#passenger-portal) to clean paths. */
export function migrateHashRoute(): void {
  const hash = window.location.hash.replace(/^#/, '').trim();
  if (!hash) return;

  const path = hash.startsWith('/') ? hash : `/${hash}`;
  const known = Object.values(ROUTES) as string[];
  if (known.includes(path)) {
    window.history.replaceState(null, '', path);
  }
}

export function appOriginPath(path: string): string {
  return `${window.location.origin}${path}`;
}
