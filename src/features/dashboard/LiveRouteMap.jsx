import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import MapGL, { Source, Layer, Marker } from 'react-map-gl/maplibre';
import * as turf from '@turf/turf';
import 'mapbox-gl/dist/mapbox-gl.css';
import 'maplibre-gl/dist/maplibre-gl.css';

/* =====================================================================
 * MULTI-REGION TELEMETRY DATASET (Karnataka Focus: Bangalore & Belagavi)
 * ===================================================================== */
const REGION_DATASET = {
  bangalore: {
    id: 'bangalore',
    name: 'Bangalore (HSR & Silk Board Corridor)',
    center: [77.6229, 12.9172],
    zoom: 13.5,
    pickupName: 'Sector 4, HSR Layout GPS Lock',
    pickupCoords: [77.6229, 12.9172],
    hospitals: [
      { id: 'st_johns', name: "St. John's Medical Center", type: 'Trauma Level 1', coords: [77.6190, 12.9304] },
      { id: 'apollo_jay', name: 'Apollo Hospitals - Jayanagar', type: 'Cardiac Emergency', coords: [77.5912, 12.9214] },
      { id: 'manipal_oar', name: 'Manipal Hospital - Old Airport Rd', type: 'Multi-Specialty', coords: [77.6482, 12.9582] }
    ],
    agentNodes: [
      { id: 'hsr_agent', name: 'HSR Layout AI Agent', sector: 'HSR Corridor Gateway', coords: [77.6228, 12.9175], state: 'NORMAL_CYCLE' },
      { id: 'silk_agent', name: 'Silk Board AI Agent', sector: 'Central Junction Hub', coords: [77.6215, 12.9210], state: 'NORMAL_CYCLE' },
      { id: 'jpn_agent', name: 'JP Nagar AI Agent', sector: 'Inner Ring Intersection', coords: [77.6200, 12.9260], state: 'NORMAL_CYCLE' }
    ]
  },
  belagavi: {
    id: 'belagavi',
    name: 'Belagavi (Tilakwadi & Congress Rd Corridor)',
    center: [74.4977, 15.8497],
    zoom: 13.5,
    pickupName: 'Tilakwadi First Circle GPS Lock',
    pickupCoords: [74.4977, 15.8497],
    hospitals: [
      { id: 'kle_kore', name: 'KLES Dr. Prabhakar Kore Hospital', type: 'Trauma Level 1', coords: [74.5204, 15.8710] },
      { id: 'lakeview', name: 'Lakeview Goaves Hospital', type: 'Cardiac Emergency', coords: [74.5050, 15.8550] },
      { id: 'civil_hosp', name: 'District Government Hospital', type: 'General Emergency', coords: [74.5120, 15.8620] }
    ],
    agentNodes: [
      { id: 'rpd_agent', name: 'RPD College AI Agent', sector: 'Tilakwadi Gateway', coords: [74.4977, 15.8497], state: 'NORMAL_CYCLE' },
      { id: 'congress_agent', name: 'Congress Road AI Agent', sector: 'Central Spine Hub', coords: [74.5005, 15.8520], state: 'NORMAL_CYCLE' },
      { id: 'chennamma_agent', name: 'Chennamma Circle AI Agent', sector: 'Major Interchange', coords: [74.5080, 15.8570], state: 'NORMAL_CYCLE' }
    ]
  }
};

/**
 * Constructs an extruded 3D emergency vehicle geometry for custom layer rendering
 */
