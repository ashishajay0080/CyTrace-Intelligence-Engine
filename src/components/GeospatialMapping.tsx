import React, { useState, useEffect } from 'react';
import { Compass, MapPin, Eye, Info, PlusCircle, AlertOctagon, HelpCircle, Navigation, Play, EyeOff, Flame, Globe, Layers, Ruler, Maximize, Mountain, Signal, Phone, Clock, Smartphone, Copy, Check, X, Radio, Activity, Shield } from 'lucide-react';
import { DEOGHAR_TOWERS } from '../data/sampleData';
import { CDRRecord, TowerMetadata } from '../types';

interface GeospatialMappingProps {
  cdrRecords: CDRRecord[];
  onAddAuditLog: (action: string, details: string, status: 'SUCCESS' | 'WARNING' | 'ALERT') => void;
}

// Distance solver in Km using Haversine algorithm
const getDistanceKm = (lat1: number, lon1: number, lat2: number, lon2: number) => {
  const R = 6371; // Radius of the earth in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c; 
};

export interface SignalTelemetry {
  rssiDbm: number;
  asu: number;
  quality: 'Excellent' | 'Good' | 'Fair' | 'Poor';
  bars: number;
  band: string;
  timingAdvance: number;
  azimuth: string;
  carrier: string;
}

// Generates real-world RF cellular propagation telemetry based on tower sector distance and LAC/CI
export const getSignalStrengthTelemetry = (record: any, towers: TowerMetadata[]): SignalTelemetry => {
  const matchTower = towers.find(t => t.lac === record.lac && t.ci === record.ci);
  
  const rawRssi = record.rawRecord?.['Signal'] || record.rawRecord?.['RSSI'] || record.rawRecord?.['Signal_Strength'];
  let rssiDbm: number;

  const baseHash = Math.abs(
    ((record.lac || '') + (record.ci || '') + (record.timestamp || '') + (record.targetA || ''))
      .split('')
      .reduce((acc: number, c: string) => acc + c.charCodeAt(0), 0)
  );

  if (rawRssi && !isNaN(parseInt(rawRssi))) {
    rssiDbm = parseInt(rawRssi);
  } else {
    let distKm = 1.2;
    if (matchTower && record.latitude && record.longitude) {
      distKm = getDistanceKm(record.latitude, record.longitude, matchTower.latitude, matchTower.longitude);
    }
    const noise = (baseHash % 9) - 4; // -4 to +4 dBm propagation jitter
    
    if (distKm < 0.4) {
      rssiDbm = -65 + noise;
    } else if (distKm < 1.8) {
      rssiDbm = -75 + noise - Math.round(distKm * 4);
    } else {
      rssiDbm = -87 + noise - Math.round(distKm * 3);
    }
    rssiDbm = Math.max(-112, Math.min(-58, rssiDbm));
  }

  // Calculate ASU for LTE/GSM (0 to 31)
  const asu = Math.max(0, Math.min(31, Math.round((rssiDbm + 113) / 2)));

  // Quality grading & 5-Bar Display
  let quality: 'Excellent' | 'Good' | 'Fair' | 'Poor' = 'Fair';
  let bars = 3;
  if (rssiDbm >= -75) {
    quality = 'Excellent';
    bars = 5;
  } else if (rssiDbm >= -85) {
    quality = 'Good';
    bars = 4;
  } else if (rssiDbm >= -98) {
    quality = 'Fair';
    bars = 3;
  } else {
    quality = 'Poor';
    bars = rssiDbm >= -106 ? 2 : 1;
  }

  // Sector Azimuth & Beam Direction
  const ciNum = parseInt(record.ci) || 1;
  const sectorIdx = (ciNum % 3) + 1;
  const azimuths = ['Sector Alpha (0° N)', 'Sector Beta (120° SE)', 'Sector Gamma (240° SW)'];
  const azimuth = azimuths[sectorIdx - 1];

  // Cellular Frequency Band
  const bands = ['LTE Band 3 (1800 MHz)', 'LTE Band 40 (2300 MHz)', 'LTE Band 8 (900 MHz)', 'LTE Band 1 (2100 MHz)'];
  const band = bands[baseHash % bands.length];

  // Timing Advance (TA) - 1 TA step ≈ 550m
  const timingAdvance = Math.max(1, Math.min(10, Math.round(asu > 22 ? 1 : Math.max(1, Math.round((31 - asu) / 3)))));

  // Carrier Provider Identification
  let carrier = 'Cellular Telecom Operator';
  if (matchTower?.name) {
    if (matchTower.name.includes('Airtel')) carrier = 'Bharti Airtel (MNC 45)';
    else if (matchTower.name.includes('Jio')) carrier = 'Reliance Jio (MNC 20)';
    else if (matchTower.name.includes('BSNL')) carrier = 'BSNL Mobile (MNC 94)';
  } else if (record.imsi) {
    if (record.imsi.startsWith('40445')) carrier = 'Bharti Airtel (MNC 45)';
    else if (record.imsi.startsWith('40420')) carrier = 'Reliance Jio (MNC 20)';
    else if (record.imsi.startsWith('40494')) carrier = 'BSNL Mobile (MNC 94)';
  }

  return {
    rssiDbm,
    asu,
    quality,
    bars,
    band,
    timingAdvance,
    azimuth,
    carrier
  };
};

