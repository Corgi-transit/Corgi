import React, { useRef, useState } from 'react';
import { ROUTES } from '@/utils/routes';
import heroImage from '@/assets/hero.png';
import productScreenshot from '@/assets/putonhero.png';
import driverAppScreenshot from '@/assets/driverweb.jpg';

const PcFrameMockup: React.FC<{ src: string; alt: string }> = ({ src, alt }) => {
  const ref = useRef<HTMLDivElement>(null);
  const [tilt, setTilt] = useState({ x: 0, y: 0 });

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const el = ref.current;
    if (!el) return;
    const { left, top, width, height } = el.getBoundingClientRect();
    const x = ((e.clientX - left) / width - 0.5) * 12;
    const y = ((e.clientY - top) / height - 0.5) * -12;
    setTilt({ x, y });
  };

  const handleMouseLeave = () => setTilt({ x: 0, y: 0 });

  return (
    <div
      ref={ref}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={{
        transform: `perspective(1200px) rotateY(${tilt.x}deg) rotateX(${tilt.y}deg)`,
        transition: tilt.x === 0 && tilt.y === 0 ? 'transform 0.6s ease' : 'transform 0.1s ease',
      }}
      className="w-full max-w-[min(100%,680px)] mx-auto sm:max-w-[720px] lg:mx-0 lg:ml-auto lg:max-w-none lg:w-full cursor-pointer"
    >
      {/* Monitor */}
      <div className="rounded-xl border border-neutral-200/80 bg-gradient-to-b from-neutral-100 to-neutral-200 p-2.5 shadow-[0_28px_70px_-12px_rgba(0,0,0,0.38)] sm:rounded-2xl sm:p-3">
        {/* Title bar */}
        <div className="flex items-center gap-2 rounded-t-lg border border-neutral-200/90 bg-neutral-50 px-3 py-2">
          <span className="h-2.5 w-2.5 rounded-full bg-[#ff5f57]" aria-hidden />
          <span className="h-2.5 w-2.5 rounded-full bg-[#febc2e]" aria-hidden />
          <span className="h-2.5 w-2.5 rounded-full bg-[#28c840]" aria-hidden />
          <span className="ml-2 flex-1 truncate text-center text-[10px] font-medium text-neutral-500">
            CityBus — Driver Portal
          </span>
        </div>
        {/* Screen */}
        <div className="overflow-hidden rounded-b-lg border border-t-0 border-neutral-200/90 bg-neutral-900">
          <img src={src} alt={alt} className="block w-full h-auto object-cover object-top" />
        </div>
      </div>
      {/* Stand */}
      <div className="mx-auto mt-3 flex flex-col items-center" aria-hidden>
        <div className="h-3.5 w-28 rounded-sm bg-gradient-to-b from-neutral-300 to-neutral-400 sm:h-4 sm:w-32" />
        <div className="mt-1 h-2 w-48 rounded-full bg-neutral-300/90 sm:w-52" />
      </div>
    </div>
  );
};

const SocialIcons = {
  Twitter: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.741l7.73-8.835L1.254 2.25H8.08l4.259 5.63L18.244 2.25zm-1.161 17.52h1.833L7.084 4.126H5.117L17.083 19.77z" />
    </svg>
  ),
  Facebook: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
    </svg>
  ),
  Instagram: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
    </svg>
  ),
  LinkedIn: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
    </svg>
  ),
  YouTube: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M23.495 6.205a3.007 3.007 0 0 0-2.088-2.088c-1.87-.501-9.396-.501-9.396-.501s-7.507-.01-9.396.501A3.007 3.007 0 0 0 .527 6.205a31.247 31.247 0 0 0-.522 5.805 31.247 31.247 0 0 0 .522 5.783 3.007 3.007 0 0 0 2.088 2.088c1.868.502 9.396.502 9.396.502s7.506 0 9.396-.502a3.007 3.007 0 0 0 2.088-2.088 31.247 31.247 0 0 0 .5-5.783 31.247 31.247 0 0 0-.5-5.805zM9.609 15.601V8.408l6.264 3.602z" />
    </svg>
  ),
};

