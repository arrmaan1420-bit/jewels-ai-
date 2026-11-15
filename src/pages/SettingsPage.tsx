import { useEffect, useState, type FormEvent } from 'react';
import { ExternalLink, KeyRound, Loader2, Lock } from 'lucide-react';
import { PageHeader } from '@/components/PageHeader';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import { getAuthErrorMessage } from '@/lib/authErrors';
import { getGoogleAiKey, setGoogleAiKey } from '@/lib/googleAi';
import { supabase } from '@/lib/supabase';

interface ProfileForm {
  fullName: string;
  brandName: string;
}

export function SettingsPage() {
  const { user, updatePassword } = useAuth();
  const { notify } = useToast();
  const [profile, setProfile] = useState<ProfileForm>({ fullName: '', brandName: '' });
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [savingProfile, setSavingProfile] = useState(false);

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [savingPassword, setSavingPassword] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  const [googleKey, setGoogleKey] = useState(getGoogleAiKey());
  const [savingGoogleKey, setSavingGoogleKey] = useState(false);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('full_name, brand_name')
        .eq('id', user.id)
        .maybeSingle();
      if (cancelled) return;
      if (error) {
        setProfileError(error.message);
      } else {
        setProfile({
          fullName: data?.full_name ?? '',
          brandName: data?.brand_name ?? '',
        });
      }
      setLoadingProfile(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [user]);

  const handleProfileSave = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!user) return;
    setSavingProfile(true);
    const { error } = await supabase.from('profiles').upsert({
      id: user.id,
      full_name: profile.fullName.trim(),
      brand_name: profile.brandName.trim(),
    });
    setSavingProfile(false);
    if (error) {
      notify('We could not save your profile. Please try again.', 'error');
      return;
    }
    notify('Profile saved.');
  };

  const handlePasswordSave = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setPasswordError(null);
    if (newPassword !== confirmPassword) {
      setPasswordError('Passwords do not match.');
      return;
    }
    setSavingPassword(true);
    try {
      await updatePassword(newPassword);
      setNewPassword('');
      setConfirmPassword('');
      notify('Password updated.');
    } catch (err) {
      setPasswordError(getAuthErrorMessage(err));
    } finally {
      setSavingPassword(false);
    }
  };

  const handleGoogleKeySave = (e: FormEvent) => {
    e.preventDefault();
    setSavingGoogleKey(true);
    setGoogleAiKey(googleKey.trim());
    setSavingGoogleKey(false);
    notify('Google AI Studio API key updated successfully.');
  };

  return (
    <div className="space-y-10">
      <PageHeader eyebrow="Account" title="Settings" description="Manage your personal profile, Google AI integration, and sign-in security." />

      <div className="grid gap-6 xl:grid-cols-2">
        {/* Profile Card */}
        <section className="glass p-6 sm:p-8">
          <h2 className="font-serif text-2xl">Profile</h2>
          <p className="mt-1 text-sm text-slate-400">How your name and boutique appear across JEWELS AI.</p>

          {loadingProfile ? (
            <div className="mt-8 flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-emerald-400" />
            </div>
          ) : (
            <form onSubmit={handleProfileSave} className="mt-8 space-y-5">
              <div>
                <label htmlFor="email" className="label-text">Email</label>
                <input id="email" className="input-base opacity-60" value={user?.email ?? ''} disabled />
              </div>
              <div>
                <label htmlFor="fullName" className="label-text">Full name</label>
                <input
                  id="fullName"
                  className="input-base"
                  value={profile.fullName}
                  maxLength={120}
                  onChange={(e) => setProfile((p) => ({ ...p, fullName: e.target.value }))}
                />
              </div>
              <div>
                <label htmlFor="brandName" className="label-text">Boutique or brand name</label>
                <input
                  id="brandName"
                  className="input-base"
                  value={profile.brandName}
                  maxLength={120}
                  onChange={(e) => setProfile((p) => ({ ...p, brandName: e.target.value }))}
                />
              </div>
              {profileError && <p role="alert" className="text-sm text-red-300">{profileError}</p>}
              <button type="submit" disabled={savingProfile || loadingProfile} className="btn-primary">
                {savingProfile && <Loader2 className="h-4 w-4 animate-spin" />}
                Save profile
              </button>
            </form>
          )}
        </section>

        {/* Google AI Studio API Key Card */}
        <section className="glass p-6 sm:p-8">
          <div className="flex items-center justify-between">
            <h2 className="font-serif text-2xl">Google AI Studio</h2>
            <KeyRound className="h-5 w-5 text-champagne" />
          </div>
          <p className="mt-1 text-sm text-slate-400">
            Powers the AI Ad Generator, Imagen 3, and luxury copywriting.
          </p>

          <form onSubmit={handleGoogleKeySave} className="mt-8 space-y-5">
            <div>
              <div className="mb-2 flex items-center justify-between">
                <label htmlFor="apiKey" className="label-text mb-0">API Key</label>
                <a
                  href="https://aistudio.google.com/app/apikey"
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-xs text-champagne hover:underline"
                >
                  Get key from Google AI Studio <ExternalLink className="h-3 w-3" />
                </a>
              </div>
              <input
                id="apiKey"
                type="password"
                className="input-base font-mono text-xs"
                value={googleKey}
                onChange={(e) => setGoogleKey(e.target.value)}
                placeholder="AIzaSy..."
              />
              <p className="mt-1.5 flex items-center gap-1 text-xs text-slate-500">
                <Lock className="h-3 w-3 text-emerald-400" />
                Stored securely on your private device.
              </p>
            </div>

            <button type="submit" disabled={savingGoogleKey} className="btn-secondary">
              {savingGoogleKey && <Loader2 className="h-4 w-4 animate-spin" />}
              Save Google AI Key
            </button>
          </form>
        </section>

        {/* Password Card */}
        <section className="glass p-6 sm:p-8 xl:col-span-2">
          <h2 className="font-serif text-2xl">Password</h2>
          <p className="mt-1 text-sm text-slate-400">Choose a new password for your account.</p>

          <form onSubmit={handlePasswordSave} className="mt-8 space-y-5 max-w-xl">
            <div>
              <label htmlFor="newPassword" className="label-text">New password</label>
              <input
                id="newPassword"
                type="password"
                autoComplete="new-password"
                minLength={6}
                required
                className="input-base"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
              />
            </div>
            <div>
              <label htmlFor="confirmNewPassword" className="label-text">Confirm new password</label>
              <input
                id="confirmNewPassword"
                type="password"
                autoComplete="new-password"
                minLength={6}
                required
                className="input-base"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
            </div>
            {passwordError && <p role="alert" className="text-sm text-red-300">{passwordError}</p>}
            <button type="submit" disabled={savingPassword} className="btn-secondary">
              {savingPassword && <Loader2 className="h-4 w-4 animate-spin" />}
              Update password
            </button>
          </form>
        </section>
      </div>
    </div>
  );
}
