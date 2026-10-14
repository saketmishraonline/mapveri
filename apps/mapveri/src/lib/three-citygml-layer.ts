import * as THREE from 'three';
import * as maplibregl from 'maplibre-gl';

export interface CityGmlBuilding {
  id: string;
  name: string;
  functionType: 'education' | 'transit' | 'commercial' | 'residential' | 'industrial' | 'civic';
  lng: number;
  lat: number;
  altitudeMeters?: number;
  heightMeters: number;
  widthMeters: number;
  depthMeters: number;
  roofType: 'flat' | 'gabled' | 'hipped' | 'pyramid' | 'dome' | 'sawtooth';
  lod: 'LOD2' | 'LOD3';
  yearBuilt?: number;
  wallColor?: string;
  roofColor?: string;
  floors?: number;
}

// Key prominent structures in Boisar and Theem College area for CityGML rendering
export const BOISAR_CITYGML_BUILDINGS: CityGmlBuilding[] = [
  // Theem College of Engineering Campus
  {
    id: 'GML_THEEM_MAIN_ACADEMIC',
    name: 'Theem College Main Academic Complex',
    functionType: 'education',
    lng: 72.7668,
    lat: 19.8055,
    heightMeters: 28,
    widthMeters: 65,
    depthMeters: 38,
    roofType: 'hipped',
    lod: 'LOD3',
    yearBuilt: 2011,
    wallColor: '#f1f5f9',
    roofColor: '#b45309',
    floors: 5,
  },
  {
    id: 'GML_THEEM_TECH_LABS',
    name: 'Theem Advanced Engineering & Robotics Labs',
    functionType: 'education',
    lng: 72.7674,
    lat: 19.8051,
    heightMeters: 16,
    widthMeters: 45,
    depthMeters: 24,
    roofType: 'sawtooth',
    lod: 'LOD2',
    yearBuilt: 2014,
    wallColor: '#e2e8f0',
    roofColor: '#475569',
    floors: 3,
  },
  {
    id: 'GML_THEEM_AUDITORIUM',
    name: 'Theem Central Auditorium & Seminar Hall',
    functionType: 'civic',
    lng: 72.7662,
    lat: 19.8058,
    heightMeters: 18,
    widthMeters: 35,
    depthMeters: 30,
    roofType: 'dome',
    lod: 'LOD3',
    yearBuilt: 2016,
    wallColor: '#cbd5e1',
    roofColor: '#0284c7',
    floors: 2,
  },
  {
    id: 'GML_THEEM_CAMPUS_TOWER',
    name: 'Theem Campus Communications & Clock Tower',
    functionType: 'education',
    lng: 72.7665,
    lat: 19.8053,
    heightMeters: 38,
    widthMeters: 8,
    depthMeters: 8,
    roofType: 'pyramid',
    lod: 'LOD3',
    yearBuilt: 2015,
    wallColor: '#e2e8f0',
    roofColor: '#d97706',
    floors: 9,
  },
  // Boisar Railway Station & Transit Corridor
  {
    id: 'GML_BOISAR_STATION_HUB',
    name: 'Boisar Railway Junction Concourse',
    functionType: 'transit',
    lng: 72.7585,
    lat: 19.8028,
    heightMeters: 15,
    widthMeters: 75,
    depthMeters: 22,
    roofType: 'hipped',
    lod: 'LOD2',
    yearBuilt: 1998,
    wallColor: '#fde68a',
    roofColor: '#b91c1c',
    floors: 2,
  },
  {
    id: 'GML_BOISAR_COMMERCIAL_PLAZA',
    name: 'Station Road City Trade Plaza',
    functionType: 'commercial',
    lng: 72.7602,
    lat: 19.8032,
    heightMeters: 32,
    widthMeters: 42,
    depthMeters: 28,
    roofType: 'flat',
    lod: 'LOD3',
    yearBuilt: 2018,
    wallColor: '#93c5fd',
    roofColor: '#334155',
    floors: 8,
  },
  // Boisar Town Center
  {
    id: 'GML_BOISAR_CIVIC_CENTER',
    name: 'Boisar Municipal & Civic Hub',
    functionType: 'civic',
    lng: 72.7615,
    lat: 19.8036,
    heightMeters: 22,
    widthMeters: 50,
    depthMeters: 32,
    roofType: 'flat',
    lod: 'LOD2',
    yearBuilt: 2005,
    wallColor: '#f8fafc',
    roofColor: '#0f766e',
    floors: 4,
  },
  // Tarapur MIDC Technology & Industry Center
  {
    id: 'GML_MIDC_TECH_TOWER',
    name: 'MIDC Tarapur Innovation Technology Tower',
    functionType: 'commercial',
    lng: 72.7682,
    lat: 19.8015,
    heightMeters: 44,
    widthMeters: 36,
    depthMeters: 32,
    roofType: 'flat',
    lod: 'LOD3',
    yearBuilt: 2021,
    wallColor: '#38bdf8',
    roofColor: '#1e293b',
    floors: 11,
  },
  {
    id: 'GML_MIDC_RESEARCH_FACILITY',
    name: 'Tarapur CleanTech Research Facility',
    functionType: 'industrial',
    lng: 72.7705,
    lat: 19.8008,
    heightMeters: 18,
    widthMeters: 55,
    depthMeters: 35,
    roofType: 'sawtooth',
    lod: 'LOD2',
    yearBuilt: 2019,
    wallColor: '#94a3b8',
    roofColor: '#475569',
    floors: 3,
  },
  // Residential Complexes
  {
    id: 'GML_OSTWAL_RESIDENCY_A',
    name: 'Ostwal Enclave Block Alpha',
    functionType: 'residential',
    lng: 72.7642,
    lat: 19.8062,
    heightMeters: 26,
    widthMeters: 40,
    depthMeters: 20,
    roofType: 'gabled',
    lod: 'LOD2',
    yearBuilt: 2017,
    wallColor: '#fed7aa',
    roofColor: '#c2410c',
    floors: 7,
  },
  {
    id: 'GML_TATA_SHUBH_TOWER',
    name: 'Shubh Griha Community Center',
    functionType: 'residential',
    lng: 72.7655,
    lat: 19.8018,
    heightMeters: 30,
    widthMeters: 42,
    depthMeters: 22,
    roofType: 'hipped',
    lod: 'LOD2',
    yearBuilt: 2020,
    wallColor: '#e0e7ff',
    roofColor: '#4338ca',
    floors: 8,
  },
];

