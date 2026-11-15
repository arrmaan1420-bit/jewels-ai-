import { useCallback, useEffect, useState, type FormEvent } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  ExternalLink,
  HelpCircle,
  Instagram,
  Loader2,
  Lock,
  Plus,
  RefreshCw,
  Send,
  Trash2,
  Unlink,
} from 'lucide-react';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { Modal } from '@/components/Modal';
import { PageHeader } from '@/components/PageHeader';
import { useToast } from '@/contexts/ToastContext';
import { fetchAiAds, getAdImageUrl } from '@/lib/adGenerator';
import {
  connectInstagramAccount,
  disconnectInstagramAccount,
  fetchInstagramAccount,
  publishToInstagram,
} from '@/lib/instagram';
import type { AiAdCreative } from '@/types/ai';
import type { InstagramAccount } from '@/types/marketing';

export function InstagramPage() {
  const { notify } = useToast();
  const [account, setAccount] = useState<InstagramAccount | null>(null);
  const [loading, setLoading] = useState(true);
  const [ads, setAds] = useState<AiAdCreative[]>([]);

  // Connect dialog
  const [connectOpen, setConnectOpen] = useState(false);
  const [igUserId, setIgUserId] = useState('');
  const [igUsername, setIgUsername] = useState('');
  const [igToken, setIgToken] = useState('');
  const [connecting, setConnecting] = useState(false);

  // Disconnect dialog
  const [disconnecting, setDisconnecting] = useState(false);
  const [disconnectOpen, setDisconnectOpen] = useState(false);

  // Direct publishing modal
  const [publishModalOpen, setPublishModalOpen] = useState(false);
  const [selectedAd, setSelectedAd] = useState<AiAdCreative | null>(null);
  const [customCaption, setCustomCaption] = useState('');
  const [publishing, setPublishing] = useState(false);

  const loadAccount = useCallback(async () => {
    setLoading(true);
    try {
      const [acc, adList] = await Promise.all([
        fetchInstagramAccount(),
        fetchAiAds(),
      ]);
      setAccount(acc);
      setAds(adList);
    } catch (err) {
      notify(err instanceof Error ? err.message : 'Could not check Instagram connection.', 'error');
    } finally {
      setLoading(false);
    }
  }, [notify]);

  useEffect(() => {
    loadAccount();
  }, [loadAccount]);

  const handleConnect = async (e: FormEvent) => {
    e.preventDefault();
    if (!igUserId.trim() || !igUsername.trim() || !igToken.trim()) {
      notify('Please fill all required Meta credentials.', 'error');
      return;
    }
    setConnecting(true);
    try {
      const connected = await connectInstagramAccount({
        instagramUserId: igUserId.trim(),
        username: igUsername.trim(),
        accessToken: igToken.trim(),
      });
      setAccount(connected);
      notify(`Connected to @${connected.username}!`);
      setConnectOpen(false);
      setIgToken('');
    } catch (err) {
      notify(err instanceof Error ? err.message : 'Failed to connect Instagram account.', 'error');
    } finally {
      setConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    if (!account) return;
    setDisconnecting(true);
    try {
      await disconnectInstagramAccount(account.id);
      setAccount(null);
      notify('Instagram account disconnected.');
      setDisconnectOpen(false);
    } catch (err) {
      notify(err instanceof Error ? err.message : 'Could not disconnect account.', 'error');
    } finally {
      setDisconnecting(false);
    }
  };

  const openPublishModal = (ad: AiAdCreative) => {
    setSelectedAd(ad);
    setCustomCaption(`${ad.caption}\n\n${ad.hashtags}`.trim());
    setPublishModalOpen(true);
  };

  const handlePublishNow = async () => {
    if (!selectedAd || !account) return;
    setPublishing(true);
    try {
      const imageUrl = getAdImageUrl(selectedAd.image_path);
      const res = await publishToInstagram(imageUrl, customCaption);
      notify(res.message || 'Post published successfully to Instagram!');
      setPublishModalOpen(false);
    } catch (err) {
      notify(err instanceof Error ? err.message : 'Instagram publication failed.', 'error');
    } finally {
      setPublishing(false);
    }
  };

  return (
    <div className="space-y-10">
      <PageHeader
        eyebrow="Meta API"
        title="Instagram Publishing"
        description="Connect your Instagram Professional (Business or Creator) account to publish advertisements, stories and product campaigns directly from your studio."
      />

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-emerald-400" />
        </div>
      ) : account ? (
        /* Connected State */
        <div className="space-y-8">
          <section className="glass flex flex-col gap-6 p-6 sm:flex-row sm:items-center sm:justify-between sm:p-8">
            <div className="flex items-center gap-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-champagne/40 bg-gradient-to-br from-pink-500/20 via-purple-500/20 to-emerald-500/20">
                <Instagram className="h-8 w-8 text-champagne" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="font-serif text-2xl text-white">@{account.username}</h2>
                  <span className="rounded-full bg-emerald-500/20 px-2.5 py-0.5 text-xs font-medium text-emerald-300">
                    Connected
                  </span>
                </div>
                <p className="mt-1 text-xs text-slate-400">
                  Account ID: {account.instagram_user_id} • Type: {account.account_type}
                </p>
                <p className="text-[11px] text-slate-500">
                  Connected on {new Date(account.connected_at).toLocaleDateString()}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setDisconnectOpen(true)}
                className="btn-secondary text-xs hover:border-red-500/40 hover:text-red-300"
              >
                <Unlink className="h-3.5 w-3.5" /> Disconnect
              </button>
            </div>
          </section>

          {/* Quick Publish Approved Creatives */}
          <section className="glass p-6 sm:p-8">
            <div className="mb-6 flex items-center justify-between">
              <div>
                <h3 className="font-serif text-2xl text-white">Publish Approved Creatives</h3>
                <p className="mt-1 text-xs text-slate-400">
                  Select an advertisement from your library to publish immediately to Instagram feed.
                </p>
              </div>
              <span className="text-xs text-slate-400">{ads.length} available</span>
            </div>

            {ads.length === 0 ? (
              <p className="py-10 text-center text-sm text-slate-500">
                No generated advertisements available. Generate an advertisement in AI Ad Generator first.
              </p>
            ) : (
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
                {ads.map((ad) => {
                  const url = getAdImageUrl(ad.image_path);
                  return (
                    <div
                      key={ad.id}
                      className="group relative overflow-hidden rounded-xl border border-white/10 bg-black/60 transition-all hover:border-champagne"
                    >
                      <img src={url} alt={ad.prompt} className="aspect-square w-full object-cover" />
                      <div className="absolute inset-0 flex flex-col justify-end bg-gradient-to-t from-black/90 via-transparent p-3 opacity-0 transition-opacity group-hover:opacity-100">
                        <button
                          type="button"
                          onClick={() => openPublishModal(ad)}
                          className="btn-primary w-full py-1.5 text-xs font-semibold"
                        >
                          <Send className="h-3 w-3" /> Publish Post
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        </div>
      ) : (
        /* Not Connected State */
        <div className="grid gap-8 lg:grid-cols-12">
          <div className="glass space-y-6 p-6 sm:p-8 lg:col-span-7">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-champagne/30 bg-emerald-deep">
              <Instagram className="h-7 w-7 text-champagne" />
            </div>

            <div>
              <h2 className="font-serif text-2xl text-white">Connect Instagram Professional</h2>
              <p className="mt-2 text-sm text-slate-300">
                Link your Meta Instagram Business or Creator account to enable direct one-click publishing and scheduled automated campaigns.
              </p>
            </div>

            <div className="rounded-xl border border-emerald-500/20 bg-emerald-950/20 p-4 text-xs text-slate-300 space-y-2">
              <p className="font-semibold text-emerald-300 flex items-center gap-1.5">
                <CheckCircle2 className="h-4 w-4" /> Official Meta Graph API Integration
              </p>
              <p>• Only official Meta endpoints are utilized for maximum security.</p>
              <p>• Tokens are protected securely with server-side Supabase verification.</p>
              <p>• Requires an Instagram Professional (Business or Creator) account linked to a Facebook Page.</p>
            </div>

            <button
              type="button"
              onClick={() => setConnectOpen(true)}
              className="btn-primary flex items-center gap-2 py-3"
            >
              <Instagram className="h-4 w-4" /> Connect Instagram Account
            </button>
          </div>

          {/* Meta Developer Setup Instructions Guide */}
          <div className="glass space-y-5 p-6 lg:col-span-5">
            <div className="flex items-center gap-2">
              <HelpCircle className="h-5 w-5 text-champagne" />
              <h3 className="font-serif text-lg text-white">Meta Developer Setup Guide</h3>
            </div>
            <p className="text-xs text-slate-400">
              Follow these simple steps in Meta Developer Portal to obtain your publishing credentials:
            </p>

            <ol className="space-y-3 text-xs text-slate-300 list-decimal pl-4">
              <li>
                Visit the <a href="https://developers.facebook.com" target="_blank" rel="noreferrer" className="text-champagne underline">Meta for Developers</a> dashboard and log in.
              </li>
              <li>
                Click <strong>My Apps</strong> → <strong>Create App</strong> → Select <strong>Business</strong>.
              </li>
              <li>
                Add the <strong>Instagram Graph API</strong> product to your app.
              </li>
              <li>
                In the <strong>Graph API Explorer</strong>, request the following permissions:
                <code className="mt-1 block rounded bg-black/60 p-1.5 text-emerald-400">
                  instagram_basic, instagram_content_publish, pages_show_list
                </code>
              </li>
              <li>
                Generate a User Access Token and click <strong>Connect Instagram Account</strong> to link your studio.
              </li>
            </ol>
          </div>
        </div>
      )}

      {/* Connect Instagram Modal */}
      <Modal open={connectOpen} onClose={() => setConnectOpen(false)} title="Connect Instagram Professional">
        <form onSubmit={handleConnect} className="space-y-4">
          <p className="text-xs text-slate-300">
            Enter your Instagram Business Account ID and Meta Graph User Access Token.
          </p>

          <div>
            <label htmlFor="igUser" className="label-text">Instagram Business Account ID</label>
            <input
              id="igUser"
              type="text"
              required
              value={igUserId}
              onChange={(e) => setIgUserId(e.target.value)}
              className="input-base"
              placeholder="e.g. 17841400000000000"
            />
          </div>

          <div>
            <label htmlFor="igName" className="label-text">Instagram Handle (@username)</label>
            <input
              id="igName"
              type="text"
              required
              value={igUsername}
              onChange={(e) => setIgUsername(e.target.value)}
              className="input-base"
              placeholder="yourboutique_jewels"
            />
          </div>

          <div>
            <label htmlFor="igTok" className="label-text">User Access Token</label>
            <input
              id="igTok"
              type="password"
              required
              value={igToken}
              onChange={(e) => setIgToken(e.target.value)}
              className="input-base"
              placeholder="EAAG..."
            />
            <p className="mt-1 text-[11px] text-slate-500">
              Stored securely on your private Supabase database.
            </p>
          </div>

          <div className="flex justify-end gap-3 pt-3">
            <button type="button" onClick={() => setConnectOpen(false)} className="btn-secondary">
              Cancel
            </button>
            <button type="submit" disabled={connecting} className="btn-primary">
              {connecting && <Loader2 className="h-4 w-4 animate-spin" />}
              Save & Authorize
            </button>
          </div>
        </form>
      </Modal>

      {/* Direct Publish Modal */}
      <Modal open={publishModalOpen} onClose={() => setPublishModalOpen(false)} title="Publish to Instagram">
        <div className="space-y-4">
          {selectedAd && (
            <div className="flex gap-4 items-center rounded-xl border border-white/10 bg-black/40 p-3">
              <img
                src={getAdImageUrl(selectedAd.image_path)}
                alt="Selected"
                className="h-16 w-16 rounded-lg object-cover"
              />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-white">{selectedAd.product_name || 'Jewellery Creative'}</p>
                <p className="text-xs text-slate-400">Publishing to @{account?.username}</p>
              </div>
            </div>
          )}

          <div>
            <label htmlFor="postCap" className="label-text">Review Caption & Hashtags</label>
            <textarea
              id="postCap"
              rows={5}
              value={customCaption}
              onChange={(e) => setCustomCaption(e.target.value)}
              className="input-base text-xs"
            />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => setPublishModalOpen(false)} className="btn-secondary">
              Cancel
            </button>
            <button
              type="button"
              onClick={handlePublishNow}
              disabled={publishing}
              className="btn-primary"
            >
              {publishing && <Loader2 className="h-4 w-4 animate-spin" />}
              <Send className="h-4 w-4" /> Publish Now
            </button>
          </div>
        </div>
      </Modal>

      {/* Disconnect Confirmation */}
      <ConfirmDialog
        open={disconnectOpen}
        title="Disconnect Instagram?"
        description={`Are you sure you want to unlink @${account?.username ?? ''}? Scheduled posts will not be able to publish automatically until you reconnect.`}
        confirmLabel="Disconnect"
        loading={disconnecting}
        onConfirm={handleDisconnect}
        onCancel={() => setDisconnectOpen(false)}
      />
    </div>
  );
}
