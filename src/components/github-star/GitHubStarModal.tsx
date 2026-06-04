import React, { useEffect } from 'react';
import { Bus, MapPin, Star, Users } from 'lucide-react';

const GitHubIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
    <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A8.205 8.205 0 0 0 24 12c0-6.63-5.37-12-12-12z" />
  </svg>
);

export interface GitHubStarModalProps {
  open: boolean;
  onDismiss: () => void;
  onStar: () => void;
}

const orbitIcons = [
  { Icon: MapPin, className: 'top-[18%] left-1/2 -translate-x-1/2' },
  { Icon: Bus, className: 'top-1/2 right-[14%] -translate-y-1/2' },
  { Icon: Users, className: 'bottom-[18%] left-1/2 -translate-x-1/2' },
  { Icon: Star, className: 'top-1/2 left-[14%] -translate-y-1/2' },
];

export const GitHubStarModal: React.FC<GitHubStarModalProps> = ({
  open,
  onDismiss,
  onStar,
}) => {
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onDismiss();
    };
    document.addEventListener('keydown', onKeyDown);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = prevOverflow;
    };
  }, [open, onDismiss]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black/40 p-4 animate-in fade-in duration-200"
      role="presentation"
      onClick={onDismiss}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="github-star-title"
        aria-describedby="github-star-desc"
        className="w-full max-w-[400px] overflow-hidden rounded-2xl bg-white shadow-[0_24px_80px_-16px_rgba(0,0,0,0.35)] animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Illustration */}
        <div className="relative mx-4 mt-4 overflow-hidden rounded-xl bg-gradient-to-br from-violet-100 via-sky-50 to-amber-50 px-6 pb-8 pt-10">
          <div
            className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_120%,rgba(110,84,255,0.12),transparent_55%)]"
            aria-hidden
          />
          <div className="relative mx-auto flex h-28 w-28 items-center justify-center">
            <div
              className="absolute inset-2 rounded-full border border-dashed border-neutral-300/90"
              aria-hidden
            />
            {orbitIcons.map(({ Icon, className }, i) => (
              <span
                key={i}
                className={`absolute flex h-8 w-8 items-center justify-center rounded-full border border-neutral-200/80 bg-white/90 text-neutral-700 shadow-sm ${className}`}
                aria-hidden
              >
                <Icon className="h-3.5 w-3.5" strokeWidth={2} />
              </span>
            ))}
            <span className="relative flex h-14 w-14 items-center justify-center rounded-2xl border border-neutral-200/80 bg-white text-[var(--text-h)] shadow-md">
              <GitHubIcon className="h-7 w-7" />
            </span>
          </div>
        </div>

        {/* Step dot (decorative) */}
        <div className="mt-4 flex items-center justify-center" aria-hidden>
          <span className="h-1.5 w-6 rounded-full bg-[#6e54ff]" />
        </div>

        {/* Copy */}
        <div className="px-6 pb-2 pt-5 text-center">
          <h2
            id="github-star-title"
            className="m-0 text-lg font-bold tracking-tight text-[var(--text-h)]"
          >
            Enjoying CityBus?
          </h2>
          <p
            id="github-star-desc"
            className="m-0 mt-2.5 text-sm leading-relaxed text-[var(--text)]"
          >
            A star on GitHub helps others discover the project and keeps development going.
            It only takes a second — thank you for the support.
          </p>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between gap-3 px-6 pb-6 pt-4">
          <button
            type="button"
            onClick={onDismiss}
            className="cursor-pointer border-none bg-transparent px-1 py-2 text-sm font-semibold text-[var(--text-h)] hover:text-[#6e54ff] transition-colors"
          >
            Not now
          </button>
          <button
            type="button"
            onClick={onStar}
            className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-[var(--border)] bg-white px-5 py-2.5 text-sm font-bold text-[var(--text-h)] shadow-sm transition-all hover:border-[#6e54ff] hover:bg-[#6e54ff] hover:text-white"
          >
            <Star className="h-4 w-4" aria-hidden />
            Star on GitHub
          </button>
        </div>
      </div>
    </div>
  );
};
