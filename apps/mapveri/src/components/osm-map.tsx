import { useEffect, useRef, useState } from 'react';
import * as maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { Layers, Compass, Locate, LocateFixed, LocateOff, Loader2, X, ShieldAlert, Globe, ArrowRight, Laptop } from 'lucide-react';
import type { Pin, NearbyPin } from '@workspace/api-client-react';
import { LocationTracker, type GpsLocationData, type TrackingStatus } from '@/lib/location-tracker';
import { toast } from '@/hooks/use-toast';

// Boisar, Maharashtra central coordinates: [lat, lng]
export const BOISAR_CENTER: [number, number] = [19.8036, 72.7615];
export const THEEM_COLLEGE: [number, number] = [19.8055, 72.7668];

export interface OsmMapProps {
  pins: (Pin | NearbyPin)[];
  selectedId: number | null;
  onSelectPin: (id: number) => void;
  onMapClick?: (lat: number, lng: number) => void;
  interactive?: boolean;
  hideDefaultOverlays?: boolean;
  activeLayer?: keyof typeof TILE_LAYERS;
  onLayerChange?: (layer: keyof typeof TILE_LAYERS) => void;
  onMapReady?: (map: maplibregl.Map) => void;
  onTrackerReady?: (tracker: LocationTracker) => void;
  onGpsStatusChange?: (status: TrackingStatus, isFollowing: boolean, location: GpsLocationData | null) => void;
}

export const TILE_LAYERS = {
  osm: {
    name: 'OpenStreetMap (Standard)',
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a> contributors',
    maxZoom: 19,
  },
  humanitarian: {
    name: 'OSM Humanitarian (HOT)',
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a> contributors, Tiles style by <a href="https://www.hotosm.org/" target="_blank" rel="noreferrer">HOT</a>',
    maxZoom: 19,
  },
  satellite: {
    name: 'Esri Satellite Imagery',
    attribution: 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community',
    maxZoom: 18,
  },
};

export type TileLayerKey = keyof typeof TILE_LAYERS;

export function getMapLibreStyle(layerKey: TileLayerKey): maplibregl.StyleSpecification {
  if (layerKey === 'satellite') {
    return {
      version: 8,
      sources: {
        'satellite-tiles': {
          type: 'raster',
          tiles: [
            'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
          ],
          tileSize: 256,
          attribution: 'Tiles &copy; Esri &mdash; ArcGIS World Imagery',
          maxzoom: 18,
        },
      },
      layers: [
        {
          id: 'satellite-tiles-layer',
          type: 'raster',
          source: 'satellite-tiles',
          minzoom: 0,
          maxzoom: 18,
        },
      ],
    };
  }

  if (layerKey === 'humanitarian') {
    return {
      version: 8,
      sources: {
        'hot-tiles': {
          type: 'raster',
          tiles: [
            'https://a.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png',
            'https://b.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png',
          ],
          tileSize: 256,
          attribution: '&copy; OpenStreetMap contributors, Tiles style by HOT',
          maxzoom: 19,
        },
      },
      layers: [
        {
          id: 'hot-tiles-layer',
          type: 'raster',
          source: 'hot-tiles',
          minzoom: 0,
          maxzoom: 19,
        },
      ],
    };
  }

  // Default OpenStreetMap Standard Raster Tile style
  return {
    version: 8,
    sources: {
      'osm-tiles': {
        type: 'raster',
        tiles: [
          'https://a.tile.openstreetmap.org/{z}/{x}/{y}.png',
          'https://b.tile.openstreetmap.org/{z}/{x}/{y}.png',
          'https://c.tile.openstreetmap.org/{z}/{x}/{y}.png',
        ],
        tileSize: 256,
        attribution: '&copy; OpenStreetMap contributors',
        maxzoom: 19,
      },
    },
    layers: [
      {
        id: 'osm-tiles-layer',
        type: 'raster',
        source: 'osm-tiles',
        minzoom: 0,
        maxzoom: 19,
      },
    ],
  };
}

