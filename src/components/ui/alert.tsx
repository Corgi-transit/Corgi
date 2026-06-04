import * as React from 'react';
import { cn } from '@/lib/utils';

const variantClassNames = {
  error: 'border-red-300 bg-red-50 text-red-800',
  success: 'border-green-300 bg-green-50 text-green-800',
  warning: 'border-amber-300 bg-amber-50 text-amber-900',
  info: 'border-blue-300 bg-blue-50 text-blue-800',
} as const;

export type AlertVariant = keyof typeof variantClassNames;

export interface AlertProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: AlertVariant;
  onDismiss?: () => void;
}

export const Alert = React.forwardRef<HTMLDivElement, AlertProps>(
  ({ className, variant = 'info', children, onDismiss, ...props }, ref) => {
    return (
      <div
        ref={ref}
        role="alert"
        className={cn(
          'relative w-full rounded-lg border px-3.5 py-3 text-xs font-semibold leading-relaxed',
          'animate-in fade-in slide-in-from-top-2 duration-300',
          variantClassNames[variant],
          onDismiss && 'flex items-start justify-between gap-3',
          className
        )}
        {...props}
      >
        <div className="min-w-0 flex-1">{children}</div>
        {onDismiss && (
          <button
            type="button"
            onClick={onDismiss}
            className="shrink-0 rounded bg-transparent border-none p-0 text-inherit opacity-70 hover:opacity-100 cursor-pointer font-bold text-base leading-none"
            aria-label="Dismiss"
          >
            ×
          </button>
        )}
      </div>
    );
  }
);

Alert.displayName = 'Alert';
