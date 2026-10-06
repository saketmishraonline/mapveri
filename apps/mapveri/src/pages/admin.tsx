import { useEffect, useState } from 'react';
import { Link, useLocation } from 'wouter';
import { Check, ChevronLeft, ChevronRight, MapPin, Search, ShieldCheck, ThumbsDown, Users, Ban, RotateCcw } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { useGetAdminStats, getGetAdminStatsQueryKey, useGetAdminPins, getGetAdminPinsQueryKey, useGetAdminUsers, getGetAdminUsersQueryKey, useApprovePin, useRejectPin, useUpdateUserLevel, useToggleUserBan, useListPins, getListPinsQueryKey, useGetMe } from '@workspace/api-client-react';
import type { Pin, User } from '@workspace/api-client-react';
import { Shell, PageTitle, StatusPill, LevelBadge, Avatar, PrimaryButton, SecondaryButton, Skeleton, ErrorState, EmptyState, formatDate, UserHeaderControls } from '@/components/shared';
import { OsmMap } from '@/components/osm-map';

function AdminRedirect() { const [, setLocation] = useLocation(); const me = useGetMe({ query: { queryKey: ['mapveri-admin-me'], staleTime: 60_000 } }); useEffect(() => { if (me.data?.role === 'admin') setLocation('/admin/overview'); else if (me.data) setLocation('/map'); }, [me.data, setLocation]); return <div className="min-h-[100dvh] bg-[#f3f0e5]" />; }

function Metric({ label, value, detail, tone = 'teal', icon: Icon }: { label: string; value?: number; detail: string; tone?: 'teal' | 'saffron' | 'coral' | 'ink'; icon: typeof ShieldCheck }) {
  const toneClass = { teal: 'bg-[#e2eee6] text-[#2d6b60]', saffron: 'bg-[#f3e8b5] text-[#806414]', coral: 'bg-[#f4ddd5] text-[#a34635]', ink: 'bg-[#dce4e5] text-[#294e5c]' }[tone];
  return <div className="rounded-xl border border-[#d6ded4] bg-[#f8f5ea] p-3.5" data-testid={`metric-${label.toLowerCase().replaceAll(' ', '-')}`}><div className="flex items-start justify-between"><span className={`grid h-8 w-8 place-items-center rounded-lg ${toneClass}`}><Icon size={16} /></span><span className="font-mono-map text-[9px] uppercase tracking-[.12em] text-[#8c9a91]">live</span></div><p className="mt-3 font-mono-map text-[9px] uppercase tracking-[.16em] text-[#708079]">{label}</p><p className="mt-0.5 font-display text-2xl font-bold tracking-[-.04em] text-[#172a3a]" data-testid={`value-${label.toLowerCase().replaceAll(' ', '-')}`}>{value ?? '—'}</p><p className="mt-0.5 text-xs text-[#708079]">{detail}</p></div>;
}

