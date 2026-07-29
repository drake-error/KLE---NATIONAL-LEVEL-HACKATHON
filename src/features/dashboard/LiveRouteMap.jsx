import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import MapGL, { Source, Layer, Marker } from 'react-map-gl/maplibre';
import * as turf from '@turf/turf';
import 'mapbox-gl/dist/mapbox-gl.css';
import 'maplibre-gl/dist/maplibre-gl.css';

// Zero-token CARTO Dark Matter raster tile specification (Guarantees reliable high-contrast tile rendering)
const FREE_DARK_STYLE = {
  version: 8,
  sources: {
    carto_dark_raster: {
      type: 'raster',
      tiles: [
        'https://a.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}@2x.png',
        'https://b.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}@2x.png',
        'https://c.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}@2x.png'
      ],
      tileSize: 256,
      attribution: '&copy; OpenStreetMap &copy; CARTO'
    }
  },
  layers: [
    {
      id: 'carto_dark_raster_layer',
      type: 'raster',
      source: 'carto_dark_raster',
      minzoom: 0,
      maxzoom: 22
    }
  ]
};

// Fallback coordinates in Bangalore if browser GPS permission is denied or times out
const BANGALORE_FALLBACK_COORD = [77.6229, 12.9172]; // HSR Layout / Silk Board Corridor [lng, lat]

/**
 * Generates dynamic mock hospital locations within 2 to 5 km of any GPS coordinate
 */
function generateNearbyHospitals(originCoord) {
  const originPoint = turf.point(originCoord);
  const templates = [
    { name: "St. John's Trauma & Critical Care (Level 1)", specialty: "Polytrauma & Emergency Surgical", bearing: 35, distKm: 2.6, icon: "🏥" },
    { name: "Apollo Emergency Heart Institute", specialty: "Advanced Cardiac & Vascular", bearing: 160, distKm: 3.8, icon: "🩺" },
    { name: "Manipal Advanced Rescue Hospital", specialty: "Neurology & Multi-Specialty Triage", bearing: 280, distKm: 4.5, icon: "🚑" }
  ];

  return templates.map((tpl, idx) => {
    const dest = turf.destination(originPoint, tpl.distKm, tpl.bearing, { units: 'kilometers' });
    return {
      id: `hosp_${idx + 1}`,
      name: tpl.name,
      specialty: tpl.specialty,
      coords: dest.geometry.coordinates,
      straightDistKm: tpl.distKm
    };
  });
}

/**
 * Generates 4 autonomous traffic signal agent nodes distributed evenly along a calculated polyline
 */
function generateSignalNodes(routeLine, totalDistKm) {
  const percentages = [0.18, 0.42, 0.68, 0.88];
  const nodeNames = [
    "Agent Node 01 [Outer Gateway]",
    "Agent Node 02 [Midway Transit]",
    "Agent Node 03 [Inner Ring Road]",
    "Agent Node 04 [Medical Gateway]"
  ];

  return percentages.map((p, index) => {
    const pt = turf.along(routeLine, p * totalDistKm, { units: 'kilometers' });
    return {
      id: `signal_node_${index}`,
      name: nodeNames[index],
      coords: pt.geometry.coordinates,
      state: 'NORMAL_CYCLE', // 'NORMAL_CYCLE' | 'GREEN_WAVE_ACTIVE'
      distanceFromStart: p * totalDistKm
    };
  });
}

/**
 * Constructs an extruded 3D emergency rescue vehicle polygon geometry
 */
function createAmbulanceGeometry(coord, bearingDeg = 0) {
  const centerPoint = turf.point(coord);
  const lengthKm = 0.025; 
  const widthKm = 0.012;

  const front = turf.destination(centerPoint, lengthKm / 2, bearingDeg);
  const back = turf.destination(centerPoint, lengthKm / 2, (bearingDeg + 180) % 360);

  const frontRight = turf.destination(front, widthKm / 2, (bearingDeg + 90) % 360);
  const frontLeft = turf.destination(front, widthKm / 2, (bearingDeg - 90) % 360);
  const backRight = turf.destination(back, widthKm / 2, (bearingDeg + 90) % 360);
  const backLeft = turf.destination(back, widthKm / 2, (bearingDeg - 90) % 360);

  const chassis = turf.polygon([[
    frontLeft.geometry.coordinates,
    frontRight.geometry.coordinates,
    backRight.geometry.coordinates,
    backLeft.geometry.coordinates,
    frontLeft.geometry.coordinates
  ]], { part: 'chassis', color: '#e11d48' });

  const beaconFront = turf.destination(centerPoint, lengthKm / 4, bearingDeg);
  const bFR = turf.destination(beaconFront, widthKm / 3, (bearingDeg + 90) % 360);
  const bFL = turf.destination(beaconFront, widthKm / 3, (bearingDeg - 90) % 360);
  const bBR = turf.destination(centerPoint, widthKm / 3, (bearingDeg + 90) % 360);
  const bBL = turf.destination(centerPoint, widthKm / 3, (bearingDeg - 90) % 360);

  const beacon = turf.polygon([[
    bFL.geometry.coordinates,
    bFR.geometry.coordinates,
    bBR.geometry.coordinates,
    bBL.geometry.coordinates,
    bFL.geometry.coordinates
  ]], { part: 'beacon', color: '#00ffff' });

  return turf.featureCollection([chassis, beacon]);
}

