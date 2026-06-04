import React from 'react';
import { Button } from './components/ui/button';
import { ROUTES, navigate } from './utils/routes';

const portalLinkStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'start',
  gap: '12px',
  padding: '12px',
  borderRadius: '8px',
  textDecoration: 'none',
  border: '1px solid transparent',
  transition: 'background 0.2s, border-color 0.2s',
};

const portalLinkHover = {
  enter: (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.currentTarget.style.background = 'var(--accent-bg)';
    e.currentTarget.style.borderColor = 'var(--accent-border)';
  },
  leave: (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.currentTarget.style.background = 'transparent';
    e.currentTarget.style.borderColor = 'transparent';
  },
};

const GITHUB_REPO_URL = 'https://github.com/Corgi-transit/Corgi';

export const Header: React.FC = () => {
  const [isOpen, setIsOpen] = React.useState(false);
  const headerRef = React.useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (isOpen && headerRef.current && !headerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  React.useEffect(() => {
    if (document.querySelector('script[data-github-buttons]')) return;

    const script = document.createElement('script');
    script.src = 'https://buttons.github.io/buttons.js';
    script.async = true;
    script.defer = true;
    script.setAttribute('data-github-buttons', 'true');
    document.body.appendChild(script);

    return () => {
      script.remove();
    };
  }, []);

  return (
    <div ref={headerRef} style={{ position: 'relative', zIndex: 100 }}>
    <header className="custom-header">
      <div className="custom-header-inner max-w-[1126px] mx-auto px-6 py-2.5 flex justify-between items-center box-border w-full">
        {/* Left Section: Logo & Nav items grouped close together */}
        <div className="flex items-center gap-10">
          {/* Logo */}
          <div 
            onClick={() => {
              navigate(ROUTES.home);
              setIsOpen(false);
            }}
            className="custom-logo flex items-center gap-2 font-extrabold text-[17px] text-[var(--text-h)] cursor-pointer select-none"
          >
            <span>CityBus</span>
          </div>

          {/* Navigation Menu (Dropdown Trigger) */}
          <nav className="custom-nav flex items-center">
            <div className="custom-dropdown-trigger py-1">
              <button 
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsOpen(prev => !prev);
                }}
                className="custom-dropdown-btn bg-transparent border-none p-0 text-[var(--text)] hover:text-[var(--text-h)] font-medium text-sm cursor-pointer flex items-center gap-1.5 transition-colors duration-200"
              >
                Portals
                <svg 
                  className={`custom-chevron w-3 h-3 stroke-[2.5px] transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} 
                  viewBox="0 0 24 24" 
                  fill="none" 
                  stroke="currentColor"
                >
                  <polyline points="6 9 12 15 18 9"></polyline>
                </svg>
              </button>
            </div>
          </nav>
        </div>

        {/* Right Section: GitHub + Passenger Portal */}
        <div className="flex items-center gap-3">
          <a
            className="github-button"
            href={GITHUB_REPO_URL}
            data-color-scheme="no-preference: light; dark_mode: dark;"
            data-icon="octicon-star"
            data-size="small"
            data-show-count="true"
            aria-label="Star Corgi-transit/Corgi on GitHub"
          >
            Star
          </a>
          <Button
            variant="default"
            size="sm"
            onClick={() => {
              navigate(ROUTES.passengerPortal);
              setIsOpen(false);
            }}
          >
            Passenger Portal
          </Button>
        </div>
      </div>

      {/* Full-width Mega Dropdown Menu Box */}
      {isOpen && (
        <div 
          className="custom-dropdown-menu absolute top-full left-0 w-full bg-[var(--bg)] border-b border-[var(--border)] overflow-hidden transition-all duration-200 z-50"
          style={{
            transformOrigin: 'top center',
            marginTop: '-1px', // 1px overlap to bridge the border line hover gap
          }}
        >
        <div 
          className="max-w-[1126px] mx-auto px-6 py-6 md:py-8 flex flex-col md:flex-row box-border w-full"
          style={{ gap: '1.5rem' }}
        >
          {/* Left panel: Info & Call to Action */}
          <div className="w-full md:w-[35%] bg-[var(--accent-bg)] p-6 md:p-8 flex flex-col justify-between rounded-lg border border-[var(--border)]">
            <div>
              <h4 style={{ margin: '0 0 0.5rem', fontSize: '15px', fontWeight: 700, color: 'var(--text-h)' }}>
                Access CityBus
              </h4>
              <p style={{ margin: 0, fontSize: '12px', lineHeight: 1.6, color: 'var(--text)' }}>
                Seamlessly connect passengers, drivers, and dispatchers in real-time.
              </p>
            </div>
            <a 
              href={ROUTES.home}
              onClick={(e) => { e.preventDefault(); navigate(ROUTES.home); setIsOpen(false); }}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'rgba(110,84,255,0.08)',
                color: '#6e54ff',
                padding: '8px 16px',
                borderRadius: '9999px',
                fontSize: '11px',
                fontWeight: 600,
                textDecoration: 'none',
                alignSelf: 'flex-start',
                marginTop: '1.5rem',
                transition: 'background 0.2s',
              }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(110,84,255,0.15)'}
              onMouseLeave={e => e.currentTarget.style.background = 'rgba(110,84,255,0.08)'}
            >
              See Overview
            </a>
          </div>

          {/* Right panel: Portal categories list */}
          <div className="w-full md:w-[65%] px-0 md:px-4 py-1.5 flex flex-col gap-4">
            <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text)' }}>
              Portals
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Pitch deck */}
              <a
                href={ROUTES.pitchDeck}
                onClick={(e) => {
                  e.preventDefault();
                  navigate(ROUTES.pitchDeck);
                  setIsOpen(false);
                }}
                style={portalLinkStyle}
                onMouseEnter={portalLinkHover.enter}
                onMouseLeave={portalLinkHover.leave}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '36px', height: '36px', borderRadius: '6px', background: 'rgba(99,102,241,0.1)', color: '#6366f1', flexShrink: 0 }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                    <polyline points="14 2 14 8 20 8" />
                    <line x1="16" y1="13" x2="8" y2="13" />
                    <line x1="16" y1="17" x2="8" y2="17" />
                    <polyline points="10 9 9 9 8 9" />
                  </svg>
                </div>
                <div style={{ textAlign: 'left' }}>
                  <div style={{ fontSize: '13.5px', fontWeight: 600, color: 'var(--text-h)', lineHeight: '1.2' }}>Pitch Deck</div>
                  <div style={{ fontSize: '11px', color: 'var(--text)', marginTop: '4px', lineHeight: '1.4' }}>View the CityBus pitch — problem, solution, and go-to-market.</div>
                </div>
              </a>

              {/* Passenger Portal */}
              <a
                href={ROUTES.passengerPortal}
                onClick={() => setIsOpen(false)}
                style={portalLinkStyle}
                onMouseEnter={portalLinkHover.enter}
                onMouseLeave={portalLinkHover.leave}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '36px', height: '36px', borderRadius: '6px', background: 'rgba(110,84,255,0.1)', color: '#6e54ff', flexShrink: 0 }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
                    <circle cx="12" cy="7" r="4" />
                  </svg>
                </div>
                <div style={{ textAlign: 'left' }}>
                  <div style={{ fontSize: '13.5px', fontWeight: 600, color: 'var(--text-h)', lineHeight: '1.2' }}>Passenger Portal</div>
                  <div style={{ fontSize: '11px', color: 'var(--text)', marginTop: '4px', lineHeight: '1.4' }}>Track active routes, view bus locations, and purchase transit tickets.</div>
                </div>
              </a>

              {/* Driver Portal */}
              <a
                href={ROUTES.driverPortal}
                onClick={() => setIsOpen(false)}
                style={portalLinkStyle}
                onMouseEnter={portalLinkHover.enter}
                onMouseLeave={portalLinkHover.leave}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '36px', height: '36px', borderRadius: '6px', background: 'rgba(16,185,129,0.1)', color: '#10b981', flexShrink: 0 }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <circle cx="12" cy="12" r="10" />
                    <line x1="12" y1="2" x2="12" y2="22" />
                    <line x1="2" y1="12" x2="22" y2="12" />
                  </svg>
                </div>
                <div style={{ textAlign: 'left' }}>
                  <div style={{ fontSize: '13.5px', fontWeight: 600, color: 'var(--text-h)', lineHeight: '1.2' }}>Driver Portal</div>
                  <div style={{ fontSize: '11px', color: 'var(--text)', marginTop: '4px', lineHeight: '1.4' }}>Access schedules, log hours, check in passenger fares, and map routes.</div>
                </div>
              </a>

              {/* Admin Console */}
              <a
                href={ROUTES.adminConsole}
                onClick={() => setIsOpen(false)}
                style={portalLinkStyle}
                onMouseEnter={portalLinkHover.enter}
                onMouseLeave={portalLinkHover.leave}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '36px', height: '36px', borderRadius: '6px', background: 'rgba(245,158,11,0.1)', color: '#f59e0b', flexShrink: 0 }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="3" />
                    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
                  </svg>
                </div>
                <div style={{ textAlign: 'left' }}>
                  <div style={{ fontSize: '13.5px', fontWeight: 600, color: 'var(--text-h)', lineHeight: '1.2' }}>Admin Console</div>
                  <div style={{ fontSize: '11px', color: 'var(--text)', marginTop: '4px', lineHeight: '1.4' }}>Manage active routes, dispatch buses, view metrics, and system logs.</div>
                </div>
              </a>
            </div>
          </div>
        </div>
      </div>
      )}
    </header>
    </div>
  );
};

export default Header;
