import { useCallback, useEffect, useState } from 'react';
import {
  CalendarClock,
  Check,
  CheckCheck,
  Copy,
  Download,
  ExternalLink,
  FolderPlus,
  History,
  Image as ImageIcon,
  KeyRound,
  Loader2,
  Package,
  Plus,
  RefreshCw,
  RotateCcw,
  Send,
  Sliders,
  Sparkles,
  Trash2,
} from 'lucide-react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { GoogleAiKeyModal } from '@/components/GoogleAiKeyModal';
import { Modal } from '@/components/Modal';
import { PageHeader } from '@/components/PageHeader';
import { ProductThumb } from '@/components/products/ProductThumb';
import { useToast } from '@/contexts/ToastContext';
import {
  deleteAiAd,
  fetchAiAds,
  generateAdCreative,
  getAdImageUrl,
  linkAdToCampaign,
  updateAdCaption,
} from '@/lib/adGenerator';
import { fetchCampaigns } from '@/lib/campaigns';
import {
  clearGoogleAiKey,
  hasGoogleAiKey,
  setGoogleAiKey,
  MODEL_ETHNICITIES,
  analyzeJewelleryVisuals,
  type JewelleryVisualAnalysis,
} from '@/lib/googleAi';
import {
  EDITORIAL_MODEL_BASES,
  renderAuthenticJewelleryAd,
  DEFAULT_FITTING_CONFIG,
  type EditorialModelBase,
  type FittingConfig,
} from '@/lib/jewelleryCompositor';
import { fetchProducts } from '@/lib/products';
import type { AdGenerationFormValues, AiAdCreative } from '@/types/ai';
import type { Campaign } from '@/types/marketing';
import type { Product } from '@/types/product';

const AD_STYLES = [
  { id: 'luxuryEditorial', label: 'Luxury Editorial', desc: 'Vogue-grade high fashion aesthetic' },
  { id: 'minimalist', label: 'Minimalist Jewellery', desc: 'Clean quiet luxury & architectural tones' },
  { id: 'festiveIndian', label: 'Festive Indian Campaign', desc: 'Opulent royal bridal & festive celebration' },
  { id: 'weddingCampaign', label: 'Wedding Campaign', desc: 'Romantic champagne silk & bridal glow' },
  { id: 'premiumProduct', label: 'Macro Product Photography', desc: 'Hyper-detailed macro reflections on obsidian' },
  { id: 'instagramPromo', label: 'Instagram Promotional', desc: 'Eye-catching focal hero post' },
  { id: 'festivalSale', label: 'Festival Celebration', desc: 'Golden dust particles & velvet warmth' },
  { id: 'luxuryBoutique', label: 'Luxury Boutique Showcase', desc: 'Place Vendôme museum pedestal showcase' },
];

const CAMPAIGN_THEMES = [
  { id: 'midnightVelvet', label: 'Midnight Velvet', hint: 'Deep black & emerald rim glow' },
  { id: 'royalHeritage', label: 'Royal Heritage', hint: 'Carved palace marble & antique gold' },
  { id: 'goldenHour', label: 'Golden Hour Glow', hint: 'Warm amber sunset lighting' },
  { id: 'modernMinimal', label: 'Modern Minimalist', hint: 'Travertine stone & diffused lighting' },
  { id: 'botanicalBloom', label: 'Botanical Bloom', hint: 'White orchids & organic marble' },
  { id: 'festiveSparkle', label: 'Festive Sparkle', hint: 'Celebratory bokeh & light play' },
];

const ASPECT_RATIOS = [
  { id: '1:1', label: '1:1 Square', hint: 'Instagram Feed' },
  { id: '4:5', label: '4:5 Portrait', hint: 'Feed Post' },
  { id: '9:16', label: '9:16 Story / Reel', hint: 'Full Vertical' },
  { id: '16:9', label: '16:9 Landscape', hint: 'Promo Banner' },
];

