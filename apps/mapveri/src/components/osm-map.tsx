import { useEffect, useRef, useState, useCallback } from 'react';
import * as maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import {
  Layers,
  Compass,
  Locate,
  LocateFixed,
  LocateOff,
  Loader2,
  X,
  ShieldAlert,
  Globe,
  ArrowRight,
  Laptop,
  Mountain,
  Sparkles,
  Box,
  Building2,
  Eye,
  Train,
  Radio,
} from 'lucide-react';
import type { Pin, NearbyPin } from '@workspace/api-client-react';
import { LocationTracker, type GpsLocationData, type TrackingStatus } from '@/lib/location-tracker';
import { toast } from '@/hooks/use-toast';
import { ThreeCityGmlLayer, type CityGmlRenderMode } from '@/lib/three-citygml-layer';
import { BOISAR_OSM_BUILDINGS_GEOJSON } from '@/lib/osm-3d-buildings-data';
import { Cesium3DGlobe } from './cesium-3d-globe';
import {
  INDIA_MAPS_URLS,
  getNearestKeyDistrict,
} from '@/lib/india-maps-data';
import type { ActiveRouteData } from '@/lib/routing-service';
import { fetchRailRadarTrains, type RailRadarTrainStatus } from '@/lib/railradar-client';

// Boisar, Maharashtra central coordinates: [lat, lng]
export const BOISAR_CENTER: [number, number] = [19.8036, 72.7615];
export const THEEM_COLLEGE: [number, number] = [19.8055, 72.7668];

export interface OsmMapProps {
  pins: (Pin | NearbyPin)[];
  selectedId: number | null;
  onSelectPin: (id: number) => void;
  onMapClick?: (lat: number, lng: number) => void;
  onMapDoubleClick?: (lat: number, lng: number) => void;
  droppedPin?: { lat: number; lng: number } | null;
  onClearDroppedPin?: () => void;
  onAddPlaceAtCoords?: (lat: number, lng: number) => void;
  interactive?: boolean;
  hideDefaultOverlays?: boolean;
  hideQuickJumps?: boolean;
  dimOverlays?: boolean;
  activeLayer?: keyof typeof TILE_LAYERS;
  onLayerChange?: (layer: keyof typeof TILE_LAYERS) => void;
  onMapReady?: (map: maplibregl.Map) => void;
  onTrackerReady?: (tracker: LocationTracker) => void;
  onGpsStatusChange?: (status: TrackingStatus, isFollowing: boolean, location: GpsLocationData | null) => void;
  activeRoute?: ActiveRouteData | null;
}

export const TILE_LAYERS = {
  mapveri: {
    name: 'Mapveri Map',
    shortName: 'Mapveri Map',
    description: 'Composite OSM + CARTO (40%), India Civic Maps (760 Districts), Elevation, Contours & Ski Trails',
    attribution: '&copy; OpenStreetMap, &copy; CARTO, India Maps Data (udit-001), OpenTopoMap, Waymarked Trails, Esri Hillshade, OpenRailwayMap',
    maxZoom: 19,
    isCustom: true,
  },
  osm: {
    name: 'OpenStreetMap (Standard)',
    shortName: 'Default OSM',
    description: 'Clean standard street map',
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a> contributors',
    maxZoom: 19,
  },
  opentopo: {
    name: 'OpenTopoMap (Topographic)',
    shortName: 'OpenTopo',
    description: 'Contour lines, elevation & hiking trails',
    attribution: 'Map data: &copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a> contributors, <a href="http://viewfinderpanoramas.org" target="_blank" rel="noreferrer">SRTM</a> | Map style: &copy; <a href="https://opentopomap.org" target="_blank" rel="noreferrer">OpenTopoMap</a> (<a href="https://creativecommons.org/licenses/by-sa/3.0/" target="_blank" rel="noreferrer">CC-BY-SA</a>)',
    maxZoom: 17,
  },
  satellite: {
    name: 'Esri Satellite Imagery',
    shortName: 'Esri Satellite',
    description: 'High-resolution aerial satellite imagery',
    attribution: 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community',
    maxZoom: 18,
  },
};

export type TileLayerKey = keyof typeof TILE_LAYERS;

