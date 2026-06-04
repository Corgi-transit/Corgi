import React from 'react';
import { Button } from '../ui/button';

interface PassengerAuthFormProps {
  authMode: 'signin' | 'signup';
  setAuthMode: (mode: 'signin' | 'signup') => void;
  email: string;
  setEmail: (val: string) => void;
  password: string;
  setPassword: (val: string) => void;
  authLoading: boolean;
  handleAuth: (e: React.FormEvent) => void;
  onGoogleAuth: () => void;
}

export const PassengerAuthForm: React.FC<PassengerAuthFormProps> = ({
  authMode,
  setAuthMode,
  email,
  setEmail,
  password,
  setPassword,
  authLoading,
  handleAuth,
  onGoogleAuth,
}) => {
  const [showPassword, setShowPassword] = React.useState(false);

  return (
    <div className="w-full max-w-[420px] bg-white border border-[var(--border)] rounded-2xl p-8 shadow-md">
      <h2 className="text-xl font-black text-[var(--text-h)] m-0 text-center">
        {authMode === 'signin' ? 'Sign In as Passenger' : 'Register Passenger Account'}
      </h2>
      <p className="text-xs text-[var(--text)] mt-1.5 text-center leading-relaxed">
        Book your convention seats and track buses live in real-time.
      </p>

      <form onSubmit={handleAuth} className="mt-6 flex flex-col gap-4 text-left">
        <div className="flex flex-col gap-1">
          <label className="text-xs font-semibold text-[var(--text-h)] mb-1.5">Email address</label>
          <input
            type="text"
            inputMode="email"
            autoComplete="email"
            placeholder="you or you@gmail.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full px-3.5 py-2.5 bg-white border border-[var(--border)] rounded-md text-sm text-[var(--text-h)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)] focus:border-[var(--accent)] box-border"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-xs font-semibold text-[var(--text-h)] mb-1.5">Password</label>
          <div className="relative w-full">
            <input
              type={showPassword ? 'text' : 'password'}
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full pl-3.5 pr-11 py-2.5 bg-white border border-[var(--border)] rounded-md text-sm text-[var(--text-h)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)] focus:border-[var(--accent)] box-border"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 bg-transparent border-none cursor-pointer text-neutral-400 hover:text-neutral-600 transition-colors p-1 flex items-center justify-center"
              title={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
                </svg>
              ) : (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              )}
            </button>
          </div>
        </div>

        <Button variant="default" size="sm" type="submit" disabled={authLoading} className="w-full py-3 mt-2">
          {authLoading ? 'Authenticating...' : authMode === 'signin' ? 'Sign In' : 'Sign Up'}
        </Button>
      </form>

      <div className="flex flex-col gap-5 mt-6">
        <div className="relative flex items-center">
          <div className="flex-grow border-t border-[var(--border)]" />
          <span className="flex-shrink mx-4 text-[10px] text-neutral-400 font-semibold">or continue with</span>
          <div className="flex-grow border-t border-[var(--border)]" />
        </div>

        <button
          type="button"
          onClick={onGoogleAuth}
          disabled={authLoading}
          className="w-full py-2.5 px-4 bg-white hover:bg-neutral-50 active:bg-neutral-100 border border-[var(--border)] rounded-md text-sm font-semibold text-[var(--text-h)] cursor-pointer flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
          <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
          <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
          <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l3.66-2.85z" fill="#FBBC05" />
          <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.85c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
        </svg>
          Continue with Google
        </button>

        <p className="text-xs text-[var(--text)] text-center m-0 pt-1">
          {authMode === 'signin' ? "Don't have an account?" : 'Already have an account?'}{' '}
          <button
            type="button"
            onClick={() => setAuthMode(authMode === 'signin' ? 'signup' : 'signin')}
            className="text-[#6e54ff] font-bold bg-transparent border-none cursor-pointer hover:text-[#5b40e8] hover:underline"
          >
            {authMode === 'signin' ? 'Sign up' : 'Sign in'}
          </button>
        </p>
      </div>
    </div>
  );
};
