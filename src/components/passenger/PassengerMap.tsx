import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import { supabase } from '../../utils/supabase';

const SOS_LABELS: Record<string, string> = {
  engine:    '🔧 Engine Problem',
  breakdown: '🚗 Vehicle Breakdown',
  accident:  '💥 Accident',
  medical:   '🏥 Medical Emergency',
  fuel:      '⛽ Out of Fuel',
  emergency: '🆘 Super Emergency',
};

interface PassengerMapProps {
  originCoords: { lat: number; lng: number } | null;
  destCoords: { lat: number; lng: number } | null;
  originName?: string;
  destName?: string;
  driverId?: string | null;
}

const liveBusIcon = typeof window !== 'undefined' ? L.divIcon({
  className: 'live-bus-marker',
  html: `<div style="
    width: 42px;
    height: 42px;
    background-color: #6e54ff;
    border: 2.5px solid white;
    border-radius: 50%;
    box-shadow: 0 4px 16px rgba(110,84,255,0.55), 0 2px 4px rgba(0,0,0,0.2);
    display: flex;
    align-items: center;
    justify-content: center;
    position: relative;
  ">
    <svg style="width: 22px; height: 22px; fill: white;" viewBox="0 0 24 24">
      <path d="M18.92 6.01C18.72 5.42 18.16 5 17.5 5H6.5c-.66 0-1.21.42-1.42 1.01L3 12v8c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h12v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-8l-2.08-5.99zM6.5 16c-.83 0-1.5-.67-1.5-1.5S5.67 13 6.5 13s1.5.67 1.5 1.5S7.33 16 6.5 16zm11 0c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zM5 11l1.5-4.5h11L19 11H5z"/>
    </svg>
    <div style="
      position: absolute;
      top: -3px;
      right: -3px;
      width: 11px;
      height: 11px;
      background: #ef4444;
      border: 2px solid white;
      border-radius: 50%;
    "></div>
  </div>`,
  iconSize: [42, 42],
  iconAnchor: [21, 21],
}) : null;

