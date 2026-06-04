const DEFAULT_EMAIL_DOMAIN = 'gmail.com';

/**
 * Normalizes sign-in email input. If the user omits @domain (e.g. "josehsunday9619"),
 * appends @gmail.com — similar to Google's username-only sign-in.
 */
export function normalizeEmailInput(raw: string): string {
  const trimmed = raw.trim().toLowerCase();
  if (!trimmed) return trimmed;
  if (trimmed.includes('@')) return trimmed;
  return `${trimmed}@${DEFAULT_EMAIL_DOMAIN}`;
}