function AdminOverview() {
  const stats = useGetAdminStats({ query: { queryKey: getGetAdminStatsQueryKey(), staleTime: 30_000 } });
  const me = useGetMe({ query: { queryKey: ['mapveri-admin-me'], staleTime: 60_000 } });
  const data = stats.data;
  const user = me.data;
  return <Shell admin hideHeaderOnDesktop><PageTitle title="Map Overview" action={<UserHeaderControls userName={user?.name ?? 'admin'} />} />{stats.isLoading ? <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4"><Skeleton className="h-32" /><Skeleton className="h-32" /><Skeleton className="h-32" /><Skeleton className="h-32" /></div> : stats.isError || !data ? <ErrorState onRetry={() => stats.refetch()} /> : <div className="fade-up"><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4"><Metric label="Total pins" value={data.totalPins} detail="Across the public record" icon={MapPin} /><Metric label="Pending review" value={data.pendingReview} detail="Community verified" tone="saffron" icon={ShieldCheck} /><Metric label="Admin verified" value={data.adminVerified} detail="Cleared by your team" tone="teal" icon={Check} /><Metric label="Total people" value={data.totalUsers} detail={`${data.levelA} at Level A`} tone="ink" icon={Users} /></div><div className="mt-4 grid gap-4 lg:grid-cols-[1.25fr_.75fr]"><section className="rounded-xl border border-[#d6ded4] bg-[#f8f5ea] p-4"><div className="flex items-end justify-between"><div><p className="font-mono-map text-[9px] uppercase tracking-[.18em] text-[#8a6c20]">Latest movement</p><h2 className="mt-0.5 font-display text-xl font-bold tracking-[-.03em] text-[#172a3a]">Recent pins</h2></div><Link href="/admin/pins" className="text-xs font-bold text-[#2d6b60] hover:underline" data-testid="link-all-pins">See all pins</Link></div><div className="mt-3 divide-y divide-[#e1e4d9]">{data.recentPins.length === 0 ? <EmptyState title="No activity yet" description="New community additions will show up here." /> : data.recentPins.slice(0, 5).map((pin) => <div key={pin.id} className="flex items-center gap-2.5 py-2 first:pt-0 last:pb-0" data-testid={`row-recent-pin-${pin.id}`}><span className="grid h-7 w-7 place-items-center rounded-lg bg-[#f0ddd4] text-[#b14e3b]"><MapPin size={14} /></span><div className="min-w-0 flex-1"><p className="truncate text-xs font-bold text-[#243f48]">{pin.name}</p><p className="truncate text-[11px] text-[#708079]">by {pin.createdByName} · {formatDate(pin.createdAt)}</p></div><StatusPill status={pin.status} /></div>)}</div></section><section className="rounded-xl border border-[#d6ded4] bg-[#e5eee6] p-4"><p className="font-mono-map text-[9px] uppercase tracking-[.18em] text-[#54796d]">Contributor health</p><h2 className="mt-0.5 font-display text-xl font-bold tracking-[-.03em] text-[#172a3a]">Levels in the wild</h2><div className="mt-4 space-y-3">{[['A', data.levelA, '#dba91a'], ['B', data.levelB, '#2d6b60'], ['C', data.levelC, '#d9533a']].map(([label, value, color]) => <div key={label as string}><div className="flex items-center justify-between text-xs"><span className="flex items-center gap-1.5 font-bold text-[#294e51]"><LevelBadge level={label as string} /></span><span className="font-mono-map text-[11px] text-[#60716d]">{value as number}</span></div><div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-[#d0ddd3]"><div className="h-full rounded-full" style={{ width: `${Math.min(100, ((value as number) / Math.max(data.totalUsers, 1)) * 100)}%`, background: color as string }} /></div></div>)}</div><div className="mt-4 border-t border-[#c7d8cb] pt-2.5 text-xs text-[#53736a]">People earn weight through accurate contributions.</div></section></div></div>}</Shell>;
}

function ReviewRow({ pin, onDone }: { pin: Pin; onDone: () => void }) {
  const queryClient = useQueryClient();
  const approve = useApprovePin();
  const reject = useRejectPin();
  const run = (kind: 'approve' | 'reject') => { const mutation = kind === 'approve' ? approve : reject; mutation.mutate({ id: pin.id }, { onSuccess: () => { queryClient.invalidateQueries({ queryKey: getGetAdminPinsQueryKey({ status: 'community_verified', page: 1, limit: 20 }) }); queryClient.invalidateQueries({ queryKey: getGetAdminStatsQueryKey() }); onDone(); } }); };
  return <article className="rounded-xl border border-[#d6ded4] bg-[#f8f5ea] p-3.5" data-testid={`card-review-pin-${pin.id}`}><div className="flex flex-col gap-3 sm:flex-row sm:items-start"><div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-[#f3e8b5] text-[#806414]"><MapPin size={18} /></div><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><h2 className="font-display text-lg font-bold tracking-[-.03em] text-[#172a3a]">{pin.name}</h2><StatusPill status={pin.status} /></div><p className="mt-1 max-w-2xl text-xs leading-5 text-[#60716d]">{pin.description || 'No description supplied.'}</p><div className="mt-2.5 flex flex-wrap items-center gap-2.5 text-xs text-[#708079]"><span className="flex items-center gap-1"><Avatar name={pin.createdByName} size="sm" /> {pin.createdByName}</span><LevelBadge level={pin.createdByLevel} /><span className="font-mono-map">{pin.lat.toFixed(4)}, {pin.lng.toFixed(4)}</span></div></div><div className="flex shrink-0 gap-2 sm:flex-col"><button disabled={approve.isPending || reject.isPending} onClick={() => run('approve')} className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-[#2d6b60] px-3 py-1.5 text-xs font-bold text-[#f8f4e7] hover:bg-[#20574e] disabled:opacity-50" data-testid={`button-approve-pin-${pin.id}`}><Check size={13} /> Approve</button><button disabled={approve.isPending || reject.isPending} onClick={() => run('reject')} className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-[#d1a59a] bg-[#fff6f0] px-3 py-1.5 text-xs font-bold text-[#a34635] hover:bg-[#f9e7dd] disabled:opacity-50" data-testid={`button-reject-pin-${pin.id}`}><ThumbsDown size={13} /> Reject</button></div></div></article>;
}

function AdminQueue() {
  const [refresh, setRefresh] = useState(0);
  const queue = useGetAdminPins({ status: 'community_verified', page: 1, limit: 20 }, { query: { queryKey: getGetAdminPinsQueryKey({ status: 'community_verified', page: 1, limit: 20 }), staleTime: 20_000 } });
  return <Shell admin hideHeaderOnDesktop><PageTitle eyebrow="Operations desk / review" title="Community queue." description="These places have enough local signal to reach your desk. Read the context, then make the final call." action={<SecondaryButton onClick={() => { setRefresh(refresh + 1); queue.refetch(); }} testId="button-refresh-queue"><RotateCcw size={14} /> Refresh</SecondaryButton>} />{queue.isLoading ? <div className="space-y-2"><Skeleton className="h-28" /><Skeleton className="h-28" /></div> : queue.isError ? <ErrorState onRetry={() => queue.refetch()} /> : !queue.data?.pins.length ? <EmptyState title="The queue is clear" description="No community-verified pins are waiting for a final review." action={<Link href="/admin/pins" className="text-sm font-bold text-[#2d6b60] hover:underline" data-testid="link-queue-pins">Browse all pins</Link>} /> : <div key={refresh} className="space-y-2.5 overflow-y-auto max-h-[calc(100dvh-130px)]">{queue.data.pins.map((pin) => <ReviewRow key={pin.id} pin={pin} onDone={() => queue.refetch()} />)}</div>}</Shell>;
}

function AdminPins() {
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const params = { search: search || undefined, status: status || undefined, page, limit: 8 };
  const pins = useGetAdminPins(params, { query: { queryKey: getGetAdminPinsQueryKey(params) } });
  const totalPages = Math.max(1, Math.ceil((pins.data?.total ?? 0) / 8));
  return <Shell admin hideHeaderOnDesktop><PageTitle eyebrow="Operations desk / pins" title="All pins." description="Filter the public record by state or search a place name and description." /><div className="rounded-xl border border-[#d6ded4] bg-[#f8f5ea]"><div className="flex flex-col gap-2.5 border-b border-[#d8d8c8] p-2.5 sm:flex-row"><div className="relative flex-1"><Search size={15} className="absolute left-2.5 top-2.5 text-[#789087]" /><input value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} placeholder="Search pins" className="w-full rounded-lg border border-[#c4d0c6] bg-[#fffdf4] py-1.5 pl-8 pr-2.5 text-xs outline-none focus:border-[#2d6b60]" data-testid="input-admin-pin-search" /></div><select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }} className="rounded-lg border border-[#c4d0c6] bg-[#fffdf4] px-2.5 py-1.5 text-xs outline-none focus:border-[#2d6b60]" data-testid="select-admin-pin-status"><option value="">All statuses</option><option value="unverified">Needs verification</option><option value="community_verified">Community verified</option><option value="admin_verified">Admin verified</option><option value="rejected">Rejected</option></select></div>{pins.isLoading ? <div className="space-y-2 p-3"><Skeleton className="h-10" /><Skeleton className="h-10" /><Skeleton className="h-10" /></div> : pins.isError ? <div className="p-3"><ErrorState onRetry={() => pins.refetch()} /></div> : !pins.data?.pins.length ? <div className="p-3"><EmptyState title="No pins found" description="Try removing a filter or searching for a different phrase." action={<button onClick={() => { setSearch(''); setStatus(''); }} className="text-sm font-bold text-[#2d6b60] hover:underline" data-testid="button-clear-pin-filters">Clear filters</button>} /></div> : <><div className="divide-y divide-[#e1e4d9]">{pins.data.pins.map((pin) => <div key={pin.id} className="flex flex-col gap-2 p-2.5 sm:flex-row sm:items-center" data-testid={`row-admin-pin-${pin.id}`}><div className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-[#f0ddd4] text-[#b14e3b]"><MapPin size={15} /></div><div className="min-w-0 flex-1"><p className="truncate text-xs font-bold text-[#243f48]">{pin.name}</p><p className="truncate text-[11px] text-[#708079]">{pin.category} · by {pin.createdByName} · {formatDate(pin.createdAt)}</p></div><StatusPill status={pin.status} /><span className="w-16 text-right font-mono-map text-xs text-[#708079]">{pin.totalPoints} pts</span></div>)}</div><div className="flex items-center justify-between border-t border-[#d8d8c8] px-3 py-2"><p className="font-mono-map text-[10px] text-[#708079]">Page {page} of {totalPages} · {pins.data.total} records</p><div className="flex gap-1"><button disabled={page <= 1} onClick={() => setPage(page - 1)} className="rounded-md border border-[#c9d4ca] p-1.5 text-[#49655f] disabled:opacity-40" aria-label="Previous page" data-testid="button-admin-pins-prev"><ChevronLeft size={15} /></button><button disabled={page >= totalPages} onClick={() => setPage(page + 1)} className="rounded-md border border-[#c9d4ca] p-1.5 text-[#49655f] disabled:opacity-40" aria-label="Next page" data-testid="button-admin-pins-next"><ChevronRight size={15} /></button></div></div></>}</div></Shell>;
}

function AdminUsers() {
  const [search, setSearch] = useState('');
  const [level, setLevel] = useState('');
  const users = useGetAdminUsers({ search: search || undefined, level: (level || undefined) as 'A' | 'B' | 'C' | 'all' | undefined }, { query: { queryKey: getGetAdminUsersQueryKey({ search: search || undefined, level: (level || undefined) as 'A' | 'B' | 'C' | 'all' | undefined }) } });
  const queryClient = useQueryClient();
  const updateLevel = useUpdateUserLevel();
  const toggleBan = useToggleUserBan();
  const runLevel = (user: User, next: 'A' | 'B' | 'C') => updateLevel.mutate({ id: user.id, data: { level: next } }, { onSuccess: () => queryClient.invalidateQueries({ queryKey: getGetAdminUsersQueryKey({ search: search || undefined, level: (level || undefined) as 'A' | 'B' | 'C' | 'all' | undefined }) }) });
  const runBan = (user: User) => toggleBan.mutate({ id: user.id }, { onSuccess: () => queryClient.invalidateQueries({ queryKey: getGetAdminUsersQueryKey({ search: search || undefined, level: (level || undefined) as 'A' | 'B' | 'C' | 'all' | undefined }) }) });
  return <Shell admin hideHeaderOnDesktop><PageTitle eyebrow="Operations desk / people" title="People & standing." description="Tune contributor levels from demonstrated care, and protect the record when an account breaks the rules." /><div className="rounded-xl border border-[#d6ded4] bg-[#f8f5ea]"><div className="flex flex-col gap-2.5 border-b border-[#d8d8c8] p-2.5 sm:flex-row"><div className="relative flex-1"><Search size={15} className="absolute left-2.5 top-2.5 text-[#789087]" /><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search people" className="w-full rounded-lg border border-[#c4d0c6] bg-[#fffdf4] py-1.5 pl-8 pr-2.5 text-xs outline-none focus:border-[#2d6b60]" data-testid="input-admin-user-search" /></div><select value={level} onChange={(e) => setLevel(e.target.value)} className="rounded-lg border border-[#c4d0c6] bg-[#fffdf4] px-2.5 py-1.5 text-xs outline-none focus:border-[#2d6b60]" data-testid="select-admin-user-level"><option value="">All levels</option><option value="A">Level A</option><option value="B">Level B</option><option value="C">Level C</option></select></div>{users.isLoading ? <div className="space-y-2 p-3"><Skeleton className="h-12" /><Skeleton className="h-12" /></div> : users.isError ? <div className="p-3"><ErrorState onRetry={() => users.refetch()} /></div> : !users.data?.length ? <div className="p-3"><EmptyState title="No people match" description="Try a different name or level filter." /></div> : <div className="divide-y divide-[#e1e4d9]">{users.data.map((user) => <div key={user.id} className="flex flex-col gap-2 p-2.5 lg:flex-row lg:items-center" data-testid={`row-admin-user-${user.id}`}><Avatar name={user.name} size="sm" /><div className="min-w-0 flex-1"><p className="truncate text-xs font-bold text-[#243f48]">{user.name} {user.isBanned && <span className="ml-1 rounded bg-[#f1d7cc] px-1.5 py-0.5 text-[9px] font-bold text-[#a34635]">Banned</span>}</p><p className="truncate text-[11px] text-[#708079]">{user.email} · {user.pinsCreated} pins · {user.verificationsCast} checks</p></div><LevelBadge level={user.level} /><div className="flex items-center gap-1.5"><select value={user.level} onChange={(e) => runLevel(user, e.target.value as 'A' | 'B' | 'C')} className="rounded-md border border-[#c9d4ca] bg-[#fffdf4] px-2 py-1 text-xs font-bold text-[#49655f]" aria-label={`Set level for ${user.name}`} data-testid={`select-user-level-${user.id}`}><option value="A">Level A</option><option value="B">Level B</option><option value="C">Level C</option></select><button onClick={() => runBan(user)} className={`rounded-md border p-1.5 transition ${user.isBanned ? 'border-[#b5c8bc] text-[#2d6b60] hover:bg-[#e5eee6]' : 'border-[#d1a59a] text-[#a34635] hover:bg-[#f9e7dd]'}`} aria-label={user.isBanned ? `Unban ${user.name}` : `Ban ${user.name}`} data-testid={`button-toggle-ban-${user.id}`}>{user.isBanned ? <ShieldCheck size={14} /> : <Ban size={14} />}</button></div></div>)}</div>}</div></Shell>;
}

function AdminMap() {
  const [status, setStatus] = useState('all');
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const pinsQuery = useListPins(
    { status: status as 'all' | 'unverified' | 'community_verified' | 'admin_verified' | 'rejected' },
    { query: { queryKey: getListPinsQueryKey({ status: status as 'all' | 'unverified' | 'community_verified' | 'admin_verified' | 'rejected' }) } }
  );
  const pins = pinsQuery.data ?? [];
  return (
    <Shell admin hideBreadcrumb hideHeaderOnDesktop>
      <div className="mb-2 shrink-0 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-b border-[#d8d8c8] pb-2">
        <h1
          className="font-display text-2xl font-bold tracking-[-.04em] text-[#172a3a] sm:text-3xl"
          data-testid="text-page-title"
        >
          Map Layers and Status
        </h1>
        <div className="shrink-0">
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="rounded-lg border border-[#c4d0c6] bg-[#f8f5ea] px-3 py-1.5 text-xs font-bold text-[#49655f] outline-none shadow-xs transition hover:border-[#2d6b60] focus:border-[#2d6b60]"
            data-testid="select-admin-map-layer"
          >
            <option value="all">All statuses ({pins.length})</option>
            <option value="unverified">Needs verification</option>
            <option value="community_verified">Community verified</option>
            <option value="admin_verified">Admin verified</option>
            <option value="rejected">Rejected</option>
          </select>
        </div>
      </div>
      {pinsQuery.isLoading ? (
        <Skeleton className="flex-1 min-h-[420px] rounded-xl" />
      ) : pinsQuery.isError ? (
        <ErrorState onRetry={() => pinsQuery.refetch()} />
      ) : (
        <div className="relative flex-1 min-h-[420px] h-[calc(100dvh-75px)] max-h-[calc(100dvh-75px)] overflow-hidden rounded-xl border border-[#c8d1c6] shadow-md" data-testid="admin-map-canvas">
          <OsmMap
            pins={pins}
            selectedId={selectedId}
            onSelectPin={setSelectedId}
          />
        </div>
      )}
    </Shell>
  );
}

export function AdminPage({ view = 'redirect' }: { view?: 'redirect' | 'overview' | 'queue' | 'pins' | 'users' | 'map' }) {
  const [, setLocation] = useLocation();
  const me = useGetMe({ query: { queryKey: ['mapveri-admin-me'], staleTime: 30_000 } });

  useEffect(() => {
    if (me.isFetched && !me.isLoading) {
      if (!me.data) {
        setLocation('/login');
      } else if (me.data.role !== 'admin') {
        setLocation('/map');
      }
    }
  }, [me.isFetched, me.isLoading, me.data, setLocation]);

  if (me.isLoading) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center bg-[#f3f0e5]">
        <Skeleton className="h-40 w-96 rounded-2xl" />
      </div>
    );
  }

  if (!me.data || me.data.role !== 'admin') {
    return null;
  }

  if (view === 'redirect') return <AdminRedirect />;
  if (view === 'overview') return <AdminOverview />;
  if (view === 'queue') return <AdminQueue />;
  if (view === 'pins') return <AdminPins />;
  if (view === 'users') return <AdminUsers />;
  return <AdminMap />;
}