const animateMarker = (
  marker: L.Marker,
  from: L.LatLng,
  to: L.LatLng,
  duration = 900
) => {
  const start = performance.now();
  const step = (now: number) => {
    const t = Math.min((now - start) / duration, 1);
    // ease-out cubic
    const ease = 1 - Math.pow(1 - t, 3);
    marker.setLatLng([
      from.lat + (to.lat - from.lat) * ease,
      from.lng + (to.lng - from.lng) * ease,
    ]);
    if (t < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
};

export const PassengerMap: React.FC<PassengerMapProps> = ({
  originCoords,
  destCoords,
  originName = 'Origin Terminal',
  destName = 'Destination',
  driverId,
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const polylineRef = useRef<L.Polyline | null>(null);
  const routeMarkersRef = useRef<L.Marker[]>([]);
  const busMarkerRef = useRef<L.Marker | null>(null);
  const sosMarkerRef = useRef<L.Marker | null>(null);
  const [activeSOS, setActiveSOS] = useState<{ type: string } | null>(null);

  // Initialise the map once on mount
  useEffect(() => {
    if (!mapContainerRef.current) return;
    if (mapInstanceRef.current) return;

    const container = mapContainerRef.current;
    if ((container as any)._leaflet_id) {
      delete (container as any)._leaflet_id;
    }

    const defaultCenter: [number, number] = [6.8024, 3.4975];
    const map = L.map(container, { zoomControl: true }).setView(defaultCenter, 8);
    mapInstanceRef.current = map;

    L.tileLayer('https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}', {
      maxZoom: 20,
      attribution: '&copy; Google Maps',
    }).addTo(map);

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // Draw/redraw route whenever coords change
  useEffect(() => {
    if (!mapInstanceRef.current) return;

    if (polylineRef.current) {
      polylineRef.current.remove();
      polylineRef.current = null;
    }
    routeMarkersRef.current.forEach(m => m.remove());
    routeMarkersRef.current = [];

    if (!originCoords || !destCoords) return;

    const latlng1: [number, number] = [originCoords.lat, originCoords.lng];
    const latlng2: [number, number] = [destCoords.lat, destCoords.lng];

    const originMarker = L.marker(latlng1, {
      icon: L.divIcon({
        className: 'passenger-origin-marker',
        html: `<div style="
          width: 14px; height: 14px;
          background: #3b82f6;
          border: 2.5px solid white;
          border-radius: 50%;
          box-shadow: 0 2px 6px rgba(59,130,246,0.5);
        "></div>`,
        iconSize: [14, 14],
        iconAnchor: [7, 7],
      }),
    })
      .addTo(mapInstanceRef.current!)
      .bindPopup(`<strong>Boarding:</strong> ${originName}`);

    const destMarker = L.marker(latlng2, {
      icon: L.divIcon({
        className: 'passenger-dest-marker',
        html: `<div style="
          width: 18px; height: 18px;
          background: #10b981;
          border: 2.5px solid white;
          border-radius: 50%;
          box-shadow: 0 2px 6px rgba(16,185,129,0.5);
        "></div>`,
        iconSize: [18, 18],
        iconAnchor: [9, 9],
      }),
    })
      .addTo(mapInstanceRef.current!)
      .bindPopup(`<strong>Destination:</strong> ${destName}`);

    routeMarkersRef.current = [originMarker, destMarker];

    const drawPolyline = (points: [number, number][]) => {
      if (!mapInstanceRef.current) return;
      const poly = L.polyline(points, {
        color: '#3b82f6',
        weight: 5,
        opacity: 0.85,
      }).addTo(mapInstanceRef.current);
      polylineRef.current = poly;
      mapInstanceRef.current.fitBounds(poly.getBounds(), { padding: [50, 50] });
    };

    let cancelled = false;

    const osrmUrl =
      `https://router.project-osrm.org/route/v1/driving/` +
      `${originCoords.lng},${originCoords.lat};${destCoords.lng},${destCoords.lat}` +
      `?overview=full&geometries=geojson`;

    fetch(osrmUrl)
      .then(res => res.json())
      .then(data => {
        if (cancelled) return;
        if (data.code === 'Ok' && data.routes?.[0]?.geometry?.coordinates?.length) {
          const roadPoints: [number, number][] = data.routes[0].geometry.coordinates.map(
            ([lng, lat]: [number, number]) => [lat, lng]
          );
          drawPolyline(roadPoints);
        } else {
          drawPolyline([latlng1, latlng2]);
        }
      })
      .catch(() => { if (!cancelled) drawPolyline([latlng1, latlng2]); });

    return () => { cancelled = true; };
  }, [originCoords, destCoords, originName, destName]);

  // Live driver tracking via Supabase Realtime
  useEffect(() => {
    if (!driverId) {
      // Remove bus marker if driverId is gone
      if (busMarkerRef.current) {
        busMarkerRef.current.remove();
        busMarkerRef.current = null;
      }
      return;
    }

    const placeBusMarker = (lat: number, lng: number) => {
      if (!mapInstanceRef.current || !liveBusIcon) return;
      if (busMarkerRef.current) {
        const from = busMarkerRef.current.getLatLng();
        animateMarker(busMarkerRef.current, from, L.latLng(lat, lng));
      } else {
        busMarkerRef.current = L.marker([lat, lng], { icon: liveBusIcon, zIndexOffset: 1000 })
          .addTo(mapInstanceRef.current)
          .bindPopup('Your bus is here');
      }
    };

    // Fetch current driver position immediately
    supabase
      .from('drivers')
      .select('latitude, longitude')
      .eq('id', driverId)
      .single()
      .then(({ data }) => {
        if (data?.latitude != null && data?.longitude != null) {
          placeBusMarker(data.latitude, data.longitude);
        }
      });

    // Subscribe to real-time position updates
    const channel = supabase
      .channel(`driver-loc-${driverId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'drivers',
          filter: `id=eq.${driverId}`,
        },
        (payload) => {
          const { latitude, longitude } = payload.new as any;
          if (latitude != null && longitude != null) {
            placeBusMarker(latitude, longitude);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
      if (busMarkerRef.current) {
        busMarkerRef.current.remove();
        busMarkerRef.current = null;
      }
    };
  }, [driverId]);

  // SOS alert subscription
  useEffect(() => {
    if (!driverId) {
      setActiveSOS(null);
      if (sosMarkerRef.current) { sosMarkerRef.current.remove(); sosMarkerRef.current = null; }
      return;
    }

    const sosIcon = L.divIcon({
      className: 'sos-marker',
      html: `<div style="
        width:48px;height:48px;background:#dc2626;border:3px solid white;
        border-radius:50%;display:flex;align-items:center;justify-content:center;
        font-size:22px;box-shadow:0 0 0 6px rgba(220,38,38,0.3),0 4px 16px rgba(220,38,38,0.6);
        animation:sos-pulse 1.2s infinite;
      ">🆘</div>
      <style>@keyframes sos-pulse{0%,100%{box-shadow:0 0 0 6px rgba(220,38,38,0.3)}50%{box-shadow:0 0 0 14px rgba(220,38,38,0.1)}}</style>`,
      iconSize: [48, 48],
      iconAnchor: [24, 24],
    });

    const placeSOS = (lat: number, lng: number, type: string) => {
      if (!mapInstanceRef.current) return;
      if (sosMarkerRef.current) { sosMarkerRef.current.remove(); }
      sosMarkerRef.current = L.marker([lat, lng], { icon: sosIcon, zIndexOffset: 2000 })
        .addTo(mapInstanceRef.current)
        .bindPopup(`<strong>🆘 SOS Alert</strong><br/>${SOS_LABELS[type] ?? type}`);
      setActiveSOS({ type });
    };

    // Check for existing active SOS
    supabase.from('sos_alerts').select('*')
      .eq('driver_id', driverId).eq('active', true).order('created_at', { ascending: false }).limit(1)
      .single().then(({ data }) => {
        if (data?.latitude && data?.longitude) placeSOS(data.latitude, data.longitude, data.type);
      });

    const sosChan = supabase.channel(`sos-${driverId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'sos_alerts', filter: `driver_id=eq.${driverId}` },
        (payload) => {
          const { latitude, longitude, type } = payload.new as any;
          if (latitude && longitude) placeSOS(latitude, longitude, type);
        }
      )
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'sos_alerts', filter: `driver_id=eq.${driverId}` },
        (payload) => {
          if (!payload.new.active) {
            if (sosMarkerRef.current) { sosMarkerRef.current.remove(); sosMarkerRef.current = null; }
            setActiveSOS(null);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(sosChan);
      if (sosMarkerRef.current) { sosMarkerRef.current.remove(); sosMarkerRef.current = null; }
    };
  }, [driverId]);

  return (
    <div className="relative w-full h-full" style={{ minHeight: 0 }}>
      <div
        ref={mapContainerRef}
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}
      />

      {/* SOS banner — takes priority over live badge */}
      {activeSOS ? (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[1000] flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-full text-xs font-bold shadow-xl pointer-events-none animate-pulse">
          🆘 {SOS_LABELS[activeSOS.type] ?? activeSOS.type} — Driver needs help!
        </div>
      ) : driverId ? (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[1000] flex items-center gap-1.5 px-3 py-1.5 bg-[#6e54ff] text-white rounded-full text-xs font-bold shadow-lg pointer-events-none">
          <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
          Bus is live
        </div>
      ) : null}

      {/* Legend overlay */}
      {originCoords && destCoords && (
        <div className="absolute bottom-4 left-4 z-[1000] flex flex-col gap-1.5 bg-white border border-neutral-200 rounded-xl shadow-md px-3.5 py-3">
          <div className="flex items-center gap-2 text-[11px] text-neutral-600">
            <span className="w-3 h-3 rounded-full bg-blue-500 shrink-0 border-2 border-white shadow" />
            <span className="font-semibold">{originName}</span>
          </div>
          <div className="flex items-center gap-2 text-[11px] text-neutral-600">
            <span className="w-3.5 h-3.5 rounded-full bg-emerald-500 shrink-0 border-2 border-white shadow" />
            <span className="font-semibold">{destName}</span>
          </div>
          {driverId && (
            <div className="flex items-center gap-2 text-[11px] text-neutral-600">
              <span className="w-3.5 h-3.5 rounded-full bg-[#6e54ff] shrink-0 border-2 border-white shadow" />
              <span className="font-semibold">Your bus</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
