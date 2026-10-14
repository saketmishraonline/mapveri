import { useState, useRef, useEffect } from 'react';
import { Link, useLocation } from 'wouter';
import { MapPinned, Compass, UserRound, Coins, ShieldCheck, LogOut, Bell, Menu, X, Activity, Layers3 } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { useGetMe, getGetMeQueryKey, useListPins, getListPinsQueryKey, type Pin, type NearbyPin } from '@workspace/api-client-react';
import { PwaInstallButton } from '@/components/pwa-prompt';
import { signOutUser } from '@/lib/supabase';

export const colors = {
  ink: 'text-[#172a3a]',
  teal: 'text-[#2d6b60]',
  saffron: 'text-[#dba91a]',
  coral: 'text-[#d9533a]',
};

export function formatDate(value?: string) {
  if (!value) return '—';
  return new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(value));
}

export function formatDistance(meters?: number) {
  if (meters === undefined) return '';
  return meters < 1000 ? `${Math.round(meters)} m away` : `${(meters / 1000).toFixed(1)} km away`;
}

export function initials(name = 'MapVeri') {
  return name.split(' ').map((part) => part[0]).slice(0, 2).join('').toUpperCase();
}

export function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <Link href="/map" className="flex items-center gap-2.5 group" data-testid="link-logo">
      <span className="relative grid h-9 w-9 shrink-0 place-items-center overflow-hidden rounded-[11px] bg-[#f1c744] text-[#172a3a] shadow-sm">
        <MapPinned size={21} strokeWidth={2.5} />
        <span className="absolute bottom-0 left-0 h-1.5 w-full bg-[#d9533a]" />
      </span>
      {!compact && <span className="font-display text-lg font-bold tracking-[-.04em] text-[#f6f1df]">mapveri</span>}
    </Link>
  );
}

export function Avatar({ name, size = 'md', src }: { name?: string; size?: 'sm' | 'md' | 'lg'; src?: string | null }) {
  const sizeClass = size === 'lg' ? 'h-16 w-16 text-lg' : size === 'sm' ? 'h-7 w-7 text-[10px]' : 'h-9 w-9 text-xs';
  if (src) {
    return (
      <img
        src={src}
        alt={name ?? 'User avatar'}
        className={`shrink-0 rounded-full object-cover ring-1 ring-[#1b584d]/15 shadow-2xs ${sizeClass}`}
        data-testid={`img-avatar-${name ?? 'user'}`}
      />
    );
  }
  return <span className={`grid shrink-0 place-items-center rounded-full bg-[#b8d7cb] font-bold text-[#1b584d] ring-1 ring-[#1b584d]/15 shadow-2xs ${sizeClass}`} data-testid={`img-avatar-${name ?? 'user'}`}>{initials(name)}</span>;
}

export function LevelBadge({ level }: { level?: string }) {
  const style = level === 'A' ? 'bg-[#fef3c7] text-[#78540c] border border-[#f5db7b]' : level === 'B' ? 'bg-[#daf0e3] text-[#1b5e50] border border-[#a8d9bf]' : 'bg-[#fce5dc] text-[#8c402e] border border-[#f3bead]';
  return <span className={`inline-flex items-center rounded-full px-2 py-0.5 font-mono-map text-[10px] font-semibold uppercase tracking-[0.08em] shadow-2xs ${style}`} data-testid={`badge-level-${level}`}>Level {level ?? 'C'}</span>;
}

export function StatusPill({ status }: { status?: string }) {
  const config: Record<string, { label: string; className: string }> = {
    admin_verified: { label: 'Admin verified', className: 'bg-[#daf0e3] text-[#1b5e50] border border-[#a8d9bf]' },
    community_verified: { label: 'Community verified', className: 'bg-[#fef3c7] text-[#78540c] border border-[#f5db7b]' },
    unverified: { label: 'Needs verification', className: 'bg-[#fce5dc] text-[#933c2a] border border-[#f3bead]' },
    rejected: { label: 'Rejected', className: 'bg-[#ede5e3] text-[#6d4640] border border-[#d5c3bf]' },
  };
  const item = config[status ?? 'unverified'] ?? config.unverified;
  return <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-medium shadow-2xs ${item.className}`} data-testid={`status-pin-${status}`}>{item.label}</span>;
}

export function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse rounded-md bg-[#dce4dc] ${className}`} aria-hidden="true" />;
}

