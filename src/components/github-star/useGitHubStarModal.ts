import { useCallback, useEffect, useState } from 'react';
import {
  GITHUB_STAR_DISMISS_KEY,
  GITHUB_STAR_SHOW_DELAY_MS,
  GITHUB_STAR_URL,
} from './constants';

export function useGitHubStarModal(enabled = true) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!enabled) return;
    if (typeof window === 'undefined') return;
    if (localStorage.getItem(GITHUB_STAR_DISMISS_KEY) === '1') return;

    const timer = window.setTimeout(() => setOpen(true), GITHUB_STAR_SHOW_DELAY_MS);
    return () => window.clearTimeout(timer);
  }, [enabled]);

  const dismiss = useCallback(() => {
    localStorage.setItem(GITHUB_STAR_DISMISS_KEY, '1');
    setOpen(false);
  }, []);

  const openStarPage = useCallback(() => {
    window.open(GITHUB_STAR_URL, '_blank', 'noopener,noreferrer');
    dismiss();
  }, [dismiss]);

  return { open, setOpen, dismiss, openStarPage };
}
