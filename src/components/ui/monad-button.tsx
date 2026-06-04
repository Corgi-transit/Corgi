import React from 'react';
import { Globe } from 'lucide-react';

// Simple cn fallback if shadcn isn't fully installed yet
const classNames = (...classes: (string | undefined | null | false)[]) => {
  return classes.filter(Boolean).join(' ');
};

interface MonadButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children?: React.ReactNode;
}

export const MonadButton = React.forwardRef<HTMLButtonElement, MonadButtonProps>(
  ({ className, children = "EXPLORE THE ECOSYSTEM", ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={classNames(
          "relative inline-flex items-center justify-center gap-2 px-8 py-3 rounded-full",
          "bg-[#6e54ff] hover:bg-[#5b40e8] text-white transition-colors",
          "border border-[#5536e0] shadow-[0_2px_10px_rgba(110,84,255,0.3)]",
          className
        )}
        style={{
          fontFamily: "'Inter', sans-serif",
          letterSpacing: "0.05em",
        }}
        {...props}
      >
        <Globe className="w-5 h-5" strokeWidth={1.5} />
        <span
          className="font-medium text-sm tracking-widest"
          style={{
            // Chromatic aberration (glitch) effect on text as seen in the Monad button
            textShadow: "-1.5px 0px 0px rgba(0,255,255,0.7), 1.5px 0px 0px rgba(255,0,255,0.7)"
          }}
        >
          {children}
        </span>
      </button>
    );
  }
);

MonadButton.displayName = "MonadButton";