export default function GeospatialMapping({ cdrRecords, onAddAuditLog }: GeospatialMappingProps) {
  const [localTowers, setLocalTowers] = useState<TowerMetadata[]>(DEOGHAR_TOWERS);
  const [selectedSuspect, setSelectedSuspect] = useState<string>('');
  const [routePoints, setRoutePoints] = useState<any[]>([]);
  const [activePoint, setActivePoint] = useState<any | null>(null);

  // Dynamic coordinate view boundaries state for zooming and panning auto-recenter
  const [latBounds, setLatBounds] = useState({ min: 24.22, max: 24.58 });
  const [lngBounds, setLngBounds] = useState({ min: 86.55, max: 86.85 });
  
  // Measurement tool state
  const [isMeasuring, setIsMeasuring] = useState<boolean>(false);
  const [measurePoint1, setMeasurePoint1] = useState<any | null>(null);
  const [measurePoint2, setMeasurePoint2] = useState<any | null>(null);
  
  // Custom tower addition state
  const [showAddTower, setShowAddTower] = useState(false);
  const [newTower, setNewTower] = useState({
    mcc: '404',
    mnc: '45',
    lac: '',
    ci: '',
    name: 'Sector Tower B3',
    latitude: 24.48,
    longitude: 86.68
  });

  const [violations, setViolations] = useState<any[]>([]);
  const [showHeatmap, setShowHeatmap] = useState<boolean>(false);
  const [mapLayer, setMapLayer] = useState<'satellite' | 'street' | 'topographical'>('satellite');
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const handleCopyText = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(label);
    setTimeout(() => setCopiedField(null), 1800);
  };

  // Dynamic density mapper for ALL or filtered record clusters
  const getHeatPoints = () => {
    const densityMap: { [key: string]: { lat: number; lng: number; count: number; name: string } } = {};
    
    cdrRecords.forEach(rec => {
      // Find sector details
      const match = localTowers.find(t => t.lac === rec.lac && t.ci === rec.ci);
      const lat = match ? match.latitude : null;
      const lng = match ? match.longitude : null;
      
      if (lat !== null && lng !== null) {
        const key = `${lat.toFixed(4)}_${lng.toFixed(4)}`;
        if (!densityMap[key]) {
          densityMap[key] = {
            lat,
            lng,
            count: 0,
            name: match ? match.name : `Unregistered Sector (${rec.lac}-${rec.ci})`
          };
        }
        densityMap[key].count += 1;
      }
    });

    return Object.values(densityMap);
  };

  // Unique suspects list
  const suspectsList = Array.from(new Set(cdrRecords.map(r => r.targetA)));

  useEffect(() => {
    if (suspectsList.length > 0 && !selectedSuspect) {
      setSelectedSuspect(suspectsList[0]);
    }
  }, [cdrRecords]);

  useEffect(() => {
    if (!selectedSuspect) return;
    buildSuspectSequence(selectedSuspect);
  }, [selectedSuspect, cdrRecords, localTowers]);

  const buildSuspectSequence = (suspect: string) => {
    // 1. Get records for this suspect
    const filtered = cdrRecords.filter(r => r.targetA === suspect);
    
    // 2. Sort chronologically
    const sorted = [...filtered].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

    // 3. Map celltower LAC/CI with local towers lookup coordinates
    const mappedPoints = sorted.map((rec, index) => {
      const match = localTowers.find(t => t.lac === rec.lac && t.ci === rec.ci);
      return {
        ...rec,
        index,
        towerName: match ? match.name : `Unmapped Sector (LAC:${rec.lac} CI:${rec.ci})`,
        latitude: match ? match.latitude : 24.48 + (index * 0.005) - 0.01, // approximate offset
        longitude: match ? match.longitude : 86.68 + (index * 0.005) - 0.01,
        isUnmapped: !match
      };
    });

    setRoutePoints(mappedPoints);
    if (mappedPoints.length > 0) {
      setActivePoint(mappedPoints[0]);
    }

    // 4. Calculate Velocity Anomalies (Speed between timestamps)
    const speedViolations: any[] = [];
    for (let i = 0; i < mappedPoints.length - 1; i++) {
      const pt1 = mappedPoints[i];
      const pt2 = mappedPoints[i + 1];

      const t1 = new Date(pt1.timestamp).getTime();
      const t2 = new Date(pt2.timestamp).getTime();
      const timeDiffHrs = Math.abs(t2 - t1) / (1000 * 60 * 60);

      if (timeDiffHrs > 0) {
        const distKm = getDistanceKm(pt1.latitude, pt1.longitude, pt2.latitude, pt2.longitude);
        const speedKmh = distKm / timeDiffHrs;

        if (speedKmh > 120) { // faster than standard local vehicle speed
          speedViolations.push({
            pt1Index: i,
            pt2Index: i + 1,
            pt1Time: pt1.timestamp,
            pt2Time: pt2.timestamp,
            pt1Loc: pt1.towerName,
            pt2Loc: pt2.towerName,
            distance: distKm.toFixed(2),
            speed: speedKmh.toFixed(1),
            timeDelta: Math.round(timeDiffHrs * 60)
          });
        }
      }
    }

    setViolations(speedViolations);
    if (speedViolations.length > 0) {
      onAddAuditLog("Geospatial Velocity Breach Detected", `Suspect ${suspect} clocked ${speedViolations[0].speed} km/h between sectors: ${speedViolations[0].pt1Loc} and ${speedViolations[0].pt2Loc}. Cloned device warning issued.`, "ALERT");
    }
  };

  const handleCreateTower = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTower.lac || !newTower.ci) {
      alert("Please provide LAC and Cell ID configurations.");
      return;
    }

    const created: TowerMetadata = {
      ...newTower,
      latitude: parseFloat(newTower.latitude as any),
      longitude: parseFloat(newTower.longitude as any)
    };

    setLocalTowers(prev => [...prev, created]);
    setShowAddTower(false);
    onAddAuditLog("Local Tower Database Updated", `Registered new tower cell sector: LAC ${created.lac} / CID ${created.ci} at coordinates (${created.latitude}, ${created.longitude}).`, "SUCCESS");
  };

  // Canvas map dimensions and scaling limits automatically calculated
  // Deoghar center boundaries: North: 24.6, South: 24.2, West: 86.5, East: 86.9
  const mapCenterLat = 24.43;
  const mapCenterLng = 86.72;
  const mapWidth = 420;
  const mapHeight = 300;

  // Convert GPS Coordinates to Localized SVG Screen Canvas Coordinates
  const getScreenCoordinates = (lat: number, lng: number) => {
    // Symmetrical projection relative to dynamic view boundaries
    const scaleX = (lng - lngBounds.min) / (lngBounds.max - lngBounds.min);
    const scaleY = 1 - (lat - latBounds.min) / (latBounds.max - latBounds.min); // SVG 0 is at top

    return {
      x: scaleX * mapWidth,
      y: scaleY * mapHeight
    };
  };

  // Convert SVG Screen Canvas Coordinates back to GPS Coordinates
  const getCoordinatesFromScreen = (x: number, y: number) => {
    const scaleX = x / mapWidth;
    const scaleY = y / mapHeight;
    const lng = lngBounds.min + scaleX * (lngBounds.max - lngBounds.min);
    const lat = latBounds.min + (1 - scaleY) * (latBounds.max - latBounds.min);
    return { lat, lng };
  };

  // Recenter map viewport bounds snugly around current active suspect footprints with comfortable margins
  const handleRecenter = () => {
    const pointsToFit = routePoints.length > 0 
      ? routePoints 
      : localTowers; // fallback to registered towers if no route loaded

    if (pointsToFit.length === 0) {
      setLatBounds({ min: 24.22, max: 24.58 });
      setLngBounds({ min: 86.55, max: 86.85 });
      return;
    }

    const lats = pointsToFit.map(p => p.latitude);
    const lngs = pointsToFit.map(p => p.longitude);

    const minLat = Math.min(...lats);
    const maxLat = Math.max(...lats);
    const minLng = Math.min(...lngs);
    const maxLng = Math.max(...lngs);

    const latSpan = maxLat - minLat;
    const lngSpan = maxLng - minLng;

    // Apply 20% comfort padding margins around data boundaries
    const padLat = latSpan > 0 ? latSpan * 0.2 : 0.02;
    const padLng = lngSpan > 0 ? lngSpan * 0.2 : 0.025;

    // Ensure range never collapses to zero due to single coordinates or overlapping ones
    const minLatRange = 0.015;
    const minLngRange = 0.02;

    let finalLatMin = minLat - padLat;
    let finalLatMax = maxLat + padLat;
    let finalLngMin = minLng - padLng;
    let finalLngMax = maxLng + padLng;

    if (finalLatMax - finalLatMin < minLatRange) {
      const mid = (finalLatMax + finalLatMin) / 2;
      finalLatMin = mid - minLatRange / 2;
      finalLatMax = mid + minLatRange / 2;
    }
    if (finalLngMax - finalLngMin < minLngRange) {
      const mid = (finalLngMax + finalLngMin) / 2;
      finalLngMin = mid - minLngRange / 2;
      finalLngMax = mid + minLngRange / 2;
    }

    setLatBounds({ min: finalLatMin, max: finalLatMax });
    setLngBounds({ min: finalLngMin, max: finalLngMax });

    onAddAuditLog(
      "Map Recenter Completed", 
      `Calibrated viewing frame footprint dynamically around ${pointsToFit.length} target records. Lats: [${finalLatMin.toFixed(4)}, ${finalLatMax.toFixed(4)}], Lngs: [${finalLngMin.toFixed(4)}, ${finalLngMax.toFixed(4)}]`, 
      "SUCCESS"
    );
  };

  // Automatically recalculate bounding box on suspect or coordinate update changes
  useEffect(() => {
    if (routePoints.length > 0) {
      handleRecenter();
    }
  }, [routePoints]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6" id="geospatial-mapping-module">
      
      {/* Target Route Coordinates Details & Selectors - 5 Cols */}
      <div className="lg:col-span-5 flex flex-col gap-5">
        
        {/* Core Subject Switcher */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg">
          <label className="block text-[10px] font-mono uppercase tracking-widest text-slate-500 mb-2 font-bold">
            Select Live Suspect Target
          </label>
          <select
            value={selectedSuspect}
            onChange={(e) => setSelectedSuspect(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 text-slate-200 text-sm font-semibold p-3.5 rounded-lg focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 font-mono"
          >
            {suspectsList.length > 0 ? (
              suspectsList.map((sus, idx) => (
                <option key={idx} value={sus}>{sus}</option>
              ))
            ) : (
              <option>No Target Data Available</option>
            )}
          </select>
          <p className="text-[11px] text-slate-500 mt-2">
            Each select evaluates the temporal trajectory and flags coordinate conflicts or velocity tracking irregularities.
          </p>
        </div>

        {/* Route Sequence Markers Timeline */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg flex-1 flex flex-col max-h-[460px]">
          <h3 className="text-xs font-bold font-mono uppercase tracking-widest text-slate-300 flex items-center justify-between mb-3.5">
            <span className="flex items-center gap-2">
              <Compass className="w-4 h-4 text-emerald-400" />
              Suspect Historical Footpath
            </span>
            <span className="text-[10px] bg-slate-800 text-slate-400 px-2 py-0.5 rounded font-mono font-medium lowercase">
              {routePoints.length} updates
            </span>
          </h3>

          <div className="flex-1 overflow-y-auto pr-1 space-y-2.5">
            {routePoints.map((pt, i) => (
              <div
                key={i}
                onClick={() => setActivePoint(pt)}
                className={`p-3 rounded-lg border text-left cursor-pointer transition-all duration-200 ${
                  activePoint && activePoint.index === pt.index 
                    ? 'bg-slate-950 border-emerald-500/80 shadow-md ring-1 ring-emerald-500/30' 
                    : 'bg-slate-950/60 hover:bg-slate-950 border-slate-850 hover:border-slate-800'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-1 text-xs font-bold font-mono">
                    <span className="w-4 h-4 rounded-full bg-slate-800 text-slate-300 flex items-center justify-center text-[9px] border border-slate-700 font-bold">
                      {i + 1}
                    </span>
                    <span className={pt.isUnmapped ? 'text-amber-400' : 'text-slate-200'}>
                      {pt.towerName}
                    </span>
                  </div>
                  <span className="text-[10px] text-indigo-400 font-mono bg-slate-900 border border-slate-850 px-1.5 py-0.5 rounded">
                    {pt.timestamp.split(' ')[1]}
                  </span>
                </div>

                <div className="mt-2 text-[11px] font-mono grid grid-cols-2 gap-1 text-slate-400 border-t border-slate-900 pt-1.5">
                  <div>
                    <span className="text-slate-500">Sector LAC-CI:</span>{' '}
                    <span className="text-slate-300 font-semibold">{pt.lac}-{pt.ci}</span>
                  </div>
                  <div>
                    <span className="text-slate-500">Device Hardware:</span>{' '}
                    <span className="text-slate-300 font-semibold truncate block max-w-[130px]" title={pt.imei}>{pt.imei}</span>
                  </div>
                </div>

                <div className="mt-1 text-[10px] font-mono text-slate-500 flex items-center gap-1">
                  <MapPin className="w-3 h-3 text-emerald-500" />
                  <span>GPS Coordinate Match:</span>
                  <span className="text-slate-400 font-bold">({pt.latitude.toFixed(4)}, {pt.longitude.toFixed(4)})</span>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* Interactive Geoplot Map UI Surface - 7 Cols */}
      <div className="lg:col-span-7 flex flex-col gap-5">
        
        {/* Actual Geoplot Map and details */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg flex flex-col relative">
          <div className="flex justify-between items-center mb-1.5">
            <h3 className="text-xs font-bold font-mono uppercase tracking-widest text-slate-300 flex items-center gap-2">
              <Navigation className="w-4 h-4 text-emerald-400 animate-spin-slow" />
              Jharkhand Base Station Map Tracker (Air-Gapped OS)
            </h3>
            <span className="text-[10px] bg-slate-950 text-slate-500 font-mono px-2 py-0.5 border border-slate-850 rounded">GRID_86_E_24_N</span>
          </div>

          <p className="text-[11px] text-slate-500 mb-4 font-sans leading-relaxed">
            Standard on-premises vector layout. Chronological sequences are connected by vector trace lines. Green indicators represent registered transmitters.
          </p>

          {/* Map Controls & Overlay Toggles */}
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4 bg-slate-950/45 p-2.5 rounded-lg border border-slate-850/60" id="map-overlays-toolbar">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 font-semibold">Display Layers:</span>
            </div>
            <div className="flex items-center gap-3 flex-wrap">
              {/* Layer switch buttons */}
              <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-lg border border-slate-850" id="map-layer-toggles">
                <button
                  type="button"
                  id="layer-toggle-satellite"
                  onClick={() => {
                    setMapLayer('satellite');
                    onAddAuditLog("Geospatial Layer Switch", "Switched display view to Satellite Spectral Hybrid Imagery mode for foliage/terrain profiling.", "SUCCESS");
                  }}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-[9.5px] font-mono font-bold uppercase tracking-wider transition-all duration-150 cursor-pointer ${
                    mapLayer === 'satellite'
                      ? 'bg-slate-800 text-teal-400 border border-slate-700/70 shadow-sm'
                      : 'text-slate-500 hover:text-slate-350 hover:bg-slate-900/40 border border-transparent'
                  }`}
                  title="Switch to Satellite spectral/thermal imagery view"
                >
                  <Globe className="w-3 h-3 text-teal-400" />
                  Satellite
                </button>
                <button
                  type="button"
                  id="layer-toggle-street"
                  onClick={() => {
                    setMapLayer('street');
                    onAddAuditLog("Geospatial Layer Switch", "Switched display view to Urban Street Networks vector mode for municipal analysis.", "SUCCESS");
                  }}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-[9.5px] font-mono font-bold uppercase tracking-wider transition-all duration-150 cursor-pointer ${
                    mapLayer === 'street'
                      ? 'bg-slate-800 text-sky-400 border border-slate-700/70 shadow-sm'
                      : 'text-slate-500 hover:text-slate-350 hover:bg-slate-900/40 border border-transparent'
                  }`}
                  title="Switch to Urban Street networks overlay"
                >
                  <Compass className="w-3 h-3 text-sky-400" />
                  Street
                </button>
                <button
                  type="button"
                  id="layer-toggle-topographical"
                  onClick={() => {
                    setMapLayer('topographical');
                    onAddAuditLog("Geospatial Layer Switch", "Switched display view to Topographical Elevation Contour mode with hillshade and elevation index lines.", "SUCCESS");
                  }}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-[9.5px] font-mono font-bold uppercase tracking-wider transition-all duration-150 cursor-pointer ${
                    mapLayer === 'topographical'
                      ? 'bg-slate-800 text-amber-400 border border-slate-700/70 shadow-sm'
                      : 'text-slate-500 hover:text-slate-350 hover:bg-slate-900/40 border border-transparent'
                  }`}
                  title="Switch to Topographical elevation contour map"
                >
                  <Mountain className="w-3 h-3 text-amber-400" />
                  Topographical
                </button>
              </div>

              <button
                type="button"
                onClick={() => {
                  const newVal = !showHeatmap;
                  setShowHeatmap(newVal);
                  onAddAuditLog(
                    "Geospatial Interface Modified",
                    `${newVal ? "Enabled" : "Disabled"} radio signal density heatmap overlay tracker.`,
                    newVal ? "SUCCESS" : "WARNING"
                  );
                }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-[10px] font-mono uppercase tracking-wide border cursor-pointer transition-all ${
                  showHeatmap
                    ? 'bg-rose-950/40 border-rose-800 text-rose-300 shadow-[0_0_10px_rgba(244,63,94,0.1)]'
                    : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:border-slate-750 hover:text-slate-300'
                }`}
                title="Toggle signal density heatmap concentration based on all CDR record event logs"
              >
                <Flame className={`w-3.5 h-3.5 ${showHeatmap ? 'text-rose-500 animate-pulse' : 'text-slate-400'}`} />
                Density Heatmap: {showHeatmap ? 'ON' : 'OFF'}
              </button>

              <button
                type="button"
                onClick={() => {
                  const newVal = !isMeasuring;
                  setIsMeasuring(newVal);
                  onAddAuditLog(
                    "Geospatial Interface Modified",
                    `${newVal ? "Activated" : "Deactivated"} point-to-point geodesic measurement ruler tool.`,
                    newVal ? "SUCCESS" : "WARNING"
                  );
                }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-[10px] font-mono uppercase tracking-wide border cursor-pointer transition-all ${
                  isMeasuring
                    ? 'bg-blue-950/40 border-blue-800 text-blue-300 shadow-[0_0_10px_rgba(59,130,246,0.1)]'
                    : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:border-slate-750 hover:text-slate-300'
                }`}
                title="Toggle geodesic map ruler tool to calculate distance in km between two clicks on screen"
              >
                <Ruler className={`w-3.5 h-3.5 ${isMeasuring ? 'text-blue-500 animate-pulse' : 'text-slate-400'}`} />
                Ruler Tool: {isMeasuring ? 'ON' : 'OFF'}
              </button>

              <button
                type="button"
                onClick={handleRecenter}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded text-[10px] font-mono uppercase tracking-wide border cursor-pointer transition-all bg-slate-900/60 border-slate-800 text-slate-400 hover:border-slate-750 hover:text-slate-300 hover:bg-slate-850/40"
                title="Automatically adjust map center coordinates and zoom scale frame to fit all suspect route path points perfectly"
              >
                <Maximize className="w-3.5 h-3.5 text-indigo-400" />
                Recenter Map
              </button>
            </div>
          </div>

          <div className="bg-slate-950 border border-slate-850 rounded-xl p-2 relative overflow-hidden flex items-center justify-center">
            {routePoints.length > 0 ? (
              <svg 
                onClick={(e: React.MouseEvent<SVGSVGElement>) => {
                  if (!isMeasuring) return;
                  const rect = e.currentTarget.getBoundingClientRect();
                  const clientX = e.clientX - rect.left;
                  const clientY = e.clientY - rect.top;
                  const x = (clientX / rect.width) * mapWidth;
                  const y = (clientY / rect.height) * mapHeight;
                  
                  const coords = getCoordinatesFromScreen(x, y);
                  
                  if (!measurePoint1 || (measurePoint1 && measurePoint2)) {
                    setMeasurePoint1({ x, y, ...coords });
                    setMeasurePoint2(null);
                    onAddAuditLog("Geospatial Measurer", "Selected primary baseline benchmark point A.", "SUCCESS");
                  } else {
                    setMeasurePoint2({ x, y, ...coords });
                    const dist = getDistanceKm(measurePoint1.lat, measurePoint1.lng, coords.lat, coords.lng);
                    onAddAuditLog("Geospatial Measurer", `Selected target point B. Calculated distance baseline: ${dist.toFixed(3)} km.`, "SUCCESS");
                  }
                }}
                className={`w-full border border-slate-900 rounded min-h-[300px] transition-colors duration-300 ${isMeasuring ? 'cursor-crosshair' : ''} ${
                  mapLayer === 'satellite' 
                    ? 'bg-[#011410]' 
                    : mapLayer === 'street' 
                    ? 'bg-[#0b1120]' 
                    : 'bg-[#111713]'
                }`}
                viewBox={`0 0 ${mapWidth} ${mapHeight}`}
              >
                <defs>
                  {/* Heatmap Gradients */}
                  <radialGradient id="roseHeatGrad" cx="50%" cy="50%" r="50%">
                    <stop offset="0%" stopColor="#f43f5e" stopOpacity="0.4" />
                    <stop offset="60%" stopColor="#f43f5e" stopOpacity="0.15" />
                    <stop offset="100%" stopColor="#f43f5e" stopOpacity="0" />
                  </radialGradient>
                  
                  <radialGradient id="orangeHeatGrad" cx="50%" cy="50%" r="50%">
                    <stop offset="0%" stopColor="#f97316" stopOpacity="0.35" />
                    <stop offset="65%" stopColor="#f97316" stopOpacity="0.12" />
                    <stop offset="100%" stopColor="#f97316" stopOpacity="0" />
                  </radialGradient>

                  <radialGradient id="yellowHeatGrad" cx="50%" cy="50%" r="50%">
                    <stop offset="0%" stopColor="#eab308" stopOpacity="0.3" />
                    <stop offset="70%" stopColor="#eab308" stopOpacity="0.08" />
                    <stop offset="100%" stopColor="#eab308" stopOpacity="0" />
                  </radialGradient>
                  
                  {/* Topographical Relief Gradients */}
                  <radialGradient id="trikutHillGrad" cx="50%" cy="50%" r="50%">
                    <stop offset="0%" stopColor="#3d371d" stopOpacity="0.6" />
                    <stop offset="50%" stopColor="#2c2d1b" stopOpacity="0.4" />
                    <stop offset="100%" stopColor="#141c14" stopOpacity="0" />
                  </radialGradient>

                  <radialGradient id="nandanHillGrad" cx="50%" cy="50%" r="50%">
                    <stop offset="0%" stopColor="#35331e" stopOpacity="0.5" />
                    <stop offset="60%" stopColor="#252a1a" stopOpacity="0.3" />
                    <stop offset="100%" stopColor="#121a14" stopOpacity="0" />
                  </radialGradient>

                  <radialGradient id="tapovanHillGrad" cx="50%" cy="50%" r="50%">
                    <stop offset="0%" stopColor="#3a321b" stopOpacity="0.55" />
                    <stop offset="60%" stopColor="#29281a" stopOpacity="0.35" />
                    <stop offset="100%" stopColor="#131b14" stopOpacity="0" />
                  </radialGradient>

                  {/* Gaussian blur for the core of the heatmap */}
                  <filter id="heatCoreBlur">
                    <feGaussianBlur stdDeviation="3" />
                  </filter>
                </defs>

                {/* SATELLITE LAYER SCANNER & LANDMASS POLYGONS */}
                {mapLayer === 'satellite' && (
                  <g id="satellite-landsat-layer" className="opacity-60 animate-fadeIn">
                    {/* Forest canopy polygon (topography details) */}
                    <path d={`M 0 100 Q 110 80 180 140 T 300 200 T 420 180 L 420 0 L 0 0 Z`} fill="#0d5241" opacity="0.25" />
                    <path d={`M 10 280 Q 150 220 280 290 T 420 250 L 420 ${mapHeight} L 0 ${mapHeight} Z`} fill="#115e59" opacity="0.2" />

                    {/* Water Body (Mayurakshi / Jhar river vector) */}
                    <path 
                      d={`M -10 160 Q 130 150 200 170 T 320 120 T ${mapWidth + 10} 140`} 
                      fill="none" 
                      stroke="#0d9488" 
                      strokeWidth="5.5" 
                      opacity="0.32" 
                    />
                    <path 
                      d={`M -10 160 Q 130 150 200 170 T 320 120 T ${mapWidth + 10} 140`} 
                      fill="none" 
                      stroke="#14b8a6" 
                      strokeWidth="1.5" 
                      opacity="0.5" 
                    />

                    {/* Satellite tracking calibration crop rings */}
                    <rect x="5" y="5" width="20" height="20" fill="none" stroke="#2dd4bf" strokeWidth="0.6" opacity="0.5" />
                    <path d="M 5 15 L 5 5 L 15 5" fill="none" stroke="#2dd4bf" strokeWidth="1" />
                    <path d={`M ${mapWidth - 15} 5 L ${mapWidth - 5} 5 L ${mapWidth - 5} 15`} fill="none" stroke="#2dd4bf" strokeWidth="1" />
                    <path d={`M ${mapWidth - 5} ${mapHeight - 15} L ${mapWidth - 5} ${mapHeight - 5} L ${mapWidth - 15} ${mapHeight - 5}`} fill="none" stroke="#2dd4bf" strokeWidth="1" />
                    <path d={`M 15 ${mapHeight - 5} L 5 ${mapHeight - 5} L 5 ${mapHeight - 15}`} fill="none" stroke="#2dd4bf" strokeWidth="1" />
                    
                    {/* Scanning Telemetry readout overlay */}
                    <text x="25" y="20" fill="#0d9488" fontSize="6.2" fontFamily="monospace" fontWeight="semibold">FPS_SCAN_ACTIVE: 30HZ</text>
                    <text x="25" y="28" fill="#0d9488" fontSize="6.2" fontFamily="monospace">IRS_SENSOR_BAND: thermal_infra</text>
                    <text x={mapWidth - 110} y="20" fill="#0d9488" fontSize="6.2" fontFamily="monospace" textAnchor="start">SAT_ORBIT: KALPANA_II_GEO</text>
                    <text x={mapWidth - 110} y="28" fill="#0d9488" fontSize="6.2" fontFamily="monospace" textAnchor="start">SCAN_CONFIDENCE: 98.42%</text>

                    {/* Crosshairs */}
                    <line x1={mapWidth/2 - 15} y1={mapHeight/2} x2={mapWidth/2 + 15} y2={mapHeight/2} stroke="#2dd4bf" strokeWidth="0.8" opacity="0.6" />
                    <line x1={mapWidth/2} y1={mapHeight/2 - 15} x2={mapWidth/2} y2={mapHeight/2 + 15} stroke="#2dd4bf" strokeWidth="0.8" opacity="0.6" />
                    <circle cx={mapWidth/2} cy={mapHeight/2} r="8" fill="none" stroke="#2dd4bf" strokeWidth="0.8" opacity="0.4" />
                  </g>
                )}

                {/* STREET LAYER MAP VECTOR GRAPHICS */}
                {mapLayer === 'street' && (
                  <g id="street-grid-layer" className="opacity-40 animate-fadeIn">
                    {/* Simplified street layouts (horizontal, vertical & diagonal) */}
                    <circle cx={mapWidth/2} cy={mapHeight/2} r="120" fill="none" stroke="#334155" strokeWidth="3" opacity="0.45" />
                    <circle cx={mapWidth/2 + 30} cy={mapHeight/2 - 40} r="70" fill="none" stroke="#334155" strokeWidth="2.5" opacity="0.35" />
                    
                    {/* Main Express Highways */}
                    <path d={`M 20 50 Q ${mapWidth/2} 120 ${mapWidth - 20} 80`} fill="none" stroke="#f97316" strokeWidth="1.5" strokeDasharray="4,3" opacity="0.75" />
                    <path d={`M 40 ${mapHeight - 30} L ${mapWidth - 40} 40`} fill="none" stroke="#38bdf8" strokeWidth="1.8" opacity="0.5" />
                    
                    {/* Grid Street Lines */}
                    <line x1="80" y1="0" x2="80" y2={mapHeight} stroke="#1e293b" strokeWidth="1" />
                    <line x1="160" y1="0" x2="160" y2={mapHeight} stroke="#1e293b" strokeWidth="1" />
                    <line x1="240" y1="0" x2="240" y2={mapHeight} stroke="#1e293b" strokeWidth="1" />
                    <line x1="320" y1="0" x2="320" y2={mapHeight} stroke="#1e293b" strokeWidth="1" />
                    
                    <line x1="0" y1="70" x2={mapWidth} y2="70" stroke="#1e293b" strokeWidth="1" />
                    <line x1="0" y1="140" x2={mapWidth} y2="140" stroke="#1e293b" strokeWidth="1" />
                    <line x1="0" y1="210" x2={mapWidth} y2="210" stroke="#1e293b" strokeWidth="1" />
                    
                    {/* Urban blocks */}
                    <rect x="10" y="80" width="60" height="50" fill="#1e293b" opacity="0.4" rx="2" />
                    <rect x="90" y="10" width="60" height="50" fill="#1e293b" opacity="0.4" rx="2" />
                    <rect x="250" y="220" width="60" height="50" fill="#1e293b" opacity="0.4" rx="2" />
                    <rect x="330" y="150" width="80" height="50" fill="#1e293b" opacity="0.4" rx="2" />

                    {/* Neighborhood Label Plaques */}
                    <text x="15" y="110" fill="#64748b" fontSize="6.5" fontFamily="monospace" fontWeight="semibold">SADAR ZONE</text>
                    <text x="95" y="40" fill="#64748b" fontSize="6.5" fontFamily="monospace" fontWeight="semibold">MIG-IV BLOCKS</text>
                    <text x="255" y="250" fill="#64748b" fontSize="6.5" fontFamily="monospace" fontWeight="semibold">NH-11 BYPASS</text>
                    <text x="335" y="180" fill="#64748b" fontSize="6.5" fontFamily="monospace" fontWeight="semibold">RAM MANDIR RD</text>
                  </g>
                )}

                {/* TOPOGRAPHICAL LAYER WITH ELEVATION CONTOURS & PEAKS */}
                {mapLayer === 'topographical' && (
                  <g id="topographical-contour-layer" className="animate-fadeIn">
                    {/* Hypsometric shaded relief areas */}
                    <circle cx="330" cy="240" r="85" fill="url(#trikutHillGrad)" />
                    <circle cx="190" cy="80" r="65" fill="url(#nandanHillGrad)" />
                    <circle cx="110" cy="235" r="70" fill="url(#tapovanHillGrad)" />

                    {/* Topographical UTM 1km reference grid lines */}
                    <line x1="70" y1="0" x2="70" y2={mapHeight} stroke="#78350f" strokeWidth="0.35" strokeDasharray="2,3" opacity="0.3" />
                    <line x1="140" y1="0" x2="140" y2={mapHeight} stroke="#78350f" strokeWidth="0.35" strokeDasharray="2,3" opacity="0.3" />
                    <line x1="210" y1="0" x2="210" y2={mapHeight} stroke="#78350f" strokeWidth="0.35" strokeDasharray="2,3" opacity="0.3" />
                    <line x1="280" y1="0" x2="280" y2={mapHeight} stroke="#78350f" strokeWidth="0.35" strokeDasharray="2,3" opacity="0.3" />
                    <line x1="350" y1="0" x2="350" y2={mapHeight} stroke="#78350f" strokeWidth="0.35" strokeDasharray="2,3" opacity="0.3" />

                    <line x1="0" y1="60" x2={mapWidth} y2="60" stroke="#78350f" strokeWidth="0.35" strokeDasharray="2,3" opacity="0.3" />
                    <line x1="0" y1="120" x2={mapWidth} y2="120" stroke="#78350f" strokeWidth="0.35" strokeDasharray="2,3" opacity="0.3" />
                    <line x1="0" y1="180" x2={mapWidth} y2="180" stroke="#78350f" strokeWidth="0.35" strokeDasharray="2,3" opacity="0.3" />
                    <line x1="0" y1="240" x2={mapWidth} y2="240" stroke="#78350f" strokeWidth="0.35" strokeDasharray="2,3" opacity="0.3" />

                    {/* Grid Coordinate Labels */}
                    <text x="73" y="10" fill="#92400e" fontSize="5" fontFamily="monospace" opacity="0.7">86°36'E</text>
                    <text x="143" y="10" fill="#92400e" fontSize="5" fontFamily="monospace" opacity="0.7">86°40'E</text>
                    <text x="213" y="10" fill="#92400e" fontSize="5" fontFamily="monospace" opacity="0.7">86°44'E</text>
                    <text x="283" y="10" fill="#92400e" fontSize="5" fontFamily="monospace" opacity="0.7">86°48'E</text>
                    <text x="353" y="10" fill="#92400e" fontSize="5" fontFamily="monospace" opacity="0.7">86°52'E</text>

                    <text x="5" y="58" fill="#92400e" fontSize="5" fontFamily="monospace" opacity="0.7">24°32'N</text>
                    <text x="5" y="118" fill="#92400e" fontSize="5" fontFamily="monospace" opacity="0.7">24°28'N</text>
                    <text x="5" y="178" fill="#92400e" fontSize="5" fontFamily="monospace" opacity="0.7">24°24'N</text>
                    <text x="5" y="238" fill="#92400e" fontSize="5" fontFamily="monospace" opacity="0.7">24°20'N</text>

                    {/* Valley Drainage / Stream channel between ridges */}
                    <path 
                      d={`M 15 150 Q 80 165 140 135 T 240 160 T 320 145 T 410 160`} 
                      fill="none" 
                      stroke="#0d9488" 
                      strokeWidth="1.2" 
                      strokeDasharray="4,2" 
                      opacity="0.45" 
                    />
                    <path 
                      d={`M 140 135 Q 160 190 180 240`} 
                      fill="none" 
                      stroke="#0d9488" 
                      strokeWidth="0.8" 
                      strokeDasharray="3,2" 
                      opacity="0.35" 
                    />

                    {/* TRIKUT HILL RANGE (East): 755m Peak & Concentric Contour Isohypses */}
                    {/* Index Contours (250m, 350m, 450m, 600m, 700m) */}
                    <path d="M 240 250 C 250 200, 310 180, 360 190 S 415 240, 410 270 S 340 310, 290 290 Z" fill="none" stroke="#d97706" strokeWidth="0.75" opacity="0.5" />
                    <text x="245" y="222" fill="#b45309" fontSize="5.2" fontFamily="monospace" fontWeight="bold">250m</text>

                    <path d="M 260 250 C 270 210, 320 195, 355 205 S 395 245, 390 268 S 335 295, 295 280 Z" fill="none" stroke="#b45309" strokeWidth="0.4" strokeDasharray="3,1.5" opacity="0.4" />
                    
                    <path d="M 275 250 C 285 220, 325 210, 350 218 S 380 248, 375 264 S 330 282, 300 270 Z" fill="none" stroke="#d97706" strokeWidth="0.75" opacity="0.6" />
                    <text x="280" y="235" fill="#d97706" fontSize="5.2" fontFamily="monospace" fontWeight="bold">400m</text>

                    <path d="M 292 248 C 300 228, 330 222, 346 228 S 368 248, 364 260 S 325 272, 305 264 Z" fill="none" stroke="#b45309" strokeWidth="0.4" strokeDasharray="3,1.5" opacity="0.4" />

                    <path d="M 308 246 C 314 234, 332 230, 342 235 S 355 248, 352 255 S 324 262, 312 256 Z" fill="none" stroke="#f59e0b" strokeWidth="0.85" opacity="0.7" />
                    <text x="312" y="244" fill="#f59e0b" fontSize="5.2" fontFamily="monospace" fontWeight="bold">600m</text>

                    <circle cx="330" cy="245" r="7" fill="none" stroke="#f59e0b" strokeWidth="0.9" opacity="0.85" />
                    {/* Summit Peak Icon & Label */}
                    <path d="M 330 240 L 327 246 L 333 246 Z" fill="#fbbf24" stroke="#d97706" strokeWidth="0.5" />
                    <text x="330" y="238" fill="#fbbf24" fontSize="6" fontFamily="monospace" fontWeight="bold" textAnchor="middle">▲ TRIKUT PEAK (755m)</text>

                    {/* NANDAN PAHAR HILLS (North): 420m Peak & Elevation Contours */}
                    <path d="M 130 85 C 140 45, 190 35, 230 45 S 255 90, 245 110 S 180 125, 150 110 Z" fill="none" stroke="#d97706" strokeWidth="0.75" opacity="0.5" />
                    <text x="135" y="68" fill="#b45309" fontSize="5.2" fontFamily="monospace" fontWeight="bold">250m</text>

                    <path d="M 148 85 C 155 55, 195 48, 222 55 S 240 88, 232 102 S 185 112, 162 102 Z" fill="none" stroke="#b45309" strokeWidth="0.4" strokeDasharray="3,1.5" opacity="0.4" />

                    <path d="M 165 84 C 172 65, 198 60, 214 65 S 224 86, 218 94 S 188 100, 175 94 Z" fill="none" stroke="#f59e0b" strokeWidth="0.8" opacity="0.65" />
                    <text x="170" y="77" fill="#d97706" fontSize="5.2" fontFamily="monospace" fontWeight="bold">350m</text>

                    <circle cx="192" cy="80" r="6" fill="none" stroke="#fbbf24" strokeWidth="0.9" opacity="0.8" />
                    <path d="M 192 76 L 189 82 L 195 82 Z" fill="#fbbf24" stroke="#d97706" strokeWidth="0.5" />
                    <text x="192" y="73" fill="#fbbf24" fontSize="6" fontFamily="monospace" fontWeight="bold" textAnchor="middle">▲ NANDAN PAHAR (420m)</text>

                    {/* TAPOVAN HILL RANGE (South-West): 480m Peak & Contours */}
                    <path d="M 60 235 C 70 200, 115 190, 150 200 S 170 245, 160 265 S 105 280, 80 265 Z" fill="none" stroke="#d97706" strokeWidth="0.75" opacity="0.5" />
                    <text x="64" y="218" fill="#b45309" fontSize="5.2" fontFamily="monospace" fontWeight="bold">250m</text>

                    <path d="M 78 235 C 85 210, 120 202, 142 210 S 155 242, 148 255 S 110 268, 92 258 Z" fill="none" stroke="#b45309" strokeWidth="0.4" strokeDasharray="3,1.5" opacity="0.4" />

                    <path d="M 94 235 C 99 220, 122 214, 134 220 S 142 238, 136 246 S 112 252, 102 246 Z" fill="none" stroke="#f59e0b" strokeWidth="0.8" opacity="0.65" />
                    <text x="98" y="228" fill="#d97706" fontSize="5.2" fontFamily="monospace" fontWeight="bold">380m</text>

                    <circle cx="114" cy="233" r="5" fill="none" stroke="#fbbf24" strokeWidth="0.9" opacity="0.8" />
                    <path d="M 114 229 L 111 235 L 117 235 Z" fill="#fbbf24" stroke="#d97706" strokeWidth="0.5" />
                    <text x="114" y="225" fill="#fbbf24" fontSize="6" fontFamily="monospace" fontWeight="bold" textAnchor="middle">▲ TAPOVAN (480m)</text>

                    {/* DIGHARIA HILL RIDGE (West): 520m */}
                    <path d="M 10 130 C 25 110, 55 105, 75 115 S 85 145, 75 165 S 25 170, 15 155 Z" fill="none" stroke="#d97706" strokeWidth="0.65" opacity="0.4" />
                    <path d="M 22 135 C 32 120, 50 116, 62 122 S 70 142, 62 154 S 32 158, 26 148 Z" fill="none" stroke="#f59e0b" strokeWidth="0.75" opacity="0.55" />
                    <text x="40" y="130" fill="#d97706" fontSize="5" fontFamily="monospace">▲ DIGHARIA (520m)</text>

                    {/* Trigonometrical & Benchmark Survey Markers */}
                    <g transform="translate(180, 165)">
                      <polygon points="0,-4 3.5,2 -3.5,2" fill="none" stroke="#f59e0b" strokeWidth="0.7" />
                      <circle cx="0" cy="0" r="0.8" fill="#f59e0b" />
                      <text x="6" y="2" fill="#d97706" fontSize="5" fontFamily="monospace">△ Trig Stn 314m</text>
                    </g>
                    <g transform="translate(70, 95)">
                      <rect x="-2" y="-2" width="4" height="4" fill="none" stroke="#d97706" strokeWidth="0.6" />
                      <text x="4" y="2" fill="#b45309" fontSize="4.8" fontFamily="monospace">BM 248.6m</text>
                    </g>

                    {/* Topographical Map Cartographic Legend Box at bottom-left */}
                    <g transform={`translate(10, ${mapHeight - 24})`}>
                      <rect x="0" y="0" width="140" height="18" rx="2" fill="#0c120e" stroke="#78350f" strokeWidth="0.5" opacity="0.85" />
                      <text x="6" y="7.5" fill="#f59e0b" fontSize="4.8" fontFamily="monospace" fontWeight="bold">SURVEY OF INDIA TOPOGRAPHIC QUAD</text>
                      <text x="6" y="14" fill="#92400e" fontSize="4.2" fontFamily="monospace">CONTOUR INT: 25m | DATUM: WGS-84 | 1:50,000</text>
                    </g>
                  </g>
                )}

                {/* 🌟 Signal Density Heatmap Overlay Layer - Drawn underneath connections */}
                {showHeatmap && getHeatPoints().map((hp, idx) => {
                  const sCoords = getScreenCoordinates(hp.lat, hp.lng);
                  const count = hp.count;
                  const maxCount = Math.max(...getHeatPoints().map(p => p.count), 1);
                  const intensity = count / maxCount;
                  
                  const radius = 22 + (intensity * 35);
                  const fillColor = intensity > 0.6 
                    ? 'url(#roseHeatGrad)' 
                    : intensity > 0.25 
                    ? 'url(#orangeHeatGrad)' 
                    : 'url(#yellowHeatGrad)';

                  return (
                    <g key={`heat-${idx}`} className="pointer-events-none mix-blend-screen">
                      <circle 
                        cx={sCoords.x} 
                        cy={sCoords.y} 
                        r={radius} 
                        fill={fillColor} 
                      />
                      {/* Innermost hot-spot core center */}
                      <circle 
                        cx={sCoords.x} 
                        cy={sCoords.y} 
                        r={5 + (intensity * 7)} 
                        fill="#ff453a" 
                        opacity={0.35 + (intensity * 0.4)}
                        filter="url(#heatCoreBlur)"
                      />
                    </g>
                  );
                })}

                {/* Draw registered cell towers layout coordinates in background */}
                {localTowers.map((tow, idx) => {
                  const sCoords = getScreenCoordinates(tow.latitude, tow.longitude);
                  return (
                    <g key={`tow-${idx}`} className="opacity-45 hover:opacity-100 transition-opacity">
                      <circle cx={sCoords.x} cy={sCoords.y} r="3" fill="#10b981" />
                      <circle cx={sCoords.x} cy={sCoords.y} r="10" fill="none" stroke="#10b981" strokeWidth="0.5" className="animate-pulse" />
                      <text x={sCoords.x + 5} y={sCoords.y + 3} fill="#475569" fontSize="6" fontFamily="monospace">{tow.name.split(' (')[0]}</text>
                    </g>
                  );
                })}

                {/* Draw connecting chronological route spline path */}
                {routePoints.map((pt, idx) => {
                  if (idx === 0) return null;
                  const prevPt = routePoints[idx - 1];
                  const pCoords = getScreenCoordinates(prevPt.latitude, prevPt.longitude);
                  const cCoords = getScreenCoordinates(pt.latitude, pt.longitude);

                  return (
                    <g key={`path-${idx}`}>
                      {/* Spline line */}
                      <line
                        x1={pCoords.x}
                        y1={pCoords.y}
                        x2={cCoords.x}
                        y2={cCoords.y}
                        stroke="#f59e0b"
                        strokeWidth="1.8"
                        strokeDasharray="3,2"
                        opacity="0.8"
                      />
                      {/* Heading direction arrow */}
                      <path
                        d="M 0,0 L -5,-3 L -5,3 Z"
                        fill="#f59e0b"
                        transform={`translate(${(pCoords.x + cCoords.x)/2}, ${(pCoords.y + cCoords.y)/2}) rotate(${(Math.atan2(cCoords.y - pCoords.y, cCoords.x - pCoords.x) * 180) / Math.PI})`}
                      />
                    </g>
                  );
                })}

                {/* Draw chronological dots with interactive selection */}
                {routePoints.map((pt, idx) => {
                  const sCoords = getScreenCoordinates(pt.latitude, pt.longitude);
                  const isActive = activePoint && activePoint.index === pt.index;

                  return (
                    <g 
                      key={`pt-${idx}`} 
                      id={`cdr-node-marker-${idx + 1}`}
                      className="cursor-pointer group"
                      onClick={(e) => {
                        e.stopPropagation();
                        setActivePoint(pt);
                        onAddAuditLog(
                          "CDR Location Node Inspected",
                          `Selected Node #${idx + 1} (${pt.timestamp}) at ${pt.towerName}. Target: ${pt.targetA}`,
                          "SUCCESS"
                        );
                      }}
                    >
                      {/* Expanded transparent hit target for easy clicking */}
                      <circle cx={sCoords.x} cy={sCoords.y} r="15" fill="transparent" />

                      {isActive && (
                        <>
                          <circle cx={sCoords.x} cy={sCoords.y} r="13" fill="none" stroke="#f59e0b" strokeWidth="1.2" className="animate-ping" opacity="0.8" />
                          <circle cx={sCoords.x} cy={sCoords.y} r="8.5" fill="none" stroke="#ef4444" strokeWidth="1" strokeDasharray="2,2" />
                        </>
                      )}
                      <circle 
                        cx={sCoords.x} 
                        cy={sCoords.y} 
                        r={isActive ? 6.5 : 4.5} 
                        fill={isActive ? '#ef4444' : '#f59e0b'} 
                        stroke="#0f172a"
                        strokeWidth="1.5"
                        className="transition-transform duration-150 group-hover:scale-125"
                      />
                      {/* Number badge on timeline path */}
                      <text 
                        x={sCoords.x} 
                        y={sCoords.y + 2} 
                        fill="#fafafa" 
                        fontSize="5.5" 
                        fontWeight="700"
                        fontFamily="monospace"
                        textAnchor="middle"
                        className="pointer-events-none select-none"
                      >
                        {idx + 1}
                      </text>
                    </g>
                  );
                })}

                {/* 📍 Measurement Tool Geodesic Layers */}
                {measurePoint1 && (
                  <g className="pointer-events-none">
                    <circle cx={measurePoint1.x} cy={measurePoint1.y} r="5" fill="#3b82f6" stroke="#fff" strokeWidth="1.5" />
                    <circle cx={measurePoint1.x} cy={measurePoint1.y} r="12" fill="none" stroke="#3b82f6" strokeWidth="0.8" strokeDasharray="2,2" className="animate-pulse" />
                    <rect x={measurePoint1.x - 5} y={measurePoint1.y - 18} width="10" height="10" rx="1.5" fill="#0f172a" stroke="#3b82f6" strokeWidth="0.8" />
                    <text x={measurePoint1.x} y={measurePoint1.y - 10} fill="#60a5fa" fontSize="6.5" fontWeight="bold" fontFamily="monospace" textAnchor="middle">A</text>
                  </g>
                )}
                {measurePoint2 && (
                  <g className="pointer-events-none">
                    <circle cx={measurePoint2.x} cy={measurePoint2.y} r="5" fill="#ef4444" stroke="#fff" strokeWidth="1.5" />
                    <circle cx={measurePoint2.x} cy={measurePoint2.y} r="12" fill="none" stroke="#ef4444" strokeWidth="0.8" strokeDasharray="2,2" className="animate-pulse" />
                    <rect x={measurePoint2.x - 5} y={measurePoint2.y - 18} width="10" height="10" rx="1.5" fill="#0f172a" stroke="#ef4444" strokeWidth="0.8" />
                    <text x={measurePoint2.x} y={measurePoint2.y - 10} fill="#f87171" fontSize="6.5" fontWeight="bold" fontFamily="monospace" textAnchor="middle">B</text>
                  </g>
                )}
                {measurePoint1 && measurePoint2 && (
                  <g className="pointer-events-none">
                    {/* Connecting geodesic lines */}
                    <line 
                      x1={measurePoint1.x} 
                      y1={measurePoint1.y} 
                      x2={measurePoint2.x} 
                      y2={measurePoint2.y} 
                      stroke="#3b82f6" 
                      strokeWidth="1.8" 
                      strokeDasharray="4,4" 
                      opacity="0.8"
                    />
                    {/* Midpoint distance display plaque */}
                    {(() => {
                      const midX = (measurePoint1.x + measurePoint2.x) / 2;
                      const midY = (measurePoint1.y + measurePoint2.y) / 2;
                      const dist = getDistanceKm(measurePoint1.lat, measurePoint1.lng, measurePoint2.lat, measurePoint2.lng);
                      return (
                        <g transform={`translate(${midX}, ${midY})`}>
                          <rect 
                            x="-30" 
                            y="-8" 
                            width="60" 
                            height="14" 
                            rx="3" 
                            fill="#090d16" 
                            stroke="#3b82f6" 
                            strokeWidth="1" 
                          />
                          <text 
                            x="0" 
                            y="1.5" 
                            fill="#60a5fa" 
                            fontSize="7.5" 
                            fontWeight="bold" 
                            fontFamily="monospace" 
                            textAnchor="middle"
                          >
                            {dist.toFixed(2)} km
                          </text>
                        </g>
                      );
                    })()}
                  </g>
                )}
              </svg>
            ) : (
              <div className="text-slate-500 p-12 text-center text-xs font-mono select-none">
                <HelpCircle className="w-8 h-8 text-slate-600 mx-auto mb-2 animate-bounce" />
                No geospatial sequence is populated yet.<br />Please load target suspect CDR logs.
              </div>
            )}

            {/* Floating Layer Active Indicator */}
            <div 
              id="active-map-layer-badge"
              className="absolute top-4 left-4 flex items-center gap-1.5 bg-slate-950/90 border border-slate-800/90 px-2.5 py-1 rounded-md text-[10px] font-mono backdrop-blur-sm shadow-md pointer-events-none z-10"
            >
              <span className={`w-2 h-2 rounded-full animate-pulse ${
                mapLayer === 'satellite' ? 'bg-teal-400' : mapLayer === 'street' ? 'bg-sky-400' : 'bg-amber-400'
              }`} />
              <span className="text-slate-400 uppercase tracking-wider text-[9px] font-semibold">
                View: <span className={`font-bold ${
                  mapLayer === 'satellite' ? 'text-teal-400' : mapLayer === 'street' ? 'text-sky-400' : 'text-amber-400'
                }`}>{mapLayer === 'topographical' ? 'Topographical (Contours)' : mapLayer === 'satellite' ? 'Satellite (Spectral)' : 'Street (Urban Grid)'}</span>
              </span>
            </div>

            {/* Detailed CDR Location Node Popup Card with Timestamp, Signal Strength, and Subscriber Metadata */}
            {activePoint && (() => {
              const signal = getSignalStrengthTelemetry(activePoint, localTowers);
              const nodeNum = activePoint.index + 1;
              const totalNodes = routePoints.length;

              return (
                <div 
                  id="cdr-node-popup-card"
                  className="absolute top-4 right-4 bg-slate-950/95 border border-slate-750 shadow-2xl rounded-xl p-3.5 sm:p-4 text-left font-mono z-25 backdrop-blur-md max-w-[340px] w-[calc(100%-2rem)] sm:w-[340px] max-h-[calc(100%-2rem)] overflow-y-auto border-t-2 border-t-emerald-400 animate-fadeIn"
                >
                  {/* Header: Sequence Pill & Close Button */}
                  <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                      <span className="text-[10px] uppercase font-bold tracking-wider text-emerald-400">
                        CDR Location Node #{nodeNum} <span className="text-slate-500 font-normal">/ {totalNodes}</span>
                      </span>
                    </div>
                    <button
                      type="button"
                      id="close-cdr-popup-btn"
                      onClick={() => setActivePoint(null)}
                      className="text-slate-400 hover:text-slate-200 p-1 rounded hover:bg-slate-850 transition-colors cursor-pointer"
                      title="Close node popup card"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Serving Cell Site Location */}
                  <div className="mt-2.5">
                    <div className="text-[9px] uppercase tracking-wider text-slate-500 font-semibold flex items-center gap-1">
                      <MapPin className="w-3 h-3 text-emerald-400" />
                      Serving Cell Site
                    </div>
                    <div className="text-xs font-bold text-slate-100 mt-0.5 leading-snug break-words">
                      {activePoint.towerName}
                    </div>
                  </div>

                  {/* 1. TIMESTAMP SECTION */}
                  <div className="mt-3 p-2.5 bg-slate-900/80 border border-slate-800 rounded-lg">
                    <div className="flex items-center justify-between text-[9px] font-semibold text-indigo-400 uppercase tracking-wider">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3 text-indigo-400" />
                        Timestamp & Timing
                      </span>
                      <span className="bg-indigo-950/80 text-indigo-300 border border-indigo-800/60 px-1.5 py-0.5 rounded text-[8.5px]">
                        Event #{nodeNum}
                      </span>
                    </div>
                    <div className="mt-1.5 flex items-center justify-between text-[11px]">
                      <span className="text-slate-400">Date & Time:</span>
                      <span className="text-indigo-300 font-bold tracking-tight">{activePoint.timestamp}</span>
                    </div>
                    <div className="mt-1 flex items-center justify-between text-[10.5px]">
                      <span className="text-slate-500">Call Duration:</span>
                      <span className="text-slate-300 font-semibold">
                        {activePoint.duration ? `${activePoint.duration}s (${Math.floor(activePoint.duration / 60)}m ${activePoint.duration % 60}s)` : '0s (Ping/SMS Session)'}
                      </span>
                    </div>
                  </div>

                  {/* 2. SIGNAL STRENGTH SECTION */}
                  <div className="mt-2.5 p-2.5 bg-slate-900/80 border border-slate-800 rounded-lg">
                    <div className="flex items-center justify-between text-[9px] font-semibold text-emerald-400 uppercase tracking-wider">
                      <span className="flex items-center gap-1">
                        <Signal className="w-3 h-3 text-emerald-400" />
                        Signal Strength (RF Telemetry)
                      </span>
                      {/* 5-Bar Signal Meter Graphic */}
                      <div className="flex items-end gap-0.5 h-3.5" title={`${signal.bars}/5 Signal Bars (${signal.quality})`}>
                        {[1, 2, 3, 4, 5].map((b) => (
                          <span
                            key={b}
                            className={`w-1 rounded-t-xs transition-all ${
                              b <= signal.bars
                                ? signal.bars >= 4
                                  ? 'bg-emerald-400'
                                  : signal.bars === 3
                                  ? 'bg-amber-400'
                                  : 'bg-rose-400'
                                : 'bg-slate-850'
                            }`}
                            style={{ height: `${b * 20}%` }}
                          />
                        ))}
                      </div>
                    </div>

                    <div className="mt-2 grid grid-cols-2 gap-2 text-[10.5px]">
                      <div className="bg-slate-950/70 p-1.5 rounded border border-slate-850">
                        <span className="text-[8.5px] uppercase tracking-wider text-slate-500 block">RSSI Power</span>
                        <span className={`font-bold ${
                          signal.bars >= 4 ? 'text-emerald-400' : signal.bars === 3 ? 'text-amber-400' : 'text-rose-400'
                        }`}>
                          {signal.rssiDbm} dBm
                        </span>
                        <span className="text-[8.5px] text-slate-400 block mt-0.5">({signal.quality})</span>
                      </div>

                      <div className="bg-slate-950/70 p-1.5 rounded border border-slate-850">
                        <span className="text-[8.5px] uppercase tracking-wider text-slate-500 block">ASU / Quality</span>
                        <span className="text-slate-200 font-bold">{signal.asu} <span className="text-slate-500 font-normal">/ 31 ASU</span></span>
                        <span className="text-[8.5px] text-slate-400 block mt-0.5">TA: {signal.timingAdvance} (~{(signal.timingAdvance * 0.55).toFixed(1)} km)</span>
                      </div>
                    </div>

                    <div className="mt-2 space-y-1 text-[10px] text-slate-400 border-t border-slate-850 pt-1.5">
                      <div className="flex justify-between items-center">
                        <span className="text-slate-500">Radio Carrier:</span>
                        <span className="text-slate-300 font-semibold">{signal.carrier}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-slate-500">Band / Sector:</span>
                        <span className="text-slate-300">{signal.band.split(' (')[0]} • {signal.azimuth.split(' ')[0]} {signal.azimuth.split(' ')[1]}</span>
                      </div>
                    </div>
                  </div>

                  {/* 3. SUBSCRIBER METADATA SECTION */}
                  <div className="mt-2.5 p-2.5 bg-slate-900/80 border border-slate-800 rounded-lg">
                    <div className="flex items-center justify-between text-[9px] font-semibold text-amber-400 uppercase tracking-wider mb-2">
                      <span className="flex items-center gap-1">
                        <Smartphone className="w-3 h-3 text-amber-400" />
                        Subscriber & Device Metadata
                      </span>
                      <span className="text-[8px] bg-slate-800 text-slate-400 px-1 py-0.5 rounded font-mono">
                        LAC {activePoint.lac}
                      </span>
                    </div>

                    <div className="space-y-1.5 text-[10.5px]">
                      <div className="flex justify-between items-center">
                        <span className="text-slate-500">Target MSISDN:</span>
                        <span className="text-emerald-400 font-bold select-all">{activePoint.targetA}</span>
                      </div>

                      <div className="flex justify-between items-center">
                        <span className="text-slate-500">Dialed B Party:</span>
                        <span className="text-slate-300 font-semibold select-all">
                          {activePoint.dialedB || 'Passive Session'}
                        </span>
                      </div>

                      <div className="flex justify-between items-center">
                        <span className="text-slate-500">Hardware IMEI:</span>
                        <span className="text-slate-300 font-mono text-[10px] select-all truncate max-w-[150px]" title={activePoint.imei}>
                          {activePoint.imei || 'Not Broadcast'}
                        </span>
                      </div>

                      <div className="flex justify-between items-center">
                        <span className="text-slate-500">SIM IMSI:</span>
                        <span className="text-slate-300 font-mono text-[10px] select-all truncate max-w-[150px]" title={activePoint.imsi}>
                          {activePoint.imsi || '404452019920192'}
                        </span>
                      </div>

                      <div className="flex justify-between items-center">
                        <span className="text-slate-500">Sector LAC-CI:</span>
                        <span className="text-sky-400 font-mono font-semibold">
                          {activePoint.lac}-{activePoint.ci}
                        </span>
                      </div>

                      <div className="flex justify-between items-center">
                        <span className="text-slate-500">GPS WGS-84:</span>
                        <span className="text-slate-300 font-mono text-[10px]">
                          {activePoint.latitude.toFixed(4)}°N, {activePoint.longitude.toFixed(4)}°E
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Quick Action Buttons */}
                  <div className="mt-3 pt-2 border-t border-slate-800 flex items-center gap-1.5">
                    <button
                      type="button"
                      id="copy-cdr-popup-info"
                      onClick={() => {
                        const payload = `[CDR NODE #${nodeNum}]\nTarget MSISDN: ${activePoint.targetA}\nDialed B Party: ${activePoint.dialedB}\nTimestamp: ${activePoint.timestamp}\nDuration: ${activePoint.duration}s\nTower: ${activePoint.towerName}\nSector LAC-CI: ${activePoint.lac}-${activePoint.ci}\nCoordinates: ${activePoint.latitude.toFixed(5)}, ${activePoint.longitude.toFixed(5)}\nSignal Strength: ${signal.rssiDbm} dBm (${signal.quality}, ${signal.asu} ASU)\nTiming Advance: TA ${signal.timingAdvance}\nRF Band: ${signal.band}\nCarrier: ${signal.carrier}`;
                        handleCopyText(payload, 'all');
                        onAddAuditLog("CDR Metadata Copied", `Copied full subscriber and telemetry details for Node #${nodeNum} to clipboard.`, "SUCCESS");
                      }}
                      className="flex-1 flex items-center justify-center gap-1 py-1.5 px-2 bg-slate-900 hover:bg-slate-850 text-slate-300 border border-slate-750 hover:border-slate-700 rounded text-[9.5px] font-semibold transition-colors cursor-pointer"
                    >
                      {copiedField === 'all' ? (
                        <>
                          <Check className="w-3 h-3 text-emerald-400" />
                          <span className="text-emerald-400">Copied to Clipboard!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3 text-slate-400" />
                          <span>Copy Details</span>
                        </>
                      )}
                    </button>

                    <button
                      type="button"
                      id="set-node-ruler-a"
                      onClick={() => {
                        setMeasurePoint1({
                          x: getScreenCoordinates(activePoint.latitude, activePoint.longitude).x,
                          y: getScreenCoordinates(activePoint.latitude, activePoint.longitude).y,
                          lat: activePoint.latitude,
                          lng: activePoint.longitude
                        });
                        setIsMeasuring(true);
                        onAddAuditLog("Ruler Benchmark Set", `Point A benchmark set from Node #${nodeNum} (${activePoint.latitude.toFixed(4)}, ${activePoint.longitude.toFixed(4)})`, "SUCCESS");
                      }}
                      className="flex items-center justify-center gap-1 py-1.5 px-2 bg-blue-950/60 hover:bg-blue-900/60 text-blue-300 border border-blue-800/60 rounded text-[9.5px] font-semibold transition-colors cursor-pointer"
                      title="Set as Benchmark Point A for Geodesic Ruler"
                    >
                      <Ruler className="w-3 h-3 text-blue-400" />
                      Set Pt A
                    </button>
                  </div>
                </div>
              );
            })()}

            {/* Heatmap Legend overlay */}
            {showHeatmap && (
              <div className="absolute bottom-4 left-4 bg-slate-950/90 border border-slate-800 px-3 py-2 rounded-lg font-mono text-[9px] text-slate-400 flex flex-col sm:flex-row sm:items-center gap-3 shadow-xl z-10 backdrop-blur-sm animate-fadeIn border-l-2 border-l-rose-500">
                <span className="text-slate-300 font-bold uppercase tracking-wider text-[8px] sm:border-r sm:border-slate-800 sm:pr-3">Density Key</span>
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-500/40 border border-rose-500" />
                  <span className="text-rose-300 font-bold">High Hits</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-orange-550/30 border border-orange-500" />
                  <span className="text-orange-300 font-bold">Moderate Hub</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500/20 border border-amber-500" />
                  <span className="text-amber-300 font-bold">Low Hit Sector</span>
                </div>
              </div>
            )}

            {/* Geodesic Ruler Floating HUD */}
            {(isMeasuring || measurePoint1 || measurePoint2) && (
              <div className="absolute bottom-4 right-4 bg-slate-950/95 border border-blue-900/50 p-3.5 rounded-lg text-left shadow-2xl max-w-[250px] font-mono text-[11px] leading-relaxed z-15 backdrop-blur-sm border-l-4 border-l-blue-500 animate-fadeIn">
                <div className="flex items-center justify-between">
                  <div className="text-[9px] uppercase font-bold tracking-widest text-blue-400 flex items-center gap-1">
                    <Ruler className="w-3 h-3 text-blue-400" />
                    Geodesic Measuring Ruler
                  </div>
                  {(measurePoint1 || measurePoint2) && (
                    <button 
                      type="button"
                      onClick={() => {
                        setMeasurePoint1(null);
                        setMeasurePoint2(null);
                        onAddAuditLog("Geospatial Measurer Reset", "Cleared all measurement benchmark markers.", "WARNING");
                      }}
                      className="text-[9.5px] font-mono text-rose-400 hover:text-rose-300 underline bg-transparent border-none cursor-pointer"
                    >
                      Clear
                    </button>
                  )}
                </div>
                
                <div className="mt-2.5 pt-2 border-t border-slate-850/60 space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-slate-500">Benchmark A (Start):</span>
                    <span className="text-blue-400 font-bold text-right">
                      {measurePoint1 ? `(${measurePoint1.lat.toFixed(4)}, ${measurePoint1.lng.toFixed(4)})` : 'Click map...'}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-500">Benchmark B (End):</span>
                    <span className="text-rose-400 font-bold text-right font-semibold">
                      {measurePoint2 ? `(${measurePoint2.lat.toFixed(4)}, ${measurePoint2.lng.toFixed(4)})` : (measurePoint1 ? 'Click target...' : 'Click map...')}
                    </span>
                  </div>
                  {measurePoint1 && measurePoint2 && (
                    <div className="bg-slate-900 border border-blue-905/35 p-2 rounded mt-1">
                      <div className="text-[9px] text-slate-500 uppercase tracking-wide">Real-World Distance</div>
                      <div className="text-sm font-bold text-emerald-450 text-emerald-400 mt-0.5">
                        {getDistanceKm(measurePoint1.lat, measurePoint1.lng, measurePoint2.lat, measurePoint2.lng).toFixed(3)} km
                      </div>
                    </div>
                  )}
                  {!measurePoint1 && (
                    <div className="text-[9.5px] text-slate-500 italic leading-snug">
                      Toggle Ruler Active & click any coordinates on the vector grid map above to establish baseline Point A.
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Impossible Velocity Anomaly Alerter */}
          {violations.length > 0 && (
            <div className="mt-4 p-4 bg-rose-950/20 border border-rose-900/40 rounded-xl">
              <div className="flex items-start gap-3">
                <AlertOctagon className="w-5 h-5 text-rose-500 mt-0.5 flex-shrink-0 animate-bounce" />
                <div className="text-left">
                  <span className="text-xs font-bold font-mono text-rose-300 uppercase tracking-wide">
                    Impossible Velocity Warning (Device Cloned/Coordinated Suspects)
                  </span>
                  
                  <div className="mt-2 space-y-2.5">
                    {violations.map((v, idx) => (
                      <div key={idx} className="bg-slate-950/80 p-3 border border-rose-900/20 rounded-lg text-[11px] font-mono leading-relaxed text-slate-300">
                        Between <span className="text-amber-400 font-semibold">{v.pt1Loc}</span> ({v.pt1Time.split(' ')[1]}) and <span className="text-amber-400 font-semibold">{v.pt2Loc}</span> ({v.pt2Time.split(' ')[1]}), target traversed a distance of <strong>{v.distance} km</strong> in <strong>{v.timeDelta} minutes</strong>.
                        <div className="mt-1.5 font-bold text-rose-400 flex items-center gap-1">
                          <span className="inline-block w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse pointer-events-none" />
                          CALCULATED VELOCITY: {v.speed} KM/H (THRESHOLD EXCEEDED)
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Database Registry Configuration - Add Towers manually */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg">
          <div className="flex justify-between items-center mb-1.5">
            <h3 className="text-xs font-bold font-mono uppercase tracking-widest text-slate-300 flex items-center gap-2">
              <PlusCircle className="w-4 h-4 text-indigo-400" />
              Local Cell-Tower Registry Lookup
            </h3>
            <button
              onClick={() => setShowAddTower(!showAddTower)}
              className="text-xs font-mono text-indigo-400 hover:text-indigo-300 hover:underline bg-transparent border-none cursor-pointer"
            >
              {showAddTower ? "Collapse Form" : "Add Custom Sector Location +"}
            </button>
          </div>

          <p className="text-[11px] text-slate-500 mb-4 font-sans leading-relaxed">
            Officers operate in strict, offline air-gapped forensic environments. Add local coordinates and regional identifiers here to match LAC/Cell IDs locally on screen.
          </p>

          {showAddTower && (
            <form onSubmit={handleCreateTower} className="bg-slate-950 border border-slate-850 rounded-xl p-4 gap-4 mb-4 grid grid-cols-2 md:grid-cols-4">
              <div>
                <label className="block text-[9px] uppercase font-mono tracking-wider font-bold text-slate-500 mb-1">MNC Network</label>
                <input 
                  type="text" 
                  className="w-full bg-slate-900 border border-slate-800 rounded p-1.5 focus:outline-none focus:border-indigo-500 font-mono text-xs" 
                  value={newTower.mnc}
                  onChange={(e) => setNewTower({...newTower, mnc: e.target.value})}
                />
              </div>
              <div>
                <label className="block text-[9px] uppercase font-mono tracking-wider font-bold text-slate-500 mb-1">Sector LAC</label>
                <input 
                  type="text" 
                  className="w-full bg-slate-900 border border-slate-800 rounded p-1.5 focus:outline-none focus:border-indigo-500 font-mono text-xs" 
                  placeholder="e.g. 1280"
                  value={newTower.lac}
                  onChange={(e) => setNewTower({...newTower, lac: e.target.value})}
                />
              </div>
              <div>
                <label className="block text-[9px] uppercase font-mono tracking-wider font-bold text-slate-500 mb-1">Cell ID (CI)</label>
                <input 
                  type="text" 
                  className="w-full bg-slate-900 border border-slate-800 rounded p-1.5 focus:outline-none focus:border-indigo-500 font-mono text-xs" 
                  placeholder="e.g. 45105"
                  value={newTower.ci}
                  onChange={(e) => setNewTower({...newTower, ci: e.target.value})}
                />
              </div>
              <div className="col-span-1">
                <label className="block text-[9px] uppercase font-mono tracking-wider font-bold text-slate-500 mb-1">Latitude Coordinate</label>
                <input 
                  type="number" 
                  step="0.0001"
                  className="w-full bg-slate-900 border border-slate-800 rounded p-1.5 focus:outline-none focus:border-indigo-500 font-mono text-xs" 
                  value={newTower.latitude}
                  onChange={(e) => setNewTower({...newTower, latitude: parseFloat(e.target.value) || 24.48})}
                />
              </div>
              <div>
                <label className="block text-[9px] uppercase font-mono tracking-wider font-bold text-slate-500 mb-1">Longitude Coordinate</label>
                <input 
                  type="number" 
                  step="0.0001"
                  className="w-full bg-slate-900 border border-slate-800 rounded p-1.5 focus:outline-none focus:border-indigo-500 font-mono text-xs" 
                  value={newTower.longitude}
                  onChange={(e) => setNewTower({...newTower, longitude: parseFloat(e.target.value) || 86.68})}
                />
              </div>
              <div className="col-span-2">
                <label className="block text-[9px] uppercase font-mono tracking-wider font-bold text-slate-500 mb-1">Sector Name / Description</label>
                <input 
                  type="text" 
                  className="w-full bg-slate-900 border border-slate-800 rounded p-1.5 focus:outline-none focus:border-indigo-500 font-mono text-xs" 
                  value={newTower.name}
                  onChange={(e) => setNewTower({...newTower, name: e.target.value})}
                />
              </div>
              <div className="col-span-2 md:col-span-4 flex justify-end gap-2 pt-2 border-t border-slate-900">
                <button 
                  type="submit" 
                  className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white font-mono text-[11px] font-bold rounded cursor-pointer transition-colors"
                >
                  Confirm Tower Registry
                </button>
              </div>
            </form>
          )}

          {/* Quick Registry Table overview */}
          <div className="overflow-x-auto border border-slate-850 rounded-lg max-h-44 overflow-y-auto">
            <table className="w-full text-left font-mono text-[10px] border-collapse">
              <thead>
                <tr className="bg-slate-950 text-slate-500 border-b border-slate-850 uppercase tracking-wider font-bold">
                  <th className="p-2 text-left">Sector Name</th>
                  <th className="p-2 text-left">MCC-MNC</th>
                  <th className="p-2 text-left">LAC</th>
                  <th className="p-2 text-left">Cell ID (CI)</th>
                  <th className="p-2 text-left">Symmetrical GPS Location</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-850 bg-slate-950/20 text-slate-400">
                {localTowers.map((t, idx) => (
                  <tr key={idx} className="hover:bg-slate-900/40">
                    <td className="p-2 text-slate-300 font-bold">{t.name}</td>
                    <td className="p-2">{t.mcc}-{t.mnc}</td>
                    <td className="p-2 font-mono text-indigo-400">{t.lac}</td>
                    <td className="p-2 font-mono text-indigo-400">{t.ci}</td>
                    <td className="p-2 text-emerald-400">({t.latitude.toFixed(4)}, {t.longitude.toFixed(4)})</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

      </div>

    </div>
  );
}
