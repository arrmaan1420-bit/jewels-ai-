import { useCallback, useEffect, useState, type ChangeEvent, type FormEvent } from 'react';
import {
  Check,
  CheckCircle2,
  Image as ImageIcon,
  Loader2,
  Palette,
  Sparkles,
  Upload,
} from 'lucide-react';
import { PageHeader } from '@/components/PageHeader';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import { fetchBrandKit, updateBrandKit, uploadBrandLogo } from '@/lib/brandKit';
import type { BrandKitData } from '@/types/marketing';

const TYPOGRAPHY_OPTIONS = [
  { id: 'Cormorant Garamond', label: 'Cormorant Garamond (Serif / Heritage Luxury)' },
  { id: 'Playfair Display', label: 'Playfair Display (Serif / Editorial Elegance)' },
  { id: 'Cinzel', label: 'Cinzel (Classical Roman / High Jewellery)' },
  { id: 'Montserrat', label: 'Montserrat (Modern Minimalist)' },
  { id: 'Inter', label: 'Inter (Contemporary Clean SaaS)' },
];

const STYLE_OPTIONS = [
  { id: 'luxuryEditorial', label: 'Luxury Editorial (Vogue & Harper’s Bazaar)' },
  { id: 'minimalist', label: 'Modern Minimalist (Clean architecture & negative space)' },
  { id: 'festiveIndian', label: 'Royal Festive Indian (Bridal heritage & antique gold)' },
  { id: 'weddingCampaign', label: 'Wedding Romance (Champagne silk & bridal glow)' },
  { id: 'premiumProduct', label: 'Macro Obsidian Studio (Deep black & diamond reflections)' },
];

const TONE_OPTIONS = [
  'Luxury & Sophisticated',
  'Romantic & Poetic',
  'Opulent & Royal Heritage',
  'Modern & Minimalist',
  'High-Energy Promotional',
  'Celebratory & Festive',
];

