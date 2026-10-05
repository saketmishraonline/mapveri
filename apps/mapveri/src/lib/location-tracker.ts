import * as maplibregl from 'maplibre-gl';

export interface GpsLocationData {
  latitude: number;
  longitude: number;
  accuracy: number;
  altitude: number | null;
  altitudeAccuracy: number | null;
  heading: number | null;
  speed: number | null;
  timestamp: number;
}

export type TrackingStatus = 'idle' | 'locating' | 'tracking' | 'error';

export interface LocationTrackerOptions {
  enableHighAccuracy?: boolean;
  timeout?: number;
  maximumAge?: number;
  onLocationUpdate?: (location: GpsLocationData) => void;
  onError?: (error: GeolocationPositionError | Error) => void;
  onStatusChange?: (status: TrackingStatus, isFollowing: boolean) => void;
}

export interface GeoJsonPolygonFeature {
  type: 'Feature';
  geometry: {
    type: 'Polygon';
    coordinates: [number, number][][];
  };
  properties: Record<string, unknown>;
}

const ACCURACY_SOURCE_ID = 'mapveri-gps-accuracy-source';
const ACCURACY_FILL_LAYER_ID = 'mapveri-gps-accuracy-fill';
const ACCURACY_LINE_LAYER_ID = 'mapveri-gps-accuracy-line';

/**
 * Creates a GeoJSON circle polygon for the GPS accuracy radius
 */
export function createAccuracyCircleGeoJson(
  lng: number,
  lat: number,
  radiusInMeters: number,
  points = 64
): GeoJsonPolygonFeature {
  const safeRadius = Math.max(radiusInMeters, 4);
  const km = safeRadius / 1000;
  const coordinates: [number, number][] = [];
  const distanceX = km / (111.32 * Math.cos((lat * Math.PI) / 180));
  const distanceY = km / 110.574;

  for (let i = 0; i < points; i++) {
    const theta = (i / points) * (2 * Math.PI);
    const x = distanceX * Math.cos(theta);
    const y = distanceY * Math.sin(theta);
    coordinates.push([lng + x, lat + y]);
  }
  coordinates.push(coordinates[0]);

  return {
    type: 'Feature',
    geometry: {
      type: 'Polygon',
      coordinates: [coordinates],
    },
    properties: {},
  };
}

let stylesInjected = false;
function injectTrackerStyles() {
  if (stylesInjected || typeof document === 'undefined') return;
  const styleEl = document.createElement('style');
  styleEl.id = 'mapveri-gps-tracker-styles';
  styleEl.innerHTML = `
    @keyframes gps-radar-pulse {
      0% {
        transform: scale(0.65);
        opacity: 0.85;
      }
      70% {
        transform: scale(2.2);
        opacity: 0.15;
      }
      100% {
        transform: scale(2.6);
        opacity: 0;
      }
    }

    .gps-marker-container {
      position: relative;
      width: 48px;
      height: 48px;
      display: flex;
      align-items: center;
      justify-content: center;
      pointer-events: auto;
      cursor: pointer;
    }

    .gps-radar-wave {
      position: absolute;
      width: 38px;
      height: 38px;
      border-radius: 50%;
      background: radial-gradient(circle, rgba(37, 99, 235, 0.4) 0%, rgba(37, 99, 235, 0.05) 75%);
      border: 1.5px solid rgba(37, 99, 235, 0.5);
      animation: gps-radar-pulse 2.2s cubic-bezier(0.2, 0.6, 0.35, 1) infinite;
      pointer-events: none;
    }

    .gps-heading-indicator {
      position: absolute;
      top: -6px;
      width: 0;
      height: 0;
      border-left: 6px solid transparent;
      border-right: 6px solid transparent;
      border-bottom: 12px solid #2563eb;
      filter: drop-shadow(0 1px 2px rgba(0,0,0,0.35));
      transition: transform 0.2s ease-out;
      transform-origin: 50% 30px;
      pointer-events: none;
    }

    .gps-puck-outer {
      position: relative;
      width: 20px;
      height: 20px;
      background: #ffffff;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.35), 0 0 0 1.5px rgba(0, 0, 0, 0.1);
      z-index: 2;
    }

    .gps-puck-inner {
      width: 14px;
      height: 14px;
      background: #2563eb;
      border-radius: 50%;
      box-shadow: inset 0 1px 2px rgba(255,255,255,0.4);
    }
  `;
  document.head.appendChild(styleEl);
  stylesInjected = true;
}