export function getMapLibreStyle(layerKey: TileLayerKey): maplibregl.StyleSpecification {
  if (layerKey === 'mapveri') {
    return {
      version: 8,
      glyphs: 'https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf',
      sources: {
        // Foundation OSM standard raster base
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
        // Graphical 1: 3D Elevation Hillshade (Esri World Elevation)
        'elevation-hillshade': {
          type: 'raster',
          tiles: [
            'https://services.arcgisonline.com/ArcGIS/rest/services/Elevation/World_Hillshade/MapServer/tile/{z}/{y}/{x}',
          ],
          tileSize: 256,
          attribution: 'Elevation Hillshade &copy; Esri, USGS, SRTM',
          maxzoom: 14,
        },
        // Graphical 2: OpenTopoMap Contours & Topography (SRTM 10m/50m elevation contours)
        'opentopo-tiles': {
          type: 'raster',
          tiles: [
            'https://a.tile.opentopomap.org/{z}/{x}/{y}.png',
            'https://b.tile.opentopomap.org/{z}/{x}/{y}.png',
            'https://c.tile.opentopomap.org/{z}/{x}/{y}.png',
          ],
          tileSize: 256,
          attribution: 'Topography &copy; OpenTopoMap (CC-BY-SA), SRTM',
          maxzoom: 17,
        },
        // Graphical 3: Skiing Pistes & Lifts (openmaptiles-skiing & Waymarked Slopes)
        'skiing-slopes': {
          type: 'raster',
          tiles: [
            'https://tile.waymarkedtrails.org/slopes/{z}/{x}/{y}.png',
          ],
          tileSize: 256,
          attribution: 'Ski Slopes &copy; waymarkedtrails.org (openmaptiles-skiing)',
          maxzoom: 18,
        },
        // Graphical 4: OpenSnowMap Pistes & Nordic routes
        'opensnow-pistes': {
          type: 'raster',
          tiles: [
            'https://tiles.opensnowmap.org/pistes/{z}/{x}/{y}.png',
          ],
          tileSize: 256,
          attribution: 'Pistes &copy; opensnowmap.org',
          maxzoom: 18,
        },
        // Graphical 5: Hiking Trails & Alpine Paths (Waymarked Trails)
        'hiking-trails': {
          type: 'raster',
          tiles: [
            'https://tile.waymarkedtrails.org/hiking/{z}/{x}/{y}.png',
          ],
          tileSize: 256,
          attribution: 'Hiking Trails &copy; waymarkedtrails.org',
          maxzoom: 18,
        },
        // Graphical 6: Cycling & Mountain Biking Routes (Waymarked Trails)
        'cycling-routes': {
          type: 'raster',
          tiles: [
            'https://tile.waymarkedtrails.org/cycling/{z}/{x}/{y}.png',
          ],
          tileSize: 256,
          attribution: 'Cycling Trails &copy; waymarkedtrails.org',
          maxzoom: 18,
        },
        // Graphical 7: Railway & Transit Infrastructure (OpenRailwayMap)
        'railway-network': {
          type: 'raster',
          tiles: [
            'https://a.tiles.openrailwaymap.org/standard/{z}/{x}/{y}.png',
            'https://b.tiles.openrailwaymap.org/standard/{z}/{x}/{y}.png',
            'https://c.tiles.openrailwaymap.org/standard/{z}/{x}/{y}.png',
          ],
          tileSize: 256,
          attribution: 'Railway Data &copy; OpenRailwayMap',
          maxzoom: 19,
        },
        // Useful Cartographic Data & Information from CARTO Voyager (with API key to avoid watermark)
        'carto-voyager': {
          type: 'raster',
          tiles: [
            'https://a.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png?key=cb1_4eux_1_93c14281b06aa44f9bf79593',
            'https://b.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png?key=cb1_4eux_1_93c14281b06aa44f9bf79593',
            'https://c.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png?key=cb1_4eux_1_93c14281b06aa44f9bf79593',
            'https://d.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png?key=cb1_4eux_1_93c14281b06aa44f9bf79593',
          ],
          tileSize: 256,
          attribution: '&copy; OpenStreetMap contributors, &copy; CARTO',
          maxzoom: 20,
        },
        // 3D Digital Elevation Model (DEM) Terrarium terrain tiles
        'terrain-dem': {
          type: 'raster-dem',
          tiles: [
            'https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png',
          ],
          encoding: 'terrarium',
          tileSize: 256,
          maxzoom: 15,
        },
        // OpenStreetMap 3D Building Footprints GeoJSON Source
        'osm-3d-buildings-source': {
          type: 'geojson',
          data: BOISAR_OSM_BUILDINGS_GEOJSON as any,
        },
        // India Maps Data: 760 Administrative District Boundaries (udit-001/india-maps-data)
        'india-districts-source': {
          type: 'geojson',
          data: INDIA_MAPS_URLS.indiaDistrictsLocal,
        },
        // India Maps Data: District Centroids for Fast Labels
        'india-centroids-source': {
          type: 'geojson',
          data: INDIA_MAPS_URLS.districtCentroidsLocal,
        },
        // India Maps Data: State Centroids for Macro Labels
        'india-states-source': {
          type: 'geojson',
          data: INDIA_MAPS_URLS.stateCentroidsLocal,
        },
      },
      layers: [
        // Foundation OSM base
        {
          id: 'mapveri-osm-base',
          type: 'raster',
          source: 'osm-tiles',
          minzoom: 0,
          maxzoom: 20,
          paint: {
            'raster-opacity': 1.0,
          },
        },
        // Useful Cartographic Data & Information from Carto at 40% transparency (0.40 opacity)
        {
          id: 'mapveri-carto-data',
          type: 'raster',
          source: 'carto-voyager',
          minzoom: 0,
          maxzoom: 20,
          paint: {
            'raster-opacity': 0.40,
          },
        },
        // Graphical 1: 3D Elevation Hillshade at 45% opacity
        {
          id: 'mapveri-elevation-hillshade',
          type: 'raster',
          source: 'elevation-hillshade',
          minzoom: 0,
          maxzoom: 15,
          paint: {
            'raster-opacity': 0.45,
          },
        },
        // Graphical 2: OpenTopo Contours & Topography at 45% opacity
        {
          id: 'mapveri-opentopo-contours',
          type: 'raster',
          source: 'opentopo-tiles',
          minzoom: 7,
          maxzoom: 17,
          paint: {
            'raster-opacity': 0.45,
          },
        },
        // Graphical 3: Ski Pistes & Slopes (openmaptiles-skiing) at 48% opacity
        {
          id: 'mapveri-skiing-slopes',
          type: 'raster',
          source: 'skiing-slopes',
          minzoom: 0,
          maxzoom: 19,
          paint: {
            'raster-opacity': 0.48,
          },
        },
        // Graphical 4: OpenSnowMap Pistes at 42% opacity
        {
          id: 'mapveri-opensnow-pistes',
          type: 'raster',
          source: 'opensnow-pistes',
          minzoom: 9,
          maxzoom: 19,
          paint: {
            'raster-opacity': 0.42,
          },
        },
        // Graphical 5: Hiking Trails at 45% opacity
        {
          id: 'mapveri-hiking-trails',
          type: 'raster',
          source: 'hiking-trails',
          minzoom: 6,
          maxzoom: 19,
          paint: {
            'raster-opacity': 0.45,
          },
        },
        // Graphical 6: Cycling Routes at 45% opacity
        {
          id: 'mapveri-cycling-routes',
          type: 'raster',
          source: 'cycling-routes',
          minzoom: 7,
          maxzoom: 19,
          paint: {
            'raster-opacity': 0.45,
          },
        },
        // Graphical 7: Railway Network at 45% opacity
        {
          id: 'mapveri-railway-network',
          type: 'raster',
          source: 'railway-network',
          minzoom: 5,
          maxzoom: 20,
          paint: {
            'raster-opacity': 0.45,
          },
        },
        // India Maps Data: Subtle District Fill & Hover Highlight
        {
          id: 'mapveri-india-district-fill',
          type: 'fill',
          source: 'india-districts-source',
          minzoom: 3,
          maxzoom: 20,
          paint: {
            'fill-color': '#0284c7',
            'fill-opacity': 0.04,
          },
        },
        // India Maps Data: District Boundary Casing for High Contrast
        {
          id: 'mapveri-india-district-casing',
          type: 'line',
          source: 'india-districts-source',
          minzoom: 3,
          maxzoom: 20,
          paint: {
            'line-color': '#ffffff',
            'line-width': [
              'interpolate',
              ['linear'],
              ['zoom'],
              4, 1.2,
              8, 2.2,
              12, 3.2,
              15, 4.2,
            ],
            'line-opacity': 0.55,
          },
        },
        // India Maps Data: Crisp Administrative Boundaries (760 Districts)
        {
          id: 'mapveri-india-district-borders',
          type: 'line',
          source: 'india-districts-source',
          minzoom: 3,
          maxzoom: 20,
          paint: {
            'line-color': '#1d4ed8',
            'line-width': [
              'interpolate',
              ['linear'],
              ['zoom'],
              4, 0.7,
              8, 1.4,
              12, 2.0,
              15, 2.8,
            ],
            'line-opacity': 0.75,
            'line-dasharray': [3, 2],
          },
        },
        // India Maps Data: District Names (Centroids)
        {
          id: 'mapveri-india-district-labels',
          type: 'symbol',
          source: 'india-centroids-source',
          minzoom: 6,
          maxzoom: 17,
          layout: {
            'text-field': ['get', 'district'],
            'text-font': ['Open Sans Regular', 'Arial Unicode MS Regular'],
            'text-size': [
              'interpolate',
              ['linear'],
              ['zoom'],
              6, 9,
              9, 12,
              12, 14,
              15, 16,
            ],
            'text-letter-spacing': 0.06,
            'text-transform': 'uppercase',
            'text-allow-overlap': false,
            'text-ignore-placement': false,
          },
          paint: {
            'text-color': '#1e293b',
            'text-halo-color': '#ffffff',
            'text-halo-width': 2.0,
            'text-halo-blur': 0.5,
          },
        },
        // India Maps Data: State Names for macro country view
        {
          id: 'mapveri-india-state-labels',
          type: 'symbol',
          source: 'india-states-source',
          minzoom: 3,
          maxzoom: 8,
          layout: {
            'text-field': ['get', 'name'],
            'text-font': ['Open Sans Bold', 'Arial Unicode MS Bold'],
            'text-size': [
              'interpolate',
              ['linear'],
              ['zoom'],
              4, 11,
              6, 14,
              8, 17,
            ],
            'text-letter-spacing': 0.1,
            'text-transform': 'uppercase',
            'text-allow-overlap': false,
          },
          paint: {
            'text-color': '#1e3a8a',
            'text-halo-color': '#ffffff',
            'text-halo-width': 2.5,
            'text-halo-blur': 1,
          },
        },
        // OpenStreetMap 3D Extruded Building Footprints (3D Polygons)
        {
          id: 'mapveri-osm-3d-buildings',
          type: 'fill-extrusion',
          source: 'osm-3d-buildings-source',
          minzoom: 12,
          paint: {
            'fill-extrusion-color': [
              'interpolate',
              ['linear'],
              ['get', 'height'],
              0, '#cbd5e1',
              15, '#93c5fd',
              25, '#38bdf8',
              40, '#2563eb',
            ],
            'fill-extrusion-height': ['get', 'height'],
            'fill-extrusion-base': ['get', 'min_height'],
            'fill-extrusion-opacity': 0.88,
          },
        },
      ],
    };
  }
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
          maxzoom: 19,
        },
      ],
    };
  }

  if (layerKey === 'opentopo') {
    return {
      version: 8,
      sources: {
        'opentopo-tiles': {
          type: 'raster',
          tiles: [
            'https://a.tile.opentopomap.org/{z}/{x}/{y}.png',
            'https://b.tile.opentopomap.org/{z}/{x}/{y}.png',
            'https://c.tile.opentopomap.org/{z}/{x}/{y}.png',
          ],
          tileSize: 256,
          attribution: 'Map data: &copy; OpenStreetMap contributors, SRTM | Map style: &copy; OpenTopoMap (CC-BY-SA)',
          maxzoom: 17,
        },
      },
      layers: [
        {
          id: 'opentopo-tiles-layer',
          type: 'raster',
          source: 'opentopo-tiles',
          minzoom: 0,
          maxzoom: 17,
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
  onMapDoubleClick,
  droppedPin,
  onClearDroppedPin,
  onAddPlaceAtCoords,
  interactive = true,
  hideDefaultOverlays = false,
  hideQuickJumps = false,
  dimOverlays = false,
  activeLayer: externalActiveLayer,
  onLayerChange,
  onMapReady,
  onTrackerReady,
  onGpsStatusChange,
  activeRoute,
}: OsmMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const markersRef = useRef<maplibregl.Marker[]>([]);
  const droppedMarkerRef = useRef<maplibregl.Marker | null>(null);
  const routeMarkersRef = useRef<maplibregl.Marker[]>([]);
  const trainMarkersRef = useRef<maplibregl.Marker[]>([]);
  const trackerRef = useRef<LocationTracker | null>(null);
  const [isRailRadarActive, setIsRailRadarActive] = useState(false);

  const onMapClickRef = useRef(onMapClick);
  const onMapDoubleClickRef = useRef(onMapDoubleClick);
  useEffect(() => {
    onMapClickRef.current = onMapClick;
    onMapDoubleClickRef.current = onMapDoubleClick;
  });

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

  const [internalActiveLayer, setInternalActiveLayer] = useState<TileLayerKey>('mapveri');
  const activeLayer = externalActiveLayer ?? internalActiveLayer;

  const setActiveLayer = (layer: TileLayerKey) => {
    setInternalActiveLayer(layer);
    onLayerChange?.(layer);
  };

  const [is3dMode, setIs3dMode] = useState(false);
  const [showCesiumModal, setShowCesiumModal] = useState(false);
  const [threeMode, setThreeMode] = useState<CityGmlRenderMode>('realistic');
  const [isTerrainActive, setIsTerrainActive] = useState(false);
  const threeLayerRef = useRef<ThreeCityGmlLayer | null>(null);

  const handleToggle3D = () => {
    if (!mapRef.current) return;
    const map = mapRef.current;
    const nextState = !is3dMode;
    setIs3dMode(nextState);

    if (nextState) {
      if (activeLayer !== 'mapveri') {
        setActiveLayer('mapveri');
      }

      map.easeTo({
        pitch: 60,
        bearing: -18,
        duration: 1200,
      });

      try {
        if (map.getSource('terrain-dem')) {
          map.setTerrain({ source: 'terrain-dem', exaggeration: 1.5 });
          setIsTerrainActive(true);
        }
      } catch (err) {
        console.warn('SetTerrain error:', err);
      }

      try {
        if (!map.getLayer('threejs-citygml-layer')) {
          const layer = new ThreeCityGmlLayer(threeMode);
          map.addLayer(layer);
          threeLayerRef.current = layer;
        }
      } catch (err) {
        console.warn('Three.js layer add notice:', err);
      }

      toast({
        title: '3D Perspective & Terrain Active',
        description: '60° oblique pitch, Terrarium DEM elevation mesh & Three.js CityGML models engaged.',
      });
    } else {
      map.easeTo({
        pitch: 0,
        bearing: 0,
        duration: 800,
      });

      try {
        map.setTerrain(null);
        setIsTerrainActive(false);
      } catch { }

      try {
        if (map.getLayer('threejs-citygml-layer')) {
          map.removeLayer('threejs-citygml-layer');
          threeLayerRef.current = null;
        }
      } catch { }
    }
  };

  const handleCycleThreeMode = () => {
    const modes: CityGmlRenderMode[] = ['realistic', 'semantic', 'height', 'wireframe'];
    const nextIdx = (modes.indexOf(threeMode) + 1) % modes.length;
    const nextMode = modes[nextIdx];
    setThreeMode(nextMode);
    threeLayerRef.current?.setRenderMode(nextMode);
    toast({
      title: 'CityGML Mode Updated',
      description: `Switched Three.js architectural styling to: ${nextMode.toUpperCase()}`,
    });
  };

  const [showLayerMenu, setShowLayerMenu] = useState(false);
  const [currentCoords, setCurrentCoords] = useState<{ lat: number; lng: number }>({
    lat: BOISAR_CENTER[0],
    lng: BOISAR_CENTER[1],
  });
  const [zoomLevel, setZoomLevel] = useState(14);
  const [hoveredDistrict, setHoveredDistrict] = useState<{
    district: string;
    st_nm: string;
    dt_code: string;
  } | null>(null);

  const activeDistrictInfo = getNearestKeyDistrict(currentCoords.lat, currentCoords.lng);

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

    if (onMapDoubleClickRef.current) {
      map.doubleClickZoom.disable();
    }

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

    // District hover and click handling for India Maps Data (760 Districts)
    map.on('mousemove', (e: maplibregl.MapMouseEvent) => {
      try {
        if (!map.getLayer('mapveri-india-district-fill')) {
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
    });

    map.on('mouseout', () => {
      map.getCanvas().style.cursor = '';
      setHoveredDistrict(null);
    });

    let clickTimer: any = null;

    map.on('click', (e: maplibregl.MapMouseEvent) => {
      const lat = Number(e.lngLat.lat.toFixed(6));
      const lng = Number(e.lngLat.lng.toFixed(6));

      try {
        if (map.getLayer('mapveri-india-district-fill')) {
          const features = map.queryRenderedFeatures(e.point, { layers: ['mapveri-india-district-fill'] });
          if (features && features.length > 0) {
            const props = features[0].properties as any;
            if (props?.district) {
              toast({
                title: `🇮🇳 ${props.district} District`,
                description: `State: ${props.st_nm || 'India'} · Administrative Code: ${props.dt_code || 'N/A'} (India Maps Data)`,
              });
            }
          }
        }
      } catch { }

      if (onMapDoubleClickRef.current) {
        if (clickTimer) clearTimeout(clickTimer);
        clickTimer = setTimeout(() => {
          onMapClickRef.current?.(lat, lng);
          clickTimer = null;
        }, 220);
      } else {
        onMapClickRef.current?.(lat, lng);
      }
    });

    map.on('dblclick', (e: maplibregl.MapMouseEvent) => {
      if (onMapDoubleClickRef.current) {
        if (clickTimer) {
          clearTimeout(clickTimer);
          clickTimer = null;
        }
        e.preventDefault();
        onMapDoubleClickRef.current(Number(e.lngLat.lat.toFixed(6)), Number(e.lngLat.lng.toFixed(6)));
      }
    });

    // Invalidate size in case layout rendered with flex/grid
    const timer = setTimeout(() => {
      map.resize();
    }, 200);

    return () => {
      if (clickTimer) clearTimeout(clickTimer);
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

    if (is3dMode && activeLayer === 'mapveri') {
      mapRef.current.once('style.load', () => {
        try {
          if (mapRef.current?.getSource('terrain-dem')) {
            mapRef.current.setTerrain({ source: 'terrain-dem', exaggeration: 1.5 });
            setIsTerrainActive(true);
          }
          if (!mapRef.current?.getLayer('threejs-citygml-layer')) {
            const layer = new ThreeCityGmlLayer(threeMode);
            mapRef.current?.addLayer(layer);
            threeLayerRef.current = layer;
          }
        } catch { }
      });
    }
  }, [activeLayer, is3dMode, threeMode]);

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

  // Handle Dropped Temporary Red Location Pin
  useEffect(() => {
    if (!mapRef.current) return;

    if (droppedMarkerRef.current) {
      droppedMarkerRef.current.remove();
      droppedMarkerRef.current = null;
    }

    if (!droppedPin) return;

    const el = document.createElement('div');
    el.className = 'maplibre-dropped-pin';
    el.style.cursor = 'pointer';
    el.innerHTML = `
      <div style="position: relative; display: flex; flex-direction: column; align-items: center;">
        <div style="
          width: 32px;
          height: 32px;
          border-radius: 50% 50% 50% 0;
          background: #e11d48;
          transform: rotate(-45deg);
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 4px 14px rgba(225, 29, 72, 0.45);
          border: 2px solid #ffffff;
        ">
          <div style="width: 10px; height: 10px; border-radius: 50%; background: #ffffff;"></div>
        </div>
      </div>
    `;

    const popupContent = document.createElement('div');
    popupContent.style.padding = '4px 2px';
    popupContent.style.minWidth = '185px';
    popupContent.style.fontFamily = 'inherit';
    popupContent.innerHTML = `
      <div style="display: flex; align-items: center; justify-content: space-between; gap: 4px; margin-bottom: 3px;">
        <span style="font-size: 10px; font-weight: 700; color: #e11d48; text-transform: uppercase; letter-spacing: 0.05em;">Selected Location</span>
      </div>
      <div style="font-family: monospace; font-size: 11px; font-weight: 700; color: #172a3a; margin-bottom: 6px;">
        ${droppedPin.lat.toFixed(5)}, ${droppedPin.lng.toFixed(5)}
      </div>
      <button id="btn-add-place-dropped" style="
        width: 100%;
        background: #2d6b60;
        color: #fffdf5;
        border: none;
        padding: 6px 10px;
        border-radius: 6px;
        font-size: 11px;
        font-weight: 700;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 4px;
        transition: opacity 0.15s;
      ">
        + Add a place here
      </button>
    `;

    const addBtn = popupContent.querySelector('#btn-add-place-dropped');
    if (addBtn) {
      addBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        onAddPlaceAtCoords?.(droppedPin.lat, droppedPin.lng);
      });
    }

    const popup = new maplibregl.Popup({
      offset: 32,
      closeButton: true,
      closeOnClick: false,
    })
      .setLngLat([droppedPin.lng, droppedPin.lat])
      .setDOMContent(popupContent);

    popup.on('close', () => {
      onClearDroppedPin?.();
    });

    const marker = new maplibregl.Marker({
      element: el,
      anchor: 'bottom',
    })
      .setLngLat([droppedPin.lng, droppedPin.lat])
      .setPopup(popup)
      .addTo(mapRef.current);

    marker.togglePopup();
    droppedMarkerRef.current = marker;

    return () => {
      if (droppedMarkerRef.current) {
        droppedMarkerRef.current.remove();
        droppedMarkerRef.current = null;
      }
    };
  }, [droppedPin, onAddPlaceAtCoords, onClearDroppedPin]);

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

  // Handle Calculated Directions Route on MapLibre Canvas
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const sourceId = 'mapveri-directions-route-source';
    const casingLayerId = 'mapveri-directions-route-casing';
    const mainLayerId = 'mapveri-directions-route-line';

    // Clear old route markers
    routeMarkersRef.current.forEach((m) => m.remove());
    routeMarkersRef.current = [];

    const clearRouteLayers = () => {
      try {
        if (map.getLayer(mainLayerId)) map.removeLayer(mainLayerId);
        if (map.getLayer(casingLayerId)) map.removeLayer(casingLayerId);
        if (map.getSource(sourceId)) map.removeSource(sourceId);
      } catch {}
    };

    if (!activeRoute || !activeRoute.coordinates || activeRoute.coordinates.length < 2) {
      clearRouteLayers();
      return;
    }

    const geojsonData = {
      type: 'Feature' as const,
      properties: {},
      geometry: {
        type: 'LineString' as const,
        coordinates: activeRoute.coordinates,
      },
    };

    const applyRoute = () => {
      try {
        const existingSource = map.getSource(sourceId) as maplibregl.GeoJSONSource | undefined;
        if (existingSource) {
          existingSource.setData(geojsonData);
        } else {
          map.addSource(sourceId, {
            type: 'geojson',
            data: geojsonData,
          });

          // Route casing (dark outline)
          map.addLayer({
            id: casingLayerId,
            type: 'line',
            source: sourceId,
            layout: {
              'line-join': 'round',
              'line-cap': 'round',
            },
            paint: {
              'line-color': activeRoute.mode === 'foot' ? '#065f46' : '#1e40af',
              'line-width': 8,
              'line-opacity': 0.85,
            },
          });

          // Route core line (vibrant Google Maps blue or emerald for walking)
          map.addLayer({
            id: mainLayerId,
            type: 'line',
            source: sourceId,
            layout: {
              'line-join': 'round',
              'line-cap': 'round',
            },
            paint: {
              'line-color': activeRoute.mode === 'foot' ? '#10b981' : '#3b82f6',
              'line-width': 5,
              'line-opacity': 1.0,
            },
          });
        }
      } catch (err) {
        console.warn('Error rendering route on map:', err);
      }
    };

    if (map.isStyleLoaded()) {
      applyRoute();
    } else {
      map.once('style.load', applyRoute);
    }

    // Add Start (A) Marker
    const startCoord = activeRoute.sourceCoord || activeRoute.coordinates[0];
    const destCoord = activeRoute.destCoord || activeRoute.coordinates[activeRoute.coordinates.length - 1];

    if (startCoord) {
      const elA = document.createElement('div');
      elA.className = 'route-marker-start';
      elA.style.cursor = 'pointer';
      elA.innerHTML = `
        <div style="position: relative; display: flex; flex-direction: column; align-items: center;">
          <div style="
            width: 28px;
            height: 28px;
            border-radius: 50%;
            background: #10b981;
            border: 2.5px solid #ffffff;
            box-shadow: 0 4px 12px rgba(16,185,129,0.5);
            display: flex;
            align-items: center;
            justify-content: center;
            font-weight: 800;
            font-size: 13px;
            color: #ffffff;
          ">A</div>
          <div style="
            white-space: nowrap;
            background: rgba(16, 185, 129, 0.95);
            color: #ffffff;
            font-size: 10px;
            font-weight: 700;
            padding: 1px 6px;
            border-radius: 4px;
            margin-top: 3px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.2);
            pointer-events: none;
          ">${activeRoute.sourceName ? activeRoute.sourceName.slice(0, 18) : 'Start'}</div>
        </div>
      `;
      const markerA = new maplibregl.Marker({ element: elA, anchor: 'center' })
        .setLngLat(startCoord)
        .addTo(map);
      routeMarkersRef.current.push(markerA);
    }

    // Add Destination (B) Marker
    if (destCoord) {
      const elB = document.createElement('div');
      elB.className = 'route-marker-dest';
      elB.style.cursor = 'pointer';
      elB.innerHTML = `
        <div style="position: relative; display: flex; flex-direction: column; align-items: center;">
          <div style="
            width: 28px;
            height: 28px;
            border-radius: 50%;
            background: #ef4444;
            border: 2.5px solid #ffffff;
            box-shadow: 0 4px 12px rgba(239,68,68,0.5);
            display: flex;
            align-items: center;
            justify-content: center;
            font-weight: 800;
            font-size: 13px;
            color: #ffffff;
          ">B</div>
          <div style="
            white-space: nowrap;
            background: rgba(239, 68, 68, 0.95);
            color: #ffffff;
            font-size: 10px;
            font-weight: 700;
            padding: 1px 6px;
            border-radius: 4px;
            margin-top: 3px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.2);
            pointer-events: none;
          ">${activeRoute.destName ? activeRoute.destName.slice(0, 18) : 'End'}</div>
        </div>
      `;
      const markerB = new maplibregl.Marker({ element: elB, anchor: 'center' })
        .setLngLat(destCoord)
        .addTo(map);
      routeMarkersRef.current.push(markerB);
    }

    // Fit map bounds to show complete route
    try {
      const bounds = new maplibregl.LngLatBounds();
      activeRoute.coordinates.forEach((coord) => bounds.extend(coord));
      map.fitBounds(bounds, {
        padding: { top: 90, bottom: 320, left: 70, right: 70 },
        maxZoom: 16.5,
        duration: 900,
      });
    } catch {}

    return () => {
      routeMarkersRef.current.forEach((m) => m.remove());
      routeMarkersRef.current = [];
    };
  }, [activeRoute]);

  // Handle RailRadar Live Corridor Trains on MapLibre Canvas
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    trainMarkersRef.current.forEach((m) => m.remove());
    trainMarkersRef.current = [];

    if (!isRailRadarActive) return;

    let isMounted = true;

    const updateTrains = async () => {
      try {
        const trains = await fetchRailRadarTrains();
        if (!isMounted || !mapRef.current) return;

        trainMarkersRef.current.forEach((m) => m.remove());
        trainMarkersRef.current = [];

        trains.forEach((train) => {
          if (train.lat === undefined || train.lng === undefined) return;

          const isDelayed = train.status === 'delayed';
          const el = document.createElement('div');
          el.className = 'railradar-train-marker';
          el.style.cursor = 'pointer';
          el.innerHTML = `
            <div style="position: relative; display: flex; align-items: center; gap: 5px; background: rgba(15, 32, 28, 0.95); color: #fff; padding: 3px 8px; border-radius: 20px; border: 2px solid ${isDelayed ? '#f59e0b' : '#10b981'}; box-shadow: 0 4px 14px rgba(0,0,0,0.4); font-family: sans-serif; transition: transform 0.2s;">
              <span style="font-size: 13px;">🚆</span>
              <div style="display: flex; flex-direction: column;">
                <span style="font-weight: 800; font-size: 10px; line-height: 1;">#${train.trainNumber}</span>
                <span style="font-size: 8px; color: ${isDelayed ? '#fbbf24' : '#6ee7b7'}; font-weight: 700;">${train.speedKmph || 0} km/h</span>
              </div>
            </div>
          `;

          const popup = new maplibregl.Popup({ offset: 16, closeButton: false }).setHTML(`
            <div style="font-family: inherit; font-size: 12px; padding: 4px; min-width: 170px;">
              <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 2px;">
                <strong style="color: #205b51;">#${train.trainNumber}</strong>
                <span style="font-size: 9px; font-weight: bold; padding: 1px 4px; border-radius: 4px; background: ${isDelayed ? '#fef3c7' : '#d1fae5'}; color: ${isDelayed ? '#92400e' : '#065f46'};">
                  ${isDelayed ? `Delayed ${train.delayMinutes}m` : 'On Time'}
                </span>
              </div>
              <div style="font-weight: 700; color: #172a3a; font-size: 11px;">${train.trainName}</div>
              <div style="font-size: 10px; color: #556962; margin-top: 3px;">${train.route}</div>
              <div style="font-size: 10px; color: #172a3a; margin-top: 3px;">
                Current: <strong>${train.currentStation}</strong>
              </div>
              <div style="font-size: 9px; color: #71857e; margin-top: 4px; border-top: 1px solid #e5e7eb; padding-top: 3px;">
                Verified Telemetry &bull; RailRadar
              </div>
            </div>
          `);

          const marker = new maplibregl.Marker({ element: el, anchor: 'center' })
            .setLngLat([train.lng, train.lat])
            .setPopup(popup)
            .addTo(mapRef.current!);

          el.addEventListener('mouseenter', () => marker.togglePopup());
          el.addEventListener('mouseleave', () => marker.togglePopup());

          trainMarkersRef.current.push(marker);
        });
      } catch (err) {
        console.warn('Error rendering live RailRadar trains on map:', err);
      }
    };

    updateTrains();
    const interval = setInterval(updateTrains, 12000);

    return () => {
      isMounted = false;
      clearInterval(interval);
      trainMarkersRef.current.forEach((m) => m.remove());
      trainMarkersRef.current = [];
    };
  }, [isRailRadarActive]);

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
          {/* Top Left: Quick Landmark Jumps */}
          {!hideQuickJumps && (
            <div className={`absolute left-4 top-4 z-10 flex flex-wrap gap-2 transition-all duration-300 ${dimOverlays ? 'pointer-events-none opacity-30 blur-[2px]' : 'opacity-100'}`}>
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
          )}

          {/* Floating Live GPS Tracking Badge */}
          {trackingStatus === 'tracking' && currentGpsLocation && (
            <div className={`absolute left-4 top-16 z-10 flex items-center gap-2.5 rounded-xl border border-blue-200 bg-white/95 px-3 py-2 shadow-lg backdrop-blur animate-in fade-in slide-in-from-top-2 transition-all duration-300 ${dimOverlays ? 'pointer-events-none opacity-30 blur-[2px]' : 'opacity-100'}`}>
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
            <div className={`absolute left-4 top-16 z-10 flex items-center gap-2 rounded-xl border border-blue-200 bg-white/95 px-3 py-2 shadow-lg backdrop-blur animate-pulse transition-all duration-300 ${dimOverlays ? 'pointer-events-none opacity-30 blur-[2px]' : 'opacity-100'}`}>
              <Loader2 size={14} className="animate-spin text-blue-600" />
              <span className="text-xs font-semibold text-slate-800">Acquiring GPS Signal...</span>
            </div>
          )}

          {/* Top Right: OSM Controls (Layer Switcher, Locate, Zoom) */}
          <div className={`absolute right-4 top-4 z-10 flex flex-col gap-2 transition-all duration-300 ${dimOverlays ? 'pointer-events-none opacity-30 blur-[2px]' : 'opacity-100'}`}>
            {/* Layer Selector */}
            <div className="relative">
              <button
                onClick={() => setShowLayerMenu(!showLayerMenu)}
                className="flex h-9 w-9 items-center justify-center rounded-lg border border-[#c4d0c6] bg-[#fffdf4] text-[#243f48] shadow-md hover:bg-[#f2efe4] transition"
                title="Map Layers (OSM / Satellite / HOT / OpenTopo / Natural Earth)"
              >
                <Layers size={17} />
              </button>

              {showLayerMenu && (
                <div className="absolute right-0 top-11 w-64 rounded-xl border border-[#c5d0c6] bg-[#fffdf4] p-2 shadow-xl animate-in fade-in zoom-in-95">
                  <p className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-[#708079]">
                    Select Base Map Layer
                  </p>
                  <div className="space-y-1">
                    {Object.entries(TILE_LAYERS).map(([key, config]) => {
                      const LayerIcon =
                        key === 'mapveri'
                          ? Sparkles
                          : key === 'osm'
                            ? Globe
                            : key === 'satellite'
                              ? Layers
                              : Mountain;

                      return (
                        <button
                          key={key}
                          onClick={() => {
                            setActiveLayer(key as TileLayerKey);
                            setShowLayerMenu(false);
                          }}
                          className={`flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left transition ${activeLayer === key
                              ? 'bg-[#2d6b60] text-[#fff8ee]'
                              : 'text-[#243f48] hover:bg-[#f0ebe0]'
                            }`}
                        >
                          <span
                            className={`grid h-7 w-7 shrink-0 place-items-center rounded-md ${activeLayer === key
                                ? 'bg-[#1f4a43] text-[#fff8ee]'
                                : key === 'mapveri'
                                  ? 'bg-amber-100 text-amber-800'
                                  : 'bg-[#e7ece5] text-[#243f48]'
                              }`}
                          >
                            <LayerIcon size={14} />
                          </span>
                          <div className="min-w-0 flex-1">
                            <div className="text-xs font-semibold leading-tight flex items-center gap-1.5">
                              <span>{config.name}</span>
                              {key === 'mapveri' && (
                                <span className={`rounded px-1 py-0.2 text-[8px] font-bold uppercase tracking-wider ${activeLayer === key
                                    ? 'bg-[#1f4a43] text-amber-300 border border-amber-300/40'
                                    : 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                                  }`}>
                                  Featured
                                </span>
                              )}
                            </div>
                            <div
                              className={`text-[10px] leading-tight truncate ${activeLayer === key ? 'text-[#d3e5df]' : 'text-[#708079]'
                                }`}
                            >
                              {config.description}
                            </div>
                          </div>
                          {activeLayer === key && (
                            <span className="text-xs font-bold text-[#fff8ee]">✓</span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Locate Me Button with Real-Time Device GPS Tracking */}
            <button
              onClick={handleLocateMe}
              className={`relative flex h-9 w-9 items-center justify-center rounded-lg border shadow-md transition ${trackingStatus === 'tracking' && isFollowing
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

            {/* RailRadar Live Telemetry Toggle */}
            <button
              onClick={() => setIsRailRadarActive(!isRailRadarActive)}
              className={`relative flex h-9 w-9 items-center justify-center rounded-lg border shadow-md transition ${
                isRailRadarActive
                  ? 'border-emerald-500 bg-[#205b51] text-white shadow-[0_0_14px_rgba(32,91,81,0.45)]'
                  : 'border-[#c4d0c6] bg-[#fffdf4] text-[#243f48] hover:bg-[#f2efe4]'
              }`}
              title={
                isRailRadarActive
                  ? 'RailRadar Live: Active (Click to hide trains)'
                  : 'RailRadar Live: Track active corridor trains'
              }
              aria-label="Toggle RailRadar Live Trains"
            >
              <Train size={18} />
              {isRailRadarActive && (
                <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500 border border-white"></span>
                </span>
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
          <div className={`absolute bottom-3 left-3 right-3 z-10 flex flex-wrap items-center justify-between gap-2 pointer-events-none transition-all duration-300 ${dimOverlays ? 'opacity-30 blur-[2px]' : 'opacity-100'}`}>
            {/* Left: Region & Coordinates Tag */}
            <div className="pointer-events-auto flex items-center gap-2 rounded-lg border border-[#b7c6b9] bg-[#f8f5ea]/95 px-3 py-1.5 text-[11px] font-medium text-[#243f48] shadow-sm backdrop-blur">
              <span className="flex h-2 w-2 rounded-full bg-[#2d6b60]" />
              {!hideQuickJumps && (
                <>
                  <span className="font-bold text-[#1f4a43] flex items-center gap-1">
                    <span>🇮🇳</span>
                    <span>
                      {hoveredDistrict
                        ? `${hoveredDistrict.district}, ${hoveredDistrict.st_nm} (IN)`
                        : activeDistrictInfo
                          ? `${activeDistrictInfo.district}, ${activeDistrictInfo.state} (IN)`
                          : 'Boisar, Maharashtra (IN)'}
                    </span>
                    {hoveredDistrict?.dt_code && (
                      <span className="rounded bg-sky-100 px-1 text-[9px] font-normal text-sky-800">
                        #{hoveredDistrict.dt_code}
                      </span>
                    )}
                  </span>
                  <span className="text-[#8c9c94]">·</span>
                </>
              )}
              <span className="font-mono-map text-[10px] text-[#49655f]">
                {formatDms(currentCoords.lat, true)} {formatDms(currentCoords.lng, false)}
              </span>
              <span className="text-[#8c9c94]">·</span>
              <span className="text-[10px] text-[#708079]">Zoom {zoomLevel}</span>
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

      {/* CesiumJS 3D Planetary Globe Modal View */}
      <Cesium3DGlobe
        isOpen={showCesiumModal}
        onClose={() => setShowCesiumModal(false)}
        pins={pins}
        selectedPinId={selectedId}
        onSelectPin={onSelectPin}
      />
    </div>
  );
}
