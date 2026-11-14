import { ImageOff } from 'lucide-react';
import { useState } from 'react';
import { getProductImageUrl } from '@/lib/products';

interface ProductThumbProps {
  imagePath: string;
  alt: string;
  className?: string;
}

export function ProductThumb({ imagePath, alt, className = '' }: ProductThumbProps) {
  const [failed, setFailed] = useState(false);

  return (
    <div className={`relative aspect-square overflow-hidden rounded-xl border border-white/5 bg-emerald-deep ${className}`}>
      {failed ? (
        <div className="flex h-full w-full items-center justify-center text-slate-600">
          <ImageOff className="h-6 w-6" strokeWidth={1.5} />
        </div>
      ) : (
        <img
          src={getProductImageUrl(imagePath)}
          alt={alt}
          loading="lazy"
          onError={() => setFailed(true)}
          className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
        />
      )}
    </div>
  );
}
