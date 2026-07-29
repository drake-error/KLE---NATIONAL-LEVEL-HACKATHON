import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import MapGL, { Source, Layer, Marker } from 'react-map-gl/maplibre';
import * as turf from '@turf/turf';
import 'maplibre-gl/dist/maplibre-gl.css';

// CartoDB styles for zero-token evaluation map backdrop
const FREE_DARK_STYLE = {
  version: 8,
  sources: {
    osm_raster_tiles: {
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
      id: 'osm_raster_layer',
      type: 'raster',
      source: 'osm_raster_tiles',
      minzoom: 0,
      maxzoom: 22
    }
  ]
};

// Karnataka regions coordinate catalog
const KARNATAKA_REGIONS = {
  bangalore: {
    name: "Bangalore (HSR & Silk Board)",
    center: [77.6210, 12.9235],
    hospitals: [
      { name: "St. John's Medical Center", coords: [77.6190, 12.9304], type: "Trauma Level 1" },
      { name: "Apollo Hospitals - Jayanagar", coords: [77.5912, 12.9214], type: "Cardiac Emergency" },
      { name: "Manipal Hospital - Old Airport Rd", coords: [77.6482, 12.9582], type: "Multi-Specialty" }
    ],
    signals: [
      { id: "sig-hsr", name: "HSR Layout Agent", coords: [77.6228, 12.9175], state: "red" },
      { id: "sig-silk", name: "Silk Board Agent", coords: [77.6215, 12.9210], state: "red" },
      { id: "sig-jpng", name: "JP Nagar Agent", coords: [77.6200, 12.9260], state: "red" }
    ]
  },
  belagavi: {
    name: "Belagavi (Tilakwadi & Congress Rd)",
    center: [74.4977, 15.8497],
    hospitals: [
      { name: "KLES Dr. Prabhakar Kore Hospital", coords: [74.5204, 15.8710], type: "Trauma Level 1" },
      { name: "Lakeview Goaves Hospital", coords: [74.5050, 15.8550], type: "Cardiac Emergency" },
      { name: "District Government Hospital", coords: [74.5120, 15.8620], type: "General Emergency" }
    ],
    signals: [
      { id: "sig-rpd", name: "RPD College Road Agent", coords: [74.4977, 15.8497], state: "red" },
      { id: "sig-congress", name: "Congress Road Agent", coords: [74.5005, 15.8520], state: "red" },
      { id: "sig-chennamma", name: "Chennamma Circle Agent", coords: [74.5080, 15.8570], state: "red" }
    ]
  }
};