const socialLinks = [
  { name: 'Twitter / X', Icon: SocialIcons.Twitter, href: '#' },
  { name: 'Facebook', Icon: SocialIcons.Facebook, href: '#' },
  { name: 'Instagram', Icon: SocialIcons.Instagram, href: '#' },
  { name: 'LinkedIn', Icon: SocialIcons.LinkedIn, href: '#' },
  { name: 'YouTube', Icon: SocialIcons.YouTube, href: '#' },
];

const features = [
  {
    title: 'Live bus tracking',
    description: 'Passengers see active routes and bus locations on an interactive map in real time.',
  },
  {
    title: 'Driver operations',
    description: 'Drivers manage shifts, broadcast GPS updates, and log passenger boardings from one portal.',
  },
  {
    title: 'Fleet control room',
    description: 'Administrators configure routes, deployments, drivers, and system settings in one console.',
  },
];

const footerLinks = [
  { label: 'Passenger portal', href: ROUTES.passengerPortal },
  { label: 'Driver portal', href: ROUTES.driverPortal },
  { label: 'Admin console', href: ROUTES.adminConsole },
];

const GITHUB_ISSUES_URL = 'https://github.com/Corgi-transit/Corgi/issues';
const GITHUB_NEW_ISSUE_URL = 'https://github.com/Corgi-transit/Corgi/issues/new';

const PhoneMockup: React.FC<{ src: string; alt: string }> = ({ src, alt }) => {
  const ref = useRef<HTMLDivElement>(null);
  const [tilt, setTilt] = useState({ x: 0, y: 0 });

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const el = ref.current;
    if (!el) return;
    const { left, top, width, height } = el.getBoundingClientRect();
    const x = ((e.clientX - left) / width - 0.5) * 18;
    const y = ((e.clientY - top) / height - 0.5) * -18;
    setTilt({ x, y });
  };

  const handleMouseLeave = () => setTilt({ x: 0, y: 0 });

  return (
    <div
      ref={ref}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={{
        transform: `perspective(900px) rotateY(${tilt.x}deg) rotateX(${tilt.y}deg)`,
        transition: tilt.x === 0 && tilt.y === 0 ? 'transform 0.6s ease' : 'transform 0.1s ease',
      }}
      className="w-full max-w-[260px] mx-auto lg:mx-0 cursor-pointer"
    >
      <div className="rounded-[2.5rem] border border-neutral-200/80 bg-gradient-to-b from-neutral-100 to-neutral-200 p-2.5 shadow-[0_28px_70px_-12px_rgba(0,0,0,0.38)]">
        <div className="flex items-center justify-between rounded-t-[2rem] border border-neutral-200/90 bg-neutral-50 px-4 py-2">
          <span className="text-[10px] font-medium text-neutral-400">9:41</span>
          <div className="w-16 h-3 rounded-full bg-neutral-200" />
          <div className="flex items-center gap-1">
            <div className="w-3 h-2 rounded-sm bg-neutral-300" />
            <div className="w-2.5 h-2.5 rounded-full bg-neutral-300" />
          </div>
        </div>
        <div className="overflow-hidden rounded-b-[2rem] border border-t-0 border-neutral-200/90">
          <img src={src} alt={alt} className="block w-full h-auto object-cover object-top" />
        </div>
      </div>
      <div className="mx-auto mt-3 flex justify-center">
        <div className="h-1.5 w-24 rounded-full bg-neutral-300" />
      </div>
    </div>
  );
};

