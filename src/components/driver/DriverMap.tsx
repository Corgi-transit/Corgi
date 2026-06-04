import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import { supabase } from '../../utils/supabase';

interface DriverMapProps {
  driverId: string;
  initialLat: number | null;
  initialLng: number | null;
  onLocationUpdate: (lat: number, lng: number) => void;
  originCoords?: { lat: number; lng: number } | null;
  destCoords?: { lat: number; lng: number } | null;
  rideStatus?: 'idle' | 'enroute' | 'returning' | 'completed' | null;
}

const driverMarkerIcon = typeof window !== 'undefined' ? L.divIcon({
  className: 'driver-location-marker',
  html: `<div style="
    width: 36px;
    height: 36px;
    background-color: #3b82f6;
    border: 2px solid white;
    border-radius: 50%;
    box-shadow: 0 4px 12px rgba(59,130,246,0.45), 0 2px 4px rgba(0,0,0,0.15);
    display: flex;
    align-items: center;
    justify-content: center;
  ">
    <svg style="width: 20px; height: 20px; fill: white;" viewBox="0 0 24 24">
      <path d="M18.92 6.01C18.72 5.42 18.16 5 17.5 5H6.5c-.66 0-1.21.42-1.42 1.01L3 12v8c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h12v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-8l-2.08-5.99zM6.5 16c-.83 0-1.5-.67-1.5-1.5S5.67 13 6.5 13s1.5.67 1.5 1.5S7.33 16 6.5 16zm11 0c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zM5 11l1.5-4.5h11L19 11H5z"/>
    </svg>
  </div>`,
  iconSize: [36, 36],
  iconAnchor: [18, 18],
}) : null;

// Find the index of the route point closest to the driver's current GPS position
const findClosestIndex = (points: [number, number][], lat: number, lng: number): number => {
  let minDist = Infinity;
  let minIdx = 0;
  for (let i = 0; i < points.length; i++) {
    const dlat = points[i][0] - lat;
    const dlng = points[i][1] - lng;
    const dist = dlat * dlat + dlng * dlng;
    if (dist < minDist) { minDist = dist; minIdx = i; }
  }
  return minIdx;
};

