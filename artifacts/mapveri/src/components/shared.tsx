import { useState } from 'react';
import { Link, useLocation } from 'wouter';
import { MapPinned, Compass, UserRound, ShieldCheck, LogOut, Bell, Menu, X, CircleHelp, Activity, Layers3 } from 'lucide-react';
import { useGetMe, getGetMeQueryKey, useHealthCheck } from '@workspace/api-client-react';

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

export function Avatar({ name, size = 'md' }: { name?: string; size?: 'sm' | 'md' | 'lg' }) {
  const sizeClass = size === 'lg' ? 'h-16 w-16 text-lg' : size === 'sm' ? 'h-7 w-7 text-[10px]' : 'h-9 w-9 text-xs';
  return <span className={`grid shrink-0 place-items-center rounded-full bg-[#b8d7cb] font-bold text-[#205b51] ${sizeClass}`} data-testid={`img-avatar-${name ?? 'user'}`}>{initials(name)}</span>;
}

export function LevelBadge({ level }: { level?: string }) {
  const style = level === 'A' ? 'bg-[#e9d37b] text-[#6e5310]' : level === 'B' ? 'bg-[#c9ddd6] text-[#205b51]' : 'bg-[#eadbd0] text-[#8a513c]';
  return <span className={`inline-flex items-center rounded-full px-2 py-0.5 font-mono-map text-[10px] font-medium uppercase tracking-[.08em] ${style}`} data-testid={`badge-level-${level}`}>Level {level ?? 'C'}</span>;
}

