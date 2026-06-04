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

interface ActiveDriver {
  id: string;
  full_name: string;
  bus_number: string;
  latitude: number | null;
  longitude: number | null;
  ride_status: string;
}

interface SOSAlert {
  id: string;
  driver_id: string;
  type: string;
  latitude: number | null;
  longitude: number | null;
  active: boolean;
}

const makeBusIcon = (busNumber: string, isReturning: boolean) => L.divIcon({
  className: 'admin-bus-marker',
  html: `<div style="
    background:${isReturning ? '#10b981' : '#3b82f6'};
    border:2.5px solid white;border-radius:50%;
    width:38px;height:38px;display:flex;align-items:center;
    justify-content:center;flex-direction:column;
    box-shadow:0 3px 10px rgba(0,0,0,0.25);position:relative;
  ">
    <svg style="width:18px;height:18px;fill:white;" viewBox="0 0 24 24">
      <path d="M18.92 6.01C18.72 5.42 18.16 5 17.5 5H6.5c-.66 0-1.21.42-1.42 1.01L3 12v8c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h12v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-8l-2.08-5.99zM6.5 16c-.83 0-1.5-.67-1.5-1.5S5.67 13 6.5 13s1.5.67 1.5 1.5S7.33 16 6.5 16zm11 0c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zM5 11l1.5-4.5h11L19 11H5z"/>
    </svg>
    <div style="position:absolute;bottom:-16px;left:50%;transform:translateX(-50%);
      background:white;border:1px solid #e5e7eb;border-radius:4px;padding:1px 4px;
      font-size:9px;font-weight:800;color:#374151;white-space:nowrap;box-shadow:0 1px 3px rgba(0,0,0,0.1);">
      ${busNumber}
    </div>
  </div>`,
  iconSize: [38, 38],
  iconAnchor: [19, 19],
});

const sosIcon = L.divIcon({
  className: 'sos-admin-marker',
  html: `<div style="
    width:48px;height:48px;background:#dc2626;border:3px solid white;
    border-radius:50%;display:flex;align-items:center;justify-content:center;
    font-size:22px;box-shadow:0 0 0 8px rgba(220,38,38,0.25);
    animation:sos-pulse 1s infinite;
  ">🆘</div>
  <style>@keyframes sos-pulse{0%,100%{box-shadow:0 0 0 8px rgba(220,38,38,0.25)}50%{box-shadow:0 0 0 18px rgba(220,38,38,0.08)}}</style>`,
  iconSize: [48, 48],
  iconAnchor: [24, 24],
});

