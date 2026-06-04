import React from 'react';
import { FlickeringGrid } from '@/components/ui/flickering-grid';
import { Button } from '@/components/ui/button';
import { Alert, type AlertVariant } from '@/components/ui/alert';
import { ROUTES, navigate } from '@/utils/routes';

interface AuthScreenLayoutProps {
  children: React.ReactNode;
  banner?: {
    variant: AlertVariant;
    message: string;
  } | null;
}

export const AuthScreenLayout: React.FC<AuthScreenLayoutProps> = ({ children, banner }) => {
  const goToPortal = () => {
    navigate(ROUTES.home);
  };

  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-[var(--bg)] flex flex-col items-center justify-center p-6 box-border">
      <FlickeringGrid
        className="absolute inset-0 z-0 size-full"
        squareSize={4}
        gridGap={6}
        color="#6B7280"
        maxOpacity={0.5}
        flickerChance={0.1}
      />
      <div className="relative z-10 w-full max-w-[520px] flex flex-col items-stretch gap-4">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={goToPortal}
          className="bg-white/90 backdrop-blur-sm self-start"
        >
          ← Back to Portal
        </Button>

        {banner?.message && (
          <Alert key={banner.message} variant={banner.variant}>
            {banner.message}
          </Alert>
        )}

        <div className="w-full flex justify-center">{children}</div>
      </div>
    </div>
  );
};

export default AuthScreenLayout;
