import { useState, useMemo, useRef, useEffect } from 'react';
import { Link, useLocation } from 'wouter';
import type { Map as MapLibreMap } from 'maplibre-gl';
import {
  Search,
  Plus,
  X,
  Check,
  ThumbsDown,
  Navigation,
  Share2,
  Layers,
  Locate,
  LocateFixed,
  Loader2,
  Compass,
  MapPin,
  Menu,
  ShieldCheck,
  ChevronUp,
  ChevronDown,
  ExternalLink,
  Copy,
  UserRound,
  LogOut,
  School,
  Train,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
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
  StatusPill,
  LevelBadge,
  Avatar,
  EmptyState,
  ErrorState,
  Skeleton,
  formatDate,
  formatDistance,
  Logo,
} from '@/components/shared';
import {
  OsmMap,
  BOISAR_CENTER,
  THEEM_COLLEGE,
  TILE_LAYERS,
  type TileLayerKey,
} from '@/components/osm-map';
import { type LocationTracker, type TrackingStatus, type GpsLocationData } from '@/lib/location-tracker';
import { useToast } from '@/hooks/use-toast';

interface MobileMapViewProps {
  onSwitchToDesktop?: () => void;
}

export function MobileMapView({ onSwitchToDesktop }: MobileMapViewProps) {
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const me = useGetMe({ query: { queryKey: ['mapveri-me'], staleTime: 60_000 } });
  const user = me.data;

  // Search & Filter state
  const [search, setSearch] = useState('');
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [statusFilter, setStatusFilter] = useState<'all' | 'unverified' | 'community_verified' | 'admin_verified' | 'rejected'>('all');
  const [nearbyOnly, setNearbyOnly] = useState(false);
  
  // Selection and UI sheet states
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [sheetMode, setSheetMode] = useState<'peek' | 'expanded' | 'detail'>('peek');
  const [activeTab, setActiveTab] = useState<'explore' | 'places' | 'contribute' | 'profile'>('explore');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [showLayersModal, setShowLayersModal] = useState(false);
  const [activeLayer, setActiveLayer] = useState<TileLayerKey>('osm');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createCoords, setCreateCoords] = useState<{ lat: string; lng: string }>({
    lat: '19.8055',
    lng: '72.7668',
  });

  const mapInstanceRef = useRef<MapLibreMap | null>(null);
  const trackerRef = useRef<LocationTracker | null>(null);
  const [gpsStatus, setGpsStatus] = useState<TrackingStatus>('idle');
  const [gpsFollowing, setGpsFollowing] = useState(false);
  const [gpsLocation, setGpsLocation] = useState<GpsLocationData | null>(null);

  // Queries
  const pinQuery = useListPins(
    { status: statusFilter },
    {
      query: {
        queryKey: getListPinsQueryKey({ status: statusFilter }),
        staleTime: 30_000,
      },
    }
  );

  const nearbyQuery = useListNearbyPins(
    { lat: BOISAR_CENTER[0], lng: BOISAR_CENTER[1] },
    {
      query: {
        enabled: nearbyOnly,
        queryKey: getListNearbyPinsQueryKey({ lat: BOISAR_CENTER[0], lng: BOISAR_CENTER[1] }),
        staleTime: 30_000,
      },
    }
  );

  const rawData = nearbyOnly ? nearbyQuery.data : pinQuery.data;
  const pins = (Array.isArray(rawData) ? rawData : []) as (Pin | NearbyPin)[];

  const filteredPins = useMemo(() => {
    return pins.filter((p) =>
      `${p.name} ${p.description ?? ''} ${p.category}`.toLowerCase().includes(search.toLowerCase())
    );
  }, [pins, search]);

  // Counts for filter pills
  const counts = useMemo(() => {
    const all = pins.length;
    const unverified = pins.filter((p) => p.status === 'unverified').length;
    const community = pins.filter((p) => p.status === 'community_verified').length;
    const admin = pins.filter((p) => p.status === 'admin_verified').length;
    return { all, unverified, community, admin };
  }, [pins]);

  // Handle pin selection
  const handleSelectPin = (id: number) => {
    setSelectedId(id);
    setSheetMode('detail');
    setIsSearchFocused(false);
    const pin = pins.find((p) => p.id === id);
    if (pin && mapInstanceRef.current) {
      mapInstanceRef.current.flyTo({
        center: [pin.lng, pin.lat],
        zoom: 16,
        duration: 800,
      });
    }
  };

  const handleMapClick = (lat: number, lng: number) => {
    if (selectedId) {
      setSelectedId(null);
      setSheetMode('peek');
      return;
    }
    setCreateCoords({ lat: lat.toFixed(6), lng: lng.toFixed(6) });
    setShowCreateModal(true);
  };

  const handleLocateMe = () => {
    if (!trackerRef.current) return;

    if (gpsStatus === 'idle' || gpsStatus === 'error') {
      toast({
        title: 'Acquiring GPS Signal...',
        description: 'Tracking your live position using device GPS.',
      });
      trackerRef.current.startTracking();
    } else if (gpsStatus === 'tracking') {
      if (!gpsFollowing) {
        trackerRef.current.recenter();
        toast({
          title: 'Location Centered',
          description: 'Camera re-centered on your current GPS position.',
        });
      } else {
        trackerRef.current.stopTracking();
        toast({
          title: 'GPS Tracking Stopped',
          description: 'Live device location tracking paused.',
        });
      }
    } else if (gpsStatus === 'locating') {
      trackerRef.current.stopTracking();
    }
  };

  const handleJumpTo = (coords: [number, number], zoom = 16, name = 'Location') => {
    mapInstanceRef.current?.flyTo({
      center: [coords[1], coords[0]],
      zoom,
      duration: 900,
    });
    toast({
      title: `Moved to ${name}`,
      description: 'Viewing coordinates on OpenStreetMap',
    });
  };

  const handleTabChange = (tab: 'explore' | 'places' | 'contribute' | 'profile') => {
    setActiveTab(tab);
    if (tab === 'explore') {
      setSelectedId(null);
      setSheetMode('peek');
    } else if (tab === 'places') {
      setSelectedId(null);
      setSheetMode('expanded');
    } else if (tab === 'contribute') {
      setCreateCoords({ lat: '19.8055', lng: '72.7668' });
      setShowCreateModal(true);
    } else if (tab === 'profile') {
      setLocation('/profile');
    }
  };

  return (
    <div className="relative flex h-[100dvh] w-full flex-col overflow-hidden bg-[#e5e3df] font-sans select-none">
      {/* 1. TOP FLOATING GOOGLE MAPS STYLE SEARCH BAR */}
      <div className="absolute top-2.5 inset-x-3 z-30 flex flex-col gap-2">
        <div className="flex items-center gap-2 rounded-full border border-[#cbd5cb] bg-[#fffdf9]/95 px-3 py-1.5 shadow-[0_4px_16px_rgba(23,42,58,0.14)] backdrop-blur-md transition-all focus-within:ring-2 focus-within:ring-[#2d6b60]">
          {/* Hamburger Menu / Back Button */}
          {selectedId ? (
            <button
              onClick={() => {
                setSelectedId(null);
                setSheetMode('peek');
              }}
              className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-[#455c57] hover:bg-[#edece4] active:scale-95 transition"
              aria-label="Back to explore"
            >
              <X size={20} />
            </button>
          ) : (
            <button
              onClick={() => setDrawerOpen(true)}
              className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-[#243f48] hover:bg-[#edece4] active:scale-95 transition"
              aria-label="Open Navigation Drawer"
              data-testid="button-mobile-menu"
            >
              <Menu size={20} />
            </button>
          )}

          {/* Search Input */}
          <div className="relative flex flex-1 items-center">
            <input
              type="text"
              value={search}
              onFocus={() => {
                setIsSearchFocused(true);
                if (sheetMode === 'peek') setSheetMode('expanded');
              }}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search Boisar, Theem College, MIDC…"
              className="w-full bg-transparent text-sm font-medium text-[#172a3a] placeholder-[#80948b] outline-none"
              data-testid="input-search-pins"
            />
          </div>

          {/* Clear Search or User Avatar */}
          {search ? (
            <button
              onClick={() => {
                setSearch('');
                setIsSearchFocused(false);
              }}
              className="grid h-8 w-8 place-items-center rounded-full text-[#708079] hover:bg-[#eae8dc] transition"
              aria-label="Clear search"
            >
              <X size={17} />
            </button>
          ) : (
            <button
              onClick={() => setDrawerOpen(true)}
              className="grid h-8 w-8 shrink-0 place-items-center rounded-full overflow-hidden border border-[#c4d0c6] shadow-xs active:scale-95 transition"
              aria-label="User Profile"
            >
              <Avatar name={user?.name} size="sm" />
            </button>
          )}
        </div>

        {/* 2. HORIZONTAL FILTER CHIPS (Google Maps style pill bar) */}
        {!selectedId && (
          <div className="no-scrollbar -mx-1 flex items-center gap-1.5 overflow-x-auto px-1 py-0.5">
            <button
              onClick={() => setStatusFilter('all')}
              className={`flex shrink-0 items-center gap-1 rounded-full px-3 py-1.5 text-xs font-semibold shadow-xs transition active:scale-95 ${
                statusFilter === 'all'
                  ? 'bg-[#172a3a] text-[#fffdf5]'
                  : 'border border-[#c6d2c8] bg-[#fffdf8]/90 text-[#304d48] backdrop-blur hover:bg-[#f0ede2]'
              }`}
            >
              <MapPin size={13} />
              <span>All</span>
              <span className={`ml-0.5 rounded-full px-1.5 py-0.2 text-[10px] ${statusFilter === 'all' ? 'bg-[#324a5d] text-white' : 'bg-[#e4ece5] text-[#304d48]'}`}>
                {counts.all}
              </span>
            </button>

            <button
              onClick={() => setStatusFilter(statusFilter === 'unverified' ? 'all' : 'unverified')}
              className={`flex shrink-0 items-center gap-1 rounded-full px-3 py-1.5 text-xs font-semibold shadow-xs transition active:scale-95 ${
                statusFilter === 'unverified'
                  ? 'bg-[#964431] text-[#fffdf5]'
                  : 'border border-[#c6d2c8] bg-[#fffdf8]/90 text-[#964431] backdrop-blur hover:bg-[#fbedea]'
              }`}
            >
              <AlertCircle size={13} />
              <span>Needs Check</span>
              <span className="ml-0.5 rounded-full bg-[#f6ded6] px-1.5 py-0.2 text-[10px] text-[#964431]">
                {counts.unverified}
              </span>
            </button>

            <button
              onClick={() => setStatusFilter(statusFilter === 'community_verified' ? 'all' : 'community_verified')}
              className={`flex shrink-0 items-center gap-1 rounded-full px-3 py-1.5 text-xs font-semibold shadow-xs transition active:scale-95 ${
                statusFilter === 'community_verified'
                  ? 'bg-[#806414] text-[#fffdf5]'
                  : 'border border-[#c6d2c8] bg-[#fffdf8]/90 text-[#806414] backdrop-blur hover:bg-[#faf4db]'
              }`}
            >
              <CheckCircle2 size={13} />
              <span>Verified</span>
              <span className="ml-0.5 rounded-full bg-[#f4ebd0] px-1.5 py-0.2 text-[10px] text-[#806414]">
                {counts.community}
              </span>
            </button>

            <button
              onClick={() => setNearbyOnly(!nearbyOnly)}
              className={`flex shrink-0 items-center gap-1 rounded-full px-3 py-1.5 text-xs font-semibold shadow-xs transition active:scale-95 ${
                nearbyOnly
                  ? 'bg-[#205b51] text-[#fffdf5]'
                  : 'border border-[#c6d2c8] bg-[#fffdf8]/90 text-[#205b51] backdrop-blur hover:bg-[#e4efe8]'
              }`}
              data-testid="button-toggle-nearby"
            >
              <Locate size={13} />
              <span>Near Boisar (10km)</span>
            </button>

            {/* Quick Landmark Jump Chips */}
            <button
              onClick={() => handleJumpTo(THEEM_COLLEGE, 16, 'Theem College')}
              className="flex shrink-0 items-center gap-1 rounded-full border border-[#c6d2c8] bg-[#fffdf8]/90 px-3 py-1.5 text-xs font-semibold text-[#1f4a43] shadow-xs backdrop-blur hover:bg-[#edf5f0] active:scale-95 transition"
            >
              <School size={13} className="text-[#2d6b60]" />
              <span>Theem College</span>
            </button>

            <button
              onClick={() => handleJumpTo([19.7984, 72.7615], 16, 'Boisar Station')}
              className="flex shrink-0 items-center gap-1 rounded-full border border-[#c6d2c8] bg-[#fffdf8]/90 px-3 py-1.5 text-xs font-semibold text-[#243f48] shadow-xs backdrop-blur hover:bg-[#edf5f0] active:scale-95 transition"
            >
              <Train size={13} className="text-[#dba91a]" />
              <span>Boisar Station</span>
            </button>
          </div>
        )}
      </div>

      {/* 3. FULL VIEWPORT OPENSTREETMAP LEAFLET CANVAS */}
      <main className="relative h-full w-full flex-1">
        <OsmMap
          pins={filteredPins}
          selectedId={selectedId}
          onSelectPin={handleSelectPin}
          onMapClick={handleMapClick}
          hideDefaultOverlays={true}
          activeLayer={activeLayer}
          onMapReady={(map) => {
            mapInstanceRef.current = map;
          }}
          onTrackerReady={(tracker) => {
            trackerRef.current = tracker;
          }}
          onGpsStatusChange={(status, following, loc) => {
            setGpsStatus(status);
            setGpsFollowing(following);
            setGpsLocation(loc);
          }}
        />

        {/* Live GPS Tracking Status Badge on Mobile */}
        {gpsStatus === 'tracking' && gpsLocation && (
          <div className="absolute top-20 left-3.5 z-20 flex items-center gap-2 rounded-full border border-blue-200 bg-white/95 px-3 py-1.5 shadow-md backdrop-blur animate-in fade-in">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-600"></span>
            </span>
            <span className="text-[11px] font-bold text-slate-800">Live GPS</span>
            <span className="text-[10px] text-blue-700 font-semibold">&plusmn;{Math.round(gpsLocation.accuracy)}m</span>
            {!gpsFollowing && (
              <button
                onClick={() => trackerRef.current?.recenter()}
                className="rounded bg-blue-100 px-1.5 py-0.5 text-[9px] font-bold text-blue-800 hover:bg-blue-200 transition"
              >
                Re-center
              </button>
            )}
          </div>
        )}

        {/* 4. GOOGLE MAPS STYLE FLOATING ACTION CONTROLS (Right side) */}
        <div className="absolute right-3.5 bottom-28 z-20 flex flex-col items-center gap-2.5">
          {/* Map Layers Selector */}
          <button
            onClick={() => setShowLayersModal(true)}
            className="grid h-11 w-11 place-items-center rounded-full border border-[#c7d5c9] bg-[#fffdf9] text-[#243f48] shadow-[0_3px_10px_rgba(0,0,0,0.16)] backdrop-blur active:scale-90 transition"
            aria-label="Map Layers"
            title="Tile Layers (OSM, Satellite, Humanitarian)"
          >
            <Layers size={19} />
          </button>

          {/* Compass / Center Boisar */}
          <button
            onClick={() => handleJumpTo(BOISAR_CENTER, 14, 'Boisar Town')}
            className="grid h-11 w-11 place-items-center rounded-full border border-[#c7d5c9] bg-[#fffdf9] text-[#806414] shadow-[0_3px_10px_rgba(0,0,0,0.16)] backdrop-blur active:scale-90 transition"
            aria-label="Center Boisar"
            title="Center on Boisar"
          >
            <Compass size={19} />
          </button>

          {/* GPS Locate & Track Me Button */}
          <button
            onClick={handleLocateMe}
            className={`relative grid h-12 w-12 place-items-center rounded-full border shadow-[0_4px_14px_rgba(0,0,0,0.2)] active:scale-90 transition ${
              gpsStatus === 'tracking' && gpsFollowing
                ? 'border-[#2563eb] bg-[#2563eb] text-white shadow-[0_0_16px_rgba(37,99,235,0.6)]'
                : gpsStatus === 'tracking' && !gpsFollowing
                ? 'border-[#2563eb] bg-white text-[#2563eb] shadow-[0_2px_8px_rgba(37,99,235,0.3)]'
                : gpsStatus === 'locating'
                ? 'border-[#3b82f6] bg-[#eff6ff] text-[#2563eb]'
                : 'border-[#b8cac0] bg-[#2d6b60] text-[#fffdf5] shadow-[0_4px_14px_rgba(45,107,96,0.4)]'
            }`}
            aria-label="Track My Location"
            title={
              gpsStatus === 'tracking' && gpsFollowing
                ? 'Tracking Active (Tap to pause)'
                : gpsStatus === 'tracking' && !gpsFollowing
                ? 'Re-center on My Location'
                : gpsStatus === 'locating'
                ? 'Acquiring GPS...'
                : 'Track My Location (GPS)'
            }
          >
            {gpsStatus === 'locating' ? (
              <Loader2 size={22} className="animate-spin text-[#2563eb]" />
            ) : gpsStatus === 'tracking' && gpsFollowing ? (
              <>
                <LocateFixed size={22} />
                <span className="absolute -top-1 -right-1 flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-blue-600 border-2 border-white"></span>
                </span>
              </>
            ) : gpsStatus === 'tracking' && !gpsFollowing ? (
              <>
                <Locate size={22} />
                <span className="absolute -top-0.5 -right-0.5 flex h-2.5 w-2.5 rounded-full bg-[#2563eb] ring-2 ring-white"></span>
              </>
            ) : (
              <Locate size={22} />
            )}
          </button>
        </div>

        {/* 5. FLOATING ADD PIN BUTTON (Prominent Google Maps "+ Place" FAB) */}
        {!selectedId && (
          <div className="absolute left-3.5 bottom-28 z-20">
            <button
              onClick={() => {
                setCreateCoords({ lat: '19.8055', lng: '72.7668' });
                setShowCreateModal(true);
              }}
              className="flex items-center gap-1.5 rounded-full border border-[#d2ab2b] bg-[#f1c744] px-4 py-2.5 text-xs font-bold text-[#172a3a] shadow-[0_4px_16px_rgba(0,0,0,0.2)] active:scale-95 transition"
              data-testid="button-open-create-pin"
            >
              <Plus size={17} strokeWidth={2.5} />
              <span>Add a place</span>
            </button>
          </div>
        )}
      </main>

      {/* 6. GOOGLE MAPS INTERACTIVE BOTTOM SHEET */}
      {selectedId ? (
        /* MODE C: Pin Details Bottom Sheet */
        <MobilePinDetailSheet
          pinId={selectedId}
          onClose={() => {
            setSelectedId(null);
            setSheetMode('peek');
          }}
          onDirections={(lat, lng) => {
            window.open(`https://www.google.com/maps/search/?api=1&query=${lat},${lng}`, '_blank');
          }}
        />
      ) : (
        /* MODE A / B: Explore Places Sheet (Peek Carousel / Expanded List) */
        <MobileExploreSheet
          mode={sheetMode}
          pins={filteredPins}
          onSetMode={setSheetMode}
          onSelectPin={handleSelectPin}
          onOpenAdd={() => setShowCreateModal(true)}
          isLoading={pinQuery.isLoading || (nearbyOnly && nearbyQuery.isLoading)}
        />
      )}

      {/* 7. DOCKED GOOGLE MAPS STYLE BOTTOM NAVIGATION */}
      <footer className="z-30 flex h-14 items-center justify-around border-t border-[#d8dfd7] bg-[#fffdf9]/95 px-2 backdrop-blur-md">
        <button
          onClick={() => handleTabChange('explore')}
          className={`flex flex-col items-center gap-0.5 py-1 text-[11px] font-semibold transition active:scale-95 ${
            activeTab === 'explore' ? 'text-[#2d6b60]' : 'text-[#708079] hover:text-[#243f48]'
          }`}
        >
          <Compass size={20} className={activeTab === 'explore' ? 'text-[#2d6b60]' : ''} />
          <span>Explore</span>
        </button>

        <button
          onClick={() => handleTabChange('places')}
          className={`flex flex-col items-center gap-0.5 py-1 text-[11px] font-semibold transition active:scale-95 ${
            activeTab === 'places' || sheetMode === 'expanded' ? 'text-[#2d6b60]' : 'text-[#708079] hover:text-[#243f48]'
          }`}
        >
          <div className="relative">
            <MapPin size={20} className={activeTab === 'places' ? 'text-[#2d6b60]' : ''} />
            <span className="absolute -top-1 -right-2 rounded-full bg-[#f1c744] px-1 text-[9px] font-bold text-[#172a3a]">
              {filteredPins.length}
            </span>
          </div>
          <span>Places</span>
        </button>

        <button
          onClick={() => handleTabChange('contribute')}
          className="flex flex-col items-center gap-0.5 py-1 text-[11px] font-semibold text-[#806414] hover:text-[#5a460c] active:scale-95 transition"
        >
          <div className="grid h-6 w-6 place-items-center rounded-full bg-[#f1c744] text-[#172a3a] shadow-xs">
            <Plus size={16} strokeWidth={2.5} />
          </div>
          <span>Contribute</span>
        </button>

        <button
          onClick={() => handleTabChange('profile')}
          className={`flex flex-col items-center gap-0.5 py-1 text-[11px] font-semibold transition active:scale-95 ${
            activeTab === 'profile' ? 'text-[#2d6b60]' : 'text-[#708079] hover:text-[#243f48]'
          }`}
        >
          <UserRound size={20} className={activeTab === 'profile' ? 'text-[#2d6b60]' : ''} />
          <span>{user?.name ? user.name.split(' ')[0] : 'Profile'}</span>
        </button>
      </footer>

      {/* 8. GOOGLE MAPS STYLE SIDE NAVIGATION DRAWER */}
      {drawerOpen && (
        <MobileNavigationDrawer
          user={user}
          onClose={() => setDrawerOpen(false)}
          onSwitchToDesktop={onSwitchToDesktop}
        />
      )}

      {/* 9. TILE LAYERS BOTTOM MODAL */}
      {showLayersModal && (
        <div className="fixed inset-0 z-50 flex items-end bg-[#172a3a]/40 backdrop-blur-xs">
          <div className="w-full rounded-t-3xl border-t border-[#d8d8c8] bg-[#fffdf9] p-5 shadow-2xl animate-in slide-in-from-bottom duration-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-mono-map text-[10px] uppercase tracking-[.18em] text-[#806414]">
                  Map Tiles
                </p>
                <h3 className="text-lg font-bold text-[#172a3a]">Choose Map Type</h3>
              </div>
              <button
                onClick={() => setShowLayersModal(false)}
                className="rounded-full p-2 text-[#708079] hover:bg-[#edece4]"
              >
                <X size={20} />
              </button>
            </div>

            <div className="mt-4 grid grid-cols-3 gap-3">
              {Object.entries(TILE_LAYERS).map(([key, config]) => (
                <button
                  key={key}
                  onClick={() => {
                    setActiveLayer(key as TileLayerKey);
                    setShowLayersModal(false);
                  }}
                  className={`flex flex-col items-center rounded-2xl border p-3 text-center transition active:scale-95 ${
                    activeLayer === key
                      ? 'border-[#2d6b60] bg-[#e7f0ea] ring-2 ring-[#2d6b60]'
                      : 'border-[#d8ded7] bg-[#f8f6ee] hover:bg-[#f1efe6]'
                  }`}
                >
                  <div className={`grid h-10 w-10 place-items-center rounded-xl mb-2 ${activeLayer === key ? 'bg-[#2d6b60] text-white' : 'bg-[#e2e8df] text-[#243f48]'}`}>
                    <Layers size={18} />
                  </div>
                  <span className="text-xs font-bold leading-tight text-[#172a3a]">
                    {key === 'osm' ? 'Default OSM' : key === 'satellite' ? 'Satellite' : 'HOT Street'}
                  </span>
                  {activeLayer === key && (
                    <span className="mt-1 text-[10px] font-bold text-[#2d6b60]">Active</span>
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 10. CREATE PIN MOBILE MODAL */}
      {showCreateModal && (
        <MobileCreatePinModal
          initialLat={createCoords.lat}
          initialLng={createCoords.lng}
          onClose={() => setShowCreateModal(false)}
        />
      )}
    </div>
  );
}

/**
 * Mobile Bottom Sheet for Exploring Places
 * Offers a Peek Carousel and an Expanded List view
 */
function MobileExploreSheet({
  mode,
  pins,
  onSetMode,
  onSelectPin,
  onOpenAdd,
  isLoading,
}: {
  mode: 'peek' | 'expanded' | 'detail';
  pins: (Pin | NearbyPin)[];
  onSetMode: (m: 'peek' | 'expanded' | 'detail') => void;
  onSelectPin: (id: number) => void;
  onOpenAdd: () => void;
  isLoading: boolean;
}) {
  const isExpanded = mode === 'expanded';

  return (
    <div
      className={`fixed inset-x-0 bottom-14 z-20 flex flex-col rounded-t-3xl border-t border-[#d5ded4] bg-[#fffdf9]/98 shadow-[0_-8px_24px_rgba(23,42,58,0.12)] backdrop-blur-md transition-all duration-300 ${
        isExpanded ? 'h-[75dvh]' : 'h-36'
      }`}
    >
      {/* Drag handle / Title Bar */}
      <div
        onClick={() => onSetMode(isExpanded ? 'peek' : 'expanded')}
        className="flex cursor-pointer flex-col items-center px-4 pt-2.5 pb-2"
      >
        <span className="h-1.5 w-12 rounded-full bg-[#c9d4ca]" />
        <div className="mt-2 flex w-full items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="font-display text-sm font-bold text-[#172a3a]">
              {isExpanded ? 'All Places in Boisar' : 'Explore Boisar'}
            </span>
            <span className="rounded-full bg-[#e7eee6] px-2 py-0.5 text-[10px] font-bold text-[#205b51]">
              {pins.length} found
            </span>
          </div>
          <button
            className="flex items-center gap-1 text-xs font-semibold text-[#2d6b60]"
            aria-label={isExpanded ? 'Collapse' : 'Expand'}
          >
            <span>{isExpanded ? 'Collapse' : 'View all'}</span>
            {isExpanded ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
          </button>
        </div>
      </div>

      {/* CONTENT */}
      {isExpanded ? (
        /* EXPANDED LIST VIEW */
        <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-2.5">
          {isLoading ? (
            <div className="space-y-3 pt-2">
              <Skeleton className="h-20 w-full rounded-2xl" />
              <Skeleton className="h-20 w-full rounded-2xl" />
              <Skeleton className="h-20 w-full rounded-2xl" />
            </div>
          ) : pins.length === 0 ? (
            <div className="py-8 text-center">
              <p className="text-sm font-bold text-[#243f48]">No places found</p>
              <p className="mt-1 text-xs text-[#708079]">Try clearing your search or add a new place.</p>
              <button
                onClick={onOpenAdd}
                className="mt-4 rounded-full bg-[#f1c744] px-4 py-2 text-xs font-bold text-[#172a3a]"
              >
                + Add place now
              </button>
            </div>
          ) : (
            pins.map((pin) => (
              <button
                key={pin.id}
                onClick={() => onSelectPin(pin.id)}
                className="flex w-full items-start gap-3 rounded-2xl border border-[#dfe4dc] bg-[#fffdfa] p-3 text-left shadow-2xs hover:border-[#2d6b60] active:scale-98 transition"
                data-testid={`card-pin-${pin.id}`}
              >
                <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#eef3ec] text-[#2d6b60]">
                  <MapPin size={18} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline justify-between gap-1">
                    <p className="truncate font-display text-sm font-bold text-[#172a3a]">
                      {pin.name}
                    </p>
                    {'distanceMeters' in pin && (
                      <span className="shrink-0 font-mono-map text-[10px] text-[#708079]">
                        {formatDistance(pin.distanceMeters)}
                      </span>
                    )}
                  </div>
                  <p className="mt-0.5 line-clamp-1 text-xs text-[#60716d]">
                    {pin.description || 'No description yet.'}
                  </p>
                  <div className="mt-2 flex items-center justify-between">
                    <span className="inline-flex items-center gap-1 rounded bg-[#e8ede7] px-1.5 py-0.5 text-[10px] font-semibold text-[#2d6b60]">
                      {pin.category}
                    </span>
                    <StatusPill status={pin.status} />
                  </div>
                </div>
              </button>
            ))
          )}
        </div>
      ) : (
        /* PEEK HORIZONTAL CAROUSEL */
        <div className="no-scrollbar flex gap-2.5 overflow-x-auto px-4 pb-2">
          {isLoading ? (
            <div className="flex gap-2">
              <Skeleton className="h-20 w-52 shrink-0 rounded-2xl" />
              <Skeleton className="h-20 w-52 shrink-0 rounded-2xl" />
            </div>
          ) : pins.length === 0 ? (
            <div className="flex items-center gap-3 py-2 text-xs text-[#708079]">
              <span>No places in this view.</span>
              <button
                onClick={onOpenAdd}
                className="font-bold text-[#2d6b60] underline"
              >
                + Add one
              </button>
            </div>
          ) : (
            pins.slice(0, 10).map((pin) => (
              <button
                key={pin.id}
                onClick={() => onSelectPin(pin.id)}
                className="flex w-64 shrink-0 flex-col rounded-2xl border border-[#d8ded6] bg-[#fffdfa] p-3 text-left shadow-xs hover:border-[#2d6b60] active:scale-98 transition"
                data-testid={`card-pin-${pin.id}`}
              >
                <div className="flex items-center justify-between">
                  <span className="truncate text-xs font-bold text-[#172a3a]">
                    {pin.name}
                  </span>
                  {'distanceMeters' in pin && (
                    <span className="font-mono-map text-[10px] text-[#708079]">
                      {formatDistance(pin.distanceMeters)}
                    </span>
                  )}
                </div>
                <p className="mt-1 line-clamp-1 text-[11px] text-[#708079]">
                  {pin.description || 'No notes added yet.'}
                </p>
                <div className="mt-2.5 flex items-center justify-between">
                  <span className="rounded bg-[#e8ede7] px-1.5 py-0.5 text-[10px] font-semibold text-[#2d6b60]">
                    {pin.category}
                  </span>
                  <StatusPill status={pin.status} />
                </div>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}

/**
 * Mobile Detail Sheet for Selected Place (Google Maps style bottom card)
 */
function MobilePinDetailSheet({
  pinId,
  onClose,
  onDirections,
}: {
  pinId: number;
  onClose: () => void;
  onDirections: (lat: number, lng: number) => void;
}) {
  const queryClient = useQueryClient();
  const detail = useGetPin(pinId, { query: { enabled: true, queryKey: getGetPinQueryKey(pinId) } });
  const verify = useVerifyPin();
  const { toast } = useToast();
  const pin = detail.data;

  const handleVerify = (vote: 'confirm' | 'dispute') => {
    verify.mutate(
      { id: pinId, data: { vote } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getGetPinQueryKey(pinId) });
          queryClient.invalidateQueries({ queryKey: getListPinsQueryKey() });
          toast({
            title: vote === 'confirm' ? 'Place confirmed!' : 'Place disputed',
            description: 'Your contribution was recorded on the Boisar record.',
          });
        },
      }
    );
  };

  const handleCopyCoords = () => {
    if (pin) {
      navigator.clipboard.writeText(`${pin.lat}, ${pin.lng}`);
      toast({
        title: 'Coordinates copied',
        description: `${pin.lat}, ${pin.lng} copied to clipboard`,
      });
    }
  };

  const handleShare = () => {
    if (!pin) return;
    if (navigator.share) {
      navigator.share({
        title: `${pin.name} - MapVeri Boisar`,
        text: `Check out ${pin.name} on MapVeri Boisar:`,
        url: window.location.href,
      }).catch(() => {});
    } else {
      handleCopyCoords();
    }
  };

  return (
    <div
      className="fixed inset-x-0 bottom-14 z-40 max-h-[82dvh] flex flex-col rounded-t-3xl border-t border-[#d0ded0] bg-[#fffdf9] shadow-[0_-12px_32px_rgba(23,42,58,0.22)] animate-in slide-in-from-bottom duration-250"
      data-testid="panel-pin-details"
    >
      {/* Top Handle and Close button */}
      <div className="flex items-center justify-between border-b border-[#e5ebe4] px-4 py-2.5">
        <span className="h-1.5 w-12 rounded-full bg-[#cbd5cb] mx-auto" />
        <button
          onClick={onClose}
          className="absolute right-3 top-2.5 grid h-8 w-8 place-items-center rounded-full text-[#708079] hover:bg-[#edece4] active:scale-95"
          data-testid="button-close-pin-details"
          aria-label="Close place details"
        >
          <X size={18} />
        </button>
      </div>

      {detail.isLoading ? (
        <div className="space-y-4 p-5">
          <Skeleton className="h-6 w-3/4 rounded-lg" />
          <Skeleton className="h-16 w-full rounded-xl" />
          <Skeleton className="h-10 w-full rounded-lg" />
        </div>
      ) : detail.isError || !pin ? (
        <div className="p-5">
          <ErrorState onRetry={() => detail.refetch()} />
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Title & Category Header */}
          <div>
            <div className="flex items-center justify-between">
              <span className="inline-flex items-center gap-1 rounded-md bg-[#e4ede5] px-2 py-0.5 text-xs font-bold text-[#2d6b60]">
                <MapPin size={12} /> {pin.category} · Boisar
              </span>
              <StatusPill status={pin.status} />
            </div>

            <h2
              className="mt-2 font-display text-2xl font-bold tracking-tight text-[#172a3a]"
              data-testid={`text-pin-name-${pin.id}`}
            >
              {pin.name}
            </h2>

            <div className="mt-1 flex items-center gap-2 text-xs text-[#708079]">
              <span className="font-mono-map text-[11px]">
                {Number(pin.lat).toFixed(4)}°N, {Number(pin.lng).toFixed(4)}°E
              </span>
              <span>·</span>
              <button
                onClick={handleCopyCoords}
                className="flex items-center gap-1 text-[#2d6b60] hover:underline"
              >
                <Copy size={11} /> Copy
              </button>
            </div>
          </div>

          {/* GOOGLE MAPS ACTION BUTTONS ROW */}
          <div className="grid grid-cols-3 gap-2 border-y border-[#e5ebe4] py-3">
            <button
              onClick={() => onDirections(pin.lat, pin.lng)}
              className="flex flex-col items-center gap-1 rounded-xl bg-[#e7f0ea] py-2 text-xs font-bold text-[#205b51] active:scale-95 transition"
            >
              <Navigation size={18} />
              <span>Directions</span>
            </button>

            <button
              onClick={handleShare}
              className="flex flex-col items-center gap-1 rounded-xl bg-[#f2efe4] py-2 text-xs font-bold text-[#243f48] active:scale-95 transition"
            >
              <Share2 size={18} />
              <span>Share</span>
            </button>

            <button
              onClick={onClose}
              className="flex flex-col items-center gap-1 rounded-xl bg-[#f2efe4] py-2 text-xs font-bold text-[#708079] active:scale-95 transition"
            >
              <X size={18} />
              <span>Close</span>
            </button>
          </div>

          {/* Description */}
          <div className="rounded-xl bg-[#f8f6ed] p-3.5 border border-[#e2e8df]">
            <p className="text-xs font-bold uppercase tracking-wider text-[#806414]">
              Field Notes
            </p>
            <p className="mt-1 text-sm leading-relaxed text-[#40524d]">
              {pin.description || 'No description provided yet by neighbors.'}
            </p>
          </div>

          {/* Added By User Card */}
          <div className="flex items-center gap-3 rounded-xl border border-[#dce3da] bg-[#f5f8f4] p-3">
            <Avatar name={pin.createdByName} size="sm" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-bold text-[#172a3a]">
                Placed by {pin.createdByName}
              </p>
              <div className="mt-0.5 flex items-center gap-2">
                <LevelBadge level={pin.createdByLevel} />
                <span className="text-[10px] text-[#708079]">
                  {formatDate(pin.createdAt)}
                </span>
              </div>
            </div>
          </div>

          {/* Verification Voting Box */}
          {pin.status !== 'admin_verified' && pin.status !== 'rejected' && (
            <div className="rounded-2xl border border-[#cddace] bg-[#eaf2ea] p-4">
              <div className="flex items-start gap-2.5">
                <ShieldCheck size={20} className="shrink-0 text-[#2d6b60] mt-0.5" />
                <div>
                  <p className="text-sm font-bold text-[#205b51]">Are you in Boisar?</p>
                  <p className="text-xs text-[#53736a] mt-0.5">
                    Your verification gives confidence to students, workers, and residents.
                  </p>
                </div>
              </div>

              <div className="mt-3.5 grid grid-cols-2 gap-2">
                <button
                  disabled={verify.isPending}
                  onClick={() => handleVerify('confirm')}
                  className="flex items-center justify-center gap-1.5 rounded-xl bg-[#2d6b60] py-2.5 text-xs font-bold text-white shadow-xs active:scale-95 disabled:opacity-50"
                  data-testid="button-confirm-pin"
                >
                  <Check size={16} /> Still here
                </button>
                <button
                  disabled={verify.isPending}
                  onClick={() => handleVerify('dispute')}
                  className="flex items-center justify-center gap-1.5 rounded-xl border border-[#e0b0a5] bg-[#fff6f2] py-2.5 text-xs font-bold text-[#a34635] shadow-xs active:scale-95 disabled:opacity-50"
                  data-testid="button-dispute-pin"
                >
                  <ThumbsDown size={16} /> Not here
                </button>
              </div>

              {verify.isSuccess && (
                <p className="mt-2 text-center text-xs font-bold text-[#2d6b60]" data-testid="status-verification-success">
                  Your verification was recorded.
                </p>
              )}
            </div>
          )}

          {/* Community checks history */}
          <div>
            <div className="flex items-center justify-between">
              <h4 className="font-display text-sm font-bold text-[#172a3a]">
                Community Checks
              </h4>
              <span className="font-mono-map text-xs font-bold text-[#2d6b60]">
                {pin.totalPoints} points
              </span>
            </div>

            {pin.verifications.length === 0 ? (
              <p className="mt-2 text-xs text-[#708079]">
                No checks recorded yet. Be the first local to verify!
              </p>
            ) : (
              <div className="mt-2 space-y-2">
                {pin.verifications.map((v) => (
                  <div
                    key={v.id}
                    className="flex items-center justify-between rounded-lg border border-[#e2e8df] bg-[#fdfbf6] p-2.5 text-xs"
                  >
                    <div className="flex items-center gap-2">
                      <Avatar name={v.voterName} size="sm" />
                      <div>
                        <p className="font-bold text-[#243f48]">{v.voterName}</p>
                        <p className="text-[10px] text-[#708079]">{formatDate(v.castAt)}</p>
                      </div>
                    </div>
                    <span
                      className={`font-bold ${
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
    </div>
  );
}

/**
 * Mobile Side Drawer (Navigation like Google Maps)
 */
function MobileNavigationDrawer({
  user,
  onClose,
  onSwitchToDesktop,
}: {
  user: any;
  onClose: () => void;
  onSwitchToDesktop?: () => void;
}) {
  const [, setLocation] = useLocation();

  const handleSignOut = () => {
    window.localStorage.removeItem('mapveri_token');
    setLocation('/login');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex">
      {/* Backdrop */}
      <div
        onClick={onClose}
        className="fixed inset-0 bg-[#172a3a]/50 backdrop-blur-xs transition-opacity"
      />

      {/* Drawer content */}
      <div className="relative flex w-4/5 max-w-xs flex-col bg-[#172a3a] text-[#f6f1df] p-5 shadow-2xl animate-in slide-in-from-left duration-250">
        <div className="flex items-center justify-between pb-4 border-b border-[#314c5e]">
          <Logo />
          <button
            onClick={onClose}
            className="rounded-full p-1.5 text-[#9ab3a9] hover:bg-[#203a4a]"
            aria-label="Close menu"
          >
            <X size={18} />
          </button>
        </div>

        {/* User Card */}
        <div className="mt-4 flex items-center gap-3 rounded-xl border border-[#375569] bg-[#1e3747] p-3">
          <Avatar name={user?.name} size="md" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-bold text-[#fffdf5]">
              {user?.name ?? 'Guest Neighbor'}
            </p>
            <div className="mt-1 flex items-center gap-1.5">
              <LevelBadge level={user?.level} />
              <span className="text-[10px] text-[#9ab3a9]">Level {user?.level ?? 'C'}</span>
            </div>
          </div>
        </div>

        {/* Navigation list */}
        <nav className="mt-6 flex flex-col gap-1 text-sm font-semibold">
          <Link
            href="/map"
            onClick={onClose}
            className="flex items-center gap-3 rounded-xl bg-[#f1c744] px-3 py-2.5 text-[#172a3a]"
          >
            <Compass size={18} />
            <span>Map Workspace</span>
          </Link>

          <Link
            href="/profile"
            onClick={onClose}
            className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-[#bdcec5] hover:bg-[#203a4a]"
          >
            <UserRound size={18} />
            <span>My Contributions</span>
          </Link>

          {user?.role === 'admin' && (
            <>
              <div className="my-2 border-t border-[#314c5e] pt-2">
                <span className="font-mono-map text-[9px] uppercase tracking-wider text-[#f1c744]">
                  Admin Tools
                </span>
              </div>
              <Link
                href="/admin/overview"
                onClick={onClose}
                className="flex items-center gap-3 rounded-xl px-3 py-2 text-[#bdcec5] hover:bg-[#203a4a]"
              >
                <ShieldCheck size={18} />
                <span>Admin Console</span>
              </Link>
              <Link
                href="/admin/queue"
                onClick={onClose}
                className="flex items-center gap-3 rounded-xl px-3 py-2 text-[#bdcec5] hover:bg-[#203a4a]"
              >
                <AlertCircle size={18} />
                <span>Review Queue</span>
              </Link>
            </>
          )}

          {onSwitchToDesktop && (
            <button
              onClick={() => {
                onSwitchToDesktop();
                onClose();
              }}
              className="mt-3 flex items-center gap-3 rounded-xl border border-[#3b596c] px-3 py-2 text-xs font-semibold text-[#f1c744] hover:bg-[#203a4a]"
            >
              <ExternalLink size={15} />
              <span>Switch to Desktop View</span>
            </button>
          )}
        </nav>

        {/* Footer */}
        <div className="mt-auto border-t border-[#314c5e] pt-4">
          <button
            onClick={handleSignOut}
            className="flex w-full items-center gap-3 text-xs font-bold text-[#b54b38] hover:text-[#d9533a]"
          >
            <LogOut size={16} />
            <span>Sign out of MapVeri</span>
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * Mobile Create Pin Bottom Sheet / Modal
 */
function MobileCreatePinModal({
  initialLat,
  initialLng,
  onClose,
}: {
  initialLat: string;
  initialLng: string;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const createPin = useCreatePin();
  const { toast } = useToast();

  const [form, setForm] = useState({
    name: '',
    description: '',
    category: 'Landmark',
    lat: initialLat,
    lng: initialLng,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
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
          toast({
            title: 'Place submitted!',
            description: `${form.name} is now visible on the Boisar community map.`,
          });
          onClose();
        },
      }
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end bg-[#172a3a]/50 backdrop-blur-xs">
      <div
        className="max-h-[90dvh] w-full overflow-y-auto rounded-t-3xl border-t border-[#d8d8c8] bg-[#fffdf9] p-5 shadow-2xl animate-in slide-in-from-bottom duration-250"
        data-testid="dialog-create-pin"
      >
        <div className="flex items-center justify-between border-b border-[#e6ece5] pb-3">
          <div>
            <p className="font-mono-map text-[10px] uppercase tracking-[.18em] text-[#806414]">
              Boisar & Palghar, MH
            </p>
            <h2 className="text-xl font-bold text-[#172a3a]">Add a Place</h2>
          </div>
          <button
            onClick={onClose}
            className="rounded-full p-2 text-[#708079] hover:bg-[#edece4]"
            data-testid="button-close-create-pin"
          >
            <X size={20} />
          </button>
        </div>

        {/* Quick Presets */}
        <div className="mt-3">
          <span className="text-[11px] font-bold text-[#455c57]">Quick Presets (Boisar):</span>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
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
              className="rounded-full border border-[#cad6cb] bg-[#eef4ee] px-2.5 py-1 text-[11px] font-semibold text-[#1f4a43]"
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
              className="rounded-full border border-[#cad6cb] bg-[#eef4ee] px-2.5 py-1 text-[11px] font-semibold text-[#1f4a43]"
            >
              Boisar Station (19.7984, 72.7615)
            </button>
            <button
              type="button"
              onClick={() =>
                setForm((prev) => ({
                  ...prev,
                  name: prev.name || 'Near D-Mart',
                  lat: '19.8021',
                  lng: '72.7580',
                }))
              }
              className="rounded-full border border-[#cad6cb] bg-[#eef4ee] px-2.5 py-1 text-[11px] font-semibold text-[#1f4a43]"
            >
              D-Mart (19.8021, 72.7580)
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-3.5">
          <label className="block text-xs font-bold text-[#243f48]">
            Place Name
            <input
              required
              minLength={2}
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="mt-1.5 w-full rounded-xl border border-[#c4d2c7] bg-[#f8f6ee] px-3.5 py-2.5 text-base text-[#172a3a] outline-none focus:border-[#2d6b60] focus:bg-white"
              placeholder="e.g. Theem College Canteen / Betegaon Store"
              data-testid="input-pin-name"
            />
          </label>

          <label className="block text-xs font-bold text-[#243f48]">
            What should neighbors know?
            <textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              className="mt-1.5 min-h-20 w-full resize-y rounded-xl border border-[#c4d2c7] bg-[#f8f6ee] px-3.5 py-2.5 text-sm text-[#172a3a] outline-none focus:border-[#2d6b60] focus:bg-white"
              placeholder="Directions, opening hours, landmarks, or special details"
              data-testid="input-pin-description"
            />
          </label>

          <div className="grid grid-cols-2 gap-3">
            <label className="block text-xs font-bold text-[#243f48]">
              Category
              <select
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
                className="mt-1.5 w-full rounded-xl border border-[#c4d2c7] bg-[#f8f6ee] px-3 py-2.5 text-sm text-[#172a3a] outline-none focus:border-[#2d6b60]"
                data-testid="select-pin-category"
              >
                {Object.values(PinInputCategory).map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </label>

            <div>
              <span className="block text-xs font-bold text-[#243f48]">Coordinates</span>
              <div className="mt-1.5 grid grid-cols-2 gap-1.5">
                <input
                  required
                  type="number"
                  step="any"
                  value={form.lat}
                  onChange={(e) => setForm({ ...form, lat: e.target.value })}
                  className="w-full rounded-xl border border-[#c4d2c7] bg-[#f8f6ee] px-2.5 py-2.5 font-mono-map text-xs outline-none focus:border-[#2d6b60]"
                  placeholder="Lat"
                  data-testid="input-pin-lat"
                />
                <input
                  required
                  type="number"
                  step="any"
                  value={form.lng}
                  onChange={(e) => setForm({ ...form, lng: e.target.value })}
                  className="w-full rounded-xl border border-[#c4d2c7] bg-[#f8f6ee] px-2.5 py-2.5 font-mono-map text-xs outline-none focus:border-[#2d6b60]"
                  placeholder="Lng"
                  data-testid="input-pin-lng"
                />
              </div>
            </div>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={createPin.isPending}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#2d6b60] py-3 text-sm font-bold text-white shadow-md active:scale-98 disabled:opacity-50 transition"
              data-testid="button-submit-pin"
            >
              {createPin.isPending ? 'Placing pin…' : <><Plus size={18} strokeWidth={2.5} /> Save Place</>}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
