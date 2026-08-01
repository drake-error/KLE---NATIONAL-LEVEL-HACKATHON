/**
 * HospitalLocator.jsx — Module 4: Nearby Government Hospital Locator.
 * Uses navigator.geolocation + OpenStreetMap Overpass API + Leaflet (100% free).
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useI18n } from '../../i18n';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

const OVERPASS_API = 'https://overpass-api.de/api/interpreter';

function haversineDistance(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

async function fetchNearbyHospitals(lat, lon, radius = 10000) {
  const query = `[out:json][timeout:25];(node(around:${radius},${lat},${lon})["amenity"="hospital"];way(around:${radius},${lat},${lon})["amenity"="hospital"];);out center;`;
  const res = await fetch(OVERPASS_API, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `data=${encodeURIComponent(query)}`,
  });
  if (!res.ok) throw new Error('Failed to fetch hospitals from Overpass API');
  const data = await res.json();
  return data.elements
    .map((el) => {
      const elLat = el.lat || el.center?.lat;
      const elLon = el.lon || el.center?.lon;
      if (!elLat || !elLon) return null;
      return {
        id: el.id,
        name: el.tags?.name || 'Unnamed Hospital',
        lat: elLat,
        lon: elLon,
        phone: el.tags?.phone || el.tags?.['contact:phone'] || null,
        website: el.tags?.website || null,
        emergency: el.tags?.emergency === 'yes',
        operator: el.tags?.operator || null,
        distance: haversineDistance(lat, lon, elLat, elLon),
      };
    })
    .filter(Boolean)
    .sort((a, b) => a.distance - b.distance);
}

export default function HospitalLocator() {
  const { t } = useI18n();
  const mapContainerRef = useRef(null);
  const mapRef = useRef(null);
  const [userLocation, setUserLocation] = useState(null);
  const [hospitals, setHospitals] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedHospital, setSelectedHospital] = useState(null);

  const initMap = useCallback((lat, lon, hospitalData) => {
    if (mapRef.current) {
      mapRef.current.remove();
      mapRef.current = null;
    }

    if (!mapContainerRef.current) return;

    const map = L.map(mapContainerRef.current).setView([lat, lon], 13);
    mapRef.current = map;

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      maxZoom: 19,
    }).addTo(map);

    // User marker
    const userIcon = L.divIcon({
      html: '<div style="width:16px;height:16px;border-radius:50%;background:#315baf;border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.3);"></div>',
      iconSize: [16, 16],
      className: '',
    });
    L.marker([lat, lon], { icon: userIcon }).addTo(map).bindPopup('<b>You are here</b>');

    // Hospital markers
    const hospitalIcon = L.divIcon({
      html: '<div style="width:28px;height:28px;border-radius:50%;background:#dc2626;border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.3);display:flex;align-items:center;justify-content:center;color:white;font-size:14px;font-weight:900;">+</div>',
      iconSize: [28, 28],
      className: '',
    });

    hospitalData.forEach((h) => {
      L.marker([h.lat, h.lon], { icon: hospitalIcon })
        .addTo(map)
        .bindPopup(`<b>${h.name}</b><br>${h.distance.toFixed(1)} km away${h.phone ? `<br>📞 ${h.phone}` : ''}`);
    });
  }, []);

  const locateUser = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const pos = await new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, { enableHighAccuracy: true, timeout: 10000 });
      });

      const { latitude, longitude } = pos.coords;
      setUserLocation({ lat: latitude, lon: longitude });

      const hospitalData = await fetchNearbyHospitals(latitude, longitude);
      setHospitals(hospitalData);
      initMap(latitude, longitude, hospitalData);
    } catch (err) {
      setError(err.message === 'User denied Geolocation'
        ? t('Location access denied. Please enable location in your browser settings.')
        : t('Could not get your location. Please try again.'));
    } finally {
      setIsLoading(false);
    }
  }, [t, initMap]);

  // Cleanup map on unmount
  useEffect(() => {
    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  return (
    <div className="space-y-4">
      {/* Locate Button */}
      {!userLocation && (
        <div className="text-center py-10">
          <span className="material-symbols-outlined text-5xl text-on-surface-variant/40 mb-4 block">location_on</span>
          <h3 className="font-bold text-on-surface text-lg mb-2">{t("Find Nearby Hospitals")}</h3>
          <p className="text-sm text-on-surface-variant mb-6">{t("We'll use your location to find government hospitals within 10km.")}</p>
          <button
            onClick={locateUser}
            disabled={isLoading}
            className="px-8 py-3 rounded-2xl bg-primary text-on-primary font-bold shadow-md hover:bg-primary/90 active:scale-95 transition-all disabled:opacity-50"
          >
            {isLoading ? (
              <span className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                {t("Locating...")}
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <span className="material-symbols-outlined">my_location</span>
                {t("Enable Location & Search")}
              </span>
            )}
          </button>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="flex items-start gap-3 p-4 rounded-2xl bg-error/10 border border-error/30">
          <span className="material-symbols-outlined text-error">error</span>
          <p className="text-sm font-semibold text-error">{error}</p>
        </div>
      )}

      {/* Map */}
      {userLocation && (
        <div ref={mapContainerRef} className="h-72 rounded-2xl border border-outline-variant shadow-md z-0" />
      )}

      {/* Hospital List */}
      {hospitals.length > 0 && (
        <div className="space-y-3">
          <h3 className="font-bold text-on-surface flex items-center gap-2">
            <span className="material-symbols-outlined text-primary">local_hospital</span>
            {t("Hospitals Found")} ({hospitals.length})
          </h3>
          {hospitals.slice(0, 20).map((h) => (
            <div
              key={h.id}
              onClick={() => setSelectedHospital(selectedHospital === h.id ? null : h.id)}
              className={`p-4 rounded-2xl border transition-all cursor-pointer ${
                selectedHospital === h.id
                  ? 'bg-primary/5 border-primary/40'
                  : 'bg-surface-container-lowest border-outline-variant hover:border-primary/30'
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h4 className="font-black text-on-surface text-sm">{h.name}</h4>
                    {h.emergency && (
                      <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-500 uppercase">{t("Emergency")}</span>
                    )}
                  </div>
                  <p className="text-xs text-on-surface-variant font-semibold mt-1">
                    📍 {h.distance.toFixed(1)} km {t("away")}
                    {h.operator && ` • ${h.operator}`}
                  </p>
                </div>
                <span className="text-lg font-black text-primary">{h.distance.toFixed(1)} <span className="text-xs">km</span></span>
              </div>

              {selectedHospital === h.id && (
                <div className="flex gap-2 mt-3 pt-3 border-t border-outline-variant/30">
                  <a
                    href={`https://www.google.com/maps/dir/?api=1&destination=${h.lat},${h.lon}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 flex items-center justify-center gap-2 py-2 rounded-xl bg-primary text-on-primary font-bold text-xs hover:bg-primary/90 transition-colors"
                  >
                    <span className="material-symbols-outlined text-sm">directions</span>
                    {t("Directions")}
                  </a>
                  {h.phone && (
                    <a
                      href={`tel:${h.phone}`}
                      className="flex-1 flex items-center justify-center gap-2 py-2 rounded-xl bg-emerald-500 text-white font-bold text-xs hover:bg-emerald-600 transition-colors"
                    >
                      <span className="material-symbols-outlined text-sm">call</span>
                      {t("Call")}
                    </a>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {userLocation && hospitals.length === 0 && !isLoading && (
        <div className="text-center py-8">
          <p className="text-sm text-on-surface-variant">{t("No hospitals found within 10km. Try again or expand your search area.")}</p>
        </div>
      )}
    </div>
  );
}