export function BrandKitPage() {
  const { user } = useAuth();
  const { notify } = useToast();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);

  const [brandKit, setBrandKit] = useState<BrandKitData>({
    fullName: '',
    brandName: '',
    logoUrl: '',
    brandColors: {
      primary: '#10B981',
      secondary: '#D6B56D',
      background: '#0B0F0E',
    },
    typography: 'Cormorant Garamond',
    defaultStyle: 'luxuryEditorial',
    brandDescription: '',
    marketingTone: 'Luxury & Sophisticated',
  });

  const loadData = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const data = await fetchBrandKit(user.id);
      setBrandKit(data);
    } catch (err) {
      notify(err instanceof Error ? err.message : 'Could not load Brand Kit.', 'error');
    } finally {
      setLoading(false);
    }
  }, [user, notify]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleLogoUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    if (file.size > 5 * 1024 * 1024) {
      notify('Logo must be smaller than 5MB.', 'error');
      return;
    }

    setUploadingLogo(true);
    try {
      const url = await uploadBrandLogo(user.id, file);
      setBrandKit((prev) => ({ ...prev, logoUrl: url }));
      notify('Brand logo uploaded successfully.');
    } catch (err) {
      notify(err instanceof Error ? err.message : 'Logo upload failed.', 'error');
    } finally {
      setUploadingLogo(false);
    }
  };

  const handleSave = async (e: FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setSaving(true);
    try {
      await updateBrandKit(user.id, brandKit);
      notify('Brand Kit saved! These guidelines will shape all future AI generations.');
    } catch (err) {
      notify(err instanceof Error ? err.message : 'Could not save Brand Kit.', 'error');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-400" />
      </div>
    );
  }

  return (
    <div className="space-y-10">
      <PageHeader
        eyebrow="Identity"
        title="Brand Kit"
        description="Preserve your boutique’s unique aesthetics, signature colours, logo, and marketing voice across every AI advertisement."
      />

      <form onSubmit={handleSave} className="grid gap-8 lg:grid-cols-12">
        {/* Left Form: Identity & Typography */}
        <div className="space-y-8 lg:col-span-8">
          {/* Section 1: Core Brand Identity */}
          <section className="glass space-y-6 p-6 sm:p-8">
            <h3 className="font-serif text-2xl text-white">Brand Essentials</h3>

            <div className="grid gap-6 sm:grid-cols-2">
              <div>
                <label htmlFor="brandName" className="label-text">Boutique or Brand Name</label>
                <input
                  id="brandName"
                  type="text"
                  required
                  value={brandKit.brandName}
                  onChange={(e) => setBrandKit((p) => ({ ...p, brandName: e.target.value }))}
                  className="input-base"
                  placeholder="e.g. Aurelia Fine Jewels"
                />
              </div>

              <div>
                <label htmlFor="fullName" className="label-text">Creative Director / Owner</label>
                <input
                  id="fullName"
                  type="text"
                  value={brandKit.fullName}
                  onChange={(e) => setBrandKit((p) => ({ ...p, fullName: e.target.value }))}
                  className="input-base"
                  placeholder="Your Name"
                />
              </div>
            </div>

            <div>
              <label htmlFor="brandDesc" className="label-text">Brand Story & Heritage</label>
              <textarea
                id="brandDesc"
                rows={3}
                value={brandKit.brandDescription}
                onChange={(e) => setBrandKit((p) => ({ ...p, brandDescription: e.target.value }))}
                className="input-base"
                placeholder="Briefly describe your jewellery craftsmanship, design philosophy, signature gemstones, and boutique heritage..."
              />
              <p className="mt-1.5 text-[11px] text-slate-500">
                This context is infused into your AI advertising captions and prompt engineering.
              </p>
            </div>
          </section>

          {/* Section 2: Visual Style & Palette */}
          <section className="glass space-y-6 p-6 sm:p-8">
            <h3 className="font-serif text-2xl text-white">Colour Palette & Typography</h3>

            <div className="grid gap-4 sm:grid-cols-3">
              <div>
                <label className="label-text">Primary Accent</label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={brandKit.brandColors.primary}
                    onChange={(e) =>
                      setBrandKit((p) => ({
                        ...p,
                        brandColors: { ...p.brandColors, primary: e.target.value },
                      }))
                    }
                    className="h-10 w-12 cursor-pointer rounded-lg border border-white/20 bg-transparent p-1"
                  />
                  <input
                    type="text"
                    value={brandKit.brandColors.primary}
                    onChange={(e) =>
                      setBrandKit((p) => ({
                        ...p,
                        brandColors: { ...p.brandColors, primary: e.target.value },
                      }))
                    }
                    className="input-base text-xs font-mono uppercase"
                  />
                </div>
              </div>

              <div>
                <label className="label-text">Gold / Champagne Detail</label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={brandKit.brandColors.secondary}
                    onChange={(e) =>
                      setBrandKit((p) => ({
                        ...p,
                        brandColors: { ...p.brandColors, secondary: e.target.value },
                      }))
                    }
                    className="h-10 w-12 cursor-pointer rounded-lg border border-white/20 bg-transparent p-1"
                  />
                  <input
                    type="text"
                    value={brandKit.brandColors.secondary}
                    onChange={(e) =>
                      setBrandKit((p) => ({
                        ...p,
                        brandColors: { ...p.brandColors, secondary: e.target.value },
                      }))
                    }
                    className="input-base text-xs font-mono uppercase"
                  />
                </div>
              </div>

              <div>
                <label className="label-text">Studio Canvas</label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={brandKit.brandColors.background}
                    onChange={(e) =>
                      setBrandKit((p) => ({
                        ...p,
                        brandColors: { ...p.brandColors, background: e.target.value },
                      }))
                    }
                    className="h-10 w-12 cursor-pointer rounded-lg border border-white/20 bg-transparent p-1"
                  />
                  <input
                    type="text"
                    value={brandKit.brandColors.background}
                    onChange={(e) =>
                      setBrandKit((p) => ({
                        ...p,
                        brandColors: { ...p.brandColors, background: e.target.value },
                      }))
                    }
                    className="input-base text-xs font-mono uppercase"
                  />
                </div>
              </div>
            </div>

            <div>
              <label htmlFor="typographySelect" className="label-text">Brand Typography</label>
              <select
                id="typographySelect"
                value={brandKit.typography}
                onChange={(e) => setBrandKit((p) => ({ ...p, typography: e.target.value }))}
                className="input-base"
              >
                {TYPOGRAPHY_OPTIONS.map((t) => (
                  <option key={t.id} value={t.id} className="bg-onyx text-white">
                    {t.label}
                  </option>
                ))}
              </select>
            </div>
          </section>

          {/* Section 3: Default AI Marketing Presets */}
          <section className="glass space-y-6 p-6 sm:p-8">
            <h3 className="font-serif text-2xl text-white">Default Marketing Guidelines</h3>

            <div className="grid gap-6 sm:grid-cols-2">
              <div>
                <label htmlFor="defaultStyleSelect" className="label-text">Default Advertising Style</label>
                <select
                  id="defaultStyleSelect"
                  value={brandKit.defaultStyle}
                  onChange={(e) => setBrandKit((p) => ({ ...p, defaultStyle: e.target.value }))}
                  className="input-base"
                >
                  {STYLE_OPTIONS.map((s) => (
                    <option key={s.id} value={s.id} className="bg-onyx text-white">
                      {s.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="toneSelect" className="label-text">Signature Marketing Tone</label>
                <select
                  id="toneSelect"
                  value={brandKit.marketingTone}
                  onChange={(e) => setBrandKit((p) => ({ ...p, marketingTone: e.target.value }))}
                  className="input-base"
                >
                  {TONE_OPTIONS.map((t) => (
                    <option key={t} value={t} className="bg-onyx text-white">
                      {t}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <button type="submit" disabled={saving} className="btn-primary w-full py-3.5 text-base">
              {saving && <Loader2 className="h-5 w-5 animate-spin" />}
              Save Brand Kit Guidelines
            </button>
          </section>
        </div>

        {/* Right Sidebar: Brand Card Preview & Logo */}
        <div className="space-y-6 lg:col-span-4">
          <div className="glass sticky top-24 space-y-6 p-6">
            <h3 className="font-serif text-xl text-white">Boutique Brand Card</h3>

            {/* Logo Upload Box */}
            <div className="space-y-3">
              <span className="label-text">Brand Insignia / Logo</span>
              <div className="relative flex aspect-video flex-col items-center justify-center rounded-2xl border border-dashed border-white/20 bg-black/40 p-4 text-center overflow-hidden">
                {brandKit.logoUrl ? (
                  <img src={brandKit.logoUrl} alt="Logo" className="max-h-24 max-w-full object-contain" />
                ) : (
                  <>
                    <ImageIcon className="mb-2 h-8 w-8 text-slate-500" />
                    <p className="text-xs text-slate-400">PNG, SVG or WEBP with transparent background</p>
                  </>
                )}

                <label className="btn-secondary absolute bottom-3 cursor-pointer text-xs py-1.5 px-3">
                  {uploadingLogo ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <Upload className="h-3 w-3" />
                  )}
                  {brandKit.logoUrl ? 'Replace Logo' : 'Upload Logo'}
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp,image/svg+xml"
                    onChange={handleLogoUpload}
                    className="hidden"
                  />
                </label>
              </div>
            </div>

            {/* Live Visual Card */}
            <div
              className="rounded-2xl border p-6 shadow-2xl transition-all"
              style={{
                backgroundColor: brandKit.brandColors.background,
                borderColor: `${brandKit.brandColors.primary}40`,
              }}
            >
              <div className="mb-4 flex items-center justify-between">
                <span
                  className="text-xs uppercase tracking-widest font-semibold"
                  style={{ color: brandKit.brandColors.secondary }}
                >
                  Official Brand Kit
                </span>
                <span
                  className="h-2 w-2 rounded-full"
                  style={{ backgroundColor: brandKit.brandColors.primary }}
                />
              </div>

              <h4
                className="text-2xl font-semibold"
                style={{
                  color: '#ffffff',
                  fontFamily: brandKit.typography,
                }}
              >
                {brandKit.brandName || 'Your Boutique'}
              </h4>

              <p className="mt-2 line-clamp-3 text-xs text-slate-300">
                {brandKit.brandDescription ||
                  'Luxury fine jewellery craftsmanship, timeless silhouettes, and bespoke gemstones.'}
              </p>

              <div className="mt-6 flex items-center gap-2 border-t border-white/10 pt-4">
                <span className="text-[11px] text-slate-400">Palette:</span>
                <span
                  className="h-5 w-5 rounded-full border border-white/20 shadow"
                  style={{ backgroundColor: brandKit.brandColors.primary }}
                  title="Primary Accent"
                />
                <span
                  className="h-5 w-5 rounded-full border border-white/20 shadow"
                  style={{ backgroundColor: brandKit.brandColors.secondary }}
                  title="Secondary Gold"
                />
                <span
                  className="h-5 w-5 rounded-full border border-white/20 shadow"
                  style={{ backgroundColor: brandKit.brandColors.background }}
                  title="Background"
                />
              </div>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
