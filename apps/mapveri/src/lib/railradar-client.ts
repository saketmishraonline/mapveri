import { useQuery } from '@tanstack/react-query';

export interface RailRadarTrainStatus {
  trainId: string;
  trainNumber: string;
  trainName: string;
  route: string;
  origin: string;
  destination: string;
  status: 'on_time' | 'delayed' | 'cancelled' | 'not_operating' | 'unknown';
  currentStation?: string;
  nextStation?: string;
  scheduledDeparture?: string;
  actualDeparture?: string;
  delayMinutes: number;
  speedKmph?: number;
  lat?: number;
  lng?: number;
  direction?: 'UP' | 'DOWN';
  platform?: string;
  dataFreshnessTimestamp: string;
  fetchedAt: string;
  isStale: boolean;
  staleThresholdMinutes: number;
  attribution: string;
  disclaimer: string;
}

export interface StationDeparture {
  trainNumber: string;
  trainName: string;
  destination: string;
  origin: string;
  platform: string;
  scheduledTime: string;
  expectedTime: string;
  delayMinutes: number;
  status: 'on_time' | 'delayed' | 'cancelled';
  speedKmph?: number;
  currentStation?: string;
  trainType: 'Fast Local' | 'Slow Local' | 'AC Local' | 'Mail/Express' | 'Vande Bharat';
}

export interface StationScheduleResponse {
  success: boolean;
  stationName: string;
  departures: StationDeparture[];
  freshnessTimestamp: string;
  attribution: string;
}

export interface RailRadarTrainsResponse {
  success: boolean;
  count: number;
  trains: RailRadarTrainStatus[];
  attribution: string;
  timestamp: string;
}

export async function fetchRailRadarTrains(): Promise<RailRadarTrainStatus[]> {
  try {
    const res = await fetch('/api/transit/railradar/trains');
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data: RailRadarTrainsResponse = await res.json();
    return data.trains || [];
  } catch (err) {
    console.warn('Failed to fetch RailRadar trains, using cached fallback:', err);
    return [];
  }
}

export async function fetchStationSchedule(stationName: string): Promise<StationScheduleResponse | null> {
  try {
    const res = await fetch(`/api/transit/railradar/stations/${encodeURIComponent(stationName)}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (err) {
    console.warn(`Failed to fetch schedule for ${stationName}:`, err);
    return null;
  }
}

export function useRailRadarTrains(enabled = true) {
  return useQuery({
    queryKey: ['railradar-trains'],
    queryFn: fetchRailRadarTrains,
    enabled,
    refetchInterval: enabled ? 12000 : false, // Poll every 12 seconds when radar is active
    staleTime: 8000,
  });
}

export function useRailRadarStationSchedule(stationName: string, enabled = true) {
  return useQuery({
    queryKey: ['railradar-station', stationName],
    queryFn: () => fetchStationSchedule(stationName),
    enabled: enabled && !!stationName,
    refetchInterval: enabled ? 20000 : false,
    staleTime: 15000,
  });
}

