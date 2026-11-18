import { useCallback, useEffect, useState, type FormEvent } from 'react';
import {
  ArrowLeft,
  Check,
  Clapperboard,
  Copy,
  Download,
  Edit2,
  FolderOpen,
  FolderPlus,
  Layers,
  Loader2,
  Plus,
  RefreshCw,
  Sparkles,
  Trash2,
  UserRound,
  Wand2,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { Modal } from '@/components/Modal';
import { PageHeader } from '@/components/PageHeader';
import { ProductThumb } from '@/components/products/ProductThumb';
import { useToast } from '@/contexts/ToastContext';
import { generateAdCreative, getAdImageUrl } from '@/lib/adGenerator';
import { getGeneratedImageUrl } from '@/lib/aiStudio';
import {
  createCampaign,
  deleteCampaign,
  fetchCampaignAssets,
  fetchCampaigns,
  updateCampaign,
} from '@/lib/campaigns';
import {
  analyzeJewelleryVisuals,
  hasGoogleAiKey,
  MODEL_ETHNICITIES,
  type JewelleryVisualAnalysis,
} from '@/lib/googleAi';
import { fetchProducts } from '@/lib/products';
import type { AiAdCreative, AiModelGeneration } from '@/types/ai';
import type { Campaign } from '@/types/marketing';
import type { Product } from '@/types/product';

const WIZARD_FORMATS = [
  { id: '1:1', label: '1:1 Square', hint: 'Instagram & Facebook Feed' },
  { id: '4:5', label: '4:5 Portrait', hint: 'Feed Posts (Max Screen Area)' },
  { id: '9:16', label: '9:16 Vertical', hint: 'Stories & Reels Cover' },
  { id: '16:9', label: '16:9 Landscape', hint: 'Website Banner & Meta Landscape' },
];

const CONCEPT_TEMPLATES = [
  {
    title: '👑 Royal Indian Bridal',
    prompt: 'Regal Indian wedding campaign with an opulent royal bride, emerald palace backdrop, warm glowing diya candlelight, and cinematic golden hour illumination.',
  },
  {
    title: '🇫🇷 Parisian High-Fashion Editorial',
    prompt: 'Vogue-standard high-fashion editorial campaign with a Parisian model, dramatic chiaroscuro studio strobe lighting, and haute-couture silk styling.',
  },
  {
    title: '🪷 Modern Quiet Luxury',
    prompt: 'Contemporary quiet-luxury campaign on warm travertine marble slabs with soft natural diffused daylight and understated architectural minimalism.',
  },
  {
    title: '💎 Obsidian Macro Still-Life',
    prompt: 'Hyper-detailed macro fine jewellery campaign on polished black obsidian mirror with crystalline double reflections and crisp diamond facet brilliance.',
  },
];

export function CampaignsPage() {
  const { notify } = useToast();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
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

  // ---------------------------------------------------------------------------
  // Module Three: AI Campaign Generator 6-Step Wizard State
  // ---------------------------------------------------------------------------
  const [wizardOpen, setWizardOpen] = useState(false);
  const [wizardStep, setWizardStep] = useState(1);
  const [wizardProduct, setWizardProduct] = useState<Product | null>(null);
  const [visionAnalysis, setVisionAnalysis] = useState<JewelleryVisualAnalysis | null>(null);
  const [analyzingVision, setAnalyzingVision] = useState(false);
  const [wizardConcept, setWizardConcept] = useState('');
  const [wizardFormat, setWizardFormat] = useState('1:1');
  const [wizardCreativeMode, setWizardCreativeMode] = useState<'editorialModel' | 'macroStudio'>('editorialModel');
  const [wizardEthnicity, setWizardEthnicity] = useState('autoDiverse');
  const [generatingCampaign, setGeneratingCampaign] = useState(false);
  const [campaignDeliverables, setCampaignDeliverables] = useState<{
    imageUrl: string;
    headline: string;
    caption: string;
    promotionalDescription: string;
    cta: string;
    hashtags: string;
    metaPrimaryText: string;
    metaHeadline: string;
    targetAudience: string;
  } | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [camps, prods] = await Promise.all([fetchCampaigns(), fetchProducts()]);
      setCampaigns(camps);
      setProducts(prods);
      if (camps.length > 0 && !selectedCampaign) {
        setSelectedCampaign(camps[0]);
      }
    } catch (err) {
      notify(err instanceof Error ? err.message : 'Could not load campaigns.', 'error');
    } finally {
      setLoading(false);
    }
  }, [notify, selectedCampaign]);

  useEffect(() => {
    loadData();
  }, [loadData]);

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

  // ---------------------------------------------------------------------------
  // AI Campaign Wizard Handlers
  // ---------------------------------------------------------------------------
  const openWizard = () => {
    setWizardStep(1);
    setCampaignDeliverables(null);
    if (products.length > 0 && !wizardProduct) {
      setWizardProduct(products[0]);
    }
    setWizardOpen(true);
  };

  const handleSelectWizardProduct = async (prod: Product) => {
    setWizardProduct(prod);
    setAnalyzingVision(true);
    try {
      const url = getAdImageUrl(prod.image_path);
      const analysis = await analyzeJewelleryVisuals(url);
      setVisionAnalysis(analysis);
    } catch (err) {
      console.warn('Vision analysis notice:', err);
    } finally {
      setAnalyzingVision(false);
    }
  };

  const handleRunCampaignGeneration = async () => {
    if (!wizardProduct) {
      notify('Please select a product first.', 'error');
      return;
    }
    if (!hasGoogleAiKey()) {
      notify('Please set your Google AI Studio API key in Settings or AI Ad Generator.', 'error');
      return;
    }

    setGeneratingCampaign(true);
    try {
      const result = await generateAdCreative({
        productId: wizardProduct.id,
        adStyle: wizardCreativeMode === 'macroStudio' ? 'premiumProduct' : 'luxuryEditorial',
        theme: visionAnalysis?.recommendedTheme || 'midnightVelvet',
        aspectRatio: wizardFormat,
        creativeMode: wizardCreativeMode,
        modelEthnicity: wizardEthnicity,
        forensicDescription: visionAnalysis?.forensicDescription,
        customPrompt: wizardConcept.trim() || undefined,
        campaignId: selectedCampaign?.id,
      });

      const headline = `The ${wizardProduct.name} Haute Joaillerie Campaign`;
      const promoDesc = `Masterfully handcrafted in ${wizardProduct.material || '18K Yellow Gold'} with radiant ${wizardProduct.gemstone || 'fine gems'}. Designed for discerning collectors of timeless luxury.`;
      const metaPrimary = `Discover artisanal perfection. The new ${wizardProduct.name} combines heritage craftsmanship with modern distinction. Tap to enquire for private showroom appointments and bespoke orders.`;
      const metaHead = `Bespoke Fine Jewellery | ${wizardProduct.name}`;
      const audience = `Affluent high-net-worth individuals, bridal shoppers, luxury fine jewellery collectors, age 26-55, interests in Haute Joaillerie, Cartier, Tiffany, Vogue, and heirloom fine gifts.`;

      setCampaignDeliverables({
        imageUrl: result.imageUrl,
        headline,
        caption: result.caption,
        promotionalDescription: promoDesc,
        cta: 'Book Private Viewing / DM for Enquiries',
        hashtags: result.hashtags,
        metaPrimaryText: metaPrimary,
        metaHeadline: metaHead,
        targetAudience: audience,
      });

      setWizardStep(6);
      notify('Full AI Campaign pack generated successfully!');
      if (selectedCampaign) {
        fetchCampaignAssets(selectedCampaign.id).then(setCampaignAssets);
      }
    } catch (err) {
      notify(err instanceof Error ? err.message : 'Campaign generation failed.', 'error');
    } finally {
      setGeneratingCampaign(false);
    }
  };

  const copyToClipboard = async (text: string, fieldName: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(fieldName);
      notify(`${fieldName} copied to clipboard!`);
      setTimeout(() => setCopiedField(null), 2500);
    } catch {
      notify('Could not copy automatically.', 'error');
    }
  };

  const handleDownloadDeliverable = async (url: string) => {
    try {
      const res = await fetch(url);
      const blob = await res.blob();
      const objUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = objUrl;
      a.download = `${wizardProduct?.name || 'jewels-ai'}-campaign.jpg`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(objUrl);
    } catch {
      window.open(url, '_blank');
    }
  };

  return (
    <div className="space-y-10">
      <PageHeader
        eyebrow="Marketing"
        title="Campaign Studio"
        description="Organize your jewellery marketing initiatives into structured campaigns with dedicated advertisements, fashion models, and multi-channel deliverables."
        action={
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={openWizard}
              className="btn-primary shadow-glow inline-flex items-center gap-2"
            >
              <Sparkles className="h-4 w-4 text-champagne" />
              AI Campaign Generator
            </button>
            <button type="button" onClick={() => setCreateModalOpen(true)} className="btn-secondary">
              <Plus className="h-4 w-4" /> New campaign
            </button>
          </div>
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
                <p className="text-xs text-slate-400">No campaigns yet. Launch the AI Campaign Generator above.</p>
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
                  <button
                    type="button"
                    onClick={openWizard}
                    className="btn-primary text-xs shadow-glow inline-flex items-center gap-1.5"
                  >
                    <Sparkles className="h-3.5 w-3.5 text-champagne" /> Generate Campaign Kit
                  </button>
                  <Link to="/ai-ads" className="btn-secondary text-xs">
                    <Plus className="h-3.5 w-3.5" /> Custom Ad
                  </Link>
                  <Link to="/ai-models" className="btn-secondary text-xs">
                    <UserRound className="h-3.5 w-3.5 text-emerald-400" /> Model Shoot
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
                      Campaign Creatives ({campaignAssets?.ads.length || 0})
                    </h4>
                    {campaignAssets?.ads.length === 0 ? (
                      <p className="rounded-xl border border-dashed border-white/5 p-6 text-center text-xs text-slate-500">
                        No advertisements attached to this campaign yet. Click &quot;Generate Campaign Kit&quot; above to create one.
                      </p>
                    ) : (
                      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                        {campaignAssets?.ads.map((ad) => {
                          const url = getAdImageUrl(ad.image_path);
                          return (
                            <div
                              key={ad.id}
                              className="group relative overflow-hidden rounded-xl border border-white/10 bg-black/60 shadow-sm"
                            >
                              <img src={url} alt={ad.prompt} className="aspect-square w-full object-cover" />
                              <div className="absolute inset-0 flex flex-col justify-end bg-gradient-to-t from-black/90 via-black/40 to-transparent p-3 opacity-0 transition-opacity group-hover:opacity-100">
                                <p className="line-clamp-2 text-xs text-white">{ad.caption || ad.prompt}</p>
                                <span className="mt-1 text-[10px] text-champagne font-medium">{ad.ad_style}</span>
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
                              className="group relative overflow-hidden rounded-xl border border-white/10 bg-black/60 shadow-sm"
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
            <div className="glass p-12 text-center">
              <FolderPlus className="mx-auto mb-3 h-10 w-10 text-slate-600" />
              <h3 className="font-serif text-lg text-white">Select a campaign</h3>
              <p className="mt-1 text-xs text-slate-400">
                Choose a campaign on the left or launch the AI Campaign Generator above.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* --------------------------------------------------------------------- */}
      {/* 6-STEP AI CAMPAIGN GENERATOR MODAL                                    */}
      {/* --------------------------------------------------------------------- */}
      <Modal
        open={wizardOpen}
        onClose={() => setWizardOpen(false)}
        title="AI Campaign Generator Studio"
      >
        <div className="space-y-6">
          {/* Progress Indicator */}
          <div className="flex items-center justify-between border-b border-white/10 pb-4">
            {[1, 2, 3, 4, 5, 6].map((s) => (
              <div key={s} className="flex items-center gap-1.5">
                <span
                  className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold transition-all ${
                    wizardStep === s
                      ? 'bg-champagne text-onyx shadow-glow'
                      : wizardStep > s
                      ? 'bg-emerald-500 text-white'
                      : 'border border-white/10 bg-black/40 text-slate-500'
                  }`}
                >
                  {wizardStep > s ? <Check className="h-3 w-3 stroke-[3]" /> : s}
                </span>
                <span className="hidden text-[11px] font-medium text-slate-400 sm:inline">
                  {s === 1
                    ? 'Product'
                    : s === 2
                    ? 'Vision'
                    : s === 3
                    ? 'Concept'
                    : s === 4
                    ? 'Format'
                    : s === 5
                    ? 'Produce'
                    : 'Deliverables'}
                </span>
              </div>
            ))}
          </div>

          {/* STEP 1: Select Product */}
          {wizardStep === 1 && (
            <div className="space-y-4">
              <div>
                <h4 className="font-serif text-lg text-white">Step 1: Select Hero Jewellery Piece</h4>
                <p className="text-xs text-slate-400">
                  Choose the authentic jewellery piece from your library to headline this advertising campaign.
                </p>
              </div>

              {products.length === 0 ? (
                <div className="rounded-xl border border-dashed border-white/10 p-8 text-center">
                  <p className="text-sm text-slate-400">No products uploaded yet.</p>
                  <Link to="/products?new=1" className="btn-primary mt-4 inline-flex items-center gap-2">
                    <Plus className="h-4 w-4" /> Upload jewellery first
                  </Link>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 max-h-72 overflow-y-auto pr-1">
                  {products.map((p) => {
                    const isSelected = wizardProduct?.id === p.id;
                    return (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => handleSelectWizardProduct(p)}
                        className={`group relative flex flex-col items-center rounded-xl border p-2 text-left transition-all ${
                          isSelected
                            ? 'border-champagne bg-champagne/15 shadow-glow'
                            : 'border-white/10 bg-black/40 hover:border-white/20'
                        }`}
                      >
                        <div className="aspect-square w-full overflow-hidden rounded-lg">
                          <ProductThumb imagePath={p.image_path} alt={p.name} />
                        </div>
                        <p className="mt-2 w-full truncate text-center text-xs font-medium text-white">{p.name}</p>
                        <span className="text-[10px] text-slate-400">{p.category}</span>
                        {isSelected && (
                          <span className="absolute right-2 top-2 rounded-full bg-champagne p-1 text-onyx shadow">
                            <Check className="h-3 w-3 stroke-[3]" />
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}

              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  disabled={!wizardProduct}
                  onClick={() => setWizardStep(2)}
                  className="btn-primary"
                >
                  Next: AI Vision Analysis <ArrowLeft className="h-4 w-4 rotate-180" />
                </button>
              </div>
            </div>
          )}

          {/* STEP 2: Automatic AI Analysis */}
          {wizardStep === 2 && (
            <div className="space-y-4">
              <div>
                <h4 className="font-serif text-lg text-white">Step 2: AI Jewellery Vision Analysis</h4>
                <p className="text-xs text-slate-400">
                  Gemini Vision extracts the forensic blueprint (metal, chain links, stones, and bail) to ensure 100% exact product preservation.
                </p>
              </div>

              {analyzingVision ? (
                <div className="flex flex-col items-center justify-center rounded-xl border border-white/10 bg-black/40 py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-champagne" />
                  <p className="mt-3 text-xs text-slate-300">Extracting physical jewellery contours and prongs...</p>
                </div>
              ) : (
                <div className="space-y-3 rounded-xl border border-emerald-500/30 bg-emerald-950/20 p-4">
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-champagne" />
                    <span className="text-xs font-semibold text-white">Forensic Geometry Blueprint Locked</span>
                  </div>
                  <div className="grid gap-2 text-xs sm:grid-cols-2">
                    <div className="rounded-lg bg-black/40 p-2.5">
                      <span className="text-slate-400">Product Name:</span>
                      <p className="font-medium text-white">{visionAnalysis?.suggestedName || wizardProduct?.name}</p>
                    </div>
                    <div className="rounded-lg bg-black/40 p-2.5">
                      <span className="text-slate-400">Precious Metal:</span>
                      <p className="font-medium text-white">{visionAnalysis?.material || wizardProduct?.material || '18K Yellow Gold'}</p>
                    </div>
                    <div className="rounded-lg bg-black/40 p-2.5">
                      <span className="text-slate-400">Gemstone Details:</span>
                      <p className="font-medium text-white">{visionAnalysis?.gemstone || wizardProduct?.gemstone || 'Fine Diamonds & Gems'}</p>
                    </div>
                    <div className="rounded-lg bg-black/40 p-2.5">
                      <span className="text-slate-400">Recommended Theme:</span>
                      <p className="font-medium text-champagne">{visionAnalysis?.recommendedTheme || 'Midnight Velvet'}</p>
                    </div>
                  </div>
                  <div className="rounded-lg bg-black/40 p-2.5 text-xs text-slate-300">
                    <span className="font-medium text-champagne">Preservation Spec: </span>
                    {visionAnalysis?.forensicDescription || 'Artisanal jewellery craftsmanship with exact contour preservation.'}
                  </div>
                </div>
              )}

              <div className="flex justify-between gap-3 pt-4">
                <button type="button" onClick={() => setWizardStep(1)} className="btn-secondary">
                  Back
                </button>
                <button type="button" onClick={() => setWizardStep(3)} className="btn-primary">
                  Next: Advertising Concept <ArrowLeft className="h-4 w-4 rotate-180" />
                </button>
              </div>
            </div>
          )}

          {/* STEP 3: Natural Language Concept */}
          {wizardStep === 3 && (
            <div className="space-y-4">
              <div>
                <h4 className="font-serif text-lg text-white">Step 3: Describe Your Advertising Concept</h4>
                <p className="text-xs text-slate-400">
                  Describe your commercial vision in natural language or choose a luxury editorial preset below.
                </p>
              </div>

              <div>
                <label className="label-text">Advertising Vision</label>
                <textarea
                  rows={3}
                  value={wizardConcept}
                  onChange={(e) => setWizardConcept(e.target.value)}
                  placeholder="e.g. Create a luxury Indian wedding campaign for my necklace with an elegant model, sophisticated emerald background and cinematic golden lighting."
                  className="input-base text-sm resize-none"
                />
              </div>

              <div>
                <span className="label-text">Quick Editorial Presets</span>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {CONCEPT_TEMPLATES.map((tmpl) => (
                    <button
                      key={tmpl.title}
                      type="button"
                      onClick={() => setWizardConcept(tmpl.prompt)}
                      className="rounded-xl border border-white/10 bg-black/30 p-2.5 text-left transition-all hover:border-champagne/50 hover:bg-champagne/10"
                    >
                      <p className="text-xs font-semibold text-white">{tmpl.title}</p>
                      <p className="mt-0.5 text-[11px] text-slate-400 line-clamp-2">{tmpl.prompt}</p>
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex justify-between gap-3 pt-4">
                <button type="button" onClick={() => setWizardStep(2)} className="btn-secondary">
                  Back
                </button>
                <button type="button" onClick={() => setWizardStep(4)} className="btn-primary">
                  Next: Format & Styling <ArrowLeft className="h-4 w-4 rotate-180" />
                </button>
              </div>
            </div>
          )}

          {/* STEP 4: Format & Model Demographic */}
          {wizardStep === 4 && (
            <div className="space-y-5">
              <div>
                <h4 className="font-serif text-lg text-white">Step 4: Advertising Format & Model Demographics</h4>
                <p className="text-xs text-slate-400">
                  Select the output aspect ratio and creative production mode for your campaign.
                </p>
              </div>

              <div>
                <label className="label-text">Output Ratio</label>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {WIZARD_FORMATS.map((f) => (
                    <button
                      key={f.id}
                      type="button"
                      onClick={() => setWizardFormat(f.id)}
                      className={`rounded-xl border p-2.5 text-center transition-all ${
                        wizardFormat === f.id
                          ? 'border-champagne bg-champagne/15 text-champagne'
                          : 'border-white/10 bg-black/30 text-slate-400 hover:text-white'
                      }`}
                    >
                      <p className="text-xs font-bold">{f.label}</p>
                      <p className="text-[10px] text-slate-500">{f.hint}</p>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="label-text">Creative Mode</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setWizardCreativeMode('editorialModel')}
                    className={`rounded-xl border p-3 text-left transition-all ${
                      wizardCreativeMode === 'editorialModel'
                        ? 'border-champagne bg-champagne/15 text-white'
                        : 'border-white/10 bg-black/30 text-slate-400 hover:text-white'
                    }`}
                  >
                    <p className="text-xs font-semibold">Fashion Model Shoot</p>
                    <p className="text-[10px] text-slate-400">High-fashion editorial model wearing your piece</p>
                  </button>
                  <button
                    type="button"
                    onClick={() => setWizardCreativeMode('macroStudio')}
                    className={`rounded-xl border p-3 text-left transition-all ${
                      wizardCreativeMode === 'macroStudio'
                        ? 'border-emerald-500/60 bg-emerald-950/30 text-white'
                        : 'border-white/10 bg-black/30 text-slate-400 hover:text-white'
                    }`}
                  >
                    <p className="text-xs font-semibold">Macro Studio Masterpiece</p>
                    <p className="text-[10px] text-slate-400">100% Pure piece preservation on obsidian glass</p>
                  </button>
                </div>
              </div>

              {wizardCreativeMode === 'editorialModel' && (
                <div>
                  <label className="label-text">Model Demographics & Face Profile</label>
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 max-h-48 overflow-y-auto pr-1">
                    {MODEL_ETHNICITIES.map((eth) => {
                      const isChosen = wizardEthnicity === eth.id;
                      return (
                        <button
                          key={eth.id}
                          type="button"
                          onClick={() => setWizardEthnicity(eth.id)}
                          className={`rounded-xl border p-2 text-left transition-all ${
                            isChosen
                              ? 'border-champagne bg-champagne/15 text-white'
                              : 'border-white/10 bg-black/30 text-slate-400 hover:text-white'
                          }`}
                        >
                          <p className={`text-xs font-semibold ${isChosen ? 'text-champagne' : 'text-white'}`}>
                            {eth.label}
                          </p>
                          <p className="text-[10px] text-slate-500 line-clamp-1">{eth.desc}</p>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              <div className="flex justify-between gap-3 pt-4">
                <button type="button" onClick={() => setWizardStep(3)} className="btn-secondary">
                  Back
                </button>
                <button type="button" onClick={() => setWizardStep(5)} className="btn-primary shadow-glow">
                  Next: Review &amp; Generate <Sparkles className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}

          {/* STEP 5: Generate Creative */}
          {wizardStep === 5 && (
            <div className="space-y-4">
              <div>
                <h4 className="font-serif text-lg text-white">Step 5: Produce Full Campaign</h4>
                <p className="text-xs text-slate-400">
                  Ready to produce the advertising creative, headline, captions, Meta ad copy, and audience profile.
                </p>
              </div>

              <div className="space-y-2 rounded-xl border border-white/10 bg-black/40 p-4 text-xs">
                <div className="flex justify-between border-b border-white/5 py-1.5">
                  <span className="text-slate-400">Product:</span>
                  <span className="font-semibold text-white">{wizardProduct?.name}</span>
                </div>
                <div className="flex justify-between border-b border-white/5 py-1.5">
                  <span className="text-slate-400">Creative Mode:</span>
                  <span className="font-semibold text-champagne">
                    {wizardCreativeMode === 'macroStudio' ? 'Macro Studio Masterpiece' : 'Fashion Model Editorial'}
                  </span>
                </div>
                <div className="flex justify-between border-b border-white/5 py-1.5">
                  <span className="text-slate-400">Output Ratio:</span>
                  <span className="font-semibold text-white">{wizardFormat}</span>
                </div>
                <div className="flex justify-between py-1.5">
                  <span className="text-slate-400">Campaign Assignment:</span>
                  <span className="font-semibold text-emerald-400">{selectedCampaign?.name || 'General Campaign'}</span>
                </div>
              </div>

              <div className="flex justify-between gap-3 pt-4">
                <button
                  type="button"
                  disabled={generatingCampaign}
                  onClick={() => setWizardStep(4)}
                  className="btn-secondary"
                >
                  Back
                </button>
                <button
                  type="button"
                  disabled={generatingCampaign}
                  onClick={handleRunCampaignGeneration}
                  className="btn-primary shadow-glow"
                >
                  {generatingCampaign ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" /> Producing Luxury Creative...
                    </>
                  ) : (
                    <>
                      <Wand2 className="h-4 w-4" /> Generate Complete Campaign
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* STEP 6: Full Campaign Deliverables Pack */}
          {wizardStep === 6 && campaignDeliverables && (
            <div className="space-y-6">
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <div>
                  <h4 className="font-serif text-xl text-white">Step 6: Campaign Deliverables Pack</h4>
                  <p className="text-xs text-slate-400">
                    Your complete advertising asset kit is ready for deployment across Instagram, Facebook, and website.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => handleDownloadDeliverable(campaignDeliverables.imageUrl)}
                  className="btn-primary text-xs inline-flex items-center gap-1.5 shadow-glow"
                >
                  <Download className="h-3.5 w-3.5" /> Download Creative
                </button>
              </div>

              <div className="grid gap-6 md:grid-cols-12">
                {/* Left: Image preview */}
                <div className="md:col-span-5">
                  <div className="overflow-hidden rounded-xl border border-white/10 bg-black/60 shadow-glow">
                    <img
                      src={campaignDeliverables.imageUrl}
                      alt="Campaign Creative"
                      className="aspect-square w-full object-cover"
                    />
                  </div>
                  <div className="mt-2 text-center text-[11px] text-slate-500">
                    Format: {wizardFormat} • Vision Verified
                  </div>
                </div>

                {/* Right: Marketing Copy Pack */}
                <div className="space-y-4 md:col-span-7 max-h-96 overflow-y-auto pr-1">
                  {/* Headline */}
                  <div className="rounded-xl border border-white/10 bg-black/40 p-3.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-champagne">
                        Advertising Headline
                      </span>
                      <button
                        type="button"
                        onClick={() => copyToClipboard(campaignDeliverables.headline, 'Headline')}
                        className="text-xs text-slate-400 hover:text-white"
                      >
                        {copiedField === 'Headline' ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                      </button>
                    </div>
                    <p className="mt-1 text-sm font-semibold text-white">{campaignDeliverables.headline}</p>
                  </div>

                  {/* Instagram Caption */}
                  <div className="rounded-xl border border-white/10 bg-black/40 p-3.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400">
                        Instagram Post Caption
                      </span>
                      <button
                        type="button"
                        onClick={() => copyToClipboard(campaignDeliverables.caption, 'Instagram Caption')}
                        className="text-xs text-slate-400 hover:text-white"
                      >
                        {copiedField === 'Instagram Caption' ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                      </button>
                    </div>
                    <p className="mt-1 whitespace-pre-line text-xs text-slate-300 leading-relaxed">
                      {campaignDeliverables.caption}
                    </p>
                  </div>

                  {/* Meta Ad Copy */}
                  <div className="rounded-xl border border-white/10 bg-black/40 p-3.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-blue-400">
                        Meta Ad Copy (FB &amp; IG Sponsored)
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          copyToClipboard(
                            `${campaignDeliverables.metaPrimaryText}\n\nHeadline: ${campaignDeliverables.metaHeadline}`,
                            'Meta Ad Copy'
                          )
                        }
                        className="text-xs text-slate-400 hover:text-white"
                      >
                        {copiedField === 'Meta Ad Copy' ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                      </button>
                    </div>
                    <p className="mt-1 text-xs text-slate-300 leading-relaxed">
                      {campaignDeliverables.metaPrimaryText}
                    </p>
                    <p className="mt-2 text-xs font-medium text-champagne">
                      Headline: {campaignDeliverables.metaHeadline}
                    </p>
                  </div>

                  {/* Target Audience */}
                  <div className="rounded-xl border border-white/10 bg-black/40 p-3.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-purple-400">
                        Recommended Target Audience
                      </span>
                      <button
                        type="button"
                        onClick={() => copyToClipboard(campaignDeliverables.targetAudience, 'Target Audience')}
                        className="text-xs text-slate-400 hover:text-white"
                      >
                        {copiedField === 'Target Audience' ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                      </button>
                    </div>
                    <p className="mt-1 text-xs text-slate-300 leading-relaxed">
                      {campaignDeliverables.targetAudience}
                    </p>
                  </div>

                  {/* Hashtags & CTA */}
                  <div className="rounded-xl border border-white/10 bg-black/40 p-3.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-champagne">
                        Hashtags &amp; CTA
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          copyToClipboard(
                            `CTA: ${campaignDeliverables.cta}\n\n${campaignDeliverables.hashtags}`,
                            'Hashtags & CTA'
                          )
                        }
                        className="text-xs text-slate-400 hover:text-white"
                      >
                        {copiedField === 'Hashtags & CTA' ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                      </button>
                    </div>
                    <p className="mt-1 text-xs font-semibold text-emerald-300">CTA: {campaignDeliverables.cta}</p>
                    <p className="mt-1.5 text-xs text-slate-400">{campaignDeliverables.hashtags}</p>
                  </div>
                </div>
              </div>

              <div className="flex justify-between gap-3 pt-4 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setWizardStep(1)}
                  className="btn-secondary text-xs inline-flex items-center gap-1.5"
                >
                  <RefreshCw className="h-3.5 w-3.5" /> Start New Campaign
                </button>
                <button
                  type="button"
                  onClick={() => setWizardOpen(false)}
                  className="btn-primary text-xs"
                >
                  Finish &amp; View in Campaign Library
                </button>
              </div>
            </div>
          )}
        </div>
      </Modal>

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
