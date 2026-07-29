import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import MapGL, { Source, Layer, Marker } from 'react-map-gl/maplibre';
import * as turf from '@turf/turf';
import 'mapbox-gl/dist/mapbox-gl.css';
import 'maplibre-gl/dist/maplibre-gl.css';

// Zero-token CARTO Dark Matter raster tile specification (Guarantees reliable high-contrast dark tile rendering)
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
      attribution: '&copy; OpenStreetMap &copy; CARTO &copy; ResQ-Pulse AI'
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
    { name: "St. John's Trauma & Critical Care (Level 1)", specialty: "Polytrauma & Emergency Surgical Bay", bearing: 35, distKm: 2.6, icon: "🏥", triageBeds: "6 Available" },
    { name: "Apollo Emergency Heart Institute", specialty: "Advanced Cardiac & Vascular Triage", bearing: 160, distKm: 3.8, icon: "🩺", triageBeds: "4 Available" },
    { name: "Manipal Advanced Rescue Hospital", specialty: "Neurology & Multi-Specialty ICU", bearing: 280, distKm: 4.5, icon: "🚑", triageBeds: "9 Available" }
  ];

  return templates.map((tpl, idx) => {
    const dest = turf.destination(originPoint, tpl.distKm, tpl.bearing, { units: 'kilometers' });
    return {
      id: `hosp_${idx + 1}`,
      name: tpl.name,
      specialty: tpl.specialty,
      coords: dest.geometry.coordinates,
      straightDistKm: tpl.distKm,
      triageBeds: tpl.triageBeds
    };
  });
}

/**
 * Generates 4 autonomous AI Traffic Signal Agent nodes distributed along a calculated polyline
 */
function generateSignalNodes(routeLine, totalDistKm) {
  const percentages = [0.18, 0.45, 0.70, 0.90];
  const nodeNames = [
    "AI Agent Signal 01 [Outer Perimeter]",
    "AI Agent Signal 02 [Midway Corridor]",
    "AI Agent Signal 03 [Inner Arterial]",
    "AI Agent Signal 04 [Hospital Gateway]"
  ];

  return percentages.map((p, index) => {
    const pt = turf.along(routeLine, p * totalDistKm, { units: 'kilometers' });
    return {
      id: `signal_node_${index}`,
      name: nodeNames[index],
      coords: pt.geometry.coordinates,
      state: 'NORMAL_CYCLE', // 'NORMAL_CYCLE' | 'GREEN_WAVE_ACTIVE'
      distanceFromStart: p * totalDistKm,
      agentId: `AGENT_${101 + index}`
    };
  });
}

