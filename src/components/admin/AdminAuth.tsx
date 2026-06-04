import React, { useState } from 'react';
import { supabase } from '../../utils/supabase';
import { ROUTES, appOriginPath } from '../../utils/routes';
import { normalizeEmailInput } from '../../utils/email';
import { Button } from '../ui/button';
import { AuthScreenLayout } from '../auth/AuthScreenLayout';

interface AdminAuthProps {
  onAuthSuccess: (user: any) => void;
}

interface AdminAuthHint {
  pending_invite: boolean;
  has_account: boolean;
  is_admin: boolean;
}

const normalizeAuthError = (error: { message?: string }, hint?: AdminAuthHint | null) => {
  const msg = (error.message || '').toLowerCase();

  if (msg.includes('email not confirmed')) {
    return 'Please confirm your email using the link Supabase sent you, then sign in again with the same password.';
  }

  if (msg.includes('invalid login credentials')) {
    if (hint?.pending_invite) {
      return 'Use the password you are setting now for this invited email (first sign-in creates your account). If you already tried once, confirm your email or ask an admin to re-send the invite.';
    }
    if (hint?.has_account && !hint?.is_admin) {
      return 'This account exists but is not an administrator. Ask an admin to invite this exact email in System Settings.';
    }
    if (!hint?.pending_invite && !hint?.has_account) {
      return 'This email is not on the admin invite list. Ask an existing admin to add you under System Settings → Administrators.';
    }
    return 'Invalid email or password. Use the exact invited email and the password you chose when first signing in.';
  }

  return error.message || 'Authentication failed.';
};

