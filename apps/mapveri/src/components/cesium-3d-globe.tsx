import { useEffect, useRef, useState, useCallback } from 'react';
import {
  Globe,
  Mountain,
  Building2,
  Layers,
  RotateCw,
  Sun,
  X,
  Compass,
  Eye,
  Maximize2,
  Minimize2,
  Loader2,
  Sparkles,
  Check,
  ChevronDown,
} from 'lucide-react';
import type { Pin, NearbyPin } from '@workspace/api-client-react';
import { BOISAR_CENTER, THEEM_COLLEGE } from './osm-map';
import { BOISAR_CITYGML_BUILDINGS } from '@/lib/three-citygml-layer';

declare global {
  interface Window {
    Cesium?: any;
    CESIUM_BASE_URL?: string;
  }
}

const CESIUM_CDN_JS = 'https://cdn.jsdelivr.net/npm/cesium@1.121.0/Build/Cesium/Cesium.js';
const CESIUM_CDN_CSS = 'https://cdn.jsdelivr.net/npm/cesium@1.121.0/Build/Cesium/Widgets/widgets.css';

export interface Cesium3DGlobeProps {
  isOpen: boolean;
  onClose: () => void;
  pins?: (Pin | NearbyPin)[];
  selectedPinId?: number | null;
  onSelectPin?: (id: number) => void;
}

