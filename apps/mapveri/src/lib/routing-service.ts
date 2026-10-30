/**
 * Routing and Directions Service
 * Provides OSRM route calculations, shortest distance analysis,
 * travel mode profiles, turn-by-turn navigation steps, and offline Haversine fallback.
 */

export type TravelMode = 'driving' | 'bicycle' | 'foot';

export interface RouteStep {
  id: string;
  instruction: string;
  distance: number; // meters
  duration: number; // seconds
  roadName: string;
  type: string;
  modifier?: string;
}

export interface RouteOption {
  id: string;
  title: string;
  summary: string;
  mode: TravelMode;
  distanceMeters: number;
  durationSeconds: number;
  straightLineMeters: number;
  geometry: [number, number][]; // [lng, lat] pairs for MapLibre
  steps: RouteStep[];
  isShortest: boolean;
  isFastest: boolean;
  isAlternative?: boolean;
}

export interface LocationPoint {
  name: string;
  lat: number;
  lng: number;
  isCurrentLocation?: boolean;
  pinId?: number;
}

export interface ActiveRouteData {
  coordinates: [number, number][];
  sourceCoord?: [number, number];
  destCoord?: [number, number];
  sourceName?: string;
  destName?: string;
  distanceMeters?: number;
  durationSeconds?: number;
  mode?: TravelMode;
}

export const PRESET_LOCATIONS: LocationPoint[] = [
  {
    name: 'Boisar Railway Station',
    lat: 19.8036,
    lng: 72.7615,
  },
  {
    name: 'Theem College of Engineering',
    lat: 19.8055,
    lng: 72.7668,
  },
  {
    name: 'Tarapur MIDC Main Gate',
    lat: 19.8142,
    lng: 72.7483,
  },
  {
    name: 'Chinchani Beach, Boisar',
    lat: 19.8655,
    lng: 72.7022,
  },
];

/**
 * Calculates straight-line great-circle distance in meters using Haversine formula
 */
export function haversineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371000; // Earth radius in meters
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c);
}

/**
 * Format distance in meters to clean human readable string
 */
export function formatRouteDistance(meters: number): string {
  if (meters < 1000) {
    return `${Math.round(meters)} m`;
  }
  const km = meters / 1000;
  return km < 10 ? `${km.toFixed(1)} km` : `${Math.round(km)} km`;
}

/**
 * Format duration in seconds to clean human readable string
 */
export function formatRouteDuration(seconds: number): string {
  const mins = Math.round(seconds / 60);
  if (mins < 1) return '< 1 min';
  if (mins < 60) return `${mins} min`;
  const hrs = Math.floor(mins / 60);
  const remainingMins = mins % 60;
  return remainingMins > 0 ? `${hrs} hr ${remainingMins} min` : `${hrs} hr`;
}

/**
 * Converts OSRM maneuver step into a natural language instruction
 */
export function formatManeuverInstruction(
  type: string = '',
  modifier: string = '',
  name: string = ''
): string {
  const roadLabel = name.trim() ? ` onto ${name.trim()}` : '';
  const cleanMod = modifier.replace(/_/g, ' ').trim();

  switch (type.toLowerCase()) {
    case 'depart':
      return `Head ${cleanMod || 'forward'}${name.trim() ? ` on ${name.trim()}` : ''}`;
    case 'arrive':
      return 'Arrive at your destination';
    case 'roundabout':
    case 'rotary':
      return `Enter roundabout and take exit${roadLabel}`;
    case 'fork':
      return `Take the ${cleanMod || 'slight'} fork${roadLabel}`;
    case 'end of road':
      return `At the end of the road, turn ${cleanMod || 'right'}${roadLabel}`;
    case 'continue':
      return `Continue straight${name.trim() ? ` on ${name.trim()}` : ''}`;
    case 'new name':
      return `Continue${roadLabel}`;
    case 'turn':
    default:
      return cleanMod ? `Turn ${cleanMod}${roadLabel}` : `Continue${roadLabel}`;
  }
}

/**
 * Generates an offline straight-line fallback route if network/OSRM is unavailable
 */
function createDirectFallbackRoute(
  source: LocationPoint,
  dest: LocationPoint,
  mode: TravelMode
): RouteOption {
  const dist = haversineDistance(source.lat, source.lng, dest.lat, dest.lng);
  // Speeds: driving ~32km/h (8.9m/s), bicycle ~18km/h (5m/s), walking ~4.5km/h (1.25m/s)
  const speedMps = mode === 'driving' ? 8.9 : mode === 'bicycle' ? 5.0 : 1.25;
  const duration = Math.max(30, Math.round(dist / speedMps));

  return {
    id: `direct-fallback-${mode}`,
    title: 'Shortest Direct Path',
    summary: 'Direct calculated shortest route (straight-line estimation)',
    mode,
    distanceMeters: dist,
    durationSeconds: duration,
    straightLineMeters: dist,
    geometry: [
      [source.lng, source.lat],
      [dest.lng, dest.lat],
    ],
    steps: [
      {
        id: 'step-depart',
        instruction: `Head from ${source.name || 'Start'} towards ${dest.name || 'Destination'}`,
        distance: Math.round(dist * 0.5),
        duration: Math.round(duration * 0.5),
        roadName: 'Direct Path',
        type: 'depart',
      },
      {
        id: 'step-arrive',
        instruction: `Arrive at ${dest.name || 'Destination'}`,
        distance: Math.round(dist * 0.5),
        duration: Math.round(duration * 0.5),
        roadName: '',
        type: 'arrive',
      },
    ],
    isShortest: true,
    isFastest: true,
  };
}