export const DriverMap: React.FC<DriverMapProps> = ({
  driverId,
  initialLat,
  initialLng,
  onLocationUpdate,
  originCoords,
  destCoords,
  rideStatus,
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const polylineRef = useRef<L.Polyline | null>(null);
  const routeMarkersRef = useRef<L.Marker[]>([]);
  const watchIdRef = useRef<number | null>(null);
  const lastSaveTimeRef = useRef<number>(0);
  const coordsRef = useRef<{ lat: number; lng: number } | null>(null);
  // Stores all road geometry points for the current leg so the line can shrink as the driver moves
  const fullRoutePointsRef = useRef<[number, number][]>([]);

  const userPanningRef = useRef(false);
  const panResetTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [locationStatus, setLocationStatus] = useState<'loading' | 'success' | 'denied' | 'unavailable' | 'custom'>('custom');
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [isLiveTracking, setIsLiveTracking] = useState(false);

  useEffect(() => { coordsRef.current = coords; }, [coords]);

  const saveLocationToDb = async (lat: number, lng: number) => {
    try {
      const { error } = await supabase
        .from('drivers')
        .update({ latitude: lat, longitude: lng })
        .eq('id', driverId);
      if (error) throw error;
      onLocationUpdate(lat, lng);
      setCoords({ lat, lng });
    } catch (err) {
      console.error('Failed to save location to database:', err);
    }
  };

  // Auto-track GPS while journey is active; shrink route line as driver moves
  useEffect(() => {
    const isActive = rideStatus === 'enroute' || rideStatus === 'returning';

    if (isActive && navigator.geolocation) {
      watchIdRef.current = navigator.geolocation.watchPosition(
        async (position) => {
          const { latitude, longitude } = position.coords;
          const latlng: L.LatLngExpression = [latitude, longitude];

          // Move bus marker
          if (markerRef.current) {
            markerRef.current.setLatLng(latlng);
          }

          setLocationStatus('success');
          setCoords({ lat: latitude, lng: longitude });
          setIsLiveTracking(true);

          // Shrink the route line: trim off the portion already driven
          if (fullRoutePointsRef.current.length > 1 && polylineRef.current) {
            const closestIdx = findClosestIndex(fullRoutePointsRef.current, latitude, longitude);
            const remaining: [number, number][] = [
              [latitude, longitude],
              ...fullRoutePointsRef.current.slice(closestIdx + 1),
            ];
            polylineRef.current.setLatLngs(remaining);
          }

          // Throttle DB writes to every 5 seconds
          const now = Date.now();
          if (now - lastSaveTimeRef.current >= 5000) {
            lastSaveTimeRef.current = now;
            await saveLocationToDb(latitude, longitude);
          }
        },
        (err) => {
          console.warn('watchPosition error:', err.message);
          setIsLiveTracking(false);
        },
        { enableHighAccuracy: true, maximumAge: 0, timeout: 15000 }
      );
    } else {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
      setIsLiveTracking(false);
    }

    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
    };
  }, [rideStatus]);

  const handleLocateMe = () => {
    if (!navigator.geolocation) {
      setLocationStatus('unavailable');
      alert('GPS is not supported by your browser or device.');
      return;
    }
    setLocationStatus('loading');
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        const latlng: L.LatLngExpression = [latitude, longitude];
        if (mapInstanceRef.current) mapInstanceRef.current.setView(latlng, 16);
        if (markerRef.current) {
          markerRef.current.setLatLng(latlng);
        } else if (driverMarkerIcon && mapInstanceRef.current) {
          markerRef.current = L.marker(latlng, { icon: driverMarkerIcon, draggable: false })
            .addTo(mapInstanceRef.current);
        }
        setLocationStatus('success');
        await saveLocationToDb(latitude, longitude);
      },
      (err) => {
        setLocationStatus(err.code === 1 ? 'denied' : 'unavailable');
        alert(err.code === 1 ? 'Location permission was denied.' : 'Unable to retrieve GPS coordinates.');
      },
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 0 }
    );
  };

  // Initialise map once
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;
    const container = mapContainerRef.current;
    if ((container as any)._leaflet_id) delete (container as any)._leaflet_id;

    const hasInitialCoords = typeof initialLat === 'number' && typeof initialLng === 'number';
    const startCenter: [number, number] = hasInitialCoords ? [initialLat!, initialLng!] : [6.8024, 3.4975];
    const map = L.map(container, { zoomControl: true }).setView(startCenter, 14);
    mapInstanceRef.current = map;

    L.tileLayer('https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}', {
      maxZoom: 20, attribution: '&copy; Google Maps'
    }).addTo(map);

    map.on('dragstart', () => {
      userPanningRef.current = true;
      if (panResetTimerRef.current) clearTimeout(panResetTimerRef.current);
    });
    map.on('dragend', () => {
      if (panResetTimerRef.current) clearTimeout(panResetTimerRef.current);
      panResetTimerRef.current = setTimeout(() => { userPanningRef.current = false; }, 5000);
    });

    if (driverMarkerIcon) {
      markerRef.current = L.marker(startCenter, { icon: driverMarkerIcon, draggable: false }).addTo(map);
    }

    if (hasInitialCoords) {
      setCoords({ lat: initialLat!, lng: initialLng! });
    } else {
      setCoords({ lat: startCenter[0], lng: startCenter[1] });
      saveLocationToDb(startCenter[0], startCenter[1]);
    }

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
        markerRef.current = null;
      }
    };
  }, [initialLat, initialLng]);

  // Draw route whenever ride status or endpoints change
  useEffect(() => {
    if (!mapInstanceRef.current) return;

    if (polylineRef.current) { polylineRef.current.remove(); polylineRef.current = null; }
    routeMarkersRef.current.forEach(m => m.remove());
    routeMarkersRef.current = [];
    fullRoutePointsRef.current = [];

    const isActive = rideStatus === 'enroute' || rideStatus === 'returning';
    let cancelled = false;

    if (isActive) {
      const driverPos = coordsRef.current ?? (
        typeof initialLat === 'number' && typeof initialLng === 'number'
          ? { lat: initialLat, lng: initialLng } : null
      );
      const endpoint = rideStatus === 'enroute' ? originCoords : destCoords;
      if (!driverPos || !endpoint) return;

      const lineColor = rideStatus === 'returning' ? '#10b981' : '#3b82f6';
      const driverLatlng: [number, number] = [driverPos.lat, driverPos.lng];
      const endLatlng: [number, number] = [endpoint.lat, endpoint.lng];

      const destMarker = L.marker(endLatlng, {
        icon: L.divIcon({
          className: 'route-dest-marker',
          html: `<div style="width: 16px; height: 16px; background: ${lineColor}; border: 2px solid white; border-radius: 50%; box-shadow: 0 2px 6px rgba(0,0,0,0.3);"></div>`
        })
      }).addTo(mapInstanceRef.current!).bindPopup(rideStatus === 'enroute' ? 'Drop-off terminal' : 'Back to Lagos');
      routeMarkersRef.current = [destMarker];

      const drawPolyline = (points: [number, number][]) => {
        if (cancelled || !mapInstanceRef.current) return;
        fullRoutePointsRef.current = points;
        const poly = L.polyline(points, { color: lineColor, weight: 5, opacity: 0.85 })
          .addTo(mapInstanceRef.current);
        polylineRef.current = poly;
        if (!userPanningRef.current) mapInstanceRef.current.setView(driverLatlng, 13);
      };

      fetch(
        `https://router.project-osrm.org/route/v1/driving/` +
        `${driverPos.lng},${driverPos.lat};${endpoint.lng},${endpoint.lat}` +
        `?overview=full&geometries=geojson`
      )
        .then(r => r.json())
        .then(data => {
          if (cancelled) return;
          if (data.code === 'Ok' && data.routes?.[0]?.geometry?.coordinates?.length) {
            drawPolyline(data.routes[0].geometry.coordinates.map(([lng, lat]: [number, number]) => [lat, lng]));
          } else {
            drawPolyline([driverLatlng, endLatlng]);
          }
        })
        .catch(() => { if (!cancelled) drawPolyline([driverLatlng, endLatlng]); });

    } else {
      if (!originCoords || !destCoords) return;
      const latlng1: [number, number] = [originCoords.lat, originCoords.lng];
      const latlng2: [number, number] = [destCoords.lat, destCoords.lng];

      routeMarkersRef.current = [
        L.marker(latlng1, { icon: L.divIcon({ className: 'route-origin-marker', html: `<div style="width:12px;height:12px;background:#3b82f6;border:2px solid white;border-radius:50%;"></div>` }) })
          .addTo(mapInstanceRef.current!).bindPopup('Pickup terminal'),
        L.marker(latlng2, { icon: L.divIcon({ className: 'route-dest-marker', html: `<div style="width:16px;height:16px;background:#10b981;border:2px solid white;border-radius:50%;"></div>` }) })
          .addTo(mapInstanceRef.current!).bindPopup('Destination'),
      ];

      const drawStatic = (points: [number, number][]) => {
        if (cancelled || !mapInstanceRef.current) return;
        const poly = L.polyline(points, { color: '#3b82f6', weight: 5, opacity: 0.85 }).addTo(mapInstanceRef.current);
        polylineRef.current = poly;
        if (!userPanningRef.current) mapInstanceRef.current.fitBounds(poly.getBounds(), { padding: [40, 40] });
      };

      fetch(
        `https://router.project-osrm.org/route/v1/driving/` +
        `${originCoords.lng},${originCoords.lat};${destCoords.lng},${destCoords.lat}` +
        `?overview=full&geometries=geojson`
      )
        .then(r => r.json())
        .then(data => {
          if (cancelled) return;
          if (data.code === 'Ok' && data.routes?.[0]?.geometry?.coordinates?.length) {
            drawStatic(data.routes[0].geometry.coordinates.map(([lng, lat]: [number, number]) => [lat, lng]));
          } else {
            drawStatic([latlng1, latlng2]);
          }
        })
        .catch(() => { if (!cancelled) drawStatic([latlng1, latlng2]); });
    }

    return () => { cancelled = true; };
  }, [originCoords, destCoords, rideStatus, initialLat, initialLng]);

  return (
    <div className="relative w-full h-full" style={{ minHeight: 0 }}>
      <div ref={mapContainerRef} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }} />

      {isLiveTracking && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[1000] flex items-center gap-1.5 px-3 py-1.5 bg-red-600 text-white rounded-full text-xs font-bold shadow-lg pointer-events-none">
          <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
          LIVE
        </div>
      )}

