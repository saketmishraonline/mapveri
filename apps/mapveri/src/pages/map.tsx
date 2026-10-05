import { useEffect, useMemo, useState } from 'react';
import { useLocation } from 'wouter';
import { Search, Plus, SlidersHorizontal, X, Check, ThumbsDown, ArrowUpRight, LocateFixed, ShieldCheck, MapPin, Smartphone } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import {
  useCreatePin,
  useGetPin,
  getGetPinQueryKey,
  useGetMe,
  useListNearbyPins,
  getListNearbyPinsQueryKey,
  useListPins,
  getListPinsQueryKey,
  useVerifyPin,
  PinInputCategory,
} from '@workspace/api-client-react';
import type { Pin, NearbyPin } from '@workspace/api-client-react';
import {
  Shell,
  PageTitle,
  PrimaryButton,
  SecondaryButton,
  StatusPill,
  LevelBadge,
  Avatar,
  EmptyState,
  ErrorState,
  Skeleton,
  formatDate,
  formatDistance,
} from '@/components/shared';
import { OsmMap, BOISAR_CENTER, THEEM_COLLEGE } from '@/components/osm-map';
import { useIsMobile } from '@/hooks/use-mobile';
import { MobileMapView } from '@/components/mobile-map-view';

function CreatePinPanel({
  initialLat = '19.8055',
  initialLng = '72.7668',
  onClose,
}: {
  initialLat?: string;
  initialLng?: string;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const createPin = useCreatePin();
  const [form, setForm] = useState({
    name: '',
    description: '',
    category: 'Landmark',
    lat: initialLat,
    lng: initialLng,
  });

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    createPin.mutate(
      {
        data: {
          ...form,
          lat: Number(form.lat),
          lng: Number(form.lng),
          category: form.category as PinInputCategory,
        },
      },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListPinsQueryKey() });
          onClose();
        },
      }
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-[#172a3a]/50 backdrop-blur-sm p-0 sm:items-center sm:p-5">
      <div
        className="max-h-[92dvh] w-full max-w-xl overflow-y-auto rounded-t-2xl bg-[#f8f5ea] p-6 shadow-2xl sm:rounded-2xl sm:p-8"
        role="dialog"
        aria-modal="true"
        data-testid="dialog-create-pin"
      >
        <div className="flex items-start justify-between">
          <div>
            <p className="font-mono-map text-[10px] uppercase tracking-[.18em] text-[#8a6c20]">
              OpenStreetMap · Boisar, MH
            </p>
            <h2 className="mt-2 font-display text-3xl font-bold tracking-[-.05em] text-[#172a3a]">
              Place a pin
            </h2>
            <p className="mt-2 text-sm text-[#60716d]">
              Pin a landmark, institution, shop, or hazard in Boisar and surrounding Palghar area.
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-2 text-[#60716d] hover:bg-[#e8e8dc]"
            aria-label="Close create pin"
            data-testid="button-close-create-pin"
          >
            <X size={19} />
          </button>
        </div>

        {/* Quick location presets */}
        <div className="mt-5 rounded-lg border border-[#c4d0c6] bg-[#f0ebe0] p-3 text-xs">
          <span className="font-bold text-[#243f48]">Quick Presets (Boisar): </span>
          <div className="mt-2 flex flex-wrap gap-1.5">
            <button
              type="button"
              onClick={() =>
                setForm((prev) => ({
                  ...prev,
                  name: prev.name || 'Near Theem College',
                  lat: '19.8055',
                  lng: '72.7668',
                }))
              }
              className="rounded bg-[#fffdf4] px-2 py-1 text-[11px] font-semibold text-[#1f4a43] shadow-xs hover:bg-[#e4ece5]"
            >
              Theem College (19.8055, 72.7668)
            </button>
            <button
              type="button"
              onClick={() =>
                setForm((prev) => ({
                  ...prev,
                  name: prev.name || 'Near Boisar Station',
                  lat: '19.7984',
                  lng: '72.7615',
                }))
              }
              className="rounded bg-[#fffdf4] px-2 py-1 text-[11px] font-semibold text-[#1f4a43] shadow-xs hover:bg-[#e4ece5]"
            >
              Boisar Station (19.7984, 72.7615)
            </button>
            <button
              type="button"
              onClick={() =>
                setForm((prev) => ({
                  ...prev,
                  name: prev.name || 'Near D-Mart Boisar',
                  lat: '19.8021',
                  lng: '72.7580',
                }))
              }
              className="rounded bg-[#fffdf4] px-2 py-1 text-[11px] font-semibold text-[#1f4a43] shadow-xs hover:bg-[#e4ece5]"
            >
              D-Mart (19.8021, 72.7580)
            </button>
          </div>
        </div>

        <form onSubmit={submit} className="mt-5 space-y-4">
          <label className="block text-sm font-bold text-[#243f48]">
            Place name
            <input
              required
              minLength={2}
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="mt-2 w-full rounded-lg border border-[#c5d0c6] bg-[#fffdf4] px-3 py-3 text-sm outline-none focus:border-[#2d6b60]"
              placeholder="e.g. Theem College Canteen / Betegaon Pavement"
              data-testid="input-pin-name"
            />
          </label>

          <label className="block text-sm font-bold text-[#243f48]">
            What should neighbors know?
            <textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              className="mt-2 min-h-24 w-full resize-y rounded-lg border border-[#c5d0c6] bg-[#fffdf4] px-3 py-3 text-sm outline-none focus:border-[#2d6b60]"
              placeholder="Specific directions, opening hours, landmarks, or details"
              data-testid="input-pin-description"
            />
          </label>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block text-sm font-bold text-[#243f48]">
              Category
              <select
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
                className="mt-2 w-full rounded-lg border border-[#c5d0c6] bg-[#fffdf4] px-3 py-3 text-sm outline-none focus:border-[#2d6b60]"
                data-testid="select-pin-category"
              >
                {Object.values(PinInputCategory).map((category) => (
                  <option key={category}>{category}</option>
                ))}
              </select>
            </label>

            <div>
              <span className="block text-sm font-bold text-[#243f48]">GPS Coordinates (IN)</span>
              <div className="mt-2 grid grid-cols-2 gap-2">
                <input
                  required
                  type="number"
                  step="any"
                  value={form.lat}
                  onChange={(e) => setForm({ ...form, lat: e.target.value })}
                  className="w-full rounded-lg border border-[#c5d0c6] bg-[#fffdf4] px-3 py-3 font-mono-map text-xs outline-none focus:border-[#2d6b60]"
                  placeholder="Latitude"
                  data-testid="input-pin-lat"
                />
                <input
                  required
                  type="number"
                  step="any"
                  value={form.lng}
                  onChange={(e) => setForm({ ...form, lng: e.target.value })}
                  className="w-full rounded-lg border border-[#c5d0c6] bg-[#fffdf4] px-3 py-3 font-mono-map text-xs outline-none focus:border-[#2d6b60]"
                  placeholder="Longitude"
                  data-testid="input-pin-lng"
                />
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between gap-3 border-t border-[#d8d8c8] pt-5">
            <p className="text-xs leading-5 text-[#60716d]">
              New pins start unverified until local residents in Boisar review them.
            </p>
            <PrimaryButton type="submit" disabled={createPin.isPending} testId="button-submit-pin">
              {createPin.isPending ? 'Adding pin…' : <><Plus size={16} /> Add pin</>}
            </PrimaryButton>
          </div>
          {createPin.isError && (
            <p className="text-xs text-[#a13f32]" data-testid="status-create-pin-error">
              Could not save this pin. Check coordinates and try again.
            </p>
          )}
        </form>
      </div>
    </div>
  );
}

function PinDetails({ pinId, onClose }: { pinId: number; onClose: () => void }) {
  const queryClient = useQueryClient();
  const detail = useGetPin(pinId, { query: { enabled: true, queryKey: getGetPinQueryKey(pinId) } });
  const verify = useVerifyPin();
  const pin = detail.data;

  const cast = (vote: 'confirm' | 'dispute') =>
    verify.mutate(
      { id: pinId, data: { vote } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getGetPinQueryKey(pinId) });
          queryClient.invalidateQueries({ queryKey: getListPinsQueryKey() });
        },
      }
    );

  return (
    <aside
      className="fixed inset-y-0 right-0 z-40 flex w-full max-w-md flex-col border-l border-[#d8d8c8] bg-[#f8f5ea] shadow-2xl sm:absolute sm:inset-y-3 sm:right-3 sm:rounded-xl sm:border"
      data-testid="panel-pin-details"
    >
      <div className="flex items-center justify-between border-b border-[#d8d8c8] px-5 py-4">
        <span className="font-mono-map text-[10px] uppercase tracking-[.17em] text-[#8a6c20]">
          OpenStreetMap · Pin Record
        </span>
        <button
          onClick={onClose}
          className="rounded-lg p-2 text-[#60716d] hover:bg-[#e8e8dc]"
          aria-label="Close pin details"
          data-testid="button-close-pin-details"
        >
          <X size={18} />
        </button>
      </div>

      {detail.isLoading ? (
        <div className="space-y-4 p-5">
          <Skeleton className="h-6 w-2/3" />
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-12 w-full" />
        </div>
      ) : detail.isError || !pin ? (
        <div className="p-5">
          <ErrorState onRetry={() => detail.refetch()} />
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto p-5">
          <div className="flex items-center justify-between">
            <StatusPill status={pin.status} />
            <span className="font-mono-map text-[11px] text-[#708079]">
              {Number(pin.lat).toFixed(4)}°N, {Number(pin.lng).toFixed(4)}°E
            </span>
          </div>

          <h2
            className="mt-4 font-display text-2xl font-bold tracking-[-.04em] text-[#172a3a]"
            data-testid={`text-pin-name-${pin.id}`}
          >
            {pin.name}
          </h2>

          <div className="mt-2 inline-flex items-center gap-1 rounded bg-[#e8ede7] px-2 py-0.5 text-xs font-semibold text-[#2d6b60]">
            <MapPin size={13} /> {pin.category} · Boisar, Palghar
          </div>

          <p className="mt-3 text-sm leading-6 text-[#60716d]">
            {pin.description || 'No description yet. Add context when you know more.'}
          </p>

          <div className="mt-6 rounded-xl border border-[#d8d8c8] bg-[#f1f1e5] p-4">
            <div className="flex items-center gap-3">
              <Avatar name={pin.createdByName} />
              <div>
                <p className="text-sm font-bold text-[#243f48]">{pin.createdByName}</p>
                <div className="mt-1 flex items-center gap-2">
                  <LevelBadge level={pin.createdByLevel} />
                  <span className="text-xs text-[#708079]">added {formatDate(pin.createdAt)}</span>
                </div>
              </div>
            </div>
          </div>

          {pin.status !== 'admin_verified' && pin.status !== 'rejected' && (
            <div className="mt-6 rounded-xl border border-[#cdd9ce] bg-[#eaf1e9] p-4">
              <div className="flex gap-3">
                <ShieldCheck className="mt-0.5 shrink-0 text-[#2d6b60]" size={19} />
                <div>
                  <p className="text-sm font-bold text-[#205b51]">Are you in Boisar? Verify this place</p>
                  <p className="mt-1 text-xs leading-5 text-[#53736a]">
                    Your verification gives confidence to students, workers, and residents.
                  </p>
                </div>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-2">
                <button
                  disabled={verify.isPending}
                  onClick={() => cast('confirm')}
                  className="flex items-center justify-center gap-2 rounded-lg bg-[#2d6b60] px-3 py-2.5 text-xs font-bold text-[#f8f5ea] hover:bg-[#20574e] disabled:opacity-50"
                  data-testid="button-confirm-pin"
                >
                  <Check size={15} /> Still here
                </button>
                <button
                  disabled={verify.isPending}
                  onClick={() => cast('dispute')}
                  className="flex items-center justify-center gap-2 rounded-lg border border-[#d1a59a] bg-[#fff6f0] px-3 py-2.5 text-xs font-bold text-[#a34635] hover:bg-[#f9e7dd] disabled:opacity-50"
                  data-testid="button-dispute-pin"
                >
                  <ThumbsDown size={15} /> Not here
                </button>
              </div>
              {verify.isSuccess && (
                <p className="mt-3 text-center text-xs font-bold text-[#2d6b60]" data-testid="status-verification-success">
                  Your verification was recorded.
                </p>
              )}
            </div>
          )}

          <div className="mt-7">
            <div className="flex items-center justify-between">
              <h3 className="font-display text-lg font-bold text-[#172a3a]">Community checks</h3>
              <span className="font-mono-map text-xs text-[#708079]">{pin.totalPoints} points</span>
            </div>
            {pin.verifications.length === 0 ? (
              <p className="mt-3 text-sm text-[#708079]">No checks yet. You could be the first local to verify.</p>
            ) : (
              <div className="mt-3 space-y-3">
                {pin.verifications.map((v) => (
                  <div key={v.id} className="flex items-center gap-3 border-b border-[#e2e2d7] pb-3">
                    <Avatar name={v.voterName} size="sm" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-bold text-[#243f48]">
                        {v.voterName} <LevelBadge level={v.voterLevel} />
                      </p>
                      <p className="mt-1 text-[11px] text-[#708079]">{formatDate(v.castAt)}</p>
                    </div>
                    <span
                      className={`text-xs font-bold ${
                        v.vote === 'confirm' ? 'text-[#2d6b60]' : 'text-[#a34635]'
                      }`}
                    >
                      {v.vote === 'confirm' ? '+ confirmed' : '− disputed'}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </aside>
  );
}

function DesktopMapView({ onSwitchToMobile }: { onSwitchToMobile: () => void }) {
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('all');
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [createCoords, setCreateCoords] = useState<{ lat: string; lng: string }>({
    lat: '19.8055',
    lng: '72.7668',
  });
  const [nearby, setNearby] = useState(false);

  const pinQuery = useListPins(
    { status: status as 'all' | 'unverified' | 'community_verified' | 'admin_verified' | 'rejected' },
    {
      query: {
        queryKey: getListPinsQueryKey({
          status: status as 'all' | 'unverified' | 'community_verified' | 'admin_verified' | 'rejected',
        }),
        staleTime: 30_000,
      },
    }
  );

  // Use Boisar center coordinates for nearby query in Maharashtra
  const nearbyQuery = useListNearbyPins(
    { lat: BOISAR_CENTER[0], lng: BOISAR_CENTER[1] },
    {
      query: {
        enabled: nearby,
        queryKey: getListNearbyPinsQueryKey({ lat: BOISAR_CENTER[0], lng: BOISAR_CENTER[1] }),
        staleTime: 30_000,
      },
    }
  );

  const rawData = nearby ? nearbyQuery.data : pinQuery.data;
  const pins = (Array.isArray(rawData) ? rawData : []) as (Pin | NearbyPin)[];

  const filteredPins = useMemo(
    () =>
      pins.filter((pin) =>
        `${pin.name} ${pin.description} ${pin.category}`.toLowerCase().includes(search.toLowerCase())
      ),
    [pins, search]
  );

  const handleMapClick = (lat: number, lng: number) => {
    setCreateCoords({ lat: lat.toString(), lng: lng.toString() });
    setShowCreate(true);
  };

  return (
    <Shell>
      <PageTitle
        eyebrow="OpenStreetMap · Boisar, Palghar (Maharashtra)"
        title="Live Field Notes: Boisar & Tarapur"
        description="Community-verified points of interest in Boisar, Betegaon, Theem College, and Tarapur MIDC. Click anywhere on the OSM map or use '+ Add a place' to submit a local record."
        action={
          <div className="flex items-center gap-2.5">
            <SecondaryButton
              onClick={onSwitchToMobile}
              testId="button-switch-mobile-view"
            >
              <Smartphone size={16} /> Mobile UI
            </SecondaryButton>
            <PrimaryButton
              onClick={() => {
                setCreateCoords({ lat: '19.8055', lng: '72.7668' });
                setShowCreate(true);
              }}
              testId="button-open-create-pin"
            >
              <Plus size={17} /> Add a place
            </PrimaryButton>
          </div>
        }
      />

      <div className="relative grid flex-1 min-h-[420px] h-[calc(100dvh-130px)] max-h-[calc(100dvh-130px)] overflow-hidden rounded-xl border border-[#c8d1c6] bg-[#dfe6dc] shadow-md lg:grid-cols-[300px_1fr]">
        {/* Sidebar */}
        <section className="z-10 flex h-full max-h-full flex-col border-b border-[#c8d1c6] bg-[#f8f5ea]/95 backdrop-blur lg:border-b-0 lg:border-r overflow-hidden">
          <div className="border-b border-[#d8d8c8] p-2.5 shrink-0">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 text-[#789087]" size={15} />
              <input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search Theem College, station, MIDC…"
                className="w-full rounded-lg border border-[#c4d0c6] bg-[#fffdf4] py-1.5 pl-8 pr-2.5 text-xs outline-none focus:border-[#2d6b60]"
                data-testid="input-search-pins"
              />
            </div>

            <div className="mt-2 flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-xs font-bold text-[#49655f]">
                <SlidersHorizontal size={13} /> Filter
              </div>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="rounded-md border border-[#d0d8cf] bg-transparent px-2 py-1 text-xs font-bold text-[#49655f] outline-none"
                data-testid="select-map-status"
              >
                <option value="all">All places ({pins.length})</option>
                <option value="unverified">Needs check</option>
                <option value="community_verified">Community verified</option>
                <option value="admin_verified">Admin verified</option>
                <option value="rejected">Rejected</option>
              </select>
            </div>

            <button
              onClick={() => setNearby(!nearby)}
              className={`mt-2 flex w-full items-center justify-between rounded-lg border px-2.5 py-1.5 text-left text-xs font-bold transition ${
                nearby
                  ? 'border-[#2d6b60] bg-[#e3eee6] text-[#205b51]'
                  : 'border-[#d0d8cf] bg-[#f7f5eb] text-[#60716d] hover:border-[#2d6b60]'
              }`}
              data-testid="button-toggle-nearby"
            >
              <span className="flex items-center gap-1.5 text-[11px]">
                <LocateFixed size={14} /> {nearby ? 'Near Boisar (10km)' : 'Boisar region'}
              </span>
              <span
                className={`h-3.5 w-6 rounded-full p-0.5 ${
                  nearby ? 'bg-[#2d6b60]' : 'bg-[#c3cdc4]'
                }`}
              >
                <span
                  className={`block h-2.5 w-2.5 rounded-full bg-[#fffdf4] transition ${
                    nearby ? 'translate-x-2.5' : ''
                  }`}
                />
              </span>
            </button>
          </div>

          {/* List of places */}
          <div className="flex-1 overflow-y-auto p-2">
            {pinQuery.isLoading || (nearby && nearbyQuery.isLoading) ? (
              <div className="space-y-2 p-1">
                <Skeleton className="h-16 w-full" />
                <Skeleton className="h-16 w-full" />
                <Skeleton className="h-16 w-full" />
              </div>
            ) : pinQuery.isError || (nearby && nearbyQuery.isError) ? (
              <ErrorState
                onRetry={() => {
                  pinQuery.refetch();
                  nearbyQuery.refetch();
                }}
              />
            ) : filteredPins.length === 0 ? (
              <EmptyState
                title="No matching places in Boisar"
                description="Try a different search or click anywhere on the OpenStreetMap to add a pin."
                action={
                  <SecondaryButton
                    onClick={() => {
                      setCreateCoords({ lat: '19.8055', lng: '72.7668' });
                      setShowCreate(true);
                    }}
                    testId="button-empty-add"
                  >
                    <Plus size={15} /> Add a place
                  </SecondaryButton>
                }
              />
            ) : (
              <div className="space-y-1.5">
                {filteredPins.map((pin) => (
                  <button
                    key={pin.id}
                    onClick={() => setSelectedId(pin.id)}
                    className={`block w-full rounded-lg border p-2.5 text-left transition ${
                      selectedId === pin.id
                        ? 'border-[#2d6b60] bg-[#e5eee6] shadow-xs'
                        : 'border-[#e0e1d6] bg-[#fdfbf2] hover:border-[#b5c8bc] hover:bg-[#f3f4e9]'
                    }`}
                    data-testid={`card-pin-${pin.id}`}
                  >
                    <div className="flex items-start justify-between gap-1.5">
                      <span className="font-display text-xs font-bold leading-tight text-[#172a3a]">
                        {pin.name}
                      </span>
                      <ArrowUpRight size={13} className="shrink-0 text-[#8ba39a]" />
                    </div>
                    <p className="mt-0.5 line-clamp-1 text-[11px] leading-4 text-[#708079]">
                      {pin.description || 'No description yet.'}
                    </p>
                    <div className="mt-2 flex items-center justify-between">
                      <StatusPill status={pin.status} />
                      <span className="font-mono-map text-[9px] text-[#708079]">
                        {'distanceMeters' in pin && formatDistance(pin.distanceMeters)}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* Real OpenStreetMap section */}
        <section className="relative h-full w-full min-h-0 flex-1 overflow-hidden" aria-label="OpenStreetMap Interactive Canvas">
          <OsmMap
            pins={filteredPins}
            selectedId={selectedId}
            onSelectPin={setSelectedId}
            onMapClick={handleMapClick}
          />

          {selectedId && <PinDetails pinId={selectedId} onClose={() => setSelectedId(null)} />}
        </section>
      </div>

      {showCreate && (
        <CreatePinPanel
          initialLat={createCoords.lat}
          initialLng={createCoords.lng}
          onClose={() => setShowCreate(false)}
        />
      )}
    </Shell>
  );
}

export function MapPage() {
  const [, setLocation] = useLocation();
  const isMobileScreen = useIsMobile();
  const [viewOverride, setViewOverride] = useState<'mobile' | 'desktop' | null>(null);

  const me = useGetMe({ query: { queryKey: ['mapveri-me'], staleTime: 60_000 } });

  useEffect(() => {
    if (me.data?.role === 'admin') setLocation('/admin');
  }, [me.data, setLocation]);

  const isMobile = viewOverride === 'mobile' || (viewOverride === null && isMobileScreen);

  if (isMobile) {
    return (
      <MobileMapView
        onSwitchToDesktop={() => setViewOverride('desktop')}
      />
    );
  }

  return (
    <DesktopMapView
      onSwitchToMobile={() => setViewOverride('mobile')}
    />
  );
}