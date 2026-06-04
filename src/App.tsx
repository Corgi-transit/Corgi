import React, { useState, useEffect } from 'react';
import Header from './Header';
import AdminAuth from './components/admin/AdminAuth';
import AdminConsole from './components/admin/AdminConsole';
import { DriverPortal } from './components/driver/DriverPortal';
import { PassengerPortal } from './components/passenger/PassengerPortal';
import { supabase } from './utils/supabase';
import {
  ROUTES,
  getPathname,
  navigate,
  isPortalPath,
  migrateHashRoute,
} from './utils/routes';

import { HeroSection } from './components/marketing/HeroSection';
import { PitchDeckViewer } from './components/marketing/PitchDeckViewer';
import { GitHubStarPrompt } from './components/github-star';

migrateHashRoute();

export const App: React.FC = () => {
  const [user, setUser] = useState<any>(null);
  const [currentPath, setCurrentPath] = useState(getPathname);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT') {
        setUser(null);
        navigate(ROUTES.home, true);
        setCurrentPath(ROUTES.home);
        return;
      }
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) return;

    const path = getPathname();
    if (path === ROUTES.adminConsole) return;

    supabase
      .from('user_roles')
      .select('role')
      .eq('id', user.id)
      .maybeSingle()
      .then(({ data, error }) => {
        if (!error && data) {
          if (data.role === 'admin') {
            navigate(ROUTES.adminConsole, true);
            setCurrentPath(ROUTES.adminConsole);
          } else if (data.role === 'driver' && path !== ROUTES.driverPortal) {
            supabase
              .from('drivers')
              .select('id')
              .eq('id', user.id)
              .maybeSingle()
              .then(({ data: driverData }) => {
                if (driverData) {
                  navigate(ROUTES.driverPortal, true);
                  setCurrentPath(ROUTES.driverPortal);
                } else if (path === ROUTES.passengerPortal) {
                  // onboarding as passenger
                } else {
                  navigate(ROUTES.driverPortal, true);
                  setCurrentPath(ROUTES.driverPortal);
                }
              });
          } else if (data.role === 'passenger' && path !== ROUTES.passengerPortal) {
            navigate(ROUTES.passengerPortal, true);
            setCurrentPath(ROUTES.passengerPortal);
          }
        }
      });
  }, [user, currentPath]);

  useEffect(() => {
    const pendingRole = localStorage.getItem('oauth_role');
    if (pendingRole === 'driver') {
      localStorage.removeItem('oauth_role');
      navigate(ROUTES.driverPortal, true);
      setCurrentPath(ROUTES.driverPortal);
    } else if (pendingRole === 'passenger') {
      localStorage.removeItem('oauth_role');
      navigate(ROUTES.passengerPortal, true);
      setCurrentPath(ROUTES.passengerPortal);
    }

    const handlePopState = () => {
      setCurrentPath(getPathname());
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
  };

  const onPortal = isPortalPath(currentPath);

  const showHomeMarketing = !onPortal && currentPath === ROUTES.home;

  return (
    <div className="flex flex-col min-h-screen bg-[var(--bg)] font-sans relative">
      {!onPortal && <Header />}
      {showHomeMarketing && <GitHubStarPrompt />}

      <main
        className={`w-full box-border flex flex-col relative ${
          onPortal ? 'flex-grow min-h-0' : 'flex-grow'
        }`}
      >
        {currentPath === ROUTES.adminConsole ? (
          user ? (
            <AdminConsole adminUser={user} onSignOut={handleSignOut} />
          ) : (
            <AdminAuth onAuthSuccess={(authenticatedUser) => setUser(authenticatedUser)} />
          )
        ) : currentPath === ROUTES.driverPortal ? (
          <DriverPortal />
        ) : currentPath === ROUTES.passengerPortal ? (
          <PassengerPortal />
        ) : currentPath === ROUTES.pitchDeck ? (
          <PitchDeckViewer />
        ) : (
          <HeroSection />
        )}
      </main>
    </div>
  );
};

export default App;
