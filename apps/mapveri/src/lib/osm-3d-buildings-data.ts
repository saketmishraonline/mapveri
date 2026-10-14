// OpenStreetMap 3D Building Footprints GeoJSON for Boisar & Theem College region
// Formatted for MapLibre GL 3D fill-extrusion and CityGML / 3D Tiles inspection

export interface BuildingFeatureProperties {
  id: string;
  name: string;
  building: string;
  height: number;
  min_height: number;
  levels: number;
  roofShape: string;
  roofColor: string;
  buildingColor: string;
  citygmlLod: string;
  source: string;
}

export interface GeoJsonPolygonFeature {
  type: 'Feature';
  properties: BuildingFeatureProperties;
  geometry: {
    type: 'Polygon';
    coordinates: number[][][];
  };
}

export interface GeoJsonFeatureCollection {
  type: 'FeatureCollection';
  features: GeoJsonPolygonFeature[];
}

export const BOISAR_OSM_BUILDINGS_GEOJSON: GeoJsonFeatureCollection = {
  type: 'FeatureCollection',
  features: [
    // 1. Theem College of Engineering - Main Academic Block
    {
      type: 'Feature',
      properties: {
        id: 'osm-bldg-theem-main',
        name: 'Theem College Main Academic Block',
        building: 'university',
        height: 28,
        min_height: 0,
        levels: 5,
        roofShape: 'hipped',
        roofColor: '#b45309',
        buildingColor: '#f8fafc',
        citygmlLod: 'LOD2',
        source: 'OpenStreetMap Building Footprints',
      },
      geometry: {
        type: 'Polygon',
        coordinates: [
          [
            [72.7663, 19.8052],
            [72.7673, 19.8052],
            [72.7673, 19.8058],
            [72.7663, 19.8058],
            [72.7663, 19.8052],
          ],
        ],
      },
    },
    // 2. Theem College - Central Engineering Library & Labs
    {
      type: 'Feature',
      properties: {
        id: 'osm-bldg-theem-library',
        name: 'Theem Tech Research & Computer Labs',
        building: 'university',
        height: 18,
        min_height: 0,
        levels: 3,
        roofShape: 'flat',
        roofColor: '#334155',
        buildingColor: '#e2e8f0',
        citygmlLod: 'LOD2',
        source: 'OpenStreetMap Building Footprints',
      },
      geometry: {
        type: 'Polygon',
        coordinates: [
          [
            [72.7675, 19.8048],
            [72.7682, 19.8048],
            [72.7682, 19.8054],
            [72.7675, 19.8054],
            [72.7675, 19.8048],
          ],
        ],
      },
    },
    // 3. Theem College - Central Auditorium & Seminar Dome
    {
      type: 'Feature',
      properties: {
        id: 'osm-bldg-theem-auditorium',
        name: 'Theem Central Auditorium',
        building: 'civic',
        height: 16,
        min_height: 0,
        levels: 2,
        roofShape: 'dome',
        roofColor: '#0284c7',
        buildingColor: '#cbd5e1',
        citygmlLod: 'LOD2',
        source: 'OpenStreetMap Building Footprints',
      },
      geometry: {
        type: 'Polygon',
        coordinates: [
          [
            [72.7656, 19.8055],
            [72.7661, 19.8055],
            [72.7661, 19.8061],
            [72.7656, 19.8061],
            [72.7656, 19.8055],
          ],
        ],
      },
    },
    // 4. Theem College - Workshop & Mechanical Engineering Shed
    {
      type: 'Feature',
      properties: {
        id: 'osm-bldg-theem-workshop',
        name: 'Mechanical & Civil Engineering Workshop',
        building: 'industrial',
        height: 12,
        min_height: 0,
        levels: 1,
        roofShape: 'sawtooth',
        roofColor: '#475569',
        buildingColor: '#94a3b8',
        citygmlLod: 'LOD2',
        source: 'OpenStreetMap Building Footprints',
      },
      geometry: {
        type: 'Polygon',
        coordinates: [
          [
            [72.7665, 19.8044],
            [72.7674, 19.8044],
            [72.7674, 19.8048],
            [72.7665, 19.8048],
            [72.7665, 19.8044],
          ],
        ],
      },
    },
    // 5. Boisar Railway Junction Station Concourse
    {
      type: 'Feature',
      properties: {
        id: 'osm-bldg-boisar-station',
        name: 'Boisar Railway Station Terminal',
        building: 'train_station',
        height: 15,
        min_height: 0,
        levels: 2,
        roofShape: 'barrel',
        roofColor: '#b91c1c',
        buildingColor: '#fef08a',
        citygmlLod: 'LOD2',
        source: 'OpenStreetMap Building Footprints',
      },
      geometry: {
        type: 'Polygon',
        coordinates: [
          [
            [72.7578, 19.8023],
            [72.7592, 19.8023],
            [72.7592, 19.8033],
            [72.7578, 19.8033],
            [72.7578, 19.8023],
          ],
        ],
      },
    },
    // 6. Boisar Station Commercial Shopping Plaza
    {
      type: 'Feature',
      properties: {
        id: 'osm-bldg-station-plaza',
        name: 'Station Road City Trade Plaza',
        building: 'commercial',
        height: 32,
        min_height: 0,
        levels: 8,
        roofShape: 'flat',
        roofColor: '#1e293b',
        buildingColor: '#93c5fd',
        citygmlLod: 'LOD2',
        source: 'OpenStreetMap Building Footprints',
      },
      geometry: {
        type: 'Polygon',
        coordinates: [
          [
            [72.7598, 19.8028],
            [72.7606, 19.8028],
            [72.7606, 19.8036],
            [72.7598, 19.8036],
            [72.7598, 19.8028],
          ],
        ],
      },
    },
    // 7. Boisar Municipal & Administrative Civic Center
    {
      type: 'Feature',
      properties: {
        id: 'osm-bldg-civic-center',
        name: 'Boisar Nagar Palika Administrative Hub',
        building: 'civic',
        height: 24,
        min_height: 0,
        levels: 5,
        roofShape: 'flat',
        roofColor: '#0f766e',
        buildingColor: '#f8fafc',
        citygmlLod: 'LOD2',
        source: 'OpenStreetMap Building Footprints',
      },
      geometry: {
        type: 'Polygon',
        coordinates: [
          [
            [72.7610, 19.8032],
            [72.7620, 19.8032],
            [72.7620, 19.8040],
            [72.7610, 19.8040],
            [72.7610, 19.8032],
          ],
        ],
      },
    },
    // 8. Tarapur MIDC Technology Tower
    {
      type: 'Feature',
      properties: {
        id: 'osm-bldg-midc-tower',
        name: 'Tarapur Innovation & Technology Park',
        building: 'commercial',
        height: 42,
        min_height: 0,
        levels: 11,
        roofShape: 'flat',
        roofColor: '#0f172a',
        buildingColor: '#38bdf8',
        citygmlLod: 'LOD2',
        source: 'OpenStreetMap Building Footprints',
      },
      geometry: {
        type: 'Polygon',
        coordinates: [
          [
            [72.7678, 19.8010],
            [72.7688, 19.8010],
            [72.7688, 19.8020],
            [72.7678, 19.8020],
            [72.7678, 19.8010],
          ],
        ],
      },
    },
    // 9. Ostwal Empire High-Rise Residential Block 1
    {
      type: 'Feature',
      properties: {
        id: 'osm-bldg-ostwal-1',
        name: 'Ostwal Enclave Residency 1',
        building: 'residential',
        height: 30,
        min_height: 0,
        levels: 8,
        roofShape: 'gabled',
        roofColor: '#c2410c',
        buildingColor: '#fed7aa',
        citygmlLod: 'LOD2',
        source: 'OpenStreetMap Building Footprints',
      },
      geometry: {
        type: 'Polygon',
        coordinates: [
          [
            [72.7635, 19.8058],
            [72.7645, 19.8058],
            [72.7645, 19.8066],
            [72.7635, 19.8066],
            [72.7635, 19.8058],
          ],
        ],
      },
    },
    // 10. Ostwal Empire High-Rise Residential Block 2
    {
      type: 'Feature',
      properties: {
        id: 'osm-bldg-ostwal-2',
        name: 'Ostwal Enclave Residency 2',
        building: 'residential',
        height: 30,
        min_height: 0,
        levels: 8,
        roofShape: 'gabled',
        roofColor: '#c2410c',
        buildingColor: '#fed7aa',
        citygmlLod: 'LOD2',
        source: 'OpenStreetMap Building Footprints',
      },
      geometry: {
        type: 'Polygon',
        coordinates: [
          [
            [72.7648, 19.8058],
            [72.7658, 19.8058],
            [72.7658, 19.8066],
            [72.7648, 19.8066],
            [72.7648, 19.8058],
          ],
        ],
      },
    },
    // 11. Tata Shubh Griha Housing Township
    {
      type: 'Feature',
      properties: {
        id: 'osm-bldg-tata-shubh',
        name: 'Tata Shubh Griha Community Center',
        building: 'residential',
        height: 25,
        min_height: 0,
        levels: 7,
        roofShape: 'flat',
        roofColor: '#4338ca',
        buildingColor: '#e0e7ff',
        citygmlLod: 'LOD2',
        source: 'OpenStreetMap Building Footprints',
      },
      geometry: {
        type: 'Polygon',
        coordinates: [
          [
            [72.7650, 19.8012],
            [72.7660, 19.8012],
            [72.7660, 19.8022],
            [72.7650, 19.8022],
            [72.7650, 19.8012],
          ],
        ],
      },
    },
    // 12. Tarapur Atomic & Clean Energy R&D Complex
    {
      type: 'Feature',
      properties: {
        id: 'osm-bldg-cleantech-rd',
        name: 'Tarapur CleanTech Research Campus',
        building: 'industrial',
        height: 20,
        min_height: 0,
        levels: 3,
        roofShape: 'sawtooth',
        roofColor: '#334155',
        buildingColor: '#94a3b8',
        citygmlLod: 'LOD2',
        source: 'OpenStreetMap Building Footprints',
      },
      geometry: {
        type: 'Polygon',
        coordinates: [
          [
            [72.7700, 19.8000],
            [72.7712, 19.8000],
            [72.7712, 19.8012],
            [72.7700, 19.8012],
            [72.7700, 19.8000],
          ],
        ],
      },
    },
  ],
};
