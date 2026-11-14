import { useCallback, useEffect, useMemo, useState } from 'react';
import { Gem, Plus, RefreshCw, Search } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { PageHeader } from '@/components/PageHeader';
import { ProductCard } from '@/components/products/ProductCard';
import { ProductFormDialog } from '@/components/products/ProductFormDialog';
import { useToast } from '@/contexts/ToastContext';
import { deleteProduct, fetchProducts } from '@/lib/products';
import { PRODUCT_CATEGORIES, type Product } from '@/types/product';

function SkeletonGrid() {
  return (
    <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
      {[0, 1, 2].map((i) => (
        <div key={i} className="glass h-[460px] animate-pulse p-4">
          <div className="aspect-square rounded-xl bg-white/5" />
        </div>
      ))}
    </div>
  );
}

export function ProductsPage() {
  const { notify } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();
  const [products, setProducts] = useState<Product[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<string>('All');
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [deleting, setDeleting] = useState<Product | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const load = useCallback(async () => {
    setLoadError(null);
    try {
      setProducts(await fetchProducts());
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : 'Could not load your products.');
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (searchParams.get('new') === '1') {
      setEditing(null);
      setFormOpen(true);
    }
  }, [searchParams]);

  const closeForm = () => {
    setFormOpen(false);
    setEditing(null);
    if (searchParams.has('new')) setSearchParams({}, { replace: true });
  };

  const openCreate = () => {
    setEditing(null);
    setFormOpen(true);
  };

  const openEdit = (product: Product) => {
    setEditing(product);
    setFormOpen(true);
  };

  const handleSaved = (saved: Product) => {
    setProducts((current) => {
      if (!current) return [saved];
      const exists = current.some((item) => item.id === saved.id);
      return exists
        ? current.map((item) => (item.id === saved.id ? saved : item))
        : [saved, ...current];
    });
  };

  const confirmDelete = async () => {
    if (!deleting) return;
    setDeleteLoading(true);
    try {
      await deleteProduct(deleting);
      setProducts((current) => (current ? current.filter((item) => item.id !== deleting.id) : current));
      notify(`"${deleting.name}" was removed from your collection.`);
      setDeleting(null);
    } catch (err) {
      notify(err instanceof Error ? err.message : 'Could not delete this product.', 'error');
    } finally {
      setDeleteLoading(false);
    }
  };

  const visibleProducts = useMemo(() => {
    if (!products) return [];
    const term = query.trim().toLowerCase();
    return products.filter((product) => {
      if (category !== 'All' && product.category !== category) return false;
      if (!term) return true;
      return [product.name, product.material, product.gemstone, product.description]
        .some((field) => field.toLowerCase().includes(term));
    });
  }, [products, query, category]);

  const hasCollection = products !== null && products.length > 0;

  return (
    <div className="space-y-10">
      <PageHeader
        eyebrow="Collection"
        title="My Products"
        description="Your jewellery, photographed and catalogued. Every piece here can become a campaign."
        action={
          <button type="button" onClick={openCreate} className="btn-primary">
            <Plus className="h-4 w-4" /> Upload jewellery
          </button>
        }
      />

      {hasCollection && (
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="relative w-full md:max-w-sm">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by name, material or gemstone"
              className="input-base pl-11"
            />
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {['All', ...PRODUCT_CATEGORIES].map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => setCategory(option)}
                className={`shrink-0 rounded-full border px-4 py-1.5 text-xs font-medium transition-all duration-200 ${
                  category === option
                    ? 'border-champagne/60 bg-champagne/10 text-champagne'
                    : 'border-white/10 text-slate-400 hover:border-emerald-500/40 hover:text-white'
                }`}
              >
                {option}
              </button>
            ))}
          </div>
        </div>
      )}

      {loadError && (
        <div role="alert" className="glass flex flex-wrap items-center justify-between gap-4 border-red-500/30 p-5">
          <p className="text-sm text-red-300">We could not load your products. {loadError}</p>
          <button type="button" onClick={load} className="btn-secondary px-4 py-2">
            <RefreshCw className="h-4 w-4" /> Try again
          </button>
        </div>
      )}

      {products === null && !loadError && <SkeletonGrid />}

      {products !== null && products.length === 0 && (
        <div className="glass flex flex-col items-center px-6 py-20 text-center">
          <span className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl border border-champagne/30 bg-emerald-deep">
            <Gem className="h-7 w-7 text-champagne" strokeWidth={1.4} />
          </span>
          <h2 className="font-serif text-3xl">Begin your collection</h2>
          <p className="mt-3 max-w-md text-sm text-slate-400">
            Upload photographs of your jewellery and add its details. Your products will appear here in an elegant gallery, ready for campaigns.
          </p>
          <button type="button" onClick={openCreate} className="btn-primary mt-8">
            <Plus className="h-4 w-4" /> Upload your first piece
          </button>
        </div>
      )}

      {hasCollection && visibleProducts.length === 0 && (
        <p className="py-16 text-center text-sm text-slate-500">No products match your search. Try a different name or category.</p>
      )}

      {visibleProducts.length > 0 && (
        <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
          {visibleProducts.map((product) => (
            <ProductCard key={product.id} product={product} onEdit={openEdit} onDelete={setDeleting} />
          ))}
        </div>
      )}

      <ProductFormDialog
        open={formOpen}
        product={editing}
        onClose={closeForm}
        onSaved={handleSaved}
      />

      <ConfirmDialog
        open={deleting !== null}
        title="Delete this product?"
        description={`"${deleting?.name ?? ''}" and its photograph will be permanently removed. Advertisements created from it are not affected.`}
        confirmLabel="Delete product"
        loading={deleteLoading}
        onConfirm={confirmDelete}
        onCancel={() => setDeleting(null)}
      />
    </div>
  );
}