<div className="absolute bottom-4 left-4 z-[1000] flex flex-col gap-2">
        <span className="inline-flex items-center gap-1.5 text-[10px] font-semibold px-2.5 py-1.5 rounded-full shadow bg-white border border-neutral-200 text-neutral-600">
          <span className={`w-1.5 h-1.5 rounded-full ${
            isLiveTracking ? 'bg-green-500 animate-pulse' :
            locationStatus === 'success' ? 'bg-green-500' :
            locationStatus === 'loading' ? 'bg-blue-500 animate-pulse' : 'bg-neutral-400'
          }`} />
          {coords ? `${coords.lat.toFixed(4)}, ${coords.lng.toFixed(4)}` : 'Unset'}
        </span>

        {!isLiveTracking && (
          <button
            type="button"
            onClick={handleLocateMe}
            className="flex items-center gap-1.5 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg shadow-md text-xs font-semibold border-none cursor-pointer transition-all duration-150"
          >
            <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
              <path d="M12 8c-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4-1.79-4-4-4zm8.94 3c-.46-4.17-3.77-7.48-7.94-7.94V1h-2v2.06C6.83 3.52 3.52 6.83 3.06 11H1v2h2.06c.46 4.17 3.77 7.48 7.94 7.94V23h-2v-2.06c-4.17-.46-7.48-3.77-7.94-7.94H23v-2h-2.06zM12 19c-3.87 0-7-3.13-7-7s3.13-7 7-7 7 3.13 7 7-3.13 7-7 7z"/>
            </svg>
            {locationStatus === 'loading' ? 'Locating...' : 'Use my current GPS'}
          </button>
        )}
      </div>
    </div>
  );
};