export function AiAdGeneratorPage() {
  const { notify } = useToast();
  const navigate = useNavigate();

  const [products, setProducts] = useState<Product[]>([]);
  const [ads, setAds] = useState<AiAdCreative[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);

  // URL Search Params (e.g. ?product=id)
  const [searchParams] = useSearchParams();
  const urlProductId = searchParams.get('product');

  // Form values
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [creativeMode, setCreativeMode] = useState<'authenticTryOn' | 'generativeAI'>('authenticTryOn');
  const [selectedModelBase, setSelectedModelBase] = useState<EditorialModelBase>(EDITORIAL_MODEL_BASES[0]);
  const [fittingConfig, setFittingConfig] = useState<FittingConfig>(DEFAULT_FITTING_CONFIG);
  const [livePreviewUrl, setLivePreviewUrl] = useState<string | null>(null);
  const [renderingLive, setRenderingLive] = useState(false);
  const [showFittingSliders, setShowFittingSliders] = useState(true);

  const [modelEthnicity, setModelEthnicity] = useState('autoDiverse');
  const [forensicDescription, setForensicDescription] = useState('');
  const [analyzingVision, setAnalyzingVision] = useState(false);
  const [visionAnalysis, setVisionAnalysis] = useState<JewelleryVisualAnalysis | null>(null);

  const [adStyle, setAdStyle] = useState('luxuryEditorial');
  const [theme, setTheme] = useState('midnightVelvet');
  const [aspectRatio, setAspectRatio] = useState('1:1');
  const [customPrompt, setCustomPrompt] = useState('');
  const [campaignId, setCampaignId] = useState('');

  // Live real-time Virtual Try-On renderer
  useEffect(() => {
    if (!selectedProduct || creativeMode !== 'authenticTryOn') return;

    let active = true;
    setRenderingLive(true);
    const timer = setTimeout(async () => {
      try {
        const prodUrl = getAdImageUrl(selectedProduct.image_path);
        const res = await renderAuthenticJewelleryAd(selectedModelBase, prodUrl, fittingConfig);
        if (active) {
          setLivePreviewUrl(res.dataUrl);
        }
      } catch (err) {
        console.warn('Real-time Try-On render error:', err);
      } finally {
        if (active) setRenderingLive(false);
      }
    }, 120);

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [selectedProduct, selectedModelBase, fittingConfig, creativeMode]);

  const handleInspectProductWithVision = async (prod: Product) => {
    if (!prod.image_path) return;
    setAnalyzingVision(true);
    try {
      const imageUrl = getAdImageUrl(prod.image_path);
      const analysis = await analyzeJewelleryVisuals(imageUrl);
      setVisionAnalysis(analysis);
      setForensicDescription(analysis.forensicDescription);
      notify(`AI Vision inspected ${prod.name}: physical specifications locked.`);
    } catch (err) {
      console.warn('Vision inspection notice:', err);
    } finally {
      setAnalyzingVision(false);
    }
  };

  // Generation result
  const [generating, setGenerating] = useState(false);
  const [currentResult, setCurrentResult] = useState<{
    id?: string;
    imageUrl: string;
    imagePath: string;
    caption: string;
    hashtags: string;
    prompt: string;
  } | null>(null);

  // Editable caption in preview
  const [captionText, setCaptionText] = useState('');
  const [hashtagsText, setHashtagsText] = useState('');
  const [copied, setCopied] = useState(false);

  // Dialogs
  const [saveCampaignOpen, setSaveCampaignOpen] = useState(false);
  const [targetCampaignId, setTargetCampaignId] = useState('');
  const [savingCampaign, setSavingCampaign] = useState(false);
  const [deletingAd, setDeletingAd] = useState<AiAdCreative | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [keyModalOpen, setKeyModalOpen] = useState(false);
  const [hasKey, setHasKey] = useState(hasGoogleAiKey());
  const [inlineKey, setInlineKey] = useState('');

  const handleSaveInlineKey = () => {
    const clean = inlineKey.trim();
    if (!clean) {
      notify('Please enter a valid Google AI Studio API key.', 'error');
      return;
    }
    setGoogleAiKey(clean);
    setHasKey(true);
    setInlineKey('');
    notify('Google AI Studio connected! You can now generate luxury creatives.');
  };

  const handleRemoveKey = () => {
    clearGoogleAiKey();
    setHasKey(false);
    notify('Google AI Studio key removed.');
  };

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [prods, adList, campList] = await Promise.all([
        fetchProducts(),
        fetchAiAds(),
        fetchCampaigns(),
      ]);
      setProducts(prods);
      setAds(adList);
      setCampaigns(campList);

      if (prods.length > 0) {
        if (urlProductId) {
          const found = prods.find((p) => p.id === urlProductId);
          if (found) {
            setSelectedProduct(found);
            return;
          }
        }
        if (!selectedProduct) {
          setSelectedProduct(prods[0]);
        }
      }
    } catch (err) {
      notify(err instanceof Error ? err.message : 'Could not load ad generator data.', 'error');
    } finally {
      setLoading(false);
    }
  }, [notify, selectedProduct, urlProductId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleGenerate = async () => {
    if (!selectedProduct) {
      notify('Please select a jewellery product to advertise.', 'error');
      return;
    }

    if (creativeMode === 'generativeAI' && !hasGoogleAiKey()) {
      setKeyModalOpen(true);
      notify('Please enter your Google AI Studio API key for AI Generative mode.', 'error');
      return;
    }

    setGenerating(true);
    setCurrentResult(null);

    try {
      let customBlob: Blob | undefined;

      if (creativeMode === 'authenticTryOn') {
        const prodUrl = getAdImageUrl(selectedProduct.image_path);
        const rendered = await renderAuthenticJewelleryAd(selectedModelBase, prodUrl, fittingConfig);
        customBlob = rendered.blob;
      }

      const values: AdGenerationFormValues = {
        productId: selectedProduct.id,
        adStyle: creativeMode === 'authenticTryOn' && selectedModelBase.category === 'macro' ? 'premiumProduct' : adStyle,
        theme: creativeMode === 'authenticTryOn' ? selectedModelBase.id : theme,
        aspectRatio,
        creativeMode,
        modelEthnicity: creativeMode === 'authenticTryOn' ? selectedModelBase.ethnicity : modelEthnicity,
        forensicDescription: forensicDescription || undefined,
        customPrompt: customPrompt.trim(),
        campaignId: campaignId || undefined,
        customImageBlob: customBlob,
      };

      const res = await generateAdCreative(values);
      setCurrentResult({
        id: res.id,
        imageUrl: res.imageUrl,
        imagePath: res.imagePath,
        caption: res.caption,
        hashtags: res.hashtags,
        prompt: res.prompt,
      });
      setCaptionText(res.caption);
      setHashtagsText(res.hashtags);
      notify('Authentic advertisement produced with custom luxury copy!');
      fetchAiAds().then(setAds);
    } catch (err: any) {
      if (err?.message?.includes('GOOGLE_AI_KEY_REQUIRED') || err?.code === 'GOOGLE_AI_KEY_REQUIRED') {
        setKeyModalOpen(true);
        return;
      }
      notify(err instanceof Error ? err.message : 'Ad generation failed.', 'error');
    } finally {
      setGenerating(false);
    }
  };

  const handleCopyCaption = async () => {
    const fullText = `${captionText}\n\n${hashtagsText}`;
    try {
      await navigator.clipboard.writeText(fullText);
      setCopied(true);
      notify('Caption and hashtags copied to clipboard!');
      setTimeout(() => setCopied(false), 2500);
    } catch {
      notify('Could not copy automatically.', 'error');
    }
  };

  const handleDownload = async (url: string, filename = 'jewels-ai-advertisement.jpg') => {
    try {
      const res = await fetch(url);
      const blob = await res.blob();
      const objUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = objUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(objUrl);
    } catch {
      window.open(url, '_blank');
    }
  };

  const handleSaveToCampaign = async () => {
    if (!currentResult?.id || !targetCampaignId) return;
    setSavingCampaign(true);
    try {
      await linkAdToCampaign(currentResult.id, targetCampaignId);
      if (captionText !== currentResult.caption || hashtagsText !== currentResult.hashtags) {
        await updateAdCaption(currentResult.id, captionText, hashtagsText);
      }
      notify('Creative & caption saved to campaign.');
      setSaveCampaignOpen(false);
    } catch (err) {
      notify(err instanceof Error ? err.message : 'Could not save to campaign.', 'error');
    } finally {
      setSavingCampaign(false);
    }
  };

  const confirmDeleteAd = async () => {
    if (!deletingAd) return;
    setDeleteLoading(true);
    try {
      await deleteAiAd(deletingAd.id, deletingAd.image_path);
      setAds((prev) => prev.filter((a) => a.id !== deletingAd.id));
      if (currentResult?.id === deletingAd.id) {
        setCurrentResult(null);
      }
      notify('Creative removed.');
      setDeletingAd(null);
    } catch (err) {
      notify(err instanceof Error ? err.message : 'Could not delete creative.', 'error');
    } finally {
      setDeleteLoading(false);
    }
  };

  return (
    <div className="space-y-10">
      <PageHeader
        eyebrow="Advertising"
        title="AI Ad Generator"
        description="Transform jewellery photographs into high-converting luxury advertisements with bespoke marketing copy."
        action={
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setKeyModalOpen(true)}
              className="btn-secondary text-xs inline-flex items-center gap-1.5"
            >
              <KeyRound className="h-3.5 w-3.5 text-champagne" />
              {hasKey ? 'Google AI Connected' : 'Connect Google AI'}
            </button>
            <Link to="/products?new=1" className="btn-secondary">
              <Plus className="h-4 w-4" /> Upload piece
            </Link>
          </div>
        }
      />

      {/* Google AI Studio Quick Connect Banner */}
      {!hasKey ? (
        <div className="rounded-2xl border border-champagne/40 bg-gradient-to-r from-[#081812] via-[#050f0b] to-[#081812] p-5 shadow-[0_10px_35px_rgba(0,0,0,0.6)]">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-champagne/20 text-champagne">
                  <Sparkles className="h-4 w-4" />
                </span>
                <h4 className="font-serif text-lg font-medium text-white">
                  Connect Google AI Studio <span className="text-xs text-champagne font-sans font-normal">(Free Direct Generation)</span>
                </h4>
              </div>
              <p className="max-w-2xl text-xs leading-relaxed text-slate-300">
                Generate editorial jewellery advertisements with <strong className="text-champagne">Imagen 3</strong> and luxury captions with <strong className="text-champagne">Gemini 1.5 Flash</strong>. Enter your free API key once below to generate ads immediately.
              </p>
            </div>
            <a
              href="https://aistudio.google.com/app/apikey"
              target="_blank"
              rel="noreferrer"
              className="inline-flex shrink-0 items-center gap-1.5 text-xs font-medium text-champagne hover:underline"
            >
              Get Free Key <ExternalLink className="h-3.5 w-3.5" />
            </a>
          </div>

          <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center">
            <input
              type="password"
              value={inlineKey}
              onChange={(e) => setInlineKey(e.target.value)}
              placeholder="Paste Google AI Studio API Key (starts with AIzaSy...)"
              className="input-base flex-1 py-2.5 text-xs font-mono bg-black/70 border-white/20 focus:border-champagne"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleSaveInlineKey();
                }
              }}
            />
            <button
              type="button"
              onClick={handleSaveInlineKey}
              className="btn-primary py-2.5 px-5 text-xs font-semibold whitespace-nowrap inline-flex items-center justify-center gap-2 shadow-glow"
            >
              <KeyRound className="h-3.5 w-3.5" />
              Save &amp; Connect Key
            </button>
          </div>
        </div>
      ) : (
        <div className="flex items-center justify-between rounded-xl border border-emerald-500/30 bg-emerald-950/20 px-4 py-2.5 shadow-sm">
          <div className="flex items-center gap-2.5 text-xs text-emerald-300">
            <span className="relative flex h-2.5 w-2.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500"></span>
            </span>
            <span className="font-medium text-white">Google AI Studio Connected</span>
            <span className="text-slate-400 hidden sm:inline">— Imagen 3 &amp; Gemini 1.5 Flash active</span>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setKeyModalOpen(true)}
              className="text-xs text-champagne hover:underline font-medium"
            >
              Change Key
            </button>
            <span className="text-slate-600">|</span>
            <button
              type="button"
              onClick={handleRemoveKey}
              className="text-xs text-slate-400 hover:text-red-400"
            >
              Disconnect
            </button>
          </div>
        </div>
      )}

      <div className="grid gap-8 lg:grid-cols-12">
        {/* Left Generation Controls */}
        <div className="space-y-8 lg:col-span-7">
          {/* Step 1: Product Selection */}
          <section className="glass p-6">
            <div className="mb-4 flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-champagne">Step 1</span>
              <span className="text-xs text-slate-400">Jewellery Selection</span>
            </div>
            <h3 className="font-serif text-xl text-white">Select Product</h3>
            <p className="mt-1 text-xs text-slate-400">
              Pick the jewellery piece to become the hero of this marketing campaign.
            </p>

            {loading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-emerald-400" />
              </div>
            ) : products.length === 0 ? (
              <div className="mt-4 rounded-xl border border-dashed border-white/10 p-6 text-center">
                <p className="text-sm text-slate-400">Your jewellery catalogue is empty.</p>
                <Link to="/products?new=1" className="btn-primary mt-4 inline-flex items-center gap-2">
                  <Plus className="h-4 w-4" /> Upload jewellery
                </Link>
              </div>
            ) : (
              <div className="mt-4 flex gap-3 overflow-x-auto pb-2">
                {products.map((prod) => {
                  const isSelected = selectedProduct?.id === prod.id;
                  return (
                    <button
                      key={prod.id}
                      type="button"
                      onClick={() => setSelectedProduct(prod)}
                      className={`group relative flex w-36 shrink-0 flex-col items-center rounded-xl border p-2 text-left transition-all ${
                        isSelected
                          ? 'border-champagne bg-champagne/10 shadow-glow'
                          : 'border-white/10 bg-black/40 hover:border-emerald-500/30'
                      }`}
                    >
                      <div className="aspect-square w-full overflow-hidden rounded-lg">
                        <ProductThumb imagePath={prod.image_path} alt={prod.name} />
                      </div>
                      <p className="mt-2 w-full truncate text-center text-xs font-medium text-white">{prod.name}</p>
                      <span className="text-[10px] text-slate-400">{prod.category}</span>
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

            {selectedProduct && (
              <div className="mt-5 rounded-xl border border-emerald-500/30 bg-emerald-950/20 p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-champagne" />
                    <span className="text-xs font-semibold text-white">Product Preservation Engine</span>
                    <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-[10px] font-medium text-emerald-300 border border-emerald-500/30">
                      Vision-Lock Active
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleInspectProductWithVision(selectedProduct)}
                    disabled={analyzingVision}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-champagne/40 bg-champagne/10 px-2.5 py-1 text-xs font-medium text-champagne hover:bg-champagne/20 transition-all"
                  >
                    {analyzingVision ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
                    {forensicDescription ? 'Re-inspect Geometry' : 'Extract Forensic Geometry'}
                  </button>
                </div>
                <p className="mt-2 text-xs text-slate-300 leading-relaxed">
                  {forensicDescription ? (
                    <span>
                      <strong className="text-champagne font-medium">Locked Blueprint: </strong>
                      {forensicDescription}
                    </span>
                  ) : (
                    <span className="text-slate-400">
                      Selected: <strong className="text-white">{selectedProduct.name}</strong> ({selectedProduct.category}) — {selectedProduct.material || '18K Gold'}, {selectedProduct.gemstone || 'Fine Gems'}. Click above to lock exact physical geometry with Gemini Vision so the AI maintains your genuine piece.
                    </span>
                  )}
                </p>
              </div>
            )}
          </section>

          {/* Step 2: Advertisement Style & Theme */}
          <section className="glass space-y-6 p-6">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-champagne">Step 2</span>
              <span className="text-xs text-slate-400">Campaign Art Direction</span>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="label-text mb-0">Production Method</label>
                <span className="text-[11px] text-champagne font-medium">Recommended for Commerce</span>
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={() => setCreativeMode('authenticTryOn')}
                  className={`rounded-xl border p-4 text-left transition-all ${
                    creativeMode === 'authenticTryOn'
                      ? 'border-champagne bg-champagne/15 shadow-glow'
                      : 'border-white/10 bg-black/30 hover:border-white/20'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold text-white">💎 Authentic Model Try-On</p>
                    {creativeMode === 'authenticTryOn' && <span className="h-2 w-2 rounded-full bg-champagne"></span>}
                  </div>
                  <p className="mt-1 text-xs text-slate-300">
                    <strong className="text-champagne font-medium">100% Genuine Piece: </strong>
                    Drapes your exact uploaded jewellery onto real 8K fashion models with contact shadows &amp; real skin pores. Zero alteration.
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => setCreativeMode('generativeAI')}
                  className={`rounded-xl border p-4 text-left transition-all ${
                    creativeMode === 'generativeAI'
                      ? 'border-emerald-500/60 bg-emerald-950/30 shadow-sm'
                      : 'border-white/10 bg-black/30 hover:border-white/20'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold text-white">🤖 AI Generative Diffusion</p>
                    {creativeMode === 'generativeAI' && <span className="h-2 w-2 rounded-full bg-emerald-400"></span>}
                  </div>
                  <p className="mt-1 text-xs text-slate-400">
                    Generates an editorial scene from artistic text prompts using diffusion models.
                  </p>
                </button>
              </div>
            </div>

            {creativeMode === 'authenticTryOn' ? (
              <div className="space-y-6">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="label-text mb-0">Select Real Fashion Model or Pedestal</label>
                    <span className="text-[11px] text-emerald-300">8K Real Human Photography</span>
                  </div>
                  <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 max-h-64 overflow-y-auto pr-1">
                    {EDITORIAL_MODEL_BASES.map((base) => {
                      const isChosen = selectedModelBase.id === base.id;
                      return (
                        <button
                          key={base.id}
                          type="button"
                          onClick={() => setSelectedModelBase(base)}
                          className={`flex items-center gap-3 rounded-xl border p-2 text-left transition-all ${
                            isChosen
                              ? 'border-champagne bg-champagne/15 shadow-sm'
                              : 'border-white/10 bg-black/40 hover:border-white/20'
                          }`}
                        >
                          <img
                            src={base.imageUrl}
                            alt={base.name}
                            className="h-12 w-12 rounded-lg object-cover shrink-0 border border-white/10"
                          />
                          <div className="min-w-0 flex-1">
                            <p className={`text-xs font-semibold truncate ${isChosen ? 'text-champagne' : 'text-white'}`}>
                              {base.name}
                            </p>
                            <p className="text-[10px] text-slate-400 line-clamp-1">{base.description}</p>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Interactive Fitting Studio Controls */}
                <div className="rounded-xl border border-white/10 bg-black/40 p-4 space-y-4">
                  <div className="flex items-center justify-between border-b border-white/5 pb-2">
                    <div className="flex items-center gap-2">
                      <Sliders className="h-4 w-4 text-champagne" />
                      <span className="text-xs font-semibold text-white">Interactive Fitting Controls</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setFittingConfig(DEFAULT_FITTING_CONFIG)}
                      className="inline-flex items-center gap-1 text-[11px] text-slate-400 hover:text-champagne"
                    >
                      <RotateCcw className="h-3 w-3" /> Reset
                    </button>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2 text-xs">
                    <div>
                      <div className="flex justify-between text-slate-400 mb-1">
                        <span>📏 Size / Scale</span>
                        <span className="text-white font-medium">{fittingConfig.scale.toFixed(2)}x</span>
                      </div>
                      <input
                        type="range"
                        min="0.5"
                        max="1.8"
                        step="0.05"
                        value={fittingConfig.scale}
                        onChange={(e) => setFittingConfig((prev) => ({ ...prev, scale: parseFloat(e.target.value) }))}
                        className="w-full accent-champagne"
                      />
                    </div>

                    <div>
                      <div className="flex justify-between text-slate-400 mb-1">
                        <span>↕️ Neckline Height</span>
                        <span className="text-white font-medium">{fittingConfig.offsetY}px</span>
                      </div>
                      <input
                        type="range"
                        min="-120"
                        max="120"
                        step="5"
                        value={fittingConfig.offsetY}
                        onChange={(e) => setFittingConfig((prev) => ({ ...prev, offsetY: parseInt(e.target.value, 10) }))}
                        className="w-full accent-champagne"
                      />
                    </div>

                    <div>
                      <div className="flex justify-between text-slate-400 mb-1">
                        <span>🪄 Background Cutout</span>
                        <span className="text-white font-medium">{fittingConfig.cutoutSensitivity}%</span>
                      </div>
                      <input
                        type="range"
                        min="15"
                        max="80"
                        step="2"
                        value={fittingConfig.cutoutSensitivity}
                        onChange={(e) => setFittingConfig((prev) => ({ ...prev, cutoutSensitivity: parseInt(e.target.value, 10) }))}
                        className="w-full accent-emerald-400"
                      />
                      <span className="text-[10px] text-slate-500">Dissolves ceramic dish or white background</span>
                    </div>

                    <div>
                      <div className="flex justify-between text-slate-400 mb-1">
                        <span>☀️ Studio Lighting Warmth</span>
                        <span className="text-white font-medium">{fittingConfig.warmth}</span>
                      </div>
                      <input
                        type="range"
                        min="-15"
                        max="15"
                        step="1"
                        value={fittingConfig.warmth}
                        onChange={(e) => setFittingConfig((prev) => ({ ...prev, warmth: parseInt(e.target.value, 10) }))}
                        className="w-full accent-champagne"
                      />
                      <span className="text-[10px] text-slate-500">Matches warm golden or platinum tones</span>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                <div>
                  <div className="flex items-center justify-between">
                    <label className="label-text">Model Demographics &amp; Facial Features</label>
                    <span className="text-[11px] text-champagne">Guarantees unique photorealistic faces</span>
                  </div>
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    {MODEL_ETHNICITIES.map((eth) => {
                      const isChosen = modelEthnicity === eth.id;
                      return (
                        <button
                          key={eth.id}
                          type="button"
                          onClick={() => setModelEthnicity(eth.id)}
                          className={`rounded-xl border p-2.5 text-left transition-all ${
                            isChosen
                              ? 'border-champagne bg-champagne/10 shadow-sm'
                              : 'border-white/10 bg-black/30 hover:border-white/20'
                          }`}
                        >
                          <p className={`text-xs font-semibold ${isChosen ? 'text-champagne' : 'text-white'}`}>
                            {eth.label}
                          </p>
                          <p className="mt-0.5 text-[11px] text-slate-400 line-clamp-1">{eth.desc}</p>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <label className="label-text">Advertisement Style</label>
                  <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                    {AD_STYLES.map((s) => (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => setAdStyle(s.id)}
                        className={`rounded-xl border p-3 text-left transition-all ${
                          adStyle === s.id
                            ? 'border-emerald-500/60 bg-emerald-950/30 shadow-sm'
                            : 'border-white/10 bg-black/30 hover:border-white/20'
                        }`}
                      >
                        <p className="text-sm font-medium text-white">{s.label}</p>
                        <p className="mt-0.5 text-xs text-slate-400">{s.desc}</p>
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="label-text">Campaign Theme</label>
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                    {CAMPAIGN_THEMES.map((t) => (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => setTheme(t.id)}
                        className={`rounded-xl border p-2.5 text-left transition-all ${
                          theme === t.id
                            ? 'border-champagne bg-champagne/10 text-white'
                            : 'border-white/10 bg-black/30 text-slate-400 hover:text-white'
                        }`}
                      >
                        <p className="text-xs font-semibold">{t.label}</p>
                        <p className="mt-0.5 text-[10px] text-slate-500">{t.hint}</p>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            <div>
              <label className="label-text">Output Ratio</label>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {ASPECT_RATIOS.map((ar) => (
                  <button
                    key={ar.id}
                    type="button"
                    onClick={() => setAspectRatio(ar.id)}
                    className={`rounded-xl border p-2 text-center transition-all ${
                      aspectRatio === ar.id
                        ? 'border-champagne bg-champagne/15 text-champagne'
                        : 'border-white/10 bg-black/30 text-slate-400 hover:text-white'
                    }`}
                  >
                    <p className="text-xs font-semibold">{ar.label}</p>
                    <p className="text-[10px] text-slate-500">{ar.hint}</p>
                  </button>
                ))}
              </div>
            </div>

            {campaigns.length > 0 && (
              <div>
                <label htmlFor="assignCampaign" className="label-text">
                  Attach to Campaign <span className="text-xs text-slate-500">(Optional)</span>
                </label>
                <select
                  id="assignCampaign"
                  value={campaignId}
                  onChange={(e) => setCampaignId(e.target.value)}
                  className="input-base"
                >
                  <option value="">Do not assign yet</option>
                  {campaigns.map((c) => (
                    <option key={c.id} value={c.id} className="bg-onyx">
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div>
              <label htmlFor="adPrompt" className="label-text">
                Custom Ad Instructions <span className="text-xs text-slate-500">(Optional)</span>
              </label>
              <textarea
                id="adPrompt"
                rows={2}
                value={customPrompt}
                onChange={(e) => setCustomPrompt(e.target.value)}
                placeholder="e.g. Include soft golden particles floating around the pendant, emphasize the brilliant emerald cut..."
                className="input-base text-sm"
              />
            </div>

            <button
              type="button"
              onClick={handleGenerate}
              disabled={generating || !selectedProduct}
              className="btn-primary w-full py-3.5 text-base"
            >
              {generating ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Generating Luxury Advertisement & Caption...
                </>
              ) : (
                <>
                  <Sparkles className="h-5 w-5" />
                  Generate Advertisement Creative
                </>
              )}
            </button>
          </section>
        </div>

        {/* Right Preview Section */}
        <div className="space-y-6 lg:col-span-5">
          <div className="glass sticky top-24 space-y-6 p-6">
            <div>
              <h3 className="font-serif text-2xl text-white">Creative & Copy Preview</h3>
              <p className="mt-1 text-xs text-slate-400">
                Complete marketing kit: advertisement image, engaging hook, and hashtags.
              </p>
            </div>

            {generating ? (
              <div className="flex aspect-square flex-col items-center justify-center rounded-2xl border border-dashed border-champagne/30 bg-black/60 p-6 text-center">
                <div className="relative mb-4 flex h-16 w-16 items-center justify-center">
                  <div className="absolute inset-0 animate-ping rounded-full bg-champagne/20" />
                  <Sparkles className="h-8 w-8 animate-spin text-champagne" />
                </div>
                <h4 className="font-serif text-lg text-white">Rendering Creative via Google AI...</h4>
                <p className="mt-2 max-w-xs text-xs text-slate-400">
                  Composing lighting, macro diamond sparkle, and crafting tailored Instagram marketing copy.
                </p>
              </div>
            ) : currentResult ? (
              <div className="space-y-5">
                {/* Visual Creative */}
                <div className="relative overflow-hidden rounded-2xl border border-champagne/30 bg-black shadow-2xl">
                  <img
                    src={currentResult.imageUrl}
                    alt="AI Generated Advertisement"
                    className="aspect-square w-full object-cover"
                  />
                  <div className="absolute bottom-3 right-3 flex gap-2">
                    <button
                      type="button"
                      onClick={() => handleDownload(currentResult.imageUrl)}
                      className="rounded-full bg-onyx/80 p-2 text-white backdrop-blur-md transition-colors hover:bg-champagne hover:text-onyx"
                      title="Download image"
                    >
                      <Download className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                {/* AI Copy & Caption */}
                <div className="rounded-xl border border-white/10 bg-black/40 p-4">
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-xs font-semibold uppercase tracking-wider text-champagne">
                      Instagram Caption
                    </span>
                    <button
                      type="button"
                      onClick={handleCopyCaption}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-2.5 py-1 text-xs text-slate-300 hover:border-champagne hover:text-champagne"
                    >
                      {copied ? <CheckCheck className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                      {copied ? 'Copied' : 'Copy'}
                    </button>
                  </div>

                  <textarea
                    rows={4}
                    value={captionText}
                    onChange={(e) => setCaptionText(e.target.value)}
                    className="w-full resize-none bg-transparent text-xs text-slate-200 outline-none"
                    placeholder="Instagram caption..."
                  />

                  <div className="mt-3 border-t border-white/5 pt-2">
                    <span className="mb-1 block text-[11px] font-medium text-slate-400">Hashtags</span>
                    <textarea
                      rows={2}
                      value={hashtagsText}
                      onChange={(e) => setHashtagsText(e.target.value)}
                      className="w-full resize-none bg-transparent text-xs text-emerald-400/90 outline-none"
                      placeholder="#Jewellery #Luxury..."
                    />
                  </div>
                </div>

                {/* Actions */}
                <div className="flex flex-col gap-2">
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => handleDownload(currentResult.imageUrl)}
                      className="btn-primary w-full"
                    >
                      <Download className="h-4 w-4" /> Download
                    </button>
                    <button
                      type="button"
                      onClick={() => setSaveCampaignOpen(true)}
                      className="btn-secondary w-full"
                    >
                      <FolderPlus className="h-4 w-4" /> Save to Campaign
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      navigate('/calendar', {
                        state: {
                          scheduleCreative: {
                            imageUrl: currentResult.imageUrl,
                            caption: `${captionText}\n\n${hashtagsText}`,
                            creativeType: 'ad',
                            productId: selectedProduct?.id,
                          },
                        },
                      })
                    }
                    className="btn-secondary w-full"
                  >
                    <CalendarClock className="h-4 w-4 text-emerald-400" /> Plan in Content Calendar
                  </button>
                </div>
              </div>
            ) : livePreviewUrl && creativeMode === 'authenticTryOn' ? (
              <div className="space-y-4">
                <div className="relative overflow-hidden rounded-2xl border border-champagne/40 bg-black shadow-glow">
                  <img
                    src={livePreviewUrl}
                    alt="Live Fitting Preview"
                    className="aspect-square w-full object-cover"
                  />
                  {renderingLive && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-[1px]">
                      <Loader2 className="h-8 w-8 animate-spin text-champagne" />
                    </div>
                  )}
                  <div className="absolute top-3 left-3 rounded-full border border-emerald-500/40 bg-black/80 px-3 py-1 backdrop-blur-md flex items-center gap-2">
                    <span className="relative flex h-2 w-2">
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75"></span>
                      <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500"></span>
                    </span>
                    <span className="text-[11px] font-medium text-emerald-300">Live Fitting • 100% Genuine Piece</span>
                  </div>
                </div>
                <div className="flex items-center justify-between text-xs text-slate-400 px-1">
                  <span>Model: <strong className="text-white">{selectedModelBase.name}</strong></span>
                  <span className="text-champagne font-medium">Click button on left to finalize</span>
                </div>
              </div>
            ) : (
              <div className="flex aspect-square flex-col items-center justify-center rounded-2xl border border-dashed border-white/10 bg-black/30 p-6 text-center">
                <ImageIcon className="mb-3 h-10 w-10 text-slate-600" strokeWidth={1.5} />
                <p className="text-sm font-medium text-slate-300">No creative generated yet</p>
                <p className="mt-1 text-xs text-slate-500">
                  Select your product and style on the left to produce an editorial campaign creative.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Creative Library / Past Generations */}
      <section className="glass p-6 sm:p-8">
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <History className="h-5 w-5 text-champagne" />
            <h2 className="font-serif text-2xl text-white">Generated Advertisements</h2>
          </div>
          <span className="text-xs text-slate-400">{ads.length} saved</span>
        </div>

        {ads.length === 0 ? (
          <p className="py-10 text-center text-sm text-slate-500">
            No advertisements generated yet. Create your first advertisement above.
          </p>
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
            {ads.map((ad) => {
              const url = getAdImageUrl(ad.image_path);
              return (
                <div
                  key={ad.id}
                  className="group relative overflow-hidden rounded-xl border border-white/10 bg-black/60 transition-all hover:border-champagne/40"
                >
                  <img src={url} alt={ad.prompt} className="aspect-square w-full object-cover" />
                  <div className="absolute inset-0 flex flex-col justify-between bg-gradient-to-t from-black/85 via-transparent p-3 opacity-0 transition-opacity group-hover:opacity-100">
                    <button
                      type="button"
                      onClick={() => setDeletingAd(ad)}
                      className="self-end rounded-full bg-red-500/80 p-1.5 text-white hover:bg-red-600"
                      title="Delete creative"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                    <div>
                      <p className="truncate text-xs font-medium text-white">{ad.product_name || 'Jewellery Ad'}</p>
                      <div className="mt-2 flex gap-1">
                        <button
                          type="button"
                          onClick={() => handleDownload(url)}
                          className="rounded-lg bg-champagne px-2 py-1 text-[11px] font-semibold text-onyx"
                        >
                          Download
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setCurrentResult({
                              id: ad.id,
                              imageUrl: url,
                              imagePath: ad.image_path,
                              caption: ad.caption,
                              hashtags: ad.hashtags,
                              prompt: ad.prompt,
                            });
                            setCaptionText(ad.caption);
                            setHashtagsText(ad.hashtags);
                          }}
                          className="rounded-lg bg-white/20 px-2 py-1 text-[11px] text-white hover:bg-white/30"
                        >
                          View
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Google AI Key Connection Modal */}
      <GoogleAiKeyModal
        open={keyModalOpen}
        onClose={() => setKeyModalOpen(false)}
        onSaved={() => {
          setHasKey(true);
          handleGenerate();
        }}
      />

      {/* Save to Campaign Modal */}
      <Modal open={saveCampaignOpen} onClose={() => setSaveCampaignOpen(false)} title="Save to Campaign">
        <div className="space-y-5">
          <p className="text-sm text-slate-300">
            Select an existing marketing campaign to organize this advertisement creative and copy.
          </p>
          {campaigns.length === 0 ? (
            <div className="rounded-xl border border-dashed border-white/10 p-4 text-center">
              <p className="text-sm text-slate-400">No campaigns created yet.</p>
              <Link to="/campaigns" className="btn-secondary mt-3 inline-flex items-center gap-2">
                <Plus className="h-4 w-4" /> Go to Campaign Studio
              </Link>
            </div>
          ) : (
            <div>
              <label htmlFor="campaignModalSelect" className="label-text">Select Campaign</label>
              <select
                id="campaignModalSelect"
                value={targetCampaignId}
                onChange={(e) => setTargetCampaignId(e.target.value)}
                className="input-base"
              >
                <option value="">Select a campaign...</option>
                {campaigns.map((c) => (
                  <option key={c.id} value={c.id} className="bg-onyx">
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => setSaveCampaignOpen(false)} className="btn-secondary">
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSaveToCampaign}
              disabled={savingCampaign || !targetCampaignId}
              className="btn-primary"
            >
              {savingCampaign && <Loader2 className="h-4 w-4 animate-spin" />}
              Save to Campaign
            </button>
          </div>
        </div>
      </Modal>

      {/* Delete Confirmation */}
      <ConfirmDialog
        open={deletingAd !== null}
        title="Delete this advertisement?"
        description="This creative will be permanently removed from your library."
        confirmLabel="Delete"
        loading={deleteLoading}
        onConfirm={confirmDeleteAd}
        onCancel={() => setDeletingAd(null)}
      />
    </div>
  );
}
