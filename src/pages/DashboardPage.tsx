import { useCallback, useEffect, useState } from 'react';
import {
  CalendarClock,
  Clapperboard,
  Image as ImageIcon,
  Package,
  Plus,
  Send,
  Sparkles,
  UserRound,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { PageHeader } from '@/components/PageHeader';
import { ProductThumb } from '@/components/products/ProductThumb';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import { fetchAiAds, getAdImageUrl } from '@/lib/adGenerator';
import { fetchProductCount, fetchRecentProducts } from '@/lib/products';
import { supabase } from '@/lib/supabase';
import type { AiAdCreative } from '@/types/ai';
import type { Product } from '@/types/product';

interface StatCardProps {
  label: string;
  value: number | null;
  hint: string;
  icon: typeof Package;
  linkTo?: string;
}

function StatCard({ label, value, hint, icon: Icon, linkTo }: StatCardProps) {
  const content = (
    <div className="glass group p-6 transition-all duration-300 hover:-translate-y-1 hover:border-emerald-500/30 hover:shadow-glow">
      <div className="mb-6 flex items-center justify-between">
        <span className="text-xs font-medium uppercase tracking-[0.14em] text-slate-400">{label}</span>
        <Icon className="h-5 w-5 text-emerald-400 transition-transform duration-300 group-hover:scale-110" strokeWidth={1.5} />
      </div>
      <p className="font-serif text-4xl font-semibold text-white">{value ?? '-'}</p>
      <p className="mt-2 text-xs text-slate-500">{hint}</p>
    </div>
  );

  return linkTo ? <Link to={linkTo}>{content}</Link> : content;
}

export function DashboardPage() {
  const { user } = useAuth();
  const { notify } = useToast();

  const [productCount, setProductCount] = useState<number | null>(null);
  const [adsCount, setAdsCount] = useState<number | null>(null);
  const [modelsCount, setModelsCount] = useState<number | null>(null);
  const [publishedCount, setPublishedCount] = useState<number | null>(null);
  const [campaignsCount, setCampaignsCount] = useState<number | null>(null);

  const [recentProducts, setRecentProducts] = useState<Product[] | null>(null);
  const [recentCreatives, setRecentCreatives] = useState<AiAdCreative[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const firstName = ((user?.user_metadata?.full_name as string | undefined) ?? '').split(' ')[0];

  const loadDashboard = useCallback(async () => {
    setLoadError(null);
    try {
      const [
        prodCount,
        recentProds,
        recentAds,
        adsCountRes,
        modelsCountRes,
        publishedCountRes,
        campaignsCountRes,
      ] = await Promise.all([
        fetchProductCount(),
        fetchRecentProducts(4),
        fetchAiAds(),
        supabase.from('ai_ads').select('id', { count: 'exact', head: true }),
        supabase.from('ai_models').select('id', { count: 'exact', head: true }),
        supabase.from('scheduled_posts').select('id', { count: 'exact', head: true }).eq('status', 'published'),
        supabase.from('campaigns').select('id', { count: 'exact', head: true }),
      ]);

      setProductCount(prodCount);
      setRecentProducts(recentProds);
      setRecentCreatives((recentAds || []).slice(0, 4));
      setAdsCount(adsCountRes.count ?? 0);
      setModelsCount(modelsCountRes.count ?? 0);
      setPublishedCount(publishedCountRes.count ?? 0);
      setCampaignsCount(campaignsCountRes.count ?? 0);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Could not load your dashboard.';
      setLoadError(message);
      notify(message, 'error');
    }
  }, [notify]);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  return (
    <div className="space-y-10">
      <PageHeader
        eyebrow="Dashboard"
        title={firstName ? `Welcome, ${firstName}.` : 'Welcome to Jewels AI.'}
        description="Your AI-powered luxury jewellery marketing studio."
      />

      {loadError && (
        <div role="alert" className="glass flex flex-wrap items-center justify-between gap-4 border-red-500/30 p-5">
          <p className="text-sm text-red-300">We could not load your dashboard stats. {loadError}</p>
          <button type="button" onClick={loadDashboard} className="btn-secondary px-4 py-2">
            Try again
          </button>
        </div>
      )}

      {/* Real Statistics Grid */}
      <section className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Jewellery uploaded"
          value={productCount}
          hint="Your jewellery catalogue"
          icon={Package}
          linkTo="/products"
        />
        <StatCard
          label="Advertisements"
          value={adsCount}
          hint="Creatives generated"
          icon={ImageIcon}
          linkTo="/ai-ads"
        />
        <StatCard
          label="AI Model Photos"
          value={modelsCount}
          hint="Fashion model studio shoots"
          icon={UserRound}
          linkTo="/ai-models"
        />
        <StatCard
          label="Active Campaigns"
          value={campaignsCount}
          hint="Marketing collections"
          icon={Clapperboard}
          linkTo="/campaigns"
        />
      </section>

      {/* Showcase and Quick Actions */}
      <section className="grid gap-6 xl:grid-cols-3">
        {/* Recent Jewellery Products */}
        <div className="glass p-6 xl:col-span-2">
          <div className="mb-6 flex items-center justify-between">
            <h2 className="font-serif text-2xl text-white">Recent Pieces</h2>
            <Link to="/products" className="text-sm text-champagne transition-colors hover:text-champagne-light">
              View all pieces
            </Link>
          </div>

          {recentProducts === null && !loadError && (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              {[0, 1, 2, 3].map((i) => (
                <div key={i} className="aspect-square animate-pulse rounded-xl bg-white/5" />
              ))}
            </div>
          )}

          {recentProducts && recentProducts.length === 0 && (
            <div className="flex flex-col items-center py-10 text-center">
              <p className="font-serif text-xl text-white">Your showcase is empty</p>
              <p className="mt-2 max-w-sm text-sm text-slate-400">
                Upload your first jewellery photograph to begin creating AI advertisements.
              </p>
              <Link to="/products?new=1" className="btn-primary mt-6">
                <Plus className="h-4 w-4" /> Upload a piece
              </Link>
            </div>
          )}

          {recentProducts && recentProducts.length > 0 && (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              {recentProducts.map((product) => (
                <Link key={product.id} to="/products" className="group">
                  <ProductThumb imagePath={product.image_path} alt={product.name} />
                  <p className="mt-3 truncate text-sm font-medium text-white group-hover:text-champagne">{product.name}</p>
                  <p className="text-xs text-slate-500">{product.category}</p>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Quick Actions */}
        <div className="glass p-6">
          <h2 className="mb-6 font-serif text-2xl text-white">Quick Actions</h2>
          <div className="space-y-3">
            <Link to="/products?new=1" className="btn-primary w-full">
              <Plus className="h-4 w-4" /> Upload Jewellery
            </Link>
            <Link to="/ai-ads" className="btn-secondary w-full">
              <Sparkles className="h-4 w-4 text-champagne" /> Generate Advertisement
            </Link>
            <Link to="/ai-models" className="btn-secondary w-full">
              <UserRound className="h-4 w-4 text-emerald-400" /> Shoot AI Fashion Model
            </Link>
            <Link to="/calendar" className="btn-secondary w-full">
              <CalendarClock className="h-4 w-4 text-slate-400" /> Plan Content Calendar
            </Link>
            <Link to="/instagram" className="btn-secondary w-full">
              <Send className="h-4 w-4 text-champagne" /> Connect Instagram
            </Link>
          </div>
        </div>
      </section>

      {/* Recent Generated Creatives Section */}
      {recentCreatives && recentCreatives.length > 0 && (
        <section className="glass p-6 sm:p-8">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h2 className="font-serif text-2xl text-white">Recent Generated Creatives</h2>
              <p className="mt-1 text-xs text-slate-400">Your latest AI advertisements ready for publishing</p>
            </div>
            <Link to="/ai-ads" className="text-sm text-champagne transition-colors hover:text-champagne-light">
              Open Ad Generator
            </Link>
          </div>

          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {recentCreatives.map((creative) => (
              <Link
                key={creative.id}
                to="/ai-ads"
                className="group relative overflow-hidden rounded-xl border border-white/10 bg-black/60 transition-all hover:border-champagne"
              >
                <img
                  src={getAdImageUrl(creative.image_path)}
                  alt={creative.prompt}
                  className="aspect-square w-full object-cover"
                />
                <div className="absolute inset-0 flex flex-col justify-end bg-gradient-to-t from-black/80 via-transparent p-3 opacity-0 transition-opacity group-hover:opacity-100">
                  <p className="truncate text-xs font-medium text-white">{creative.product_name || 'Jewellery Ad'}</p>
                  <p className="text-[10px] text-champagne">{creative.ad_style}</p>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