export const HeroSection: React.FC = () => {
  return (
    <div className="flex flex-col flex-1 w-full">
      {/* Hero */}
      <section className="relative flex w-full min-h-[min(90vh,880px)] flex-col items-center justify-center overflow-hidden px-6 py-14 sm:py-20">
        <img
          src={heroImage}
          alt=""
          className="pointer-events-none absolute inset-0 h-full w-full object-cover object-center"
          aria-hidden
        />

        <div className="relative z-10 grid w-full max-w-[1200px] grid-cols-1 items-center gap-10 lg:grid-cols-[0.95fr_1.15fr] lg:gap-14">
          <div className="flex flex-col items-center gap-8 text-center lg:items-start lg:text-left">
            <h1 className="m-0 text-[clamp(2.2rem,5vw,3.25rem)] font-black leading-[1.15] tracking-tight text-[var(--text-h)]">
              Urban transit,{' '}
              <span className="text-[#6e54ff]">reimagined.</span>
            </h1>

            <p className="m-0 max-w-lg text-base leading-relaxed text-[var(--text)]">
              Connecting passengers and drivers across the city — seamlessly, safely, and in real time.
              The future of urban mobility starts here.
            </p>

            <div className="flex flex-wrap items-center justify-center gap-3 lg:justify-start">
              <a
                href={ROUTES.passengerPortal}
                className="inline-flex items-center rounded-full bg-[#6e54ff] px-7 py-3 text-[15px] font-bold text-white no-underline transition-transform hover:-translate-y-0.5"
              >
                Get started as passenger
              </a>
              <a
                href={ROUTES.driverPortal}
                className="inline-flex items-center rounded-full border border-[var(--border)] bg-white/80 px-7 py-3 text-[15px] font-bold text-[var(--text-h)] no-underline backdrop-blur-sm transition-colors hover:bg-white hover:-translate-y-0.5"
              >
                Join as a driver
              </a>
            </div>
          </div>

          <PcFrameMockup
            src={productScreenshot}
            alt="CityBus driver portal showing live route map across Nigeria"
          />
        </div>
      </section>

      {/* Features */}
      <section className="border-y border-[var(--border)] bg-neutral-50/60">
        <div className="max-w-[1126px] mx-auto px-6 py-12 sm:py-14">
          <div className="text-center mb-10">
            <h2 className="m-0 text-lg font-bold text-[var(--text-h)]">Built for everyone on the road</h2>
            <p className="m-0 mt-2 text-sm text-[var(--text)] max-w-md mx-auto">
              One platform for passengers, drivers, and dispatch teams.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            {features.map((feature) => (
              <div
                key={feature.title}
                className="rounded-xl border border-[var(--border)] bg-white p-5 shadow-sm"
              >
                <h3 className="m-0 text-sm font-bold text-[var(--text-h)]">{feature.title}</h3>
                <p className="m-0 mt-2 text-xs leading-relaxed text-[var(--text)]">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Driver App Download */}
      <section className="border-y border-[var(--border)] bg-neutral-50/60">
        <div className="max-w-[1126px] mx-auto px-6 py-14 sm:py-20">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">

            {/* Left — content */}
            <div className="flex flex-col gap-7 text-center lg:text-left">
              <div>
                <p className="m-0 text-[12px] font-semibold text-[#6e54ff] mb-3">
                  Driver Mobile App
                </p>
                <h2 className="m-0 text-[clamp(1.6rem,3.5vw,2.25rem)] font-black leading-tight tracking-tight text-[var(--text-h)]">
                  Your shift, managed from your phone.
                </h2>
                <p className="m-0 mt-4 text-sm leading-relaxed text-[var(--text)] max-w-[440px] mx-auto lg:mx-0">
                  Corgi Driver is the official Android companion for CityBus drivers. Manage shifts,
                  track passengers, broadcast your live location, and send SOS alerts — all in one place.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {[
                  { title: 'Live GPS broadcasting', desc: 'Your position updates every 8 seconds on the fleet map.' },
                  { title: 'SOS emergency alerts', desc: 'Notify dispatch instantly with the nature of the emergency.' },
                  { title: 'Shift and route management', desc: 'View your assignment, departure time, and route direction.' },
                  { title: 'Passenger check-in', desc: 'Mark each passenger as boarded with a single tap.' },
                  { title: 'Secure email sign-in', desc: 'Sign in with a one-time code sent to your email.' },
                  { title: 'Deployment history', desc: 'Review your completed trips and past assignments.' },
                ].map(({ title, desc }) => (
                  <div key={title} className="rounded-xl border border-[var(--border)] bg-white p-4 text-left shadow-sm">
                    <p className="m-0 text-[13px] font-semibold text-[var(--text-h)]">{title}</p>
                    <p className="m-0 mt-1 text-[11px] leading-relaxed text-[var(--text)]">{desc}</p>
                  </div>
                ))}
              </div>

              <div className="flex flex-wrap items-center gap-3 justify-center lg:justify-start">
                <a
                  href="/driver.apk"
                  download="CorgiDriver.apk"
                  className="inline-flex items-center gap-2.5 rounded-full bg-[#6e54ff] px-7 py-3.5 text-[14px] font-bold text-white no-underline transition-all hover:-translate-y-0.5 hover:bg-[#5b40e8]"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="7 10 12 15 17 10" />
                    <line x1="12" y1="15" x2="12" y2="3" />
                  </svg>
                  Download APK
                </a>
                <span className="text-xs text-[var(--text)]">Android 8.0 or later · Free</span>
              </div>

              <p className="m-0 text-[11px] text-[var(--text)] max-w-sm mx-auto lg:mx-0">
                Enable <strong className="text-[var(--text-h)]">Install unknown apps</strong> in your Android settings before installing.
              </p>
            </div>

            {/* Right — phone mockup */}
            <div className="flex justify-center lg:justify-end">
              <PhoneMockup
                src={driverAppScreenshot}
                alt="Corgi Driver app showing live map and shift controls"
              />
            </div>

          </div>
        </div>
      </section>

      {/* Feedback */}
      <section className="border-b border-[var(--border)] bg-white">
        <div className="max-w-[1126px] mx-auto px-6 py-12 sm:py-14">
          <div className="mx-auto max-w-xl rounded-xl border border-[var(--border)] bg-neutral-50/80 p-8 text-center shadow-sm">
            <h2 className="m-0 text-lg font-bold text-[var(--text-h)]">Found a bug or have an idea?</h2>
            <p className="m-0 mt-3 text-sm leading-relaxed text-[var(--text)]">
              Open a GitHub issue to report problems, request features, or share suggestions with the team.
            </p>
            <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
              <a
                href={GITHUB_NEW_ISSUE_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-full bg-[#6e54ff] px-7 py-3 text-[15px] font-bold text-white no-underline transition-transform hover:-translate-y-0.5"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                  <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A8.205 8.205 0 0 0 24 12c0-6.63-5.37-12-12-12z" />
                </svg>
                Create an issue
              </a>
              <a
                href={GITHUB_ISSUES_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center rounded-full border border-[var(--border)] bg-white px-7 py-3 text-[15px] font-bold text-[var(--text-h)] no-underline transition-colors hover:bg-neutral-50 hover:-translate-y-0.5"
              >
                View all issues
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Social */}
      <section className="flex flex-col items-center px-6 py-12">
        <p className="m-0 mb-4 text-xs font-semibold text-[var(--text)]">Follow us for live updates</p>
        <div className="flex gap-3">
          {socialLinks.map(({ name, Icon, href }) => (
            <a
              key={name}
              href={href}
              aria-label={name}
              className="flex h-11 w-11 items-center justify-center rounded-full border border-[var(--border)] text-[var(--text)] no-underline transition-all hover:-translate-y-0.5 hover:border-[#6e54ff] hover:bg-[#6e54ff] hover:text-white"
            >
              <Icon />
            </a>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="mt-auto border-t border-[var(--border)] bg-white">
        <div className="max-w-[1126px] mx-auto px-6 py-10 grid grid-cols-1 sm:grid-cols-3 gap-8">
          <div>
            <p className="m-0 text-sm font-extrabold text-[var(--text-h)]">CityBus</p>
            <p className="m-0 mt-2 text-xs leading-relaxed text-[var(--text)] max-w-[220px]">
              Smart transit and fleet management for campuses, municipalities, and shuttle networks.
            </p>
          </div>

          <div>
            <p className="m-0 text-xs font-semibold text-[var(--text-h)]">Portals</p>
            <ul className="m-0 mt-3 p-0 list-none flex flex-col gap-2">
              {footerLinks.map((link) => (
                <li key={link.href}>
                  <a
                    href={link.href}
                    className="text-xs text-[var(--text)] no-underline hover:text-[#6e54ff] transition-colors"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <p className="m-0 text-xs font-semibold text-[var(--text-h)]">Contact</p>
            <p className="m-0 mt-3 text-xs text-[var(--text)]">
              <a href="mailto:support@citybus.com" className="text-[var(--text)] hover:text-[#6e54ff] no-underline">
                support@citybus.com
              </a>
            </p>
            <p className="m-0 mt-1 text-xs text-[var(--text)]">Lagos · Port Harcourt</p>
          </div>
        </div>

        <div className="border-t border-[var(--border)] py-4 text-center">
          <p className="m-0 text-[11px] text-[var(--text)]">
            © {new Date().getFullYear()} CityBus. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default HeroSection;