export function StatusPill({ status }: { status?: string }) {
  const config: Record<string, { label: string; className: string }> = {
    admin_verified: { label: 'Admin verified', className: 'bg-[#c8ddd3] text-[#1f6255]' },
    community_verified: { label: 'Community verified', className: 'bg-[#eee1a9] text-[#6e5310]' },
    unverified: { label: 'Needs verification', className: 'bg-[#f1d7cc] text-[#964431]' },
    rejected: { label: 'Rejected', className: 'bg-[#e3d6d3] text-[#744b45]' },
  };
  const item = config[status ?? 'unverified'] ?? config.unverified;
  return <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold ${item.className}`} data-testid={`status-pin-${status}`}>{item.label}</span>;
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
];

export function Shell({ children, admin = false }: { children: React.ReactNode; admin?: boolean }) {
  const [location, setLocation] = useLocation();
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
  return <div className="noise flex min-h-[100dvh] bg-[#f3f0e5]">
    <aside className={`fixed inset-y-0 left-0 z-40 flex w-[260px] flex-col bg-[#172a3a] px-5 py-6 text-[#f6f1df] transition-transform duration-300 md:static md:translate-x-0 ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}`}>
      <div className="flex items-center justify-between"><Logo /><button className="rounded-md p-1 text-[#a9c4ba] md:hidden" onClick={() => setMobileOpen(false)} data-testid="button-close-menu"><X size={20} /></button></div>
      <div className="mt-10 border-b border-[#355064] pb-6">
        <p className="font-mono-map text-[10px] uppercase tracking-[.18em] text-[#8eaaa2]">{admin ? 'Operations desk' : 'Community map'}</p>
        <p className="mt-2 text-sm leading-5 text-[#d8e2d9]">{admin ? 'Keep the public map accurate.' : 'Places become reliable when neighbors show up.'}</p>
      </div>
      <nav className="mt-7 space-y-1.5" aria-label="Primary">
        {items.map(({ href, label, icon: Icon }) => <Link key={href} href={href} onClick={() => setMobileOpen(false)} className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold transition ${location === href ? 'bg-[#f1c744] text-[#172a3a]' : 'text-[#bdcec5] hover:bg-[#284252] hover:text-[#f6f1df]'}`} data-testid={`link-nav-${label.toLowerCase().replaceAll(' ', '-')}`}><Icon size={17} /><span>{label}</span>{href === '/admin/queue' && <span className="ml-auto rounded-full bg-[#d9533a] px-1.5 py-0.5 text-[10px] text-[#fff8ee]">12</span>}</Link>)}
      </nav>
      {!admin && user?.role === 'admin' && <div className="mt-8 border-t border-[#355064] pt-6"><p className="mb-2 font-mono-map text-[10px] uppercase tracking-[.18em] text-[#8eaaa2]">Admin tools</p><Link href="/admin/overview" className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold text-[#bdcec5] transition hover:bg-[#284252] hover:text-[#f6f1df]" data-testid="link-admin-tools"><ShieldCheck size={17} />Admin console</Link></div>}
      <div className="mt-auto space-y-5">
        <div className="rounded-xl border border-[#345263] bg-[#203a4a] p-4"><div className="flex items-center gap-2 text-[#f1c744]"><CircleHelp size={15} /><span className="text-xs font-bold">Why points matter</span></div><p className="mt-2 text-xs leading-5 text-[#b7cbc1]">Consistent neighbors earn more weight in the map.</p><Link href="/profile" className="mt-3 inline-block text-xs font-bold text-[#f1c744] underline-offset-4 hover:underline" data-testid="link-learn-points">See your standing</Link></div>
        <div className="flex items-center gap-3 border-t border-[#355064] pt-5"><Avatar name={user?.name} size="sm" /><div className="min-w-0 flex-1"><p className="truncate text-xs font-bold text-[#edf3e8]" data-testid="text-current-user">{user?.name ?? 'Loading profile'}</p><p className="text-[11px] text-[#91aaa0]">{user ? `Level ${user.level} contributor` : 'Community member'}</p></div><button onClick={() => { window.localStorage.removeItem('mapveri_token'); setLocation('/login'); }} className="text-[#8eaaa0] transition hover:text-[#f1c744]" aria-label="Sign out" data-testid="button-sign-out"><LogOut size={16} /></button></div>
      </div>
    </aside>
    {mobileOpen && <button className="fixed inset-0 z-30 bg-[#172a3a]/45 md:hidden" onClick={() => setMobileOpen(false)} aria-label="Close navigation" data-testid="button-overlay-close" />}
    <main className="min-w-0 flex-1">
      <header className="sticky top-0 z-20 flex h-[72px] items-center justify-between border-b border-[#d8d8c8] bg-[#f3f0e5]/95 px-5 backdrop-blur md:px-9">
        <div className="flex items-center gap-3"><button className="rounded-lg p-2 text-[#2d6b60] hover:bg-[#e4e8dc] md:hidden" onClick={() => setMobileOpen(true)} aria-label="Open navigation" data-testid="button-open-menu"><Menu size={21} /></button><span className="font-mono-map text-[10px] uppercase tracking-[.15em] text-[#708079]">{admin ? 'MapVeri / Admin' : 'MapVeri / Field notes'}</span></div>
        <div className="flex items-center gap-3"><button className="relative rounded-lg p-2 text-[#49655f] transition hover:bg-[#e4e8dc]" aria-label="Notifications" data-testid="button-notifications"><Bell size={18} /><span className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-[#d9533a]" /></button><Link href="/profile" className="hidden items-center gap-2 border-l border-[#d8d8c8] pl-4 text-sm font-bold text-[#2d6b60] sm:flex" data-testid="link-header-profile"><Avatar name={user?.name} size="sm" />{user?.name ?? 'Your profile'}</Link></div>
      </header>
      <div className="p-5 md:p-9">{children}</div>
    </main>
  </div>;
}

export function AuthFrame({ children }: { children: React.ReactNode }) {
  const health = useHealthCheck({ query: { queryKey: ['health-check'], staleTime: 120_000 } });
  return <div className="noise flex min-h-[100dvh] bg-[#172a3a] text-[#f6f1df]"><div className="relative hidden w-[47%] overflow-hidden border-r border-[#355064] p-10 lg:flex lg:flex-col"><Logo /><div className="relative z-10 mt-auto max-w-lg pb-8"><p className="font-mono-map text-xs uppercase tracking-[.22em] text-[#f1c744]">A public record, made local</p><h1 className="mt-5 font-display text-6xl font-bold leading-[.95] tracking-[-.065em]">Know what’s<br /><span className="text-[#f1c744]">really there.</span></h1><p className="mt-6 max-w-md text-base leading-7 text-[#bdcec5]">MapVeri helps residents add the places that matter and gives nearby people a clear voice in whether they are still real.</p><div className="mt-12 flex gap-10 border-t border-[#355064] pt-5 text-xs text-[#9ab3a9]"><span><strong className="block font-display text-2xl text-[#f6f1df]">local</strong>before global</span><span><strong className="block font-display text-2xl text-[#f6f1df]">human</strong>before perfect</span><span><strong className="block font-display text-2xl text-[#f6f1df]">open</strong>by design</span></div></div><div className="absolute -right-20 top-32 h-[470px] w-[470px] rounded-full border border-[#355064] opacity-60" /><div className="absolute -right-4 top-52 h-[300px] w-[300px] rounded-full border border-dashed border-[#f1c744]/50 opacity-60" /><div className="absolute bottom-24 right-32 h-3 w-3 rounded-full bg-[#d9533a] pin-pulse" /></div><div className="flex flex-1 flex-col justify-between px-6 py-7 sm:px-12 lg:px-20"><div className="flex items-center justify-between lg:justify-end"><span className="font-display text-lg font-bold tracking-[-.04em] lg:hidden">mapveri</span><span className="flex items-center gap-2 font-mono-map text-[10px] uppercase tracking-[.14em] text-[#8eaaa2]"><span className={`h-1.5 w-1.5 rounded-full ${health.isError ? 'bg-[#d9533a]' : 'bg-[#9ac7a5]'}`} />{health.isError ? 'service check offline' : 'service check clear'}</span></div><div className="mx-auto w-full max-w-[430px] py-10">{children}</div><p className="text-center text-xs text-[#8eaaa2]">MapVeri is a community record. Be specific. Be kind. Be honest.</p></div></div>;
}

export function PageTitle({ eyebrow, title, description, action }: { eyebrow: string; title: string; description?: string; action?: React.ReactNode }) {
  return <div className="mb-8 flex flex-col justify-between gap-5 border-b border-[#d8d8c8] pb-7 sm:flex-row sm:items-end"><div><p className="font-mono-map text-[10px] font-medium uppercase tracking-[.2em] text-[#8a6c20]">{eyebrow}</p><h1 className="mt-2 font-display text-4xl font-bold tracking-[-.06em] text-[#172a3a] sm:text-5xl" data-testid="text-page-title">{title}</h1>{description && <p className="mt-3 max-w-xl text-sm leading-6 text-[#60716d]">{description}</p>}</div>{action && <div className="shrink-0">{action}</div>}</div>;
}

export function PrimaryButton({ children, onClick, type = 'button', disabled = false, testId = 'button-primary' }: { children: React.ReactNode; onClick?: () => void; type?: 'button' | 'submit'; disabled?: boolean; testId?: string }) {
  return <button type={type} onClick={onClick} disabled={disabled} className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#2d6b60] px-4 py-2.5 text-sm font-bold text-[#f8f4e7] shadow-sm transition hover:bg-[#20574e] disabled:cursor-not-allowed disabled:opacity-50" data-testid={testId}>{children}</button>;
}

export function SecondaryButton({ children, onClick, testId = 'button-secondary' }: { children: React.ReactNode; onClick?: () => void; testId?: string }) {
  return <button onClick={onClick} className="inline-flex items-center justify-center gap-2 rounded-lg border border-[#b9c9c0] bg-[#f8f5ea] px-4 py-2.5 text-sm font-bold text-[#2d6b60] transition hover:border-[#2d6b60] hover:bg-[#edf1e8]" data-testid={testId}>{children}</button>;
}