/**
 * Attempts to retrieve approximate location via network IP as fallback
 */
export async function getApproximateIpLocation(): Promise<GpsLocationData | null> {
  try {
    const res = await fetch('https://ipapi.co/json/', { signal: AbortSignal.timeout(4000) });
    if (!res.ok) throw new Error('ipapi non-200');
    const data = await res.json();
    if (data.latitude && data.longitude) {
      return {
        latitude: Number(data.latitude),
        longitude: Number(data.longitude),
        accuracy: 2500,
        altitude: null,
        altitudeAccuracy: null,
        heading: null,
        speed: null,
        timestamp: Date.now(),
      };
    }
  } catch {
    // Secondary fallback
    try {
      const res = await fetch('https://freeipapi.com/api/json', { signal: AbortSignal.timeout(4000) });
      const data = await res.json();
      if (data.latitude && data.longitude) {
        return {
          latitude: Number(data.latitude),
          longitude: Number(data.longitude),
          accuracy: 5000,
          altitude: null,
          altitudeAccuracy: null,
          heading: null,
          speed: null,
          timestamp: Date.now(),
        };
      }
    } catch {
      return null;
    }
  }
  return null;
}

export class LocationTracker {
  private map: maplibregl.Map | null = null;
  private watchId: number | null = null;
  private marker: maplibregl.Marker | null = null;
  private markerElement: HTMLDivElement | null = null;
  private headingElement: HTMLDivElement | null = null;
  private popup: maplibregl.Popup | null = null;
  private orientationListener: ((e: DeviceOrientationEvent) => void) | null = null;
  private dragListener: (() => void) | null = null;
  private styleLoadListener: (() => void) | null = null;

  private status: TrackingStatus = 'idle';
  private isFollowing = false;
  private currentLocation: GpsLocationData | null = null;
  private currentHeading: number | null = null;
  private error: string | null = null;
  private options: LocationTrackerOptions;

  constructor(options: LocationTrackerOptions = {}) {
    this.options = {
      enableHighAccuracy: true,
      timeout: 15000,
      maximumAge: 0,
      ...options,
    };
    injectTrackerStyles();
  }

  public setMap(map: maplibregl.Map | null) {
    if (this.map === map) return;

    if (this.map) {
      this.cleanupMapListeners();
      this.removeAccuracyLayers();
      if (this.marker) {
        this.marker.remove();
        this.marker = null;
      }
    }

    this.map = map;

    if (this.map) {
      this.setupMapListeners();
      if (this.status === 'tracking' && this.currentLocation) {
        this.renderMarker(this.currentLocation);
        this.updateAccuracyCircle(this.currentLocation);
      }
    }
  }

  public getStatus(): TrackingStatus {
    return this.status;
  }

  public getIsFollowing(): boolean {
    return this.isFollowing;
  }

  public getCurrentLocation(): GpsLocationData | null {
    return this.currentLocation;
  }

  public getError(): string | null {
    return this.error;
  }

  public startTracking() {
    // Check if browser is in secure context (Chrome blocks GPS on HTTP non-localhost)
    if (typeof window !== 'undefined' && window.isSecureContext === false) {
      const isIp = /^https?:\/\/\d+\.\d+\.\d+\.\d+/.test(window.location.href);
      const port = window.location.port || '5173';
      const msg = isIp
        ? `Only secure origins are allowed. Chrome blocks GPS on local IP addresses (${window.location.hostname}). Please open via https://localhost:${port} or use HTTPS.`
        : 'Only secure origins are allowed (HTTPS is required by Chrome for GPS).';
      
      this.error = msg;
      this.updateStatus('error');
      this.options.onError?.(new Error(msg));
      return;
    }

    if (!('geolocation' in navigator)) {
      this.updateStatus('error');
      this.error = 'Geolocation is not supported by your browser.';
      this.options.onError?.(new Error(this.error));
      return;
    }

    this.updateStatus('locating');
    this.isFollowing = true;
    this.error = null;
    this.notifyStatusChange();

    // Start watching position
    this.stopWatcher();

    this.watchId = navigator.geolocation.watchPosition(
      (pos) => this.handlePositionSuccess(pos),
      (err) => this.handlePositionError(err),
      {
        enableHighAccuracy: this.options.enableHighAccuracy,
        timeout: this.options.timeout,
        maximumAge: this.options.maximumAge,
      }
    );

    this.setupOrientationListener();
  }

