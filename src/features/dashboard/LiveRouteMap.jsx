import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import MapGL, { Source, Layer, Marker } from 'react-map-gl/maplibre';
import * as turf from '@turf/turf';
import 'mapbox-gl/dist/mapbox-gl.css';
import 'maplibre-gl/dist/maplibre-gl.css';

// Reliable high-contrast dark raster style
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

// Karnataka Regional Command Coordinates
const REGIONAL_COMMAND = {
  bangalore: {
    name: "Bangalore HQ (HSR & Silk Board)",
    center: [77.6229, 12.9172],
    zoom: 13.8,
    corridors: [
      { id: 'unit-1', name: "Alpha Trauma Unit 01", coords: [77.6229, 12.9172], status: "ACTIVE DISPATCH", speed: "60 km/h" },
      { id: 'unit-2', name: "Beta Cardiac Unit 04", coords: [77.6310, 12.9250], status: "STANDBY", speed: "0 km/h" },
      { id: 'unit-3', name: "Gamma Rescue Unit 09", coords: [77.6140, 12.9080], status: "RETURNING", speed: "45 km/h" }
    ],
    route: [[77.6140, 12.9080], [77.6229, 12.9172], [77.6310, 12.9250]]
  },
  belagavi: {
    name: "Belagavi Command (Tilakwadi Sector)",
    center: [74.5050, 15.8550],
    zoom: 13.8,
    corridors: [
      { id: 'unit-b1', name: "KLES Trauma Unit 02", coords: [74.5204, 15.8710], status: "ACTIVE DISPATCH", speed: "65 km/h" },
      { id: 'unit-b2', name: "Lakeview Cardiac Unit 05", coords: [74.5050, 15.8550], status: "STANDBY", speed: "0 km/h" },
      { id: 'unit-b3', name: "Civil Rescue Unit 08", coords: [74.4977, 15.8497], status: "PATROL", speed: "35 km/h" }
    ],
    route: [[74.4977, 15.8497], [74.5050, 15.8550], [74.5204, 15.8710]]
  }
};

