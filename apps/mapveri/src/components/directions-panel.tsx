import { useState, useEffect, useMemo, useRef } from 'react';
import {
  Navigation,
  Car,
  Bike,
  Footprints,
  ArrowUpDown,
  MapPin,
  LocateFixed,
  Search,
  ChevronDown,
  ChevronUp,
  Clock,
  X,
  Check,
  CornerUpRight,
  CornerUpLeft,
  ArrowUp,
  CircleDot,
  Loader2,
  Sparkles,
  Play,
  RotateCcw,
} from 'lucide-react';
import type { Pin, NearbyPin } from '@workspace/api-client-react';
import {
  type TravelMode,
  type RouteOption,
  type LocationPoint,
  type ActiveRouteData,
  PRESET_LOCATIONS,
  calculateRouteOptions,
  formatRouteDistance,
  formatRouteDuration,
  haversineDistance,
} from '@/lib/routing-service';

export interface DirectionsPanelProps {
  destinationPin?: Pin | NearbyPin | null;
  currentGpsLocation?: { latitude: number; longitude: number } | null;
  pins: (Pin | NearbyPin)[];
  onRouteCalculated: (route: ActiveRouteData | null) => void;
  onClose: () => void;
  onPickOnMap?: (target: 'source' | 'destination') => void;
  pickedCoord?: { lat: number; lng: number } | null;
  isPickingOnMap?: 'source' | 'destination' | null;
}