  public async fallbackToIpLocation(): Promise<GpsLocationData | null> {
    this.updateStatus('locating');
    this.isFollowing = true;
    this.error = null;
    this.notifyStatusChange();

    const loc = await getApproximateIpLocation();
    if (!loc) {
      this.error = 'Unable to estimate location via network IP.';
      this.updateStatus('error');
      this.notifyStatusChange();
      return null;
    }

    this.currentLocation = loc;
    this.status = 'tracking';
    this.error = null;

    this.renderMarker(loc);
    this.updateAccuracyCircle(loc);

    if (this.map) {
      this.map.flyTo({
        center: [loc.longitude, loc.latitude],
        zoom: 14,
        duration: 1200,
      });
    }

    this.notifyStatusChange();
    this.options.onLocationUpdate?.(loc);
    return loc;
  }

  public stopTracking() {
    this.stopWatcher();
    this.removeOrientationListener();
    this.removeMarker();
    this.removeAccuracyLayers();

    this.status = 'idle';
    this.isFollowing = false;
    this.currentLocation = null;
    this.notifyStatusChange();
  }

  public toggleTracking() {
    if (this.status === 'tracking') {
      if (!this.isFollowing && this.currentLocation) {
        // Re-center if user panned away
        this.recenter();
      } else {
        // Turn off if already following
        this.stopTracking();
      }
    } else {
      this.startTracking();
    }
  }

  public recenter() {
    if (!this.currentLocation || !this.map) {
      if (this.status !== 'tracking') {
        this.startTracking();
      }
      return;
    }

    this.isFollowing = true;
    this.notifyStatusChange();

    this.map.flyTo({
      center: [this.currentLocation.longitude, this.currentLocation.latitude],
      zoom: Math.max(this.map.getZoom(), 16),
      duration: 1000,
    });
  }

  public destroy() {
    this.stopTracking();
    this.cleanupMapListeners();
    this.map = null;
  }

  private handlePositionSuccess(pos: GeolocationPosition) {
    const loc: GpsLocationData = {
      latitude: pos.coords.latitude,
      longitude: pos.coords.longitude,
      accuracy: pos.coords.accuracy,
      altitude: pos.coords.altitude,
      altitudeAccuracy: pos.coords.altitudeAccuracy,
      heading: pos.coords.heading ?? this.currentHeading,
      speed: pos.coords.speed,
      timestamp: pos.timestamp,
    };

    const isFirstFix = this.status !== 'tracking';
    this.currentLocation = loc;
    this.status = 'tracking';
    this.error = null;

    this.renderMarker(loc);
    this.updateAccuracyCircle(loc);

    if (this.isFollowing && this.map) {
      if (isFirstFix) {
        this.map.flyTo({
          center: [loc.longitude, loc.latitude],
          zoom: 16,
          duration: 1200,
        });
      } else {
        this.map.easeTo({
          center: [loc.longitude, loc.latitude],
          duration: 800,
        });
      }
    }

    this.notifyStatusChange();
    this.options.onLocationUpdate?.(loc);
  }

  private handlePositionError(err: GeolocationPositionError) {
    let msg = 'Failed to get GPS location.';
    switch (err.code) {
      case err.PERMISSION_DENIED:
        msg = 'Location permission denied. Please allow location access in your browser.';
        break;
      case err.POSITION_UNAVAILABLE:
        msg = 'GPS signal unavailable. Please ensure location services are enabled on your device.';
        break;
      case err.TIMEOUT:
        msg = 'GPS request timed out. Searching for GPS signal...';
        break;
    }

    this.error = msg;
    if (this.status !== 'tracking') {
      this.status = 'error';
    }
    this.notifyStatusChange();
    this.options.onError?.(err);
  }