/**
 * Fetches route options for source and destination, calculating shortest distance
 * and organizing route choices (Shortest, Alternative, and comparative modes).
 */
export async function calculateRouteOptions(
  source: LocationPoint,
  dest: LocationPoint,
  mode: TravelMode = 'driving'
): Promise<RouteOption[]> {
  const straightLine = haversineDistance(source.lat, source.lng, dest.lat, dest.lng);

  // Profile mapping for OSRM public API
  const osrmProfile = mode === 'bicycle' ? 'bicycle' : mode === 'foot' ? 'foot' : 'driving';
  const url = `https://router.project-osrm.org/route/v1/${osrmProfile}/${source.lng},${source.lat};${dest.lng},${dest.lat}?overview=full&geometries=geojson&steps=true&alternatives=true`;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 6500);

    const response = await fetch(url, { signal: controller.signal });
    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`Routing request failed with status: ${response.status}`);
    }

    const data = await response.json();

    if (!data.routes || !Array.isArray(data.routes) || data.routes.length === 0) {
      return [createDirectFallbackRoute(source, dest, mode)];
    }

    const rawRoutes = data.routes as any[];

    // Map OSRM routes into RouteOption objects
    const options: RouteOption[] = rawRoutes.map((r, index) => {
      const distance = Math.round(r.distance || straightLine);
      const duration = Math.round(r.duration || distance / (mode === 'driving' ? 8.9 : 1.25));
      const coordinates = r.geometry?.coordinates || [
        [source.lng, source.lat],
        [dest.lng, dest.lat],
      ];

      // Parse turn-by-turn steps
      const steps: RouteStep[] = [];
      const leg = r.legs?.[0];
      if (leg && Array.isArray(leg.steps)) {
        leg.steps.forEach((s: any, sIdx: number) => {
          const type = s.maneuver?.type || 'turn';
          const modifier = s.maneuver?.modifier || '';
          const name = s.name || '';
          steps.push({
            id: `step-${index}-${sIdx}`,
            instruction: formatManeuverInstruction(type, modifier, name),
            distance: Math.round(s.distance || 0),
            duration: Math.round(s.duration || 0),
            roadName: name,
            type,
            modifier,
          });
        });
      }

      // Determine road summary / name
      const primaryRoad =
        steps.find((s) => s.roadName && s.roadName.length > 2)?.roadName ||
        (index === 0 ? 'Main Road' : `Alternative Route ${index}`);

      return {
        id: `route-${index}`,
        title: index === 0 ? 'Primary Route' : `Alternative ${index}`,
        summary: `via ${primaryRoad}`,
        mode,
        distanceMeters: distance,
        durationSeconds: duration,
        straightLineMeters: straightLine,
        geometry: coordinates,
        steps,
        isShortest: false,
        isFastest: false,
        isAlternative: index > 0,
      };
    });

    // Determine min distance and min duration
    let minDistance = Infinity;
    let minDuration = Infinity;

    options.forEach((opt) => {
      if (opt.distanceMeters < minDistance) minDistance = opt.distanceMeters;
      if (opt.durationSeconds < minDuration) minDuration = opt.durationSeconds;
    });

    options.forEach((opt) => {
      opt.isShortest = opt.distanceMeters === minDistance;
      opt.isFastest = opt.durationSeconds === minDuration;
      if (opt.isShortest && opt.isFastest) {
        opt.title = 'Shortest & Fastest Route';
      } else if (opt.isShortest) {
        opt.title = 'Shortest Route';
      } else if (opt.isFastest) {
        opt.title = 'Fastest Route';
      }
    });

    // If only 1 route was returned for driving, also fetch walking in parallel for comparison
    if (options.length === 1 && mode === 'driving') {
      try {
        const footUrl = `https://router.project-osrm.org/route/v1/foot/${source.lng},${source.lat};${dest.lng},${dest.lat}?overview=full&geometries=geojson&steps=true`;
        const footResp = await fetch(footUrl, { signal: AbortSignal.timeout(3500) });
        if (footResp.ok) {
          const footData = await footResp.json();
          if (footData.routes?.[0]) {
            const fRoute = footData.routes[0];
            const fDist = Math.round(fRoute.distance || straightLine);
            const fDur = Math.round(fRoute.duration || fDist / 1.25);
            options.push({
              id: 'route-walking-comparison',
              title: 'Walking Shortcut',
              summary: 'Pedestrian shortest path',
              mode: 'foot',
              distanceMeters: fDist,
              durationSeconds: fDur,
              straightLineMeters: straightLine,
              geometry: fRoute.geometry?.coordinates || [
                [source.lng, source.lat],
                [dest.lng, dest.lat],
              ],
              steps: (fRoute.legs?.[0]?.steps || []).map((s: any, sIdx: number) => ({
                id: `foot-step-${sIdx}`,
                instruction: formatManeuverInstruction(s.maneuver?.type, s.maneuver?.modifier, s.name),
                distance: Math.round(s.distance || 0),
                duration: Math.round(s.duration || 0),
                roadName: s.name || '',
                type: s.maneuver?.type || 'turn',
              })),
              isShortest: fDist < minDistance,
              isFastest: false,
              isAlternative: true,
            });
          }
        }
      } catch {
        // Comparative fetch error ignored
      }
    }

    return options;
  } catch (err) {
    console.warn('OSRM routing fetch failed, using direct Haversine route:', err);
    return [createDirectFallbackRoute(source, dest, mode)];
  }
}

