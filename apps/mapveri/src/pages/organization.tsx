import { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import { Link, useLocation } from 'wouter';
import * as maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { getMapLibreStyle, TILE_LAYERS, type TileLayerKey } from '@/components/osm-map';
import {
  Truck,
  Navigation,
  Route as RouteIcon,
  UserRound,
  Wrench,
  Radio,
  MapPinned,
  Activity,
  Search,
  Plus,
  RefreshCw,
  Phone,
  Clock,
  Gauge,
  Fuel,
  BatteryCharging,
  Thermometer,
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  ChevronRight,
  Maximize2,
  ExternalLink,
  Layers,
  Sparkles,
  ArrowRight,
  X,
} from 'lucide-react';
import { Shell, Avatar, PrimaryButton, SecondaryButton, Skeleton, ErrorState, EmptyState } from '@/components/shared';

// Interface matching backend /api/org/fleet
export interface TruckData {
  id: string;
  plateNumber: string;
  model: string;
  driver: {
    id: string;
    name: string;
    phone: string;
    avatar: string;
    experience: string;
    rating: number;
    dutyHoursToday: string;
    safetyScore: number;
    license: string;
  };
  status: 'in_transit' | 'idling' | 'loading' | 'maintenance' | 'delivered';
  lat: number;
  lng: number;
  heading: number;
  speedKmh: number;
  fuelPct: number;
  batteryV: number;
  engineTempC: number;
  tirePressurePsi: number;
  cargo: {
    title: string;
    category: string;
    weightTons: number;
    isTempControlled?: boolean;
    tempCelsius?: number;
    manifestId: string;
    client: string;
  };
  route: {
    id: string;
    origin: string;
    originLat: number;
    originLng: number;
    destination: string;
    destLat: number;
    destLng: number;
    etaMinutes: number;
    etaTime: string;
    distanceRemainingKm: number;
    distanceTotalKm: number;
    progressPct: number;
    nextCheckpoint: string;
    waypoints: Array<{ name: string; lat: number; lng: number; passed: boolean; time?: string }>;
  };
  alerts: string[];
  lastUpdated: string;
}

export interface OrgStats {
  totalTrucks: number;
  activeOnRoad: number;
  loadingCount: number;
  idlingCount: number;
  maintenanceCount: number;
  totalTonsInTransit: number;
  onTimeDeliveryRate: number;
  averageFleetSpeedKmh: number;
  averageFuelEconomyKmpl: number;
  activeAlertsCount: number;
  driverFatigueCompliance: string;
  fleetCarbonOffset: string;
}

export interface Geofence {
  id: string;
  name: string;
  type: string;
  lat: number;
  lng: number;
  radiusMeters: number;
  activeTrucksInside: number;
  status: string;
}

export function OrganizationPage({ view = 'fleet' }: { view?: 'fleet' | 'overview' | 'routes' | 'drivers' | 'geofences' | 'maintenance' }) {
  const [, setLocation] = useLocation();
  const [fleet, setFleet] = useState<TruckData[]>([]);
  const [stats, setStats] = useState<OrgStats | null>(null);
  const [geofences, setGeofences] = useState<Geofence[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTruckId, setSelectedTruckId] = useState<string | null>('TRK-101');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showDispatchModal, setShowDispatchModal] = useState(false);
  const [radioToast, setRadioToast] = useState<string | null>(null);

  const fetchFleetData = async () => {
    try {
      const [fleetRes, statsRes, geoRes] = await Promise.all([
        fetch('/api/org/fleet').then((r) => r.json()),
        fetch('/api/org/stats').then((r) => r.json()),
        fetch('/api/org/geofences').then((r) => r.json()),
      ]);
      if (fleetRes.trucks) setFleet(fleetRes.trucks);
      if (statsRes) setStats(statsRes);
      if (geoRes.geofences) setGeofences(geoRes.geofences);
    } catch (e) {
      console.error('Failed to load fleet data:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFleetData();
    const interval = setInterval(fetchFleetData, 15000); // Polling telemetry updates
    return () => clearInterval(interval);
  }, []);

  const selectedTruck = useMemo(() => {
    return fleet.find((t) => t.id === selectedTruckId) || fleet[0] || null;
  }, [fleet, selectedTruckId]);

  const filteredTrucks = useMemo(() => {
    return fleet.filter((truck) => {
      const matchesStatus = statusFilter === 'all' || truck.status === statusFilter;
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        truck.plateNumber.toLowerCase().includes(q) ||
        truck.model.toLowerCase().includes(q) ||
        truck.driver.name.toLowerCase().includes(q) ||
        truck.cargo.title.toLowerCase().includes(q) ||
        truck.route.destination.toLowerCase().includes(q) ||
        truck.route.origin.toLowerCase().includes(q);
      return matchesStatus && matchesSearch;
    });
  }, [fleet, statusFilter, searchQuery]);

  const handleUpdateTruckStatus = async (truckId: string, newStatus: string) => {
    try {
      await fetch(`/api/org/trucks/${truckId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus, note: `Dispatcher manual status change to ${newStatus}` }),
      });
      fetchFleetData();
    } catch (err) {
      console.error(err);
    }
  };

  const triggerRadio = (driverName: string, channel: string) => {
    setRadioToast(`Connecting VHF Radio to ${driverName} on Channel ${channel}...`);
    setTimeout(() => {
      setRadioToast(`📻 Radio connected to ${driverName}. Audio channel active.`);
      setTimeout(() => setRadioToast(null), 4000);
    }, 1500);
  };

  return (
    <Shell org hideHeaderOnDesktop>
      {/* Top Banner / Breadcrumb & Quick Actions */}
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2.5 rounded-xl border border-[#d6ded4] bg-[#f8f5ea] px-4 py-2.5 shadow-2xs">
        <div className="flex items-center gap-3">
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-[#2d6b60] text-[#f6f1df] shadow-sm">
            <Truck size={17} />
          </span>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-display text-base font-bold tracking-[-0.02em] text-[#172a3a]">
                Apex Freight & Logistics Fleet Hub
              </h1>
              <span className="inline-flex items-center gap-1 rounded-full bg-[#22c55e]/15 px-2 py-0.5 font-mono-map text-[10px] font-bold text-[#166534]">
                <span className="h-1.5 w-1.5 rounded-full bg-[#22c55e] animate-pulse"></span>
                LIVE RADAR
              </span>
            </div>
            <p className="text-[11px] text-[#708079]">
              Commercial Corridor: Boisar MIDC &bull; Thane &bull; Bhiwandi &bull; Mumbai &bull; JNPT Port
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => fetchFleetData()}
            className="inline-flex items-center gap-1.5 rounded-lg border border-[#c4d0c6] bg-[#fffdf4] px-2.5 py-1.5 text-xs font-bold text-[#2d6b60] transition hover:bg-[#edf3ed]"
            title="Refresh fleet telemetry"
          >
            <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
            <span className="hidden sm:inline">Refresh</span>
          </button>
          <button
            onClick={() => setShowDispatchModal(true)}
            className="inline-flex items-center gap-1.5 rounded-lg bg-[#f1c744] px-3 py-1.5 text-xs font-bold text-[#172a3a] shadow-2xs transition hover:bg-[#f5d664]"
          >
            <Plus size={14} />
            <span>New Dispatch</span>
          </button>
        </div>
      </div>

      {/* Radio Toast Alert */}
      {radioToast && (
        <div className="mb-3 flex items-center justify-between rounded-lg border border-[#f1c744] bg-[#172a3a] px-4 py-2 text-xs font-semibold text-[#f1c744] shadow-md animate-in fade-in slide-in-from-top-2">
          <div className="flex items-center gap-2">
            <Radio size={16} className="animate-pulse text-[#22c55e]" />
            <span>{radioToast}</span>
          </div>
          <button onClick={() => setRadioToast(null)} className="text-[#a9c4ba] hover:text-[#fff]">
            <X size={14} />
          </button>
        </div>
      )}

      {/* Main Subviews Switch */}
      {view === 'fleet' && (
        <FleetRadarView
          trucks={filteredTrucks}
          allTrucks={fleet}
          selectedTruck={selectedTruck}
          onSelectTruck={(t) => setSelectedTruckId(t.id)}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          statusFilter={statusFilter}
          onStatusChange={setStatusFilter}
          onUpdateStatus={handleUpdateTruckStatus}
          onTriggerRadio={triggerRadio}
        />
      )}

      {view === 'overview' && (
        <FleetOverviewView
          stats={stats}
          trucks={fleet}
          onSelectTruck={(id) => {
            setSelectedTruckId(id);
            setLocation('/org/fleet');
          }}
          onOpenDispatch={() => setShowDispatchModal(true)}
        />
      )}

      {view === 'routes' && (
        <FleetRoutesView
          trucks={fleet}
          onSelectTruck={(id) => {
            setSelectedTruckId(id);
            setLocation('/org/fleet');
          }}
          onOpenDispatch={() => setShowDispatchModal(true)}
        />
      )}

      {view === 'drivers' && (
        <FleetDriversView
          trucks={fleet}
          onTriggerRadio={triggerRadio}
          onSelectTruck={(id) => {
            setSelectedTruckId(id);
            setLocation('/org/fleet');
          }}
        />
      )}

      {view === 'geofences' && (
        <FleetGeofencesView geofences={geofences} trucks={fleet} />
      )}

      {view === 'maintenance' && (
        <FleetMaintenanceView trucks={fleet} onUpdateStatus={handleUpdateTruckStatus} />
      )}

      {/* Dispatch Modal */}
      {showDispatchModal && (
        <DispatchModal
          onClose={() => setShowDispatchModal(false)}
          onSuccess={() => {
            setShowDispatchModal(false);
            fetchFleetData();
          }}
        />
      )}
    </Shell>
  );
}

// ==========================================
// 1. FLEET RADAR & LIVE TRACKING VIEW
// ==========================================
function FleetRadarView({
  trucks,
  allTrucks,
  selectedTruck,
  onSelectTruck,
  searchQuery,
  onSearchChange,
  statusFilter,
  onStatusChange,
  onUpdateStatus,
  onTriggerRadio,
}: {
  trucks: TruckData[];
  allTrucks: TruckData[];
  selectedTruck: TruckData | null;
  onSelectTruck: (t: TruckData) => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  statusFilter: string;
  onStatusChange: (s: string) => void;
  onUpdateStatus: (id: string, s: string) => void;
  onTriggerRadio: (driver: string, ch: string) => void;
}) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const markersRef = useRef<{ [key: string]: maplibregl.Marker }>({});
  const [activeLayer, setActiveLayer] = useState<TileLayerKey>('mapveri');
  const [showLayerMenu, setShowLayerMenu] = useState(false);
  const [hoveredDistrict, setHoveredDistrict] = useState<{ district: string; st_nm: string; dt_code: string } | null>(null);
  const [isMapReady, setIsMapReady] = useState(false);

  // Safe route corridor rendering - protects against 'Style is not done loading'
  const renderRoute = useCallback(() => {
    const map = mapRef.current;
    if (!map || !selectedTruck) return;

    // Check if style is loaded before adding/modifying sources or layers
    if (!map.isStyleLoaded()) {
      return;
    }

    try {
      const routeSourceId = 'active-truck-route';
      const routeCoords = [
        [selectedTruck.route.originLng, selectedTruck.route.originLat],
        ...selectedTruck.route.waypoints.map((w) => [w.lng, w.lat]),
        [selectedTruck.lng, selectedTruck.lat],
        [selectedTruck.route.destLng, selectedTruck.route.destLat],
      ];

      const geojsonData = {
        type: 'Feature' as const,
        properties: {},
        geometry: {
          type: 'LineString' as const,
          coordinates: routeCoords,
        },
      };

      const existingSource = map.getSource(routeSourceId) as maplibregl.GeoJSONSource | undefined;
      if (existingSource && typeof existingSource.setData === 'function') {
        existingSource.setData(geojsonData);
      } else {
        if (map.getLayer('truck-route-line')) map.removeLayer('truck-route-line');
        if (map.getLayer('truck-route-line-casing')) map.removeLayer('truck-route-line-casing');
        if (map.getSource(routeSourceId)) map.removeSource(routeSourceId);

        map.addSource(routeSourceId, {
          type: 'geojson',
          data: geojsonData,
        });

        if (!map.getLayer('truck-route-line-casing')) {
          map.addLayer({
            id: 'truck-route-line-casing',
            type: 'line',
            source: routeSourceId,
            layout: { 'line-join': 'round', 'line-cap': 'round' },
            paint: {
              'line-color': '#172a3a',
              'line-width': 6,
              'line-opacity': 0.75,
            },
          });
        }

        if (!map.getLayer('truck-route-line')) {
          map.addLayer({
            id: 'truck-route-line',
            type: 'line',
            source: routeSourceId,
            layout: { 'line-join': 'round', 'line-cap': 'round' },
            paint: {
              'line-color': '#f1c744',
              'line-width': 3.5,
              'line-dasharray': [2, 1],
            },
          });
        }
      }
    } catch (err) {
      console.warn('Safe catch: Route render prevented style race error:', err);
    }
  }, [selectedTruck]);

  // Initialize MapLibre with the user-designed Mapveri Map style
  useEffect(() => {
    if (!mapContainerRef.current) return;

    const map = new maplibregl.Map({
      container: mapContainerRef.current,
      style: getMapLibreStyle('mapveri'),
      center: selectedTruck ? [selectedTruck.lng, selectedTruck.lat] : [72.85, 19.35],
      zoom: 9.8,
    });

    map.addControl(new maplibregl.NavigationControl({ showCompass: true }), 'top-right');
    mapRef.current = map;

    const handleLoad = () => {
      setIsMapReady(true);
      try {
        map.resize();
      } catch { }
      renderRoute();
    };

    const handleStyleLoad = () => {
      renderRoute();
    };

    map.on('load', handleLoad);
    map.on('style.load', handleStyleLoad);

    // India Maps Data 760 districts hover listener
    const handleMouseMove = (e: maplibregl.MapMouseEvent) => {
      try {
        if (!map.isStyleLoaded() || !map.getLayer('mapveri-india-district-fill')) {
          map.getCanvas().style.cursor = '';
          return;
        }
        const features = map.queryRenderedFeatures(e.point, { layers: ['mapveri-india-district-fill'] });
        if (features && features.length > 0) {
          map.getCanvas().style.cursor = 'pointer';
          const props = features[0].properties as any;
          if (props?.district) {
            setHoveredDistrict({
              district: props.district,
              st_nm: props.st_nm || 'India',
              dt_code: props.dt_code || '',
            });
          }
        } else {
          map.getCanvas().style.cursor = '';
          setHoveredDistrict(null);
        }
      } catch {
        map.getCanvas().style.cursor = '';
      }
    };

    const handleMouseOut = () => {
      map.getCanvas().style.cursor = '';
      setHoveredDistrict(null);
    };

    map.on('mousemove', handleMouseMove);
    map.on('mouseout', handleMouseOut);

    const resizeTimer = setTimeout(() => {
      try {
        map.resize();
      } catch { }
    }, 250);

    return () => {
      clearTimeout(resizeTimer);
      map.off('load', handleLoad);
      map.off('style.load', handleStyleLoad);
      map.off('mousemove', handleMouseMove);
      map.off('mouseout', handleMouseOut);
      map.remove();
      mapRef.current = null;
      setIsMapReady(false);
    };
  }, []);

  // Handle layer style change dynamically
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    try {
      map.setStyle(getMapLibreStyle(activeLayer));
    } catch (err) {
      console.warn('Set style error:', err);
    }
  }, [activeLayer]);

  // Sync Markers on Map
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    // Remove existing markers
    Object.values(markersRef.current).forEach((m) => m.remove());
    markersRef.current = {};

    allTrucks.forEach((truck) => {
      const isSelected = selectedTruck?.id === truck.id;
      const el = document.createElement('div');
      el.className = 'cursor-pointer group select-none transition-transform duration-200';

      const statusColor =
        truck.status === 'in_transit'
          ? '#22c55e'
          : truck.status === 'loading'
          ? '#eab308'
          : truck.status === 'idling'
          ? '#3b82f6'
          : '#ef4444';

      el.innerHTML = `
        <div class="relative flex flex-col items-center">
          <div class="rounded-full p-2 text-white shadow-xl flex items-center justify-center transition-all ${
            isSelected
              ? 'ring-4 ring-[#f1c744] scale-125 z-30'
              : 'hover:scale-110 z-10'
          }" style="background-color: #172a3a; border: 2px solid ${statusColor};">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="${statusColor}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="transform: rotate(${truck.heading}deg);">
              <path d="M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2"/>
              <path d="M15 18H9"/>
              <path d="M19 18h2a1 1 0 0 0 1-1v-3.65a1 1 0 0 0-.22-.624l-3.48-4.35A1 1 0 0 0 17.52 8H14"/>
              <circle cx="17" cy="18" r="2"/>
              <circle cx="7" cy="18" r="2"/>
            </svg>
            ${
              truck.status === 'in_transit'
                ? `<span class="absolute -top-1 -right-1 flex h-2.5 w-2.5">
                     <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#22c55e] opacity-75"></span>
                     <span class="relative inline-flex rounded-full h-2.5 w-2.5 bg-[#22c55e]"></span>
                   </span>`
                : ''
            }
          </div>
          <div class="mt-1 flex items-center gap-1 rounded bg-[#172a3a]/90 px-1.5 py-0.5 text-[9px] font-mono font-bold text-white shadow backdrop-blur">
            <span>${truck.id}</span>
            <span style="color: ${statusColor};">&bull;</span>
            <span>${truck.speedKmh}k</span>
          </div>
        </div>
      `;

      el.addEventListener('click', () => {
        onSelectTruck(truck);
      });

      const marker = new maplibregl.Marker({ element: el })
        .setLngLat([truck.lng, truck.lat])
        .addTo(map);

      markersRef.current[truck.id] = marker;
    });
  }, [allTrucks, selectedTruck, onSelectTruck]);

  // Fly to selected truck and safely render route corridor
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !selectedTruck) return;

    try {
      map.flyTo({
        center: [selectedTruck.lng, selectedTruck.lat],
        zoom: 11.5,
        speed: 1.2,
        curve: 1.4,
      });
    } catch { }

    if (map.isStyleLoaded()) {
      renderRoute();
    } else {
      map.once('load', renderRoute);
      map.once('style.load', renderRoute);
    }
  }, [selectedTruck, isMapReady, renderRoute]);

  const handleFitCorridor = () => {
    const map = mapRef.current;
    if (!map || !selectedTruck) return;
    try {
      const bounds = new maplibregl.LngLatBounds();
      bounds.extend([selectedTruck.route.originLng, selectedTruck.route.originLat]);
      bounds.extend([selectedTruck.route.destLng, selectedTruck.route.destLat]);
      bounds.extend([selectedTruck.lng, selectedTruck.lat]);
      selectedTruck.route.waypoints.forEach((w) => bounds.extend([w.lng, w.lat]));
      map.fitBounds(bounds, { padding: 60, maxZoom: 13, duration: 1000 });
    } catch { }
  };

  const statusCounts = useMemo(() => {
    return {
      all: allTrucks.length,
      in_transit: allTrucks.filter((t) => t.status === 'in_transit').length,
      loading: allTrucks.filter((t) => t.status === 'loading').length,
      idling: allTrucks.filter((t) => t.status === 'idling').length,
      maintenance: allTrucks.filter((t) => t.status === 'maintenance').length,
    };
  }, [allTrucks]);

  return (
    <div className="flex-1 grid gap-3 lg:grid-cols-[340px_1fr] min-h-0">
      {/* Left Column: Fleet List & Search */}
      <div className="flex flex-col rounded-xl border border-[#d6ded4] bg-[#f8f5ea] p-3 shadow-2xs h-full min-h-0 overflow-hidden">
        {/* Search */}
        <div className="relative mb-2.5">
          <Search size={14} className="absolute left-2.5 top-2.5 text-[#708079]" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search truck, driver, manifest, route..."
            className="w-full rounded-lg border border-[#c4d0c6] bg-[#fffdf4] py-1.5 pl-8 pr-3 text-xs outline-none focus:border-[#2d6b60]"
          />
        </div>

        {/* Filter Pills */}
        <div className="mb-2.5 flex flex-wrap gap-1 border-b border-[#e5ebe3] pb-2.5">
          {[
            { id: 'all', label: 'All', count: statusCounts.all },
            { id: 'in_transit', label: 'In Transit', count: statusCounts.in_transit, color: 'text-green-700' },
            { id: 'loading', label: 'Loading', count: statusCounts.loading, color: 'text-amber-700' },
            { id: 'idling', label: 'Idling', count: statusCounts.idling, color: 'text-blue-700' },
            { id: 'maintenance', label: 'Maint.', count: statusCounts.maintenance, color: 'text-red-700' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => onStatusChange(tab.id)}
              className={`rounded-md px-2 py-1 text-[11px] font-bold transition flex items-center gap-1 ${
                statusFilter === tab.id
                  ? 'bg-[#172a3a] text-[#f6f1df]'
                  : 'bg-[#fffdf4] text-[#60716d] hover:bg-[#eae8dc] border border-[#d6ded4]'
              }`}
            >
              <span>{tab.label}</span>
              <span className="font-mono-map text-[9px] opacity-80">({tab.count})</span>
            </button>
          ))}
        </div>

        {/* Truck List Scrollable */}
        <div className="flex-1 overflow-y-auto space-y-2 pr-0.5">
          {trucks.length === 0 ? (
            <EmptyState title="No trucks matched" description="Try clearing filters or changing your search phrase." />
          ) : (
            trucks.map((truck) => {
              const isSelected = selectedTruck?.id === truck.id;
              const statusPill =
                truck.status === 'in_transit'
                  ? 'bg-[#daf0e3] text-[#166534] border-[#a8d9bf]'
                  : truck.status === 'loading'
                  ? 'bg-[#fef3c7] text-[#854d0e] border-[#f5db7b]'
                  : truck.status === 'idling'
                  ? 'bg-[#e0f2fe] text-[#075985] border-[#bae6fd]'
                  : 'bg-[#fee2e2] text-[#991b1b] border-[#fecaca]';

              return (
                <div
                  key={truck.id}
                  onClick={() => onSelectTruck(truck)}
                  className={`cursor-pointer rounded-xl border p-2.5 transition text-left ${
                    isSelected
                      ? 'border-[#2d6b60] bg-[#eef5f0] shadow-sm ring-1 ring-[#2d6b60]'
                      : 'border-[#d6ded4] bg-[#fffdf4] hover:bg-[#f3efe2]'
                  }`}
                >
                  <div className="flex items-start justify-between gap-1.5">
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono-map text-xs font-bold text-[#172a3a]">{truck.id}</span>
                        <span className="text-[11px] font-mono-map text-[#708079]">({truck.plateNumber})</span>
                      </div>
                      <p className="text-[11px] font-medium text-[#2d6b60] truncate max-w-[190px]">{truck.model}</p>
                    </div>
                    <span className={`shrink-0 rounded-full border px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider ${statusPill}`}>
                      {truck.status.replace('_', ' ')}
                    </span>
                  </div>

                  {/* Route & Driver */}
                  <div className="mt-2 text-[11px] text-[#556963]">
                    <div className="flex items-center gap-1 truncate font-semibold text-[#172a3a]">
                      <span>{truck.route.origin.split(' ')[0]}</span>
                      <ArrowRight size={10} className="text-[#8eaaa2]" />
                      <span>{truck.route.destination.split(' ')[0]}</span>
                    </div>
                    <p className="text-[10px] text-[#708079] truncate mt-0.5">
                      Driver: {truck.driver.name} &bull; {truck.cargo.weightTons}T {truck.cargo.category}
                    </p>
                  </div>

                  {/* Telemetry bar */}
                  <div className="mt-2.5 flex items-center justify-between border-t border-[#e2e6de] pt-1.5 text-[10px] font-mono-map text-[#60716d]">
                    <span className="flex items-center gap-1">
                      <Gauge size={11} className="text-[#2d6b60]" />
                      {truck.speedKmh} km/h
                    </span>
                    <span className="flex items-center gap-1">
                      <Fuel size={11} className={truck.fuelPct < 25 ? 'text-red-500' : 'text-[#854d0e]'} />
                      {truck.fuelPct}%
                    </span>
                    <span className="text-[#2d6b60] font-bold">ETA: {truck.route.etaTime}</span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Right Column: Map & Telematics Drawer */}
      <div className="relative flex flex-col rounded-xl border border-[#d6ded4] bg-[#f8f5ea] shadow-2xs overflow-hidden h-full min-h-[500px]">
        {/* Floating Top Overlays */}
        <div className="absolute top-2.5 left-2.5 z-20 flex flex-wrap items-center gap-2 pointer-events-auto">
          {/* Layer Selector */}
          <div className="relative">
            <button
              onClick={() => setShowLayerMenu((prev) => !prev)}
              className="flex items-center gap-1.5 rounded-lg border border-[#c4d0c6] bg-[#fffdf4]/95 px-2.5 py-1.5 text-xs font-bold text-[#172a3a] shadow-sm backdrop-blur hover:bg-[#fff]"
              title="Select map style"
            >
              <Layers size={14} className="text-[#2d6b60]" />
              <span>{TILE_LAYERS[activeLayer]?.shortName || 'Mapveri Map'}</span>
              {activeLayer === 'mapveri' && (
                <span className="rounded bg-[#f1c744]/40 px-1 py-0.2 text-[9px] font-bold text-[#806414] border border-[#f1c744]/60">
                  MAPVERI
                </span>
              )}
            </button>

            {showLayerMenu && (
              <div className="absolute left-0 top-full mt-1.5 w-72 rounded-xl border border-[#d6ded4] bg-[#fffdf9] p-1.5 shadow-xl backdrop-blur-md z-30">
                <div className="px-2 py-1 text-[10px] font-mono-map uppercase tracking-wider text-[#708079]">
                  Select Map Style
                </div>
                {(Object.keys(TILE_LAYERS) as TileLayerKey[]).map((key) => {
                  const info = TILE_LAYERS[key];
                  const isSelected = activeLayer === key;
                  return (
                    <button
                      key={key}
                      onClick={() => {
                        setActiveLayer(key);
                        setShowLayerMenu(false);
                      }}
                      className={`w-full rounded-lg px-2.5 py-2 text-left text-xs transition flex flex-col gap-0.5 ${
                        isSelected
                          ? 'bg-[#2d6b60] text-white'
                          : 'text-[#172a3a] hover:bg-[#f0ece0]'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold">{info.name}</span>
                        {key === 'mapveri' && (
                          <span className={`text-[9px] px-1 rounded font-bold ${isSelected ? 'bg-white/20 text-[#f1c744]' : 'bg-[#f1c744]/20 text-[#806414]'}`}>
                            Custom Design
                          </span>
                        )}
                      </div>
                      <span className={`text-[10px] leading-tight ${isSelected ? 'text-white/80' : 'text-[#708079]'}`}>
                        {info.description}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* District Hover Badge */}
          {hoveredDistrict && (
            <div className="flex items-center gap-1.5 rounded-lg border border-[#3b82f6]/40 bg-[#eff6ff]/95 px-2.5 py-1.5 text-xs font-semibold text-[#1d4ed8] shadow-sm backdrop-blur animate-in fade-in">
              <span>🇮🇳</span>
              <span>{hoveredDistrict.district} District</span>
              <span className="text-[10px] opacity-75 font-normal">({hoveredDistrict.st_nm})</span>
            </div>
          )}

          {/* Fit Corridor Button */}
          {selectedTruck && (
            <button
              onClick={handleFitCorridor}
              className="flex items-center gap-1.5 rounded-lg border border-[#c4d0c6] bg-[#fffdf4]/95 px-2.5 py-1.5 text-xs font-semibold text-[#2d6b60] shadow-sm backdrop-blur hover:bg-[#fff]"
              title="Fit entire corridor into map view"
            >
              <Maximize2 size={13} />
              <span className="hidden sm:inline">Fit Route Corridor</span>
            </button>
          )}
        </div>

        {/* Map Canvas */}
        <div ref={mapContainerRef} className="h-full w-full flex-1" />

        {/* Selected Truck Telematics & Diagnostics Drawer (Bottom overlay) */}
        {selectedTruck && (
          <div className="border-t border-[#d6ded4] bg-[#fffdf9]/95 p-3.5 backdrop-blur-md transition-all">
            <div className="grid gap-3 md:grid-cols-[1.2fr_1fr_1fr]">
              {/* Box 1: Truck Identity & Driver */}
              <div className="rounded-lg border border-[#d8e2d9] bg-[#f8f5ea] p-2.5">
                <div className="flex items-start justify-between">
                  <div>
                    <span className="font-mono-map text-[9px] uppercase tracking-[.18em] text-[#2d6b60]">Active Vehicle</span>
                    <h3 className="font-display text-sm font-bold text-[#172a3a]">
                      {selectedTruck.model} &bull; {selectedTruck.plateNumber}
                    </h3>
                  </div>
                  <span className="rounded bg-[#172a3a] px-2 py-0.5 font-mono-map text-[10px] font-bold text-[#f1c744]">
                    {selectedTruck.id}
                  </span>
                </div>

                <div className="mt-2 flex items-center gap-2.5">
                  <Avatar name={selectedTruck.driver.name} size="md" />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold text-[#172a3a]">{selectedTruck.driver.name}</p>
                    <p className="text-[10px] text-[#708079]">
                      CDL: {selectedTruck.driver.license} &bull; Rating: {selectedTruck.driver.rating} ⭐
                    </p>
                    <p className="text-[10px] text-[#2d6b60] font-semibold">
                      HOS Duty: {selectedTruck.driver.dutyHoursToday} (Compliant)
                    </p>
                  </div>
                </div>

                <div className="mt-2 flex items-center gap-2">
                  <button
                    onClick={() => onTriggerRadio(selectedTruck.driver.name, '04')}
                    className="inline-flex items-center gap-1 rounded bg-[#2d6b60] px-2 py-1 text-[11px] font-bold text-[#f8f4e7] hover:bg-[#20574e] transition"
                  >
                    <Radio size={12} /> Radio Driver
                  </button>
                  <a
                    href={`tel:${selectedTruck.driver.phone}`}
                    className="inline-flex items-center gap-1 rounded border border-[#c4d0c6] bg-[#fff] px-2 py-1 text-[11px] font-bold text-[#172a3a] hover:bg-[#f0eee4] transition"
                  >
                    <Phone size={12} /> Call Phone
                  </a>
                </div>
              </div>

              {/* Box 2: Telemetry & Cargo */}
              <div className="rounded-lg border border-[#d8e2d9] bg-[#f8f5ea] p-2.5">
                <span className="font-mono-map text-[9px] uppercase tracking-[.18em] text-[#806414]">Live Telemetry</span>
                <div className="mt-1.5 grid grid-cols-2 gap-1.5 text-xs font-mono-map">
                  <div className="rounded bg-[#fffdf4] p-1.5 border border-[#e5ebe3]">
                    <span className="text-[10px] text-[#708079] block">Speed</span>
                    <span className="text-sm font-bold text-[#172a3a]">{selectedTruck.speedKmh} km/h</span>
                  </div>
                  <div className="rounded bg-[#fffdf4] p-1.5 border border-[#e5ebe3]">
                    <span className="text-[10px] text-[#708079] block">Fuel Tank</span>
                    <span className="text-sm font-bold text-[#854d0e]">{selectedTruck.fuelPct}%</span>
                  </div>
                  <div className="rounded bg-[#fffdf4] p-1.5 border border-[#e5ebe3]">
                    <span className="text-[10px] text-[#708079] block">Engine Temp</span>
                    <span className="text-xs font-bold text-[#172a3a]">{selectedTruck.engineTempC} °C</span>
                  </div>
                  <div className="rounded bg-[#fffdf4] p-1.5 border border-[#e5ebe3]">
                    <span className="text-[10px] text-[#708079] block">Tire TPMS</span>
                    <span className="text-xs font-bold text-[#166534]">{selectedTruck.tirePressurePsi} PSI OK</span>
                  </div>
                </div>

                <div className="mt-2 text-[11px] border-t border-[#e5ebe3] pt-1.5">
                  <p className="font-bold text-[#172a3a] truncate">{selectedTruck.cargo.title}</p>
                  <p className="text-[10px] text-[#708079]">
                    Weight: {selectedTruck.cargo.weightTons}T &bull; Client: {selectedTruck.cargo.client}
                    {selectedTruck.cargo.isTempControlled && (
                      <span className="ml-1 text-[#2d6b60] font-bold">({selectedTruck.cargo.tempCelsius}°C Cold Chain)</span>
                    )}
                  </p>
                </div>
              </div>

              {/* Box 3: Route Corridor & Dispatch Quick Actions */}
              <div className="rounded-lg border border-[#d8e2d9] bg-[#f8f5ea] p-2.5 flex flex-col justify-between">
                <div>
                  <span className="font-mono-map text-[9px] uppercase tracking-[.18em] text-[#2d6b60]">Route Corridor</span>
                  <p className="mt-1 text-xs font-bold text-[#172a3a] leading-tight">
                    {selectedTruck.route.origin} &rarr; {selectedTruck.route.destination}
                  </p>
                  <div className="mt-1.5 flex items-center justify-between text-[10px] font-mono-map text-[#60716d]">
                    <span>Remaining: {selectedTruck.route.distanceRemainingKm} km</span>
                    <span className="font-bold text-[#2d6b60]">ETA: {selectedTruck.route.etaTime}</span>
                  </div>
                  {/* Route Progress bar */}
                  <div className="mt-1 h-1.5 w-full rounded-full bg-[#dbe5dc] overflow-hidden">
                    <div className="h-full bg-[#2d6b60] rounded-full" style={{ width: `${selectedTruck.route.progressPct}%` }} />
                  </div>
                </div>

                {/* Dispatch Status Override Buttons */}
                <div className="mt-2 border-t border-[#e5ebe3] pt-1.5 flex flex-wrap gap-1">
                  <span className="text-[9px] font-mono-map text-[#708079] w-full">Set Vehicle Status:</span>
                  {(['in_transit', 'loading', 'idling', 'delivered', 'maintenance'] as const).map((st) => (
                    <button
                      key={st}
                      onClick={() => onUpdateStatus(selectedTruck.id, st)}
                      className={`rounded px-1.5 py-0.5 text-[9px] font-bold uppercase transition ${
                        selectedTruck.status === st
                          ? 'bg-[#172a3a] text-[#f1c744]'
                          : 'bg-[#fffdf4] text-[#60716d] hover:bg-[#eae8dc] border border-[#d6ded4]'
                      }`}
                    >
                      {st.replace('_', ' ')}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ==========================================
// 2. FLEET OPERATIONS OVERVIEW
// ==========================================
function FleetOverviewView({
  stats,
  trucks,
  onSelectTruck,
  onOpenDispatch,
}: {
  stats: OrgStats | null;
  trucks: TruckData[];
  onSelectTruck: (id: string) => void;
  onOpenDispatch: () => void;
}) {
  return (
    <div className="fade-up space-y-4">
      {/* KPI Cards */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-[#d6ded4] bg-[#f8f5ea] p-3.5 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-[#e2eee6] text-[#2d6b60]">
              <Truck size={17} />
            </span>
            <span className="font-mono-map text-[9px] uppercase tracking-wider text-[#8c9a91]">Fleet Total</span>
          </div>
          <p className="mt-3 font-mono-map text-[9px] uppercase tracking-[.16em] text-[#708079]">Total Trucks</p>
          <p className="mt-0.5 font-display text-2xl font-bold tracking-tight text-[#172a3a]">
            {stats?.totalTrucks ?? trucks.length}
          </p>
          <p className="mt-0.5 text-xs text-[#708079]">
            {stats?.activeOnRoad ?? 4} Active on road &bull; {stats?.loadingCount ?? 1} Loading
          </p>
        </div>

        <div className="rounded-xl border border-[#d6ded4] bg-[#f8f5ea] p-3.5 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-[#fef3c7] text-[#806414]">
              <Gauge size={17} />
            </span>
            <span className="font-mono-map text-[9px] uppercase tracking-wider text-[#8c9a91]">Haulage</span>
          </div>
          <p className="mt-3 font-mono-map text-[9px] uppercase tracking-[.16em] text-[#708079]">Tonnage In Transit</p>
          <p className="mt-0.5 font-display text-2xl font-bold tracking-tight text-[#172a3a]">
            {stats?.totalTonsInTransit ?? '124.1'} <span className="text-sm font-normal text-[#708079]">Tons</span>
          </p>
          <p className="mt-0.5 text-xs text-[#708079]">Across Western Freight Corridor</p>
        </div>

        <div className="rounded-xl border border-[#d6ded4] bg-[#f8f5ea] p-3.5 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-[#daf0e3] text-[#166534]">
              <ShieldCheck size={17} />
            </span>
            <span className="font-mono-map text-[9px] uppercase tracking-wider text-[#8c9a91]">SLA Rating</span>
          </div>
          <p className="mt-3 font-mono-map text-[9px] uppercase tracking-[.16em] text-[#708079]">On-Time Delivery Rate</p>
          <p className="mt-0.5 font-display text-2xl font-bold tracking-tight text-[#166534]">
            {stats?.onTimeDeliveryRate ?? 97.4}%
          </p>
          <p className="mt-0.5 text-xs text-[#708079]">Zero cargo damage claims this week</p>
        </div>

        <div className="rounded-xl border border-[#d6ded4] bg-[#f8f5ea] p-3.5 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-[#e0f2fe] text-[#075985]">
              <Fuel size={17} />
            </span>
            <span className="font-mono-map text-[9px] uppercase tracking-wider text-[#8c9a91]">Economy</span>
          </div>
          <p className="mt-3 font-mono-map text-[9px] uppercase tracking-[.16em] text-[#708079]">Fuel Efficiency</p>
          <p className="mt-0.5 font-display text-2xl font-bold tracking-tight text-[#172a3a]">
            {stats?.averageFuelEconomyKmpl ?? '4.25'} <span className="text-sm font-normal text-[#708079]">km/L</span>
          </p>
          <p className="mt-0.5 text-xs text-[#708079]">BS-VI Clean Diesel Fleet Average</p>
        </div>
      </div>

      {/* Grid: Active Fleet Table & Logistics Corridors */}
      <div className="grid gap-4 lg:grid-cols-[1.3fr_0.7fr]">
        {/* Active Hauls */}
        <section className="rounded-xl border border-[#d6ded4] bg-[#f8f5ea] p-4 shadow-2xs">
          <div className="flex items-center justify-between border-b border-[#e5ebe3] pb-2.5">
            <div>
              <p className="font-mono-map text-[9px] uppercase tracking-[.18em] text-[#2d6b60]">Real-Time Hauls</p>
              <h2 className="font-display text-base font-bold text-[#172a3a]">Live Dispatches on Corridor</h2>
            </div>
            <button onClick={onOpenDispatch} className="text-xs font-bold text-[#2d6b60] hover:underline">
              + New Haul
            </button>
          </div>

          <div className="mt-3 divide-y divide-[#e2e6de]">
            {trucks.map((truck) => (
              <div
                key={truck.id}
                onClick={() => onSelectTruck(truck.id)}
                className="flex items-center justify-between py-2.5 cursor-pointer hover:bg-[#fffdf4] px-2 rounded-lg transition"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-[#172a3a] text-[#f1c744] font-mono-map text-xs font-bold">
                    {truck.id.split('-')[1]}
                  </span>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-[#172a3a] truncate">
                      {truck.plateNumber} &bull; {truck.model}
                    </p>
                    <p className="text-[11px] text-[#708079] truncate">
                      {truck.route.origin} &rarr; {truck.route.destination}
                    </p>
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <span className="font-mono-map text-xs font-bold text-[#2d6b60]">ETA {truck.route.etaTime}</span>
                  <p className="text-[10px] text-[#708079]">{truck.speedKmh} km/h &bull; {truck.cargo.weightTons}T</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Corridor Health & Compliance */}
        <section className="rounded-xl border border-[#d6ded4] bg-[#e5eee6] p-4 shadow-2xs space-y-4">
          <div>
            <p className="font-mono-map text-[9px] uppercase tracking-[.18em] text-[#54796d]">Regulatory & Safety</p>
            <h2 className="font-display text-base font-bold text-[#172a3a]">Driver Duty Hours & Compliance</h2>
          </div>

          <div className="rounded-lg bg-[#fffdf4] p-3 border border-[#c7d8cb] space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-[#172a3a]">HOS Compliance Rate</span>
              <span className="font-mono-map text-xs font-bold text-[#166534]">100% Verified</span>
            </div>
            <div className="h-2 w-full rounded-full bg-[#d0ddd3] overflow-hidden">
              <div className="h-full bg-[#22c55e] w-full" />
            </div>
            <p className="text-[10px] text-[#708079]">All drivers strictly adhere to max 11 continuous driving hours.</p>
          </div>

          <div className="rounded-lg bg-[#fffdf4] p-3 border border-[#c7d8cb] space-y-2">
            <span className="font-mono-map text-[9px] uppercase text-[#708079]">Active Freight Depots</span>
            <ul className="text-xs space-y-1.5 text-[#172a3a]">
              <li className="flex items-center justify-between">
                <span>Boisar MIDC Chemical Hub</span>
                <span className="font-bold text-[#2d6b60]">Depot #1</span>
              </li>
              <li className="flex items-center justify-between">
                <span>Bhiwandi Logistics Park Zone C</span>
                <span className="font-bold text-[#2d6b60]">Depot #2</span>
              </li>
              <li className="flex items-center justify-between">
                <span>Nhava Sheva JNPT Gate 4</span>
                <span className="font-bold text-[#2d6b60]">Container Yard</span>
              </li>
            </ul>
          </div>
        </section>
      </div>
    </div>
  );
}

// ==========================================
// 3. ACTIVE ROUTES & DISPATCH VIEW
// ==========================================
function FleetRoutesView({
  trucks,
  onSelectTruck,
  onOpenDispatch,
}: {
  trucks: TruckData[];
  onSelectTruck: (id: string) => void;
  onOpenDispatch: () => void;
}) {
  return (
    <div className="fade-up space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display text-xl font-bold text-[#172a3a]">Active Haul Routes & Manifests</h2>
          <p className="text-xs text-[#708079]">View all origin-to-destination corridor shipments and checkpoints.</p>
        </div>
        <button
          onClick={onOpenDispatch}
          className="inline-flex items-center gap-1.5 rounded-lg bg-[#f1c744] px-3.5 py-2 text-xs font-bold text-[#172a3a] shadow-2xs hover:bg-[#f5d664]"
        >
          <Plus size={15} /> Create Dispatch Manifest
        </button>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        {trucks.map((truck) => (
          <div
            key={truck.id}
            className="rounded-xl border border-[#d6ded4] bg-[#f8f5ea] p-4 shadow-2xs space-y-3"
          >
            <div className="flex items-start justify-between">
              <div>
                <span className="font-mono-map text-[9px] uppercase tracking-wider text-[#2d6b60]">
                  Manifest #{truck.cargo.manifestId}
                </span>
                <h3 className="font-display text-base font-bold text-[#172a3a]">{truck.cargo.title}</h3>
                <p className="text-xs text-[#708079]">Client: {truck.cargo.client}</p>
              </div>
              <span className="rounded bg-[#172a3a] px-2 py-0.5 font-mono-map text-xs font-bold text-[#f1c744]">
                {truck.id}
              </span>
            </div>

            {/* Waypoints line */}
            <div className="rounded-lg bg-[#fffdf4] p-3 border border-[#e5ebe3] space-y-2">
              <div className="flex items-center justify-between text-xs font-semibold text-[#172a3a]">
                <span className="flex items-center gap-1 text-[#2d6b60]">
                  <MapPinned size={14} /> {truck.route.origin}
                </span>
                <span className="text-[#8c9a91]">&rarr;</span>
                <span className="flex items-center gap-1 text-[#806414]">
                  <MapPinned size={14} /> {truck.route.destination}
                </span>
              </div>

              <div className="h-1.5 w-full rounded-full bg-[#d0ddd3] overflow-hidden">
                <div className="h-full bg-[#2d6b60] rounded-full" style={{ width: `${truck.route.progressPct}%` }} />
              </div>

              <div className="flex items-center justify-between text-[11px] font-mono-map text-[#708079]">
                <span>Progress: {truck.route.progressPct}%</span>
                <span>Remaining: {truck.route.distanceRemainingKm} km</span>
                <span className="font-bold text-[#2d6b60]">ETA {truck.route.etaTime}</span>
              </div>
            </div>

            <div className="flex items-center justify-between pt-1 border-t border-[#e2e6de] text-xs">
              <span className="text-[#60716d]">
                Assigned: <strong className="text-[#172a3a]">{truck.driver.name}</strong> ({truck.plateNumber})
              </span>
              <button
                onClick={() => onSelectTruck(truck.id)}
                className="font-bold text-[#2d6b60] hover:underline flex items-center gap-1"
              >
                Track live on map &rarr;
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ==========================================
// 4. DRIVERS & CREW DIRECTORY
// ==========================================
function FleetDriversView({
  trucks,
  onTriggerRadio,
  onSelectTruck,
}: {
  trucks: TruckData[];
  onTriggerRadio: (driver: string, ch: string) => void;
  onSelectTruck: (id: string) => void;
}) {
  return (
    <div className="fade-up space-y-4">
      <div>
        <h2 className="font-display text-xl font-bold text-[#172a3a]">Driver Roster & Crew Telematics</h2>
        <p className="text-xs text-[#708079]">Commercial driving licenses, safety scores, and hours of service tracking.</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {trucks.map((truck) => (
          <div key={truck.driver.id} className="rounded-xl border border-[#d6ded4] bg-[#f8f5ea] p-3.5 shadow-2xs space-y-3">
            <div className="flex items-center gap-3">
              <Avatar name={truck.driver.name} size="lg" />
              <div className="min-w-0 flex-1">
                <h3 className="font-display text-sm font-bold text-[#172a3a] truncate">{truck.driver.name}</h3>
                <p className="text-[11px] text-[#708079]">Exp: {truck.driver.experience} &bull; Rating: {truck.driver.rating} ⭐</p>
                <p className="text-[10px] font-mono-map text-[#2d6b60]">CDL: {truck.driver.license}</p>
              </div>
            </div>

            <div className="rounded-lg bg-[#fffdf4] p-2.5 border border-[#e5ebe3] text-xs space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[#708079]">Safety Score:</span>
                <span className="font-bold text-[#166534] font-mono-map">{truck.driver.safetyScore}/100</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[#708079]">Duty Hours Today:</span>
                <span className="font-bold text-[#172a3a] font-mono-map">{truck.driver.dutyHoursToday}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[#708079]">Current Truck:</span>
                <span className="font-bold text-[#2d6b60]">{truck.id} ({truck.plateNumber})</span>
              </div>
            </div>

            <div className="flex items-center gap-2 pt-1">
              <button
                onClick={() => onTriggerRadio(truck.driver.name, '01')}
                className="flex-1 inline-flex items-center justify-center gap-1 rounded bg-[#2d6b60] py-1.5 text-xs font-bold text-[#fff] hover:bg-[#20574e]"
              >
                <Radio size={13} /> VHF Radio
              </button>
              <button
                onClick={() => onSelectTruck(truck.id)}
                className="flex-1 inline-flex items-center justify-center gap-1 rounded border border-[#c4d0c6] bg-[#fff] py-1.5 text-xs font-bold text-[#172a3a] hover:bg-[#f3efe2]"
              >
                Track Truck
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ==========================================
// 5. GEOFENCES & HUBS VIEW
// ==========================================
function FleetGeofencesView({
  geofences,
  trucks,
}: {
  geofences: Geofence[];
  trucks: TruckData[];
}) {
  return (
    <div className="fade-up space-y-4">
      <div>
        <h2 className="font-display text-xl font-bold text-[#172a3a]">Hubs, Depots & Geofences</h2>
        <p className="text-xs text-[#708079]">Monitored geographical perimeters with automatic arrival & departure logging.</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {geofences.map((gf) => (
          <div key={gf.id} className="rounded-xl border border-[#d6ded4] bg-[#f8f5ea] p-4 shadow-2xs space-y-2.5">
            <div className="flex items-start justify-between">
              <div>
                <span className="rounded bg-[#2d6b60]/10 px-2 py-0.5 font-mono-map text-[9px] font-bold text-[#2d6b60]">
                  {gf.type}
                </span>
                <h3 className="mt-1 font-display text-base font-bold text-[#172a3a]">{gf.name}</h3>
              </div>
              <span className="font-mono-map text-xs font-bold text-[#806414]">{gf.id}</span>
            </div>

            <div className="rounded-lg bg-[#fffdf4] p-2.5 border border-[#e5ebe3] text-xs font-mono-map space-y-1 text-[#60716d]">
              <div className="flex justify-between">
                <span>Coordinates:</span>
                <span className="font-bold text-[#172a3a]">{gf.lat.toFixed(4)}, {gf.lng.toFixed(4)}</span>
              </div>
              <div className="flex justify-between">
                <span>Radius:</span>
                <span className="font-bold text-[#172a3a]">{gf.radiusMeters} meters</span>
              </div>
              <div className="flex justify-between">
                <span>Trucks Inside:</span>
                <span className="font-bold text-[#166534]">{gf.activeTrucksInside} active</span>
              </div>
            </div>

            <p className="text-[11px] text-[#2d6b60] flex items-center gap-1 font-semibold">
              <CheckCircle2 size={13} /> {gf.status}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

// ==========================================
// 6. MAINTENANCE & DIAGNOSTICS VIEW
// ==========================================
function FleetMaintenanceView({
  trucks,
  onUpdateStatus,
}: {
  trucks: TruckData[];
  onUpdateStatus: (id: string, s: string) => void;
}) {
  return (
    <div className="fade-up space-y-4">
      <div>
        <h2 className="font-display text-xl font-bold text-[#172a3a]">Fleet Diagnostics & Preventive Service</h2>
        <p className="text-xs text-[#708079]">Real-time OBD-II sensor diagnostics, brake pad wear, and scheduled oil intervals.</p>
      </div>

      <div className="rounded-xl border border-[#d6ded4] bg-[#f8f5ea] divide-y divide-[#e2e6de]">
        {trucks.map((truck) => (
          <div key={truck.id} className="p-3.5 flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-[#172a3a] text-[#f1c744]">
                <Wrench size={18} />
              </span>
              <div>
                <h3 className="font-display text-sm font-bold text-[#172a3a]">
                  {truck.id} &bull; {truck.plateNumber} ({truck.model})
                </h3>
                <p className="text-[11px] text-[#708079]">
                  Engine Temp: {truck.engineTempC}°C &bull; Battery: {truck.batteryV}V &bull; TPMS: {truck.tirePressurePsi} PSI
                </p>
                {truck.alerts.length > 0 && (
                  <p className="mt-1 text-[11px] text-[#b91c1c] font-medium flex items-center gap-1">
                    <AlertTriangle size={12} /> {truck.alerts[0]}
                  </p>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className={`rounded px-2.5 py-1 text-xs font-bold uppercase font-mono-map ${
                truck.status === 'maintenance' ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'
              }`}>
                {truck.status === 'maintenance' ? 'In Service Bay' : 'Optimal Health'}
              </span>
              <button
                onClick={() => onUpdateStatus(truck.id, truck.status === 'maintenance' ? 'in_transit' : 'maintenance')}
                className="rounded-lg border border-[#c4d0c6] bg-[#fff] px-3 py-1 text-xs font-bold text-[#172a3a] hover:bg-[#f3efe2]"
              >
                {truck.status === 'maintenance' ? 'Clear for Route' : 'Mark for Service'}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ==========================================
// 7. NEW DISPATCH MODAL
// ==========================================
function DispatchModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const [model, setModel] = useState('BharatBenz 2823C (24T Heavy Hauler)');
  const [driverName, setDriverName] = useState('');
  const [driverPhone, setDriverPhone] = useState('');
  const [origin, setOrigin] = useState('Boisar MIDC Chemical Hub');
  const [destination, setDestination] = useState('Nhava Sheva JNPT Container Gate 4');
  const [cargoTitle, setCargoTitle] = useState('');
  const [cargoWeight, setCargoWeight] = useState('18.5');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await fetch('/api/org/dispatch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model,
          driverName: driverName || 'Ramesh Naik',
          driverPhone: driverPhone || '+91 98200 44881',
          origin,
          destination,
          cargoTitle: cargoTitle || 'Commercial Industrial Cargo',
          cargoWeight: Number(cargoWeight) || 16,
          originLat: 19.782073,
          originLng: 72.787496,
          destLat: 18.9501,
          destLng: 72.9525,
        }),
      });
      onSuccess();
    } catch (err) {
      console.error(err);
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-in fade-in">
      <div className="w-full max-w-lg rounded-2xl border border-[#d6ded4] bg-[#f8f5ea] p-5 shadow-2xl">
        <div className="flex items-center justify-between border-b border-[#e5ebe3] pb-3">
          <div className="flex items-center gap-2">
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-[#2d6b60] text-[#fff]">
              <Truck size={17} />
            </span>
            <div>
              <h2 className="font-display text-lg font-bold text-[#172a3a]">Dispatch New Fleet Vehicle</h2>
              <p className="text-[11px] text-[#708079]">Assign driver, cargo manifest, and commercial route.</p>
            </div>
          </div>
          <button onClick={onClose} className="rounded p-1 text-[#708079] hover:bg-[#e8ede7]">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-3">
          <div>
            <label className="block text-xs font-semibold text-[#172a3a] mb-1">Vehicle Model</label>
            <select
              value={model}
              onChange={(e) => setModel(e.target.value)}
              className="w-full rounded-lg border border-[#c4d0c6] bg-[#fff] p-2 text-xs outline-none focus:border-[#2d6b60]"
            >
              <option value="BharatBenz 2823C (24T Heavy Hauler)">BharatBenz 2823C (24T Heavy Hauler)</option>
              <option value="Tata Prima 5530.S Multi-Axle">Tata Prima 5530.S Multi-Axle</option>
              <option value="Volvo FH16 750 Super Hauler">Volvo FH16 750 Super Hauler</option>
              <option value="Ashok Leyland AVTR 3120">Ashok Leyland AVTR 3120</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs font-semibold text-[#172a3a] mb-1">Driver Name</label>
              <input
                type="text"
                required
                value={driverName}
                onChange={(e) => setDriverName(e.target.value)}
                placeholder="e.g. Ramesh Naik"
                className="w-full rounded-lg border border-[#c4d0c6] bg-[#fff] p-2 text-xs outline-none focus:border-[#2d6b60]"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#172a3a] mb-1">Phone Number</label>
              <input
                type="text"
                required
                value={driverPhone}
                onChange={(e) => setDriverPhone(e.target.value)}
                placeholder="+91 98200 44881"
                className="w-full rounded-lg border border-[#c4d0c6] bg-[#fff] p-2 text-xs outline-none focus:border-[#2d6b60]"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs font-semibold text-[#172a3a] mb-1">Origin Hub</label>
              <input
                type="text"
                required
                value={origin}
                onChange={(e) => setOrigin(e.target.value)}
                className="w-full rounded-lg border border-[#c4d0c6] bg-[#fff] p-2 text-xs outline-none focus:border-[#2d6b60]"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#172a3a] mb-1">Destination</label>
              <input
                type="text"
                required
                value={destination}
                onChange={(e) => setDestination(e.target.value)}
                className="w-full rounded-lg border border-[#c4d0c6] bg-[#fff] p-2 text-xs outline-none focus:border-[#2d6b60]"
              />
            </div>
          </div>

          <div className="grid grid-cols-[1.5fr_1fr] gap-2">
            <div>
              <label className="block text-xs font-semibold text-[#172a3a] mb-1">Cargo Description</label>
              <input
                type="text"
                required
                value={cargoTitle}
                onChange={(e) => setCargoTitle(e.target.value)}
                placeholder="e.g. Pharma Cold Chain Vaccines"
                className="w-full rounded-lg border border-[#c4d0c6] bg-[#fff] p-2 text-xs outline-none focus:border-[#2d6b60]"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#172a3a] mb-1">Weight (Tons)</label>
              <input
                type="number"
                step="0.1"
                required
                value={cargoWeight}
                onChange={(e) => setCargoWeight(e.target.value)}
                className="w-full rounded-lg border border-[#c4d0c6] bg-[#fff] p-2 text-xs outline-none focus:border-[#2d6b60]"
              />
            </div>
          </div>

          <div className="mt-4 flex items-center justify-end gap-2 pt-2 border-t border-[#e5ebe3]">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-[#c4d0c6] bg-[#fff] px-3 py-2 text-xs font-bold text-[#708079] hover:bg-[#f0eee4]"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="rounded-lg bg-[#f1c744] px-4 py-2 text-xs font-bold text-[#172a3a] hover:bg-[#f5d664] shadow-2xs"
            >
              {submitting ? 'Dispatching...' : 'Dispatch Haul'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