  private renderMarker(loc: GpsLocationData) {
    if (!this.map) return;

    if (!this.markerElement) {
      const container = document.createElement('div');
      container.className = 'gps-marker-container';

      const radar = document.createElement('div');
      radar.className = 'gps-radar-wave';
      container.appendChild(radar);

      const heading = document.createElement('div');
      heading.className = 'gps-heading-indicator';
      heading.style.display = 'none';
      container.appendChild(heading);
      this.headingElement = heading;

      const puckOuter = document.createElement('div');
      puckOuter.className = 'gps-puck-outer';
      const puckInner = document.createElement('div');
      puckInner.className = 'gps-puck-inner';
      puckOuter.appendChild(puckInner);
      container.appendChild(puckOuter);

      this.markerElement = container;

      this.popup = new maplibregl.Popup({
        offset: 16,
        closeButton: true,
        closeOnClick: false,
      });

      this.marker = new maplibregl.Marker({
        element: container,
        anchor: 'center',
      })
        .setLngLat([loc.longitude, loc.latitude])
        .setPopup(this.popup)
        .addTo(this.map);
    } else {
      this.marker?.setLngLat([loc.longitude, loc.latitude]);
    }

    this.updateMarkerPopup(loc);
    this.updateHeadingDisplay(loc.heading);
  }

  private updateMarkerPopup(loc: GpsLocationData) {
    if (!this.popup) return;

    const latStr = `${Math.abs(loc.latitude).toFixed(5)}° ${loc.latitude >= 0 ? 'N' : 'S'}`;
    const lngStr = `${Math.abs(loc.longitude).toFixed(5)}° ${loc.longitude >= 0 ? 'E' : 'W'}`;
    const accuracyStr = `±${Math.round(loc.accuracy)}m`;
    const speedStr = loc.speed !== null && loc.speed > 0.5 ? `${(loc.speed * 3.6).toFixed(1)} km/h` : null;

    this.popup.setHTML(`
      <div style="font-family: inherit; font-size: 12px; line-height: 1.4; padding: 2px 4px; color: #172a3a;">
        <div style="font-weight: 700; display: flex; align-items: center; gap: 5px; color: #2563eb; margin-bottom: 3px;">
          <span style="display:inline-block; width:8px; height:8px; border-radius:50%; background:#2563eb;"></span>
          Your GPS Location
        </div>
        <div style="font-size: 11px; color: #475569; font-family: monospace;">
          ${latStr}, ${lngStr}
        </div>
        <div style="display:flex; gap:8px; margin-top: 4px; font-size: 10px; color: #64748b;">
          <span>Accuracy: <strong>${accuracyStr}</strong></span>
          ${speedStr ? `<span>Speed: <strong>${speedStr}</strong></span>` : ''}
        </div>
      </div>
    `);
  }

  private updateHeadingDisplay(headingDeg: number | null) {
    if (!this.headingElement) return;

    if (headingDeg !== null && !isNaN(headingDeg)) {
      this.headingElement.style.display = 'block';
      this.headingElement.style.transform = `rotate(${headingDeg}deg)`;
    } else {
      this.headingElement.style.display = 'none';
    }
  }

  private updateAccuracyCircle(loc: GpsLocationData) {
    if (!this.map) return;

    const geoJson = createAccuracyCircleGeoJson(loc.longitude, loc.latitude, loc.accuracy);

    const source = this.map.getSource(ACCURACY_SOURCE_ID) as maplibregl.GeoJSONSource | undefined;
    if (source) {
      source.setData(geoJson as any);
    } else {
      this.addAccuracyLayers(geoJson);
    }
  }