export function DirectionsPanel({
  destinationPin,
  currentGpsLocation,
  pins,
  onRouteCalculated,
  onClose,
  onPickOnMap,
  pickedCoord,
  isPickingOnMap,
}: DirectionsPanelProps) {
  // Travel mode: driving, bicycle, foot
  const [mode, setMode] = useState<TravelMode>('driving');

  // Source & Destination points
  const [source, setSource] = useState<LocationPoint>(() => {
    if (currentGpsLocation) {
      return {
        name: 'Your Current Location',
        lat: currentGpsLocation.latitude,
        lng: currentGpsLocation.longitude,
        isCurrentLocation: true,
      };
    }
    // Default to Boisar Station
    return PRESET_LOCATIONS[0];
  });

  const [destination, setDestination] = useState<LocationPoint>(() => {
    if (destinationPin) {
      return {
        name: destinationPin.name,
        lat: destinationPin.lat,
        lng: destinationPin.lng,
        pinId: destinationPin.id,
      };
    }
    return PRESET_LOCATIONS[1]; // Theem College
  });

  // Selector modal/popover states
  const [selectingField, setSelectingField] = useState<'source' | 'destination' | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Routes state
  const [routes, setRoutes] = useState<RouteOption[]>([]);
  const [selectedRouteIndex, setSelectedRouteIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [showSteps, setShowSteps] = useState(false);
  const [isNavigating, setIsNavigating] = useState(false);
  const [activeStepIndex, setActiveStepIndex] = useState(0);

  // When pickedCoord arrives from parent map click
  useEffect(() => {
    if (pickedCoord && isPickingOnMap) {
      const newPoint: LocationPoint = {
        name: `Map Point (${pickedCoord.lat.toFixed(4)}, ${pickedCoord.lng.toFixed(4)})`,
        lat: pickedCoord.lat,
        lng: pickedCoord.lng,
      };
      if (isPickingOnMap === 'source') {
        setSource(newPoint);
      } else {
        setDestination(newPoint);
      }
      setSelectingField(null);
    }
  }, [pickedCoord, isPickingOnMap]);

  // Update destination if destinationPin changes externally
  useEffect(() => {
    if (destinationPin) {
      setDestination({
        name: destinationPin.name,
        lat: destinationPin.lat,
        lng: destinationPin.lng,
        pinId: destinationPin.id,
      });
    }
  }, [destinationPin]);

  // If GPS location becomes available and source was set to current location
  useEffect(() => {
    if (currentGpsLocation && source.isCurrentLocation) {
      setSource((prev) => ({
        ...prev,
        lat: currentGpsLocation.latitude,
        lng: currentGpsLocation.longitude,
      }));
    }
  }, [currentGpsLocation]);

  // Calculate routes when source, destination, or mode changes
  useEffect(() => {
    if (!source || !destination) return;

    let isCancelled = false;
    setIsLoading(true);
    setIsNavigating(false);
    setActiveStepIndex(0);

    calculateRouteOptions(source, destination, mode).then((calculatedRoutes) => {
      if (isCancelled) return;
      setRoutes(calculatedRoutes);
      setSelectedRouteIndex(0);
      setIsLoading(false);

      if (calculatedRoutes.length > 0) {
        const topRoute = calculatedRoutes[0];
        onRouteCalculated({
          coordinates: topRoute.geometry,
          sourceCoord: [source.lng, source.lat],
          destCoord: [destination.lng, destination.lat],
          sourceName: source.name,
          destName: destination.name,
          distanceMeters: topRoute.distanceMeters,
          durationSeconds: topRoute.durationSeconds,
          mode,
        });
      } else {
        onRouteCalculated(null);
      }
    });

    return () => {
      isCancelled = true;
    };
  }, [source.lat, source.lng, destination.lat, destination.lng, mode]);

  // When active route index changes, update the map
  const activeRoute = routes[selectedRouteIndex] || routes[0];

  const handleSelectRoute = (idx: number) => {
    setSelectedRouteIndex(idx);
    const chosen = routes[idx];
    if (chosen) {
      onRouteCalculated({
        coordinates: chosen.geometry,
        sourceCoord: [source.lng, source.lat],
        destCoord: [destination.lng, destination.lat],
        sourceName: source.name,
        destName: destination.name,
        distanceMeters: chosen.distanceMeters,
        durationSeconds: chosen.durationSeconds,
        mode: chosen.mode,
      });
    }
  };

  // Swap Source & Destination (like Google Maps ⇅)
  const handleSwap = () => {
    const temp = source;
    setSource(destination);
    setDestination(temp);
  };

  // Filter places for search dropdown
  const filteredPlaces = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return pins.slice(0, 15);
    return pins
      .filter((p) => `${p.name} ${p.category} ${p.description || ''}`.toLowerCase().includes(q))
      .slice(0, 15);
  }, [pins, searchQuery]);

  // Choose a point from list
  const handleChoosePoint = (point: LocationPoint) => {
    if (selectingField === 'source') {
      setSource(point);
    } else {
      setDestination(point);
    }
    setSelectingField(null);
    setSearchQuery('');
  };

  // Use current GPS location
  const handleUseCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          handleChoosePoint({
            name: 'Your Current Location',
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
            isCurrentLocation: true,
          });
        },
        () => {
          if (currentGpsLocation) {
            handleChoosePoint({
              name: 'Your Current Location',
              lat: currentGpsLocation.latitude,
              lng: currentGpsLocation.longitude,
              isCurrentLocation: true,
            });
          }
        },
        { enableHighAccuracy: true, timeout: 5000 }
      );
    } else if (currentGpsLocation) {
      handleChoosePoint({
        name: 'Your Current Location',
        lat: currentGpsLocation.latitude,
        lng: currentGpsLocation.longitude,
        isCurrentLocation: true,
      });
    }
  };

  return (
    <div className="flex h-full flex-col bg-[#fffdf9] text-[#172a3a]">
      {/* 1. GOOGLE MAPS STYLE TOP BAR: TRAVEL MODES & CLOSE */}
      <div className="flex items-center justify-between border-b border-[#e2e8df] px-4 py-2.5 bg-[#f6f8f5]">
        <div className="flex items-center gap-1">
          {/* Driving */}
          <button
            onClick={() => setMode('driving')}
            className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold transition active:scale-95 ${
              mode === 'driving'
                ? 'bg-[#205b51] text-white shadow-xs'
                : 'text-[#556963] hover:bg-[#e6ede5]'
            }`}
            title="Driving (Car / Cab / Auto)"
          >
            <Car size={15} />
            <span>Drive</span>
          </button>

          {/* Two-Wheeler / Bike */}
          <button
            onClick={() => setMode('bicycle')}
            className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold transition active:scale-95 ${
              mode === 'bicycle'
                ? 'bg-[#205b51] text-white shadow-xs'
                : 'text-[#556963] hover:bg-[#e6ede5]'
            }`}
            title="Two-Wheeler / Bicycle"
          >
            <Bike size={15} />
            <span>Two-Wheeler</span>
          </button>

          {/* Walking */}
          <button
            onClick={() => setMode('foot')}
            className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold transition active:scale-95 ${
              mode === 'foot'
                ? 'bg-[#205b51] text-white shadow-xs'
                : 'text-[#556963] hover:bg-[#e6ede5]'
            }`}
            title="Walking (Shortest Footpath)"
          >
            <Footprints size={15} />
            <span>Walk</span>
          </button>
        </div>

        <button
          onClick={() => {
            onRouteCalculated(null);
            onClose();
          }}
          className="grid h-8 w-8 place-items-center rounded-full text-[#6c7d77] hover:bg-[#e5ece4] transition"
          aria-label="Exit Directions"
          title="Exit directions"
        >
          <X size={18} />
        </button>
      </div>

      {/* 2. GOOGLE MAPS STYLE SOURCE & DESTINATION INPUT BOX */}
      <div className="border-b border-[#e2e8df] px-4 py-3 bg-[#ffffff]">
        <div className="relative flex items-center gap-2">
          {/* Left Visual Dots & Connector */}
          <div className="flex flex-col items-center justify-between self-stretch py-2.5">
            <span className="h-2.5 w-2.5 rounded-full border-2 border-[#10b981] bg-white ring-2 ring-[#10b981]/20" />
            <span className="h-5 w-0.5 border-l-2 border-dotted border-[#9eb0a7]" />
            <MapPin size={13} className="text-[#ef4444]" />
          </div>

          {/* Input Bars */}
          <div className="flex-1 space-y-2">
            {/* Source Box */}
            <div
              onClick={() => setSelectingField('source')}
              className={`flex cursor-pointer items-center justify-between rounded-xl border px-3 py-1.5 text-xs transition ${
                selectingField === 'source'
                  ? 'border-[#2d6b60] bg-[#eef5f1] ring-2 ring-[#2d6b60]/20'
                  : 'border-[#cfdcd2] bg-[#fbfbf7] hover:bg-[#f1f6f1]'
              }`}
            >
              <div className="truncate">
                <span className="block text-[10px] font-semibold uppercase tracking-wider text-[#798e85]">
                  Start Location
                </span>
                <span className="font-bold text-[#172a3a] truncate block">
                  {source.name}
                </span>
              </div>
              <span className="text-[11px] font-semibold text-[#2d6b60] shrink-0 ml-1">
                Change
              </span>
            </div>

            {/* Destination Box */}
            <div
              onClick={() => setSelectingField('destination')}
              className={`flex cursor-pointer items-center justify-between rounded-xl border px-3 py-1.5 text-xs transition ${
                selectingField === 'destination'
                  ? 'border-[#2d6b60] bg-[#eef5f1] ring-2 ring-[#2d6b60]/20'
                  : 'border-[#cfdcd2] bg-[#fbfbf7] hover:bg-[#f1f6f1]'
              }`}
            >
              <div className="truncate">
                <span className="block text-[10px] font-semibold uppercase tracking-wider text-[#798e85]">
                  Destination
                </span>
                <span className="font-bold text-[#172a3a] truncate block">
                  {destination.name}
                </span>
              </div>
              <span className="text-[11px] font-semibold text-[#2d6b60] shrink-0 ml-1">
                Change
              </span>
            </div>
          </div>

          {/* Swap Button ⇅ */}
          <button
            onClick={handleSwap}
            className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-[#cbd8ce] bg-[#f7f9f6] text-[#33534b] shadow-2xs hover:bg-[#eaf1ec] active:scale-90 transition"
            title="Swap Starting point and Destination"
            aria-label="Reverse direction"
          >
            <ArrowUpDown size={17} />
          </button>
        </div>

        {/* Quick Pick on Map notice if active */}
        {isPickingOnMap && (
          <div className="mt-2.5 flex items-center justify-between rounded-lg bg-[#fef3c7] px-3 py-1.5 text-xs text-[#92400e]">
            <span className="font-medium">
              Click anywhere on the map to choose {isPickingOnMap === 'source' ? 'start point' : 'destination'}.
            </span>
            <button
              onClick={() => onPickOnMap?.('source')}
              className="text-xs font-bold underline text-[#78350f]"
            >
              Cancel
            </button>
          </div>
        )}
      </div>

      {/* 3. POINT SELECTOR POPUP (MODAL OVERLAY IN THAT WINDOW) */}
      {selectingField && (
        <div className="border-b border-[#dfe5dd] bg-[#f6f8f5] p-3 space-y-2 animate-in fade-in duration-150">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[#172a3a]">
              Choose {selectingField === 'source' ? 'Starting Point' : 'Destination'}
            </span>
            <button
              onClick={() => setSelectingField(null)}
              className="p-1 text-[#6b7c76] hover:text-[#172a3a]"
            >
              <X size={15} />
            </button>
          </div>

          {/* Search box */}
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 text-[#7a8d86]" size={14} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search places, stations, landmarks..."
              className="w-full rounded-lg border border-[#ccd8cf] bg-white py-1.5 pl-8 pr-3 text-xs text-[#172a3a] outline-none focus:border-[#2d6b60]"
              autoFocus
            />
          </div>

          {/* Quick presets row */}
          <div className="flex flex-wrap items-center gap-1.5 pt-1">
            <button
              onClick={handleUseCurrentLocation}
              className="flex items-center gap-1 rounded-md border border-[#b2d5c4] bg-[#eef7f2] px-2 py-1 text-[11px] font-bold text-[#1b5e50] hover:bg-[#dff0e6] transition"
            >
              <LocateFixed size={12} />
              <span>Current GPS Location</span>
            </button>

            {onPickOnMap && (
              <button
                onClick={() => {
                  onPickOnMap(selectingField);
                }}
                className="flex items-center gap-1 rounded-md border border-[#cbd7ce] bg-white px-2 py-1 text-[11px] font-semibold text-[#2f554c] hover:bg-[#eef2ec] transition"
              >
                <MapPin size={12} />
                <span>Choose on map</span>
              </button>
            )}

            {PRESET_LOCATIONS.map((preset) => (
              <button
                key={preset.name}
                onClick={() => handleChoosePoint(preset)}
                className="rounded-md border border-[#d2ded2] bg-white px-2 py-1 text-[11px] font-medium text-[#3b544e] hover:bg-[#edf2ea] transition"
              >
                {preset.name.split(',')[0]}
              </button>
            ))}
          </div>

          {/* Saved / Pinned places search results */}
          <div className="max-h-40 overflow-y-auto rounded-lg border border-[#dbe3db] bg-white divide-y divide-[#eff3ee]">
            {filteredPlaces.length === 0 ? (
              <p className="p-3 text-center text-xs text-[#7e8f89]">No matching places found</p>
            ) : (
              filteredPlaces.map((pin) => (
                <button
                  key={pin.id}
                  onClick={() =>
                    handleChoosePoint({
                      name: pin.name,
                      lat: pin.lat,
                      lng: pin.lng,
                      pinId: pin.id,
                    })
                  }
                  className="flex w-full items-center justify-between px-3 py-2 text-left hover:bg-[#f1f6f1] transition text-xs"
                >
                  <div className="truncate pr-2">
                    <p className="font-bold text-[#172a3a] truncate">{pin.name}</p>
                    <p className="text-[10px] text-[#71857e] truncate">{pin.category}</p>
                  </div>
                  <span className="text-[10px] font-mono text-[#2d6b60] shrink-0">
                    {formatRouteDistance(
                      haversineDistance(
                        selectingField === 'source' ? destination.lat : source.lat,
                        selectingField === 'source' ? destination.lng : source.lng,
                        pin.lat,
                        pin.lng
                      )
                    )}
                  </span>
                </button>
              ))
            )}
          </div>
        </div>
      )}

      {/* 4. SHORTEST DISTANCE CALCULATION & ROUTE OPTIONS */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-8 text-center space-y-2">
            <Loader2 className="animate-spin text-[#2d6b60]" size={28} />
            <p className="text-xs font-bold text-[#205b51]">
              Calculating shortest distance & route options...
            </p>
            <p className="text-[11px] text-[#768a83]">
              Comparing road geometry via OpenStreetMap engine
            </p>
          </div>
        ) : routes.length === 0 ? (
          <div className="rounded-xl border border-[#e2d5cb] bg-[#fbf5f0] p-4 text-center">
            <p className="text-xs font-bold text-[#964a38]">Could not find a navigable road route</p>
            <p className="mt-1 text-[11px] text-[#7b6a65]">
              Try selecting a different starting point or switch to Walking mode.
            </p>
          </div>
        ) : (
          <>
            {/* ROUTE OPTIONS COMPARISON PILLS / CARDS */}
            {routes.length > 1 && (
              <div className="space-y-1.5">
                <span className="text-[11px] font-bold text-[#627670] uppercase tracking-wider">
                  Available Route Options ({routes.length})
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {routes.map((rt, idx) => {
                    const isSelected = selectedRouteIndex === idx;
                    return (
                      <button
                        key={rt.id}
                        onClick={() => handleSelectRoute(idx)}
                        className={`flex flex-col text-left rounded-xl p-2.5 border transition active:scale-[0.98] ${
                          isSelected
                            ? 'border-[#2d6b60] bg-[#eef7f2] shadow-xs ring-1 ring-[#2d6b60]'
                            : 'border-[#d7e1d8] bg-white hover:bg-[#f6f9f6]'
                        }`}
                      >
                        <div className="flex items-center justify-between w-full">
                          <span
                            className={`rounded px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                              rt.isShortest
                                ? 'bg-[#10b981] text-white'
                                : rt.isFastest
                                ? 'bg-[#2563eb] text-white'
                                : 'bg-[#e2ebe4] text-[#425d56]'
                            }`}
                          >
                            {rt.isShortest ? 'Shortest' : rt.isFastest ? 'Fastest' : `Option ${idx + 1}`}
                          </span>
                          <span className="font-mono text-xs font-bold text-[#172a3a]">
                            {formatRouteDistance(rt.distanceMeters)}
                          </span>
                        </div>
                        <div className="mt-1.5 flex items-baseline justify-between">
                          <span className="text-xs font-extrabold text-[#205b51]">
                            {formatRouteDuration(rt.durationSeconds)}
                          </span>
                          <span className="text-[11px] text-[#6b7c76] truncate max-w-[140px]">
                            {rt.summary}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ACTIVE ROUTE HERO CARD: SHORTEST DISTANCE HIGHLIGHT */}
            {activeRoute && (
              <div className="rounded-2xl border border-[#cbd8cd] bg-gradient-to-br from-[#ffffff] to-[#f4f7f4] p-4 shadow-xs space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-2xl font-black text-[#172a3a] tracking-tight">
                        {formatRouteDistance(activeRoute.distanceMeters)}
                      </span>
                      <span className="text-base font-bold text-[#205b51]">
                        ({formatRouteDuration(activeRoute.durationSeconds)})
                      </span>
                    </div>
                    <p className="mt-0.5 text-xs font-medium text-[#50665f]">
                      {activeRoute.summary}
                    </p>
                  </div>

                  <span
                    className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-bold shadow-2xs ${
                      activeRoute.isShortest
                        ? 'bg-[#10b981]/15 text-[#047857] border border-[#10b981]/30'
                        : 'bg-[#2563eb]/15 text-[#1d4ed8] border border-[#2563eb]/30'
                    }`}
                  >
                    <Sparkles size={12} />
                    {activeRoute.isShortest ? 'Shortest Road Distance' : 'Alternative Route'}
                  </span>
                </div>

                {/* Distance metrics comparison strip */}
                <div className="grid grid-cols-2 gap-2 border-t border-[#e2eae2] pt-2.5 text-[11px]">
                  <div className="rounded-lg bg-[#eaf3ec] p-2">
                    <span className="block text-[10px] font-semibold text-[#617e74] uppercase">
                      Road Route Distance
                    </span>
                    <span className="font-bold text-[#1a564a]">
                      {formatRouteDistance(activeRoute.distanceMeters)}
                    </span>
                  </div>
                  <div className="rounded-lg bg-[#f0f4ee] p-2">
                    <span className="block text-[10px] font-semibold text-[#617e74] uppercase">
                      Straight-line (Air)
                    </span>
                    <span className="font-bold text-[#3d5951]">
                      {formatRouteDistance(activeRoute.straightLineMeters)}
                    </span>
                  </div>
                </div>

                {/* Turn-by-Turn Steps Toggle */}
                {activeRoute.steps.length > 0 && (
                  <div className="border-t border-[#e2eae2] pt-2">
                    <button
                      onClick={() => setShowSteps(!showSteps)}
                      className="flex w-full items-center justify-between text-xs font-bold text-[#205b51] hover:text-[#134038] py-1 transition"
                    >
                      <span>
                        {showSteps ? 'Hide' : 'View'} Turn-by-Turn Steps ({activeRoute.steps.length} maneuvers)
                      </span>
                      {showSteps ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
                    </button>

                    {showSteps && (
                      <div className="mt-2 space-y-2 rounded-xl border border-[#dce5dc] bg-white p-3 max-h-56 overflow-y-auto divide-y divide-[#f0f4f0]">
                        {activeRoute.steps.map((st, sIdx) => {
                          const isCurrent = isNavigating && activeStepIndex === sIdx;
                          return (
                            <div
                              key={st.id}
                              className={`flex items-start gap-2.5 py-2 text-xs transition ${
                                isCurrent ? 'bg-[#eaf4ed] -mx-2 px-2 rounded-lg font-bold' : ''
                              }`}
                            >
                              <div className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full bg-[#e3ece4] text-[#2d6b60]">
                                {st.type === 'depart' ? (
                                  <CircleDot size={13} className="text-[#10b981]" />
                                ) : st.type === 'arrive' ? (
                                  <MapPin size={13} className="text-[#ef4444]" />
                                ) : st.modifier?.includes('right') ? (
                                  <CornerUpRight size={13} />
                                ) : st.modifier?.includes('left') ? (
                                  <CornerUpLeft size={13} />
                                ) : (
                                  <ArrowUp size={13} />
                                )}
                              </div>
                              <div className="flex-1">
                                <p className="text-[#172a3a] leading-tight">{st.instruction}</p>
                                {st.distance > 0 && (
                                  <p className="mt-0.5 text-[10px] text-[#788e86]">
                                    {formatRouteDistance(st.distance)}
                                  </p>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}

                {/* 5. ACTION BUTTONS: START NAVIGATION */}
                <div className="flex items-center gap-2 pt-1 border-t border-[#e2eae2]">
                  <button
                    onClick={() => {
                      setIsNavigating(!isNavigating);
                      setShowSteps(true);
                    }}
                    className={`flex flex-1 items-center justify-center gap-1.5 rounded-xl py-2.5 px-3 text-xs font-bold transition active:scale-95 ${
                      isNavigating
                        ? 'bg-[#10b981] text-white shadow-xs'
                        : 'bg-[#205b51] text-white hover:bg-[#184840] shadow-xs'
                    }`}
                  >
                    {isNavigating ? <RotateCcw size={14} /> : <Play size={14} />}
                    <span>{isNavigating ? 'Navigating Active' : 'Start Navigation'}</span>
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

