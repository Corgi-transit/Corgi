import React from 'react';
import { PITCH_DECK_PDF_URL } from '@/utils/routes';

export const PitchDeckViewer: React.FC = () => {
  return (
    <div className="flex min-h-0 flex-1 flex-col bg-neutral-100">
      <div className="border-b border-[var(--border)] bg-white px-6 py-3">
        <div className="mx-auto flex max-w-[1126px] flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="m-0 text-base font-bold text-[var(--text-h)]">CityBus Pitch Deck</h1>
            <p className="m-0 mt-0.5 text-xs text-[var(--text)]">
              Problem, solution, and go-to-market overview
            </p>
          </div>
          <a
            href={PITCH_DECK_PDF_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center rounded-full border border-[var(--border)] bg-white px-4 py-2 text-xs font-semibold text-[var(--text-h)] no-underline transition-colors hover:border-[#6e54ff] hover:text-[#6e54ff]"
          >
            Open PDF in new tab
          </a>
        </div>
      </div>
      <iframe
        title="CityBus pitch deck"
        src={PITCH_DECK_PDF_URL}
        className="min-h-[calc(100vh-8rem)] w-full flex-1 border-0 bg-white"
      />
    </div>
  );
};

export default PitchDeckViewer;
