import { useEffect, useMemo, useState } from 'react';
import { useLocation } from 'wouter';
import {
  Search,
  Plus,
  SlidersHorizontal,
  X,
  Check,
  ThumbsDown,
  ArrowUpRight,
  LocateFixed,
  ShieldCheck,
  MapPin,
  Navigation,
  Copy,
  Share2,
  Camera,
  Info,
  Activity,
  ChevronUp,
  ChevronDown,
  ExternalLink,
} from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
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
import { CategoryCombobox } from '@/components/category-combobox';
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
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-[#172a3a]/50 backdrop-blur-sm p-0 sm:items-center sm:p-5">
      <div
        className="max-h-[92dvh] w-full max-w-xl overflow-y-auto rounded-t-2xl bg-[#f8f5ea] p-6 shadow-2xl sm:rounded-2xl sm:p-8"
        role="dialog"
        aria-modal="true"
        data-testid="dialog-create-pin"
      >
        <div className="flex items-start justify-between">
          <div>
            <p className="font-mono-map text-[10px] uppercase tracking-[.18em] text-[#8a6c20]">
              OpenStreetMap
            </p>
            <h2 className="mt-2 font-display text-3xl font-bold tracking-[-.05em] text-[#172a3a]">
              Place a pin
            </h2>
            <p className="mt-2 text-sm text-[#60716d]">
              Pin a landmark, institution, shop, or location on the map.
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
            <div>
              <label className="block text-sm font-bold text-[#243f48] mb-1">
                Category / Institution
              </label>
              <CategoryCombobox
                value={form.category}
                onChange={(cat) => setForm({ ...form, category: cat })}
                testId="select-pin-category"
              />
            </div>

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

function BottomPlaceWindow({ pinId, onClose }: { pinId: number; onClose: () => void }) {
  const queryClient = useQueryClient();
  const detail = useGetPin(pinId, { query: { enabled: true, queryKey: getGetPinQueryKey(pinId) } });
  const verify = useVerifyPin();
  const { toast } = useToast();
  const pin = detail.data;

  const [activeTab, setActiveTab] = useState<'overview' | 'verifications' | 'activity' | 'coordinates' | 'photos'>('overview');
  const [isExpanded, setIsExpanded] = useState(false);

  const cast = (vote: 'confirm' | 'dispute') =>
    verify.mutate(
      { id: pinId, data: { vote } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getGetPinQueryKey(pinId) });
          queryClient.invalidateQueries({ queryKey: getListPinsQueryKey() });
          toast({
            title: vote === 'confirm' ? 'Place confirmed!' : 'Place disputed',
            description: 'Your contribution was recorded.',
          });
        },
      }
    );

  const handleCopyCoords = () => {
    if (pin) {
      navigator.clipboard.writeText(`${pin.lat}, ${pin.lng}`);
      toast({
        title: 'Coordinates copied',
        description: `${pin.lat}, ${pin.lng} copied to clipboard`,
      });
    }
  };

  const handleDirections = () => {
    if (pin) {
      window.open(`https://www.google.com/maps/search/?api=1&query=${pin.lat},${pin.lng}`, '_blank');
    }
  };

  const handleShare = () => {
    if (!pin) return;
    if (navigator.share) {
      navigator.share({
        title: `${pin.name} - MapVeri`,
        text: `Check out ${pin.name} on MapVeri:`,
        url: window.location.href,
      }).catch(() => { });
    } else {
      handleCopyCoords();
    }
  };

  return (
    <div
      className={`absolute inset-x-0 bottom-0 z-30 flex flex-col rounded-t-3xl border-t border-[#c5d0c6] bg-[#fffdf9]/98 shadow-[0_-12px_36px_rgba(23,42,58,0.2)] backdrop-blur-md transition-all duration-300 animate-in slide-in-from-bottom ${isExpanded ? 'h-[78%]' : 'h-[320px]'
        }`}
      data-testid="bottom-place-window"
    >
      {/* Top Drag Handle */}
      <div
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex cursor-pointer flex-col items-center pt-2 pb-1 hover:opacity-80 transition"
      >
        <span className="h-1.5 w-12 rounded-full bg-[#c9d4ca]" />
      </div>

      {detail.isLoading ? (
        <div className="space-y-3 p-5">
          <Skeleton className="h-6 w-1/3" />
          <Skeleton className="h-16 w-full" />
        </div>
      ) : detail.isError || !pin ? (
        <div className="p-5">
          <ErrorState onRetry={() => detail.refetch()} />
        </div>
      ) : (
        <>
          {/* Header Bar */}
          <div className="flex items-center justify-between border-b border-[#e2e7e0] px-5 pb-3 pt-1">
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h2
                  className="truncate font-display text-lg font-bold text-[#172a3a] sm:text-xl"
                  data-testid={`text-pin-name-${pin.id}`}
                >
                  {pin.name}
                </h2>
                <span className="rounded bg-[#e8ede7] px-2 py-0.5 text-[11px] font-bold text-[#2d6b60]">
                  {pin.category}
                </span>
                <StatusPill status={pin.status} />
                <span className="rounded-full bg-[#f1c744]/25 px-2 py-0.5 font-mono-map text-[10px] font-bold text-[#7a5f13]">
                  {pin.totalPoints} pts
                </span>
              </div>
            </div>

            <div className="flex items-center gap-1.5 shrink-0 ml-3">
              <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="flex items-center gap-1 rounded-lg border border-[#d2dbd0] bg-[#f8f5ea] px-2.5 py-1 text-xs font-semibold text-[#3d5e56] hover:bg-[#edf2ea] transition"
                title={isExpanded ? 'Collapse' : 'Expand'}
              >
                {isExpanded ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
                <span className="hidden sm:inline">{isExpanded ? 'Collapse' : 'Expand'}</span>
              </button>
              <button
                onClick={onClose}
                className="rounded-lg p-1.5 text-[#60716d] hover:bg-[#e8e8dc] transition"
                aria-label="Close"
              >
                <X size={18} />
              </button>
            </div>
          </div>

          {/* Navigation Bar / Tabs */}
          <nav className="flex items-center gap-1 overflow-x-auto border-b border-[#e2e7e0] px-5 py-1 text-xs no-scrollbar bg-[#faf8f0]">
            <button
              onClick={() => setActiveTab('overview')}
              className={`flex items-center gap-1.5 px-3 py-2 font-bold transition border-b-2 ${activeTab === 'overview'
                  ? 'border-[#2d6b60] text-[#2d6b60]'
                  : 'border-transparent text-[#60716d] hover:text-[#172a3a]'
                }`}
            >
              <Info size={14} />
              <span>Overview</span>
            </button>
            <button
              onClick={() => setActiveTab('verifications')}
              className={`flex items-center gap-1.5 px-3 py-2 font-bold transition border-b-2 ${activeTab === 'verifications'
                  ? 'border-[#2d6b60] text-[#2d6b60]'
                  : 'border-transparent text-[#60716d] hover:text-[#172a3a]'
                }`}
            >
              <ShieldCheck size={14} />
              <span>Verifications ({pin.verifications?.length ?? 0})</span>
            </button>
            <button
              onClick={() => setActiveTab('activity')}
              className={`flex items-center gap-1.5 px-3 py-2 font-bold transition border-b-2 ${activeTab === 'activity'
                  ? 'border-[#2d6b60] text-[#2d6b60]'
                  : 'border-transparent text-[#60716d] hover:text-[#172a3a]'
                }`}
            >
              <Activity size={14} />
              <span>Activity</span>
            </button>
            <button
              onClick={() => setActiveTab('coordinates')}
              className={`flex items-center gap-1.5 px-3 py-2 font-bold transition border-b-2 ${activeTab === 'coordinates'
                  ? 'border-[#2d6b60] text-[#2d6b60]'
                  : 'border-transparent text-[#60716d] hover:text-[#172a3a]'
                }`}
            >
              <MapPin size={14} />
              <span>Coordinates</span>
            </button>
            <button
              onClick={() => setActiveTab('photos')}
              className={`flex items-center gap-1.5 px-3 py-2 font-bold transition border-b-2 ${activeTab === 'photos'
                  ? 'border-[#2d6b60] text-[#2d6b60]'
                  : 'border-transparent text-[#60716d] hover:text-[#172a3a]'
                }`}
            >
              <Camera size={14} />
              <span>Photos</span>
            </button>
          </nav>

          {/* Window Tab Content */}
          <div className="flex-1 overflow-y-auto px-5 py-4">
            {activeTab === 'overview' && (
              <div className="space-y-4">
                <p className="text-sm leading-6 text-[#40544f]">
                  {pin.description || 'No description provided yet.'}
                </p>

                {/* Quick Action Buttons */}
                <div className="flex flex-wrap items-center gap-2 pt-1">
                  <button
                    onClick={handleDirections}
                    className="flex items-center gap-1.5 rounded-xl bg-[#2d6b60] px-3.5 py-2 text-xs font-bold text-white shadow-xs hover:bg-[#20574e] transition"
                  >
                    <Navigation size={14} />
                    <span>Get Directions</span>
                  </button>
                  <button
                    onClick={handleCopyCoords}
                    className="flex items-center gap-1.5 rounded-xl border border-[#c4d0c6] bg-white px-3 py-2 text-xs font-semibold text-[#3d5e56] hover:bg-[#edf2ea] transition"
                  >
                    <Copy size={13} />
                    <span>Copy GPS</span>
                  </button>
                  <button
                    onClick={handleShare}
                    className="flex items-center gap-1.5 rounded-xl border border-[#c4d0c6] bg-white px-3 py-2 text-xs font-semibold text-[#3d5e56] hover:bg-[#edf2ea] transition"
                  >
                    <Share2 size={13} />
                    <span>Share</span>
                  </button>
                </div>

                {/* Contributor Card */}
                <div className="flex items-center justify-between rounded-xl border border-[#dfe4dc] bg-[#f8f6ee] p-3">
                  <div className="flex items-center gap-3">
                    <Avatar name={pin.createdByName} size="sm" />
                    <div>
                      <p className="text-xs font-bold text-[#172a3a]">{pin.createdByName}</p>
                      <div className="mt-0.5 flex items-center gap-2">
                        <LevelBadge level={pin.createdByLevel} />
                        <span className="text-[11px] text-[#708079]">added {formatDate(pin.createdAt)}</span>
                      </div>
                    </div>
                  </div>
                  <span className="font-mono-map text-xs font-bold text-[#2d6b60]">
                    {Number(pin.lat).toFixed(4)}°, {Number(pin.lng).toFixed(4)}°
                  </span>
                </div>

                {/* Quick Vote Bar */}
                {pin.status !== 'admin_verified' && pin.status !== 'rejected' && (
                  <div className="rounded-xl border border-[#cdd9ce] bg-[#eaf1e9] p-3.5">
                    <p className="text-xs font-bold text-[#205b51]">Community Trust Verification</p>
                    <p className="mt-0.5 text-[11px] text-[#53736a]">
                      Does this place exist and is it active? Cast your verification vote.
                    </p>
                    <div className="mt-3 flex items-center gap-2">
                      <button
                        disabled={verify.isPending}
                        onClick={() => cast('confirm')}
                        className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-[#2d6b60] py-2 text-xs font-bold text-white hover:bg-[#20574e] disabled:opacity-50"
                      >
                        <Check size={14} /> Confirm Place
                      </button>
                      <button
                        disabled={verify.isPending}
                        onClick={() => cast('dispute')}
                        className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-[#d1a59a] bg-[#fff6f0] py-2 text-xs font-bold text-[#a34635] hover:bg-[#f9e7dd] disabled:opacity-50"
                      >
                        <ThumbsDown size={14} /> Dispute
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'verifications' && (
              <div className="space-y-4">
                <div className="rounded-xl border border-[#dfe4dc] bg-[#f8f6ee] p-3.5">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-bold text-[#172a3a]">Community Trust Weight</p>
                      <p className="text-[11px] text-[#708079]">6+ points unlocks Community Verified</p>
                    </div>
                    <span className="font-mono-map text-lg font-bold text-[#2d6b60]">
                      {pin.totalPoints} pts
                    </span>
                  </div>
                  <div className="mt-2.5 h-2 w-full overflow-hidden rounded-full bg-[#e2e7df]">
                    <div
                      className="h-full bg-[#2d6b60] transition-all"
                      style={{ width: `${Math.min(100, (pin.totalPoints / 6) * 100)}%` }}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <p className="text-xs font-bold text-[#172a3a]">Recent Checks</p>
                  {pin.verifications?.length === 0 ? (
                    <p className="text-xs text-[#708079]">No checks cast yet. Be the first local to verify!</p>
                  ) : (
                    pin.verifications?.map((v) => (
                      <div key={v.id} className="flex items-center justify-between rounded-lg border border-[#e2e7e0] bg-white p-2.5">
                        <div className="flex items-center gap-2">
                          <Avatar name={v.voterName} size="sm" />
                          <div>
                            <p className="text-xs font-bold text-[#172a3a]">{v.voterName}</p>
                            <span className="text-[10px] text-[#708079]">{formatDate(v.castAt)}</span>
                          </div>
                        </div>
                        <span
                          className={`text-xs font-bold ${v.vote === 'confirm' ? 'text-[#2d6b60]' : 'text-[#a34635]'
                            }`}
                        >
                          {v.vote === 'confirm' ? '+ Confirmed' : '− Disputed'}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {activeTab === 'activity' && (
              <div className="space-y-3">
                <div className="flex items-start gap-3 rounded-lg border border-[#e2e7e0] bg-white p-3">
                  <span className="mt-0.5 rounded-full bg-[#e2eee4] p-1 text-[#2d6b60]">
                    <Plus size={14} />
                  </span>
                  <div>
                    <p className="text-xs font-bold text-[#172a3a]">Place Registered</p>
                    <p className="text-[11px] text-[#708079]">Added by {pin.createdByName} on {formatDate(pin.createdAt)}</p>
                  </div>
                </div>
                {pin.verifications?.map((v) => (
                  <div key={v.id} className="flex items-start gap-3 rounded-lg border border-[#e2e7e0] bg-white p-3">
                    <span className={`mt-0.5 rounded-full p-1 ${v.vote === 'confirm' ? 'bg-[#e2eee4] text-[#2d6b60]' : 'bg-[#fbe9e7] text-[#a34635]'}`}>
                      {v.vote === 'confirm' ? <Check size={14} /> : <ThumbsDown size={14} />}
                    </span>
                    <div>
                      <p className="text-xs font-bold text-[#172a3a]">
                        Verification Cast: {v.vote === 'confirm' ? 'Confirmed' : 'Disputed'}
                      </p>
                      <p className="text-[11px] text-[#708079]">Recorded by {v.voterName} on {formatDate(v.castAt)}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {activeTab === 'coordinates' && (
              <div className="space-y-3">
                <div className="rounded-xl border border-[#dfe4dc] bg-white p-3.5 space-y-2">
                  <p className="text-xs font-bold text-[#172a3a]">Geographic Coordinates</p>
                  <div className="grid grid-cols-2 gap-3 text-xs font-mono">
                    <div className="rounded-lg bg-[#f8f6ee] p-2">
                      <span className="block text-[10px] text-[#708079]">Latitude</span>
                      <span className="font-bold text-[#172a3a]">{pin.lat}</span>
                    </div>
                    <div className="rounded-lg bg-[#f8f6ee] p-2">
                      <span className="block text-[10px] text-[#708079]">Longitude</span>
                      <span className="font-bold text-[#172a3a]">{pin.lng}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <a
                    href={`https://www.google.com/maps/search/?api=1&query=${pin.lat},${pin.lng}`}
                    target="_blank"
                    rel="noreferrer"
                    className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-[#c4d0c6] bg-white py-2 text-xs font-bold text-[#2d6b60] hover:bg-[#edf2ea] transition"
                  >
                    <ExternalLink size={13} />
                    <span>View on Google Maps</span>
                  </a>
                  <a
                    href={`https://www.openstreetmap.org/?mlat=${pin.lat}&mlon=${pin.lng}#map=16/${pin.lat}/${pin.lng}`}
                    target="_blank"
                    rel="noreferrer"
                    className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-[#c4d0c6] bg-white py-2 text-xs font-bold text-[#2d6b60] hover:bg-[#edf2ea] transition"
                  >
                    <ExternalLink size={13} />
                    <span>View on OpenStreetMap</span>
                  </a>
                </div>
              </div>
            )}

            {activeTab === 'photos' && (
              <div className="space-y-4 py-3 text-center">
                <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-[#f1f3ed] text-[#708079]">
                  <Camera size={22} />
                </div>
                <div>
                  <p className="text-xs font-bold text-[#172a3a]">No Photos Uploaded Yet</p>
                  <p className="mt-1 text-[11px] text-[#708079]">
                    Photos and field observation media will appear here.
                  </p>
                </div>
                <button
                  onClick={() => toast({ title: 'Photo Upload', description: 'Photo uploads will be linked to community notes.' })}
                  className="rounded-xl border border-[#c4d0c6] bg-white px-4 py-2 text-xs font-bold text-[#2d6b60] hover:bg-[#edf2ea] transition"
                >
                  + Add Photo Note
                </button>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

function DesktopMapView({ onSwitchToMobile }: { onSwitchToMobile?: () => void } = {}) {
  const [search, setSearch] = useState('');
  const status = 'all';
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [droppedPin, setDroppedPin] = useState<{ lat: number; lng: number } | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [createCoords, setCreateCoords] = useState<{ lat: string; lng: string }>({
    lat: '19.8055',
    lng: '72.7668',
  });

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

  const pins = (Array.isArray(pinQuery.data) ? pinQuery.data : []) as (Pin | NearbyPin)[];

  const filteredPins = useMemo(
    () =>
      pins.filter((pin) =>
        `${pin.name} ${pin.description} ${pin.category}`.toLowerCase().includes(search.toLowerCase())
      ),
    [pins, search]
  );

  // Single click: put a red pin and show its coordinates
  const handleMapClick = (lat: number, lng: number) => {
    setSelectedId(null);
    setDroppedPin({ lat, lng });
    setCreateCoords({ lat: lat.toString(), lng: lng.toString() });
  };

  // Double click: open Add a Place directly with coordinates pre-filled
  const handleMapDoubleClick = (lat: number, lng: number) => {
    setDroppedPin({ lat, lng });
    setCreateCoords({ lat: lat.toString(), lng: lng.toString() });
    setShowCreate(true);
  };

  // Add place from red pin marker action button
  const handleAddPlaceAtCoords = (lat: number, lng: number) => {
    setCreateCoords({ lat: lat.toString(), lng: lng.toString() });
    setShowCreate(true);
  };

  // Click on existing named location: open the bottom window
  const handleSelectPin = (id: number) => {
    setDroppedPin(null);
    setSelectedId(id);
  };

  // Listen for pin selection events (e.g. from notification clicks) or query params
  useEffect(() => {
    const handleSelectPinEvent = (e: Event) => {
      const customEvent = e as CustomEvent<{ id: number }>;
      if (customEvent.detail?.id) {
        setSelectedId(customEvent.detail.id);
        setDroppedPin(null);
      }
    };
    window.addEventListener('mapveri:select-pin', handleSelectPinEvent);

    const params = new URLSearchParams(window.location.search);
    const pinParam = params.get('pin');
    if (pinParam) {
      const parsed = parseInt(pinParam, 10);
      if (!isNaN(parsed)) {
        setSelectedId(parsed);
      }
    }

    return () => {
      window.removeEventListener('mapveri:select-pin', handleSelectPinEvent);
    };
  }, []);

  return (
    <Shell
      headerActions={
        <PrimaryButton
          onClick={() => {
            if (!droppedPin) {
              setCreateCoords({ lat: '19.8055', lng: '72.7668' });
            }
            setShowCreate(true);
          }}
          testId="button-open-create-pin"
        >
          <Plus size={16} /> Add a place
        </PrimaryButton>
      }
    >
      <div className="relative flex flex-1 min-h-[420px] h-[calc(100dvh-75px)] max-h-[calc(100dvh-75px)] overflow-hidden rounded-xl border border-[#c8d1c6] bg-[#dfe6dc] shadow-md">
        {/* Floating semi-transparent search bar on top of the map */}
        <div
          className={`absolute left-4 top-4 z-20 flex items-center rounded-xl border border-[#c8d4ca]/80 bg-[#fffdf4]/90 p-1.5 shadow-lg backdrop-blur-md transition-all duration-300 ${showCreate ? 'pointer-events-none opacity-30 blur-[2px]' : 'opacity-100'
            }`}
        >
          <div className="relative flex w-72 sm:w-[380px] items-center">
            <Search className="absolute left-3 text-[#6f8880]" size={16} />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search places & pins…"
              className="w-full rounded-lg border-0 bg-transparent py-2 pl-9 pr-8 text-xs sm:text-sm text-[#172a3a] outline-none placeholder:text-[#889d95]"
              data-testid="input-search-pins"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-2 rounded p-1 text-[#889d95] hover:text-[#172a3a]"
                aria-label="Clear search"
              >
                <X size={14} />
              </button>
            )}
          </div>
        </div>

        {/* Real OpenStreetMap section occupying full space */}
        <section className="relative h-full w-full min-h-0 flex-1 overflow-hidden" aria-label="OpenStreetMap Interactive Canvas">
          <OsmMap
            pins={filteredPins}
            selectedId={selectedId}
            onSelectPin={handleSelectPin}
            onMapClick={handleMapClick}
            onMapDoubleClick={handleMapDoubleClick}
            droppedPin={droppedPin}
            onClearDroppedPin={() => setDroppedPin(null)}
            onAddPlaceAtCoords={handleAddPlaceAtCoords}
            hideQuickJumps={true}
            dimOverlays={showCreate}
          />

          {selectedId && (
            <BottomPlaceWindow
              pinId={selectedId}
              onClose={() => setSelectedId(null)}
            />
          )}
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