import { useCallback, useEffect, useState } from 'react';
import {
  Camera,
  Check,
  ChevronRight,
  Download,
  ExternalLink,
  FolderPlus,
  History,
  KeyRound,
  Loader2,
  Package,
  Plus,
  RefreshCw,
  Send,
  Sparkles,
  Trash2,
  UserRound,
} from 'lucide-react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { GoogleAiKeyModal } from '@/components/GoogleAiKeyModal';
import { Modal } from '@/components/Modal';
import { PageHeader } from '@/components/PageHeader';
import { ProductThumb } from '@/components/products/ProductThumb';
import { useToast } from '@/contexts/ToastContext';
import {
  deleteAiModelGeneration,
  fetchAiModelGenerations,
  generateModelImage,
  getGeneratedImageUrl,
  linkGenerationToCampaign,
} from '@/lib/aiStudio';
import { fetchCampaigns } from '@/lib/campaigns';
import { clearGoogleAiKey, hasGoogleAiKey, setGoogleAiKey } from '@/lib/googleAi';
import { fetchProducts } from '@/lib/products';
import type { AiModelGeneration, ModelGenerationFormValues } from '@/types/ai';
import type { Campaign } from '@/types/marketing';
import type { Product } from '@/types/product';

const STYLES = [
  { id: 'luxuryFashion', label: 'Luxury Editorial', desc: 'Vogue-style high-fashion elegance' },
  { id: 'indianBridal', label: 'Indian Royal Bridal', desc: 'Regal wedding-season glamour' },
  { id: 'minimalistChic', label: 'Minimalist Chic', desc: 'Clean quiet luxury aesthetic' },
  { id: 'vintageHeritage', label: 'Vintage Heirloom', desc: 'Timeless palace atmosphere' },
];

const BACKGROUNDS = [
  { id: 'black-studio', label: 'Onyx Studio', color: '#0b0f0e' },
  { id: 'emerald-studio', label: 'Emerald Gradient', color: '#064e3b' },
  { id: 'champagne-silk', label: 'Champagne Silk', color: '#785d26' },
  { id: 'royal-palace', label: 'Royal Palace Interior', color: '#523d24' },
  { id: 'ivory-studio', label: 'Ivory Studio', color: '#333333' },
];

const ASPECT_RATIOS = [
  { id: '1:1', label: '1:1 Square', hint: 'Feed Post' },
  { id: '4:5', label: '4:5 Portrait', hint: 'Instagram Feed' },
  { id: '9:16', label: '9:16 Vertical', hint: 'Story & Reel' },
  { id: '16:9', label: '16:9 Landscape', hint: 'Banner' },
];

const FEMALE_OUTFITS = [
  { id: 'evening-gown', label: 'Haute Couture Evening Gown' },
  { id: 'silk-saree', label: 'Draped Silk Saree with Gold Zari' },
  { id: 'lehenga', label: 'Embroidered Royal Bridal Lehenga' },
  { id: 'black-dress', label: 'Black Velvet Off-Shoulder Dress' },
  { id: 'ivory-blazer', label: 'Ivory Silk Pantsuit' },
];

const MALE_OUTFITS = [
  { id: 'tuxedo', label: 'Midnight Black Tailored Tuxedo' },
  { id: 'sherwani', label: 'Embroidered Ivory Royal Sherwani' },
  { id: 'silk-kurta', label: 'Tailored Raw Silk Kurta Jacket' },
  { id: 'formal-suit', label: 'Charcoal Double-Breasted Suit' },
];

const FEMALE_HAIRSTYLES = [
  { id: 'sleek-bun', label: 'Sleek Low Bun' },
  { id: 'loose-waves', label: 'Voluminous Glossy Waves' },
  { id: 'braided-updo', label: 'Regal Braided Updo' },
  { id: 'side-swept', label: 'Side-Swept Hollywood Waves' },
];

const MALE_HAIRSTYLES = [
  { id: 'short-crop', label: 'Textured Modern Crop' },
  { id: 'slicked-back', label: 'Slicked-Back Gentleman Style' },
  { id: 'side-part', label: 'Classic Refined Side Part' },
];