/**
 * Constructs an extruded 3D emergency rescue vehicle polygon geometry for starting coordinates
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

  return turf.featureCollection([chassis]);
}

export default function LiveRouteMap() {
  /* =====================================================================
   * PHASE 1: HIGH-PRECISION GPS INITIALIZATION STATE
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
  const [aiAnalysisText, setAiAnalysisText] = useState("Initializing neural diagnostic models...");

  /* =====================================================================
   * PHASE 3 & 4: SPEED CONTROLS, SIMULATION & V2X AGENT POPUP HUDS
   * ===================================================================== */
  const [simulationSpeed, setSimulationSpeed] = useState('medium'); // 'slow', 'medium', 'fast'
  const [isSimulating, setIsSimulating] = useState(false);
  const [animatedVehicle, setAnimatedVehicle] = useState(null);
  const [agentLogs, setAgentLogs] = useState([]);
  const [activeToast, setActiveToast] = useState(null);
  const [activePopups, setActivePopups] = useState({}); // { [nodeId]: { text, type: 'sender' | 'receiver', timestamp } }

  const mapRef = useRef(null);
  const animationFrameRef = useRef(null);
  const startTimestampRef = useRef(null);
  const triggerTrackerRef = useRef({});

  // Speed telemetry lookup table
  const speedConfig = useMemo(() => ({
    slow: { kmh: 40, label: 'Slow (40 km/h - City Crawl)', durationMs: 24000, color: 'text-amber-400' },
    medium: { kmh: 60, label: 'Medium (60 km/h - Standard Express)', durationMs: 16000, color: 'text-emerald-400' },
    fast: { kmh: 90, label: 'Fast (90 km/h - Emergency Overdrive)', durationMs: 10000, color: 'text-rose-400' }
  }), []);

  const currentSpeed = speedConfig[simulationSpeed];

  // Helper: Trigger Toast Notification
  const triggerToast = useCallback((msg, type = 'info') => {
    setActiveToast({ text: msg, type });
    const timer = setTimeout(() => setActiveToast(null), 4000);
    return () => clearTimeout(timer);
  }, []);

  // Helper: Append formatted terminal log
  const addLog = useCallback((logString) => {
    setAgentLogs(prev => [...prev.slice(-35), { time: new Date().toLocaleTimeString(), text: logString }]);
  }, []);

  // Reliable Map Centering Helper accessing underlying MapLibre GL instance
  const centerMap = useCallback((targetCoords) => {
    if (mapRef.current && targetCoords) {
      const rawMap = typeof mapRef.current.getMap === 'function' ? mapRef.current.getMap() : mapRef.current;
      if (rawMap && typeof rawMap.flyTo === 'function') {
        rawMap.flyTo({ center: targetCoords, zoom: 15.0, pitch: 54, bearing: -10, duration: 1400 });
      } else if (typeof mapRef.current.easeTo === 'function') {
        mapRef.current.easeTo({ center: targetCoords, zoom: 15.0, duration: 1400 });
      }
    }
  }, []);

  /* ---------------------------------------------------------------------
   * PHASE 1 EXECUTION: FETCH HIGH-PRECISION GPS OR IP BACKUP
   * --------------------------------------------------------------------- */
  const fetchLiveGPS = useCallback(() => {
    setGpsStatus('locating');
    triggerToast('Detecting high-precision satellite GPS coordinates...', 'info');

    const handleSuccessCoords = (coords, isLive = true, label = 'GPS Satellite') => {
      setGpsLocation(coords);
      setGpsStatus(isLive ? 'live' : 'fallback');
      const generated = generateNearbyHospitals(coords);
      setHospitals(generated);
      triggerToast(`Location Locked via ${label}: [${coords[0].toFixed(4)}° E, ${coords[1].toFixed(4)}° N]`, isLive ? 'success' : 'warning');
      addLog(`[LOG] 🛰️ [${label.toUpperCase()}_LOCK]: Ambulance starting origin calibrated at (${coords[0].toFixed(5)}, ${coords[1].toFixed(5)}).`);
      
      if (generated.length > 0) {
        handleSelectHospital(generated[0], coords);
      }
      centerMap(coords);
    };

    if (!navigator.geolocation) {
      handleSuccessCoords(BANGALORE_FALLBACK_COORD, false, 'Command Fallback');
      return;
    }

    // enableHighAccuracy=false responds immediately without timing out over desktop hardware GPS limitations
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        handleSuccessCoords([pos.coords.longitude, pos.coords.latitude], true, 'Satellite GPS');
      },
      async (err) => {
        console.warn('Browser GPS permission denied or timed out, running IP geolocation backup:', err.message);
        try {
          const res = await fetch('https://ipapi.co/json/');
          if (res.ok) {
            const data = await res.json();
            if (data.latitude && data.longitude) {
              handleSuccessCoords([data.longitude, data.latitude], true, 'Network IP GPS');
              return;
            }
          }
        } catch (ipErr) {
          console.warn('IP geolocation unreachable, utilizing Bangalore emergency baseline.');
        }
        handleSuccessCoords(BANGALORE_FALLBACK_COORD, false, 'Command Fallback');
      },
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 60000 }
    );
  }, [triggerToast, addLog, centerMap]);

  useEffect(() => {
    fetchLiveGPS();
  }, [fetchLiveGPS]);

  useEffect(() => {
    if (!isSimulating && gpsLocation) {
      centerMap(gpsLocation);
    }
  }, [gpsLocation, isSimulating, centerMap]);

  /* ---------------------------------------------------------------------
   * PHASE 2 EXECUTION: OSRM ROAD ROUTING & AI AGENT SIGNAL GENERATION
   * --------------------------------------------------------------------- */
  const handleSelectHospital = async (hospital, overrideOrigin = null) => {
    if (isSimulating) return;
    setSelectedHospital(hospital);
    setIsRouting(true);
    setActivePopups({}); // clear old popups
    const origin = overrideOrigin || gpsLocation;
    const dest = hospital.coords;

    try {
      const osrmUrl = `https://router.project-osrm.org/route/v1/driving/${origin[0]},${origin[1]};${dest[0]},${dest[1]}?geometries=geojson&overview=full`;
      const res = await fetch(osrmUrl);
      if (!res.ok) throw new Error(`OSRM HTTP ${res.status}`);
      const data = await res.json();

      if (data.routes && data.routes.length > 0) {
        const pathCoords = data.routes[0].geometry.coordinates;
        const distKm = data.routes[0].distance / 1000;
        
        setRouteCoords(pathCoords);
        setRouteDistanceKm(distKm);

        const line = turf.lineString(pathCoords);
        const nodes = generateSignalNodes(line, distKm);
        setSignalNodes(nodes);

        // Simulate intelligent Gemini / ChatGPT Neural Diagnostics on the selected route
        const aiMessage = `Gemini 2.5 Flash Evaluation: Route to ${hospital.name} requires traversing ${nodes.length} major intersections over ${distKm.toFixed(2)} km. ChatGPT V2X Engine has synchronized pre-emption cycles to open green corridors 15 seconds ahead of ambulance transit.`;
        setAiAnalysisText(aiMessage);
        addLog(`[LOG] 🧠 [GEMINI_NEURAL_ROUTING]: Optimized driving corridor mapped. Pre-loading ${nodes.length} Autonomous Signal Agents with Green Wave authority.`);
      }
    } catch (err) {
      console.warn("OSRM routing offline fallback:", err.message);
      const line = turf.lineString([origin, dest]);
      const distKm = turf.length(line, { units: 'kilometers' });
      const mid1 = turf.along(line, distKm * 0.33, { units: 'kilometers' }).geometry.coordinates;
      const mid2 = turf.along(line, distKm * 0.66, { units: 'kilometers' }).geometry.coordinates;
      const fallbackPath = [origin, mid1, mid2, dest];
      
      setRouteCoords(fallbackPath);
      setRouteDistanceKm(distKm);
      const nodes = generateSignalNodes(turf.lineString(fallbackPath), distKm);
      setSignalNodes(nodes);
      setAiAnalysisText(`ChatGPT V2X Backup Strategy: Offline spatial route established to ${hospital.name} (${distKm.toFixed(2)} km). ${nodes.length} signal junctions armed for autonomous overrides.`);
      addLog(`[LOG] 🧠 [CHATGPT_V2X_ENGINE]: Established high-reliability emergency route path (${distKm.toFixed(2)} km).`);
    } finally {
      setIsRouting(false);
      setAnimatedVehicle(null);
    }
  };

  const calculatedEtaMinutes = useMemo(() => {
    if (!routeDistanceKm) return 0;
    const hours = routeDistanceKm / currentSpeed.kmh;
    return Math.max(1, Math.round(hours * 60));
  }, [routeDistanceKm, currentSpeed.kmh]);

  const routeGeoJson = useMemo(() => {
    if (routeCoords.length < 2) return turf.featureCollection([]);
    return turf.featureCollection([turf.lineString(routeCoords)]);
  }, [routeCoords]);

  /* ---------------------------------------------------------------------
   * PHASE 4 EXECUTION: SMOOTH AMBULANCE SIMULATION & SIGNAL SPEECH BUBBLES
   * --------------------------------------------------------------------- */
  const startAmbulanceSimulation = () => {
    if (isSimulating || routeCoords.length < 2) return;
    setIsSimulating(true);
    setActivePopups({});
    startTimestampRef.current = null;
    triggerTrackerRef.current = {};

    // Reset all signal agent nodes to NORMAL_CYCLE (Red SVG)
    setSignalNodes(prev => prev.map(n => ({ ...n, state: 'NORMAL_CYCLE' })));

    triggerToast(`EMERGENCY DISPATCH LIVE! Ambulance departing at ${currentSpeed.kmh} km/h via ${simulationSpeed.toUpperCase()} mode.`, 'warning');
    addLog(`[LOG] 🚀 [DISPATCH_COMMAND]: ALPHA Priority Transport initiated at ${currentSpeed.kmh} km/h. V2X Autonomous Agents taking control.`);

    const line = turf.lineString(routeCoords);
    const durationMs = currentSpeed.durationMs;

    const animate = (timestamp) => {
      if (!startTimestampRef.current) startTimestampRef.current = timestamp;
      const elapsed = timestamp - startTimestampRef.current;
      const progress = Math.min(elapsed / durationMs, 1);
      const currentDistKm = progress * routeDistanceKm;

      const currentPt = turf.along(line, currentDistKm, { units: 'kilometers' });
      const coord = currentPt.geometry.coordinates;

      // Calculate smooth forward orientation bearing
      const nextDistKm = Math.min(currentDistKm + 0.005, routeDistanceKm);
      const nextPt = turf.along(line, nextDistKm, { units: 'kilometers' });
      let bearingDeg = 0;
      if (coord[0] !== nextPt.geometry.coordinates[0] || coord[1] !== nextPt.geometry.coordinates[1]) {
        bearingDeg = turf.bearing(turf.point(coord), turf.point(nextPt.geometry.coordinates));
      }

      setAnimatedVehicle({ lng: coord[0], lat: coord[1], bearing: bearingDeg });

      // Follow camera on ambulance smoothly without React state freezing
      if (mapRef.current && progress < 0.98) {
        const rawMap = typeof mapRef.current.getMap === 'function' ? mapRef.current.getMap() : mapRef.current;
        if (rawMap && typeof rawMap.jumpTo === 'function') {
          rawMap.jumpTo({ center: coord, zoom: 15.2 });
        }
      }

      // --- AUTONOMOUS SIGNAL AGENT PROXIMITY HANDOFF & POPUP BUBBLE TRIGGERS ---
      signalNodes.forEach((node, i) => {
        const nextNode = signalNodes[i + 1];
        const nextNodeName = nextNode ? nextNode.name : `${selectedHospital?.name} [Emergency Bay]`;
        const etaRemaining = Math.max(1, Math.round(((routeDistanceKm - node.distanceFromStart) / currentSpeed.kmh) * 60));

        // When ambulance nears signal threshold (~0.28 km before intersection)
        if (!triggerTrackerRef.current[node.id] && currentDistKm >= (node.distanceFromStart - 0.22)) {
          triggerTrackerRef.current[node.id] = true;

          // 1. Switch signal map indicator GREEN
          setSignalNodes(prev => prev.map((item, idx) => {
            if (idx === i) return { ...item, state: 'GREEN_WAVE_ACTIVE' };
            if (idx === i - 1) return { ...item, state: 'NORMAL_CYCLE' }; // return prior signal to red
            return item;
          }));

          // 2. TRIGGER DIRECT ON-MAP SPEECH BUBBLES FROM THE TRAFFIC SIGNAL ITSELF
          const senderMsg = `🚀 Reached my sector! Signal switched to GREEN. Alerting next agent: 'Clear your traffic immediately! ETA ~${etaRemaining}m'`;
          const receiverMsg = nextNode 
            ? `📡 Alert received from ${node.name}! Acknowledging Green Wave Protocol. Clearing cross-traffic now.` 
            : `🏥 Trauma Bay 1 Triage alerted! Emergency medical staff standing by at hospital doors.`;

          setActivePopups(prev => {
            const next = { ...prev };
            // Remove popup from previous downstream node
            if (i > 0) delete next[signalNodes[i - 1].id];
            
            // Set popup on current active signal
            next[node.id] = { text: senderMsg, type: 'sender', time: Date.now() };
            
            // Set acknowledgment popup on next signal in chain
            if (nextNode) {
              next[nextNode.id] = { text: receiverMsg, type: 'receiver', time: Date.now() };
            }
            return next;
          });

          // 3. Append detailed Gemini & ChatGPT AI Terminal logs
          if (nextNode) {
            addLog(`[LOG] 🤖 [GEMINI_AGENT_${node.agentId}]: Signal turned GREEN. Broadcasting V2X pre-emption command to ${nextNode.name} (ETA ~${etaRemaining} mins).`);
            setTimeout(() => {
              addLog(`[LOG] ⚡ [CHATGPT_V2X_${nextNode.agentId}]: Command Acknowledged! Initiating local traffic clearance sequence.`);
            }, 450);
          } else {
            addLog(`[LOG] 🤖 [GEMINI_AGENT_${node.agentId}]: Final intersection cleared! Handing off vehicle telemetry to ${selectedHospital?.name}.`);
            setTimeout(() => {
              addLog(`[LOG] 🏥 [TRAUMA_BAY_TRIAGE]: Acknowledged. Trauma surgical team prepared in Bay #1.`);
            }, 450);
          }

          triggerToast(`GREEN WAVE OVERRIDE: ${node.name} signal cleared!`, 'success');
        }
      });

      // --- ROUTE COMPLETION ---
      if (progress < 1) {
        animationFrameRef.current = requestAnimationFrame(animate);
      } else {
        setIsSimulating(false);
        setSignalNodes(prev => prev.map(n => ({ ...n, state: 'NORMAL_CYCLE' })));
        setAnimatedVehicle(null);
        setActivePopups({});
        addLog(`[LOG] ✅ [MISSION_COMPLETED]: Ambulance arrived safely at ${selectedHospital?.name}. Transit elapsed: ${calculatedEtaMinutes} mins via ${currentSpeed.kmh} km/h Green Wave.`);
        triggerToast(`🎉 Ambulance successfully arrived at ${selectedHospital?.name}!`, 'success');
      }
    };

    animationFrameRef.current = requestAnimationFrame(animate);
  };

  useEffect(() => {
    return () => {
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    };
  }, []);

  const handleMapLoad = useCallback((e) => {
    const map = e.target;
    if (!map.getSource('amb-3d-origin-model')) {
      map.addSource('amb-3d-origin-model', {
        type: 'geojson',
        data: createAmbulanceGeometry(gpsLocation, 0)
      });
      map.addLayer({
        id: 'amb-origin-chassis-3d',
        type: 'fill-extrusion',
        source: 'amb-3d-origin-model',
        filter: ['==', 'part', 'chassis'],
        paint: {
          'fill-extrusion-color': '#e11d48',
          'fill-extrusion-height': 5.0,
          'fill-extrusion-base': 0.2,
          'fill-extrusion-opacity': 0.9
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
            <span className="font-extrabold text-xs uppercase tracking-widest text-emerald-400">AI Neural Agent Alert</span>
            <span className="text-sm text-slate-200">{activeToast.text}</span>
          </div>
        </div>
      )}

      {/* ===================================================================
       * PHASE 1 & 4: MAP CANVAS (3D TELEMETRY WITH SIGNAL POPUPS & SVG ICONS)
       * =================================================================== */}
      <div className="bg-slate-900/90 p-4 rounded-2xl border border-slate-800 shadow-2xl flex flex-col shrink-0 backdrop-blur-lg">
        <div className="flex justify-between items-center mb-3 flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-rose-600 animate-ping"></span>
            <h3 className="font-black text-base tracking-wide text-white uppercase flex items-center gap-2">
              ResQ-Pulse 3D Telemetry & AI Green Wave Command
            </h3>
          </div>
          
          <div className="flex items-center gap-2">
            <button 
              onClick={() => {
                fetchLiveGPS();
                centerMap(gpsLocation);
              }} 
              disabled={isSimulating}
              className="px-3 py-1.5 bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-500 hover:to-teal-600 text-white text-xs font-black rounded-xl border border-emerald-400/40 shadow-lg flex items-center gap-1.5 active:scale-95 transition-all disabled:opacity-50"
            >
              <span className="material-symbols-outlined text-sm animate-pulse">my_location</span>
              <span>{gpsStatus === 'locating' ? 'Locating...' : 'Center on My Location'}</span>
            </button>
          </div>
        </div>

        {/* Explicit Fixed Height Container for Guaranteed Map Visibility */}
        <div className="w-full h-[420px] xl:h-[480px] rounded-xl overflow-hidden border border-slate-700/80 relative shadow-inner bg-slate-950">
          <MapGL
            ref={mapRef}
            initialViewState={{
              longitude: gpsLocation[0],
              latitude: gpsLocation[1],
              zoom: 15.0,
              pitch: 54,
              bearing: -10
            }}
            style={{ width: '100%', height: '100%' }}
            mapStyle={FREE_DARK_STYLE}
            onLoad={handleMapLoad}
          >
            {/* OSRM Driving Polyline Route Layer */}
            <Source id="osrm-route-layer" type="geojson" data={routeGeoJson}>
              <Layer
                id="osrm-route-glow"
                type="line"
                paint={{
                  'line-color': isSimulating ? '#22c55e' : '#e11d48',
                  'line-width': 12,
                  'line-opacity': 0.35,
                  'line-blur': 4
                }}
              />
              <Layer
                id="osrm-route-core"
                type="line"
                paint={{
                  'line-color': isSimulating ? '#4ade80' : '#f43f5e',
                  'line-width': 4.5,
                  'line-opacity': 0.95,
                  'line-dasharray': [2, 1.5]
                }}
              />
            </Source>

            {/* PHASE 1: User GPS Starting Anchor (Custom Ambulance Marker instead of blue dot) */}
            <Marker longitude={gpsLocation[0]} latitude={gpsLocation[1]} anchor="bottom">
              <div className="group relative flex flex-col items-center cursor-pointer hover:scale-105 transition-transform">
                <div className="px-2.5 py-0.5 bg-rose-600 text-white rounded-lg text-[10px] font-extrabold shadow-2xl mb-1 border border-white/40 animate-pulse uppercase tracking-wider whitespace-nowrap">
                  📍 Live GPS Origin
                </div>
                <div className="w-11 h-11 p-1 rounded-2xl bg-slate-900 border-2 border-rose-500 flex items-center justify-center shadow-[0_0_25px_#e11d48]">
                  <img src="/traffic-svg/ambulance_car.svg" alt="Origin Ambulance" className="w-8 h-8 object-contain" />
                </div>
              </div>
            </Marker>

            {/* PHASE 2 & 4: DYNAMIC TRAFFIC SIGNAL AI AGENT NODES WITH INTERACTIVE SPEECH BUBBLE POPUPS */}
            {signalNodes.map((node, idx) => {
              const popupData = activePopups[node.id];
              const isGreen = node.state === 'GREEN_WAVE_ACTIVE';
              return (
                <Marker key={node.id} longitude={node.coords[0]} latitude={node.coords[1]} anchor="bottom">
                  <div className="group relative flex flex-col items-center cursor-pointer">
                    
                    {/* CRITICAL FEATURE: DIRECT ON-MAP SPEECH BUBBLES POPPING FROM THE TRAFFIC SIGNAL ITSELF */}
                    {popupData && (
                      <div className={`mb-2.5 w-60 p-3 rounded-2xl shadow-2xl border text-left font-sans animate-bounce backdrop-blur-md relative z-50 ${
                        popupData.type === 'sender'
                          ? 'bg-slate-900/95 border-emerald-400 text-emerald-200 shadow-[0_0_30px_rgba(16,185,129,0.4)]'
                          : 'bg-slate-900/95 border-cyan-400 text-cyan-100 shadow-[0_0_30px_rgba(6,182,212,0.4)]'
                      }`}>
                        <div className="flex items-center justify-between gap-1.5 font-black pb-1 border-b border-white/15 mb-1.5 text-[10px] uppercase tracking-wider text-white">
                          <span className="flex items-center gap-1">
                            <span className="material-symbols-outlined text-xs">{popupData.type === 'sender' ? 'smart_toy' : 'podcasts'}</span>
                            {popupData.type === 'sender' ? '🤖 GEMINI AGENT OVERRIDE' : '📡 CHATGPT V2X RECEIVER'}
                          </span>
                          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
                        </div>
                        <p className="leading-tight text-xs font-bold text-slate-100">{popupData.text}</p>
                        {/* Downward pointing callout triangle attached directly to signal */}
                        <div className={`absolute -bottom-2.5 left-1/2 -translate-x-1/2 w-4 h-4 rotate-45 border-r border-b bg-slate-900 ${
                          popupData.type === 'sender' ? 'border-emerald-400' : 'border-cyan-400'
                        }`}></div>
                      </div>
                    )}

                    {/* SVG TRAFFIC SIGNAL MARKER ICON (Incorporating Localhost:8000 prototype assets) */}
                    <div className={`p-1.5 bg-slate-950 rounded-2xl border ${
                      isGreen ? 'border-emerald-400 shadow-[0_0_25px_#10b981] scale-110' : 'border-slate-700 shadow-xl'
                    } transition-all duration-300`}>
                      <img 
                        src={isGreen ? '/traffic-svg/green_signal.svg' : '/traffic-svg/red_signalIcon.svg'} 
                        alt="AI Traffic Signal Agent"
                        className="w-7 h-9 object-contain drop-shadow-md"
                      />
                    </div>
                    <span className={`mt-1 px-2.5 py-0.5 rounded-full text-[9px] font-black text-white shadow-xl whitespace-nowrap border ${
                      isGreen ? 'bg-emerald-700 border-emerald-300 animate-pulse ring-2 ring-emerald-500' : 'bg-slate-900 border-slate-700 text-slate-300'
                    }`}>
                      {isGreen ? `🟢 ${node.name} [GREEN CLEARED]` : `🔴 ${node.name}`}
                    </span>
                  </div>
                </Marker>
              );
            })}

            {/* Selected Hospital Target Marker */}
            {selectedHospital && (
              <Marker longitude={selectedHospital.coords[0]} latitude={selectedHospital.coords[1]} anchor="bottom">
                <div className="flex flex-col items-center cursor-pointer hover:scale-110 transition-transform">
                  <div className="px-3 py-1 bg-emerald-700 text-white rounded-xl text-xs font-black shadow-2xl mb-1.5 whitespace-nowrap border border-emerald-300 animate-pulse flex items-center gap-1.5">
                    <span>🏥 {selectedHospital.name}</span>
                    <span className="px-1.5 py-0.2 bg-emerald-950 rounded text-[10px] text-emerald-300 border border-emerald-500">{selectedHospital.triageBeds}</span>
                  </div>
                  <div className="w-11 h-11 rounded-2xl bg-slate-900 border-2 border-emerald-400 flex items-center justify-center text-2xl shadow-[0_0_25px_#10b981]">
                    🏥
                  </div>
                </div>
              </Marker>
            )}

            {/* PHASE 4: Animated Moving Emergency Vehicle Telemetry Overlay */}
            {animatedVehicle && (
              <Marker longitude={animatedVehicle.lng} latitude={animatedVehicle.lat} anchor="center">
                <div className="pointer-events-none flex flex-col items-center">
                  <div className="translate-y-[-36px] px-3.5 py-1 rounded-full bg-gradient-to-r from-rose-600 via-red-600 to-amber-500 text-white font-black text-[10px] uppercase tracking-widest shadow-2xl border border-white flex items-center gap-1.5 animate-pulse whitespace-nowrap">
                    <span className="w-2 h-2 rounded-full bg-white animate-ping"></span>
                    <span>🚑 RESQ-PULSE ACTIVE ({currentSpeed.kmh} KM/H GREEN WAVE)</span>
                  </div>
                  <div 
                    className="w-12 h-12 p-1.5 rounded-full bg-slate-900/90 border-2 border-rose-500 flex items-center justify-center shadow-[0_0_30px_#f43f5e] transition-transform duration-75"
                    style={{ transform: `rotate(${animatedVehicle.bearing}deg)` }}
                  >
                    <img src="/traffic-svg/ambulance_car.svg" alt="Moving Telemetry Ambulance" className="w-full h-full object-contain drop-shadow-lg" />
                  </div>
                </div>
              </Marker>
            )}
          </MapGL>

          {/* Top-left GPS Coordinate Telemetry HUD */}
          <div className="absolute top-3 left-3 px-3.5 py-2 bg-slate-950/90 backdrop-blur-md rounded-xl border border-slate-800 shadow-xl pointer-events-none flex items-center gap-3 z-10">
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

          {/* Top-right Floating Interactive Recenter Button */}
          <div className="absolute top-3 right-3 z-10">
            <button
              onClick={() => centerMap(gpsLocation)}
              disabled={isSimulating || !gpsLocation}
              title="Jump directly to current GPS coordinates"
              className="p-3 bg-slate-900/90 hover:bg-slate-800 text-emerald-400 hover:text-emerald-300 rounded-2xl border border-slate-700 shadow-2xl flex items-center justify-center active:scale-90 transition-all backdrop-blur-md group"
            >
              <span className="material-symbols-outlined text-2xl group-hover:animate-spin">my_location</span>
            </button>
          </div>
        </div>
      </div>

      {/* ===================================================================
       * AI NEURAL ENGINE BANNER (GEMINI 2.5 & CHATGPT V2X EVALUATION)
       * =================================================================== */}
      <div className="bg-gradient-to-r from-slate-900 via-emerald-950/40 to-slate-900 p-3.5 rounded-2xl border border-emerald-500/30 shadow-lg flex items-center gap-3.5 backdrop-blur-md">
        <div className="p-2 bg-emerald-950/80 rounded-xl border border-emerald-600/50 shrink-0 shadow-[0_0_15px_rgba(16,185,129,0.3)]">
          <span className="material-symbols-outlined text-2xl text-emerald-400 animate-pulse">psychology</span>
        </div>
        <div className="flex-1">
          <div className="flex items-center justify-between mb-0.5">
            <span className="text-xs font-black uppercase tracking-wider text-emerald-400">
              Gemini & ChatGPT AI Autonomous Routing Neural Engine
            </span>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-900 border border-slate-700 text-slate-300">
              V2X PROTOCOL ACTIVE
            </span>
          </div>
          <p className="text-xs text-slate-200 font-medium leading-relaxed italic">
            "{aiAnalysisText}"
          </p>
        </div>
      </div>

      {/* ===================================================================
       * PHASE 2: DYNAMIC HOSPITAL DISCOVERY & UI SIDEBAR PANEL
       * =================================================================== */}
      <div className="bg-slate-900/90 p-4 rounded-2xl border border-slate-800 shadow-2xl flex flex-col shrink-0 backdrop-blur-md">
        <h3 className="font-black text-sm text-rose-500 mb-3 flex items-center justify-between uppercase tracking-wider">
          <span className="flex items-center gap-2">
            <span className="material-symbols-outlined text-lg">local_hospital</span>
            Nearby Emergency Trauma Centers (Shortest Path Selection)
          </span>
          {isRouting && <span className="text-xs text-amber-400 font-mono animate-pulse">Calculating OSRM Shortest Route...</span>}
        </h3>

        <div className="space-y-2 max-h-52 overflow-y-auto custom-scrollbar pr-1">
          {hospitals.map((hosp) => {
            const isSelected = selectedHospital && selectedHospital.id === hosp.id;
            return (
              <div
                key={hosp.id}
                onClick={() => handleSelectHospital(hosp)}
                className={`p-3.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
                  isSelected
                    ? 'bg-gradient-to-r from-slate-900 via-rose-950/40 to-slate-900 border-rose-500 shadow-lg ring-1 ring-rose-500'
                    : 'bg-slate-950/80 hover:bg-slate-800 border-slate-800/80'
                } ${isSimulating ? 'pointer-events-none opacity-60' : ''}`}
              >
                <div className="flex items-center gap-3.5">
                  <span className="text-2xl p-2.5 bg-slate-900 rounded-xl border border-slate-800 shadow-inner">{hosp.icon}</span>
                  <div>
                    <p className={`font-black text-sm ${isSelected ? 'text-rose-400' : 'text-slate-100'}`}>{hosp.name}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs text-slate-400 font-medium">{hosp.specialty}</span>
                      <span className="px-2 py-0.2 rounded-full bg-emerald-950/80 border border-emerald-700/60 text-[10px] font-mono font-bold text-emerald-400">
                        {hosp.triageBeds}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <span className="px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-700 text-xs font-mono font-black text-emerald-400 whitespace-nowrap shadow">
                    {hosp.straightDistKm} KM
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ===================================================================
       * PHASE 3: ROUTE STATS, SPEED SELECTOR & DISPATCH COMMAND HUB
       * =================================================================== */}
      <div className="bg-slate-900/90 p-4 rounded-2xl border border-slate-800 shadow-2xl flex flex-col shrink-0 backdrop-blur-md">
        <h3 className="font-black text-xs text-slate-400 mb-3 uppercase tracking-widest flex items-center justify-between">
          <span className="flex items-center gap-1.5">
            <span className="material-symbols-outlined text-sm">analytics</span>
            Route Telemetry & Emergency Speed Selection
          </span>
          <span className={`text-xs font-bold font-mono ${currentSpeed.color}`}>
            Active Velocity: {currentSpeed.label}
          </span>
        </h3>

        {/* Speed Selector Tabs */}
        <div className="grid grid-cols-3 gap-2 p-1 bg-slate-950 rounded-xl border border-slate-800 mb-4">
          {Object.entries(speedConfig).map(([key, config]) => (
            <button
              key={key}
              onClick={() => setSimulationSpeed(key)}
              disabled={isSimulating}
              className={`py-2 px-3 rounded-lg font-black text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 ${
                simulationSpeed === key
                  ? 'bg-gradient-to-r from-slate-800 to-slate-700 text-white border border-slate-500 shadow-lg scale-[1.02]'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/50'
              } disabled:opacity-50`}
            >
              <span className="material-symbols-outlined text-sm">
                {key === 'fast' ? 'rocket_launch' : key === 'medium' ? 'directions_car' : 'time_to_leave'}
              </span>
              <span>{key === 'fast' ? '⚡ FAST (90 km/h)' : key === 'medium' ? '🚓 MED (60 km/h)' : '🐢 SLOW (40 km/h)'}</span>
            </button>
          ))}
        </div>

        {/* 4-Metric Pre-Computation Grid */}
        <div className="grid grid-cols-4 gap-2.5 mb-4">
          <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 text-center shadow-inner">
            <p className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider">Shortest Distance</p>
            <p className="text-base font-black text-rose-500 font-mono mt-0.5">{routeDistanceKm ? `${routeDistanceKm.toFixed(2)} KM` : '--'}</p>
          </div>
          <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 text-center shadow-inner">
            <p className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider">Target Velocity</p>
            <p className={`text-base font-black font-mono mt-0.5 ${currentSpeed.color}`}>{currentSpeed.kmh} KM/H</p>
          </div>
          <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 text-center shadow-inner">
            <p className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider">Green Wave ETA</p>
            <p className="text-base font-black text-amber-400 font-mono mt-0.5">{calculatedEtaMinutes} MINS</p>
          </div>
          <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 text-center shadow-inner">
            <p className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider">Autonomous AI Signals</p>
            <p className="text-base font-black text-cyan-400 font-mono mt-0.5">{signalNodes.length} JUNCTIONS</p>
          </div>
        </div>

        {/* Prominent START DISPATCH Button */}
        <button
          onClick={startAmbulanceSimulation}
          disabled={isSimulating || routeCoords.length < 2}
          className="w-full py-4 px-6 bg-gradient-to-r from-rose-600 via-red-600 to-amber-600 hover:from-rose-500 hover:to-amber-500 text-white rounded-xl font-black text-sm tracking-wide shadow-[0_0_35px_rgba(225,29,72,0.4)] active:scale-[0.98] transition-all flex items-center justify-center gap-3 border border-white/20 disabled:opacity-50 disabled:pointer-events-none uppercase"
        >
          <span className="material-symbols-outlined text-2xl animate-bounce">rocket_launch</span>
          <span>
            {isSimulating ? `🚀 AMBULANCE EN ROUTE (${currentSpeed.kmh} KM/H GREEN WAVE)...` : `⚡ START AMBULANCE (ACTIVATE AI GREEN WAVE - ${currentSpeed.kmh} KM/H)`}
          </span>
        </button>
      </div>

      {/* ===================================================================
       * PHASE 4: AI AGENT COMMUNICATION LOG TERMINAL
       * =================================================================== */}
      <div className="bg-slate-950 rounded-2xl border border-slate-800 shadow-2xl flex flex-col overflow-hidden flex-1 min-h-[240px]">
        <div className="p-3.5 border-b border-slate-800 flex justify-between items-center bg-slate-900 text-white">
          <div className="flex items-center gap-2.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping"></span>
            <span className="material-symbols-outlined text-emerald-400 text-lg">terminal</span>
            <h3 className="font-mono font-bold text-xs tracking-wider uppercase text-slate-200">
              V2X Agent Terminal: Gemini & ChatGPT Handoff Feed
            </h3>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono text-cyan-300 font-extrabold bg-cyan-950/60 px-2.5 py-0.5 rounded border border-cyan-700/50">
              GEMINI 2.5 FLASH
            </span>
            <span className="text-[10px] font-mono text-emerald-300 font-extrabold bg-emerald-950/60 px-2.5 py-0.5 rounded border border-emerald-700/50">
              CHATGPT V2X ENGINE
            </span>
          </div>
        </div>

        {/* Scrolling Log Display */}
        <div className="flex-1 p-4 bg-slate-950 text-slate-200 font-mono text-xs space-y-2.5 overflow-y-auto custom-scrollbar max-h-72">
          {agentLogs.length === 0 ? (
            <div className="text-slate-500 italic text-center py-8 font-sans">
              No inter-agent communication transmitting. Select an emergency trauma center and click START AMBULANCE...
            </div>
          ) : (
            agentLogs.map((item, index) => (
              <div 
                key={index} 
                className={`p-2.5 rounded-xl border-l-4 leading-relaxed transition-all ${
                  item.text.includes('GEMINI') 
                    ? 'border-cyan-500 bg-slate-900/80 text-cyan-200 shadow' 
                    : item.text.includes('CHATGPT')
                    ? 'border-emerald-500 bg-emerald-950/40 text-emerald-200 shadow'
                    : item.text.includes('🚀') || item.text.includes('🛰️')
                    ? 'border-rose-500 bg-slate-900/50 text-slate-200 font-bold'
                    : 'border-slate-600 bg-slate-900/30 text-slate-300'
                }`}
              >
                <span className="text-[10px] text-slate-500 font-extrabold mr-2">[{item.time}]</span>
                <span className="font-mono">{item.text}</span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
