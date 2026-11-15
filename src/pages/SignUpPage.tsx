import { useState, type FormEvent } from 'react';
import { Chrome, Loader2, MailCheck, CheckCircle2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { AuthLayout } from '@/components/auth/AuthLayout';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import { getAuthErrorMessage } from '@/lib/authErrors';

export function SignUpPage() {
  const { signUpWithPassword, signInWithGoogle } = useAuth();
  const { notify } = useToast();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [needsConfirmation, setNeedsConfirmation] = useState(false);
  const [done, setDone] = useState(false);
  const [registeredEmail, setRegisteredEmail] = useState('');

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
      const res = await signUpWithPassword(fullName.trim(), email.trim(), password);
      setRegisteredEmail(email.trim());

      if (res.needsConfirmation) {
        setNeedsConfirmation(true);
        notify('Verification email sent! Please check your inbox.');
      } else {
        notify('Your account is ready. Welcome to JEWELS AI.');
        setDone(true);
      }
    } catch (err) {
      setError(getAuthErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  const handleGoogle = async () => {
    setError(null);
    setGoogleLoading(true);
    try {
      await signInWithGoogle();
    } catch (err) {
      setError(getAuthErrorMessage(err));
      setGoogleLoading(false);
    }
  };

  return (
    <AuthLayout
      title="Create your studio"
      subtitle="Start building luxury campaigns for your jewellery collection."
      footer={
        <>
          Already have an account?{' '}
          <Link to="/sign-in" className="font-medium text-champagne transition-colors hover:text-champagne-light">
            Sign in
          </Link>
        </>
      }
    >
      {needsConfirmation ? (
        <div className="glass flex flex-col items-center p-8 text-center">
          <span className="mb-4 flex h-14 w-14 items-center justify-center rounded-full border border-champagne/30 bg-emerald-deep/60">
            <MailCheck className="h-7 w-7 text-champagne" strokeWidth={1.5} />
          </span>
          <h2 className="font-serif text-2xl text-white">Check your email</h2>
          <p className="mt-3 text-sm text-slate-300">
            We have sent an activation link to{' '}
            <span className="font-medium text-champagne">{registeredEmail}</span>.
          </p>
          <p className="mt-2 text-xs text-slate-400">
            Please click the link in your email to confirm your account, then sign in to your studio.
          </p>
          <div className="mt-6 w-full space-y-3">
            <Link to="/sign-in" className="btn-primary block w-full text-center">
              Continue to Sign in
            </Link>
          </div>
        </div>
      ) : done ? (
        <div className="glass flex flex-col items-center p-8 text-center">
          <span className="mb-4 flex h-14 w-14 items-center justify-center rounded-full border border-champagne/30 bg-emerald-deep/60">
            <CheckCircle2 className="h-7 w-7 text-champagne" strokeWidth={1.5} />
          </span>
          <h2 className="font-serif text-2xl text-white">Your studio is ready</h2>
          <p className="mt-2 text-sm text-slate-400">You are signed in and can start uploading your jewellery.</p>
          <Link to="/dashboard" className="btn-primary mt-6 w-full text-center">
            Go to your dashboard
          </Link>
        </div>
      ) : (
        <>
          <button type="button" onClick={handleGoogle} disabled={googleLoading} className="btn-secondary w-full">
            {googleLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Chrome className="h-4 w-4" />}
            Continue with Google
          </button>

          <div className="my-6 flex items-center gap-4 text-xs uppercase tracking-[0.2em] text-slate-600">
            <span className="h-px flex-1 bg-white/10" />
            or
            <span className="h-px flex-1 bg-white/10" />
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label htmlFor="fullName" className="label-text">Full name</label>
              <input
                id="fullName"
                type="text"
                autoComplete="name"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="input-base"
                placeholder="Your name or boutique manager"
              />
            </div>
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
            <div>
              <label htmlFor="password" className="label-text">Password</label>
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
              <label htmlFor="confirmPassword" className="label-text">Confirm password</label>
              <input
                id="confirmPassword"
                type="password"
                autoComplete="new-password"
                required
                minLength={6}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="input-base"
                placeholder="Repeat your password"
              />
            </div>

            {error && (
              <p role="alert" className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
                {error}
              </p>
            )}

            <button type="submit" disabled={submitting} className="btn-primary w-full">
              {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
              Create account
            </button>
          </form>
        </>
      )}
    </AuthLayout>
  );
}
