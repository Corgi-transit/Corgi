import React from 'react';
import { GitHubStarModal } from './GitHubStarModal';
import { useGitHubStarModal } from './useGitHubStarModal';

/** Mount on marketing/home routes to show the star prompt once per browser. */
export const GitHubStarPrompt: React.FC<{ enabled?: boolean }> = ({ enabled = true }) => {
  const { open, dismiss, openStarPage } = useGitHubStarModal(enabled);

  return <GitHubStarModal open={open} onDismiss={dismiss} onStar={openStarPage} />;
};
