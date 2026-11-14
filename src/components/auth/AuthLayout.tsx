import type { ReactNode } from 'react';
import { Logo } from '@/components/Logo';

interface AuthLayoutProps {
  title: string;
  subtitle: string;
  children: ReactNode;
  footer: ReactNode;
}

export function AuthLayout({ title, subtitle, children, footer }: AuthLayoutProps) {
  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <aside className="relative hidden overflow-hidden border-r border-emerald-500/10 lg:flex lg:flex-col lg:justify-between lg:p-12">
        <div className="absolute inset-0 -z-10 bg-gradient-to-b from-emerald-deep via-onyx to-onyx opacity-90" />
        <div className="absolute -left-24 top-1/3 -z-10 h-96 w-96 rounded-full bg-emerald-500/10 blur-3xl" />
        <Logo />
        <div className="animate-fade-up max-w-md">
          <p className="mb-4 text-xs uppercase tracking-[0.3em] text-champagne">Luxury AI Marketing</p>
          <h2 className="font-serif text-5xl leading-tight text-white">Where Jewellery Meets Artificial Intelligence.</h2>
          <p className="mt-6 text-base text-slate-400">
            Turn every piece in your collection into campaigns, advertisements and AI fashion imagery worthy of a boutique.
          </p>
        </div>
        <p className="text-xs text-slate-600">Crafted for jewellery houses, boutiques and creators.</p>
      </aside>

      <main className="flex items-center justify-center px-6 py-12 sm:px-12">
        <div className="w-full max-w-md animate-fade-up">
          <div className="mb-10 lg:hidden">
            <Logo />
          </div>
          <h1 className="font-serif text-4xl font-semibold">{title}</h1>
          <p className="mt-3 text-sm text-slate-400">{subtitle}</p>
          <div className="mt-8">{children}</div>
          <div className="mt-8 text-center text-sm text-slate-400">{footer}</div>
        </div>
      </main>
    </div>
  );
}