export const AdminAuth: React.FC<AdminAuthProps> = ({ onAuthSuccess }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const completeAdminLogin = async (user: { id: string }) => {
    let { data: roleData, error: roleError } = await supabase
      .from('user_roles')
      .select('role')
      .eq('id', user.id)
      .maybeSingle();

    if (roleError || roleData?.role !== 'admin') {
      const { data: claimed, error: claimError } = await supabase.rpc(
        'claim_admin_invite_if_pending'
      );
      if (!claimError && claimed) {
        const retry = await supabase
          .from('user_roles')
          .select('role')
          .eq('id', user.id)
          .maybeSingle();
        roleData = retry.data;
        roleError = retry.error;
      }
    }

    if (roleError || roleData?.role !== 'admin') {
      await supabase.auth.signOut();
      throw new Error(
        'Access denied: this account is not an administrator. Ask an admin to add your exact email under System Settings → Administrators.'
      );
    }

    const { data: { user: sessionUser } } = await supabase.auth.getUser();
    onAuthSuccess(sessionUser ?? user);
  };

  const fetchAuthHint = async (normalizedEmail: string): Promise<AdminAuthHint | null> => {
    const { data, error } = await supabase.rpc('get_admin_auth_hint', {
      p_email: normalizedEmail,
    });
    if (error) {
      console.error('get_admin_auth_hint failed:', error);
      return null;
    }
    return data as AdminAuthHint;
  };

  const acceptInviteWithPassword = async (normalizedEmail: string) => {
    const { data, error } = await supabase.auth.signUp({
      email: normalizedEmail,
      password,
      options: {
        emailRedirectTo: appOriginPath(ROUTES.adminConsole),
      },
    });

    if (error) {
      const alreadyRegistered =
        error.message?.toLowerCase().includes('already registered') ||
        error.message?.toLowerCase().includes('already been registered');
      if (alreadyRegistered) {
        return { kind: 'existing_user' as const };
      }
      throw error;
    }

    if (data.session?.user) {
      await completeAdminLogin(data.session.user);
      return { kind: 'done' as const };
    }

    await supabase.auth.resend({ type: 'signup', email: normalizedEmail });

    return { kind: 'confirm_email' as const };
  };

  const signInWithPassword = async (normalizedEmail: string, hint?: AdminAuthHint | null) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: normalizedEmail,
      password,
    });

    if (error) {
      throw new Error(normalizeAuthError(error, hint));
    }

    if (data?.user) {
      await completeAdminLogin(data.user);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    const normalizedEmail = normalizeEmailInput(email);

    try {
      const hint = await fetchAuthHint(normalizedEmail);

      if (hint?.pending_invite) {
        const result = await acceptInviteWithPassword(normalizedEmail);

        if (result.kind === 'done') {
          return;
        }

        if (result.kind === 'confirm_email') {
          setMessage({
            type: 'success',
            text: 'Admin invite accepted. Check your email to confirm your address, then sign in here with the same password.',
          });
          setPassword('');
          return;
        }

        if (result.kind === 'existing_user') {
          await signInWithPassword(normalizedEmail, hint);
          return;
        }
      }

      if (hint && !hint.pending_invite && !hint.has_account) {
        throw new Error(
          'This email is not invited as an admin. Ask an existing admin to add it under System Settings → Administrators.'
        );
      }

      try {
        await signInWithPassword(normalizedEmail, hint);
      } catch (signInErr: any) {
        const signInMsg = (signInErr.message || '').toLowerCase();
        const canRetrySignUp =
          signInMsg.includes('invalid login credentials') &&
          (hint?.pending_invite || !hint?.has_account);

        if (!canRetrySignUp) {
          throw signInErr;
        }

        const result = await acceptInviteWithPassword(normalizedEmail);
        if (result.kind === 'done') {
          return;
        }
        if (result.kind === 'confirm_email') {
          setMessage({
            type: 'success',
            text: 'Check your email to confirm your address, then sign in with the same password.',
          });
          setPassword('');
          return;
        }
        throw signInErr;
      }
    } catch (err: any) {
      setMessage({
        type: 'error',
        text: err.message || 'An unexpected authentication error occurred.',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthScreenLayout
      banner={
        message
          ? { variant: message.type === 'success' ? 'success' : 'error', message: message.text }
          : null
      }
    >
      <div className="w-full max-w-[420px] bg-white border border-[var(--border)] rounded-xl shadow-lg p-8 box-border">
        <div className="text-center mb-6">
          <h2 className="text-xl font-extrabold text-[var(--text-h)] m-0">Admin Console Sign In</h2>
          <p className="text-xs text-[var(--text)] mt-1.5 leading-relaxed">
            Administrator access is by invitation only. Sign in with the email that was invited and your password.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="block text-xs font-semibold text-[var(--text-h)] mb-1.5">
              Admin Email Address
            </label>
            <input
              type="text"
              inputMode="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="you or you@gmail.com"
              className="w-full px-3.5 py-2.5 bg-white border border-[var(--border)] rounded-md text-sm text-[var(--text-h)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)] focus:border-[var(--accent)] box-border"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[var(--text-h)] mb-1.5">Password</label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                placeholder="••••••••"
                className="w-full pl-3.5 pr-11 py-2.5 bg-white border border-[var(--border)] rounded-md text-sm text-[var(--text-h)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)] focus:border-[var(--accent)] box-border"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 bg-transparent border-none cursor-pointer text-neutral-400 hover:text-neutral-600 transition-colors p-1 flex items-center justify-center"
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

          <button
            type="button"
            disabled={loading || !email.trim()}
            onClick={async () => {
              const normalizedEmail = normalizeEmailInput(email);
              if (!normalizedEmail) return;
              setLoading(true);
              setMessage(null);
              const { error } = await supabase.auth.resetPasswordForEmail(normalizedEmail, {
                redirectTo: appOriginPath(ROUTES.adminConsole),
              });
              setLoading(false);
              if (error) {
                setMessage({ type: 'error', text: error.message });
              } else {
                setMessage({
                  type: 'success',
                  text: 'If this email has an account, a password reset link was sent. Use it, then sign in here.',
                });
              }
            }}
            className="text-xs text-[var(--accent)] bg-transparent border-none cursor-pointer hover:underline p-0 self-start"
          >
            Forgot password?
          </button>

          <Button type="submit" variant="default" size="default" disabled={loading} className="w-full py-2.5 mt-2">
            {loading ? (
              <div className="flex items-center justify-center gap-2">
                <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span>Signing in...</span>
              </div>
            ) : (
              <span>Sign In to Console</span>
            )}
          </Button>
        </form>
      </div>
    </AuthScreenLayout>
  );
};

export default AdminAuth;