export function ErrorState({ message = 'We could not reach the map service.', onRetry }: { message?: string; onRetry?: () => void }) {
  return <div className="rounded-xl border border-[#e2b4a8] bg-[#fbebe6] p-5 text-center" data-testid="state-error">
    <div className="mx-auto mb-2 grid h-9 w-9 place-items-center rounded-full bg-[#d9533a] text-[#fff8ee]"><Activity size={17} /></div>
    <p className="font-semibold text-[#7d392e]">The signal dropped</p>
    <p className="mt-1 text-sm text-[#99594c]">{message}</p>
    {onRetry && <button onClick={onRetry} className="mt-3 rounded-lg bg-[#d9533a] px-3 py-2 text-xs font-bold text-[#fff8ee] transition hover:brightness-95" data-testid="button-retry">Try again</button>}
  </div>;
}

export function EmptyState({ title, description, action }: { title: string; description: string; action?: React.ReactNode }) {
  return <div className="flex min-h-52 flex-col items-center justify-center rounded-xl border border-dashed border-[#c9d4ca] bg-[#f5f4e9] p-8 text-center" data-testid="state-empty">
    <div className="mb-3 grid h-10 w-10 place-items-center rounded-full bg-[#dce9e0] text-[#2d6b60]"><Layers3 size={19} /></div>
    <p className="font-display text-lg font-semibold text-[#172a3a]">{title}</p>
    <p className="mt-1 max-w-sm text-sm leading-6 text-[#60716d]">{description}</p>
    {action && <div className="mt-4">{action}</div>}
  </div>;
}

const navItems = [
  { href: '/map', label: 'Map workspace', icon: Compass },
  { href: '/profile', label: 'My contributions', icon: UserRound },
  { href: '/rewards', label: 'My rewards', icon: Coins },
];