function createAmbulanceGeometry(coord, bearingDeg = 0) {
  const centerPoint = turf.point(coord);
  const lengthKm = 0.025; // ~25m scale for prominent surveillance presence
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
   * STATE & REGION MANAGEMENT
   * ===================================================================== */
  const [activeRegionId, setActiveRegionId] = useState('bangalore');
  const activeRegion = useMemo(() => REGION_DATASET[activeRegionId], [activeRegionId]);

  const [pickupCoord, setPickupCoord] = useState(activeRegion.pickupCoords);
  const [selectedHospital, setSelectedHospital] = useState(activeRegion.hospitals[0]);
  const [agentNodes, setAgentNodes] = useState(activeRegion.agentNodes);
  
  const [isLocating, setIsLocating] = useState(false);
  const [isSimulating, setIsSimulating] = useState(false);
  const [animatedVehicle, setAnimatedVehicle] = useState(null);
  
  // HUD Messaging & Log Terminals
  const [logs, setLogs] = useState([]);
  const [activeToast, setActiveToast] = useState(null);
  const [chatInput, setChatInput] = useState('');

  const mapRef = useRef(null);
  const animationFrameRef = useRef(null);
  const startTimestampRef = useRef(null);

  // Sync state whenever active region transitions
  useEffect(() => {
    setPickupCoord(activeRegion.pickupCoords);
    setSelectedHospital(activeRegion.hospitals[0]);
    setAgentNodes(activeRegion.agentNodes);
    setAnimatedVehicle(null);
    if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    setIsSimulating(false);
    
    // Jump map view smoothly to newly selected region
    if (mapRef.current) {
      const map = mapRef.current.getMap();
      if (map && typeof map.jumpTo === 'function') {
        map.jumpTo({
          center: activeRegion.center,
          zoom: activeRegion.zoom,
          pitch: 52,
          bearing: -12
        });
      }
    }

    const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    setLogs([
      { time: timestamp, sender: 'System AI', text: `Regional network focused on ${activeRegion.name}. All autonomous traffic signal agents initialized.`, type: 'in' }
    ]);
  }, [activeRegion]);

  // Toast notifier
  const triggerToast = useCallback((msg, type = 'info') => {
    setActiveToast({ text: msg, type });
    const timer = setTimeout(() => setActiveToast(null), 4000);
    return () => clearTimeout(timer);
  }, []);

  // Logger helper
  const addLog = useCallback((sender, text) => {
    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    setLogs(prev => [...prev.slice(-49), { time, sender, text, type: 'in' }]);
  }, []);

  // Simulate auto-detecting emergency pickup via satellite/GPS lock
  const handleAutoDetectGPS = () => {
    setIsLocating(true);
    addLog('Satellite GPS', 'Triangulating mobile emergency rescue vehicle telemetry...');
    setTimeout(() => {
      setIsLocating(false);
      // Small offset simulation for pinpoint accuracy
      const newCoord = [
        activeRegion.center[0] - 0.0012 + Math.random() * 0.0024,
        activeRegion.center[1] - 0.0012 + Math.random() * 0.0024
      ];
      setPickupCoord(newCoord);
      triggerToast('GPS Lock Acquired: Vehicle coordinate calibrated.', 'success');
      addLog('Satellite GPS', `Precise coordinate fix confirmed at [${newCoord[0].toFixed(4)}° E, ${newCoord[1].toFixed(4)}° N].`);
      if (mapRef.current) {
        mapRef.current.easeTo({ center: newCoord, zoom: 15.2, duration: 1200 });
      }
    }, 900);
  };

  // Generate dynamic shortest-path route coordinate sequence
  const routeCoords = useMemo(() => {
    const points = [pickupCoord];
    agentNodes.forEach(node => points.push(node.coords));
    points.push(selectedHospital.coords);
    return points;
  }, [pickupCoord, agentNodes, selectedHospital]);

  const routeGeoJson = useMemo(() => {
    return turf.featureCollection([turf.lineString(routeCoords)]);
  }, [routeCoords]);

  const routeDistanceKm = useMemo(() => {
    return turf.length(turf.lineString(routeCoords), { units: 'kilometers' });
  }, [routeCoords]);

  /* =====================================================================
   * INTERCONNECTED AREA AI AGENTS: GREEN WAVE SIMULATION LOOP
   * ===================================================================== */
  const startGreenWaveSimulation = () => {
    if (isSimulating || routeCoords.length < 2) return;
    setIsSimulating(true);
    startTimestampRef.current = null;

    // Reset signal agents to normal red cycle
    setAgentNodes(activeRegion.agentNodes.map(n => ({ ...n, state: 'NORMAL_CYCLE' })));

    addLog('AI Dispatch Command', `Initiating ALPHA Priority transport to ${selectedHospital.name}. Broadcasting override token to Area Agents.`);
    triggerToast(`Emergency Dispatch Activated! Handoff loop started toward ${selectedHospital.name}.`, 'warning');

    const line = turf.lineString(routeCoords);
    const durationMs = 14000; // 14-second hackathon demonstration transit

    // Track state hand-offs so alarms fire precisely once per sector
    const handoffTrack = { node0: false, node1: false, node2: false };

    const animate = (timestamp) => {
      if (!startTimestampRef.current) startTimestampRef.current = timestamp;
      const elapsed = timestamp - startTimestampRef.current;
      const progress = Math.min(elapsed / durationMs, 1);
      const dist = progress * routeDistanceKm;

      const ptFeature = turf.along(line, dist, { units: 'kilometers' });
      const currentCoord = ptFeature.geometry.coordinates;

      // Calculate bearing orientation by scanning slightly ahead
      const nextDist = Math.min(dist + 0.005, routeDistanceKm);
      const nextCoord = turf.along(line, nextDist, { units: 'kilometers' }).geometry.coordinates;
      let bearingDeg = 0;
      if (currentCoord[0] !== nextCoord[0] || currentCoord[1] !== nextCoord[1]) {
        bearingDeg = turf.bearing(turf.point(currentCoord), turf.point(nextCoord));
      }

      setAnimatedVehicle({ lng: currentCoord[0], lat: currentCoord[1], bearing: bearingDeg });

      // Directly update Mapbox WebGL 3D custom layer source
      if (mapRef.current) {
        const rawMap = mapRef.current.getMap();
        if (rawMap && progress < 0.98) {
          // Keep vehicle gracefully centered during transit
          rawMap.jumpTo({ center: currentCoord, zoom: 15 });
          const source = rawMap.getSource('amb-3d-geometry');
          if (source && typeof source.setData === 'function') {
            source.setData(createAmbulanceGeometry(currentCoord, bearingDeg));
          }
        }
      }

      // --- AGENT 1 PRE-EMPTION (e.g., HSR Layout / RPD College) ---
      if (progress > 0.05 && progress < 0.28 && !handoffTrack.node0) {
        handoffTrack.node0 = true;
        setAgentNodes(prev => prev.map((node, i) => i === 0 ? { ...node, state: 'GREEN_WAVE_ACTIVE' } : node));
        addLog(`[${activeRegion.agentNodes[0].name}]`, `🚨 Ambulance entering sector! Normal cycles overridden. Pre-empting lights to GREEN!`);
        triggerToast(`${activeRegion.agentNodes[0].name}: GREEN WAVE ACTIVE!`, 'success');
      }

      // --- AGENT 1 HANDOFF ➜ AGENT 2 (e.g., Silk Board / Congress Rd) ---
      if (progress >= 0.28 && progress < 0.60 && !handoffTrack.node1) {
        handoffTrack.node1 = true;
        setAgentNodes(prev => prev.map((node, i) => 
          i === 0 ? { ...node, state: 'NORMAL_CYCLE' } : i === 1 ? { ...node, state: 'GREEN_WAVE_ACTIVE' } : node
        ));
        addLog(`[${activeRegion.agentNodes[0].name}] ➜ [${activeRegion.agentNodes[1].name}]`, `Protocol Handoff: "Ambulance cleared my sector. Approaching your junction, clear the signal!"`);
        addLog(`[${activeRegion.agentNodes[1].name}]`, `Sensing oncoming telemetry. Overriding local signal cycle to GREEN before arrival!`);
        triggerToast(`Handoff Successful: ${activeRegion.agentNodes[1].name} Cleared!`, 'success');
      }

      // --- AGENT 2 HANDOFF ➜ AGENT 3 (e.g., JP Nagar / Chennamma Circle) ---
      if (progress >= 0.60 && progress < 0.88 && !handoffTrack.node2 && activeRegion.agentNodes[2]) {
        handoffTrack.node2 = true;
        setAgentNodes(prev => prev.map((node, i) => 
          i === 1 ? { ...node, state: 'NORMAL_CYCLE' } : i === 2 ? { ...node, state: 'GREEN_WAVE_ACTIVE' } : node
        ));
        addLog(`[${activeRegion.agentNodes[1].name}] ➜ [${activeRegion.agentNodes[2].name}]`, `Protocol Handoff: "Ambulance entering terminal corridor. Override junction!"`);
        addLog(`[${activeRegion.agentNodes[2].name}]`, `Signal pre-emption engaged! Final green corridor open to trauma emergency bay.`);
        triggerToast(`Final Sector: ${activeRegion.agentNodes[2].name} Cleared!`, 'success');
      }

      // --- ARRIVAL AT TRAUMA CENTER ---
      if (progress < 1) {
        animationFrameRef.current = requestAnimationFrame(animate);
      } else {
        setIsSimulating(false);
        setAgentNodes(activeRegion.agentNodes);
        setAnimatedVehicle(null);
        addLog('Trauma Bay Receiver', `✅ Ambulance arrived at ${selectedHospital.name}. Patient handoff in progress. Signal network returning to NORMAL_CYCLE.`);
        triggerToast(`Vehicle arrived safely at ${selectedHospital.name}!`, 'success');
      }
    };

    animationFrameRef.current = requestAnimationFrame(animate);
  };

  useEffect(() => {
    return () => {
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    };
  }, []);

  // Map Load event: mount 3D extruded geometry layers
  const handleMapLoad = useCallback((e) => {
    const map = e.target;
    if (!map.getSource('amb-3d-geometry')) {
      map.addSource('amb-3d-geometry', {
        type: 'geojson',
        data: createAmbulanceGeometry(pickupCoord, 0)
      });

      map.addLayer({
        id: 'amb-chassis-extrusion',
        type: 'fill-extrusion',
        source: 'amb-3d-geometry',
        filter: ['==', 'part', 'chassis'],
        paint: {
          'fill-extrusion-color': ['get', 'color'],
          'fill-extrusion-height': 4.5,
          'fill-extrusion-base': 0.2,
          'fill-extrusion-opacity': 0.95
        }
      });

      map.addLayer({
        id: 'amb-beacon-extrusion',
        type: 'fill-extrusion',
        source: 'amb-3d-geometry',
        filter: ['==', 'part', 'beacon'],
        paint: {
          'fill-extrusion-color': ['get', 'color'],
          'fill-extrusion-height': 5.8,
          'fill-extrusion-base': 4.5,
          'fill-extrusion-opacity': 1
        }
      });
    }
  }, [pickupCoord]);

  const handleSendChat = (e) => {
    e.preventDefault();
    if (!chatInput.trim()) return;
    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    setLogs(prev => [...prev, { time, sender: 'Operator You', text: chatInput, type: 'out' }]);
    const query = chatInput;
    setChatInput('');
    
    setTimeout(() => {
      addLog('AI Dispatch Assistant', `Query acknowledged ("${query}"). Automated emergency priority route optimized for ${selectedHospital.name} (${routeDistanceKm.toFixed(1)} km).`);
    }, 600);
  };

  return (
    <div className="col-span-4 flex flex-col gap-gutter h-full pb-4 text-on-surface">
      {/* Toast Notification Popup HUD */}
      {activeToast && (
        <div className="fixed top-20 right-8 z-[10000] max-w-sm px-4 py-3 rounded-xl shadow-2xl border border-white/20 backdrop-blur-md font-label-md text-white animate-bounce flex items-center gap-3 bg-slate-900/90 ring-2 ring-emerald-500">
          <span className="material-symbols-outlined text-2xl animate-pulse text-emerald-400">
            {activeToast.type === 'success' ? 'verified' : 'bolt'}
          </span>
          <div className="flex flex-col">
            <span className="font-bold text-xs uppercase tracking-wider text-slate-300">Live Agent Alert</span>
            <span className="text-sm font-medium">{activeToast.text}</span>
          </div>
        </div>
      )}

      {/* SECTION 1: Region Select & 3D Interactive Telemetry Map */}
      <div className="bg-surface-container-lowest p-md rounded-2xl border border-outline-variant shadow-lg shrink-0">
        <div className="flex flex-col gap-sm mb-md">
          <div className="flex justify-between items-center">
            <h3 className="font-headline-sm text-headline-sm text-primary flex items-center gap-xs">
              <span className="material-symbols-outlined text-rose-500 animate-pulse">radar</span>
              3D Telemetry (ResQ-Pulse)
            </h3>
            <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wider uppercase text-white shadow-md ${
              isSimulating ? 'bg-rose-600 animate-pulse' : 'bg-emerald-700'
            }`}>
              {isSimulating ? '🟢 GREEN WAVE ACTIVE' : '⚡ AI READY'}
            </span>
          </div>

          {/* Region Switch Pills */}
          <div className="grid grid-cols-2 gap-2 p-1 bg-surface-container-low rounded-xl border border-outline-variant/60">
            {Object.values(REGION_DATASET).map(reg => (
              <button
                key={reg.id}
                onClick={() => setActiveRegionId(reg.id)}
                disabled={isSimulating}
                className={`py-1.5 px-3 rounded-lg text-xs font-bold transition-all duration-300 flex items-center justify-center gap-1.5 ${
                  activeRegionId === reg.id
                    ? 'bg-gradient-to-r from-rose-600 to-amber-600 text-white shadow-md scale-[1.02]'
                    : 'text-on-surface-variant hover:bg-surface-container hover:text-on-surface'
                } disabled:opacity-50`}
              >
                <span className="material-symbols-outlined text-sm">location_on</span>
                {reg.id === 'bangalore' ? 'Bangalore Region' : 'Belagavi Region'}
              </button>
            ))}
          </div>
        </div>
        
        {/* Designated Map Container with Explicit Height to Prevent Blank White Render */}
        <div className="w-full h-[380px] xl:h-[420px] rounded-2xl overflow-hidden border border-outline-variant/60 relative shadow-inner bg-slate-950">
          <MapGL
            ref={mapRef}
            initialViewState={{
              longitude: activeRegion.center[0],
              latitude: activeRegion.center[1],
              zoom: activeRegion.zoom,
              pitch: 54, // Rich 54° 3D perspective angle
              bearing: -12
            }}
            style={{ width: '100%', height: '100%' }}
            mapStyle="https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json"
            onLoad={handleMapLoad}
          >
            {/* Route Polyline Visual Layer */}
            <Source id="route-path-source" type="geojson" data={routeGeoJson}>
              <Layer
                id="route-glow-outer"
                type="line"
                paint={{
                  'line-color': isSimulating ? '#22c55e' : '#e11d48',
                  'line-width': 10,
                  'line-opacity': 0.35,
                  'line-blur': 4
                }}
              />
              <Layer
                id="route-line-inner"
                type="line"
                paint={{
                  'line-color': isSimulating ? '#4ade80' : '#f43f5e',
                  'line-width': 3.5,
                  'line-opacity': 0.95,
                  'line-dasharray': [2, 1.5]
                }}
              />
            </Source>

            {/* Autonomous Area AI Agent Markers */}
            {agentNodes.map((node, idx) => (
              <Marker key={node.id} longitude={node.coords[0]} latitude={node.coords[1]} anchor="bottom">
                <div className="group relative flex flex-col items-center cursor-pointer transition-transform hover:scale-110">
                  <div className={`px-2 py-0.5 rounded text-[9px] font-bold text-white shadow-lg mb-1 whitespace-nowrap border ${
                    node.state === 'GREEN_WAVE_ACTIVE'
                      ? 'bg-emerald-600 border-emerald-300 animate-pulse ring-4 ring-emerald-500/40'
                      : 'bg-slate-900 border-slate-700'
                  }`}>
                    {node.state === 'GREEN_WAVE_ACTIVE' ? `🟢 ${node.name} (CLEARED)` : `🔴 Node 0${idx + 1}: Normal`}
                  </div>
                  <div className="p-1 bg-slate-950 rounded-full border border-slate-700 shadow-2xl flex flex-col gap-0.5 items-center">
                    <span className={`w-2.5 h-2.5 rounded-full ${node.state === 'NORMAL_CYCLE' ? 'bg-red-500 shadow-[0_0_8px_#ef4444]' : 'bg-slate-800'}`} />
                    <span className={`w-2.5 h-2.5 rounded-full ${node.state === 'GREEN_WAVE_ACTIVE' ? 'bg-emerald-500 shadow-[0_0_10px_#22c55e]' : 'bg-slate-800'}`} />
                  </div>
                  <div className="w-0.5 h-4 bg-slate-700"></div>

                  <div className="hidden group-hover:block absolute bottom-12 z-50 p-2 bg-slate-900 text-slate-100 text-xs rounded-lg shadow-2xl border border-slate-700 whitespace-nowrap pointer-events-none">
                    <p className="font-bold text-rose-400 border-b border-slate-700 pb-1 mb-1">{node.name}</p>
                    <p className="text-[11px] text-slate-300">Sector: {node.sector}</p>
                    <p className="text-[11px] font-mono mt-1">Status: <span className={node.state === 'GREEN_WAVE_ACTIVE' ? 'text-emerald-400 font-bold' : 'text-amber-400'}>{node.state}</span></p>
                  </div>
                </div>
              </Marker>
            ))}

            {/* Hospital Destination Marker */}
            <Marker longitude={selectedHospital.coords[0]} latitude={selectedHospital.coords[1]} anchor="bottom">
              <div className="group relative flex flex-col items-center cursor-pointer hover:scale-110 transition-transform">
                <div className="px-2 py-0.5 bg-rose-700 text-white rounded text-[9px] font-extrabold uppercase tracking-wider shadow-lg mb-1 whitespace-nowrap border border-rose-400/40 animate-bounce">
                  🏥 Destination
                </div>
                <div className="w-9 h-9 rounded-2xl bg-gradient-to-br from-rose-600 to-rose-800 border-2 border-white shadow-2xl flex items-center justify-center text-white text-lg">
                  🏥
                </div>
              </div>
            </Marker>

            {/* Live Animated Telemetry Marker (Pulsing Uber/Zomato Vehicle HUD) */}
            {animatedVehicle && (
              <Marker longitude={animatedVehicle.lng} latitude={animatedVehicle.lat} anchor="center">
                <div className="pointer-events-none flex flex-col items-center">
                  <div className="translate-y-[-28px] px-2.5 py-1 rounded-full bg-gradient-to-r from-rose-600 to-amber-500 text-white font-extrabold text-[10px] uppercase shadow-2xl border border-white flex items-center gap-1.5 animate-pulse">
                    <span className="w-2 h-2 rounded-full bg-white animate-ping"></span>
                    <span>🚑 AMB_09 TELEMETRY (ALPHA)</span>
                  </div>
                  <div 
                    className="w-10 h-10 rounded-full bg-rose-600/30 border-2 border-rose-500/80 flex items-center justify-center shadow-[0_0_20px_#f43f5e] animate-spin-slow transition-transform"
                    style={{ transform: `rotate(${animatedVehicle.bearing}deg)` }}
                  >
                    <div className="w-4 h-4 bg-white rounded-full shadow-inner"></div>
                  </div>
                </div>
              </Marker>
            )}
          </MapGL>

          {/* Top-left GPS Lock Overlay Badge */}
          <div className="absolute top-3 left-3 px-3 py-2 bg-slate-950/85 backdrop-blur-md rounded-xl border border-white/10 shadow-xl pointer-events-none flex items-center gap-2.5 z-10">
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping"></div>
            <div>
              <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Active GPS Lock</p>
              <p className="text-xs font-extrabold text-slate-100 font-mono">{pickupCoord[0].toFixed(4)}° E, {pickupCoord[1].toFixed(4)}° N</p>
            </div>
          </div>
        </div>
      </div>

      {/* SECTION 2: GPS Auto-Detect & Hospital Routing Hub */}
      <div className="bg-surface-container-lowest p-md rounded-2xl border border-outline-variant shadow-md shrink-0">
        <h3 className="font-headline-sm text-headline-sm text-primary mb-md flex items-center justify-between">
          <span className="flex items-center gap-xs">
            <span className="material-symbols-outlined text-secondary">alt_route</span>
            Dispatch & Hospital Selector
          </span>
          <span className="text-xs font-mono font-bold text-secondary">{routeDistanceKm.toFixed(2)} KM Route</span>
        </h3>
        
        <div className="space-y-md">
          {/* Auto-Detect GPS Button */}
          <div>
            <button
              onClick={handleAutoDetectGPS}
              disabled={isLocating || isSimulating}
              className="w-full py-2.5 px-4 bg-surface-container-high hover:bg-surface-container-highest text-on-surface font-label-md rounded-xl transition-all flex items-center justify-center gap-2 border border-outline-variant shadow-sm disabled:opacity-50"
            >
              <span className={`material-symbols-outlined text-rose-500 ${isLocating ? 'animate-spin' : ''}`}>
                {isLocating ? 'refresh' : 'my_location'}
              </span>
              <span className="font-bold">{isLocating ? 'Triangulating Satellite GPS...' : 'Auto-Detect Pickup (GPS Triangulate)'}</span>
            </button>
          </div>

          {/* Hospital Trauma Dropdown */}
          <div>
            <label className="block font-label-sm text-label-sm text-on-surface-variant mb-xs">Select Target Emergency Center</label>
            <select
              value={selectedHospital.id}
              onChange={(e) => {
                const h = activeRegion.hospitals.find(item => item.id === e.target.value);
                if (h) setSelectedHospital(h);
              }}
              disabled={isSimulating}
              className="w-full bg-surface-container-low border border-outline-variant/60 focus:ring-2 focus:ring-primary rounded-xl py-2 px-3 font-body-sm appearance-none cursor-pointer text-on-surface font-bold"
            >
              {activeRegion.hospitals.map(h => (
                <option key={h.id} value={h.id}>🏥 {h.name} ({h.type})</option>
              ))}
            </select>
          </div>

          {/* Launch Green Wave Dispatch Button */}
          <button
            onClick={startGreenWaveSimulation}
            disabled={isSimulating}
            className="w-full py-3.5 px-6 bg-gradient-to-r from-rose-600 via-red-600 to-amber-600 hover:from-rose-500 hover:to-amber-500 text-white rounded-xl font-extrabold text-sm shadow-xl active:scale-[0.98] transition-all flex items-center justify-center gap-2 border border-white/20 disabled:opacity-50 disabled:pointer-events-none"
          >
            <span className="material-symbols-outlined text-xl animate-bounce">rocket_launch</span>
            {isSimulating ? 'GREEN WAVE SIMULATION IN PROGRESS...' : 'START DISPATCH (GREEN WAVE PRE-EMPTION)'}
          </button>
        </div>
      </div>

      {/* SECTION 3: Inter-Agent Communication Logs & AI Assistant */}
      <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant shadow-md flex flex-col overflow-hidden flex-1 min-h-[220px]">
        <div className="p-3 border-b border-outline-variant flex justify-between items-center bg-slate-900 text-white">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping"></span>
            <span className="material-symbols-outlined text-emerald-400 text-lg">terminal</span>
            <h3 className="font-mono font-bold text-xs tracking-wider uppercase">Inter-Agent AI Communications Feed</h3>
          </div>
          <span className="text-[10px] font-mono text-slate-400">V2X PROTOCOL LIVE</span>
        </div>

        {/* Scrolling Terminal Log Body */}
        <div className="flex-1 p-3 bg-slate-950 text-slate-200 font-mono text-xs space-y-2 overflow-y-auto custom-scrollbar max-h-56">
          {logs.length === 0 ? (
            <div className="text-slate-500 italic text-center py-4">No inter-agent events recorded yet...</div>
          ) : (
            logs.map((item, index) => (
              <div key={index} className={`flex flex-col border-l-2 pl-2.5 py-0.5 ${
                item.sender.includes('You') || item.type === 'out' ? 'border-amber-500 bg-amber-950/20' : 'border-emerald-500 bg-slate-900/40'
              }`}>
                <div className="flex justify-between items-center text-[10px] text-slate-400">
                  <span className="font-bold text-rose-400">{item.sender}</span>
                  <span>[{item.time}]</span>
                </div>
                <p className="text-slate-200 mt-0.5 text-xs leading-relaxed">{item.text}</p>
              </div>
            ))
          )}
        </div>

        {/* Operator Interactive Input Bar */}
        <form onSubmit={handleSendChat} className="p-2 border-t border-outline-variant bg-surface-container-low flex gap-2">
          <input
            type="text"
            value={chatInput}
            onChange={(e) => setChatInput(e.target.value)}
            placeholder="Send query or override instruction to AI Agent..."
            className="flex-1 bg-surface-container-lowest border border-outline-variant/50 focus:ring-1 focus:ring-primary rounded-lg py-1.5 px-3 text-xs font-mono text-on-surface"
          />
          <button
            type="submit"
            className="px-3 py-1.5 bg-primary hover:bg-primary-hover text-on-primary rounded-lg font-bold text-xs transition-opacity flex items-center gap-1 shadow-sm"
          >
            <span>Send</span>
            <span className="material-symbols-outlined text-sm">send</span>
          </button>
        </form>
      </div>
    </div>
  );
}