export function Cesium3DGlobe({
  isOpen,
  onClose,
  pins = [],
  selectedPinId,
  onSelectPin,
}: Cesium3DGlobeProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewerRef = useRef<any>(null);
  const osmBuildingsTilesetRef = useRef<any>(null);
  const cityGmlEntitiesRef = useRef<any[]>([]);
  const orbitIntervalRef = useRef<any>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [terrainEnabled, setTerrainEnabled] = useState(true);
  const [osmBuildingsEnabled, setOsmBuildingsEnabled] = useState(true);
  const [cityGmlEnabled, setCityGmlEnabled] = useState(true);
  const [isOrbiting, setIsOrbiting] = useState(false);
  const [lightingEnabled, setLightingEnabled] = useState(true);
  const [colorMode, setColorMode] = useState<'realistic' | 'semantic' | 'height'>('semantic');
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Mouse HUD position & DEM altitude readout
  const [mouseHud, setMouseHud] = useState<{
    lat: number;
    lng: number;
    elevation: number;
  }>({
    lat: BOISAR_CENTER[0],
    lng: BOISAR_CENTER[1],
    elevation: 16.5,
  });

  // Selected Building Inspector
  const [inspectedBuilding, setInspectedBuilding] = useState<{
    id: string;
    name: string;
    functionType: string;
    height: number;
    roofType: string;
    lod: string;
    year?: number;
    demElevation: number;
  } | null>(null);

  // Load Cesium assets from CDN dynamically
  const ensureCesiumLoaded = useCallback(async (): Promise<any> => {
    if (window.Cesium) return window.Cesium;

    window.CESIUM_BASE_URL = 'https://cdn.jsdelivr.net/npm/cesium@1.121.0/Build/Cesium/';

    // Inject CSS
    if (!document.getElementById('cesium-css')) {
      const link = document.createElement('link');
      link.id = 'cesium-css';
      link.rel = 'stylesheet';
      link.href = CESIUM_CDN_CSS;
      document.head.appendChild(link);
    }

    // Inject JS
    return new Promise((resolve, reject) => {
      const existingScript = document.getElementById('cesium-js') as HTMLScriptElement | null;
      if (existingScript) {
        if (window.Cesium) {
          resolve(window.Cesium);
          return;
        }
        existingScript.addEventListener('load', () => resolve(window.Cesium));
        existingScript.addEventListener('error', () => reject(new Error('Failed to load CesiumJS')));
        return;
      }

      const script = document.createElement('script');
      script.id = 'cesium-js';
      script.src = CESIUM_CDN_JS;
      script.async = true;
      script.onload = () => {
        if (window.Cesium) {
          resolve(window.Cesium);
        } else {
          reject(new Error('Cesium not found after script load'));
        }
      };
      script.onerror = () => reject(new Error('Failed to load Cesium CDN script'));
      document.head.appendChild(script);
    });
  }, []);

  // Initialize Cesium Viewer
  useEffect(() => {
    if (!isOpen || !containerRef.current) return;

    let isMounted = true;
    setIsLoading(true);
    setLoadError(null);

    ensureCesiumLoaded()
      .then(async (Cesium) => {
        if (!isMounted || !containerRef.current) return;

        // Cleanup existing viewer if any
        if (viewerRef.current && !viewerRef.current.isDestroyed()) {
          viewerRef.current.destroy();
          viewerRef.current = null;
        }

        // Initialize Cesium Viewer with DEM Terrain
        let terrainProvider: any;
        try {
          // Attempt Cesium World Terrain
          terrainProvider = await Cesium.createWorldTerrainAsync({
            requestWaterMask: true,
            requestVertexNormals: true,
          });
        } catch {
          // Fallback to Ellipsoid Terrain
          terrainProvider = new Cesium.EllipsoidTerrainProvider();
        }

        const viewer = new Cesium.Viewer(containerRef.current, {
          terrainProvider,
          animation: false,
          baseLayerPicker: false,
          fullscreenButton: false,
          geocoder: false,
          homeButton: false,
          infoBox: false,
          sceneModePicker: false,
          selectionIndicator: false,
          timeline: false,
          navigationHelpButton: false,
          scene3DOnly: true,
          shouldAnimate: true,
        });

        viewerRef.current = viewer;

        // Visual enhancement: Atmosphere, fog, depth test against terrain
        viewer.scene.globe.depthTestAgainstTerrain = true;
        viewer.scene.globe.enableLighting = true;
        viewer.scene.fog.enabled = true;
        viewer.scene.fog.density = 0.00015;

        // Stream OpenStreetMap 3D Buildings via 3D Tiles
        try {
          const osmBuildings = await Cesium.createOsmBuildingsAsync({
            defaultColor: Cesium.Color.fromCssColorString('#cad4df'),
          });
          viewer.scene.primitives.add(osmBuildings);
          osmBuildingsTilesetRef.current = osmBuildings;
          applyTileStyle(osmBuildings, colorMode, Cesium);
        } catch (err) {
          console.warn('Cesium OSM 3D Buildings load notice:', err);
        }

        // Add CityGML Architectural 3D Entities at Boisar & Theem College
        loadCityGmlEntities(viewer, Cesium);

        // Add Mapveri Pins as 3D Billboards
        loadMapveriPins(viewer, Cesium, pins);

        // Fly camera to Theem College & Boisar in 3D perspective
        viewer.camera.flyTo({
          destination: Cesium.Cartesian3.fromDegrees(
            THEEM_COLLEGE[1],
            THEEM_COLLEGE[0] - 0.004,
            420
          ),
          orientation: {
            heading: Cesium.Math.toRadians(15.0),
            pitch: Cesium.Math.toRadians(-35.0),
            roll: 0.0,
          },
          duration: 2.2,
        });

        // Set up mouse move DEM elevation readout
        const handler = new Cesium.ScreenSpaceEventHandler(viewer.scene.canvas);
        handler.setInputAction((movement: any) => {
          const ray = viewer.camera.getRay(movement.endPosition);
          if (!ray) return;
          const position = viewer.scene.globe.pick(ray, viewer.scene);
          if (position) {
            const cartographic = Cesium.Cartographic.fromCartesian(position);
            const lat = Number(Cesium.Math.toDegrees(cartographic.latitude).toFixed(5));
            const lng = Number(Cesium.Math.toDegrees(cartographic.longitude).toFixed(5));
            const elevation = Number(cartographic.height.toFixed(1));
            setMouseHud({ lat, lng, elevation });
          }
        }, Cesium.ScreenSpaceEventType.MOUSE_MOVE);

        // Set up click handler for CityGML Building Inspection
        handler.setInputAction((click: any) => {
          const pickedObject = viewer.scene.pick(click.position);
          if (Cesium.defined(pickedObject) && pickedObject.id && pickedObject.id.properties) {
            const props = pickedObject.id.properties;
            setInspectedBuilding({
              id: props.gmlId?.getValue() || pickedObject.id.id,
              name: props.name?.getValue() || 'CityGML Structure',
              functionType: props.functionType?.getValue() || 'Civic',
              height: props.heightMeters?.getValue() || 24,
              roofType: props.roofType?.getValue() || 'Flat',
              lod: props.lod?.getValue() || 'LOD2',
              year: props.yearBuilt?.getValue(),
              demElevation: props.demElevation?.getValue() || 16.5,
            });
          }
        }, Cesium.ScreenSpaceEventType.LEFT_CLICK);

        setIsLoading(false);
      })
      .catch((err) => {
        console.error('Failed to initialize Cesium 3D Globe:', err);
        if (isMounted) {
          setLoadError(err.message || 'Error loading Cesium 3D engine');
          setIsLoading(false);
        }
      });

    return () => {
      isMounted = false;
      if (orbitIntervalRef.current) {
        clearInterval(orbitIntervalRef.current);
        orbitIntervalRef.current = null;
      }
      if (viewerRef.current && !viewerRef.current.isDestroyed()) {
        viewerRef.current.destroy();
        viewerRef.current = null;
      }
    };
  }, [isOpen, ensureCesiumLoaded]);

  // Apply styling to OSM 3D Buildings based on active mode
  const applyTileStyle = (
    tileset: any,
    mode: 'realistic' | 'semantic' | 'height',
    Cesium: any
  ) => {
    if (!tileset || !Cesium) return;

    if (mode === 'height') {
      tileset.style = new Cesium.Cesium3DTileStyle({
        color: {
          conditions: [
            ['${height} >= 40', 'color("#ef4444", 0.95)'],
            ['${height} >= 25', 'color("#f59e0b", 0.95)'],
            ['${height} >= 15', 'color("#06b6d4", 0.95)'],
            ['true', 'color("#3b82f6", 0.9)'],
          ],
        },
      });
    } else if (mode === 'semantic') {
      tileset.style = new Cesium.Cesium3DTileStyle({
        color: {
          conditions: [
            ['${feature["building"]} === "university" || ${feature["building"]} === "school"', 'color("#3b82f6", 0.95)'],
            ['${feature["building"]} === "commercial"', 'color("#10b981", 0.95)'],
            ['${feature["building"]} === "hospital"', 'color("#ef4444", 0.95)'],
            ['${feature["building"]} === "residential"', 'color("#8b5cf6", 0.95)'],
            ['${feature["building"]} === "train_station"', 'color("#f59e0b", 0.95)'],
            ['true', 'color("#cbd5e1", 0.9)'],
          ],
        },
      });
    } else {
      tileset.style = new Cesium.Cesium3DTileStyle({
        color: 'color("#e2e8f0", 0.92)',
      });
    }
  };

  // Populate CityGML 3D architectural models in Cesium
  const loadCityGmlEntities = (viewer: any, Cesium: any) => {
    cityGmlEntitiesRef.current.forEach((e) => viewer.entities.remove(e));
    cityGmlEntitiesRef.current = [];

    BOISAR_CITYGML_BUILDINGS.forEach((bldg) => {
      // Main Building Body Box
      const color =
        colorMode === 'semantic'
          ? bldg.functionType === 'education'
            ? Cesium.Color.fromCssColorString('#3b82f6').withAlpha(0.95)
            : bldg.functionType === 'transit'
            ? Cesium.Color.fromCssColorString('#f59e0b').withAlpha(0.95)
            : bldg.functionType === 'commercial'
            ? Cesium.Color.fromCssColorString('#10b981').withAlpha(0.95)
            : bldg.functionType === 'residential'
            ? Cesium.Color.fromCssColorString('#8b5cf6').withAlpha(0.95)
            : Cesium.Color.fromCssColorString('#06b6d4').withAlpha(0.95)
          : Cesium.Color.fromCssColorString(bldg.wallColor || '#e2e8f0');

      const entity = viewer.entities.add({
        name: bldg.name,
        position: Cesium.Cartesian3.fromDegrees(bldg.lng, bldg.lat, bldg.heightMeters / 2),
        box: {
          dimensions: new Cesium.Cartesian3(bldg.widthMeters, bldg.depthMeters, bldg.heightMeters),
          material: color,
          outline: true,
          outlineColor: Cesium.Color.WHITE.withAlpha(0.6),
        },
        properties: {
          gmlId: bldg.id,
          name: bldg.name,
          functionType: bldg.functionType,
          heightMeters: bldg.heightMeters,
          roofType: bldg.roofType,
          lod: bldg.lod,
          yearBuilt: bldg.yearBuilt,
          demElevation: 17.5,
        },
      });

      // Roof Marker / Badge
      const roofEntity = viewer.entities.add({
        position: Cesium.Cartesian3.fromDegrees(bldg.lng, bldg.lat, bldg.heightMeters + 3),
        label: {
          text: `[${bldg.lod}] ${bldg.name}`,
          font: 'bold 11px Inter, sans-serif',
          fillColor: Cesium.Color.WHITE,
          outlineColor: Cesium.Color.BLACK,
          outlineWidth: 2,
          style: Cesium.LabelStyle.FILL_AND_OUTLINE,
          pixelOffset: new Cesium.Cartesian2(0, -10),
          distanceDisplayCondition: new Cesium.DistanceDisplayCondition(10.0, 1800.0),
        },
      });

      cityGmlEntitiesRef.current.push(entity, roofEntity);
    });
  };

  // Populate Mapveri Pins as 3D Billboards
  const loadMapveriPins = (viewer: any, Cesium: any, pinList: (Pin | NearbyPin)[]) => {
    pinList.forEach((pin) => {
      viewer.entities.add({
        id: `pin-${pin.id}`,
        name: pin.name,
        position: Cesium.Cartesian3.fromDegrees(pin.lng, pin.lat, 25),
        point: {
          pixelSize: 10,
          color: Cesium.Color.fromCssColorString('#d97706'),
          outlineColor: Cesium.Color.WHITE,
          outlineWidth: 2,
        },
        label: {
          text: pin.name,
          font: '12px Inter, sans-serif',
          fillColor: Cesium.Color.WHITE,
          outlineColor: Cesium.Color.BLACK,
          outlineWidth: 2,
          style: Cesium.LabelStyle.FILL_AND_OUTLINE,
          pixelOffset: new Cesium.Cartesian2(0, -18),
          distanceDisplayCondition: new Cesium.DistanceDisplayCondition(20.0, 3500.0),
        },
      });
    });
  };

  // Toggle Cesium World Terrain vs Flat Ellipsoid
  const handleToggleTerrain = async () => {
    if (!viewerRef.current || !window.Cesium) return;
    const Cesium = window.Cesium;
    const viewer = viewerRef.current;

    const nextState = !terrainEnabled;
    setTerrainEnabled(nextState);

    if (nextState) {
      try {
        const terrain = await Cesium.createWorldTerrainAsync({
          requestWaterMask: true,
          requestVertexNormals: true,
        });
        viewer.terrainProvider = terrain;
        viewer.scene.globe.depthTestAgainstTerrain = true;
      } catch {
        viewer.terrainProvider = new Cesium.EllipsoidTerrainProvider();
      }
    } else {
      viewer.terrainProvider = new Cesium.EllipsoidTerrainProvider();
      viewer.scene.globe.depthTestAgainstTerrain = false;
    }
  };

  // Toggle OSM 3D Buildings
  const handleToggleOsmBuildings = () => {
    if (!osmBuildingsTilesetRef.current) return;
    const nextState = !osmBuildingsEnabled;
    setOsmBuildingsEnabled(nextState);
    osmBuildingsTilesetRef.current.show = nextState;
  };

  // Toggle CityGML Entities
  const handleToggleCityGml = () => {
    const nextState = !cityGmlEnabled;
    setCityGmlEnabled(nextState);
    cityGmlEntitiesRef.current.forEach((e) => {
      e.show = nextState;
    });
  };

  // Change Color Mode (Realistic, Semantic, Height)
  const handleChangeColorMode = (mode: 'realistic' | 'semantic' | 'height') => {
    setColorMode(mode);
    if (viewerRef.current && window.Cesium) {
      if (osmBuildingsTilesetRef.current) {
        applyTileStyle(osmBuildingsTilesetRef.current, mode, window.Cesium);
      }
      loadCityGmlEntities(viewerRef.current, window.Cesium);
    }
  };

  // Fly Camera to Theem College
  const handleFlyTheem = () => {
    if (!viewerRef.current || !window.Cesium) return;
    const Cesium = window.Cesium;
    viewerRef.current.camera.flyTo({
      destination: Cesium.Cartesian3.fromDegrees(
        THEEM_COLLEGE[1],
        THEEM_COLLEGE[0] - 0.0035,
        380
      ),
      orientation: {
        heading: Cesium.Math.toRadians(10.0),
        pitch: Cesium.Math.toRadians(-32.0),
        roll: 0.0,
      },
      duration: 1.8,
    });
  };

  // Fly Camera to Boisar Town Center
  const handleFlyBoisar = () => {
    if (!viewerRef.current || !window.Cesium) return;
    const Cesium = window.Cesium;
    viewerRef.current.camera.flyTo({
      destination: Cesium.Cartesian3.fromDegrees(
        BOISAR_CENTER[1],
        BOISAR_CENTER[0] - 0.006,
        650
      ),
      orientation: {
        heading: Cesium.Math.toRadians(0.0),
        pitch: Cesium.Math.toRadians(-40.0),
        roll: 0.0,
      },
      duration: 1.8,
    });
  };

  // Toggle Continuous Cinematic 360° Orbit
  const handleToggleOrbit = () => {
    if (!viewerRef.current || !window.Cesium) return;
    const Cesium = window.Cesium;
    const viewer = viewerRef.current;

    if (isOrbiting) {
      if (orbitIntervalRef.current) {
        clearInterval(orbitIntervalRef.current);
        orbitIntervalRef.current = null;
      }
      setIsOrbiting(false);
    } else {
      setIsOrbiting(true);
      orbitIntervalRef.current = setInterval(() => {
        viewer.camera.rotate(Cesium.Cartesian3.UNIT_Z, 0.004);
      }, 30);
    }
  };

  // Toggle Day/Night Lighting
  const handleToggleLighting = () => {
    if (!viewerRef.current) return;
    const nextState = !lightingEnabled;
    setLightingEnabled(nextState);
    viewerRef.current.scene.globe.enableLighting = nextState;
  };

  if (!isOpen) return null;

  return (
    <div
      className={`fixed inset-0 z-[2000] flex flex-col bg-slate-950 text-white animate-in fade-in duration-200 select-none ${
        isFullscreen ? 'p-0' : 'p-2 sm:p-4'
      }`}
    >
      {/* 3D Glass Header */}
      <header className="relative z-10 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/10 bg-slate-900/90 px-4 py-2.5 shadow-2xl backdrop-blur-md">
        {/* Left: Branding & 3D Status */}
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-sky-600 to-indigo-500 shadow-md">
            <Globe size={20} className="text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold tracking-tight text-white">CesiumJS 3D Globe</h2>
              <span className="rounded bg-sky-500/20 px-1.5 py-0.5 text-[9px] font-extrabold uppercase tracking-wider text-sky-400 border border-sky-400/30">
                Cesium DEM + 3D Tiles
              </span>
              <span className="rounded bg-emerald-500/20 px-1.5 py-0.5 text-[9px] font-extrabold uppercase tracking-wider text-emerald-400 border border-emerald-400/30">
                CityGML LOD2/3
              </span>
            </div>
            <p className="text-[11px] text-slate-400">
              Worldwide OSM 3D building footprints & Digital Elevation Model terrain
            </p>
          </div>
        </div>

        {/* Center: Camera Quick Jumps */}
        <div className="flex items-center gap-1.5 overflow-x-auto py-1">
          <button
            onClick={handleFlyTheem}
            className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-2.5 py-1.5 text-xs font-semibold text-slate-200 hover:bg-white/15 hover:text-white transition"
            title="Fly to Theem College Campus"
          >
            <span className="h-2 w-2 rounded-full bg-emerald-400" />
            Theem College
          </button>
          <button
            onClick={handleFlyBoisar}
            className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-2.5 py-1.5 text-xs font-semibold text-slate-200 hover:bg-white/15 hover:text-white transition"
            title="Fly to Boisar Town Center"
          >
            <Compass size={13} className="text-amber-400" />
            Boisar Center
          </button>
          <button
            onClick={handleToggleOrbit}
            className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-semibold transition ${
              isOrbiting
                ? 'border-indigo-400 bg-indigo-600/30 text-indigo-300 shadow-[0_0_10px_rgba(99,102,241,0.4)]'
                : 'border-white/10 bg-white/5 text-slate-200 hover:bg-white/15'
            }`}
            title="Toggle 360° Cinematic Orbit"
          >
            <RotateCw size={13} className={isOrbiting ? 'animate-spin' : ''} />
            360&deg; Orbit
          </button>
        </div>

        {/* Right: Window Controls */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsFullscreen(!isFullscreen)}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-slate-300 hover:bg-white/15 hover:text-white transition"
            title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
          >
            {isFullscreen ? <Minimize2 size={15} /> : <Maximize2 size={15} />}
          </button>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-red-500/30 bg-red-500/10 text-red-400 hover:bg-red-500/20 hover:text-red-300 transition"
            title="Close Cesium 3D Globe"
          >
            <X size={18} />
          </button>
        </div>
      </header>

      {/* Main 3D Canvas Area */}
      <div className="relative flex-1 min-h-0 overflow-hidden rounded-2xl border border-white/10 mt-2 bg-slate-950">
        {/* Cesium Mount Container */}
        <div ref={containerRef} className="h-full w-full" />

        {/* Loading Spinner */}
        {isLoading && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950/80 backdrop-blur-md z-30">
            <Loader2 size={36} className="animate-spin text-sky-400 mb-3" />
            <h3 className="text-sm font-bold text-white">Loading Cesium 3D Engine & DEM Terrain...</h3>
            <p className="text-xs text-slate-400 mt-1">
              Streaming OGC 3D Tiles & OpenStreetMap building footprints
            </p>
          </div>
        )}

        {/* Error Fallback */}
        {loadError && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950/90 backdrop-blur-md z-30 p-6 text-center">
            <div className="rounded-full bg-red-500/20 p-3 text-red-400 mb-3 border border-red-500/30">
              <X size={28} />
            </div>
            <h3 className="text-base font-bold text-white mb-1">Cesium 3D Initialization Notice</h3>
            <p className="text-xs text-slate-400 max-w-md mb-4">{loadError}</p>
            <button
              onClick={onClose}
              className="rounded-xl bg-slate-800 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-700"
            >
              Back to Interactive Map
            </button>
          </div>
        )}

        {/* Left Floating 3D Controls Palette */}
        <div className="absolute left-4 top-4 z-20 flex flex-col gap-2 rounded-2xl border border-white/10 bg-slate-900/85 p-2 shadow-2xl backdrop-blur-md">
          {/* DEM Terrain Toggle */}
          <button
            onClick={handleToggleTerrain}
            className={`flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold transition ${
              terrainEnabled
                ? 'bg-sky-500/20 text-sky-300 border border-sky-500/30'
                : 'text-slate-400 hover:bg-white/5 hover:text-slate-200'
            }`}
            title="Toggle Cesium World Terrain & Elevation"
          >
            <Mountain size={15} />
            <span>DEM Terrain</span>
            <span className="ml-auto text-[10px] opacity-70">
              {terrainEnabled ? 'ON' : 'OFF'}
            </span>
          </button>

          {/* OSM 3D Buildings & 3D Tiles Toggle */}
          <button
            onClick={handleToggleOsmBuildings}
            className={`flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold transition ${
              osmBuildingsEnabled
                ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
                : 'text-slate-400 hover:bg-white/5 hover:text-slate-200'
            }`}
            title="Toggle OpenStreetMap 3D Building Footprints & 3D Tiles"
          >
            <Building2 size={15} />
            <span>OSM 3D Tiles</span>
            <span className="ml-auto text-[10px] opacity-70">
              {osmBuildingsEnabled ? 'ON' : 'OFF'}
            </span>
          </button>

          {/* CityGML Layer Toggle */}
          <button
            onClick={handleToggleCityGml}
            className={`flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold transition ${
              cityGmlEnabled
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                : 'text-slate-400 hover:bg-white/5 hover:text-slate-200'
            }`}
            title="Toggle CityGML Architectural Models"
          >
            <Layers size={15} />
            <span>CityGML LOD2/3</span>
            <span className="ml-auto text-[10px] opacity-70">
              {cityGmlEnabled ? 'ON' : 'OFF'}
            </span>
          </button>

          {/* Lighting Toggle */}
          <button
            onClick={handleToggleLighting}
            className={`flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold transition ${
              lightingEnabled
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                : 'text-slate-400 hover:bg-white/5 hover:text-slate-200'
            }`}
            title="Toggle Sun Lighting & Atmosphere"
          >
            <Sun size={15} />
            <span>Sun Lighting</span>
            <span className="ml-auto text-[10px] opacity-70">
              {lightingEnabled ? 'ON' : 'OFF'}
            </span>
          </button>

          <div className="my-1 border-t border-white/10" />

          {/* Color Scheme Dropdown / Selector */}
          <div className="px-1 py-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              3D Styling Mode
            </span>
            <div className="grid grid-cols-3 gap-1 mt-1.5">
              <button
                onClick={() => handleChangeColorMode('semantic')}
                className={`rounded-lg py-1 text-[10px] font-semibold transition ${
                  colorMode === 'semantic'
                    ? 'bg-sky-600 text-white shadow-sm'
                    : 'bg-white/5 text-slate-400 hover:bg-white/10'
                }`}
                title="Color by CityGML Function / Land Use"
              >
                Semantic
              </button>
              <button
                onClick={() => handleChangeColorMode('height')}
                className={`rounded-lg py-1 text-[10px] font-semibold transition ${
                  colorMode === 'height'
                    ? 'bg-sky-600 text-white shadow-sm'
                    : 'bg-white/5 text-slate-400 hover:bg-white/10'
                }`}
                title="Color by Building Height Heatmap"
              >
                Height
              </button>
              <button
                onClick={() => handleChangeColorMode('realistic')}
                className={`rounded-lg py-1 text-[10px] font-semibold transition ${
                  colorMode === 'realistic'
                    ? 'bg-sky-600 text-white shadow-sm'
                    : 'bg-white/5 text-slate-400 hover:bg-white/10'
                }`}
                title="Realistic Architectural Colors"
              >
                Realistic
              </button>
            </div>
          </div>
        </div>

        {/* Selected CityGML Structure Inspector Card */}
        {inspectedBuilding && (
          <div className="absolute right-4 top-4 z-20 w-80 rounded-2xl border border-sky-400/30 bg-slate-900/90 p-4 shadow-2xl backdrop-blur-md animate-in fade-in slide-in-from-right-4">
            <div className="flex items-start justify-between gap-2 mb-2">
              <div className="flex items-center gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-sky-500/20 text-sky-400">
                  <Building2 size={16} />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-white leading-tight">
                    {inspectedBuilding.name}
                  </h4>
                  <span className="text-[10px] font-mono text-sky-400">
                    {inspectedBuilding.id}
                  </span>
                </div>
              </div>
              <button
                onClick={() => setInspectedBuilding(null)}
                className="rounded p-1 text-slate-400 hover:bg-white/10 hover:text-white"
                aria-label="Close Inspector"
              >
                <X size={14} />
              </button>
            </div>

            <div className="space-y-1.5 mt-3 text-[11px]">
              <div className="flex justify-between py-1 border-b border-white/5">
                <span className="text-slate-400">Standard / LOD:</span>
                <span className="font-semibold text-emerald-400">
                  CityGML {inspectedBuilding.lod}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-white/5">
                <span className="text-slate-400">Building Function:</span>
                <span className="font-semibold text-slate-200 capitalize">
                  {inspectedBuilding.functionType}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-white/5">
                <span className="text-slate-400">Measured Height:</span>
                <span className="font-semibold text-amber-300">
                  {inspectedBuilding.height} meters
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-white/5">
                <span className="text-slate-400">Roof Geometry:</span>
                <span className="font-semibold text-slate-200 capitalize">
                  {inspectedBuilding.roofType} Roof
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-white/5">
                <span className="text-slate-400">DEM Ground Elevation:</span>
                <span className="font-semibold text-sky-300">
                  +{inspectedBuilding.demElevation} m MSL
                </span>
              </div>
              {inspectedBuilding.year && (
                <div className="flex justify-between py-1">
                  <span className="text-slate-400">Year Built:</span>
                  <span className="font-semibold text-slate-300">
                    {inspectedBuilding.year}
                  </span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Real-Time Mouse Coordinates & DEM Altitude Badge */}
        <div className="absolute bottom-3 left-3 z-20 flex items-center gap-3 rounded-xl border border-white/10 bg-slate-900/85 px-3 py-1.5 text-[11px] font-medium text-slate-200 shadow-xl backdrop-blur-md">
          <div className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-slate-400">Coordinates:</span>
            <span className="font-mono text-slate-200">
              {mouseHud.lat.toFixed(4)}&deg; N, {mouseHud.lng.toFixed(4)}&deg; E
            </span>
          </div>
          <span className="text-slate-600">|</span>
          <div className="flex items-center gap-1.5">
            <Mountain size={12} className="text-sky-400" />
            <span className="text-slate-400">DEM Surface:</span>
            <span className="font-mono font-bold text-sky-300">
              {mouseHud.elevation} m
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