export type CityGmlRenderMode = 'realistic' | 'semantic' | 'height' | 'wireframe';

export class ThreeCityGmlLayer implements maplibregl.CustomLayerInterface {
  id: string = 'threejs-citygml-layer';
  type: 'custom' = 'custom';
  renderingMode: '3d' = '3d';

  private map: maplibregl.Map | null = null;
  private camera: THREE.Camera = new THREE.Camera();
  private scene: THREE.Scene = new THREE.Scene();
  private renderer: THREE.WebGLRenderer | null = null;
  private buildingsGroup: THREE.Group = new THREE.Group();
  private beaconsGroup: THREE.Group = new THREE.Group();
  private animationFrameId: number | null = null;
  private renderMode: CityGmlRenderMode = 'realistic';
  private clock: THREE.Clock = new THREE.Clock();

  constructor(renderMode: CityGmlRenderMode = 'realistic') {
    this.renderMode = renderMode;
  }

  setRenderMode(mode: CityGmlRenderMode) {
    this.renderMode = mode;
    this.rebuildBuildings();
    this.map?.triggerRepaint();
  }

  getRenderMode(): CityGmlRenderMode {
    return this.renderMode;
  }

  onAdd(map: maplibregl.Map, gl: WebGL2RenderingContext): void {
    this.map = map;

    // Set up WebGL renderer sharing MapLibre's canvas & GL context
    this.renderer = new THREE.WebGLRenderer({
      canvas: map.getCanvas(),
      context: gl,
      antialias: true,
    });
    this.renderer.autoClear = false;

    // Atmospheric Scene Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.85);
    this.scene.add(ambientLight);

    const sunLight = new THREE.DirectionalLight(0xfff3db, 1.25);
    sunLight.position.set(0.5, 1.5, 1.0).normalize();
    this.scene.add(sunLight);

    const hemiLight = new THREE.HemisphereLight(0xddeeff, 0x243f48, 0.4);
    this.scene.add(hemiLight);

    this.scene.add(this.buildingsGroup);
    this.scene.add(this.beaconsGroup);

    this.rebuildBuildings();
  }

