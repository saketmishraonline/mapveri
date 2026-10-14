const fs = require('fs');
const path = require('path');

const projectRoot = path.resolve(__dirname, '..');
const mh = JSON.parse(fs.readFileSync(path.join(projectRoot, 'apps/mapveri/public/data/maharashtra-districts.geojson'), 'utf8'));
const localDistricts = mh.features.filter(f => ['Palghar', 'Thane', 'Mumbai', 'Raigad', 'Nashik', 'Pune'].includes(f.properties.district));

const stateList = JSON.parse(fs.readFileSync('C:/Users/Saket/.gemini/antigravity-ide/brain/b3fa8e7c-b261-4cd9-8ffb-b500379626e8/scratch/india-maps-data/state-list.json', 'utf8'));

const code = `/**
 * India Maps Data Integration for Mapveri Map
 * Source: https://github.com/udit-001/india-maps-data.git
 *
 * Provides district-level administrative boundaries (760 districts across 36 States/UTs),
 * state centroids, regional district geometries, and MapLibre GL layer definitions.
 */

export interface IndiaDistrictProperties {
  district: string;
  dt_code: string;
  st_nm: string;
  st_code: string;
  year?: string;
}

export interface IndiaStateInfo {
  name: string;
  slug: string;
}

/** Local and CDN URLs for India Map Data */
export const INDIA_MAPS_URLS = {
  /** Local optimized GeoJSON containing all 760 districts of India (~625 KB) */
  indiaDistrictsLocal: '/data/india-districts.geojson',
  /** Remote CDN fallback for all India districts */
  indiaDistrictsCdn: 'https://cdn.jsdelivr.net/gh/udit-001/india-maps-data@2884453/geojson/india.geojson',
  /** District centroids for fast label rendering (~143 KB) */
  districtCentroidsLocal: '/data/india-district-centroids.geojson',
  /** State centroids for macro-level country labels (~5 KB) */
  stateCentroidsLocal: '/data/india-states-centroids.geojson',
  /** Maharashtra state districts detailed GeoJSON (~166 KB) */
  maharashtraDistrictsLocal: '/data/maharashtra-districts.geojson',
} as const;

/** Complete list of 36 States and Union Territories of India */
export const INDIA_STATES: IndiaStateInfo[] = ${JSON.stringify(stateList, null, 2)};

/** Embedded local fallback GeoJSON for key districts surrounding Boisar (Palghar, Thane, Mumbai, Raigad, Nashik, Pune) */
export const LOCAL_MAHARASHTRA_FALLBACK_GEOJSON = {
  type: 'FeatureCollection',
  features: ${JSON.stringify(localDistricts, null, 2)},
} as const;

/**
 * Key district centroid locations for quick navigation / reverse lookups
 */
export const INDIA_KEY_DISTRICT_CENTROIDS: Record<string, { lat: number; lng: number; state: string }> = {
  Palghar: { lat: 19.7571, lng: 73.0696, state: 'Maharashtra' },
  Thane: { lat: 19.2183, lng: 73.0789, state: 'Maharashtra' },
  Mumbai: { lat: 19.076, lng: 72.8777, state: 'Maharashtra' },
  Pune: { lat: 18.5204, lng: 73.8567, state: 'Maharashtra' },
  Nashik: { lat: 19.9975, lng: 73.7898, state: 'Maharashtra' },
  Raigad: { lat: 18.5158, lng: 73.1822, state: 'Maharashtra' },
  Surat: { lat: 21.1702, lng: 72.8311, state: 'Gujarat' },
  Valsad: { lat: 20.5992, lng: 72.9342, state: 'Gujarat' },
  Navsari: { lat: 20.9467, lng: 72.952, state: 'Gujarat' },
};
`;

const outputPath = path.join(projectRoot, 'apps/mapveri/src/lib/india-maps-data.ts');
fs.writeFileSync(outputPath, code, 'utf8');
console.log('Successfully written:', outputPath);