  private addAccuracyLayers(initialData: GeoJsonPolygonFeature) {
    if (!this.map) return;

    try {
      if (!this.map.getSource(ACCURACY_SOURCE_ID)) {
        this.map.addSource(ACCURACY_SOURCE_ID, {
          type: 'geojson',
          data: initialData as any,
        });
      }

      if (!this.map.getLayer(ACCURACY_FILL_LAYER_ID)) {
        this.map.addLayer({
          id: ACCURACY_FILL_LAYER_ID,
          type: 'fill',
          source: ACCURACY_SOURCE_ID,
          paint: {
            'fill-color': '#2563eb',
            'fill-opacity': 0.12,
          },
        });
      }

      if (!this.map.getLayer(ACCURACY_LINE_LAYER_ID)) {
        this.map.addLayer({
          id: ACCURACY_LINE_LAYER_ID,
          type: 'line',
          source: ACCURACY_SOURCE_ID,
          paint: {
            'line-color': '#2563eb',
            'line-opacity': 0.35,
            'line-width': 1.5,
          },
        });
      }
    } catch {
      // Ignored if map style is currently re-loading
    }
  }

  private removeAccuracyLayers() {
    if (!this.map) return;
    try {
      if (this.map.getLayer(ACCURACY_LINE_LAYER_ID)) {
        this.map.removeLayer(ACCURACY_LINE_LAYER_ID);
      }
      if (this.map.getLayer(ACCURACY_FILL_LAYER_ID)) {
        this.map.removeLayer(ACCURACY_FILL_LAYER_ID);
      }
      if (this.map.getSource(ACCURACY_SOURCE_ID)) {
        this.map.removeSource(ACCURACY_SOURCE_ID);
      }
    } catch {
      // Ignore cleanup error
    }
  }

  private removeMarker() {
    if (this.marker) {
      this.marker.remove();
      this.marker = null;
      this.markerElement = null;
      this.headingElement = null;
      this.popup = null;
    }
  }

  private stopWatcher() {
    if (this.watchId !== null) {
      navigator.geolocation.clearWatch(this.watchId);
      this.watchId = null;
    }
  }

  private setupOrientationListener() {
    if (typeof window === 'undefined' || this.orientationListener) return;

    this.orientationListener = (e: DeviceOrientationEvent) => {
      const heading = (e as any).webkitCompassHeading ?? (e.alpha !== null ? 360 - e.alpha : null);
      if (heading !== null && !isNaN(heading)) {
        this.currentHeading = heading;
        this.updateHeadingDisplay(heading);
      }
    };

    const win = window as any;
    if ('ondeviceorientationabsolute' in win) {
      win.addEventListener('deviceorientationabsolute', this.orientationListener, true);
    } else if ('ondeviceorientation' in win) {
      win.addEventListener('deviceorientation', this.orientationListener, true);
    }
  }

  private removeOrientationListener() {
    if (this.orientationListener && typeof window !== 'undefined') {
      const win = window as any;
      win.removeEventListener('deviceorientationabsolute', this.orientationListener, true);
      win.removeEventListener('deviceorientation', this.orientationListener, true);
      this.orientationListener = null;
    }
  }

  private setupMapListeners() {
    if (!this.map) return;

    // Detect when user manually pans/drags map away
    this.dragListener = () => {
      if (this.status === 'tracking' && this.isFollowing) {
        this.isFollowing = false;
        this.notifyStatusChange();
      }
    };
    this.map.on('dragstart', this.dragListener);

    // Re-apply accuracy layers if style changes (e.g. satellite/standard tile toggle)
    this.styleLoadListener = () => {
      if (this.status === 'tracking' && this.currentLocation) {
        this.updateAccuracyCircle(this.currentLocation);
      }
    };
    this.map.on('style.load', this.styleLoadListener);
  }

  private cleanupMapListeners() {
    if (!this.map) return;
    if (this.dragListener) {
      this.map.off('dragstart', this.dragListener);
      this.dragListener = null;
    }
    if (this.styleLoadListener) {
      this.map.off('style.load', this.styleLoadListener);
      this.styleLoadListener = null;
    }
  }

  private updateStatus(newStatus: TrackingStatus) {
    this.status = newStatus;
    this.notifyStatusChange();
  }

  private notifyStatusChange() {
    this.options.onStatusChange?.(this.status, this.isFollowing);
  }
}