const animateMarker = (marker: L.Marker, to: L.LatLng) => {
  const from = marker.getLatLng();
  const start = performance.now();
  const step = (now: number) => {
    const t = Math.min((now - start) / 800, 1);
    const ease = 1 - Math.pow(1 - t, 3);
    marker.setLatLng([from.lat + (to.lat - from.lat) * ease, from.lng + (to.lng - from.lng) * ease]);
    if (t < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
};

export const AdminMap: React.FC = () => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const busMarkersRef = useRef<Map<string, L.Marker>>(new Map());
  const routeLinesRef = useRef<Map<string, L.Polyline>>(new Map());
  const sosMarkersRef = useRef<Map<string, L.Marker>>(new Map());
  const driverStatusRef = useRef<Map<string, string>>(new Map());
  const [sosAlerts, setSosAlerts] = useState<SOSAlert[]>([]);
  const [activeDrivers, setActiveDrivers] = useState<ActiveDriver[]>([]);

  // Draw route line from driver's current position to their deployment destination
  const drawRouteLine = async (driverId: string, lat: number, lng: number, rideStatus: string) => {
    if (!mapInstanceRef.current) return;

    // Remove old line for this driver
    const old = routeLinesRef.current.get(driverId);
    if (old) { old.remove(); routeLinesRef.current.delete(driverId); }

    // Get the driver's active deployment to find destination coords
    const { data: driver } = await supabase
      .from('drivers')
      .select('active_deployment_id, bus_number')
      .eq('id', driverId)
      .single();

    if (!driver?.active_deployment_id) return;

    // Get deployment bus location (origin terminal) and primary location (Lagos)
    const [{ data: primaryLocs }, { data: busList }] = await Promise.all([
      supabase.from('locations').select('latitude, longitude').eq('type', 'primary').limit(1),
      supabase.from('deployment_buses')
        .select('locations(latitude, longitude)')
        .eq('deployment_id', driver.active_deployment_id)
        .limit(1),
    ]);

    const primary = primaryLocs?.[0];
    const busLoc = (busList?.[0] as any)?.locations;
    if (!primary || !busLoc) return;

    // Enroute → going to origin terminal (Rivers). Returning → going back to Lagos
    const dest = rideStatus === 'enroute'
      ? { lat: busLoc.latitude, lng: busLoc.longitude }
      : { lat: primary.latitude, lng: primary.longitude };

    const color = rideStatus === 'returning' ? '#10b981' : '#3b82f6';

    const osrmUrl = `https://router.project-osrm.org/route/v1/driving/${lng},${lat};${dest.lng},${dest.lat}?overview=full&geometries=geojson`;

    let cancelled = false;
    fetch(osrmUrl).then(r => r.json()).then(data => {
      if (cancelled || !mapInstanceRef.current) return;
      let points: [number, number][];
      if (data.code === 'Ok' && data.routes?.[0]?.geometry?.coordinates?.length) {
        points = data.routes[0].geometry.coordinates.map(([lo, la]: [number, number]) => [la, lo]);
      } else {
        points = [[lat, lng], [dest.lat, dest.lng]];
      }
      const line = L.polyline(points, { color, weight: 4, opacity: 0.75, dashArray: '8 4' })
        .addTo(mapInstanceRef.current!);
      routeLinesRef.current.set(driverId, line);
    }).catch(() => {});

    return () => { cancelled = true; };
  };

  // Init map
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;
    const container = mapContainerRef.current;
    if ((container as any)._leaflet_id) delete (container as any)._leaflet_id;

    const map = L.map(container, { zoomControl: true }).setView([6.8024, 3.4975], 7);
    mapInstanceRef.current = map;

    L.tileLayer('https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}', {
      maxZoom: 20, attribution: '&copy; Google Maps',
    }).addTo(map);

    const resizeObserver = new ResizeObserver(() => { map.invalidateSize(); });
    resizeObserver.observe(container);

    return () => {
      resizeObserver.disconnect();
      if (mapInstanceRef.current) { mapInstanceRef.current.remove(); mapInstanceRef.current = null; }
      busMarkersRef.current.clear();
      sosMarkersRef.current.clear();
    };
  }, []);

  // Load all active drivers and subscribe to updates
  useEffect(() => {
    const fetchDrivers = async () => {
      const { data } = await supabase
        .from('drivers')
        .select('id, full_name, bus_number, latitude, longitude, ride_status')
        .in('ride_status', ['enroute', 'returning']);

      if (data) {
        setActiveDrivers(data);
        data.forEach(d => {
          if (d.latitude && d.longitude && mapInstanceRef.current) {
            const icon = makeBusIcon(d.bus_number || '?', d.ride_status === 'returning');
            const marker = L.marker([d.latitude, d.longitude], { icon, zIndexOffset: 1000 })
              .addTo(mapInstanceRef.current)
              .bindPopup(`<strong>${d.bus_number}</strong><br/>${d.full_name}<br/>Status: ${d.ride_status}`);
            busMarkersRef.current.set(d.id, marker);
            drawRouteLine(d.id, d.latitude, d.longitude, d.ride_status);
          }
        });
      }
    };

    fetchDrivers();

    // Realtime: driver location & status changes
    const driverChan = supabase.channel('admin-all-drivers')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'drivers' }, (payload) => {
        const d = payload.new as any;
        const isActive = d.ride_status === 'enroute' || d.ride_status === 'returning';

        setActiveDrivers(prev => {
          const exists = prev.find(x => x.id === d.id);
          if (isActive) {
            return exists ? prev.map(x => x.id === d.id ? d : x) : [...prev, d];
          }
          return prev.filter(x => x.id !== d.id);
        });

        if (!mapInstanceRef.current) return;

        if (isActive && d.latitude && d.longitude) {
          const existing = busMarkersRef.current.get(d.id);
          const icon = makeBusIcon(d.bus_number || '?', d.ride_status === 'returning');
          if (existing) {
            existing.setIcon(icon);
            animateMarker(existing, L.latLng(d.latitude, d.longitude));
            existing.setPopupContent(`<strong>${d.bus_number}</strong><br/>${d.full_name}<br/>Status: ${d.ride_status}`);
          } else {
            const marker = L.marker([d.latitude, d.longitude], { icon, zIndexOffset: 1000 })
              .addTo(mapInstanceRef.current)
              .bindPopup(`<strong>${d.bus_number}</strong><br/>${d.full_name}<br/>Status: ${d.ride_status}`);
            busMarkersRef.current.set(d.id, marker);
          }
          // Only re-fetch route when ride_status changes, not on every GPS tick
          const prevStatus = driverStatusRef.current.get(d.id);
          if (prevStatus !== d.ride_status) {
            driverStatusRef.current.set(d.id, d.ride_status);
            drawRouteLine(d.id, d.latitude, d.longitude, d.ride_status);
          }
        } else {
          const existing = busMarkersRef.current.get(d.id);
          if (existing) { existing.remove(); busMarkersRef.current.delete(d.id); }
          const line = routeLinesRef.current.get(d.id);
          if (line) { line.remove(); routeLinesRef.current.delete(d.id); }
        }
      })
      .subscribe();

    // Realtime: SOS alerts
    const fetchSOS = async () => {
      const { data } = await supabase.from('sos_alerts').select('*').eq('active', true);
      if (data) {
        setSosAlerts(data);
        data.forEach(alert => {
          if (alert.latitude && alert.longitude && mapInstanceRef.current) {
            const marker = L.marker([alert.latitude, alert.longitude], { icon: sosIcon, zIndexOffset: 2000 })
              .addTo(mapInstanceRef.current)
              .bindPopup(`<strong>🆘 SOS</strong><br/>${SOS_LABELS[alert.type] ?? alert.type}`);
            sosMarkersRef.current.set(alert.id, marker);
          }
        });
      }
    };
    fetchSOS();

    const sosChan = supabase.channel('admin-sos')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'sos_alerts' }, (payload) => {
        const alert = payload.new as SOSAlert;
        setSosAlerts(prev => [...prev, alert]);
        if (alert.latitude && alert.longitude && mapInstanceRef.current) {
          const marker = L.marker([alert.latitude, alert.longitude], { icon: sosIcon, zIndexOffset: 2000 })
            .addTo(mapInstanceRef.current)
            .bindPopup(`<strong>🆘 SOS</strong><br/>${SOS_LABELS[alert.type] ?? alert.type}`)
            .openPopup();
          sosMarkersRef.current.set(alert.id, marker);
          mapInstanceRef.current.setView([alert.latitude, alert.longitude], 14);
        }
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'sos_alerts' }, (payload) => {
        const alert = payload.new as SOSAlert;
        if (!alert.active) {
          setSosAlerts(prev => prev.filter(a => a.id !== alert.id));
          const marker = sosMarkersRef.current.get(alert.id);
          if (marker) { marker.remove(); sosMarkersRef.current.delete(alert.id); }
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(driverChan);
      supabase.removeChannel(sosChan);
      busMarkersRef.current.forEach(m => m.remove());
      busMarkersRef.current.clear();
      routeLinesRef.current.forEach(l => l.remove());
      routeLinesRef.current.clear();
      sosMarkersRef.current.forEach(m => m.remove());
      sosMarkersRef.current.clear();
    };
  }, []);

  return (
    <div style={{ position: 'absolute', inset: 0 }}>
      <div ref={mapContainerRef} style={{ position: 'absolute', inset: 0, touchAction: 'none' }} />

      {/* SOS banner */}
      {sosAlerts.length > 0 && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[1000] flex flex-col gap-2 pointer-events-none">
          {sosAlerts.map(alert => (
            <div key={alert.id}
              className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-full text-xs font-bold shadow-xl animate-pulse">
              🆘 {SOS_LABELS[alert.type] ?? alert.type} — Driver needs help!
            </div>
          ))}
        </div>
      )}

      {/* Legend */}
      <div className="absolute bottom-4 left-4 z-[1000] bg-white border border-neutral-200 rounded-xl shadow-md px-3.5 py-3 flex flex-col gap-2">
        <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider m-0">Live Fleet</p>
        <div className="flex items-center gap-2 text-[11px] text-neutral-600">
          <span className="w-3 h-3 rounded-full bg-blue-500 shrink-0" /> Outbound
        </div>
        <div className="flex items-center gap-2 text-[11px] text-neutral-600">
          <span className="w-3 h-3 rounded-full bg-emerald-500 shrink-0" /> Returning
        </div>
        <div className="flex items-center gap-2 text-[11px] text-neutral-600">
          <span className="text-sm">🆘</span> SOS Alert
        </div>
        <div className="border-t border-neutral-100 pt-1 mt-1">
          <p className="text-[10px] font-bold text-neutral-500 m-0">{activeDrivers.length} bus{activeDrivers.length !== 1 ? 'es' : ''} active</p>
        </div>
      </div>
    </div>
  );
};