export function UserHeaderControls({ userName }: { userName?: string }) {
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const [notifOpen, setNotifOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const unverifiedQuery = useListPins(
    { status: 'unverified' },
    {
      query: {
        queryKey: getListPinsQueryKey({ status: 'unverified' }),
        staleTime: 30_000,
      },
    }
  );
  const unverifiedPins = (Array.isArray(unverifiedQuery.data) ? unverifiedQuery.data : []) as (Pin | NearbyPin)[];

  useEffect(() => {
    if (!notifOpen && !menuOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setNotifOpen(false);
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [notifOpen, menuOpen]);

  const handleSignOut = async () => {
    setMenuOpen(false);
    await signOutUser();
    queryClient.clear();
    setLocation('/login');
  };

  const handleSelectPinNotification = (pinId: number) => {
    setNotifOpen(false);
    window.dispatchEvent(new CustomEvent('mapveri:select-pin', { detail: { id: pinId } }));
    setLocation(`/map?pin=${pinId}`);
  };

  return (
    <div ref={containerRef} className="relative flex items-center gap-2.5">
      {/* 2nd Button: Notifications (Bell icon) */}
      <div className="relative">
        <button
          onClick={() => {
            setNotifOpen((prev) => !prev);
            setMenuOpen(false);
          }}
          className={`relative rounded-lg p-1.5 transition ${
            notifOpen ? 'bg-[#e4e8dc] text-[#172a3a]' : 'text-[#49655f] hover:bg-[#e4e8dc]'
          }`}
          aria-label="Notifications"
          data-testid="button-notifications"
        >
          <Bell size={17} />
          {unverifiedPins.length > 0 && (
            <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-[#d9533a] px-1 text-[9px] font-bold text-white shadow-xs">
              {unverifiedPins.length}
            </span>
          )}
        </button>

        {/* Notifications Window (Same size as Menu popup) */}
        {notifOpen && (
          <div className="absolute right-0 top-full mt-2 w-72 sm:w-80 rounded-xl border border-[#d6ded4] bg-[#fffdf9] p-3 shadow-2xl z-[100] text-left animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-[#e5ebe3] pb-2">
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-bold text-[#172a3a]">Notifications</span>
                {unverifiedPins.length > 0 && (
                  <span className="rounded-full bg-[#d9533a]/15 px-1.5 py-0.2 font-mono-map text-[9px] font-bold text-[#b83822]">
                    {unverifiedPins.length} new
                  </span>
                )}
              </div>
              <span className="rounded bg-[#f1c744]/30 px-1.5 py-0.5 font-mono-map text-[9px] font-bold text-[#806414]">Live</span>
            </div>

            <div className="mt-2.5 max-h-72 overflow-y-auto space-y-2 pr-0.5">
              {unverifiedPins.length === 0 ? (
                <div className="py-6 text-center">
                  <div className="mx-auto mb-2 flex h-8 w-8 items-center justify-center rounded-full bg-[#e8f1ec] text-[#2d6b60]">
                    <ShieldCheck size={16} />
                  </div>
                  <p className="text-xs font-bold text-[#243f48]">All caught up!</p>
                  <p className="mt-1 text-[11px] text-[#708079] leading-relaxed px-3">
                    No nearby places currently need community verification. You will be notified here when neighbors add new locations.
                  </p>
                </div>
              ) : (
                unverifiedPins.map((pin) => (
                  <div
                    key={pin.id}
                    onClick={() => handleSelectPinNotification(pin.id)}
                    className="group cursor-pointer rounded-lg border border-[#e4ebe2] bg-[#f8f5ea] p-2.5 hover:bg-[#edf3ed] hover:border-[#c5d8c6] transition"
                  >
                    <div className="flex items-start justify-between gap-1.5">
                      <p className="text-xs font-bold text-[#172a3a] group-hover:text-[#2d6b60] transition truncate">
                        {pin.name}
                      </p>
                      <span className="shrink-0 rounded bg-[#e8ede7] px-1.5 py-0.5 text-[9px] font-semibold text-[#2d6b60]">
                        {pin.category}
                      </span>
                    </div>
                    <p className="mt-1 text-[11px] text-[#60716d] line-clamp-2">
                      {pin.description || 'New place added nearby. Community verification requested.'}
                    </p>
                    <div className="mt-2 flex items-center justify-between text-[10px] text-[#708079]">
                      <span>Added by {pin.createdByName || 'neighbor'}</span>
                      <span className="font-bold text-[#2d6b60] group-hover:underline flex items-center gap-0.5">
                        Verify place &rarr;
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="mt-2.5 border-t border-[#f0f0e8] pt-2">
              <p className="text-[10px] text-[#708079] leading-tight text-center">
                Review & verify nearby pins to keep the map reliable and earn points.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* 3rd Button: Profile (Avatar + Name) */}
      <div className="relative">
        <button
          onClick={() => {
            setMenuOpen((prev) => !prev);
            setNotifOpen(false);
          }}
          className={`flex items-center gap-2 border-l border-[#d8d8c8] pl-3 py-0.5 text-sm font-bold text-[#2d6b60] hover:opacity-85 transition cursor-pointer outline-none rounded-r-lg ${
            menuOpen ? 'opacity-90' : ''
          }`}
          data-testid="link-header-profile"
          aria-label="User menu"
        >
          <Avatar name={userName ?? 'admin'} size="sm" />
          <span>{userName ?? 'admin'}</span>
        </button>

        {/* Profile Menu Popup Window (from image 1) */}
        {menuOpen && (
          <div className="absolute right-0 top-full mt-2 w-72 sm:w-80 rounded-xl border border-[#d6ded4] bg-[#fffdf9] p-3 shadow-2xl z-[100] text-left animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-[#e5ebe3] pb-2">
              <span className="text-xs font-bold text-[#172a3a]">Menu</span>
              <span className="rounded bg-[#f1c744]/30 px-1.5 py-0.5 font-mono-map text-[9px] font-bold text-[#806414]">Live</span>
            </div>
            <div className="mt-2 space-y-1.5">
              <Link
                href="/profile"
                onClick={() => setMenuOpen(false)}
                className="block rounded-lg bg-[#f8f5ea] p-2 hover:bg-[#edf3ed] transition"
              >
                <p className="text-xs font-bold text-[#2d6b60]">My Profile</p>
                <p className="text-[11px] text-[#708079]">View contributions and standing.</p>
              </Link>
              <Link
                href="/rewards"
                onClick={() => setMenuOpen(false)}
                className="block rounded-lg bg-[#f8f5ea] p-2 hover:bg-[#edf3ed] transition"
              >
                <p className="text-xs font-bold text-[#2d6b60] flex items-center justify-between">
                  <span>My Rewards</span>
                  <span className="font-mono-map text-[10px] text-[#806414]">10x / 1x</span>
                </p>
                <p className="text-[11px] text-[#708079]">Tokens & crypto redemption.</p>
              </Link>
              <button
                onClick={handleSignOut}
                className="flex w-full items-center gap-2 rounded-lg p-2 text-xs font-bold text-[#a34635] hover:bg-[#fff0ed] transition border-t border-[#f0f0e8] text-left cursor-pointer"
                data-testid="button-header-signout"
              >
                <LogOut size={14} />
                <span>Sign out</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export function Shell({ children, admin = false, hideBreadcrumb = false, hideHeaderOnDesktop = false, headerActions }: { children: React.ReactNode; admin?: boolean; hideBreadcrumb?: boolean; hideHeaderOnDesktop?: boolean; headerActions?: React.ReactNode }) {
  const [location, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const [mobileOpen, setMobileOpen] = useState(false);
  const me = useGetMe({ query: { enabled: true, queryKey: getGetMeQueryKey(), staleTime: 60_000 } });
  const user = me.data;
  const adminItems = [
    { href: '/admin/overview', label: 'Overview', icon: Activity },
    { href: '/admin/queue', label: 'Review queue', icon: ShieldCheck },
    { href: '/admin/pins', label: 'All pins', icon: MapPinned },
    { href: '/admin/users', label: 'People', icon: UserRound },
    { href: '/admin/map', label: 'Map layers', icon: Layers3 },
  ];
  const items = admin ? adminItems : navItems;
  return <div className="noise flex min-h-[100dvh] md:h-[100dvh] md:overflow-hidden bg-[#f3f0e5]">
    <aside className={`fixed inset-y-0 left-0 z-40 flex w-[240px] flex-col bg-[#172a3a] px-4 py-4 text-[#f6f1df] transition-transform duration-300 md:static md:translate-x-0 md:h-[100dvh] md:overflow-y-auto ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}`}>
      <div className="flex items-center justify-between"><Logo /><button className="rounded-md p-1 text-[#a9c4ba] md:hidden" onClick={() => setMobileOpen(false)} data-testid="button-close-menu"><X size={20} /></button></div>
      <div className="mt-4 border-b border-[#355064] pb-3">
        <p className="font-mono-map text-[9px] uppercase tracking-[.18em] text-[#8eaaa2]">{admin ? 'Operations desk' : 'Community map'}</p>
        <p className="mt-1 text-xs leading-4 text-[#d8e2d9]">{admin ? 'Keep the public map accurate.' : 'Places become reliable when neighbors show up.'}</p>
      </div>
      <nav className="mt-3 space-y-1" aria-label="Primary">
        {items.map(({ href, label, icon: Icon }) => {
          const userRewardTokens = ((user?.pinsCreated ?? 0) * 10) + ((user?.verificationsCast ?? 0) * 1);
          return (
            <Link
              key={href}
              href={href}
              onClick={() => setMobileOpen(false)}
              className={`flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-semibold transition ${
                location === href ? 'bg-[#f1c744] text-[#172a3a]' : 'text-[#bdcec5] hover:bg-[#284252] hover:text-[#f6f1df]'
              }`}
              data-testid={`link-nav-${label.toLowerCase().replaceAll(' ', '-')}`}
            >
              <Icon size={16} />
              <span>{label}</span>
              {href === '/rewards' && (
                <span className={`ml-auto inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[10px] font-mono-map font-bold ${
                  location === href ? 'bg-[#172a3a] text-[#f1c744]' : 'bg-[#f1c744]/20 border border-[#f1c744]/30 text-[#f1c744]'
                }`}>
                  🪙 {userRewardTokens}
                </span>
              )}
              {href === '/admin/queue' && (
                <span className="ml-auto rounded-full bg-[#d9533a] px-1.5 py-0.5 text-[10px] text-[#fff8ee]">12</span>
              )}
            </Link>
          );
        })}
      </nav>
      {!admin && user?.role === 'admin' && <div className="mt-4 border-t border-[#355064] pt-3"><p className="mb-1.5 font-mono-map text-[9px] uppercase tracking-[.18em] text-[#8eaaa2]">Admin tools</p><Link href="/admin/overview" className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-semibold text-[#bdcec5] transition hover:bg-[#284252] hover:text-[#f6f1df]" data-testid="link-admin-tools"><ShieldCheck size={16} />Admin console</Link></div>}
      <div className="mt-auto space-y-3 pt-3">
        <div className="flex items-center gap-2.5 border-t border-[#355064] pt-3"><Avatar name={user?.name} size="sm" /><div className="min-w-0 flex-1"><p className="truncate text-xs font-bold text-[#edf3e8]" data-testid="text-current-user">{user?.name ?? 'Loading profile'}</p><p className="text-[10px] text-[#91aaa0]">{user ? `Level ${user.level} contributor` : 'Community member'}</p></div><button onClick={async () => { await signOutUser(); queryClient.clear(); setLocation('/login'); }} className="text-[#8eaaa0] transition hover:text-[#f1c744]" aria-label="Sign out" data-testid="button-sign-out"><LogOut size={15} /></button></div>
      </div>
    </aside>
    {mobileOpen && <button className="fixed inset-0 z-30 bg-[#172a3a]/45 md:hidden" onClick={() => setMobileOpen(false)} aria-label="Close navigation" data-testid="button-overlay-close" />}
    <main className="min-w-0 flex-1 flex flex-col md:h-[100dvh] md:overflow-hidden">
      <header className={`sticky top-0 z-40 flex h-[52px] shrink-0 items-center justify-between border-b border-[#d8d8c8] bg-[#f3f0e5]/95 px-4 backdrop-blur md:px-6 ${hideHeaderOnDesktop ? 'md:hidden' : ''}`}>
        <div className="flex items-center gap-3"><button className="rounded-lg p-1.5 text-[#2d6b60] hover:bg-[#e4e8dc] md:hidden" onClick={() => setMobileOpen(true)} aria-label="Open navigation" data-testid="button-open-menu"><Menu size={20} /></button>{!hideBreadcrumb && <span className="font-mono-map text-[10px] uppercase tracking-[.15em] text-[#708079]">{admin ? 'MapVeri / Admin' : 'MapVeri / Field notes'}</span>}</div>
        <div className="flex items-center gap-2.5">{headerActions}<PwaInstallButton /><UserHeaderControls userName={user?.name} /></div>
      </header>
      <div className="flex-1 p-3 md:p-4 flex flex-col min-h-0 overflow-y-auto">{children}</div>
    </main>
  </div>;
}

export function AuthFrame({ children }: { children: React.ReactNode }) {
  return (
    <div className="noise flex min-h-[100dvh] bg-[#172a3a] text-[#f6f1df]">
      <div className="relative hidden w-[47%] overflow-hidden border-r border-[#355064] p-10 lg:flex lg:flex-col">
        <Logo />
        <div className="relative z-10 mt-auto max-w-lg pb-8">
          <p className="font-mono-map text-xs font-semibold uppercase tracking-[0.2em] text-[#f1c744]">A public record, made local</p>
          <h1 className="mt-5 font-display text-5xl font-bold leading-[1.05] tracking-[-0.035em]">Know what’s<br /><span className="text-[#f1c744]">really there.</span></h1>
          <p className="mt-5 max-w-md text-sm leading-6 text-[#bdcec5]">MapVeri helps residents add the places that matter and gives nearby people a clear voice in whether they are still real.</p>
          <div className="mt-8 flex gap-8 border-t border-[#355064] pt-4 text-xs text-[#9ab3a9]">
            <span><strong className="block font-display text-xl text-[#f6f1df]">local</strong>before global</span>
            <span><strong className="block font-display text-xl text-[#f6f1df]">human</strong>before perfect</span>
            <span><strong className="block font-display text-xl text-[#f6f1df]">open</strong>by design</span>
          </div>
        </div>
        <div className="absolute -right-20 top-32 h-[470px] w-[470px] rounded-full border border-[#355064] opacity-60" />
        <div className="absolute -right-4 top-52 h-[300px] w-[300px] rounded-full border border-dashed border-[#f1c744]/50 opacity-60" />
        <div className="absolute bottom-24 right-32 h-3 w-3 rounded-full bg-[#d9533a] pin-pulse" />
      </div>
      <div className="flex flex-1 flex-col justify-between px-6 py-7 sm:px-12 lg:px-20">
        <div className="flex items-center h-7 lg:hidden">
          <span className="font-display text-lg font-bold tracking-[-0.03em]">mapveri</span>
        </div>
        <div className="mx-auto w-full max-w-[430px] py-8">{children}</div>
        <p className="text-center text-xs text-[#8eaaa2]">MapVeri is a community record. Be specific. Be kind. Be honest.</p>
      </div>
    </div>
  );
}

export function PageTitle({ eyebrow, title, description, action }: { eyebrow?: string; title: string; description?: string; action?: React.ReactNode }) {
  return (
    <div className="mb-3 shrink-0 flex flex-col justify-between gap-2 border-b border-[#d8d8c8] pb-2.5 sm:flex-row sm:items-center">
      <div className="min-w-0 flex-1">
        {eyebrow && <p className="font-mono-map text-[9px] font-semibold uppercase tracking-[0.2em] text-[#8a6c20]">{eyebrow}</p>}
        <h1 className="mt-0.5 font-display text-2xl font-bold tracking-[-0.03em] text-[#172a3a] sm:text-3xl" data-testid="text-page-title">{title}</h1>
        {description && <p className="mt-0.5 max-w-2xl text-xs text-[#5e7069] leading-relaxed line-clamp-1">{description}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}

export function PrimaryButton({ children, onClick, type = 'button', disabled = false, testId = 'button-primary' }: { children: React.ReactNode; onClick?: () => void; type?: 'button' | 'submit'; disabled?: boolean; testId?: string }) {
  return <button type={type} onClick={onClick} disabled={disabled} className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#2d6b60] px-4 py-2 text-xs font-bold text-[#f8f4e7] shadow-xs transition-all duration-150 hover:bg-[#20574e] hover:shadow-sm hover:-translate-y-[0.5px] active:translate-y-0 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50" data-testid={testId}>{children}</button>;
}

export function SecondaryButton({ children, onClick, testId = 'button-secondary' }: { children: React.ReactNode; onClick?: () => void; testId?: string }) {
  return <button onClick={onClick} className="inline-flex items-center justify-center gap-2 rounded-lg border border-[#c5d3c8] bg-[#f8f5ea] px-3.5 py-1.5 text-xs font-bold text-[#2d6b60] shadow-2xs transition-all duration-150 hover:border-[#2d6b60] hover:bg-[#edf2ea] hover:shadow-xs active:scale-[0.99]" data-testid={testId}>{children}</button>;
}