  private rebuildBuildings(): void {
    // Clear existing building geometries
    while (this.buildingsGroup.children.length > 0) {
      const child = this.buildingsGroup.children[0];
      this.buildingsGroup.remove(child);
      if (child instanceof THREE.Mesh) {
        child.geometry?.dispose();
        if (Array.isArray(child.material)) {
          child.material.forEach((m) => m.dispose());
        } else {
          child.material?.dispose();
        }
      }
    }

    while (this.beaconsGroup.children.length > 0) {
      const child = this.beaconsGroup.children[0];
      this.beaconsGroup.remove(child);
    }

    // Build each CityGML 3D building object
    BOISAR_CITYGML_BUILDINGS.forEach((bldg) => {
      const coord = maplibregl.MercatorCoordinate.fromLngLat(
        [bldg.lng, bldg.lat],
        bldg.altitudeMeters || 0
      );
      const scale = coord.meterInMercatorCoordinateUnits();

      const bldgGroup = new THREE.Group();
      bldgGroup.position.set(coord.x, coord.y, coord.z);
      // Align Three.js coordinates to Mercator space:
      // X = East, Y = Up (mapped to Mercator Z via rotation), Z = South
      bldgGroup.rotation.x = Math.PI / 2;
      bldgGroup.scale.set(scale, scale, scale);

      // Determine material based on mode
      let wallMat: THREE.Material;
      let roofMat: THREE.Material;

      if (this.renderMode === 'wireframe') {
        const wireMat = new THREE.MeshBasicMaterial({
          color: 0x00f0ff,
          wireframe: true,
        });
        wallMat = wireMat;
        roofMat = wireMat;
      } else if (this.renderMode === 'semantic') {
        // CityGML Semantic Colors
        // WallSurface = Light Grey, RoofSurface = Terracotta/Navy, Ground = Grass green
        const functionColors: Record<CityGmlBuilding['functionType'], number> = {
          education: 0x3b82f6,
          transit: 0xf59e0b,
          commercial: 0x10b981,
          residential: 0x8b5cf6,
          industrial: 0x64748b,
          civic: 0x06b6d4,
        };
        const color = functionColors[bldg.functionType] || 0x3b82f6;
        wallMat = new THREE.MeshStandardMaterial({
          color,
          roughness: 0.4,
          metalness: 0.1,
        });
        roofMat = new THREE.MeshStandardMaterial({
          color: 0xef4444,
          roughness: 0.3,
        });
      } else if (this.renderMode === 'height') {
        // Heatmap color based on height
        const t = Math.min(Math.max((bldg.heightMeters - 10) / 40, 0), 1);
        const col = new THREE.Color().setHSL(0.65 - t * 0.65, 0.9, 0.55);
        const hMat = new THREE.MeshStandardMaterial({
          color: col,
          roughness: 0.3,
          metalness: 0.2,
        });
        wallMat = hMat;
        roofMat = hMat;
      } else {
        // Realistic Architecture
        wallMat = new THREE.MeshStandardMaterial({
          color: new THREE.Color(bldg.wallColor || '#f1f5f9'),
          roughness: 0.35,
          metalness: 0.15,
        });
        roofMat = new THREE.MeshStandardMaterial({
          color: new THREE.Color(bldg.roofColor || '#334155'),
          roughness: 0.5,
          metalness: 0.1,
        });
      }

      // 1. Base Wall Volume
      const wallHeight = bldg.roofType === 'flat' ? bldg.heightMeters : bldg.heightMeters * 0.8;
      const wallGeo = new THREE.BoxGeometry(bldg.widthMeters, wallHeight, bldg.depthMeters);
      const wallMesh = new THREE.Mesh(wallGeo, wallMat);
      // Three.js box is centered, so raise it by wallHeight / 2
      wallMesh.position.y = wallHeight / 2;
      bldgGroup.add(wallMesh);

      // 2. CityGML Roof Structure
      const roofHeight = bldg.heightMeters - wallHeight;
      if (bldg.roofType === 'pyramid') {
        const roofGeo = new THREE.ConeGeometry(
          Math.max(bldg.widthMeters, bldg.depthMeters) * 0.65,
          roofHeight,
          4
        );
        roofGeo.rotateY(Math.PI / 4);
        const roofMesh = new THREE.Mesh(roofGeo, roofMat);
        roofMesh.position.y = wallHeight + roofHeight / 2;
        bldgGroup.add(roofMesh);
      } else if (bldg.roofType === 'dome') {
        const roofGeo = new THREE.SphereGeometry(
          Math.min(bldg.widthMeters, bldg.depthMeters) * 0.45,
          16,
          8,
          0,
          Math.PI * 2,
          0,
          Math.PI / 2
        );
        const roofMesh = new THREE.Mesh(roofGeo, roofMat);
        roofMesh.position.y = wallHeight;
        bldgGroup.add(roofMesh);
      } else if (bldg.roofType === 'hipped' || bldg.roofType === 'gabled') {
        // Prismatic pitched roof
        const roofGeo = new THREE.CylinderGeometry(
          0.1,
          bldg.depthMeters / 2,
          bldg.widthMeters,
          3
        );
        roofGeo.rotateZ(Math.PI / 2);
        const roofMesh = new THREE.Mesh(roofGeo, roofMat);
        roofMesh.position.y = wallHeight + roofHeight / 2;
        roofMesh.scale.set(1, roofHeight / (bldg.depthMeters / 2), 1);
        bldgGroup.add(roofMesh);
      } else if (bldg.roofType === 'sawtooth') {
        // Multi-ridge industrial roof
        const ridges = 3;
        const segmentDepth = bldg.depthMeters / ridges;
        for (let i = 0; i < ridges; i++) {
          const sawGeo = new THREE.CylinderGeometry(0.1, segmentDepth * 0.6, bldg.widthMeters, 3);
          sawGeo.rotateZ(Math.PI / 2);
          const sawMesh = new THREE.Mesh(sawGeo, roofMat);
          sawMesh.position.y = wallHeight + roofHeight / 2;
          sawMesh.position.z = -bldg.depthMeters / 2 + (i + 0.5) * segmentDepth;
          bldgGroup.add(sawMesh);
        }
      } else {
        // Flat roof with parapet / roof installation (AC equipment & elevator shaft)
        const elevatorShaftGeo = new THREE.BoxGeometry(
          bldg.widthMeters * 0.25,
          3.5,
          bldg.depthMeters * 0.25
        );
        const elevatorShaft = new THREE.Mesh(elevatorShaftGeo, roofMat);
        elevatorShaft.position.y = wallHeight + 1.75;
        bldgGroup.add(elevatorShaft);
      }

      // 3. Pulsing GPS/Beacon Antenna at key landmark
      if (bldg.id === 'GML_THEEM_CAMPUS_TOWER' || bldg.id === 'GML_BOISAR_CIVIC_CENTER') {
        const antennaGeo = new THREE.CylinderGeometry(0.2, 0.4, 6, 8);
        const antennaMat = new THREE.MeshStandardMaterial({
          color: 0xd97706,
          metalness: 0.8,
        });
        const antenna = new THREE.Mesh(antennaGeo, antennaMat);
        antenna.position.y = bldg.heightMeters + 3;
        bldgGroup.add(antenna);

        // Holographic beacon ring
        const ringGeo = new THREE.RingGeometry(2, 2.8, 24);
        ringGeo.rotateX(-Math.PI / 2);
        const ringMat = new THREE.MeshBasicMaterial({
          color: 0x38bdf8,
          side: THREE.DoubleSide,
          transparent: true,
          opacity: 0.8,
        });
        const ring = new THREE.Mesh(ringGeo, ringMat);
        ring.position.y = bldg.heightMeters + 5;
        ring.userData = { isPulseRing: true };
        bldgGroup.add(ring);
      }

      this.buildingsGroup.add(bldgGroup);
    });
  }

  render(gl: WebGL2RenderingContext, options: maplibregl.CustomRenderMethodInput): void {
    if (!this.renderer || !this.map) return;

    // Animate pulsating rings
    const time = this.clock.getElapsedTime();
    this.buildingsGroup.traverse((obj) => {
      if (obj.userData?.isPulseRing && obj instanceof THREE.Mesh) {
        const scale = 1 + Math.sin(time * 3) * 0.35;
        obj.scale.set(scale, scale, scale);
        if (obj.material && 'opacity' in obj.material) {
          obj.material.opacity = 0.5 + Math.sin(time * 3) * 0.3;
        }
      }
    });

    // MapLibre passes the 4x4 Mercator-to-Clip projection matrix
    const matrix = options.modelViewProjectionMatrix;
    const m = new THREE.Matrix4().fromArray(matrix as any);
    this.camera.projectionMatrix = m;

    this.renderer.resetState();
    this.renderer.render(this.scene, this.camera);
    this.map.triggerRepaint();
  }

  onRemove(): void {
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
    this.buildingsGroup.clear();
    this.beaconsGroup.clear();
    this.renderer?.dispose();
    this.renderer = null;
    this.map = null;
  }
}