export default function LiveRouteMap() {
  const [activeRegionId, setActiveRegionId] = useState('bangalore');
  const [activeUnit, setActiveUnit] = useState(null);
  const [statusText, setStatusText] = useState('All sector Green Wave protocols armed. Hand Navigation Active!');

  const mapRef = useRef(null);
  const isMapLoadedRef = useRef(false);

  const activeRegion = useMemo(() => REGIONAL_COMMAND[activeRegionId], [activeRegionId]);

  const safePanTo = useCallback((coords, zoomLevel = 14.5) => {
    try {
      if (!isMapLoadedRef.current || !mapRef.current) return;
      const rawMap = typeof mapRef.current.getMap === 'function' ? mapRef.current.getMap() : mapRef.current;
      if (rawMap && typeof rawMap.flyTo === 'function') {
        rawMap.flyTo({ center: coords, zoom: zoomLevel, pitch: 45, duration: 1200 });
      }
    } catch (err) {
      console.warn("Deferred camera animation:", err.message);
    }
  }, []);

  useEffect(() => {
    setActiveUnit(activeRegion.corridors[0]);
    safePanTo(activeRegion.center, activeRegion.zoom);
  }, [activeRegion, safePanTo]);

  const handleMapLoad = useCallback(() => {
    isMapLoadedRef.current = true;
  }, []);

  const routeGeoJson = useMemo(() => {
    return turf.featureCollection([turf.lineString(activeRegion.route)]);
  }, [activeRegion.route]);

  return (
    <div className="col-span-4 flex flex-col gap-4 h-full pb-4 text-slate-100 font-sans">
      {/* Header & Region Selection Pills */}
      <div className="bg-slate-900/90 p-4 rounded-2xl border border-slate-800 shadow-2xl flex flex-col shrink-0 backdrop-blur-md">
        <div className="flex items-center justify-between flex-wrap gap-2 mb-3">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse"></span>
            <h3 className="font-black text-base tracking-wide text-white uppercase flex items-center gap-2">
              Dashboard Overview: Active Emergency Corridors
            </h3>
          </div>
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 bg-emerald-950 text-emerald-300 font-black text-xs rounded-xl border border-emerald-500/50 flex items-center gap-1">
              <span className="material-symbols-outlined text-sm">pan_tool</span>
              ✋ Hand Drag Enabled
            </span>
            <span className="text-[11px] font-extrabold px-3 py-1 rounded-full bg-slate-950 text-emerald-400 border border-emerald-500/30">
              👉 SWITCH TO FLEET STATUS TAB FOR FULL 4-PHASE AI SIMULATION & OSRM GREEN WAVE
            </span>
          </div>
        </div>

        {/* Region Switches */}
        <div className="grid grid-cols-2 gap-2.5 p-1 bg-slate-950 rounded-xl border border-slate-800">
          {Object.entries(REGIONAL_COMMAND).map(([key, reg]) => (
            <button
              key={key}
              onClick={() => setActiveRegionId(key)}
              className={`py-2 px-4 rounded-lg text-xs font-black transition-all flex items-center justify-center gap-2 ${
                activeRegionId === key
                  ? 'bg-gradient-to-r from-rose-600 to-amber-600 text-white shadow-lg scale-[1.01]'
                  : 'text-slate-400 hover:bg-slate-900 hover:text-slate-200'
              }`}
            >
              <span className="material-symbols-outlined text-sm">location_on</span>
              <span>{reg.name}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Map Canvas Overview with Hand Grab styling */}
      <div className="bg-slate-900/90 p-4 rounded-2xl border border-slate-800 shadow-2xl flex flex-col shrink-0">
        <div className="w-full h-[380px] xl:h-[440px] rounded-xl overflow-hidden border border-slate-700/80 relative shadow-inner bg-slate-950 cursor-grab active:cursor-grabbing">
          <MapGL
            ref={mapRef}
            initialViewState={{
              longitude: activeRegion.center[0],
              latitude: activeRegion.center[1],
              zoom: activeRegion.zoom,
              pitch: 48,
              bearing: -12
            }}
            interactive={true}
            dragPan={true}
            dragRotate={true}
            scrollZoom={true}
            touchZoomRotate={true}
            cursor="grab"
            style={{ width: '100%', height: '100%' }}
            mapStyle={FREE_DARK_STYLE}
            onLoad={handleMapLoad}
          >
            {/* Regional Corridor Polyline */}
            <Source id="regional-route-source" type="geojson" data={routeGeoJson}>
              <Layer
                id="regional-route-glow"
                type="line"
                paint={{
                  'line-color': '#06b6d4',
                  'line-width': 8,
                  'line-opacity': 0.3,
                  'line-blur': 3
                }}
              />
              <Layer
                id="regional-route-line"
                type="line"
                paint={{
                  'line-color': '#22c55e',
                  'line-width': 3.5,
                  'line-opacity': 0.95,
                  'line-dasharray': [2, 1.5]
                }}
              />
            </Source>

            {/* Render Active Units */}
            {activeRegion.corridors.map(unit => (
              <Marker key={unit.id} longitude={unit.coords[0]} latitude={unit.coords[1]} anchor="bottom">
                <div 
                  onClick={() => {
                    setActiveUnit(unit);
                    safePanTo(unit.coords, 15.5);
                    setStatusText(`Selected ${unit.name}. Current Velocity: ${unit.speed}. Hand Navigation Active!`);
                  }}
                  className="group relative flex flex-col items-center cursor-pointer hover:scale-110 transition-transform"
                >
                  <div className={`px-2 py-0.5 rounded text-[10px] font-extrabold shadow mb-1 border uppercase whitespace-nowrap ${
                    unit.status === 'ACTIVE DISPATCH' ? 'bg-rose-600 text-white border-rose-400 animate-pulse' : 'bg-slate-900 text-slate-300 border-slate-700'
                  }`}>
                    🚑 {unit.name} ({unit.speed})
                  </div>
                  <div className="w-9 h-9 p-1 rounded-xl bg-slate-950 border border-slate-700 shadow-xl flex items-center justify-center">
                    <img src="/traffic-svg/ambulance_car.svg" alt="Ambulance Icon" className="w-full h-full object-contain" />
                  </div>
                </div>
              </Marker>
            ))}
          </MapGL>

          {/* Telemetry HUD overlay */}
          <div className="absolute top-3 left-3 px-3.5 py-2 bg-slate-950/95 backdrop-blur-md rounded-xl border border-slate-800 shadow-xl pointer-events-none flex items-center gap-3 z-10">
            <div className="w-3 h-3 rounded-full bg-emerald-500 animate-ping"></div>
            <div>
              <p className="text-[10px] uppercase font-black text-slate-400 tracking-wider">Operational Command Sector</p>
              <p className="text-xs font-black text-slate-100">{activeRegion.name}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Active Corridor Telemetry Bar */}
      <div className="bg-slate-900/90 p-4 rounded-2xl border border-slate-800 shadow-2xl flex flex-col shrink-0">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-rose-950/80 rounded-xl border border-rose-500 text-rose-400">
              <span className="material-symbols-outlined text-2xl animate-pulse">radar</span>
            </div>
            <div>
              <h4 className="font-black text-sm text-white uppercase">Sector Surveillance Status</h4>
              <p className="text-xs text-slate-300 font-mono mt-0.5">{statusText}</p>
            </div>
          </div>
          <div className="px-4 py-2 bg-gradient-to-r from-slate-950 to-slate-900 rounded-xl border border-slate-700 text-right">
            <span className="text-[10px] text-slate-400 font-extrabold uppercase block">Active AI Junctions</span>
            <span className="text-sm font-mono font-black text-cyan-400">ALL SIGNALS NOMINAL</span>
          </div>
        </div>
      </div>
    </div>
  );
}