export default function FleetStatus() {
  const [selectedRegion, setSelectedRegion] = useState("bangalore");
  const regionData = useMemo(() => KARNATAKA_REGIONS[selectedRegion], [selectedRegion]);

  const [pickupCoords, setPickupCoords] = useState(regionData.signals[0].coords);
  const [selectedHospital, setSelectedHospital] = useState(regionData.hospitals[0]);
  const [isGpsLoading, setIsGpsLoading] = useState(false);
  const [isSimulating, setIsSimulating] = useState(false);
  const [animatedVehicle, setAnimatedVehicle] = useState(null);
  
  const [signals, setSignals] = useState(regionData.signals);
  const [agentLogs, setAgentLogs] = useState([]);
  const [toasts, setToasts] = useState([]);

  const mapRef = useRef(null);
  const animationFrameId = useRef(null);
  const startTimestampRef = useRef(null);

  // Synchronize state when selected region changes
  useEffect(() => {
    setPickupCoords(regionData.signals[0].coords);
    setSelectedHospital(regionData.hospitals[0]);
    setSignals(regionData.signals);
    setAgentLogs([
      { time: new Date().toLocaleTimeString(), message: `SYSTEM: Switched operational region to ${regionData.name}.` }
    ]);
    setToasts([]);
    setAnimatedVehicle(null);
    if (animationFrameId.current) {
      cancelAnimationFrame(animationFrameId.current);
    }
  }, [selectedRegion, regionData]);

  // Toast Notification helper
  const addToast = useCallback((msg, type = "info") => {
    const id = Date.now() + Math.random();
    setToasts(prev => [...prev, { id, message: msg, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 4500);
  }, []);

  // AI Agent Log Helper
  const addLog = useCallback((msg) => {
    setAgentLogs(prev => [
      { time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }), message: msg },
      ...prev.slice(0, 49)
    ]);
  }, []);

  // GPS Simulation Trigger
  const triggerGpsLookup = () => {
    setIsGpsLoading(true);
    addLog("GPS: Querying mobile emergency base station...");
    setTimeout(() => {
      setIsGpsLoading(false);
      // Anchor near first signal corridor with slight offset
      const jitterCoords = [
        regionData.signals[0].coords[0] - 0.0015 + Math.random() * 0.003,
        regionData.signals[0].coords[1] - 0.0015 + Math.random() * 0.003
      ];
      setPickupCoords(jitterCoords);
      addLog(`GPS: Pickup lock verified at [${jitterCoords[0].toFixed(5)}, ${jitterCoords[1].toFixed(5)}]`);
      addToast("GPS Location auto-detected successfully!", "success");
      
      // Smoothly pan map to new pickup
      if (mapRef.current) {
        mapRef.current.easeTo({ center: jitterCoords, zoom: 15.5, duration: 1500 });
      }
    }, 1200);
  };

  // Generate dynamic routing path
  const routePoints = useMemo(() => {
    const coords = [pickupCoords];
    signals.forEach(s => coords.push(s.coords));
    coords.push(selectedHospital.coords);
    return coords;
  }, [pickupCoords, signals, selectedHospital]);

  const routeGeoJson = useMemo(() => {
    return turf.featureCollection([turf.lineString(routePoints)]);
  }, [routePoints]);

  const totalDistance = useMemo(() => {
    return turf.length(turf.lineString(routePoints), { units: 'kilometers' });
  }, [routePoints]);

  /* =====================================================================
   * INTER-AGENT SIGNAL PRE-EMPTION SIMULATION LOOP
   * ===================================================================== */
  const startCorridorSimulation = () => {
    if (isSimulating) return;
    setIsSimulating(true);
    setSignals(regionData.signals.map(s => ({ ...s, state: "red" })));
    startTimestampRef.current = null;
    
    addLog(`AI DISPATCH: Initializing Green Wave pre-emption corridor for ${selectedHospital.name}.`);
    addToast("Emergency clearance route active!", "warning");

    const line = turf.lineString(routePoints);
    const durationMs = 15000; // 15-second simulation run

    // Tracks which agents have already pre-empted or handed off
    const preemptionTrackRef = {
      sig0: false,
      sig1: false,
      sig2: false
    };

    const animate = (timestamp) => {
      if (!startTimestampRef.current) startTimestampRef.current = timestamp;
      const elapsed = timestamp - startTimestampRef.current;
      const progress = Math.min(elapsed / durationMs, 1);
      const currentDist = progress * totalDistance;

      const point = turf.along(line, currentDist, { units: 'kilometers' }).geometry.coordinates;

      // Dynamic Bearing Calculation
      const nextDist = Math.min(currentDist + 0.01, totalDistance);
      const nextPoint = turf.along(line, nextDist, { units: 'kilometers' }).geometry.coordinates;
      let bearing = 0;
      if (point[0] !== nextPoint[0] || point[1] !== nextPoint[1]) {
        bearing = turf.bearing(turf.point(point), turf.point(nextPoint));
      }

      setAnimatedVehicle({ coords: point, bearing });

      // Pan map smoothly behind vehicle using raw Maplibre instance to prevent viewState sync crashes
      if (mapRef.current && progress < 0.98) {
        const rawMap = mapRef.current.getMap();
        if (rawMap) {
          rawMap.jumpTo({ center: point, zoom: 15 });
        }
      }

      // --- MULTI-AGENT STATE & HAND-OFF LOGIC ---
      // Signal 0 (e.g. HSR Agent) Pre-emption when close
      if (progress > 0.05 && progress < 0.25 && !preemptionTrackRef.sig0) {
        preemptionTrackRef.sig0 = true;
        setSignals(prev => prev.map((s, idx) => idx === 0 ? { ...s, state: "green" } : s));
        addLog(`[${signals[0].name}]: Approaching vehicle detected. Pre-empting signal to GREEN!`);
        addToast(`${signals[0].name}: Pre-emption Active!`, "success");
      }

      // Signal 0 Hand-off to Signal 1 (e.g. Silk Board Agent)
      if (progress >= 0.25 && progress < 0.35 && preemptionTrackRef.sig0 && !preemptionTrackRef.sig1) {
        preemptionTrackRef.sig1 = true;
        setSignals(prev => prev.map((s, idx) => 
          idx === 0 ? { ...s, state: "red" } : idx === 1 ? { ...s, state: "green" } : s
        ));
        addLog(`[${signals[0].name}] ➜ [${signals[1].name}]: "Ambulance cleared sector. Handing off command. Clear your intersection!"`);
        addLog(`[${signals[1].name}]: Overriding normal signal cycles. Signal set to GREEN!`);
        addToast(`${signals[1].name}: Green Corridor Pre-empted!`, "success");
      }

      // Signal 1 Hand-off to Signal 2 (e.g. JP Nagar Agent)
      if (progress >= 0.55 && progress < 0.65 && preemptionTrackRef.sig1 && !preemptionTrackRef.sig2) {
        preemptionTrackRef.sig2 = true;
        setSignals(prev => prev.map((s, idx) => 
          idx === 1 ? { ...s, state: "red" } : idx === 2 ? { ...s, state: "green" } : s
        ));
        addLog(`[${signals[1].name}] ➜ [${signals[2].name}]: "Ambulance approaching JP Nagar intersection. Clear the signal!"`);
        addLog(`[${signals[2].name}]: Pre-emption engaged. Switched signal to GREEN!`);
        addToast(`${signals[2].name}: Intersection Cleared!`, "success");
      }

      // Route Completion
      if (progress < 1) {
        animationFrameId.current = requestAnimationFrame(animate);
      } else {
        setIsSimulating(false);
        setSignals(regionData.signals);
        addLog(`AI DISPATCH: Ambulance successfully arrived at ${selectedHospital.name}. Emergency corridor stand-down.`);
        addToast("Ambulance Arrived at Hospital!", "success");
        setAnimatedVehicle(null);
      }
    };

    animationFrameId.current = requestAnimationFrame(animate);
  };

  useEffect(() => {
    return () => {
      if (animationFrameId.current) cancelAnimationFrame(animationFrameId.current);
    };
  }, []);

  return (
    <div className="flex-1 grid grid-cols-12 gap-gutter text-on-surface">
      {/* Dynamic Toasts Overlay */}
      <div className="fixed top-20 right-6 z-[9999] flex flex-col gap-sm pointer-events-none">
        {toasts.map(t => (
          <div 
            key={t.id} 
            className={`px-md py-sm rounded-xl shadow-lg border border-outline-variant text-white font-label-md text-label-md animate-slide-in pointer-events-auto flex items-center gap-xs ${
              t.type === "success" ? "bg-status-success" : t.type === "warning" ? "bg-status-emergency" : "bg-primary"
            }`}
          >
            <span className="material-symbols-outlined">
              {t.type === "success" ? "check_circle" : t.type === "warning" ? "bolt" : "info"}
            </span>
            {t.message}
          </div>
        ))}
      </div>

      {/* LEFT COLUMN: Input controls & routing HUD */}
      <div className="col-span-4 flex flex-col gap-gutter">
        {/* Region & GPS Selector */}
        <section className="bg-surface-container-lowest p-md rounded-xl border border-outline-variant shadow-sm">
          <h2 className="font-headline-sm text-headline-sm text-primary mb-md flex items-center gap-xs">
            <span className="material-symbols-outlined">map</span>
            Operational Region
          </h2>
          <div className="space-y-md">
            <div>
              <label className="block font-label-sm text-label-sm text-on-surface-variant mb-xs">Active Karnataka District</label>
              <select 
                value={selectedRegion}
                onChange={(e) => setSelectedRegion(e.target.value)}
                className="w-full bg-surface-container-low border-none focus:ring-2 focus:ring-primary rounded-xl py-xs px-sm font-body-sm text-on-surface appearance-none cursor-pointer"
              >
                <option value="bangalore">Bangalore (Bengaluru)</option>
                <option value="belagavi">Belagavi (Belgaum)</option>
              </select>
            </div>

            <div className="flex gap-sm">
              <button 
                onClick={triggerGpsLookup}
                disabled={isGpsLoading || isSimulating}
                className="flex-1 py-xs bg-secondary text-white rounded-xl font-label-md hover:opacity-90 active:scale-95 transition-all flex items-center justify-center gap-xs shadow-md disabled:opacity-50 disabled:pointer-events-none"
              >
                <span className="material-symbols-outlined">{isGpsLoading ? 'autorenew' : 'my_location'}</span>
                {isGpsLoading ? 'Locating...' : 'Auto-Detect GPS Pickup'}
              </button>
            </div>
          </div>
        </section>

        {/* Hospital & Route Selection */}
        <section className="bg-surface-container-lowest p-md rounded-xl border border-outline-variant shadow-sm flex-1 flex flex-col justify-between">
          <div>
            <h2 className="font-headline-sm text-headline-sm text-primary mb-md flex items-center gap-xs">
              <span className="material-symbols-outlined">local_hospital</span>
              Hospital Routing
            </h2>
            
            <div className="space-y-md mb-md">
              <div>
                <label className="block font-label-sm text-label-sm text-on-surface-variant mb-xs">Select Trauma Center</label>
                <select 
                  value={selectedHospital.name}
                  onChange={(e) => {
                    const hosp = regionData.hospitals.find(h => h.name === e.target.value);
                    if (hosp) setSelectedHospital(hosp);
                  }}
                  className="w-full bg-surface-container-low border-none focus:ring-2 focus:ring-primary rounded-xl py-xs px-sm font-body-sm text-on-surface appearance-none cursor-pointer"
                >
                  {regionData.hospitals.map(h => (
                    <option key={h.name} value={h.name}>{h.name} ({h.type})</option>
                  ))}
                </select>
              </div>

              {/* Dynamic Path Information */}
              <div className="p-sm bg-surface-container-low rounded-xl space-y-xs">
                <div className="flex justify-between font-label-sm text-label-sm text-on-surface-variant">
                  <span>Routing Strategy:</span>
                  <span className="text-secondary font-bold">Shortest Safe Corridor</span>
                </div>
                <div className="flex justify-between font-body-sm text-body-sm">
                  <span>Distance:</span>
                  <span className="font-bold">{totalDistance.toFixed(2)} km</span>
                </div>
                <div className="flex justify-between font-body-sm text-body-sm">
                  <span>Est. Response Time:</span>
                  <span className="text-status-success font-bold font-mono">
                    {isSimulating ? "Clear Corridor Active" : `${(totalDistance * 1.5).toFixed(1)} mins`}
                  </span>
                </div>
              </div>
            </div>

            {/* List of Traffic Signal Nodes on Path */}
            <div>
              <h3 className="font-label-md text-label-md text-on-surface mb-xs flex items-center gap-xs">
                <span className="material-symbols-outlined text-outline">traffic</span>
                Signal Agents on Path
              </h3>
              <div className="space-y-sm max-h-48 overflow-y-auto pr-xs custom-scrollbar">
                {signals.map((sig, idx) => (
                  <div key={sig.id} className="flex justify-between items-center p-xs bg-surface-container-low rounded-lg border border-outline-variant/50">
                    <div>
                      <p className="font-label-md text-label-md">{sig.name}</p>
                      <p className="text-[10px] text-outline">Sequence Node 0{idx + 1}</p>
                    </div>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold text-white uppercase ${
                      sig.state === 'green' ? 'bg-status-success animate-pulse' : 'bg-status-emergency'
                    }`}>
                      {sig.state === 'green' ? 'Pre-empted' : 'Normal Cycle'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <button 
            onClick={startCorridorSimulation}
            disabled={isSimulating}
            className="w-full mt-lg py-sm bg-status-emergency text-white rounded-xl font-label-lg text-label-lg shadow-md hover:opacity-90 active:scale-95 transition-all flex items-center justify-center gap-xs disabled:opacity-50 disabled:pointer-events-none"
          >
            <span className="material-symbols-outlined animate-pulse">bolt</span>
            Launch Clear Corridor Simulation
          </button>
        </section>
      </div>

      {/* RIGHT COLUMN: 3D Map, Toasts HUD & Logs Terminal */}
      <div className="col-span-8 flex flex-col gap-gutter">
        {/* Mapbox 3D Container */}
        <section className="bg-surface-container-lowest p-md rounded-xl border border-outline-variant shadow-sm flex-1 flex flex-col">
          <div className="flex justify-between items-center mb-md">
            <h2 className="font-headline-sm text-headline-sm text-primary flex items-center gap-xs">
              <span className="material-symbols-outlined">3d_rotation</span>
              3D AI Agent Routing View (Tilted WebGL)
            </h2>
            <span className={`px-2 py-0.5 rounded text-[10px] font-bold text-white uppercase ${
              isSimulating ? 'bg-status-emergency animate-pulse' : 'bg-status-success'
            }`}>
              {isSimulating ? 'Corridor pre-emption live' : 'AI network monitoring'}
            </span>
          </div>

          {/* Map Container */}
          <div className="w-full flex-1 min-h-[380px] rounded-xl overflow-hidden border border-outline-variant relative shadow-inner">
            <MapGL
              ref={mapRef}
              initialViewState={{
                longitude: regionData.center[0],
                latitude: regionData.center[1],
                zoom: 14.5,
                pitch: 55, // 55° visual tilt
                bearing: -10
              }}
              style={{ width: '100%', height: '100%' }}
              mapStyle={FREE_DARK_STYLE}
            >
              {/* Draw Route Polyline */}
              <Source id="clear-route" type="geojson" data={routeGeoJson}>
                <Layer 
                  id="route-glow" 
                  type="line" 
                  paint={{ 
                    'line-color': isSimulating ? '#ef4444' : '#006c49', 
                    'line-width': 8, 
                    'line-opacity': 0.7 
                  }} 
                />
                <Layer 
                  id="route-centerline" 
                  type="line" 
                  paint={{ 
                    'line-color': '#ffffff', 
                    'line-width': 2, 
                    'line-opacity': 0.9,
                    'line-dasharray': [2, 2]
                  }} 
                />
              </Source>

              {/* Signals Markers */}
              {signals.map(sig => (
                <Marker key={sig.id} longitude={sig.coords[0]} latitude={sig.coords[1]} anchor="bottom">
                  <div className="flex flex-col items-center">
                    <div className={`px-1.5 py-0.5 bg-slate-900 border border-slate-700 text-white rounded text-[8px] font-bold shadow-md mb-1 whitespace-nowrap ${
                      sig.state === 'green' ? 'ring-2 ring-emerald-500 animate-pulse' : ''
                    }`}>
                      {sig.name}
                    </div>
                    <div className="flex flex-col items-center p-1 bg-slate-950 rounded border border-slate-800 shadow-xl gap-0.5">
                      <span className={`w-2 h-2 rounded-full ${sig.state === 'red' ? 'bg-red-500 shadow-[0_0_6px_#ef4444]' : 'bg-slate-700'}`} />
                      <span className={`w-2 h-2 rounded-full ${sig.state === 'green' ? 'bg-emerald-500 shadow-[0_0_6px_#22c55e]' : 'bg-slate-700'}`} />
                    </div>
                    <div className="w-0.5 h-3 bg-slate-800"></div>
                  </div>
                </Marker>
              ))}

              {/* Hospital Marker */}
              <Marker longitude={selectedHospital.coords[0]} latitude={selectedHospital.coords[1]} anchor="bottom">
                <div className="flex flex-col items-center">
                  <div className="px-2 py-0.5 bg-secondary text-white rounded text-[9px] font-bold shadow-lg mb-1 whitespace-nowrap border border-white/20">
                    {selectedHospital.name} (Destination)
                  </div>
                  <div className="w-8 h-8 rounded-xl bg-secondary border-2 border-white flex items-center justify-center text-white text-base shadow-xl hover:scale-110 transition-transform">
                    🏥
                  </div>
                </div>
              </Marker>

              {/* Animated Ambulance Marker */}
              {animatedVehicle && (
                <Marker longitude={animatedVehicle.coords[0]} latitude={animatedVehicle.coords[1]} anchor="center">
                  <div 
                    className="flex flex-col items-center transition-transform duration-75"
                    style={{ transform: `rotate(${animatedVehicle.bearing}deg)` }}
                  >
                    <div className="w-10 h-10 rounded-full bg-status-emergency border-2 border-white flex items-center justify-center text-xl shadow-2xl animate-pulse">
                      🚑
                    </div>
                  </div>
                </Marker>
              )}
            </MapGL>

            {/* GPS Pickup Marker (Tethered statically to coordinate) */}
            {!isSimulating && (
              <div className="absolute top-2 left-2 p-2 bg-surface-container-highest/95 border border-outline-variant shadow-md rounded-xl text-xs flex flex-col gap-1 z-50">
                <span className="font-bold flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded-full bg-secondary animate-ping"></span>
                  Pickup Coordinates Lock
                </span>
                <span className="font-mono text-[10px]">{pickupCoords[0].toFixed(5)}° E, {pickupCoords[1].toFixed(5)}° N</span>
              </div>
            )}
          </div>
        </section>

        {/* AI Agent Inter-Communication Log Terminal */}
        <section className="bg-surface-container-lowest p-md rounded-xl border border-outline-variant shadow-sm h-56 flex flex-col">
          <h2 className="font-headline-sm text-headline-sm text-primary mb-sm flex items-center gap-xs">
            <span className="material-symbols-outlined">terminal</span>
            AI Agent Inter-Communication Feed
          </h2>
          <div className="flex-1 bg-surface-container-low p-sm rounded-xl font-mono text-body-sm text-on-surface-variant overflow-y-auto custom-scrollbar flex flex-col-reverse gap-xs border border-outline-variant/50">
            {agentLogs.length === 0 ? (
              <div className="text-outline italic text-center py-sm">No agent communications currently transmitting. Launch corridor simulation to view real-time log.</div>
            ) : (
              agentLogs.map((log, idx) => (
                <div key={idx} className="flex gap-2">
                  <span className="text-secondary font-bold">[{log.time}]</span>
                  <span>{log.message}</span>
                </div>
              ))
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
