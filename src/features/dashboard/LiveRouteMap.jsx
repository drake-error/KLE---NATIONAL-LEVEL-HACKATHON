import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline } from 'react-leaflet';
import L from 'leaflet';

// Configure default Leaflet marker assets cleanly for Vite React bundling
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconUrl: markerIcon,
  iconRetinaUrl: markerIcon2x,
  shadowUrl: markerShadow,
});

// Custom markers for Emergency Operations
const ambulanceIcon = L.divIcon({
  className: 'custom-ambulance-marker',
  html: `<div style="background: #ba1a1a; color: white; width: 34px; height: 34px; border-radius: 50%; display: flex; align-items: center; justify-content: center; box-shadow: 0 0 14px rgba(186, 26, 26, 0.9); border: 2px solid white; font-size: 18px;">🚑</div>`,
  iconSize: [34, 34],
  iconAnchor: [17, 17],
  popupAnchor: [0, -17]
});

const hospitalIcon = L.divIcon({
  className: 'custom-hospital-marker',
  html: `<div style="background: #006c49; color: white; width: 32px; height: 32px; border-radius: 8px; display: flex; align-items: center; justify-content: center; box-shadow: 0 2px 8px rgba(0,108,73,0.6); border: 2px solid white; font-size: 16px;">🏥</div>`,
  iconSize: [32, 32],
  iconAnchor: [16, 16],
  popupAnchor: [0, -16]
});

