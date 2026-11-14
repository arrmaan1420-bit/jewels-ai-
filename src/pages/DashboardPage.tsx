import { useCallback, useEffect, useState } from 'react';
import { Clapperboard, Image as ImageIcon, Package, Plus, Send, CalendarClock } from 'lucide-react';
import { Link } from 'react-router-dom';
import { PageHeader } from '@/components/PageHeader';
import { ProductThumb } from '@/components/products/ProductThumb';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import { fetchProductCount, fetchRecentProducts } from '@/lib/products';
import type { Product } from '@/types/product';

interface StatCardProps {
  label: string;
  value: number | null;
  hint: string;
  icon: typeof Package;
}

function StatCard({ label, value, hint, icon: Icon }: StatCardProps) {
  return (
    <div className="glass group p-6 transition-all duration-300 hover:-translate-y-1 hover:border-emerald-500/30 hover:shadow-glow">
      <div className="mb-6 flex items-center justify-between">
        <span className="text-xs font-medium uppercase tracking-[0.14em] text-slate-400">{label}</span>
        <Icon className="h-5 w-5 text-emerald-400 transition-transform duration-300 group-hover:scale-110" strokeWidth={1.5} />
      </div>
      <p className="font-serif text-4xl font-semibold text-white">{value ?? '-'}</p>
      <p className="mt-2 text-xs text-slate-500">{hint}</p>
    </div>
  );
}

export function DashboardPage() {
  const { user } = useAuth();
  const { notify } = useToast();
  const [productCount, setProductCount] = useState<number | null>(null);
  const [recent, setRecent] = useState<Product[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const firstName = ((user?.user_metadata?.full_name as string | undefined) ?? '').split(' ')[0];

  const load = useCallback(async () => {
    setLoadError(null);
    try {
      const [count, products] = await Promise.all([fetchProductCount(), fetchRecentProducts(4)]);
      setProductCount(count);
      setRecent(products);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Could not load your dashboard.';
      setLoadError(message);
      notify(message, 'error');
    }
  }, [notify]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="space-y-10">
      <PageHeader
        eyebrow="Dashboard"
        title={firstName ? `Welcome, ${firstName}.` : 'Welcome to Jewels AI.'}
        description="Welcome to Jewels AI. Let's create something extraordinary."
      />

      {loadError && (
        <div role="alert" className="glass flex flex-wrap items-center justify-between gap-4 border-red-500/30 p-5">
          <p className="text-sm text-red-300">We could not load your dashboard. {loadError}</p>
          <button type="button" onClick={load} className="btn-secondary px-4 py-2">
            Try again
          </button>
        </div>
      )}

      <section className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Products uploaded" value={productCount} hint="Your jewellery collection" icon={Package} />
        <StatCard label="Advertisements" value={0} hint="Ready once the Ad Generator is connected" icon={ImageIcon} />
        <StatCard label="Instagram posts" value={0} hint="Published through Instagram Publishing" icon={Send} />
        <StatCard label="Scheduled campaigns" value={0} hint="Planned in the Content Calendar" icon={CalendarClock} />
      </section>

      <section className="grid gap-6 xl:grid-cols-3">
        <div className="glass p-6 xl:col-span-2">
          <div className="mb-6 flex items-center justify-between">
            <h2 className="font-serif text-2xl">Recent projects</h2>
            <Link to="/products" className="text-sm text-emerald-400 transition-colors hover:text-emerald-300">
              View all
            </Link>
          </div>

          {recent === null && !loadError && (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              {[0, 1, 2, 3].map((i) => (
                <div key={i} className="aspect-square animate-pulse rounded-xl bg-white/5" />
              ))}
            </div>
          )}

          {recent && recent.length === 0 && (
            <div className="flex flex-col items-center py-10 text-center">
              <p className="font-serif text-xl text-white">Your showcase is empty</p>
              <p className="mt-2 max-w-sm text-sm text-slate-400">Upload your first jewellery photograph to begin creating campaigns.</p>
              <Link to="/products?new=1" className="btn-primary mt-6">
                <Plus className="h-4 w-4" /> Upload a product
              </Link>
            </div>
          )}

          {recent && recent.length > 0 && (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              {recent.map((product) => (
                <Link key={product.id} to="/products" className="group">
                  <ProductThumb imagePath={product.image_path} alt={product.name} />
                  <p className="mt-3 truncate text-sm font-medium text-white">{product.name}</p>
                  <p className="text-xs text-slate-500">{product.category}</p>
                </Link>
              ))}
            </div>
          )}
        </div>

        <div className="glass p-6">
          <h2 className="mb-6 font-serif text-2xl">Quick actions</h2>
          <div className="space-y-3">
            <Link to="/products?new=1" className="btn-primary w-full">
              <Plus className="h-4 w-4" /> Upload jewellery
            </Link>
            <Link to="/ai-ads" className="btn-secondary w-full">
              <Clapperboard className="h-4 w-4" /> Open Ad Generator
            </Link>
            <Link to="/instagram" className="btn-secondary w-full">
              <Send className="h-4 w-4" /> Connect Instagram
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