export function OsmMap({
  pins,
  selectedId,
  onSelectPin,
  onMapClick,
  interactive = true,
  hideDefaultOverlays = false,
  activeLayer: externalActiveLayer,
  onLayerChange,
  onMapReady,
  onTrackerReady,
  onGpsStatusChange,
}: OsmMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const markersRef = useRef<maplibregl.Marker[]>([]);
  const trackerRef = useRef<LocationTracker | null>(null);

  const [trackingStatus, setTrackingStatus] = useState<TrackingStatus>('idle');
  const [isFollowing, setIsFollowing] = useState(false);
  const [currentGpsLocation, setCurrentGpsLocation] = useState<GpsLocationData | null>(null);
  const [gpsTroubleModal, setGpsTroubleModal] = useState<{
    open: boolean;
    type: 'secure_origin' | 'denied' | 'generic';
    message: string;
  }>({
    open: false,
    type: 'generic',
    message: '',
  });

  const [internalActiveLayer, setInternalActiveLayer] = useState<TileLayerKey>('osm');
  const activeLayer = externalActiveLayer ?? internalActiveLayer;

  const setActiveLayer = (layer: TileLayerKey) => {
    setInternalActiveLayer(layer);
    onLayerChange?.(layer);
  };

  const [showLayerMenu, setShowLayerMenu] = useState(false);
  const [currentCoords, setCurrentCoords] = useState<{ lat: number; lng: number }>({
    lat: BOISAR_CENTER[0],
    lng: BOISAR_CENTER[1],
  });
  const [zoomLevel, setZoomLevel] = useState(14);

  // Initialize MapLibre GL Map
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: getMapLibreStyle(activeLayer),
      center: [BOISAR_CENTER[1], BOISAR_CENTER[0]], // [lng, lat]
      zoom: 14,
      minZoom: 5,
      maxZoom: 19,
      attributionControl: false,
      interactive,
    });

    mapRef.current = map;
    onMapReady?.(map);

    // Initialize GPS Location Tracker
    const tracker = new LocationTracker({
      enableHighAccuracy: true,
      onLocationUpdate: (loc) => {
        setCurrentGpsLocation(loc);
        onGpsStatusChange?.(tracker.getStatus(), tracker.getIsFollowing(), loc);
      },
      onStatusChange: (status, following) => {
        setTrackingStatus(status);
        setIsFollowing(following);
        onGpsStatusChange?.(status, following, tracker.getCurrentLocation());
      },
      onError: (err) => {
        const msg = err.message || '';
        const isSecureErr = /secure origin/i.test(msg);
        const isDeniedErr = /denied|permission/i.test(msg);

        setGpsTroubleModal({
          open: true,
          type: isSecureErr ? 'secure_origin' : isDeniedErr ? 'denied' : 'generic',
          message: msg,
        });

        toast({
          title: 'GPS Tracking Notice',
          description: isSecureErr
            ? 'Chrome requires http://localhost or HTTPS for GPS.'
            : isDeniedErr
            ? 'Location permission denied. Click the help guide on screen.'
            : msg,
          variant: 'destructive',
        });
      },
    });

    tracker.setMap(map);
    trackerRef.current = tracker;
    onTrackerReady?.(tracker);

    map.on('move', () => {
      const center = map.getCenter();
      setCurrentCoords({ lat: center.lat, lng: center.lng });
      setZoomLevel(Math.round(map.getZoom()));
    });

    map.on('click', (e: maplibregl.MapMouseEvent) => {
      if (onMapClick) {
        onMapClick(Number(e.lngLat.lat.toFixed(6)), Number(e.lngLat.lng.toFixed(6)));
      }
    });

    // Invalidate size in case layout rendered with flex/grid
    const timer = setTimeout(() => {
      map.resize();
    }, 200);

    return () => {
      clearTimeout(timer);
      tracker.destroy();
      trackerRef.current = null;
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Handle tile layer change in MapLibre
  useEffect(() => {
    if (!mapRef.current) return;
    mapRef.current.setStyle(getMapLibreStyle(activeLayer));
  }, [activeLayer]);

  // Update Markers
  useEffect(() => {
    if (!mapRef.current) return;

    // Clear previous markers
    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    pins.forEach((pin) => {
      const isSelected = selectedId === pin.id;
      const pinColor =
        pin.status === 'admin_verified'
          ? '#2d6b60'
          : pin.status === 'community_verified'
          ? '#dba91a'
          : pin.status === 'rejected'
          ? '#7b7772'
          : '#d9533a';

      const el = document.createElement('div');
      el.className = 'maplibre-pin-anchor';
      el.style.cursor = 'pointer';
      el.innerHTML = `
        <div style="
          position: relative;
          width: ${isSelected ? '36px' : '30px'};
          height: ${isSelected ? '36px' : '30px'};
          border-radius: 50% 50% 50% 0;
          background: ${pinColor};
          transform: rotate(-45deg);
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 4px 10px rgba(0,0,0,0.35);
          border: 2px solid #ffffff;
          transition: all 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275);
          ${isSelected ? 'transform: rotate(-45deg) scale(1.2); border-color: #f1c744;' : ''}
        ">
          <svg style="transform: rotate(45deg); width: 14px; height: 14px; fill: white;" viewBox="0 0 24 24">
            <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5a2.5 2.5 0 1 1 0-5 2.5 2.5 0 0 1 0 5z"/>
          </svg>
        </div>
        <div style="
          position: absolute;
          left: 50%;
          top: 100%;
          transform: translateX(-50%);
          margin-top: 2px;
          white-space: nowrap;
          background: rgba(23, 42, 58, 0.92);
          color: #fffdf5;
          font-size: 11px;
          font-weight: 700;
          padding: 2px 7px;
          border-radius: 4px;
          box-shadow: 0 2px 5px rgba(0,0,0,0.25);
          pointer-events: none;
          display: ${isSelected ? 'block' : 'none'};
        ">
          ${pin.name}
        </div>
      `;

      const popup = new maplibregl.Popup({
        offset: 28,
        closeButton: false,
        closeOnClick: false,
      }).setHTML(`
        <div style="font-family: inherit; font-size: 12px; font-weight: 600; padding: 2px 4px;">
          <div style="color: #172a3a;">${pin.name}</div>
          <div style="font-size: 10px; color: #60716d;">${pin.category} &bull; ${pin.status.replace('_', ' ')}</div>
        </div>
      `);

      const marker = new maplibregl.Marker({
        element: el,
        anchor: 'bottom',
      })
        .setLngLat([pin.lng, pin.lat])
        .setPopup(popup)
        .addTo(mapRef.current!);

      el.addEventListener('mouseenter', () => marker.togglePopup());
      el.addEventListener('mouseleave', () => marker.togglePopup());

      el.addEventListener('click', (e) => {
        e.stopPropagation();
        onSelectPin(pin.id);
        mapRef.current?.flyTo({
          center: [pin.lng, pin.lat],
          zoom: Math.max(mapRef.current.getZoom(), 15),
          duration: 800,
        });
      });

      markersRef.current.push(marker);
    });
  }, [pins, selectedId, onSelectPin]);

  // Center on selected pin if changed externally
  useEffect(() => {
    if (!selectedId || !mapRef.current) return;
    const pin = pins.find((p) => p.id === selectedId);
    if (pin) {
      mapRef.current.flyTo({
        center: [pin.lng, pin.lat],
        zoom: Math.max(mapRef.current.getZoom(), 15),
        duration: 600,
      });
    }
  }, [selectedId, pins]);

  const handleZoomIn = () => mapRef.current?.zoomIn();
  const handleZoomOut = () => mapRef.current?.zoomOut();

  const handleCenterBoisar = () => {
    mapRef.current?.flyTo({
      center: [BOISAR_CENTER[1], BOISAR_CENTER[0]],
      zoom: 14,
      duration: 1000,
    });
  };

  const handleCenterTheem = () => {
    mapRef.current?.flyTo({
      center: [THEEM_COLLEGE[1], THEEM_COLLEGE[0]],
      zoom: 16,
      duration: 1000,
    });
  };

  const handleLocateMe = () => {
    if (!trackerRef.current) return;

    if (trackingStatus === 'idle' || trackingStatus === 'error') {
      toast({
        title: 'Acquiring GPS Signal...',
        description: 'Connecting to device GPS to track your real-time position.',
      });
      trackerRef.current.startTracking();
    } else if (trackingStatus === 'tracking') {
      if (!isFollowing) {
        trackerRef.current.recenter();
        toast({
          title: 'Camera Centered',
          description: 'Re-centered map on your current GPS location.',
        });
      } else {
        trackerRef.current.stopTracking();
        setCurrentGpsLocation(null);
        toast({
          title: 'GPS Tracking Paused',
          description: 'Live device location tracking stopped.',
        });
      }
    } else if (trackingStatus === 'locating') {
      trackerRef.current.stopTracking();
    }
  };

  // Convert decimal degrees to OSM/DMS style
  const formatDms = (val: number, isLat: boolean) => {
    const dir = isLat ? (val >= 0 ? 'N' : 'S') : val >= 0 ? 'E' : 'W';
    const abs = Math.abs(val);
    const deg = Math.floor(abs);
    const min = Math.floor((abs - deg) * 60);
    const sec = Math.round(((abs - deg) * 60 - min) * 60);
    return `${deg}°${min}′${sec}″${dir}`;
  };

  return (
    <div className="relative h-full w-full overflow-hidden bg-[#e5e3df]">
      {/* MapLibre GL WebGL Map Container */}
      <div ref={containerRef} className="h-full w-full z-0" tabIndex={0} />

      {!hideDefaultOverlays && (
        <>
          {/* Top Left: Quick Landmark Jumps for Boisar */}
          <div className="absolute left-4 top-4 z-[400] flex flex-wrap gap-2">
            <button
              onClick={handleCenterTheem}
              className="flex items-center gap-1.5 rounded-lg border border-[#c5d0c6] bg-[#f8f5ea]/95 px-3 py-1.5 text-xs font-bold text-[#1f4a43] shadow-md backdrop-blur hover:bg-[#eaf1e9] transition"
              title="Jump to Theem College of Engineering, Boisar"
            >
              <span className="h-2 w-2 rounded-full bg-[#2d6b60]" />
              Theem College
            </button>
            <button
              onClick={handleCenterBoisar}
              className="flex items-center gap-1.5 rounded-lg border border-[#c5d0c6] bg-[#f8f5ea]/95 px-3 py-1.5 text-xs font-bold text-[#243f48] shadow-md backdrop-blur hover:bg-[#eaf1e9] transition"
              title="Jump to Boisar Town Center"
            >
              <Compass size={13} className="text-[#dba91a]" />
              Boisar Center
            </button>
          </div>

          {/* Floating Live GPS Tracking Badge */}
          {trackingStatus === 'tracking' && currentGpsLocation && (
            <div className="absolute left-4 top-16 z-[400] flex items-center gap-2.5 rounded-xl border border-blue-200 bg-white/95 px-3 py-2 shadow-lg backdrop-blur animate-in fade-in slide-in-from-top-2">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-blue-600"></span>
              </span>
              <div className="flex flex-col">
                <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
                  <span>GPS Tracking Active</span>
                  <span className="rounded bg-blue-100 px-1.5 py-0.2 text-[10px] font-semibold text-blue-800">
                    &plusmn;{Math.round(currentGpsLocation.accuracy)}m
                  </span>
                </div>
                <div className="font-mono text-[10px] text-slate-500">
                  {currentGpsLocation.latitude.toFixed(5)}&deg;, {currentGpsLocation.longitude.toFixed(5)}&deg;
                  {currentGpsLocation.speed && currentGpsLocation.speed > 0.5 ? ` · ${(currentGpsLocation.speed * 3.6).toFixed(1)} km/h` : ''}
                </div>
              </div>
              {!isFollowing && (
                <button
                  onClick={() => trackerRef.current?.recenter()}
                  className="ml-1 rounded-md bg-blue-600 px-2 py-1 text-[11px] font-semibold text-white hover:bg-blue-700 transition shadow-sm"
                  title="Re-center map on your live position"
                >
                  Re-center
                </button>
              )}
              <button
                onClick={() => {
                  trackerRef.current?.stopTracking();
                  setCurrentGpsLocation(null);
                }}
                className="ml-0.5 rounded-full p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition"
                title="Stop Tracking"
              >
                <X size={14} />
              </button>
            </div>
          )}

          {trackingStatus === 'locating' && (
            <div className="absolute left-4 top-16 z-[400] flex items-center gap-2 rounded-xl border border-blue-200 bg-white/95 px-3 py-2 shadow-lg backdrop-blur animate-pulse">
              <Loader2 size={14} className="animate-spin text-blue-600" />
              <span className="text-xs font-semibold text-slate-800">Acquiring GPS Signal...</span>
            </div>
          )}

          {/* Top Right: OSM Controls (Layer Switcher, Locate, Zoom) */}
          <div className="absolute right-4 top-4 z-[400] flex flex-col gap-2">
            {/* Layer Selector */}
            <div className="relative">
              <button
                onClick={() => setShowLayerMenu(!showLayerMenu)}
                className="flex h-9 w-9 items-center justify-center rounded-lg border border-[#c4d0c6] bg-[#fffdf4] text-[#243f48] shadow-md hover:bg-[#f2efe4] transition"
                title="Map Layers (OSM / Satellite)"
              >
                <Layers size={17} />
              </button>

              {showLayerMenu && (
                <div className="absolute right-0 top-11 w-52 rounded-xl border border-[#c5d0c6] bg-[#fffdf4] p-2 shadow-xl">
                  <p className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-[#708079]">
                    Tile Layers
                  </p>
                  {Object.entries(TILE_LAYERS).map(([key, config]) => (
                    <button
                      key={key}
                      onClick={() => {
                        setActiveLayer(key as TileLayerKey);
                        setShowLayerMenu(false);
                      }}
                      className={`flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-left text-xs font-semibold transition ${
                        activeLayer === key
                          ? 'bg-[#2d6b60] text-[#fff8ee]'
                          : 'text-[#243f48] hover:bg-[#f0ebe0]'
                      }`}
                    >
                      <span>{config.name}</span>
                      {activeLayer === key && <span className="text-[10px]">✓</span>}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Locate Me Button with Real-Time Device GPS Tracking */}
            <button
              onClick={handleLocateMe}
              className={`relative flex h-9 w-9 items-center justify-center rounded-lg border shadow-md transition ${
                trackingStatus === 'tracking' && isFollowing
                  ? 'border-[#2563eb] bg-[#2563eb] text-white shadow-[0_0_14px_rgba(37,99,235,0.45)]'
                  : trackingStatus === 'tracking' && !isFollowing
                  ? 'border-[#2563eb] bg-[#eff6ff] text-[#2563eb] hover:bg-[#dbeafe]'
                  : trackingStatus === 'locating'
                  ? 'border-[#3b82f6] bg-[#eff6ff] text-[#2563eb]'
                  : trackingStatus === 'error'
                  ? 'border-red-300 bg-red-50 text-red-600 hover:bg-red-100'
                  : 'border-[#c4d0c6] bg-[#fffdf4] text-[#243f48] hover:bg-[#f2efe4]'
              }`}
              title={
                trackingStatus === 'tracking' && isFollowing
                  ? 'Live GPS Tracking Active (Click to pause)'
                  : trackingStatus === 'tracking' && !isFollowing
                  ? 'Re-center camera on GPS location'
                  : trackingStatus === 'locating'
                  ? 'Acquiring GPS signal...'
                  : trackingStatus === 'error'
                  ? 'GPS error (Click to retry)'
                  : 'Track My Location (Device GPS)'
              }
              aria-label="Track My Location"
            >
              {trackingStatus === 'locating' ? (
                <Loader2 size={17} className="animate-spin text-[#2563eb]" />
              ) : trackingStatus === 'tracking' && isFollowing ? (
                <>
                  <LocateFixed size={18} />
                  <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-blue-600 border border-white"></span>
                  </span>
                </>
              ) : trackingStatus === 'tracking' && !isFollowing ? (
                <>
                  <Locate size={17} />
                  <span className="absolute -top-1 -right-1 flex h-2 w-2 rounded-full bg-[#2563eb] ring-2 ring-white"></span>
                </>
              ) : trackingStatus === 'error' ? (
                <LocateOff size={17} />
              ) : (
                <Locate size={17} />
              )}
            </button>

            {/* Custom OSM Zoom Buttons */}
            <div className="flex flex-col overflow-hidden rounded-lg border border-[#c4d0c6] bg-[#fffdf4] shadow-md">
              <button
                onClick={handleZoomIn}
                className="flex h-9 w-9 items-center justify-center text-base font-bold text-[#243f48] hover:bg-[#f2efe4] border-b border-[#e2e2d7] transition"
                title="Zoom In"
              >
                +
              </button>
              <button
                onClick={handleZoomOut}
                className="flex h-9 w-9 items-center justify-center text-base font-bold text-[#243f48] hover:bg-[#f2efe4] transition"
                title="Zoom Out"
              >
                &minus;
              </button>
            </div>
          </div>

          {/* Bottom Bar: Indian Region & OSM Info Badge */}
          <div className="absolute bottom-3 left-3 right-3 z-[400] flex flex-wrap items-center justify-between gap-2 pointer-events-none">
            {/* Left: Region & Coordinates Tag */}
            <div className="pointer-events-auto flex items-center gap-2 rounded-lg border border-[#b7c6b9] bg-[#f8f5ea]/95 px-3 py-1.5 text-[11px] font-medium text-[#243f48] shadow-sm backdrop-blur">
              <span className="flex h-2 w-2 rounded-full bg-[#2d6b60]" />
              <span className="font-bold text-[#1f4a43]">Boisar, Maharashtra (IN)</span>
              <span className="text-[#8c9c94]">·</span>
              <span className="font-mono-map text-[10px] text-[#49655f]">
                {formatDms(currentCoords.lat, true)} {formatDms(currentCoords.lng, false)}
              </span>
              <span className="text-[#8c9c94]">·</span>
              <span className="text-[10px] text-[#708079]">Zoom {zoomLevel}</span>
            </div>

            {/* Right: OpenStreetMap Attribution */}
            <div className="pointer-events-auto rounded border border-[#c8d4c9] bg-[#f8f5ea]/90 px-2 py-0.5 text-[10px] text-[#60716d] shadow-sm backdrop-blur">
              Map data &copy;{' '}
              <a
                href="https://www.openstreetmap.org/copyright"
                target="_blank"
                rel="noreferrer"
                className="font-bold text-[#2d6b60] hover:underline"
              >
                OpenStreetMap
              </a>{' '}
              contributors · MapLibre GL
            </div>
          </div>
        </>
      )}

      {/* GPS Troubleshooting & Permission Guide Modal */}
      {gpsTroubleModal.open && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-in fade-in">
          <div className="relative w-full max-w-md rounded-2xl border border-amber-200 bg-[#fffdfa] p-6 shadow-2xl">
            <button
              onClick={() => setGpsTroubleModal({ ...gpsTroubleModal, open: false })}
              className="absolute right-4 top-4 rounded-full p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition"
              aria-label="Close"
            >
              <X size={18} />
            </button>

            {gpsTroubleModal.type === 'secure_origin' ? (
              <div>
                <div className="flex items-center gap-3 mb-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100 text-amber-700">
                    <ShieldAlert size={22} />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900">Chrome Security Requirement</h3>
                    <p className="text-xs text-slate-500">Only secure origins are allowed for GPS</p>
                  </div>
                </div>

                <p className="text-xs leading-relaxed text-slate-600 mb-4">
                  Google Chrome strictly requires a <strong>secure origin</strong> to access device GPS. Because you are accessing via a local IP address (<code className="rounded bg-slate-100 px-1 py-0.5 text-slate-800 font-mono">{typeof window !== 'undefined' ? window.location.hostname : 'IP'}</code>), Chrome blocked GPS.
                </p>

                <div className="rounded-xl border border-blue-200 bg-blue-50/70 p-3.5 mb-4 text-xs text-blue-900">
                  <p className="font-semibold mb-1 flex items-center gap-1.5 text-blue-800">
                    <Laptop size={14} /> Recommended Fix on your laptop:
                  </p>
                  <p className="text-slate-600">
                    Switch to <strong>localhost</strong>. Chrome treats localhost as fully secure!
                  </p>
                </div>

                <div className="flex flex-col gap-2">
                  <button
                    onClick={() => {
                      const port = window.location.port || '5173';
                      window.location.href = `https://localhost:${port}`;
                    }}
                    className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-xs font-bold text-white shadow-md hover:bg-blue-700 transition"
                  >
                    <span>Switch to https://localhost:{typeof window !== 'undefined' ? window.location.port || '5173' : '5173'}</span>
                    <ArrowRight size={15} />
                  </button>

                  <button
                    onClick={async () => {
                      setGpsTroubleModal({ ...gpsTroubleModal, open: false });
                      await trackerRef.current?.fallbackToIpLocation();
                    }}
                    className="flex w-full items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
                  >
                    <Globe size={15} className="text-blue-600" />
                    <span>Use Approximate Network IP Location Instead</span>
                  </button>
                </div>
              </div>
            ) : gpsTroubleModal.type === 'denied' ? (
              <div>
                <div className="flex items-center gap-3 mb-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-100 text-red-600">
                    <LocateOff size={22} />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900">Location Permission Blocked</h3>
                    <p className="text-xs text-slate-500">User denied geolocation prompt</p>
                  </div>
                </div>

                <p className="text-xs leading-relaxed text-slate-600 mb-3">
                  Your browser or laptop is blocking location access. Follow these 2 steps to enable GPS tracking:
                </p>

                <div className="space-y-2.5 mb-4 text-xs">
                  <div className="flex items-start gap-2.5 rounded-xl border border-slate-200 bg-slate-50/80 p-2.5">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-blue-600 text-[10px] font-bold text-white">1</span>
                    <div>
                      <p className="font-semibold text-slate-800">In Google Chrome Address Bar:</p>
                      <p className="text-slate-600 text-[11px]">Click the <strong>tune/sliders icon</strong> (or lock icon) on the far left of the URL bar &rarr; change <strong>Location</strong> to <strong>Allow</strong>.</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-2.5 rounded-xl border border-slate-200 bg-slate-50/80 p-2.5">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-blue-600 text-[10px] font-bold text-white">2</span>
                    <div>
                      <p className="font-semibold text-slate-800">On your Windows Laptop:</p>
                      <p className="text-slate-600 text-[11px]">Open <strong>Settings &gt; Privacy &amp; security &gt; Location</strong> &rarr; turn <strong>Location services ON</strong> and <strong>Let apps access location ON</strong>.</p>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col gap-2">
                  <button
                    onClick={() => {
                      setGpsTroubleModal({ ...gpsTroubleModal, open: false });
                      trackerRef.current?.startTracking();
                    }}
                    className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#2d6b60] px-4 py-2.5 text-xs font-bold text-white shadow-md hover:bg-[#24574e] transition"
                  >
                    <span>I Allowed Location, Try Again</span>
                  </button>

                  <button
                    onClick={async () => {
                      setGpsTroubleModal({ ...gpsTroubleModal, open: false });
                      await trackerRef.current?.fallbackToIpLocation();
                    }}
                    className="flex w-full items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
                  >
                    <Globe size={15} className="text-blue-600" />
                    <span>Use Approximate IP Location Without GPS</span>
                  </button>
                </div>
              </div>
            ) : (
              <div>
                <h3 className="text-base font-bold text-slate-900 mb-2">GPS Tracking Notice</h3>
                <p className="text-xs text-slate-600 mb-4">{gpsTroubleModal.message}</p>
                <button
                  onClick={() => setGpsTroubleModal({ ...gpsTroubleModal, open: false })}
                  className="w-full rounded-xl bg-slate-800 px-4 py-2 text-xs font-bold text-white hover:bg-slate-900"
                >
                  Dismiss
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
