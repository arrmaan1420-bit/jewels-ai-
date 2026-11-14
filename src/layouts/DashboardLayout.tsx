import { useEffect, useState } from 'react';
import {
  CalendarDays,
  Clapperboard,
  LayoutDashboard,
  LogOut,
  Menu,
  Package,
  Palette,
  Send,
  Settings,
  Sparkles,
  UserRound,
  X,
  type LucideIcon,
} from 'lucide-react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { Logo } from '@/components/Logo';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';

interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
}

const NAV_ITEMS: NavItem[] = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/products', label: 'My Products', icon: Package },
  { to: '/ai-ads', label: 'AI Ad Generator', icon: Sparkles },
  { to: '/ai-models', label: 'AI Model Studio', icon: UserRound },
  { to: '/campaigns', label: 'Campaign Studio', icon: Clapperboard },
  { to: '/instagram', label: 'Instagram Publishing', icon: Send },
  { to: '/calendar', label: 'Content Calendar', icon: CalendarDays },
  { to: '/brand-kit', label: 'Brand Kit', icon: Palette },
  { to: '/settings', label: 'Settings', icon: Settings },
];

function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const { user, signOut } = useAuth();
  const { notify } = useToast();

  const displayName = (user?.user_metadata?.full_name as string | undefined) || user?.email || 'Your studio';

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch {
      notify('Could not sign out. Please try again.', 'error');
    }
  };

  return (
    <div className="flex h-full flex-col">
      <div className="px-6 py-8">
        <Logo />
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto px-3">
        {NAV_ITEMS.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            onClick={onNavigate}
            className={({ isActive }) =>
              `group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-all duration-200 ${
                isActive
                  ? 'bg-emerald-500/10 text-white shadow-[inset_2px_0_0_0_#D6B56D]'
                  : 'text-slate-400 hover:bg-white/5 hover:text-slate-100'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <Icon
                  className={`h-[18px] w-[18px] transition-colors ${isActive ? 'text-champagne' : 'text-slate-500 group-hover:text-emerald-400'}`}
                  strokeWidth={1.6}
                />
                {label}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      <div className="border-t border-white/5 p-4">
        <div className="mb-3 flex items-center gap-3 px-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-full border border-champagne/30 bg-emerald-deep text-sm font-semibold text-champagne">
            {displayName.charAt(0).toUpperCase()}
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-white">{displayName}</p>
            <p className="truncate text-xs text-slate-500">{user?.email}</p>
          </div>
        </div>
        <button
          type="button"
          onClick={handleSignOut}
          className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-slate-400 transition-colors hover:bg-red-500/10 hover:text-red-300"
        >
          <LogOut className="h-[18px] w-[18px]" strokeWidth={1.6} />
          Sign out
        </button>
      </div>
    </div>
  );
}

export function DashboardLayout() {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const location = useLocation();

  useEffect(() => {
    setDrawerOpen(false);
  }, [location.pathname]);

  return (
    <div className="min-h-screen lg:flex">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-72 border-r border-emerald-500/10 bg-onyx/90 backdrop-blur-xl lg:block">
        <SidebarContent />
      </aside>

      <header className="sticky top-0 z-20 flex items-center justify-between border-b border-emerald-500/10 bg-onyx/90 px-5 py-4 backdrop-blur-xl lg:hidden">
        <Logo compact />
        <button
          type="button"
          onClick={() => setDrawerOpen(true)}
          className="rounded-xl border border-white/10 p-2 text-slate-200"
          aria-label="Open navigation"
        >
          <Menu className="h-5 w-5" />
        </button>
      </header>

      {drawerOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={() => setDrawerOpen(false)}
            aria-label="Close navigation"
          />
          <aside className="absolute inset-y-0 left-0 w-72 border-r border-emerald-500/10 bg-onyx shadow-2xl animate-fade-up">
            <button
              type="button"
              onClick={() => setDrawerOpen(false)}
              className="absolute right-4 top-6 text-slate-400 hover:text-white"
              aria-label="Close navigation"
            >
              <X className="h-5 w-5" />
            </button>
            <SidebarContent onNavigate={() => setDrawerOpen(false)} />
          </aside>
        </div>
      )}

      <main className="min-h-screen flex-1 lg:pl-72">
        <div key={location.pathname} className="animate-fade-up mx-auto max-w-7xl px-5 py-8 sm:px-8 lg:px-12 lg:py-12">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
