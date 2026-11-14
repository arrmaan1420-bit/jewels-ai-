import { Link } from 'react-router-dom';
import { Pencil, Sparkles, Trash2 } from 'lucide-react';
import { ProductThumb } from '@/components/products/ProductThumb';
import type { Product } from '@/types/product';

interface ProductCardProps {
  product: Product;
  onEdit: (product: Product) => void;
  onDelete: (product: Product) => void;
}

const priceFormatter = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 });

export function ProductCard({ product, onEdit, onDelete }: ProductCardProps) {
  return (
    <article className="glass group flex flex-col overflow-hidden p-4 transition-all duration-300 hover:-translate-y-1 hover:border-emerald-500/30 hover:shadow-glow">
      <ProductThumb imagePath={product.image_path} alt={product.name} />

      <div className="flex flex-1 flex-col pt-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="truncate font-serif text-xl">{product.name}</h3>
            <p className="mt-1 text-xs uppercase tracking-[0.14em] text-champagne">{product.category}</p>
          </div>
          {product.price !== null && (
            <p className="shrink-0 text-sm font-medium text-white">{priceFormatter.format(product.price)}</p>
          )}
        </div>

        <dl className="mt-4 space-y-1.5 text-xs text-slate-400">
          {product.material && (
            <div className="flex gap-2">
              <dt className="text-slate-500">Material</dt>
              <dd className="truncate text-slate-300">{product.material}</dd>
            </div>
          )}
          {product.gemstone && (
            <div className="flex gap-2">
              <dt className="text-slate-500">Gemstone</dt>
              <dd className="truncate text-slate-300">{product.gemstone}</dd>
            </div>
          )}
        </dl>

        {product.description && <p className="mt-3 line-clamp-2 text-sm text-slate-400">{product.description}</p>}

        <div className="mt-auto space-y-3 pt-5">
          <Link
            to={`/ai-ads?product=${product.id}`}
            className="btn-primary w-full py-2.5"
          >
            <Sparkles className="h-4 w-4" /> Generate advertisement
          </Link>
          <div className="grid grid-cols-2 gap-3">
            <button type="button" onClick={() => onEdit(product)} className="btn-secondary py-2.5">
              <Pencil className="h-4 w-4" /> Edit
            </button>
            <button
              type="button"
              onClick={() => onDelete(product)}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-red-500/20 px-5 py-2.5 text-sm font-medium text-red-300 transition-all duration-200 hover:border-red-500/50 hover:bg-red-500/10"
            >
              <Trash2 className="h-4 w-4" /> Delete
            </button>
          </div>
        </div>
      </div>
    </article>
  );
}
