import type { ReactNode } from 'react';
import { Gem } from 'lucide-react';

interface PageHeaderProps {
  eyebrow: string;
  title: string;
  description?: string;
  action?: ReactNode;
}

export function PageHeader({ eyebrow, title, description, action }: PageHeaderProps) {
  return (
    <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
      <div className="max-w-2xl">
        <p className="mb-3 flex items-center gap-2 text-xs uppercase tracking-[0.25em] text-champagne">
          <Gem className="h-3.5 w-3.5" strokeWidth={1.5} />
          {eyebrow}
        </p>
        <h1 className="font-serif text-4xl font-semibold sm:text-5xl">{title}</h1>
        {description && <p className="mt-3 text-base text-slate-400">{description}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}