export default function LiveRouteMap() {
  const [messages, setMessages] = useState([
    { sender: 'System', time: 'Just now', text: 'Monitoring all AI nodes. Ready for coordination.', type: 'in' },
    { sender: 'You', time: '1m ago', text: 'Status of JP Nagar corridor?', type: 'out' },
    { sender: 'System', time: '45s ago', text: 'JP Nagar Node 02 reporting 91% load. Signal pre-emption standby.', type: 'in' }
  ]);
  const [inputText, setInputText] = useState('');

  // Bengaluru coordinates matching topology (Silk Board, HSR Layout, St. John's Medical Center)
  const hospitalCoord = [12.9304, 77.6190];
  const ambulanceCoord = [12.9175, 77.6228];
  const routePoints = [
    ambulanceCoord,
    [12.9210, 77.6215],
    [12.9260, 77.6200],
    hospitalCoord
  ];

  // Simulate real-time comms stream from original micro-interaction JS
  useEffect(() => {
    const phrases = [
      "[DATA_FLOW]: Ingesting sensor array 09B",
      "[SIGNAL_LOCK]: JP_Nagar signal set to Priority_Alpha",
      "[FLEET_UPDATE]: AMB_09 status - ON_SCENE",
      "[AI_AGENT]: Recalibrating traffic weighted averages",
      "[SYSTEM]: Snapshot taken. Integrity 99.98%"
    ];
    let i = 0;
    const interval = setInterval(() => {
      const newMsg = {
        sender: 'Telemetry Stream',
        time: 'Live',
        text: phrases[i % phrases.length],
        type: 'in'
      };
      setMessages(prev => [...prev.slice(-20), newMsg]);
      i++;
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  const handleSend = (e) => {
    e.preventDefault();
    if (!inputText.trim()) return;
    setMessages(prev => [...prev, { sender: 'You', time: 'Now', text: inputText, type: 'out' }]);
    setInputText('');
  };

  return (
    <div className="col-span-4 flex flex-col gap-gutter h-full pb-4">
      {/* Real-time Interactive Leaflet Map Wrapper */}
      <div className="bg-surface-container-lowest p-md rounded-xl border border-outline-variant shadow-sm shrink-0">
        <div className="flex justify-between items-center mb-md">
          <h3 className="font-headline-sm text-headline-sm text-primary flex items-center gap-xs">
            <span className="material-symbols-outlined" data-icon="map">map</span>
            Live Route Surveillance
          </h3>
          <span className="px-2 py-0.5 bg-status-emergency text-white text-[10px] font-bold rounded uppercase animate-pulse">
            LIVE TRACKING
          </span>
        </div>
        <div className="w-full h-64 rounded-xl overflow-hidden border border-outline-variant/50 relative shadow-inner">
          <MapContainer 
            center={[12.9240, 77.6210]} 
            zoom={14} 
            scrollWheelZoom={false} 
            className="w-full h-full z-10"
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <Polyline positions={routePoints} pathOptions={{ color: '#ba1a1a', weight: 4, dashArray: '8, 8' }} />
            <Marker position={ambulanceCoord} icon={ambulanceIcon}>
              <Popup>
                <div className="font-sans text-xs">
                  <strong className="text-status-emergency block">AMB_09 (Priority Alpha)</strong>
                  En route from Silk Board Node.<br />
                  Est. Arrival: 3m 45s
                </div>
              </Popup>
            </Marker>
            <Marker position={hospitalCoord} icon={hospitalIcon}>
              <Popup>
                <div className="font-sans text-xs">
                  <strong className="text-secondary block">St. John&apos;s Medical Center</strong>
                  Trauma Bay 2 Alerted &amp; Prepared.
                </div>
              </Popup>
            </Marker>
          </MapContainer>
        </div>
      </div>

      {/* Control Center Widget */}
      <div className="bg-surface-container-lowest p-md rounded-xl border border-outline-variant shadow-sm shrink-0">
        <h3 className="font-headline-sm text-headline-sm text-primary mb-md flex items-center gap-xs">
          <span className="material-symbols-outlined" data-icon="settings_input_component">settings_input_component</span>
          Control Hub
        </h3>
        <div className="space-y-md">
          <div>
            <label className="block font-label-sm text-label-sm text-on-surface-variant mb-xs">Priority Destination</label>
            <select className="w-full bg-surface-container-low border-none focus:ring-2 focus:ring-primary rounded-xl py-xs px-sm font-body-sm appearance-none cursor-pointer">
              <option>St. John&apos;s Medical Center</option>
              <option>Apollo Hospitals - Jayanagar</option>
              <option>Manipal Hospital - Old Airport Rd</option>
              <option>Fortis Hospital - Bannerghatta</option>
            </select>
          </div>
          <div className="flex gap-sm">
            <button className="flex-1 py-sm bg-status-emergency text-on-error rounded-xl font-label-md hover:opacity-90 active:scale-95 transition-all flex items-center justify-center gap-xs shadow-md">
              <span className="material-symbols-outlined" data-icon="bolt">bolt</span>
              Emergency Clearance
            </button>
          </div>
          <div className="p-sm bg-secondary-container/30 rounded-xl border border-secondary/20">
            <div className="flex justify-between items-center mb-xs">
              <span className="font-label-sm text-label-sm text-on-secondary-container">Signal Pre-emption</span>
              <span className="px-2 py-0.5 bg-secondary text-white text-[10px] rounded-full uppercase font-bold">Active</span>
            </div>
            <div className="w-full bg-outline-variant/30 h-1.5 rounded-full overflow-hidden">
              <div className="bg-secondary h-full w-3/4 rounded-full"></div>
            </div>
          </div>
        </div>
      </div>

      {/* Signal Comms Terminal & AI Command Assistant */}
      <div className="bg-surface-container-lowest rounded-xl border border-outline-variant shadow-sm flex flex-col overflow-hidden shrink-0">
        <div className="p-sm border-b border-outline-variant flex justify-between items-center bg-surface-container-low">
          <div className="flex items-center gap-xs">
            <span className="material-symbols-outlined text-primary" data-icon="sparkles">sparkles</span>
            <h3 className="font-label-md text-label-md text-on-surface">AI Command Assistant</h3>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-secondary animate-pulse"></span>
            <span className="text-[10px] font-bold text-secondary uppercase">Online</span>
          </div>
        </div>
        <div className="flex-1 p-sm space-y-sm font-body-sm text-body-sm">
          {messages.map((msg, index) => (
            <div 
              key={index} 
              className={`flex flex-col gap-1 ${msg.type === 'out' ? 'items-end' : 'items-start'} opacity-100 transition-opacity duration-300`}
            >
              <div 
                className={`p-xs rounded-lg max-w-[85%] ${
                  msg.type === 'out' 
                    ? 'bg-primary text-on-primary rounded-tr-none' 
                    : 'bg-surface-container-high text-on-surface-variant rounded-tl-none'
                }`}
              >
                {msg.text}
              </div>
              <span className={`text-[9px] text-outline ${msg.type === 'out' ? 'mr-1' : 'ml-1'}`}>
                {msg.sender} • {msg.time}
              </span>
            </div>
          ))}
        </div>
        <form onSubmit={handleSend} className="p-sm border-t border-outline-variant bg-surface-container-lowest">
          <div className="flex gap-xs">
            <input 
              type="text" 
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Ask AI Assistant..." 
              className="flex-1 bg-surface-container-low border-none focus:ring-1 focus:ring-primary rounded-lg py-1 px-sm text-body-sm font-body-sm" 
            />
            <button type="submit" className="p-1 bg-primary text-on-primary rounded-lg hover:opacity-90 transition-opacity flex items-center justify-center">
              <span className="material-symbols-outlined" data-icon="send">send</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