export default function LiveRouteMap() {
  /* =====================================================================
   * PHASE 1: LIVE GPS INITIALIZATION STATE
   * ===================================================================== */
  const [gpsLocation, setGpsLocation] = useState(BANGALORE_FALLBACK_COORD);
  const [gpsStatus, setGpsStatus] = useState('locating'); // 'locating', 'live', 'fallback'
  
  /* =====================================================================
   * PHASE 2: DYNAMIC HOSPITAL DISCOVERY & ROUTING STATE
   * ===================================================================== */
  const [hospitals, setHospitals] = useState(() => generateNearbyHospitals(BANGALORE_FALLBACK_COORD));
  const [selectedHospital, setSelectedHospital] = useState(null);
  const [routeCoords, setRouteCoords] = useState([]);
  const [routeDistanceKm, setRouteDistanceKm] = useState(0);
  const [isRouting, setIsRouting] = useState(false);
  const [signalNodes, setSignalNodes] = useState([]);

  /* =====================================================================
   * PHASE 4: SIMULATION & AI AGENT COMMUNICATION STATE
   * ===================================================================== */
  const [isSimulating, setIsSimulating] = useState(false);
  const [animatedVehicle, setAnimatedVehicle] = useState(null);
  const [agentLogs, setAgentLogs] = useState([]);
  const [activeToast, setActiveToast] = useState(null);

  const mapRef = useRef(null);
  const animationFrameRef = useRef(null);
  const startTimestampRef = useRef(null);
  const triggerTrackerRef = useRef({});

  // Helper: Trigger Toast Notification
  const triggerToast = useCallback((msg, type = 'info') => {
    setActiveToast({ text: msg, type });
    const timer = setTimeout(() => setActiveToast(null), 4200);
    return () => clearTimeout(timer);
  }, []);

  // Helper: Append formatted terminal log
  const addLog = useCallback((logString) => {
    setAgentLogs(prev => [...prev.slice(-30), { time: new Date().toLocaleTimeString(), text: logString }]);
  }, []);

  /* ---------------------------------------------------------------------
   * PHASE 1 EXECUTION: FETCH BROWSER GPS ON MOUNT
   * --------------------------------------------------------------------- */
  const fetchLiveGPS = useCallback(() => {
    setGpsStatus('locating');
    triggerToast('Acquiring high-precision satellite GPS coordinates...', 'info');

    if (!navigator.geolocation) {
      setGpsLocation(BANGALORE_FALLBACK_COORD);
      setGpsStatus('fallback');
      setHospitals(generateNearbyHospitals(BANGALORE_FALLBACK_COORD));
      triggerToast('Geolocation unsupported. Loaded Bangalore Command fallback coordinate.', 'warning');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const liveCoords = [pos.coords.longitude, pos.coords.latitude];
        setGpsLocation(liveCoords);
        setGpsStatus('live');
        const generated = generateNearbyHospitals(liveCoords);
        setHospitals(generated);
        triggerToast(`Live GPS Acquired: [${liveCoords[0].toFixed(4)}° E, ${liveCoords[1].toFixed(4)}° N]`, 'success');
        addLog(`[LOG] 🛰️ [GPS_SATELLITE_LOCK]: Emergency Ambulance anchor initialized at live position (${liveCoords[0].toFixed(5)}, ${liveCoords[1].toFixed(5)}).`);
        
        // Auto-select first hospital and compute route
        if (generated.length > 0) {
          handleSelectHospital(generated[0], liveCoords);
        }

        if (mapRef.current) {
          mapRef.current.easeTo({ center: liveCoords, zoom: 14.5, pitch: 52, bearing: -10, duration: 1500 });
        }
      },
      (err) => {
        console.warn('GPS permission denied or failed, using Bangalore fallback:', err.message);
        setGpsLocation(BANGALORE_FALLBACK_COORD);
        setGpsStatus('fallback');
        const generated = generateNearbyHospitals(BANGALORE_FALLBACK_COORD);
        setHospitals(generated);
        triggerToast('GPS Permission Denied/Unavailable. Initialized Bangalore HSR/Silk Board sector.', 'warning');
        addLog(`[LOG] 📍 [COMMAND_CENTER]: Loaded fallback Bangalore Emergency sector lock at (${BANGALORE_FALLBACK_COORD[0]}, ${BANGALORE_FALLBACK_COORD[1]}).`);
        if (generated.length > 0) {
          handleSelectHospital(generated[0], BANGALORE_FALLBACK_COORD);
        }
      },
      { enableHighAccuracy: true, timeout: 5000, maximumAge: 10000 }
    );
  }, [triggerToast, addLog]);

  useEffect(() => {
    fetchLiveGPS();
  }, [fetchLiveGPS]);

  /* ---------------------------------------------------------------------
   * PHASE 2 EXECUTION: FETCH OSRM ROUTE & GENERATE SIGNAL NODES
   * --------------------------------------------------------------------- */
  const handleSelectHospital = async (hospital, overrideOrigin = null) => {
    if (isSimulating) return;
    setSelectedHospital(hospital);
    setIsRouting(true);
    const origin = overrideOrigin || gpsLocation;
    const dest = hospital.coords;

    try {
      const osrmUrl = `https://router.project-osrm.org/route/v1/driving/${origin[0]},${origin[1]};${dest[0]},${dest[1]}?geometries=geojson&overview=full`;
      const res = await fetch(osrmUrl);
      if (!res.ok) throw new Error(`OSRM HTTP ${res.status}`);
      const data = await res.json();

      if (data.routes && data.routes.length > 0) {
        const pathCoords = data.routes[0].geometry.coordinates;
        const distMeters = data.routes[0].distance;
        const distKm = distMeters / 1000;
        
        setRouteCoords(pathCoords);
        setRouteDistanceKm(distKm);

        // Dynamically distribute 4 AI Signal Nodes along the fetched road polyline
        const line = turf.lineString(pathCoords);
        const nodes = generateSignalNodes(line, distKm);
        setSignalNodes(nodes);

        addLog(`[LOG] 🛣️ [OSRM_ROUTE_ENGINE]: Computed safe emergency driving corridor to ${hospital.name}. Total distance: ${distKm.toFixed(2)} km across ${nodes.length} agent junctions.`);
      }
    } catch (err) {
      console.warn("OSRM network routing fallback:", err.message);
      // Fallback: direct line interpolation with realistic waypoints
      const line = turf.lineString([origin, dest]);
      const distKm = turf.length(line, { units: 'kilometers' });
      const mid1 = turf.along(line, distKm * 0.33, { units: 'kilometers' }).geometry.coordinates;
      const mid2 = turf.along(line, distKm * 0.66, { units: 'kilometers' }).geometry.coordinates;
      const fallbackPath = [origin, mid1, mid2, dest];
      
      setRouteCoords(fallbackPath);
      setRouteDistanceKm(distKm);
      setSignalNodes(generateSignalNodes(turf.lineString(fallbackPath), distKm));
      addLog(`[LOG] 🛣️ [LOCAL_TURF_ENGINE]: Generated direct trajectory corridor to ${hospital.name} (${distKm.toFixed(2)} km).`);
    } finally {
      setIsRouting(false);
      setAnimatedVehicle(null);
    }
  };

  /* ---------------------------------------------------------------------
   * PHASE 3 COMPUTED STATS: SPEED, ETA, INTERSECTIONS
   * --------------------------------------------------------------------- */
  const recommendedSpeedKmh = 60; // Standard Emergency Green Wave Velocity
  const calculatedEtaMinutes = useMemo(() => {
    if (!routeDistanceKm) return 0;
    const hours = routeDistanceKm / recommendedSpeedKmh;
    return Math.max(1, Math.round(hours * 60));
  }, [routeDistanceKm]);

  const routeGeoJson = useMemo(() => {
    if (routeCoords.length < 2) return turf.featureCollection([]);
    return turf.featureCollection([turf.lineString(routeCoords)]);
  }, [routeCoords]);

  /* ---------------------------------------------------------------------
   * PHASE 4 EXECUTION: ZOMATO-STYLE 3D VEHICLE & MULTI-AGENT LOGIC
   * --------------------------------------------------------------------- */
  const startDispatchSimulation = () => {
    if (isSimulating || routeCoords.length < 2) return;
    setIsSimulating(true);
    startTimestampRef.current = null;
    triggerTrackerRef.current = {}; // reset proximity trigger locks

    // Reset all signal agent nodes to red NORMAL_CYCLE
    setSignalNodes(prev => prev.map(n => ({ ...n, state: 'NORMAL_CYCLE' })));

    triggerToast(`EMERGENCY DISPATCH LIVE! Ambulance speeding toward ${selectedHospital?.name} at ${recommendedSpeedKmh} km/h.`, 'warning');
    addLog(`[LOG] 🚀 [COMMAND_CENTER]: ALPHA Priority Emergency Transport initiated. V2X Green Wave Protocol active.`);

    const line = turf.lineString(routeCoords);
    const durationMs = 15000; // 15-second high-impact hackathon presentation loop

    const animate = (timestamp) => {
      if (!startTimestampRef.current) startTimestampRef.current = timestamp;
      const elapsed = timestamp - startTimestampRef.current;
      const progress = Math.min(elapsed / durationMs, 1);
      const currentDistKm = progress * routeDistanceKm;

      // Smooth Turf along calculation
      const currentPt = turf.along(line, currentDistKm, { units: 'kilometers' });
      const coord = currentPt.geometry.coordinates;

      // Look slightly ahead to calculate vehicle forward orientation bearing
      const nextDistKm = Math.min(currentDistKm + 0.006, routeDistanceKm);
      const nextPt = turf.along(line, nextDistKm, { units: 'kilometers' });
      let bearingDeg = 0;
      if (coord[0] !== nextPt.geometry.coordinates[0] || coord[1] !== nextPt.geometry.coordinates[1]) {
        bearingDeg = turf.bearing(turf.point(coord), turf.point(nextPt.geometry.coordinates));
      }

      setAnimatedVehicle({ lng: coord[0], lat: coord[1], bearing: bearingDeg });

      // Keep Mapbox camera centered on speeding emergency vehicle without React-Map-GL wrapper freezes
      if (mapRef.current && progress < 0.98) {
        const rawMap = mapRef.current.getMap();
        if (rawMap && typeof rawMap.jumpTo === 'function') {
          rawMap.jumpTo({ center: coord, zoom: 15 });
          const source = rawMap.getSource('amb-3d-model');
          if (source && typeof source.setData === 'function') {
            source.setData(createAmbulanceGeometry(coord, bearingDeg));
          }
        }
      }

      // --- MULTI-AGENT PROXIMITY HANDOFF LOGIC ---
      signalNodes.forEach((node, i) => {
        const nextNodeName = signalNodes[i + 1] ? signalNodes[i + 1].name : `${selectedHospital?.name} (Emergency Trauma Bay)`;
        const etaRemaining = Math.max(1, Math.round(((routeDistanceKm - node.distanceFromStart) / recommendedSpeedKmh) * 60));

        // When ambulance is nearing or crossing the node threshold (~0.25 km before or right at node)
        if (!triggerTrackerRef.current[node.id] && currentDistKm >= (node.distanceFromStart - 0.15)) {
          triggerTrackerRef.current[node.id] = true;

          // 1. Switch signal map indicator GREEN
          setSignalNodes(prev => prev.map((item, idx) => {
            if (idx === i) return { ...item, state: 'GREEN_WAVE_ACTIVE' };
            if (idx === i - 1) return { ...item, state: 'NORMAL_CYCLE' }; // return upstream signal to normal cycle
            return item;
          }));

          // 2. Trigger EXACT formatted AI inter-agent communication logs
          if (i < signalNodes.length - 1) {
            addLog(`[LOG] 📡 [${node.name}] to [${nextNodeName}]: Ambulance has crossed my sector. Clear traffic in your sector immediately. ETA to your signal: ~${etaRemaining} mins.`);
            setTimeout(() => {
              addLog(`[LOG] 🚦 [${nextNodeName}]: Acknowledged. Initiating Green Wave Protocol. Traffic clearing.`);
            }, 600);
          } else {
            // Final hospital arrival handoff
            addLog(`[LOG] 📡 [${node.name}] to [${nextNodeName}]: Ambulance has crossed my sector. Clear traffic in your sector immediately. ETA to your signal: ~${etaRemaining} min.`);
            setTimeout(() => {
              addLog(`[LOG] 🏥 [${nextNodeName}]: Acknowledged. Trauma Bay 1 ready. Triage medical team standing by at doors.`);
            }, 600);
          }

          triggerToast(`GREEN WAVE ACTIVE: ${node.name} signal cleared!`, 'success');
        }
      });

      // --- ROUTE COMPLETION ---
      if (progress < 1) {
        animationFrameRef.current = requestAnimationFrame(animate);
      } else {
        setIsSimulating(false);
        setSignalNodes(prev => prev.map(n => ({ ...n, state: 'NORMAL_CYCLE' })));
        setAnimatedVehicle(null);
        addLog(`[LOG] ✅ [MISSION_COMPLETED]: Ambulance arrived at ${selectedHospital?.name}. Total transit elapsed: ${calculatedEtaMinutes} mins via Green Wave.`);
        triggerToast(`Vehicle successfully arrived at ${selectedHospital?.name}!`, 'success');
      }
    };

    animationFrameRef.current = requestAnimationFrame(animate);
  };

  useEffect(() => {
    return () => {
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    };
  }, []);

  // Map Load Handler: Mount Custom 3D Vehicle Extrusion Layer
  const handleMapLoad = useCallback((e) => {
    const map = e.target;
    if (!map.getSource('amb-3d-model')) {
      map.addSource('amb-3d-model', {
        type: 'geojson',
        data: createAmbulanceGeometry(gpsLocation, 0)
      });

      map.addLayer({
        id: 'amb-chassis-3d',
        type: 'fill-extrusion',
        source: 'amb-3d-model',
        filter: ['==', 'part', 'chassis'],
        paint: {
          'fill-extrusion-color': ['get', 'color'],
          'fill-extrusion-height': 5.0,
          'fill-extrusion-base': 0.2,
          'fill-extrusion-opacity': 0.95
        }
      });

      map.addLayer({
        id: 'amb-beacon-3d',
        type: 'fill-extrusion',
        source: 'amb-3d-model',
        filter: ['==', 'part', 'beacon'],
        paint: {
          'fill-extrusion-color': ['get', 'color'],
          'fill-extrusion-height': 6.2,
          'fill-extrusion-base': 5.0,
          'fill-extrusion-opacity': 1
        }
      });
    }
  }, [gpsLocation]);

  return (
    <div className="col-span-4 flex flex-col gap-4 h-full pb-4 text-slate-100 font-sans">
      {/* Toast Notification HUD */}
      {activeToast && (
        <div className="fixed top-20 right-8 z-[10000] max-w-md px-4 py-3 rounded-2xl shadow-2xl border border-white/20 backdrop-blur-md font-medium text-white animate-bounce flex items-center gap-3 bg-slate-950/95 ring-2 ring-emerald-500">
          <span className="material-symbols-outlined text-3xl text-emerald-400 animate-pulse">
            {activeToast.type === 'success' ? 'verified' : activeToast.type === 'warning' ? 'bolt' : 'info'}
          </span>
          <div className="flex flex-col">
            <span className="font-extrabold text-xs uppercase tracking-widest text-emerald-400">V2X AI Agent Alert</span>
            <span className="text-sm text-slate-200">{activeToast.text}</span>
          </div>
        </div>
      )}

      {/* ===================================================================
       * PHASE 1 & 4 MAP CANVASS: 3D TELEMETRY & ROUTE SURVEILLANCE
       * =================================================================== */}
      <div className="bg-slate-900/90 p-4 rounded-2xl border border-slate-800 shadow-2xl flex flex-col shrink-0 backdrop-blur-lg">
        <div className="flex justify-between items-center mb-3">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-rose-600 animate-ping"></span>
            <h3 className="font-black text-base tracking-wide text-white uppercase flex items-center gap-2">
              ResQ-Pulse 3D Telemetry
            </h3>
          </div>
          <button 
            onClick={fetchLiveGPS} 
            disabled={isSimulating}
            className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] font-bold rounded-lg border border-slate-700 flex items-center gap-1 transition-all"
          >
            <span className="material-symbols-outlined text-xs">my_location</span>
            <span>{gpsStatus === 'live' ? 'GPS Lock Live' : 'Fallback GPS'}</span>
          </button>
        </div>

        {/* Explicit Fixed Height Wrapper for Guaranteed Map Visibility */}
        <div className="w-full h-[380px] xl:h-[430px] rounded-xl overflow-hidden border border-slate-700/80 relative shadow-inner bg-slate-950">
          <MapGL
            ref={mapRef}
            initialViewState={{
              longitude: gpsLocation[0],
              latitude: gpsLocation[1],
              zoom: 14.5,
              pitch: 54,
              bearing: -10
            }}
            style={{ width: '100%', height: '100%' }}
            mapStyle={FREE_DARK_STYLE}
            onLoad={handleMapLoad}
          >
            {/* OSRM Driving Polyline Route */}
            <Source id="osrm-route-layer" type="geojson" data={routeGeoJson}>
              <Layer
                id="osrm-route-glow"
                type="line"
                paint={{
                  'line-color': isSimulating ? '#22c55e' : '#e11d48',
                  'line-width': 10,
                  'line-opacity': 0.4,
                  'line-blur': 3
                }}
              />
              <Layer
                id="osrm-route-core"
                type="line"
                paint={{
                  'line-color': isSimulating ? '#4ade80' : '#f43f5e',
                  'line-width': 4,
                  'line-opacity': 0.95,
                  'line-dasharray': [2, 1.5]
                }}
              />
            </Source>

            {/* PHASE 1: User GPS Starting Position (Styled 3D Ambulance Marker instead of blue dot) */}
            <Marker longitude={gpsLocation[0]} latitude={gpsLocation[1]} anchor="bottom">
              <div className="group relative flex flex-col items-center cursor-pointer">
                <div className="px-2 py-0.5 bg-rose-600/90 text-white rounded text-[10px] font-extrabold shadow-2xl mb-1 border border-white/40 animate-pulse uppercase tracking-wider whitespace-nowrap">
                  🚑 Live GPS Anchor (Start)
                </div>
                <div className="w-9 h-9 rounded-2xl bg-gradient-to-br from-rose-600 to-amber-600 border-2 border-white flex items-center justify-center text-xl shadow-[0_0_25px_#e11d48]">
                  🚑
                </div>
              </div>
            </Marker>

            {/* PHASE 2: Dynamic Traffic Signal Nodes Along Route */}
            {signalNodes.map((node, idx) => (
              <Marker key={node.id} longitude={node.coords[0]} latitude={node.coords[1]} anchor="bottom">
                <div className="group relative flex flex-col items-center cursor-pointer hover:scale-110 transition-transform">
                  <div className={`px-2 py-0.5 rounded text-[9px] font-black text-white shadow-xl mb-1 whitespace-nowrap border ${
                    node.state === 'GREEN_WAVE_ACTIVE'
                      ? 'bg-emerald-600 border-emerald-300 animate-bounce ring-4 ring-emerald-500/50'
                      : 'bg-slate-900 border-slate-700 text-slate-300'
                  }`}>
                    {node.state === 'GREEN_WAVE_ACTIVE' ? `🟢 ${node.name} (CLEARED)` : `🔴 Node 0${idx + 1}`}
                  </div>
                  <div className="p-1 bg-slate-950 rounded-full border border-slate-700 shadow-2xl flex flex-col gap-1 items-center">
                    <span className={`w-2.5 h-2.5 rounded-full ${node.state === 'NORMAL_CYCLE' ? 'bg-red-500 shadow-[0_0_8px_#ef4444]' : 'bg-slate-800'}`} />
                    <span className={`w-2.5 h-2.5 rounded-full ${node.state === 'GREEN_WAVE_ACTIVE' ? 'bg-emerald-500 shadow-[0_0_10px_#22c55e]' : 'bg-slate-800'}`} />
                  </div>
                  <div className="w-0.5 h-4 bg-slate-700"></div>
                </div>
              </Marker>
            ))}

            {/* Selected Hospital Target Marker */}
            {selectedHospital && (
              <Marker longitude={selectedHospital.coords[0]} latitude={selectedHospital.coords[1]} anchor="bottom">
                <div className="flex flex-col items-center cursor-pointer hover:scale-110 transition-transform">
                  <div className="px-2.5 py-0.5 bg-emerald-700 text-white rounded text-[10px] font-extrabold shadow-lg mb-1 whitespace-nowrap border border-emerald-400 animate-pulse">
                    🏥 {selectedHospital.name}
                  </div>
                  <div className="w-9 h-9 rounded-2xl bg-slate-900 border-2 border-emerald-400 flex items-center justify-center text-xl shadow-[0_0_20px_#10b981]">
                    🏥
                  </div>
                </div>
              </Marker>
            )}

            {/* PHASE 4: Animated Moving Emergency Vehicle Telemetry Overlay */}
            {animatedVehicle && (
              <Marker longitude={animatedVehicle.lng} latitude={animatedVehicle.lat} anchor="center">
                <div className="pointer-events-none flex flex-col items-center">
                  <div className="translate-y-[-28px] px-3 py-1 rounded-full bg-gradient-to-r from-rose-600 via-red-600 to-amber-500 text-white font-black text-[10px] uppercase tracking-widest shadow-2xl border border-white flex items-center gap-1.5 animate-pulse">
                    <span className="w-2 h-2 rounded-full bg-white animate-ping"></span>
                    <span>🚑 AMB_09 (60 KM/H GREEN WAVE)</span>
                  </div>
                  <div 
                    className="w-11 h-11 rounded-full bg-rose-500/30 border-2 border-rose-500 flex items-center justify-center shadow-[0_0_25px_#f43f5e] transition-transform duration-75"
                    style={{ transform: `rotate(${animatedVehicle.bearing}deg)` }}
                  >
                    <div className="w-3.5 h-3.5 bg-white rounded-full shadow-inner animate-ping"></div>
                  </div>
                </div>
              </Marker>
            )}
          </MapGL>

          {/* Top-left GPS Coordinate Telemetry HUD */}
          <div className="absolute top-3 left-3 px-3 py-2 bg-slate-950/90 backdrop-blur-md rounded-xl border border-slate-800 shadow-xl pointer-events-none flex items-center gap-3 z-10">
            <div className={`w-3 h-3 rounded-full ${gpsStatus === 'live' ? 'bg-emerald-500 animate-ping' : 'bg-amber-500'}`}></div>
            <div>
              <p className="text-[10px] uppercase font-black text-slate-400 tracking-wider">
                {gpsStatus === 'live' ? 'High-Accuracy Satellite GPS' : 'Command Center Fallback Lock'}
              </p>
              <p className="text-xs font-black text-slate-100 font-mono">
                {gpsLocation[0].toFixed(4)}° E, {gpsLocation[1].toFixed(4)}° N
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ===================================================================
       * PHASE 2: DYNAMIC HOSPITAL DISCOVERY & UI SIDEBAR PANEL
       * =================================================================== */}
      <div className="bg-slate-900/90 p-4 rounded-2xl border border-slate-800 shadow-2xl flex flex-col shrink-0 backdrop-blur-md">
        <h3 className="font-black text-sm text-rose-500 mb-3 flex items-center justify-between uppercase tracking-wider">
          <span className="flex items-center gap-2">
            <span className="material-symbols-outlined text-lg">local_hospital</span>
            Nearby Trauma Hospitals (2-5 KM Radius)
          </span>
          {isRouting && <span className="text-xs text-amber-400 font-mono animate-pulse">Calculating OSRM Path...</span>}
        </h3>

        <div className="space-y-2 max-h-48 overflow-y-auto custom-scrollbar pr-1">
          {hospitals.map((hosp) => {
            const isSelected = selectedHospital && selectedHospital.id === hosp.id;
            return (
              <div
                key={hosp.id}
                onClick={() => handleSelectHospital(hosp)}
                className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
                  isSelected
                    ? 'bg-gradient-to-r from-slate-900 via-rose-950/40 to-slate-900 border-rose-500 shadow-lg ring-1 ring-rose-500'
                    : 'bg-slate-950/80 hover:bg-slate-800 border-slate-800/80'
                } ${isSimulating ? 'pointer-events-none opacity-60' : ''}`}
              >
                <div className="flex items-center gap-3">
                  <span className="text-2xl p-2 bg-slate-900 rounded-xl border border-slate-800">{hosp.icon}</span>
                  <div>
                    <p className={`font-bold text-sm ${isSelected ? 'text-rose-400' : 'text-slate-100'}`}>{hosp.name}</p>
                    <p className="text-xs text-slate-400">{hosp.specialty}</p>
                  </div>
                </div>
                <div className="text-right">
                  <span className="px-2 py-1 rounded-lg bg-slate-900 border border-slate-700 text-xs font-mono font-bold text-emerald-400 whitespace-nowrap">
                    {hosp.straightDistKm} KM
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ===================================================================
       * PHASE 3: ROUTE PRE-COMPUTATION (STATS PANEL & DISPATCH BUTTON)
       * =================================================================== */}
      <div className="bg-slate-900/90 p-4 rounded-2xl border border-slate-800 shadow-2xl flex flex-col shrink-0 backdrop-blur-md">
        <h3 className="font-black text-xs text-slate-400 mb-3 uppercase tracking-widest flex items-center gap-1.5">
          <span className="material-symbols-outlined text-sm">analytics</span>
          Route Statistics & Command Overlay
        </h3>

        {/* 4-Metric Pre-Computation Grid */}
        <div className="grid grid-cols-4 gap-2 mb-4">
          <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800 text-center">
            <p className="text-[10px] text-slate-400 font-bold uppercase">Total Distance</p>
            <p className="text-sm font-black text-rose-500 font-mono mt-0.5">{routeDistanceKm ? `${routeDistanceKm.toFixed(2)} KM` : '--'}</p>
          </div>
          <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800 text-center">
            <p className="text-[10px] text-slate-400 font-bold uppercase">Target Speed</p>
            <p className="text-sm font-black text-emerald-400 font-mono mt-0.5">{recommendedSpeedKmh} KM/H</p>
          </div>
          <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800 text-center">
            <p className="text-[10px] text-slate-400 font-bold uppercase">Accurate ETA</p>
            <p className="text-sm font-black text-amber-400 font-mono mt-0.5">{calculatedEtaMinutes} MINS</p>
          </div>
          <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800 text-center">
            <p className="text-[10px] text-slate-400 font-bold uppercase">AI Signal Nodes</p>
            <p className="text-sm font-black text-cyan-400 font-mono mt-0.5">{signalNodes.length} JUNCTIONS</p>
          </div>
        </div>

        {/* Prominent START DISPATCH Button */}
        <button
          onClick={startDispatchSimulation}
          disabled={isSimulating || routeCoords.length < 2}
          className="w-full py-4 px-6 bg-gradient-to-r from-rose-600 via-red-600 to-amber-600 hover:from-rose-500 hover:to-amber-500 text-white rounded-xl font-black text-sm tracking-wide shadow-2xl active:scale-[0.98] transition-all flex items-center justify-center gap-3 border border-white/20 disabled:opacity-50 disabled:pointer-events-none uppercase"
        >
          <span className="material-symbols-outlined text-2xl animate-bounce">rocket_launch</span>
          <span>{isSimulating ? '🚀 GREEN WAVE TELEMETRY IN PROGRESS...' : '⚡ START DISPATCH (ACTIVATE GREEN WAVE)'}</span>
        </button>
      </div>

      {/* ===================================================================
       * PHASE 4: AI AGENT COMMUNICATION LOG TERMINAL
       * =================================================================== */}
      <div className="bg-slate-950 rounded-2xl border border-slate-800 shadow-2xl flex flex-col overflow-hidden flex-1 min-h-[220px]">
        <div className="p-3 border-b border-slate-800 flex justify-between items-center bg-slate-900 text-white">
          <div className="flex items-center gap-2.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping"></span>
            <span className="material-symbols-outlined text-emerald-400 text-lg">terminal</span>
            <h3 className="font-mono font-bold text-xs tracking-wider uppercase text-slate-200">
              Agent Terminal: V2X Inter-Agent Handoff Feed
            </h3>
          </div>
          <span className="text-[10px] font-mono text-emerald-400 font-bold bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-700/50">
            LLM NEURAL AGENTS ACTIVE
          </span>
        </div>

        {/* Scrolling Log Display */}
        <div className="flex-1 p-3.5 bg-slate-950 text-slate-200 font-mono text-xs space-y-2 overflow-y-auto custom-scrollbar max-h-64">
          {agentLogs.length === 0 ? (
            <div className="text-slate-500 italic text-center py-6 font-sans">
              No inter-agent communication transmitting. Click a hospital and press START DISPATCH to initialize autonomous signal pre-emption...
            </div>
          ) : (
            agentLogs.map((item, index) => (
              <div 
                key={index} 
                className={`p-2 rounded-lg border-l-4 leading-relaxed ${
                  item.text.includes('📡') 
                    ? 'border-cyan-500 bg-slate-900/60 text-cyan-200' 
                    : item.text.includes('🚦') || item.text.includes('🏥')
                    ? 'border-emerald-500 bg-emerald-950/30 text-emerald-200'
                    : 'border-rose-500 bg-slate-900/40 text-slate-300'
                }`}
              >
                <span className="text-[10px] text-slate-500 font-bold mr-2">[{item.time}]</span>
                <span className="font-mono">{item.text}</span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