export function AiModelStudioPage() {
  const { notify } = useToast();
  const navigate = useNavigate();

  const [products, setProducts] = useState<Product[]>([]);
  const [history, setHistory] = useState<AiModelGeneration[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);

  // Form selections
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [gender, setGender] = useState<'female' | 'male'>('female');
  const [style, setStyle] = useState('luxuryFashion');
  const [outfit, setOutfit] = useState('evening-gown');
  const [hairstyle, setHairstyle] = useState('sleek-bun');
  const [pose, setPose] = useState('standing-three-quarter');
  const [camera, setCamera] = useState('close-up');
  const [background, setBackground] = useState('black-studio');
  const [aspectRatio, setAspectRatio] = useState('1:1');
  const [customPrompt, setCustomPrompt] = useState('');

  // Generation state
  const [generating, setGenerating] = useState(false);
  const [currentResult, setCurrentResult] = useState<{
    id?: string;
    imageUrl: string;
    imagePath: string;
    prompt: string;
  } | null>(null);

  // URL Search Params (e.g. ?product=id)
  const [searchParams] = useSearchParams();
  const urlProductId = searchParams.get('product');

  // Dialogs
  const [saveCampaignOpen, setSaveCampaignOpen] = useState(false);
  const [selectedCampaignId, setSelectedCampaignId] = useState('');
  const [savingCampaign, setSavingCampaign] = useState(false);
  const [deletingGen, setDeletingGen] = useState<AiModelGeneration | null>(null);
  const [deletingLoading, setDeletingLoading] = useState(false);
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
    notify('Google AI Studio connected! You can now generate model photographs.');
  };

  const handleRemoveKey = () => {
    clearGoogleAiKey();
    setHasKey(false);
    notify('Google AI Studio key removed.');
  };

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [prods, gens, camps] = await Promise.all([
        fetchProducts(),
        fetchAiModelGenerations(),
        fetchCampaigns(),
      ]);
      setProducts(prods);
      setHistory(gens);
      setCampaigns(camps);

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
      notify(err instanceof Error ? err.message : 'Could not load studio assets.', 'error');
    } finally {
      setLoading(false);
    }
  }, [notify, selectedProduct, urlProductId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Adjust outfits/hair when gender toggles
  useEffect(() => {
    if (gender === 'female') {
      setOutfit('evening-gown');
      setHairstyle('sleek-bun');
    } else {
      setOutfit('tuxedo');
      setHairstyle('short-crop');
    }
  }, [gender]);

  const handleGenerate = async () => {
    if (!hasGoogleAiKey()) {
      setKeyModalOpen(true);
      notify('Please enter your Google AI Studio API key to generate model photography.', 'error');
      return;
    }

    if (!selectedProduct) {
      notify('Please select a jewellery product first.', 'error');
      return;
    }

    setGenerating(true);
    setCurrentResult(null);

    const values: ModelGenerationFormValues = {
      gender,
      style,
      hairstyle,
      outfit,
      pose,
      camera,
      background,
      aspectRatio,
      customPrompt: customPrompt.trim(),
    };

    try {
      const result = await generateModelImage(selectedProduct.id, values);
      setCurrentResult({
        id: result.id,
        imageUrl: result.imageUrl,
        imagePath: result.imagePath,
        prompt: result.prompt,
      });
      notify('Model photograph generated successfully!');
      fetchAiModelGenerations().then(setHistory);
    } catch (err: any) {
      if (err?.message?.includes('GOOGLE_AI_KEY_REQUIRED') || err?.code === 'GOOGLE_AI_KEY_REQUIRED') {
        setKeyModalOpen(true);
        return;
      }
      notify(err instanceof Error ? err.message : 'Generation failed.', 'error');
    } finally {
      setGenerating(false);
    }
  };

  const handleDownload = async (url: string, filename = 'jewels-ai-model.jpg') => {
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
    if (!currentResult?.id || !selectedCampaignId) return;
    setSavingCampaign(true);
    try {
      await linkGenerationToCampaign(currentResult.id, selectedCampaignId);
      notify('Asset saved to campaign.');
      setSaveCampaignOpen(false);
    } catch (err) {
      notify(err instanceof Error ? err.message : 'Could not save to campaign.', 'error');
    } finally {
      setSavingCampaign(false);
    }
  };

  const confirmDeleteGen = async () => {
    if (!deletingGen) return;
    setDeletingLoading(true);
    try {
      await deleteAiModelGeneration(deletingGen.id, deletingGen.image_path);
      setHistory((prev) => prev.filter((item) => item.id !== deletingGen.id));
      if (currentResult?.id === deletingGen.id) {
        setCurrentResult(null);
      }
      notify('Photograph removed from history.');
      setDeletingGen(null);
    } catch (err) {
      notify(err instanceof Error ? err.message : 'Could not delete item.', 'error');
    } finally {
      setDeletingLoading(false);
    }
  };

  return (
    <div className="space-y-10">
      <PageHeader
        eyebrow="Studio"
        title="AI Model Studio"
        description="Craft editorial fashion photographs featuring models wearing your jewellery."
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
                Generate high-fashion jewellery model photographs using Google&apos;s latest <strong className="text-champagne">Imagen 3</strong>. Enter your key once to generate model poses instantly.
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
            <span className="text-slate-400 hidden sm:inline">— Imagen 3 photorealistic model rendering active</span>
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
        {/* Left Form: Configuration Controls */}
        <div className="space-y-8 lg:col-span-7">
          {/* Step 1: Select Jewellery Product */}
          <section className="glass p-6">
            <div className="mb-4 flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-champagne">Step 1</span>
              <span className="text-xs text-slate-400">Reference Piece</span>
            </div>
            <h3 className="font-serif text-xl text-white">Select Jewellery Product</h3>
            <p className="mt-1 text-xs text-slate-400">
              The AI will feature this piece prominently in the model photograph.
            </p>

            {loading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-emerald-400" />
              </div>
            ) : products.length === 0 ? (
              <div className="mt-4 rounded-xl border border-dashed border-white/10 p-6 text-center">
                <p className="text-sm text-slate-400">No jewellery products uploaded yet.</p>
                <Link to="/products?new=1" className="btn-primary mt-4 inline-flex items-center gap-2">
                  <Plus className="h-4 w-4" /> Upload your first piece
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
          </section>

          {/* Step 2: Model Demographics & Style */}
          <section className="glass space-y-6 p-6">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-champagne">Step 2</span>
              <span className="text-xs text-slate-400">Model & Styling</span>
            </div>

            <div>
              <label className="label-text">Model Gender</label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setGender('female')}
                  className={`flex items-center justify-center gap-2 rounded-xl border py-2.5 text-sm font-medium transition-all ${
                    gender === 'female'
                      ? 'border-champagne bg-champagne/15 text-white'
                      : 'border-white/10 bg-black/30 text-slate-400 hover:text-white'
                  }`}
                >
                  <UserRound className="h-4 w-4 text-champagne" /> Female Model
                </button>
                <button
                  type="button"
                  onClick={() => setGender('male')}
                  className={`flex items-center justify-center gap-2 rounded-xl border py-2.5 text-sm font-medium transition-all ${
                    gender === 'male'
                      ? 'border-champagne bg-champagne/15 text-white'
                      : 'border-white/10 bg-black/30 text-slate-400 hover:text-white'
                  }`}
                >
                  <UserRound className="h-4 w-4 text-emerald-400" /> Male Model
                </button>
              </div>
            </div>

            <div>
              <label className="label-text">Editorial Style</label>
              <div className="grid grid-cols-2 gap-3">
                {STYLES.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => setStyle(s.id)}
                    className={`rounded-xl border p-3 text-left transition-all ${
                      style === s.id
                        ? 'border-emerald-500/60 bg-emerald-950/30'
                        : 'border-white/10 bg-black/30 hover:border-white/20'
                    }`}
                  >
                    <p className="text-sm font-medium text-white">{s.label}</p>
                    <p className="mt-0.5 text-xs text-slate-400">{s.desc}</p>
                  </button>
                ))}
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="label-text">Attire / Outfit</label>
                <select
                  value={outfit}
                  onChange={(e) => setOutfit(e.target.value)}
                  className="input-base"
                >
                  {(gender === 'female' ? FEMALE_OUTFITS : MALE_OUTFITS).map((o) => (
                    <option key={o.id} value={o.id} className="bg-onyx text-white">
                      {o.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="label-text">Hairstyle</label>
                <select
                  value={hairstyle}
                  onChange={(e) => setHairstyle(e.target.value)}
                  className="input-base"
                >
                  {(gender === 'female' ? FEMALE_HAIRSTYLES : MALE_HAIRSTYLES).map((h) => (
                    <option key={h.id} value={h.id} className="bg-onyx text-white">
                      {h.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </section>

          {/* Step 3: Scene, Camera & Backdrop */}
          <section className="glass space-y-6 p-6">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-champagne">Step 3</span>
              <span className="text-xs text-slate-400">Composition & Lighting</span>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="label-text">Pose & Attitude</label>
                <select
                  value={pose}
                  onChange={(e) => setPose(e.target.value)}
                  className="input-base"
                >
                  <option value="standing-three-quarter" className="bg-onyx">Three-Quarter Confident</option>
                  <option value="seated-elegant" className="bg-onyx">Regal Seated Editorial</option>
                  <option value="hand-to-face" className="bg-onyx">Hand to Face (Highlights Rings)</option>
                  <option value="looking-over-shoulder" className="bg-onyx">Over The Shoulder Glance</option>
                  <option value="profile-chin-up" className="bg-onyx">Profile Silhouette</option>
                </select>
              </div>

              <div>
                <label className="label-text">Camera & Framing</label>
                <select
                  value={camera}
                  onChange={(e) => setCamera(e.target.value)}
                  className="input-base"
                >
                  <option value="close-up" className="bg-onyx">Close-Up Macro (100mm)</option>
                  <option value="eye-level" className="bg-onyx">Eye-Level Portrait (85mm)</option>
                  <option value="low-angle" className="bg-onyx">Low-Angle Hero Shot (50mm)</option>
                  <option value="overhead" className="bg-onyx">Three-Quarter Overhead (50mm)</option>
                  <option value="full-body" className="bg-onyx">Full Body Editorial (35mm)</option>
                </select>
              </div>
            </div>

            <div>
              <label className="label-text">Studio Backdrop</label>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {BACKGROUNDS.map((bg) => (
                  <button
                    key={bg.id}
                    type="button"
                    onClick={() => setBackground(bg.id)}
                    className={`flex items-center gap-2 rounded-xl border p-2 text-left text-xs transition-all ${
                      background === bg.id
                        ? 'border-champagne bg-champagne/10 text-white'
                        : 'border-white/10 bg-black/40 text-slate-400 hover:text-white'
                    }`}
                  >
                    <span className="h-3 w-3 shrink-0 rounded-full border border-white/20" style={{ backgroundColor: bg.color }} />
                    <span className="truncate">{bg.label}</span>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="label-text">Aspect Ratio</label>
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

            <div>
              <label htmlFor="customPrompt" className="label-text">
                Custom Creative Direction <span className="text-xs text-slate-500">(Optional)</span>
              </label>
              <textarea
                id="customPrompt"
                rows={2}
                value={customPrompt}
                onChange={(e) => setCustomPrompt(e.target.value)}
                placeholder="e.g., Soft candlelight, subtle wind blowing through hair, deep emerald eyeshadow..."
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
                  Generating Editorial Photograph...
                </>
              ) : (
                <>
                  <Sparkles className="h-5 w-5" />
                  Generate Model Photograph
                </>
              )}
            </button>
          </section>
        </div>

        {/* Right Preview Section */}
        <div className="space-y-6 lg:col-span-5">
          <div className="glass sticky top-24 overflow-hidden p-6">
            <h3 className="font-serif text-2xl text-white">Creative Preview</h3>
            <p className="mt-1 text-xs text-slate-400">
              High-resolution model photograph rendered with your jewellery reference.
            </p>

            {generating ? (
              <div className="mt-6 flex aspect-square flex-col items-center justify-center rounded-2xl border border-dashed border-champagne/30 bg-black/60 p-6 text-center">
                <div className="relative mb-4 flex h-16 w-16 items-center justify-center">
                  <div className="absolute inset-0 animate-ping rounded-full bg-champagne/20" />
                  <Sparkles className="h-8 w-8 animate-spin text-champagne" />
                </div>
                <h4 className="font-serif text-lg text-white">Generating Haute Couture Model...</h4>
                <p className="mt-2 max-w-xs text-xs text-slate-400">
                  Refining gemstone reflections, model features, and studio lighting via Google AI.
                </p>
              </div>
            ) : currentResult ? (
              <div className="mt-6 space-y-4">
                <div className="relative overflow-hidden rounded-2xl border border-champagne/30 bg-black shadow-2xl">
                  <img
                    src={currentResult.imageUrl}
                    alt="AI Generated Model"
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
                            creativeType: 'model',
                            productId: selectedProduct?.id,
                          },
                        },
                      })
                    }
                    className="btn-secondary w-full"
                  >
                    <Send className="h-4 w-4 text-emerald-400" /> Plan in Content Calendar
                  </button>
                </div>
              </div>
            ) : (
              <div className="mt-6 flex aspect-square flex-col items-center justify-center rounded-2xl border border-dashed border-white/10 bg-black/30 p-6 text-center">
                <UserRound className="mb-3 h-10 w-10 text-slate-600" strokeWidth={1.5} />
                <p className="text-sm font-medium text-slate-300">No creative generated yet</p>
                <p className="mt-1 text-xs text-slate-500">
                  Select your options on the left and click Generate to see the model preview.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Generation History Gallery */}
      <section className="glass p-6 sm:p-8">
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <History className="h-5 w-5 text-champagne" />
            <h2 className="font-serif text-2xl text-white">Model Studio History</h2>
          </div>
          <span className="text-xs text-slate-400">{history.length} creations</span>
        </div>

        {history.length === 0 ? (
          <p className="py-10 text-center text-sm text-slate-500">
            No previous model photographs found. Your creations will be safely preserved here.
          </p>
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
            {history.map((gen) => {
              const url = getGeneratedImageUrl(gen.image_path);
              return (
                <div
                  key={gen.id}
                  className="group relative overflow-hidden rounded-xl border border-white/10 bg-black/60 transition-all hover:border-champagne/40"
                >
                  <img src={url} alt={gen.prompt} className="aspect-square w-full object-cover" />
                  <div className="absolute inset-0 flex flex-col justify-between bg-gradient-to-t from-black/80 via-transparent p-3 opacity-0 transition-opacity group-hover:opacity-100">
                    <button
                      type="button"
                      onClick={() => setDeletingGen(gen)}
                      className="self-end rounded-full bg-red-500/80 p-1.5 text-white hover:bg-red-600"
                      title="Delete photograph"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                    <div>
                      <p className="truncate text-xs font-medium text-white">{gen.product_name || 'Jewellery'}</p>
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
                              id: gen.id,
                              imageUrl: url,
                              imagePath: gen.image_path,
                              prompt: gen.prompt,
                            });
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
            Select a marketing campaign to organize this photograph with related creatives and captions.
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
              <label htmlFor="campaignSelect" className="label-text">Campaign</label>
              <select
                id="campaignSelect"
                value={selectedCampaignId}
                onChange={(e) => setSelectedCampaignId(e.target.value)}
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
              disabled={savingCampaign || !selectedCampaignId}
              className="btn-primary"
            >
              {savingCampaign && <Loader2 className="h-4 w-4 animate-spin" />}
              Save Creative
            </button>
          </div>
        </div>
      </Modal>

      {/* Delete Confirmation */}
      <ConfirmDialog
        open={deletingGen !== null}
        title="Delete this photograph?"
        description="This AI model generation will be permanently removed from your history."
        confirmLabel="Delete"
        loading={deletingLoading}
        onConfirm={confirmDeleteGen}
        onCancel={() => setDeletingGen(null)}
      />
    </div>
  );
}
