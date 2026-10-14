import { Router, type IRouter } from "express";
import { userFromRequest } from "../lib/mapveri";

const router: IRouter = Router();

// In-memory active fleet state initialized with realistic trucking data across the Boisar - Mumbai - JNPT corridor
export interface Truck {
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
  status: "in_transit" | "idling" | "loading" | "maintenance" | "delivered";
  lat: number;
  lng: number;
  heading: number; // degrees 0-360
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

const INITIAL_TRUCKS: Truck[] = [
  {
    id: "TRK-101",
    plateNumber: "MH-04-TR-8821",
    model: "BharatBenz 2823C (24T Heavy Hauler)",
    driver: {
      id: "DRV-01",
      name: "Rajesh Sharma",
      phone: "+91 98201 44521",
      avatar: "RS",
      experience: "9 years",
      rating: 4.95,
      dutyHoursToday: "5.4 / 11 hrs",
      safetyScore: 98,
      license: "MH04-2015-004921",
    },
    status: "in_transit",
    lat: 19.424197,
    lng: 72.815077,
    heading: 175,
    speedKmh: 58,
    fuelPct: 78,
    batteryV: 24.4,
    engineTempC: 88,
    tirePressurePsi: 110,
    cargo: {
      title: "Cold-Chain Pharmaceuticals & Vaccines",
      category: "Refrigerated Pharma",
      weightTons: 16.4,
      isTempControlled: true,
      tempCelsius: 4.2,
      manifestId: "MAN-2026-8801",
      client: "Sun Pharma Laboratories",
    },
    route: {
      id: "RT-8801",
      origin: "Boisar MIDC Chemical Zone",
      originLat: 19.7995,
      originLng: 72.7482,
      destination: "Nhava Sheva JNPT Container Gate 4",
      destLat: 18.9501,
      destLng: 72.9525,
      etaMinutes: 68,
      etaTime: "09:45 AM",
      distanceRemainingKm: 52.4,
      distanceTotalKm: 136.0,
      progressPct: 62,
      nextCheckpoint: "Ghodbunder Toll Plaza",
      waypoints: [
        { name: "Boisar MIDC Hub", lat: 19.7995, lng: 72.7482, passed: true, time: "06:15 AM" },
        { name: "Manor Highway Bypass", lat: 19.6455, lng: 72.9102, passed: true, time: "07:05 AM" },
        { name: "Vasai Creek Flyover", lat: 19.3412, lng: 72.8421, passed: true, time: "08:12 AM" },
        { name: "Ghodbunder Toll Plaza", lat: 19.2715, lng: 72.9352, passed: false },
        { name: "Airoli Mindspace Transit", lat: 19.1625, lng: 72.9982, passed: false },
        { name: "JNPT Container Gate 4", lat: 18.9501, lng: 72.9525, passed: false },
      ],
    },
    alerts: ["Dahisar-Thane interchange slow traffic (+12m)"],
    lastUpdated: "Just now",
  },
  {
    id: "TRK-102",
    plateNumber: "MH-02-EX-4490",
    model: "Tata Prima 5530.S Multi-Axle Hauler",
    driver: {
      id: "DRV-02",
      name: "Gurpreet Singh",
      phone: "+91 97662 10394",
      avatar: "GS",
      experience: "12 years",
      rating: 4.98,
      dutyHoursToday: "7.1 / 11 hrs",
      safetyScore: 99,
      license: "PB02-2012-009182",
    },
    status: "in_transit",
    lat: 19.335441,
    lng: 72.845812,
    heading: 165,
    speedKmh: 64,
    fuelPct: 62,
    batteryV: 24.2,
    engineTempC: 86,
    tirePressurePsi: 112,
    cargo: {
      title: "Precision Automotive Components (Gearboxes)",
      category: "Heavy Industrial",
      weightTons: 22.8,
      manifestId: "MAN-2026-8802",
      client: "Mahindra & Mahindra Automotive",
    },
    route: {
      id: "RT-8802",
      origin: "Palghar Precision Casting Yard",
      originLat: 19.6966,
      originLng: 72.7654,
      destination: "Bhiwandi Integrated Logistics Park Zone C",
      destLat: 19.2812,
      destLng: 73.0583,
      etaMinutes: 42,
      etaTime: "09:20 AM",
      distanceRemainingKm: 31.8,
      distanceTotalKm: 92.5,
      progressPct: 66,
      nextCheckpoint: "Kaman-Bhiwandi Link Road",
      waypoints: [
        { name: "Palghar Yard", lat: 19.6966, lng: 72.7654, passed: true, time: "06:40 AM" },
        { name: "Virar North Bypass", lat: 19.4621, lng: 72.8123, passed: true, time: "07:35 AM" },
        { name: "Vasai Phata", lat: 19.3354, lng: 72.8458, passed: true, time: "08:25 AM" },
        { name: "Kaman-Bhiwandi Link", lat: 19.3121, lng: 72.9321, passed: false },
        { name: "Bhiwandi Hub Zone C", lat: 19.2812, lng: 73.0583, passed: false },
      ],
    },
    alerts: ["Route optimal, 0 incident warnings"],
    lastUpdated: "12s ago",
  },
  {
    id: "TRK-103",
    plateNumber: "MH-43-BP-9912",
    model: "Ashok Leyland AVTR 3120 6x2",
    driver: {
      id: "DRV-03",
      name: "Suresh Patil",
      phone: "+91 98334 55912",
      avatar: "SP",
      experience: "7 years",
      rating: 4.88,
      dutyHoursToday: "3.2 / 11 hrs",
      safetyScore: 96,
      license: "MH43-2017-003319",
    },
    status: "loading",
    lat: 19.782073,
    lng: 72.787496,
    heading: 0,
    speedKmh: 0,
    fuelPct: 91,
    batteryV: 24.8,
    engineTempC: 45,
    tirePressurePsi: 108,
    cargo: {
      title: "Solar Inverter Modules & Battery Packs",
      category: "Renewable Energy Tech",
      weightTons: 14.2,
      manifestId: "MAN-2026-8803",
      client: "Tata Power Renewables",
    },
    route: {
      id: "RT-8803",
      origin: "Boisar Industrial Hub #4",
      originLat: 19.782,
      originLng: 72.7875,
      destination: "Churchgate Coastal Freight Terminal",
      destLat: 18.9322,
      destLng: 72.8264,
      etaMinutes: 145,
      etaTime: "11:15 AM",
      distanceRemainingKm: 118.0,
      distanceTotalKm: 118.0,
      progressPct: 5,
      nextCheckpoint: "Palghar Weighbridge #2",
      waypoints: [
        { name: "Boisar Hub #4", lat: 19.782, lng: 72.7875, passed: true, time: "Loading now" },
        { name: "Palghar Weighbridge #2", lat: 19.6966, lng: 72.7654, passed: false },
        { name: "Vasai Creek", lat: 19.3412, lng: 72.8421, passed: false },
        { name: "Western Express Highway", lat: 19.1625, lng: 72.8521, passed: false },
        { name: "Churchgate Terminal", lat: 18.9322, lng: 72.8264, passed: false },
      ],
    },
    alerts: ["Loading at Bay 3: 85% palletized"],
    lastUpdated: "1m ago",
  },
  {
    id: "TRK-104",
    plateNumber: "MH-04-AZ-2033",
    model: "Eicher Pro 6035 (10-Wheeler Rigid)",
    driver: {
      id: "DRV-04",
      name: "Imran Khan",
      phone: "+91 99201 88390",
      avatar: "IK",
      experience: "11 years",
      rating: 4.92,
      dutyHoursToday: "6.0 / 11 hrs",
      safetyScore: 97,
      license: "MH04-2013-008127",
    },
    status: "in_transit",
    lat: 19.20597,
    lng: 72.856384,
    heading: 190,
    speedKmh: 48,
    fuelPct: 54,
    batteryV: 24.1,
    engineTempC: 89,
    tirePressurePsi: 109,
    cargo: {
      title: "Fast-Moving Consumer Goods (Groceries & Dairy)",
      category: "Retail FMCG",
      weightTons: 18.0,
      manifestId: "MAN-2026-8804",
      client: "Reliance Retail Hub",
    },
    route: {
      id: "RT-8804",
      origin: "Vapi Border Warehouse",
      originLat: 20.3712,
      originLng: 72.9042,
      destination: "Dadar Wholesale Central Market",
      destLat: 19.0178,
      destLng: 72.8478,
      etaMinutes: 35,
      etaTime: "09:15 AM",
      distanceRemainingKm: 22.4,
      distanceTotalKm: 168.0,
      progressPct: 86,
      nextCheckpoint: "Kalanagar Flyover",
      waypoints: [
        { name: "Vapi Gate", lat: 20.3712, lng: 72.9042, passed: true, time: "05:00 AM" },
        { name: "Manor", lat: 19.6455, lng: 72.9102, passed: true, time: "06:30 AM" },
        { name: "Kandivali Express", lat: 19.2059, lng: 72.8563, passed: true, time: "08:35 AM" },
        { name: "Kalanagar Flyover", lat: 19.0621, lng: 72.8491, passed: false },
        { name: "Dadar Market", lat: 19.0178, lng: 72.8478, passed: false },
      ],
    },
    alerts: ["Speed governed at 50 km/h in suburban zone"],
    lastUpdated: "3s ago",
  },
  {
    id: "TRK-105",
    plateNumber: "MH-06-CL-7711",
    model: "Volvo FH16 750 Super Hauler",
    driver: {
      id: "DRV-05",
      name: "Anand Kulkarni",
      phone: "+91 98190 77319",
      avatar: "AK",
      experience: "15 years",
      rating: 4.99,
      dutyHoursToday: "4.8 / 11 hrs",
      safetyScore: 100,
      license: "MH06-2009-001923",
    },
    status: "in_transit",
    lat: 18.9501,
    lng: 72.9525,
    heading: 85,
    speedKmh: 35,
    fuelPct: 84,
    batteryV: 24.6,
    engineTempC: 84,
    tirePressurePsi: 114,
    cargo: {
      title: "Export Machine Tools & CNC Lathes",
      category: "Heavy Engineering",
      weightTons: 28.5,
      manifestId: "MAN-2026-8805",
      client: "Bharat Forge Engineering",
    },
    route: {
      id: "RT-8805",
      origin: "Chakan Industrial Area, Pune",
      originLat: 18.7612,
      originLng: 73.8592,
      destination: "Nhava Sheva Port Dock #7",
      destLat: 18.9501,
      destLng: 72.9525,
      etaMinutes: 10,
      etaTime: "08:50 AM",
      distanceRemainingKm: 3.2,
      distanceTotalKm: 125.0,
      progressPct: 97,
      nextCheckpoint: "JNPT Inward Security Gate",
      waypoints: [
        { name: "Chakan Hub", lat: 18.7612, lng: 73.8592, passed: true, time: "05:15 AM" },
        { name: "Lonavala Ghat", lat: 18.7557, lng: 73.4091, passed: true, time: "06:40 AM" },
        { name: "Khalapur Toll", lat: 18.8251, lng: 73.2842, passed: true, time: "07:25 AM" },
        { name: "JNPT Gate 7", lat: 18.9501, lng: 72.9525, passed: false },
      ],
    },
    alerts: ["Arriving at destination dock in ~10 mins"],
    lastUpdated: "5s ago",
  },
  {
    id: "TRK-106",
    plateNumber: "MH-04-DX-1102",
    model: "Mahindra Blazo X 35 Multi-Axle",
    driver: {
      id: "DRV-06",
      name: "Vijay More",
      phone: "+91 97022 34190",
      avatar: "VM",
      experience: "6 years",
      rating: 4.82,
      dutyHoursToday: "1.5 / 11 hrs",
      safetyScore: 94,
      license: "MH04-2018-005192",
    },
    status: "idling",
    lat: 19.479963,
    lng: 72.819249,
    heading: 90,
    speedKmh: 0,
    fuelPct: 69,
    batteryV: 24.3,
    engineTempC: 68,
    tirePressurePsi: 110,
    cargo: {
      title: "Packaged Structural Steel Beams",
      category: "Construction Materials",
      weightTons: 20.0,
      manifestId: "MAN-2026-8806",
      client: "JSW Steel Infra",
    },
    route: {
      id: "RT-8806",
      origin: "Vaitarna Railway Yard Depot",
      originLat: 19.4799,
      originLng: 72.8192,
      destination: "Bandra Kurla Complex (BKC) Metro Site",
      destLat: 19.0657,
      destLng: 72.8687,
      etaMinutes: 80,
      etaTime: "10:05 AM",
      distanceRemainingKm: 64.0,
      distanceTotalKm: 64.0,
      progressPct: 0,
      nextCheckpoint: "Vasai Bridge North",
      waypoints: [
        { name: "Vaitarna Yard", lat: 19.4799, lng: 72.8192, passed: true, time: "Waiting for toll clearance" },
        { name: "Vasai Bridge", lat: 19.3412, lng: 72.8421, passed: false },
        { name: "BKC Site", lat: 19.0657, lng: 72.8687, passed: false },
      ],
    },
    alerts: ["Idling for 18 mins (Driver rest break)"],
    lastUpdated: "20s ago",
  },
  {
    id: "TRK-107",
    plateNumber: "MH-04-FG-5519",
    model: "BharatBenz 1617R Medium Truck",
    driver: {
      id: "DRV-07",
      name: "Sunil Yadav",
      phone: "+91 98692 88410",
      avatar: "SY",
      experience: "5 years",
      rating: 4.85,
      dutyHoursToday: "0.0 / 11 hrs",
      safetyScore: 95,
      license: "MH04-2019-001298",
    },
    status: "maintenance",
    lat: 19.2812,
    lng: 73.0583,
    heading: 0,
    speedKmh: 0,
    fuelPct: 40,
    batteryV: 23.9,
    engineTempC: 30,
    tirePressurePsi: 102,
    cargo: {
      title: "Empty Return Container",
      category: "Equipment Repositioning",
      weightTons: 4.2,
      manifestId: "MAN-2026-8807",
      client: "Maersk Line Intermodal",
    },
    route: {
      id: "RT-8807",
      origin: "Bhiwandi Workshop #3",
      originLat: 19.2812,
      originLng: 73.0583,
      destination: "Boisar Logistics Depot",
      destLat: 19.7995,
      destLng: 72.7482,
      etaMinutes: 0,
      etaTime: "Scheduled for 02:00 PM",
      distanceRemainingKm: 98.0,
      distanceTotalKm: 98.0,
      progressPct: 0,
      nextCheckpoint: "Workshop Service Bay",
      waypoints: [],
    },
    alerts: ["Scheduled 50,000 km hydraulic brake service in progress"],
    lastUpdated: "5m ago",
  },
];

let fleet = [...INITIAL_TRUCKS];

// GET /org/fleet
router.get("/org/fleet", async (_req, res): Promise<void> => {
  res.json({
    organization: {
      name: "Apex Freight Logistics",
      fleetId: "ORG-APEX-8821",
      headquarters: "Bhiwandi Integrated Logistics Park, Maharashtra",
      corridor: "Western Freight Corridor (Boisar - Mumbai - JNPT)",
      activeFleetCount: fleet.length,
      supportHotline: "+91 (022) 6789-4400",
    },
    trucks: fleet,
  });
});

// GET /org/stats
router.get("/org/stats", async (_req, res): Promise<void> => {
  const activeOnRoad = fleet.filter((t) => t.status === "in_transit").length;
  const loadingCount = fleet.filter((t) => t.status === "loading").length;
  const idlingCount = fleet.filter((t) => t.status === "idling").length;
  const maintenanceCount = fleet.filter((t) => t.status === "maintenance").length;
  const totalTons = fleet.reduce((acc, t) => acc + (t.cargo?.weightTons || 0), 0);
  const avgSpeed = Math.round(
    fleet.filter((t) => t.speedKmh > 0).reduce((acc, t) => acc + t.speedKmh, 0) /
      Math.max(1, fleet.filter((t) => t.speedKmh > 0).length)
  );

  res.json({
    totalTrucks: fleet.length,
    activeOnRoad,
    loadingCount,
    idlingCount,
    maintenanceCount,
    totalTonsInTransit: Number(totalTons.toFixed(1)),
    onTimeDeliveryRate: 97.4,
    averageFleetSpeedKmh: avgSpeed || 54,
    averageFuelEconomyKmpl: 4.25,
    activeAlertsCount: fleet.reduce((acc, t) => acc + t.alerts.length, 0),
    driverFatigueCompliance: "100% Compliant (All drivers under 9 hrs continuous)",
    fleetCarbonOffset: "Verified Green Fleet (BS-VI & EV Mix)",
  });
});

// POST /org/dispatch
router.post("/org/dispatch", async (req, res): Promise<void> => {
  const { plateNumber, model, driverName, driverPhone, origin, destination, cargoTitle, cargoWeight, originLat, originLng, destLat, destLng } = req.body;

  const newId = `TRK-${100 + fleet.length + 1}`;
  const newTruck: Truck = {
    id: newId,
    plateNumber: plateNumber || `MH-04-AP-${Math.floor(1000 + Math.random() * 9000)}`,
    model: model || "BharatBenz 2823C (Heavy Hauler)",
    driver: {
      id: `DRV-0${fleet.length + 1}`,
      name: driverName || "Deepak Patil",
      phone: driverPhone || "+91 98200 11223",
      avatar: (driverName || "DP").split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2),
      experience: "6 years",
      rating: 4.9,
      dutyHoursToday: "0.5 / 11 hrs",
      safetyScore: 98,
      license: `MH04-${new Date().getFullYear()}-${Math.floor(100000 + Math.random() * 900000)}`,
    },
    status: "in_transit",
    lat: Number(originLat) || 19.782073,
    lng: Number(originLng) || 72.787496,
    heading: 180,
    speedKmh: 52,
    fuelPct: 95,
    batteryV: 24.6,
    engineTempC: 82,
    tirePressurePsi: 110,
    cargo: {
      title: cargoTitle || "Priority Logistics Container",
      category: "Freight Dispatch",
      weightTons: Number(cargoWeight) || 15.0,
      manifestId: `MAN-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
      client: "Apex Commercial Logistics",
    },
    route: {
      id: `RT-${Math.floor(8000 + Math.random() * 1000)}`,
      origin: origin || "Boisar MIDC Central Yard",
      originLat: Number(originLat) || 19.782073,
      originLng: Number(originLng) || 72.787496,
      destination: destination || "Nhava Sheva Port Gate",
      destLat: Number(destLat) || 18.9501,
      destLng: Number(destLng) || 72.9525,
      etaMinutes: 90,
      etaTime: "In ~1.5 hrs",
      distanceRemainingKm: 95.0,
      distanceTotalKm: 95.0,
      progressPct: 5,
      nextCheckpoint: "Corridor Checkpoint #1",
      waypoints: [
        { name: origin || "Origin Depot", lat: Number(originLat) || 19.782, lng: Number(originLng) || 72.787, passed: true, time: "Dispatched just now" },
        { name: destination || "Destination Terminal", lat: Number(destLat) || 18.95, lng: Number(destLng) || 72.95, passed: false },
      ],
    },
    alerts: ["Dispatched successfully. Real-time telemetry tracking live."],
    lastUpdated: "Just now",
  };

  fleet.unshift(newTruck);
  res.status(201).json({ success: true, truck: newTruck });
});

// PATCH /org/trucks/:id
router.patch("/org/trucks/:id", async (req, res): Promise<void> => {
  const { id } = req.params;
  const truck = fleet.find((t) => t.id === id);
  if (!truck) {
    res.status(404).json({ error: "Truck not found" });
    return;
  }

  if (req.body.status) truck.status = req.body.status;
  if (req.body.speedKmh !== undefined) truck.speedKmh = Number(req.body.speedKmh);
  if (req.body.fuelPct !== undefined) truck.fuelPct = Number(req.body.fuelPct);
  if (req.body.lat !== undefined) truck.lat = Number(req.body.lat);
  if (req.body.lng !== undefined) truck.lng = Number(req.body.lng);
  if (req.body.note) truck.alerts.unshift(req.body.note);
  truck.lastUpdated = "Just now";

  res.json({ success: true, truck });
});

// GET /org/drivers
router.get("/org/drivers", async (_req, res): Promise<void> => {
  const drivers = fleet.map((t) => ({
    ...t.driver,
    truckId: t.id,
    plateNumber: t.plateNumber,
    model: t.model,
    truckStatus: t.status,
    currentLocation: `${t.lat.toFixed(4)}, ${t.lng.toFixed(4)}`,
    currentRoute: `${t.route.origin} ➔ ${t.route.destination}`,
  }));
  res.json({ drivers });
});

// GET /org/geofences
router.get("/org/geofences", async (_req, res): Promise<void> => {
  const geofences = [
    {
      id: "GF-01",
      name: "Nhava Sheva (JNPT) Port Gate & Yards",
      type: "Port Terminal",
      lat: 18.9501,
      lng: 72.9525,
      radiusMeters: 2500,
      activeTrucksInside: 1,
      status: "Active Monitoring",
      verifiedPinId: 5,
    },
    {
      id: "GF-02",
      name: "Bhiwandi Integrated Logistics Park Mega-Hub",
      type: "Primary Distribution Hub",
      lat: 19.2812,
      lng: 73.0583,
      radiusMeters: 3000,
      activeTrucksInside: 2,
      status: "Active Monitoring",
    },
    {
      id: "GF-03",
      name: "Boisar MIDC Industrial Freight Center",
      type: "Origin Manufacturing Yard",
      lat: 19.782073,
      lng: 72.787496,
      radiusMeters: 1800,
      activeTrucksInside: 1,
      status: "Active Monitoring",
    },
    {
      id: "GF-04",
      name: "Navi Mumbai APMC Vashi Terminal",
      type: "Perishable & Cold Chain Hub",
      lat: 19.0754,
      lng: 73.0012,
      radiusMeters: 1500,
      activeTrucksInside: 0,
      status: "Active Monitoring",
    },
    {
      id: "GF-05",
      name: "Dahisar Highway Toll Plaza Security Checkpoint",
      type: "Weighbridge & Fastag Gate",
      lat: 19.2554,
      lng: 72.8621,
      radiusMeters: 800,
      activeTrucksInside: 1,
      status: "Active Monitoring",
    },
  ];
  res.json({ geofences });
});

export default router;
