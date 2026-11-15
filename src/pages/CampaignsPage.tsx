import { useCallback, useEffect, useState, type FormEvent } from 'react';
import {
  Clapperboard,
  Edit2,
  FolderOpen,
  FolderPlus,
  Loader2,
  Plus,
  Sparkles,
  Trash2,
  UserRound,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { Modal } from '@/components/Modal';
import { PageHeader } from '@/components/PageHeader';
import { useToast } from '@/contexts/ToastContext';
import { getAdImageUrl } from '@/lib/adGenerator';
import { getGeneratedImageUrl } from '@/lib/aiStudio';
import {
  createCampaign,
  deleteCampaign,
  fetchCampaignAssets,
  fetchCampaigns,
  updateCampaign,
} from '@/lib/campaigns';
import type { AiAdCreative, AiModelGeneration } from '@/types/ai';
import type { Campaign } from '@/types/marketing';

export function CampaignsPage() {
  const { notify } = useToast();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);

  // Active viewing campaign
  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null);
  const [campaignAssets, setCampaignAssets] = useState<{
    ads: AiAdCreative[];
    models: AiModelGeneration[];
  } | null>(null);
  const [loadingAssets, setLoadingAssets] = useState(false);

  // Modals
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [campaignName, setCampaignName] = useState('');
  const [savingCampaign, setSavingCampaign] = useState(false);

  const [editingCampaign, setEditingCampaign] = useState<Campaign | null>(null);
  const [editName, setEditName] = useState('');
  const [editingLoading, setEditingLoading] = useState(false);

  const [deletingCampaign, setDeletingCampaign] = useState<Campaign | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const loadCampaigns = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchCampaigns();
      setCampaigns(data);
      if (data.length > 0 && !selectedCampaign) {
        setSelectedCampaign(data[0]);
      }
    } catch (err) {
      notify(err instanceof Error ? err.message : 'Could not load campaigns.', 'error');
    } finally {
      setLoading(false);
    }
  }, [notify, selectedCampaign]);

  useEffect(() => {
    loadCampaigns();
  }, [loadCampaigns]);

  // Load assets when selectedCampaign changes
  useEffect(() => {
    if (!selectedCampaign) {
      setCampaignAssets(null);
      return;
    }
    setLoadingAssets(true);
    fetchCampaignAssets(selectedCampaign.id)
      .then(setCampaignAssets)
      .catch((err) => {
        notify(err instanceof Error ? err.message : 'Could not load campaign assets.', 'error');
      })
      .finally(() => setLoadingAssets(false));
  }, [selectedCampaign, notify]);

  const handleCreate = async (e: FormEvent) => {
    e.preventDefault();
    if (!campaignName.trim()) return;
    setSavingCampaign(true);
    try {
      const created = await createCampaign(campaignName.trim());
      setCampaigns((prev) => [created, ...prev]);
      setSelectedCampaign(created);
      notify(`Campaign "${created.name}" created!`);
      setCampaignName('');
      setCreateModalOpen(false);
    } catch (err) {
      notify(err instanceof Error ? err.message : 'Could not create campaign.', 'error');
    } finally {
      setSavingCampaign(false);
    }
  };

  const handleEdit = async (e: FormEvent) => {
    e.preventDefault();
    if (!editingCampaign || !editName.trim()) return;
    setEditingLoading(true);
    try {
      const updated = await updateCampaign(editingCampaign.id, editName.trim());
      setCampaigns((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
      if (selectedCampaign?.id === updated.id) {
        setSelectedCampaign(updated);
      }
      notify('Campaign updated.');
      setEditingCampaign(null);
    } catch (err) {
      notify(err instanceof Error ? err.message : 'Could not update campaign.', 'error');
    } finally {
      setEditingLoading(false);
    }
  };

  const confirmDelete = async () => {
    if (!deletingCampaign) return;
    setDeleteLoading(true);
    try {
      await deleteCampaign(deletingCampaign.id);
      setCampaigns((prev) => prev.filter((c) => c.id !== deletingCampaign.id));
      if (selectedCampaign?.id === deletingCampaign.id) {
        setSelectedCampaign(campaigns.find((c) => c.id !== deletingCampaign.id) || null);
      }
      notify(`Campaign "${deletingCampaign.name}" deleted.`);
      setDeletingCampaign(null);
    } catch (err) {
      notify(err instanceof Error ? err.message : 'Could not delete campaign.', 'error');
    } finally {
      setDeleteLoading(false);
    }
  };

  return (
    <div className="space-y-10">
      <PageHeader
        eyebrow="Marketing"
        title="Campaign Studio"
        description="Organize your jewellery marketing initiatives into structured campaigns with dedicated advertisements, fashion models, and captions."
        action={
          <button type="button" onClick={() => setCreateModalOpen(true)} className="btn-primary">
            <Plus className="h-4 w-4" /> New campaign
          </button>
        }
      />

      <div className="grid gap-8 lg:grid-cols-12">
        {/* Left: Campaign List */}
        <div className="space-y-4 lg:col-span-4">
          <div className="glass p-5">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="font-serif text-lg text-white">Your Campaigns</h3>
              <span className="text-xs text-slate-400">{campaigns.length} total</span>
            </div>

            {loading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-emerald-400" />
              </div>
            ) : campaigns.length === 0 ? (
              <div className="py-8 text-center">
                <Clapperboard className="mx-auto mb-3 h-8 w-8 text-slate-600" />
                <p className="text-xs text-slate-400">No campaigns yet. Create your first campaign above.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {campaigns.map((camp) => {
                  const isSelected = selectedCampaign?.id === camp.id;
                  return (
                    <div
                      key={camp.id}
                      onClick={() => setSelectedCampaign(camp)}
                      className={`group flex cursor-pointer items-center justify-between rounded-xl border p-3.5 transition-all ${
                        isSelected
                          ? 'border-champagne bg-champagne/15 text-white shadow-glow'
                          : 'border-white/5 bg-black/30 text-slate-300 hover:border-white/20'
                      }`}
                    >
                      <div className="min-w-0 pr-2">
                        <p className="truncate text-sm font-medium">{camp.name}</p>
                        <p className="text-[11px] text-slate-500">
                          {new Date(camp.created_at).toLocaleDateString(undefined, {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                          })}
                        </p>
                      </div>

                      <div className="flex shrink-0 items-center gap-1 opacity-60 group-hover:opacity-100">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingCampaign(camp);
                            setEditName(camp.name);
                          }}
                          className="rounded-lg p-1.5 text-slate-400 hover:bg-white/10 hover:text-white"
                          title="Rename campaign"
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setDeletingCampaign(camp);
                          }}
                          className="rounded-lg p-1.5 text-slate-400 hover:bg-red-500/20 hover:text-red-300"
                          title="Delete campaign"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right: Campaign Assets Viewer */}
        <div className="lg:col-span-8">
          {selectedCampaign ? (
            <div className="glass space-y-6 p-6 sm:p-8">
              <div className="flex flex-col gap-4 border-b border-white/5 pb-6 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <FolderOpen className="h-5 w-5 text-champagne" />
                    <h2 className="font-serif text-2xl text-white">{selectedCampaign.name}</h2>
                  </div>
                  <p className="mt-1 text-xs text-slate-400">
                    Created on {new Date(selectedCampaign.created_at).toLocaleDateString()}
                  </p>
                </div>

                <div className="flex flex-wrap gap-2">
                  <Link to="/ai-ads" className="btn-secondary text-xs">
                    <Sparkles className="h-3.5 w-3.5 text-champagne" /> New Ad Creative
                  </Link>
                  <Link to="/ai-models" className="btn-secondary text-xs">
                    <UserRound className="h-3.5 w-3.5 text-emerald-400" /> New Model Shot
                  </Link>
                </div>
              </div>

              {loadingAssets ? (
                <div className="flex justify-center py-16">
                  <Loader2 className="h-8 w-8 animate-spin text-emerald-400" />
                </div>
              ) : (
                <div className="space-y-8">
                  {/* Advertisements section */}
                  <div>
                    <h4 className="mb-4 text-xs font-semibold uppercase tracking-wider text-champagne">
                      Campaign Advertisements ({campaignAssets?.ads.length || 0})
                    </h4>
                    {campaignAssets?.ads.length === 0 ? (
                      <p className="rounded-xl border border-dashed border-white/5 p-6 text-center text-xs text-slate-500">
                        No advertisements attached to this campaign yet. Create one via the AI Ad Generator.
                      </p>
                    ) : (
                      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                        {campaignAssets?.ads.map((ad) => {
                          const url = getAdImageUrl(ad.image_path);
                          return (
                            <div
                              key={ad.id}
                              className="group relative overflow-hidden rounded-xl border border-white/10 bg-black/60"
                            >
                              <img src={url} alt={ad.prompt} className="aspect-square w-full object-cover" />
                              <div className="absolute inset-0 flex flex-col justify-end bg-gradient-to-t from-black/90 via-transparent p-3 opacity-0 transition-opacity group-hover:opacity-100">
                                <p className="line-clamp-2 text-xs text-white">{ad.caption || ad.prompt}</p>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Model Studio photographs */}
                  <div>
                    <h4 className="mb-4 text-xs font-semibold uppercase tracking-wider text-emerald-400">
                      Model Studio Photographs ({campaignAssets?.models.length || 0})
                    </h4>
                    {campaignAssets?.models.length === 0 ? (
                      <p className="rounded-xl border border-dashed border-white/5 p-6 text-center text-xs text-slate-500">
                        No model photographs attached to this campaign yet.
                      </p>
                    ) : (
                      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                        {campaignAssets?.models.map((mod) => {
                          const url = getGeneratedImageUrl(mod.image_path);
                          return (
                            <div
                              key={mod.id}
                              className="group relative overflow-hidden rounded-xl border border-white/10 bg-black/60"
                            >
                              <img src={url} alt={mod.prompt} className="aspect-square w-full object-cover" />
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="glass flex aspect-video flex-col items-center justify-center p-8 text-center">
              <Clapperboard className="mb-4 h-12 w-12 text-slate-600" />
              <h3 className="font-serif text-xl text-white">No campaign selected</h3>
              <p className="mt-1 text-xs text-slate-400">
                Choose a campaign on the left or create a new one to view its marketing assets.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Create Campaign Modal */}
      <Modal open={createModalOpen} onClose={() => setCreateModalOpen(false)} title="Create New Campaign">
        <form onSubmit={handleCreate} className="space-y-4">
          <div>
            <label htmlFor="campName" className="label-text">Campaign Name</label>
            <input
              id="campName"
              type="text"
              required
              value={campaignName}
              onChange={(e) => setCampaignName(e.target.value)}
              className="input-base"
              placeholder="e.g. Royal Bridal 2026, Summer Solstice Collection, Diwali Glow"
            />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => setCreateModalOpen(false)} className="btn-secondary">
              Cancel
            </button>
            <button type="submit" disabled={savingCampaign} className="btn-primary">
              {savingCampaign && <Loader2 className="h-4 w-4 animate-spin" />}
              Create Campaign
            </button>
          </div>
        </form>
      </Modal>

      {/* Edit Campaign Modal */}
      <Modal open={editingCampaign !== null} onClose={() => setEditingCampaign(null)} title="Rename Campaign">
        <form onSubmit={handleEdit} className="space-y-4">
          <div>
            <label htmlFor="editCampName" className="label-text">Campaign Name</label>
            <input
              id="editCampName"
              type="text"
              required
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              className="input-base"
            />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => setEditingCampaign(null)} className="btn-secondary">
              Cancel
            </button>
            <button type="submit" disabled={editingLoading} className="btn-primary">
              {editingLoading && <Loader2 className="h-4 w-4 animate-spin" />}
              Save Changes
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Campaign Confirmation */}
      <ConfirmDialog
        open={deletingCampaign !== null}
        title="Delete this campaign?"
        description={`"${deletingCampaign?.name ?? ''}" will be removed. Associated advertisements and photographs will remain safely in your library.`}
        confirmLabel="Delete Campaign"
        loading={deleteLoading}
        onConfirm={confirmDelete}
        onCancel={() => setDeletingCampaign(null)}
      />
    </div>
  );
}
