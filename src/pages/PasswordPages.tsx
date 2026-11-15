import { useEffect, useState, type FormEvent } from 'react';
import { AlertCircle, CheckCircle2, Loader2, MailCheck } from 'lucide-react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { AuthLayout } from '@/components/auth/AuthLayout';
import { useAuth } from '@/contexts/AuthContext';
import { getAuthErrorMessage } from '@/lib/authErrors';
import { supabase } from '@/lib/supabase';

export function ForgotPasswordPage() {
  const { sendPasswordReset } = useAuth();
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await sendPasswordReset(email.trim());
      setSent(true);
    } catch (err) {
      setError(getAuthErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthLayout
      title="Reset password"
      subtitle="Enter your email and we will send you a secure link to choose a new password."
      footer={
        <Link to="/sign-in" className="font-medium text-champagne transition-colors hover:text-champagne-light">
          Back to sign in
        </Link>
      }
    >
      {sent ? (
        <div className="glass flex flex-col items-center p-8 text-center">
          <span className="mb-4 flex h-14 w-14 items-center justify-center rounded-full border border-champagne/30 bg-emerald-deep/60">
            <MailCheck className="h-7 w-7 text-champagne" strokeWidth={1.5} />
          </span>
          <h2 className="font-serif text-2xl text-white">Check your inbox</h2>
          <p className="mt-3 text-sm text-slate-300">
            If an account exists for <span className="font-medium text-champagne">{email}</span>, a secure password reset link has been dispatched.
          </p>
          <p className="mt-2 text-xs text-slate-400">
            Please check your spam or junk folder if the email does not arrive within a few minutes.
          </p>
          <div className="mt-6 w-full">
            <Link to="/sign-in" className="btn-secondary block w-full text-center">
              Return to sign in
            </Link>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label htmlFor="email" className="label-text">Email</label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="input-base"
              placeholder="you@yourboutique.com"
            />
          </div>

          {error && (
            <div role="alert" className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
              {error}
            </div>
          )}

          <button type="submit" disabled={submitting} className="btn-primary w-full">
            {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
            Send reset link
          </button>
        </form>
      )}
    </AuthLayout>
  );
}

export function ResetPasswordPage() {
  const { updatePassword, user, loading: authLoading } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [checkingLink, setCheckingLink] = useState(true);
  const [linkError, setLinkError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function checkRecoveryParams() {
      // 1. Check for URL error parameters in query string or hash
      const searchParams = new URLSearchParams(location.search);
      const hashParams = new URLSearchParams(location.hash.replace(/^#/, ''));

      const urlError =
        searchParams.get('error_description') ||
        hashParams.get('error_description') ||
        searchParams.get('error') ||
        hashParams.get('error');

      const errorCode = searchParams.get('error_code') || hashParams.get('error_code');

      if (urlError || errorCode) {
        if (!cancelled) {
          setLinkError(
            errorCode === 'otp_expired'
              ? 'This password reset link has expired or has already been used. Please request a new one.'
              : urlError || 'Invalid or expired password reset link.'
          );
          setCheckingLink(false);
        }
        return;
      }

      // 2. Check for PKCE auth code
      const code = searchParams.get('code');
      if (code) {
        try {
          const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
          if (exchangeError) {
            if (!cancelled) {
              setLinkError(exchangeError.message);
              setCheckingLink(false);
            }
            return;
          }
        } catch (err) {
          if (!cancelled) {
            setLinkError(getAuthErrorMessage(err));
            setCheckingLink(false);
          }
          return;
        }
      }

      if (!cancelled) {
        setCheckingLink(false);
      }
    }

    checkRecoveryParams();

    return () => {
      cancelled = true;
    };
  }, [location]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    setSubmitting(true);
    try {
      await updatePassword(password);
      setDone(true);
    } catch (err) {
      setError(getAuthErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  if (checkingLink || authLoading) {
    return (
      <AuthLayout title="Verifying link" subtitle="Validating your password recovery session...">
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-emerald-400" />
        </div>
      </AuthLayout>
    );
  }

  if (linkError) {
    return (
      <AuthLayout title="Reset link error" subtitle="Unable to proceed with password reset.">
        <div className="glass flex flex-col items-center p-8 text-center">
          <span className="mb-4 flex h-14 w-14 items-center justify-center rounded-full border border-red-500/30 bg-red-500/10">
            <AlertCircle className="h-7 w-7 text-red-400" />
          </span>
          <h2 className="font-serif text-2xl text-white">Link expired or invalid</h2>
          <p className="mt-3 text-sm text-slate-300">{linkError}</p>
          <div className="mt-6 flex flex-col gap-3 w-full">
            <Link to="/forgot-password" className="btn-primary block w-full text-center">
              Request new reset link
            </Link>
            <Link to="/sign-in" className="btn-secondary block w-full text-center">
              Back to sign in
            </Link>
          </div>
        </div>
      </AuthLayout>
    );
  }

  if (!user && !done) {
    return (
      <AuthLayout title="Session required" subtitle="No active recovery session was detected.">
        <div className="glass flex flex-col items-center p-8 text-center">
          <span className="mb-4 flex h-14 w-14 items-center justify-center rounded-full border border-champagne/30 bg-emerald-deep/60">
            <MailCheck className="h-7 w-7 text-champagne" strokeWidth={1.5} />
          </span>
          <h2 className="font-serif text-2xl text-white">Reset link needed</h2>
          <p className="mt-3 text-sm text-slate-300">
            To choose a new password, please use the link delivered to your email address, or request a new one below.
          </p>
          <div className="mt-6 flex flex-col gap-3 w-full">
            <Link to="/forgot-password" className="btn-primary block w-full text-center">
              Request reset link
            </Link>
            <Link to="/sign-in" className="btn-secondary block w-full text-center">
              Back to sign in
            </Link>
          </div>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      title="Choose a new password"
      subtitle="Use at least 6 characters for your jewellery studio."
      footer={
        <Link to="/dashboard" className="font-medium text-champagne transition-colors hover:text-champagne-light">
          Continue to dashboard
        </Link>
      }
    >
      {done ? (
        <div className="glass flex flex-col items-center p-8 text-center">
          <span className="mb-4 flex h-14 w-14 items-center justify-center rounded-full border border-champagne/30 bg-emerald-deep/60">
            <CheckCircle2 className="h-7 w-7 text-champagne" strokeWidth={1.5} />
          </span>
          <h2 className="font-serif text-2xl text-white">Password updated</h2>
          <p className="mt-2 text-sm text-slate-300">Your new password is saved. You are signed in to JEWELS AI.</p>
          <button
            type="button"
            onClick={() => navigate('/dashboard', { replace: true })}
            className="btn-primary mt-6 w-full"
          >
            Go to dashboard
          </button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label htmlFor="password" className="label-text">New password</label>
            <input
              id="password"
              type="password"
              autoComplete="new-password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="input-base"
              placeholder="At least 6 characters"
            />
          </div>
          <div>
            <label htmlFor="confirmPassword" className="label-text">Confirm new password</label>
            <input
              id="confirmPassword"
              type="password"
              autoComplete="new-password"
              required
              minLength={6}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="input-base"
              placeholder="Repeat your new password"
            />
          </div>

          {error && (
            <div role="alert" className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
              {error}
            </div>
          )}

          <button type="submit" disabled={submitting} className="btn-primary w-full">
            {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
            Save password
          </button>
        </form>
      )}
    </AuthLayout>
  );
}
