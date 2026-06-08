import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../../utils/supabase';
import { Alert } from '../ui/alert';
import { Button } from '../ui/button';
import L from 'leaflet';
import { AdminMap } from './AdminMap';

const NIGERIAN_STATES = [
  'Abia', 'Adamawa', 'Akwa Ibom', 'Anambra', 'Bauchi', 'Bayelsa',
  'Benue', 'Borno', 'Cross River', 'Delta', 'Ebonyi', 'Edo',
  'Ekiti', 'Enugu', 'FCT Abuja', 'Gombe', 'Imo', 'Jigawa',
  'Kaduna', 'Kano', 'Katsina', 'Kebbi', 'Kogi', 'Kwara',
  'Lagos', 'Nasarawa', 'Niger', 'Ogun', 'Ondo', 'Osun',
  'Oyo', 'Plateau', 'Rivers', 'Sokoto', 'Taraba', 'Yobe', 'Zamfara'
];

const STATE_COORDINATES: Record<string, [number, number]> = {
  'Abia': [5.5242, 7.4898],
  'Adamawa': [9.3265, 12.3984],
  'Akwa Ibom': [5.0389, 7.9098],
  'Anambra': [6.2104, 7.0699],
  'Bauchi': [10.3158, 9.8442],
  'Bayelsa': [4.9757, 6.2649],
  'Benue': [7.3356, 8.7403],
  'Borno': [11.8311, 13.1510],
  'Cross River': [5.7889, 8.5674],
  'Delta': [5.5320, 5.8987],
  'Ebonyi': [6.2649, 8.0137],
  'Edo': [6.3350, 5.6037],
  'Ekiti': [7.6300, 5.2192],
  'Enugu': [6.4584, 7.5483],
  'FCT Abuja': [9.0578, 7.4951],
  'Gombe': [10.2792, 11.1686],
  'Imo': [5.4891, 7.0176],
  'Jigawa': [12.1646, 9.7865],
  'Kaduna': [10.5105, 7.4165],
  'Kano': [12.0022, 8.5919],
  'Katsina': [12.9808, 7.6006],
  'Kebbi': [11.4942, 4.1950],
  'Kogi': [7.7337, 6.6906],
  'Kwara': [8.4799, 4.5418],
  'Lagos': [6.5244, 3.3792],
  'Nasarawa': [8.5475, 7.7027],
  'Niger': [9.5836, 6.5463],
  'Ogun': [7.1475, 3.3619],
  'Ondo': [7.2504, 5.2103],
  'Osun': [7.5629, 4.5200],
  'Oyo': [7.3775, 3.9470],
  'Plateau': [9.9309, 8.8916],
  'Rivers': [4.8156, 7.0498],
  'Port Harcourt': [4.8156, 7.0498],
  'Sokoto': [13.0627, 5.2439],
  'Taraba': [8.8932, 11.3596],
  'Yobe': [12.0000, 11.5000],
  'Zamfara': [12.1702, 6.6600]
};

const customMarkerIcon = typeof window !== 'undefined' ? L.divIcon({
  className: 'custom-leaflet-marker',
  html: `<div style="
    width: 14px;
    height: 14px;
    background-color: #a855f7;
    border: 2px solid white;
    border-radius: 50%;
    box-shadow: 0 0 6px rgba(0,0,0,0.3);
  "></div>`,
  iconSize: [14, 14],
  iconAnchor: [7, 7]
}) : null;

interface Location {
  id: string;
  name: string;
  type: 'primary' | 'secondary' | 'sub-secondary';
  parent_id?: string | null;
  created_at: string;
  latitude?: number | null;
  longitude?: number | null;
}

interface AdminConsoleProps {
  adminUser: any;
  onSignOut: () => void;
}

interface AdminMember {
  user_id: string;
  email: string;
  created_at: string;
  is_primary?: boolean;
}

interface AdminInvite {
  email: string;
  created_at: string;
}

export const AdminConsole: React.FC<AdminConsoleProps> = ({ adminUser, onSignOut }) => {
  // Determine if user has already onboarded from Supabase metadata
  const [isOnboarded, setIsOnboarded] = useState<boolean>(
    !!adminUser.user_metadata?.onboarded
  );

  // Onboarding wizard states
  const [onboardingStep, setOnboardingStep] = useState(1);
  const [onboardingName, setOnboardingName] = useState(adminUser.user_metadata?.full_name || '');
  const [onboardingPhone, setOnboardingPhone] = useState(adminUser.user_metadata?.phone || '');
  const [onboardingError, setOnboardingError] = useState<string | null>(null);
  const [onboardingLoading, setOnboardingLoading] = useState(false);

  // Core Dashboard states
  const [activeTab, setActiveTab] = useState<'livemap' | 'nodes' | 'drivers' | 'deployments' | 'settings'>('livemap');
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  // System Settings states
  const [totalBusesInput, setTotalBusesInput] = useState<string>('100');
  const [settingsLoading, setSettingsLoading] = useState<boolean>(false);
  const [settingsError, setSettingsError] = useState<string | null>(null);
  const [settingsSuccessMsg, setSettingsSuccessMsg] = useState<string | null>(null);
  const [admins, setAdmins] = useState<AdminMember[]>([]);
  const [pendingAdminInvites, setPendingAdminInvites] = useState<AdminInvite[]>([]);
  const [newAdminEmail, setNewAdminEmail] = useState('');
  const [adminInviteLoading, setAdminInviteLoading] = useState(false);
  const [locations, setLocations] = useState<Location[]>([]);
  const [deployments, setDeployments] = useState<any[]>([]);
  const [loadingDeployments, setLoadingDeployments] = useState(false);
  const [deploymentBookings, setDeploymentBookings] = useState<any[]>([]);
  const [isCreateDeploymentOpen, setIsCreateDeploymentOpen] = useState(false);
  const [newDepName, setNewDepName] = useState('');
  const [newDepRegStart, setNewDepRegStart] = useState('');
  const [newDepRegEnd, setNewDepRegEnd] = useState('');
  const [newDepDeparture, setNewDepDeparture] = useState('');
  const [assignedBuses, setAssignedBuses] = useState<{ [locationId: string]: string }>({});
  const [selectedAllocationLoc, setSelectedAllocationLoc] = useState<string>('');
  const [allocationBusesInput, setAllocationBusesInput] = useState<string>('');
  const [createDepError, setCreateDepError] = useState<string | null>(null);
  const [createDepLoading, setCreateDepLoading] = useState(false);
  const [drivers, setDrivers] = useState<any[]>([]);
  const [loadingDrivers, setLoadingDrivers] = useState(false);
  const [newLocName, setNewLocName] = useState('');
  const [customLocName, setCustomLocName] = useState('');
  const [newLocType, setNewLocType] = useState<'primary' | 'secondary' | 'sub-secondary'>('secondary');
  const [newLocParentId, setNewLocParentId] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isAddLocationOpen, setIsAddLocationOpen] = useState(false);
  const [locationToDelete, setLocationToDelete] = useState<{ id: string, name: string } | null>(null);
  const [pickedCoords, setPickedCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [isMapExpanded, setIsMapExpanded] = useState(false);

  const mapRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const expandedMapRef = useRef<L.Map | null>(null);
  const expandedMarkerRef = useRef<L.Marker | null>(null);

  // Fetch approved locations from Supabase
  const fetchLocations = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error } = await supabase
        .from('locations')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setLocations(data || []);
    } catch (err: any) {
      setError(err.message || 'Failed to load approved locations.');
    } finally {
      setLoading(false);
    }
  };

  // Fetch registered drivers from Supabase
  const fetchDrivers = async () => {
    setLoadingDrivers(true);
    setError(null);
    try {
      const { data, error } = await supabase
        .from('drivers')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setDrivers(data || []);
    } catch (err: any) {
      setError(err.message || 'Failed to load registered drivers.');
    } finally {
      setLoadingDrivers(false);
    }
  };

  // Update driver approval status
  const handleUpdateDriverStatus = async (id: string, newStatus: 'approved' | 'rejected') => {
    setActionLoading(true);
    setError(null);
    try {
      const { error } = await supabase
        .from('drivers')
        .update({ status: newStatus })
        .eq('id', id);

      if (error) throw error;
      fetchDrivers();
    } catch (err: any) {
      setError(err.message || `Failed to set driver status to ${newStatus}.`);
    } finally {
      setActionLoading(false);
    }
  };

  // Fetch system settings from Supabase
  const fetchSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('settings')
        .select('value')
        .eq('key', 'total_buses')
        .maybeSingle();

      if (error) throw error;
      if (data) {
        setTotalBusesInput(data.value);
      }
    } catch (err: any) {
      console.error('Failed to load settings:', err);
    }
  };

  const fetchAdminAccess = async () => {
    try {
      const [adminsRes, invitesRes] = await Promise.all([
        supabase.rpc('list_admins'),
        supabase.rpc('list_pending_admin_invites'),
      ]);

      if (adminsRes.error) throw adminsRes.error;
      if (invitesRes.error) throw invitesRes.error;

      setAdmins((adminsRes.data as AdminMember[]) || []);
      setPendingAdminInvites((invitesRes.data as AdminInvite[]) || []);
    } catch (err: any) {
      console.error('Failed to load administrators:', err);
    }
  };

  const handleInviteAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAdminInviteLoading(true);
    setSettingsError(null);
    setSettingsSuccessMsg(null);

    try {
      const { data, error } = await supabase.rpc('invite_admin_by_email', {
        p_email: newAdminEmail.trim(),
      });

      if (error) throw error;

      const result = data as { status: 'granted' | 'pending'; email: string };
      if (result.status === 'granted') {
        setSettingsSuccessMsg(
          `${result.email} now has administrator access and can sign in to the console.`
        );
      } else {
        setSettingsSuccessMsg(
          `Invitation saved for ${result.email}. They will receive admin access when they create an account with that email.`
        );
      }

      setNewAdminEmail('');
      await fetchAdminAccess();
    } catch (err: any) {
      setSettingsError(err.message || 'Failed to add administrator.');
    } finally {
      setAdminInviteLoading(false);
    }
  };

  const handleRemoveAdminInvite = async (email: string) => {
    setSettingsError(null);
    setSettingsSuccessMsg(null);

    try {
      const { error } = await supabase.rpc('remove_admin_invite', { p_email: email });
      if (error) throw error;
      setSettingsSuccessMsg(`Removed pending invite for ${email}.`);
      await fetchAdminAccess();
    } catch (err: any) {
      setSettingsError(err.message || 'Failed to remove invite.');
    }
  };

  const handleRemoveAdmin = async (email: string) => {
    if (!window.confirm(`Remove administrator access for ${email}?`)) {
      return;
    }

    setSettingsError(null);
    setSettingsSuccessMsg(null);

    try {
      const { data, error } = await supabase.rpc('remove_admin_by_email', { p_email: email });
      if (error) throw error;

      const result = data as { status: 'removed' | 'cleared'; email: string };
      setSettingsSuccessMsg(
        result.status === 'removed'
          ? `${result.email} no longer has administrator access.`
          : `Cleared admin access and invites for ${result.email}.`
      );
      await fetchAdminAccess();
    } catch (err: any) {
      setSettingsError(err.message || 'Failed to remove administrator.');
    }
  };

  // Save system settings to Supabase
  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSettingsLoading(true);
    setSettingsError(null);
    setSettingsSuccessMsg(null);

    try {
      const { error } = await supabase
        .from('settings')
        .upsert({ key: 'total_buses', value: totalBusesInput.trim() });

      if (error) throw error;
      setSettingsSuccessMsg('Settings saved successfully.');
    } catch (err: any) {
      setSettingsError(err.message || 'Failed to save settings.');
    } finally {
      setSettingsLoading(false);
    }
  };

  // Fetch deployments and associated bookings
  const fetchDeployments = async () => {
    setLoadingDeployments(true);
    try {
      const { data: depData, error: depError } = await supabase
        .from('deployments')
        .select(`
          *,
          deployment_buses (
            id,
            bus_number,
            location_id,
            locations (
              id,
              name
            )
          )
        `)
        .order('created_at', { ascending: false });

      if (depError) throw depError;
      setDeployments(depData || []);

      const { data: bookData, error: bookError } = await supabase
        .from('passenger_bookings')
        .select(`
          *,
          passengers (
            id,
            full_name,
            email,
            phone
          ),
          deployment_buses (
            bus_number,
            locations (
              name
            )
          )
        `);
      if (bookError) throw bookError;
      setDeploymentBookings(bookData || []);
    } catch (err: any) {
      console.error('Failed to fetch deployments:', err);
    } finally {
      setLoadingDeployments(false);
    }
  };

  // Create a new transit deployment event
  const handleCreateDeployment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDepName.trim() || !newDepRegStart || !newDepRegEnd || !newDepDeparture) {
      setCreateDepError('All fields are required.');
      return;
    }

    setCreateDepLoading(true);
    setCreateDepError(null);

    try {
      const { data: depData, error: depError } = await supabase
        .from('deployments')
        .insert({
          name: newDepName.trim(),
          registration_start: newDepRegStart,
          registration_end: newDepRegEnd,
          departure_time: newDepDeparture
        })
        .select()
        .single();

      if (depError) throw depError;
      const deploymentId = depData.id;

      const busRows: any[] = [];
      Object.entries(assignedBuses).forEach(([locationId, busesStr]) => {
        if (!busesStr.trim()) return;
        const buses = busesStr
          .split(',')
          .map(b => b.trim())
          .filter(b => b.length > 0);

        buses.forEach(busNum => {
          let formattedBus = busNum;
          if (!busNum.toLowerCase().startsWith('bus')) {
            formattedBus = `Bus ${busNum}`;
          }
          busRows.push({
            deployment_id: deploymentId,
            location_id: locationId,
            bus_number: formattedBus
          });
        });
      });

      if (busRows.length > 0) {
        const { error: busError } = await supabase
          .from('deployment_buses')
          .insert(busRows);

        if (busError) throw busError;
      }

      setNewDepName('');
      setNewDepRegStart('');
      setNewDepRegEnd('');
      setNewDepDeparture('');
      setAssignedBuses({});
      setSelectedAllocationLoc('');
      setAllocationBusesInput('');
      setIsCreateDeploymentOpen(false);
      fetchDeployments();
    } catch (err: any) {
      setCreateDepError(err.message || 'Failed to create deployment.');
    } finally {
      setCreateDepLoading(false);
    }
  };

  // Delete an existing deployment
  const handleDeleteDeployment = async (id: string) => {
    if (!confirm('Are you sure you want to delete this deployment? This will cancel all bookings.')) return;
    try {
      const { error } = await supabase
        .from('deployments')
        .delete()
        .eq('id', id);
      if (error) throw error;
      fetchDeployments();
    } catch (err: any) {
      alert(err.message || 'Failed to delete deployment.');
    }
  };

  useEffect(() => {
    if (isOnboarded) {
      fetchLocations();
      fetchDrivers();
      fetchSettings();
      fetchAdminAccess();
      fetchDeployments();
    }
  }, [isOnboarded]);

  // Onboarding: Save profile metadata
  const handleOnboardingStep1 = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!onboardingName.trim() || !onboardingPhone.trim()) return;

    setOnboardingLoading(true);
    setOnboardingError(null);
    try {
      // 1. Update user profile details in Supabase Auth
      const { error } = await supabase.auth.updateUser({
        data: {
          full_name: onboardingName.trim(),
          phone: onboardingPhone.trim()
        }
      });

      if (error) throw error;

      // 2. Query to check if the primary base location is already set in the database
      const { data: existingBases, error: dbError } = await supabase
        .from('locations')
        .select('id')
        .eq('type', 'primary')
        .limit(1);

      if (dbError) throw dbError;

      if (existingBases && existingBases.length > 0) {
        // A primary base location (Lagos) is already set. This is a subsequent admin.
        // We skip step 2 and step 3 entirely, completing onboarding.
        const { error: onboardMetaError } = await supabase.auth.updateUser({
          data: { onboarded: true }
        });
        if (onboardMetaError) throw onboardMetaError;
        setIsOnboarded(true);
      } else {
        // No primary base exists yet. This is the very first admin who must configure the bases.
        setOnboardingStep(2);
      }
    } catch (err: any) {
      setOnboardingError(err.message || 'Failed to update admin profile details.');
    } finally {
      setOnboardingLoading(false);
    }
  };

  // Onboarding: Populate default base locations
  const handleOnboardingStep2 = async () => {
    setOnboardingLoading(true);
    setOnboardingError(null);
    try {
      const defaultLocations = [
        { name: 'Lagos', type: 'primary', latitude: 6.5244, longitude: 3.3792 },
        { name: 'Port Harcourt', type: 'secondary', latitude: 4.8156, longitude: 7.0498 }
      ];

      const { error } = await supabase.from('locations').insert(defaultLocations);

      // If error is unique constraint, it means they are already created, which is fine!
      if (error && !error.message.includes('unique')) {
        throw error;
      }

      setOnboardingStep(3);
    } catch (err: any) {
      setOnboardingError(err.message || 'Failed to initialize default locations. Make sure table "locations" exists.');
    } finally {
      setOnboardingLoading(false);
    }
  };

  // Seed default Lagos and Port Harcourt locations (useful if DB was cleared)
  const handleSeedDefaults = async () => {
    setActionLoading(true);
    setError(null);
    try {
      const defaultLocations = [
        { name: 'Lagos', type: 'primary', latitude: 6.5244, longitude: 3.3792 },
        { name: 'Port Harcourt', type: 'secondary', latitude: 4.8156, longitude: 7.0498 }
      ];

      const { error } = await supabase.from('locations').insert(defaultLocations);
      if (error) throw error;
      fetchLocations();
    } catch (err: any) {
      setError(err.message || 'Failed to seed default locations.');
    } finally {
      setActionLoading(false);
    }
  };

  // Onboarding: Complete wizard
  const handleOnboardingComplete = async () => {
    setOnboardingLoading(true);
    setOnboardingError(null);
    try {
      const { error } = await supabase.auth.updateUser({
        data: {
          onboarded: true
        }
      });

      if (error) throw error;

      // Update local state to toggle to Dashboard view
      setIsOnboarded(true);
    } catch (err: any) {
      setOnboardingError(err.message || 'Failed to finalize onboarding.');
    } finally {
      setOnboardingLoading(false);
    }
  };

  // Initialize Leaflet Map when side panel is opened
  useEffect(() => {
    if (!isAddLocationOpen) {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
      markerRef.current = null;
      return;
    }

    // Fix browser/React state out-of-sync select dropdown bug
    const hasPrimary = locations.some(loc => loc.type === 'primary');
    setNewLocType(hasPrimary ? 'secondary' : 'primary');
    setNewLocParentId('');

    const timer = setTimeout(() => {
      const container = document.getElementById('add-location-map');
      if (!container) return;

      const defaultCoords: [number, number] = [6.8024, 3.4975]; // RCCG Redemption Camp
      const map = L.map('add-location-map').setView(defaultCoords, 14);
      mapRef.current = map;

      // Use Google Maps roadmap tiles to show detailed roads, popular landmarks, stores, and labels
      L.tileLayer('https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}', {
        maxZoom: 20,
        attribution: '&copy; Google Maps'
      }).addTo(map);

      // Handle map clicks to pick custom coordinates
      map.on('click', (e) => {
        const { lat, lng } = e.latlng;
        setPickedCoords({ lat, lng });

        if (markerRef.current) {
          markerRef.current.setLatLng(e.latlng);
        } else if (customMarkerIcon) {
          markerRef.current = L.marker(e.latlng, { icon: customMarkerIcon }).addTo(map);
        }
      });
    }, 350); // wait for panel slide-in animation

    return () => {
      clearTimeout(timer);
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
      markerRef.current = null;
    };
  }, [isAddLocationOpen]);

  // Update map view and set coordinates when the admin selects a state from the dropdown
  useEffect(() => {
    if (!newLocName || !mapRef.current) return;
    if (newLocName === 'custom') return;
    const coords = STATE_COORDINATES[newLocName];
    if (coords) {
      const latLng = { lat: coords[0], lng: coords[1] };
      setPickedCoords(latLng);
      mapRef.current.setView(coords, 10);

      if (markerRef.current) {
        markerRef.current.setLatLng(latLng);
      } else if (customMarkerIcon) {
        markerRef.current = L.marker(latLng, { icon: customMarkerIcon }).addTo(mapRef.current);
      }
    }
  }, [newLocName]);

  // Reset customLocName if newLocName is changed to something else
  useEffect(() => {
    if (newLocName !== 'custom') {
      setCustomLocName('');
    }
  }, [newLocName]);

  // When parent state is selected for sub-locations, pan map to that state
  useEffect(() => {
    if (!newLocParentId || !mapRef.current) return;
    const parentLoc = locations.find(l => l.id === newLocParentId);
    if (!parentLoc) return;

    const coords: [number, number] | undefined =
      STATE_COORDINATES[parentLoc.name] ??
      (parentLoc.latitude && parentLoc.longitude
        ? [parentLoc.latitude, parentLoc.longitude]
        : undefined);

    if (coords) {
      mapRef.current.setView(coords, 10);
      // Clear any previous pinpoint so user can freshly click within this state
      setPickedCoords(null);
      if (markerRef.current) {
        markerRef.current.remove();
        markerRef.current = null;
      }
    }
  }, [newLocParentId]);

  // Synchronize drawer map marker when pickedCoords changes (e.g. from expanded map)
  useEffect(() => {
    if (!mapRef.current || !pickedCoords) return;

    if (markerRef.current) {
      markerRef.current.setLatLng(pickedCoords);
    } else if (customMarkerIcon) {
      markerRef.current = L.marker(pickedCoords, { icon: customMarkerIcon }).addTo(mapRef.current);
    }
  }, [pickedCoords]);

  // Initialize Expanded Leaflet Map when modal is opened
  useEffect(() => {
    if (!isMapExpanded) {
      if (expandedMapRef.current) {
        expandedMapRef.current.remove();
        expandedMapRef.current = null;
      }
      expandedMarkerRef.current = null;
      return;
    }

    const timer = setTimeout(() => {
      const container = document.getElementById('expanded-location-map');
      if (!container) return;

      const centerCoords: [number, number] = pickedCoords
        ? [pickedCoords.lat, pickedCoords.lng]
        : [6.8024, 3.4975]; // RCCG Redemption Camp fallback
      const zoom = pickedCoords ? 12 : 14;

      const map = L.map('expanded-location-map').setView(centerCoords, zoom);
      expandedMapRef.current = map;

      // Use Google Maps roadmap tiles to show detailed roads, popular landmarks, stores, and labels
      L.tileLayer('https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}', {
        maxZoom: 20,
        attribution: '&copy; Google Maps'
      }).addTo(map);

      // Add marker if coordinates exist
      if (pickedCoords && customMarkerIcon) {
        expandedMarkerRef.current = L.marker(centerCoords, { icon: customMarkerIcon }).addTo(map);
      }

      // Handle map clicks to pick custom coordinates
      map.on('click', (e) => {
        const { lat, lng } = e.latlng;
        setPickedCoords({ lat, lng });

        if (expandedMarkerRef.current) {
          expandedMarkerRef.current.setLatLng(e.latlng);
        } else if (customMarkerIcon) {
          expandedMarkerRef.current = L.marker(e.latlng, { icon: customMarkerIcon }).addTo(map);
        }
      });
    }, 100);

    return () => {
      clearTimeout(timer);
      if (expandedMapRef.current) {
        expandedMapRef.current.remove();
        expandedMapRef.current = null;
      }
      expandedMarkerRef.current = null;
    };
  }, [isMapExpanded]);

  // Add a new approved location (Dashboard)
  const handleAddLocation = async (e: React.FormEvent) => {
    e.preventDefault();
    const finalName = newLocType === 'sub-secondary'
      ? customLocName.trim()
      : newLocName === 'custom' ? customLocName.trim() : newLocName.trim();
    if (!finalName) return;

    setActionLoading(true);
    setError(null);
    try {
      const { error } = await supabase.from('locations').insert([
        {
          name: finalName,
          type: newLocType,
          parent_id: newLocType === 'sub-secondary' && newLocParentId ? newLocParentId : null,
          latitude: pickedCoords?.lat ?? null,
          longitude: pickedCoords?.lng ?? null
        }
      ]);

      if (error) throw error;

      setNewLocName('');
      setCustomLocName('');
      setNewLocParentId('');
      setPickedCoords(null);
      setIsAddLocationOpen(false);
      fetchLocations();
    } catch (err: any) {
      setError(err.message || 'Failed to add location.');
    } finally {
      setActionLoading(false);
    }
  };

  // Trigger custom delete modal
  const handleDeleteLocation = (id: string, name: string) => {
    setLocationToDelete({ id, name });
  };

  // Execute deletion upon modal confirmation
  const confirmDeleteLocation = async () => {
    if (!locationToDelete) return;

    setActionLoading(true);
    setError(null);
    try {
      const { error } = await supabase.from('locations').delete().eq('id', locationToDelete.id);
      if (error) throw error;

      setLocationToDelete(null);
      fetchLocations();
    } catch (err: any) {
      setError(err.message || 'Failed to delete approved location.');
    } finally {
      setActionLoading(false);
    }
  };

  // RENDER ONBOARDING WIZARD
  if (!isOnboarded) {
    return (
      <div className="w-full max-w-[540px] mx-auto my-12 bg-white border border-[var(--border)] rounded-xl shadow-lg p-8 box-border font-sans">
        {/* Wizard Stepper Header */}
        <div className="flex justify-between items-center mb-6">
          <span className="text-xs font-semibold text-[var(--accent)]">
            Admin setup wizard
          </span>
          <div className="flex gap-1.5">
            <span className={`w-2.5 h-2.5 rounded-full ${onboardingStep >= 1 ? 'bg-[var(--accent)]' : 'bg-[var(--border)]'}`} />
            <span className={`w-2.5 h-2.5 rounded-full ${onboardingStep >= 2 ? 'bg-[var(--accent)]' : 'bg-[var(--border)]'}`} />
            <span className={`w-2.5 h-2.5 rounded-full ${onboardingStep >= 3 ? 'bg-[var(--accent)]' : 'bg-[var(--border)]'}`} />
          </div>
        </div>

        {onboardingError && (
          <Alert variant="error" className="mb-4">
            {onboardingError}
          </Alert>
        )}

        {/* STEP 1: Profile Details */}
        {onboardingStep === 1 && (
          <form onSubmit={handleOnboardingStep1} className="flex flex-col gap-4">
            <div>
              <h2 className="text-lg font-black text-[var(--text-h)] m-0">
                Verify Administrator Profile
              </h2>
              <p className="text-xs text-[var(--text)] mt-1.5 leading-relaxed">
                Step 1 of 3: Provide your profile details. This information will appear on dispatcher shift reports.
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[var(--text-h)] mb-1.5">
                Full Name
              </label>
              <input
                type="text"
                value={onboardingName}
                onChange={(e) => setOnboardingName(e.target.value)}
                required
                placeholder="John Doe"
                className="w-full px-3.5 py-2.5 bg-white border border-[var(--border)] rounded-md text-sm text-[var(--text-h)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)] box-border"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[var(--text-h)] mb-1.5">
                Phone Number
              </label>
              <input
                type="tel"
                value={onboardingPhone}
                onChange={(e) => setOnboardingPhone(e.target.value)}
                required
                placeholder="+234 801 234 5678"
                className="w-full px-3.5 py-2.5 bg-white border border-[var(--border)] rounded-md text-sm text-[var(--text-h)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)] box-border"
              />
            </div>

            <Button
              type="submit"
              variant="default"
              disabled={onboardingLoading}
              className="w-full py-2.5 mt-2"
            >
              {onboardingLoading ? 'Saving Profile...' : 'Next Step →'}
            </Button>
          </form>
        )}

        {/* STEP 2: Initialize Bases */}
        {onboardingStep === 2 && (
          <div className="flex flex-col gap-5">
            <div>
              <h2 className="text-lg font-semibold text-[var(--text-h)] m-0">
                Setup transit bases
              </h2>
              <p className="text-xs text-[var(--text)] mt-1.5 leading-relaxed">
                Step 2 of 3: We have preconfigured your Lagos admin base and Port Harcourt destination.
              </p>
            </div>

            <div className="flex flex-col gap-3">
              <div className="p-3 bg-purple-50 border border-purple-100 rounded-lg flex items-center gap-3">
                <div>
                  <strong className="text-xs text-purple-900 block font-semibold">Lagos</strong>
                  <span className="text-[10px] text-purple-700 font-medium">Primary base / admin location</span>
                </div>
              </div>

              <div className="p-3 bg-blue-50 border border-blue-100 rounded-lg flex items-center gap-3">
                <div>
                  <strong className="text-xs text-blue-900 block font-semibold">Port Harcourt</strong>
                  <span className="text-[10px] text-blue-700 font-medium">Secondary location / destination</span>
                </div>
              </div>
            </div>

            <Button
              onClick={handleOnboardingStep2}
              variant="default"
              disabled={onboardingLoading}
              className="w-full py-2.5 mt-2"
            >
              {onboardingLoading ? 'Initializing database tables...' : 'Initialize approved base locations'}
            </Button>
          </div>
        )}

        {/* STEP 3: Complete */}
        {onboardingStep === 3 && (
          <div className="flex flex-col gap-5 text-center py-4">
            <div>
              <h2 className="text-lg font-black text-[var(--text-h)] m-0">
                Transit network configured
              </h2>
              <p className="text-xs text-[var(--text)] mt-2 leading-relaxed max-w-[360px] mx-auto">
                Excellent work! Your profile is verified, and the base locations are initialized in your Supabase database. You are now ready to launch the full console.
              </p>
            </div>

            <Button
              onClick={handleOnboardingComplete}
              variant="default"
              disabled={onboardingLoading}
              className="w-full py-2.5 mt-2"
            >
              {onboardingLoading ? 'Finalizing setup...' : 'Enter admin dashboard'}
            </Button>
          </div>
        )}

        {/* Footer cancel/signout */}
        <div className="border-t border-[var(--border)] pt-4 mt-6 text-center">
          <button
            onClick={onSignOut}
            className="bg-transparent border-none text-xs font-bold text-[var(--text)] hover:text-red-500 cursor-pointer"
          >
            Cancel onboarding and sign out
          </button>
        </div>
      </div>
    );
  }

  // RENDER MAIN ADMIN DASHBOARD
  return (
    <div className="w-full h-screen bg-[var(--bg)] flex font-sans relative overflow-hidden">
      {/* Mobile Sidebar Overlay */}
      {isMobileSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/45 z-40 lg:hidden backdrop-blur-[1px] transition-opacity duration-300"
          onClick={() => setIsMobileSidebarOpen(false)}
        />
      )}

      {/* 1. Left Sidebar */}
      <aside className={`fixed inset-y-0 left-0 z-[800] w-[280px] h-screen bg-white border-r border-[var(--border)] flex flex-col justify-between p-6 box-border shrink-0 transition-transform duration-300 ease-in-out lg:w-[300px] lg:bg-neutral-50/50 ${
        isMobileSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
      }`}>
        <div className="flex flex-col gap-6">
          {/* Brand Logo / Context */}
          <div className="flex justify-between items-center">
            <div>
              <span className="text-[10px] font-semibold text-[var(--text)] opacity-60">
                Console
              </span>
              <h2 className="text-base font-extrabold text-[var(--text-h)] m-0 mt-1">
                CityBus Transit
              </h2>
            </div>
            {/* Close Button on mobile */}
            <button
              onClick={() => setIsMobileSidebarOpen(false)}
              className="lg:hidden p-1.5 rounded-full hover:bg-neutral-100 border-none bg-transparent cursor-pointer flex items-center justify-center text-neutral-500 transition-colors"
            >
              <svg className="w-4 h-4 stroke-[2.5]" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
          </div>

          {/* Vertical Menu Navigation */}
          <nav className="flex flex-col gap-1">
            <button
              onClick={() => { setActiveTab('livemap'); setIsMobileSidebarOpen(false); }}
              className={`w-full text-left px-3.5 py-2.5 rounded-lg text-xs font-semibold transition-all duration-150 border-none cursor-pointer ${activeTab === 'livemap'
                  ? 'bg-[var(--accent-bg)] text-[var(--text-h)]'
                  : 'bg-transparent text-[var(--text-h)] hover:bg-neutral-100'
                }`}
            >
              🗺 Live Fleet Map
            </button>

            <button
              onClick={() => { setActiveTab('nodes'); setIsMobileSidebarOpen(false); }}
              className={`w-full text-left px-3.5 py-2.5 rounded-lg text-xs font-semibold transition-all duration-150 border-none cursor-pointer ${activeTab === 'nodes'
                  ? 'bg-[var(--accent-bg)] text-[var(--text-h)]'
                  : 'bg-transparent text-[var(--text-h)] hover:bg-neutral-100'
                }`}
            >
              Transit nodes
            </button>

            <button
              onClick={() => { setActiveTab('drivers'); setIsMobileSidebarOpen(false); }}
              className={`w-full text-left px-3.5 py-2.5 rounded-lg text-xs font-semibold transition-all duration-150 border-none cursor-pointer ${activeTab === 'drivers'
                  ? 'bg-[var(--accent-bg)] text-[var(--text-h)]'
                  : 'bg-transparent text-[var(--text-h)] hover:bg-neutral-100'
                }`}
            >
              Drivers registry
            </button>

            <button
              onClick={() => { setActiveTab('deployments'); setIsMobileSidebarOpen(false); }}
              className={`w-full text-left px-3.5 py-2.5 rounded-lg text-xs font-semibold transition-all duration-150 border-none cursor-pointer ${activeTab === 'deployments'
                  ? 'bg-[var(--accent-bg)] text-[var(--text-h)]'
                  : 'bg-transparent text-[var(--text-h)] hover:bg-neutral-100'
                }`}
            >
              Deployments
            </button>

            <button
              onClick={() => { setActiveTab('settings'); setIsMobileSidebarOpen(false); }}
              className={`w-full text-left px-3.5 py-2.5 rounded-lg text-xs font-semibold transition-all duration-150 border-none cursor-pointer ${activeTab === 'settings'
                  ? 'bg-[var(--accent-bg)] text-[var(--text-h)]'
                  : 'bg-transparent text-[var(--text-h)] hover:bg-neutral-100'
                }`}
            >
              System Settings
            </button>
          </nav>
        </div>

        {/* Sidebar bottom: user status & sign out */}
        <div className="border-t border-[var(--border)] pt-4 flex flex-col gap-3">
          <div className="flex flex-col gap-0.5 text-left">
            <span className="text-[10px] font-semibold text-[var(--text)]">Signed in as:</span>
            <span className="text-xs font-bold text-[var(--text-h)] truncate" title={adminUser.email}>
              {adminUser.user_metadata?.full_name || adminUser.email}
            </span>
          </div>
          <Button variant="outline" size="sm" onClick={onSignOut} className="w-full justify-center">
            Sign out
          </Button>
        </div>
      </aside>

      {/* 2. Main content area */}
      <div className="flex flex-col flex-1 min-w-0 h-screen lg:ml-[300px]">
        {/* Top-bar Breadcrumbs */}
        <header className="h-14 border-b border-[var(--border)] bg-[var(--bg)] px-4 sm:px-8 flex justify-between items-center box-border shrink-0">
          <div className="flex items-center gap-3 text-xs font-semibold">
            {/* Hamburger Button for Mobile */}
            <button
              type="button"
              onClick={() => setIsMobileSidebarOpen(true)}
              className="lg:hidden p-1.5 -ml-1.5 bg-transparent border-none text-[var(--text)] hover:text-[var(--text-h)] cursor-pointer flex items-center justify-center transition-colors"
            >
              <svg className="w-5 h-5 stroke-[2.5]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <line x1="4" y1="12" x2="20" y2="12"></line>
                <line x1="4" y1="6" x2="20" y2="6"></line>
                <line x1="4" y1="18" x2="20" y2="18"></line>
              </svg>
            </button>
            <span className="text-[var(--text)]">citybus</span>
            <span className="text-[var(--border)]">/</span>
            <span className="text-[var(--text-h)]">
              {activeTab === 'livemap' ? 'live fleet map' : activeTab === 'nodes' ? 'transit nodes' : activeTab === 'drivers' ? 'drivers registry' : activeTab === 'deployments' ? 'deployments planner' : 'system settings'}
            </span>
          </div>
          <div className="text-xs text-[var(--text)] font-semibold flex items-center">
            Status:&nbsp;<span className="text-green-600 font-bold">Live</span>
          </div>
        </header>

        {/* Dynamic Panel Canvas */}
        <main className={`flex-1 min-h-0 box-border ${activeTab === 'livemap' ? 'relative overflow-hidden' : 'p-4 sm:p-8 overflow-y-auto'}`}>
          {error && activeTab !== 'livemap' && (
            <Alert variant="error" className="mb-6" onDismiss={() => setError(null)}>
              {error}
            </Alert>
          )}

          {/* Live Fleet Map — isolated stacking context keeps Leaflet z-indices contained */}
          {activeTab === 'livemap' && (
            <div style={{ position: 'absolute', inset: 0, isolation: 'isolate', zIndex: 0 }}>
              <AdminMap />
            </div>
          )}

          {/* TAB 1: Transit Nodes Workspace */}
          {activeTab === 'nodes' && (
            <div className="flex flex-col gap-8">
              {/* Table Registry */}
              <div className="bg-white border border-[var(--border)] rounded-xl p-4 sm:p-6 shadow-sm flex flex-col gap-4 box-border">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                  <div>
                    <h3 className="text-sm font-bold text-[var(--text-h)] m-0">
                      Approved locations registry
                    </h3>
                    <p className="text-[11px] text-[var(--text)] mt-1">
                      Currently configured transit nodes in Supabase.
                    </p>
                  </div>
                  <div className="flex gap-3 w-full sm:w-auto justify-end">
                    <Button variant="outline" size="sm" onClick={fetchLocations} disabled={loading}>
                      Refresh
                    </Button>
                    <Button variant="default" size="sm" onClick={() => setIsAddLocationOpen(true)}>
                      + Add Location
                    </Button>
                  </div>
                </div>

                {loading ? (
                  <div className="py-12 text-center text-xs text-[var(--text)] font-semibold flex items-center justify-center gap-2">
                    <svg className="animate-spin h-5 w-5 text-[var(--accent)]" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <span>Connecting to Supabase...</span>
                  </div>
                ) : locations.length === 0 ? (
                  <div className="py-12 border-2 border-dashed border-[var(--border)] rounded-lg text-center">
                    <p className="text-xs font-semibold text-[var(--text-h)] m-0">
                      No approved locations found.
                    </p>
                    <p className="text-[11px] text-[var(--text)] mt-1 max-w-[280px] mx-auto mb-4">
                      Your database registry is empty. You can add locations manually or seed the default locations (Lagos & Port Harcourt).
                    </p>
                    <div className="flex justify-center gap-3">
                      <Button variant="outline" size="sm" onClick={handleSeedDefaults} disabled={actionLoading}>
                        {actionLoading ? 'Seeding...' : 'Seed Default Locations'}
                      </Button>
                      <Button variant="default" size="sm" onClick={() => setIsAddLocationOpen(true)}>
                        + Add Location
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="border border-[var(--border)] rounded-lg overflow-x-auto">
                    <table className="w-full border-collapse text-left text-xs">
                      <thead>
                        <tr className="bg-[var(--code-bg)] border-b border-[var(--border)]">
                          <th className="p-3 font-bold text-[var(--text-h)]">Name</th>
                          <th className="p-3 font-bold text-[var(--text-h)]">Type</th>
                          <th className="p-3 font-bold text-[var(--text-h)]">Coordinates</th>
                          <th className="p-3 font-bold text-[var(--text-h)]">Status</th>
                          <th className="p-3 font-bold text-[var(--text-h)] text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {locations.filter(l => l.type !== 'sub-secondary').map((loc) => (
                          <React.Fragment key={loc.id}>
                            <tr className="border-b border-[var(--border)] hover:bg-neutral-50">
                              <td className="p-3 font-semibold text-[var(--text-h)]">{loc.name}</td>
                              <td className="p-3">
                                <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${loc.type === 'primary' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>
                                  {loc.type === 'primary' ? 'Primary' : 'Secondary'}
                                </span>
                              </td>
                              <td className="p-3 font-mono text-[10px] text-neutral-500">
                                {loc.latitude && loc.longitude ? `${loc.latitude.toFixed(4)}, ${loc.longitude.toFixed(4)}` : '—'}
                              </td>
                              <td className="p-3 text-[var(--text)] font-medium">Authorized</td>
                              <td className="p-3 text-right">
                                {loc.type === 'primary' ? (
                                  <span className="text-[11px] text-neutral-400 font-semibold select-none">System Base</span>
                                ) : (
                                  <button onClick={() => handleDeleteLocation(loc.id, loc.name)} disabled={actionLoading} className="bg-transparent border-none text-red-500 hover:text-red-700 font-semibold cursor-pointer text-xs">
                                    Remove
                                  </button>
                                )}
                              </td>
                            </tr>
                            {locations.filter(s => s.parent_id === loc.id).map((sub) => (
                              <tr key={sub.id} className="border-b border-[var(--border)] last:border-none bg-neutral-50/60 hover:bg-neutral-100/60">
                                <td className="p-3 pl-8">
                                  <div className="flex items-center gap-2">
                                    <span className="text-neutral-300 text-sm">└</span>
                                    <span className="font-medium text-[var(--text-h)]">{sub.name}</span>
                                  </div>
                                </td>
                                <td className="p-3">
                                  <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-700">
                                    Sub-location
                                  </span>
                                </td>
                                <td className="p-3 font-mono text-[10px] text-neutral-500">
                                  {sub.latitude && sub.longitude ? `${sub.latitude.toFixed(4)}, ${sub.longitude.toFixed(4)}` : '—'}
                                </td>
                                <td className="p-3 text-[var(--text)] font-medium">Authorized</td>
                                <td className="p-3 text-right">
                                  <button onClick={() => handleDeleteLocation(sub.id, sub.name)} disabled={actionLoading} className="bg-transparent border-none text-red-500 hover:text-red-700 font-semibold cursor-pointer text-xs">
                                    Remove
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </React.Fragment>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 2: Drivers Registry Workspace */}
          {activeTab === 'drivers' && (
            <div className="flex flex-col gap-8">
              {/* Stats Bar */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                <div className="bg-white border border-[var(--border)] rounded-xl p-5 shadow-sm">
                  <span className="text-[10px] font-semibold text-neutral-500">Total registrations</span>
                  <h3 className="text-2xl font-black text-[var(--text-h)] m-0 mt-1">{drivers.length}</h3>
                </div>
                <div className="bg-white border border-[var(--border)] rounded-xl p-5 shadow-sm">
                  <span className="text-[10px] font-semibold text-neutral-500">Pending review</span>
                  <h3 className="text-2xl font-black text-amber-600 m-0 mt-1">
                    {drivers.filter(d => d.status === 'pending').length}
                  </h3>
                </div>
                <div className="bg-white border border-[var(--border)] rounded-xl p-5 shadow-sm">
                  <span className="text-[10px] font-semibold text-neutral-500">Active drivers</span>
                  <h3 className="text-2xl font-black text-emerald-600 m-0 mt-1">
                    {drivers.filter(d => d.status === 'approved').length}
                  </h3>
                </div>
              </div>

              {/* Table Registry */}
              <div className="bg-white border border-[var(--border)] rounded-xl p-4 sm:p-6 shadow-sm flex flex-col gap-4 box-border">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                  <div>
                    <h3 className="text-sm font-bold text-[var(--text-h)] m-0">
                      Drivers Registry
                    </h3>
                    <p className="text-[11px] text-[var(--text)] mt-1">
                      Approve registered bus drivers to permit dispatcher shifts.
                    </p>
                  </div>
                  <div className="w-full sm:w-auto flex justify-end">
                    <Button variant="outline" size="sm" onClick={fetchDrivers} disabled={loadingDrivers}>
                      Refresh
                    </Button>
                  </div>
                </div>

                {loadingDrivers ? (
                  <div className="py-12 text-center text-xs text-[var(--text)] font-semibold flex items-center justify-center gap-2">
                    <svg className="animate-spin h-5 w-5 text-[var(--accent)]" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <span>Fetching driver records...</span>
                  </div>
                ) : drivers.length === 0 ? (
                  <div className="py-12 border-2 border-dashed border-[var(--border)] rounded-lg text-center">
                    <p className="text-xs font-semibold text-[var(--text-h)] m-0">
                      No drivers registered yet.
                    </p>
                    <p className="text-[11px] text-[var(--text)] mt-1 max-w-[280px] mx-auto">
                      Driver registrations will appear here once they complete profile setup in the Driver Portal.
                    </p>
                  </div>
                ) : (
                  <div className="border border-[var(--border)] rounded-lg overflow-x-auto">
                    <table className="w-full border-collapse text-left text-xs">
                      <thead>
                        <tr className="bg-[var(--code-bg)] border-b border-[var(--border)]">
                          <th className="p-3 font-bold text-[var(--text-h)]">Driver Details</th>
                          <th className="p-3 font-bold text-[var(--text-h)]">License & Contact</th>
                          <th className="p-3 font-bold text-[var(--text-h)]">Bus Info</th>
                          <th className="p-3 font-bold text-[var(--text-h)]">Status</th>
                          <th className="p-3 font-bold text-[var(--text-h)] text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {drivers.map((driver) => (
                          <tr key={driver.id} className="border-b border-[var(--border)] last:border-none hover:bg-neutral-50">
                            <td className="p-3">
                              <span className="font-semibold text-[var(--text-h)] block">{driver.full_name}</span>
                              <span className="text-[10px] text-neutral-400 block mt-0.5">{driver.email}</span>
                            </td>
                            <td className="p-3">
                              <span className="font-medium text-[var(--text-h)] block">{driver.phone}</span>
                              <span className="text-[10px] font-mono text-neutral-500 block mt-0.5">Permit: {driver.license_number}</span>
                            </td>
                            <td className="p-3">
                              <span className="font-bold text-[var(--text-h)] block">{driver.bus_number || 'Unassigned'}</span>
                              <span className="text-[10px] text-neutral-500 block mt-0.5">{driver.vehicle_type} ({driver.vehicle_capacity} Seats) • Plate: {driver.vehicle_plate}</span>
                            </td>
                            <td className="p-3">
                              <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${driver.status === 'approved'
                                  ? 'bg-emerald-100 text-emerald-700'
                                  : driver.status === 'rejected'
                                    ? 'bg-red-100 text-red-700'
                                    : 'bg-amber-100 text-amber-700'
                                }`}>
                                {driver.status === 'approved' ? 'Approved' : driver.status === 'rejected' ? 'Rejected' : 'Pending Review'}
                              </span>
                            </td>
                            <td className="p-3 text-right">
                              <div className="flex justify-end gap-2">
                                {driver.status !== 'approved' && (
                                  <Button
                                    variant="default"
                                    size="sm"
                                    onClick={() => handleUpdateDriverStatus(driver.id, 'approved')}
                                    disabled={actionLoading}
                                    className="py-1 px-2.5 text-[10px]"
                                  >
                                    Approve
                                  </Button>
                                )}
                                {driver.status !== 'rejected' && (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleUpdateDriverStatus(driver.id, 'rejected')}
                                    disabled={actionLoading}
                                    className="py-1 px-2.5 text-[10px] text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200 hover:border-red-300"
                                  >
                                    Reject
                                  </Button>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 3: Deployments Workspace */}
          {activeTab === 'deployments' && (
            <div className="flex flex-col gap-8 w-full box-border">
              {/* Header */}
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white border border-[var(--border)] rounded-xl p-4 sm:p-6 shadow-sm">
                <div>
                  <h3 className="text-sm font-bold text-[var(--text-h)] m-0">
                    Deployments & Route Planner
                  </h3>
                  <p className="text-[11px] text-[var(--text)] mt-1">
                    Designate transit events, select destination routes, and allocate buses.
                  </p>
                </div>
                <Button variant="default" size="sm" onClick={() => setIsCreateDeploymentOpen(true)} className="w-full sm:w-auto">
                  New Deployment
                </Button>
              </div>

              <div className="flex flex-col gap-6">
                  {loadingDeployments ? (
                    <div className="py-12 text-center text-xs text-[var(--text)] font-semibold flex items-center justify-center gap-2">
                      <svg className="animate-spin h-5 w-5 text-[var(--accent)]" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      <span>Loading deployments...</span>
                    </div>
                  ) : deployments.length === 0 ? (
                    <div className="flex flex-col items-center justify-center text-center py-12 px-6 border-2 border-dashed border-[var(--border)] rounded-xl bg-white">
                      <p className="text-xs font-semibold text-[var(--text-h)] m-0">
                        No deployments active.
                      </p>
                      <p className="text-[11px] text-[var(--text)] mt-2 m-0 max-w-md leading-relaxed">
                        Click &quot;New Deployment&quot; above to schedule routes, assign buses, and start passenger bookings.
                      </p>
                    </div>
                  ) : (
                    deployments.map((dep) => {
                      const totalBookingsCount = deploymentBookings.filter(b => b.deployment_id === dep.id).length;
                      return (
                        <div key={dep.id} className="bg-white border border-[var(--border)] rounded-xl p-4 sm:p-6 shadow-sm flex flex-col gap-5 text-left">
                          <div className="flex flex-col sm:flex-row justify-between items-start gap-4 border-b border-[var(--border)] pb-4">
                            <div>
                              <h4 className="text-base font-extrabold text-[var(--text-h)] m-0">{dep.name}</h4>
                              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1 text-[11px] text-[var(--text)]">
                                <span>Departure: <strong>{new Date(dep.departure_time).toLocaleString()}</strong></span>
                                <span className="text-neutral-300">•</span>
                                <span>Booking Open: <strong>{new Date(dep.registration_start).toLocaleString()}</strong> to <strong>{new Date(dep.registration_end).toLocaleString()}</strong></span>
                              </div>
                            </div>
                            <Button variant="outline" size="sm" onClick={() => handleDeleteDeployment(dep.id)} className="text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200 w-full sm:w-auto">
                              Delete
                            </Button>
                          </div>

                          <div>
                            <h5 className="text-xs font-semibold text-[var(--text-h)] mb-2">Bus assignments</h5>
                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                              {Object.entries(
                                dep.deployment_buses.reduce((acc: any, db: any) => {
                                  const locName = db.locations?.name || 'Unknown';
                                  if (!acc[locName]) acc[locName] = [];
                                  acc[locName].push(db.bus_number);
                                  return acc;
                                }, {})
                              ).map(([locName, buses]: any) => (
                                <div key={locName} className="p-3 bg-neutral-50 rounded-lg border border-[var(--border)]">
                                  <span className="text-xs font-bold text-[var(--text-h)] block">{locName}</span>
                                  <span className="text-[11px] text-[var(--accent)] font-semibold block mt-1">
                                    {buses.join(', ')}
                                  </span>
                                </div>
                              ))}
                              {dep.deployment_buses.length === 0 && (
                                <span className="text-xs text-[var(--text)] italic">No buses assigned.</span>
                              )}
                            </div>
                          </div>

                          <div className="border-t border-[var(--border)] pt-4">
                            <div className="flex justify-between items-center mb-3">
                              <h5 className="text-xs font-semibold text-[var(--text-h)] m-0">Passenger bookings ({totalBookingsCount})</h5>
                            </div>
                            <div className="border border-[var(--border)] rounded-lg overflow-x-auto max-h-[220px] overflow-y-auto">
                              <table className="w-full border-collapse text-left text-xs">
                                <thead>
                                  <tr className="bg-[var(--code-bg)] border-b border-[var(--border)]">
                                    <th className="p-2.5 font-bold text-[var(--text-h)]">Passenger</th>
                                    <th className="p-2.5 font-bold text-[var(--text-h)]">Contact & Route</th>
                                    <th className="p-2.5 font-bold text-[var(--text-h)]">Bus & Seat</th>
                                    <th className="p-2.5 font-bold text-[var(--text-h)]">Status</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {deploymentBookings.filter(b => b.deployment_id === dep.id).map((booking) => (
                                    <tr key={booking.id} className="border-b border-[var(--border)] last:border-none hover:bg-neutral-50">
                                      <td className="p-2.5">
                                        <span className="font-semibold text-[var(--text-h)] block">{booking.passengers?.full_name || 'N/A'}</span>
                                        <span className="text-[10px] text-neutral-400 block">{booking.passengers?.email || 'N/A'}</span>
                                      </td>
                                      <td className="p-2.5">
                                        <span className="text-[11px] text-[var(--text-h)] block">{booking.passengers?.phone || 'N/A'}</span>
                                        <span className="text-[10px] font-medium text-neutral-500 block">State: {booking.deployment_buses?.locations?.name || 'N/A'}</span>
                                      </td>
                                      <td className="p-2.5">
                                        <span className="font-bold text-[var(--accent)] block">{booking.deployment_buses?.bus_number || 'N/A'}</span>
                                        <span className="text-[10px] text-neutral-500 block">Seat: #{booking.seat_number}</span>
                                      </td>
                                      <td className="p-2.5">
                                        <span className={`inline-block px-1.5 py-0.5 rounded text-[9px] font-semibold ${
                                          booking.checked_in
                                            ? 'bg-green-100 text-green-700'
                                            : 'bg-neutral-100 text-neutral-500'
                                        }`}>
                                          {booking.checked_in ? 'Checked In' : 'Pending'}
                                        </span>
                                      </td>
                                    </tr>
                                  ))}
                                  {deploymentBookings.filter(b => b.deployment_id === dep.id).length === 0 && (
                                    <tr>
                                      <td colSpan={4} className="p-4 text-center text-xs text-[var(--text)] italic">
                                        No passengers booked yet.
                                      </td>
                                    </tr>
                                  )}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
          )}

          {/* TAB 4: System Settings */}
          {activeTab === 'settings' && (
            <div className="w-full flex flex-col gap-6">
              {settingsSuccessMsg && (
                <Alert variant="success">{settingsSuccessMsg}</Alert>
              )}

              {settingsError && (
                <Alert variant="error">{settingsError}</Alert>
              )}

              <div className="bg-white border border-[var(--border)] rounded-xl p-4 sm:p-6 box-border shadow-sm">
                <div>
                  <h3 className="text-sm font-bold text-[var(--text-h)] m-0">
                    Administrators
                  </h3>
                  <p className="text-[11px] text-[var(--text)] mt-1">
                    Type an email and click Add administrator. If they already have a CityBus account, they get access immediately. If not, they sign in at Admin Console with that email and their chosen password.
                  </p>
                </div>

                <form onSubmit={handleInviteAdmin} className="flex flex-col sm:flex-row sm:items-center gap-2 mt-5">
                  <input
                    type="email"
                    value={newAdminEmail}
                    onChange={(e) => setNewAdminEmail(e.target.value)}
                    required
                    placeholder="colleague@citybus.com"
                    className="flex-1 h-10 px-3.5 bg-white border border-[var(--border)] rounded-md text-sm text-[var(--text-h)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)] box-border"
                  />
                  <Button type="submit" disabled={adminInviteLoading} className="h-10 px-4 shrink-0 w-full sm:w-auto">
                    {adminInviteLoading ? 'Adding...' : 'Add administrator'}
                  </Button>
                </form>

                <div className="mt-6 flex flex-col gap-4">
                  <div>
                    <h4 className="text-xs font-semibold text-[var(--text-h)] m-0 mb-2">
                      Active administrators
                    </h4>
                    {admins.length === 0 ? (
                      <p className="text-[11px] text-[var(--text)] m-0">No administrators found.</p>
                    ) : (
                      <ul className="m-0 p-0 list-none flex flex-col gap-1.5">
                        {admins.map((admin) => (
                          <li
                            key={admin.user_id}
                            className="flex items-center justify-between gap-2 px-3 py-2 rounded-lg bg-neutral-50 border border-[var(--border)] text-xs"
                          >
                            <span className="font-semibold text-[var(--text-h)] truncate">{admin.email}</span>
                            <div className="flex items-center gap-2 shrink-0">
                              {admin.is_primary && (
                                <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100 px-1.5 py-0.5 rounded">
                                  Primary
                                </span>
                              )}
                              {admin.user_id === adminUser.id && (
                                <span className="text-[10px] font-bold text-purple-700 bg-purple-100 px-1.5 py-0.5 rounded">
                                  You
                                </span>
                              )}
                              {admin.user_id !== adminUser.id && !admin.is_primary && (
                                <button
                                  type="button"
                                  onClick={() => handleRemoveAdmin(admin.email)}
                                  className="text-[10px] font-bold text-neutral-500 hover:text-red-600 bg-transparent border-none cursor-pointer"
                                >
                                  Remove
                                </button>
                              )}
                            </div>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>

                  {pendingAdminInvites.length > 0 && (
                    <div>
                      <h4 className="text-xs font-semibold text-[var(--text-h)] m-0 mb-2">
                        Pending invites
                      </h4>
                      <ul className="m-0 p-0 list-none flex flex-col gap-1.5">
                        {pendingAdminInvites.map((invite) => (
                          <li
                            key={invite.email}
                            className="flex items-center justify-between gap-2 px-3 py-2 rounded-lg bg-amber-50 border border-amber-200 text-xs"
                          >
                            <span className="font-semibold text-[var(--text-h)] truncate">{invite.email}</span>
                            <button
                              type="button"
                              onClick={() => handleRemoveAdminInvite(invite.email)}
                              className="text-[10px] font-bold text-amber-800 hover:text-red-600 bg-transparent border-none cursor-pointer shrink-0"
                            >
                              Remove
                            </button>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>

              <div className="bg-white border border-[var(--border)] rounded-xl p-4 sm:p-6 box-border shadow-sm">
                <div>
                  <h3 className="text-sm font-bold text-[var(--text-h)] m-0">
                    Fleet configuration
                  </h3>
                  <p className="text-[11px] text-[var(--text)] mt-1">
                    Configure global parameters for the CityBus Transit network.
                  </p>
                </div>

                <form onSubmit={handleSaveSettings} className="flex flex-col gap-5 mt-6">
                  <div>
                    <label className="block text-xs font-semibold text-[var(--text-h)] mb-1.5">
                      Total Number of Buses
                    </label>
                    <input
                      type="number"
                      value={totalBusesInput}
                      onChange={(e) => setTotalBusesInput(e.target.value)}
                      required
                      min="1"
                      max="1000"
                      className="w-full px-3.5 py-2.5 bg-white border border-[var(--border)] rounded-md text-sm text-[var(--text-h)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)] box-border"
                    />
                    <p className="text-[10px] text-[var(--text)] mt-1.5 leading-normal">
                      This limit defines the highest bus number available for selection in the driver onboarding and registration form (e.g. Bus 1 to Bus N).
                    </p>
                  </div>

                  <Button type="submit" disabled={settingsLoading} className="h-10 px-6 self-start">
                    {settingsLoading ? 'Saving...' : 'Save Settings'}
                  </Button>
                </form>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* Right Slide-over Panel for Adding Location */}
      {isAddLocationOpen && (
        <>
          <div
            className="fixed inset-0 bg-black/20 z-40 transition-opacity"
            onClick={() => setIsAddLocationOpen(false)}
          />
          <div className="fixed top-0 right-0 bottom-0 w-full max-w-[400px] bg-[var(--bg)] shadow-2xl z-50 flex flex-col animate-in slide-in-from-right duration-300">
            <div className="flex justify-between items-center p-6 border-b border-[var(--border)]">
              <div>
                <h3 className="text-sm font-bold text-[var(--text-h)] m-0">
                  Add approved location
                </h3>
                <p className="text-[11px] text-[var(--text)] mt-1">
                  Phase 1: Setup authorized transit anchors.
                </p>
              </div>
              <button
                onClick={() => setIsAddLocationOpen(false)}
                className="bg-neutral-100 hover:bg-neutral-200 border-none w-8 h-8 rounded-full flex items-center justify-center cursor-pointer text-neutral-600 transition-colors"
              >
                ✕
              </button>
            </div>

            <div className="p-4 sm:p-6 flex-grow overflow-y-auto">
              <form onSubmit={handleAddLocation} className="flex flex-col gap-6">
                {newLocType === 'sub-secondary' ? (
                  <div>
                    <label className="block text-xs font-semibold text-[var(--text-h)] mb-1">
                      Sub-location Name
                    </label>
                    <input
                      type="text"
                      value={customLocName}
                      onChange={(e) => setCustomLocName(e.target.value)}
                      required
                      placeholder="e.g. Port Harcourt Terminal, Rumuola, Bonny Island"
                      className="w-full px-3 py-2 bg-white border border-[var(--border)] rounded-md text-xs text-[var(--text-h)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)] box-border"
                    />
                  </div>
                ) : (
                  <div>
                    <label className="block text-xs font-semibold text-[var(--text-h)] mb-1">
                      State / Location
                    </label>
                    <select
                      value={newLocName}
                      onChange={(e) => setNewLocName(e.target.value)}
                      required
                      className="w-full px-3 py-2 bg-white border border-[var(--border)] rounded-md text-xs text-[var(--text-h)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)] box-border"
                    >
                      <option value="">Select a state...</option>
                      {NIGERIAN_STATES
                        .filter(state => !locations.some(loc => loc.name === state))
                        .map(state => (
                          <option key={state} value={state}>{state}</option>
                        ))
                      }
                      <option value="custom">Custom Location / Terminal...</option>
                    </select>

                    {newLocName === 'custom' && (
                      <div className="mt-3">
                        <label className="block text-xs font-semibold text-[var(--text-h)] mb-1">
                          Custom Location Name
                        </label>
                        <input
                          type="text"
                          value={customLocName}
                          onChange={(e) => setCustomLocName(e.target.value)}
                          required
                          placeholder="e.g. Redemption City, Berger Terminal"
                          className="w-full px-3 py-2 bg-white border border-[var(--border)] rounded-md text-xs text-[var(--text-h)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)] box-border"
                        />
                      </div>
                    )}
                  </div>
                )}

                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="block text-xs font-semibold text-[var(--text-h)]">
                      Pinpoint on Map
                    </label>
                    <button
                      type="button"
                      onClick={() => setIsMapExpanded(true)}
                      className="bg-transparent border-none text-[var(--accent)] hover:underline text-[10px] font-bold cursor-pointer flex items-center gap-1"
                    >
                      ⛶ Expand Map
                    </button>
                  </div>
                  <p className="text-[10px] text-[var(--text)] mb-2 leading-normal">
                    The map will automatically focus on your selected state. Click on the map or click <strong>Expand Map</strong> to pinpoint.
                  </p>
                  <div
                    id="add-location-map"
                    style={{ height: '200px', zIndex: 10 }}
                    className="rounded-lg border border-[var(--border)] bg-neutral-50 overflow-hidden"
                  />
                  {pickedCoords && (
                    <div className="mt-2 text-[10px] text-neutral-500 font-mono">
                      Coordinates: {pickedCoords.lat.toFixed(6)}, {pickedCoords.lng.toFixed(6)}
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[var(--text-h)] mb-1">
                    Location Type
                  </label>
                  <select
                    value={newLocType}
                    onChange={(e) => {
                      setNewLocType(e.target.value as 'primary' | 'secondary' | 'sub-secondary');
                      setNewLocParentId('');
                    }}
                    className="w-full px-3 py-2 bg-white border border-[var(--border)] rounded-md text-xs text-[var(--text-h)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)] box-border"
                  >
                    {!locations.some(loc => loc.type === 'primary') && (
                      <option value="primary">Primary (Admin / Base Location)</option>
                    )}
                    <option value="secondary">Secondary (State)</option>
                    <option value="sub-secondary">Sub-location (within a State)</option>
                  </select>
                </div>

                {newLocType === 'sub-secondary' && (
                  <div>
                    <label className="block text-xs font-semibold text-[var(--text-h)] mb-1">
                      Under which State?
                    </label>
                    <select
                      value={newLocParentId}
                      onChange={(e) => setNewLocParentId(e.target.value)}
                      required
                      className="w-full px-3 py-2 bg-white border border-[var(--border)] rounded-md text-xs text-[var(--text-h)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)] box-border"
                    >
                      <option value="">Select parent state...</option>
                      {locations.filter(l => l.type === 'secondary').map(l => (
                        <option key={l.id} value={l.id}>{l.name}</option>
                      ))}
                    </select>
                  </div>
                )}

                <Button
                  type="submit"
                  variant="default"
                  size="sm"
                  disabled={actionLoading}
                  className="w-full mt-2"
                >
                  Save Approved Location
                </Button>
              </form>
            </div>
          </div>
        </>
      )}

      {/* Right Slide-over Panel for New Deployment */}
      {isCreateDeploymentOpen && (
        <>
          <div
            className="fixed inset-0 bg-black/20 z-40 transition-opacity"
            onClick={() => setIsCreateDeploymentOpen(false)}
          />
          <div className="fixed top-0 right-0 bottom-0 w-full max-w-[480px] bg-[var(--bg)] shadow-2xl z-50 flex flex-col">
            <div className="flex justify-between items-center p-6 border-b border-[var(--border)]">
              <div>
                <h3 className="text-sm font-bold text-[var(--text-h)] m-0">
                  New Deployment
                </h3>
                <p className="text-[11px] text-[var(--text)] mt-1">
                  Schedule a transit event, assign buses, and open bookings.
                </p>
              </div>
              <button
                onClick={() => setIsCreateDeploymentOpen(false)}
                className="bg-neutral-100 hover:bg-neutral-200 border-none w-8 h-8 rounded-full flex items-center justify-center cursor-pointer text-neutral-600 transition-colors"
              >
                ✕
              </button>
            </div>

            <div className="p-4 sm:p-6 flex-grow overflow-y-auto">
              <form onSubmit={handleCreateDeployment} className="flex flex-col gap-5">
                {createDepError && (
                  <Alert variant="error">{createDepError}</Alert>
                )}

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-[var(--text-h)]">Deployment Name</label>
                  <input
                    type="text"
                    placeholder="e.g. RCCG Convention 2026"
                    value={newDepName}
                    onChange={(e) => setNewDepName(e.target.value)}
                    required
                    className="w-full px-3.5 py-2.5 bg-white border border-[var(--border)] rounded-md text-sm text-[var(--text-h)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)] box-border"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-[var(--text-h)]">Departure Time</label>
                  <input
                    type="datetime-local"
                    value={newDepDeparture}
                    onChange={(e) => setNewDepDeparture(e.target.value)}
                    required
                    className="w-full px-3.5 py-2.5 bg-white border border-[var(--border)] rounded-md text-sm text-[var(--text-h)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)] box-border"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-[var(--text-h)]">Registration Opens</label>
                  <input
                    type="datetime-local"
                    value={newDepRegStart}
                    onChange={(e) => setNewDepRegStart(e.target.value)}
                    required
                    className="w-full px-3.5 py-2.5 bg-white border border-[var(--border)] rounded-md text-sm text-[var(--text-h)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)] box-border"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-[var(--text-h)]">Registration Closes</label>
                  <input
                    type="datetime-local"
                    value={newDepRegEnd}
                    onChange={(e) => setNewDepRegEnd(e.target.value)}
                    required
                    className="w-full px-3.5 py-2.5 bg-white border border-[var(--border)] rounded-md text-sm text-[var(--text-h)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)] box-border"
                  />
                </div>

                 <div className="border-t border-[var(--border)] pt-4 flex flex-col gap-4">
                  <div>
                    <h5 className="text-xs font-bold text-[var(--text-h)] mb-1">Bus Allocations</h5>
                    <p className="text-[10px] text-[var(--text)] leading-normal">
                      Select a secondary location / state and assign buses.
                    </p>
                  </div>

                  {/* Allocation controls */}
                  <div className="bg-neutral-50 border border-[var(--border)] rounded-lg p-3.5 flex flex-col gap-3">
                    <div className="flex flex-col gap-1">
                      <label className="text-xs font-semibold text-[var(--text-h)]">Select Location</label>
                      <select
                        value={selectedAllocationLoc}
                        onChange={(e) => setSelectedAllocationLoc(e.target.value)}
                        className="w-full px-3 py-2 bg-white border border-[var(--border)] rounded-md text-xs text-[var(--text-h)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)] box-border"
                      >
                        <option value="">Choose a location...</option>
                        {locations
                          .filter(loc => loc.type !== 'primary' && !assignedBuses[loc.id])
                          .map(loc => {
                            const parent = loc.parent_id ? locations.find(l => l.id === loc.parent_id) : null;
                            const label = parent ? `${parent.name} › ${loc.name}` : loc.name;
                            return <option key={loc.id} value={loc.id}>{label}</option>;
                          })
                        }
                      </select>
                    </div>

                    <div className="flex flex-col gap-1">
                      <label className="text-xs font-semibold text-[var(--text-h)]">Assigned Buses</label>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          placeholder="e.g. Bus 1, Bus 5"
                          value={allocationBusesInput}
                          onChange={(e) => setAllocationBusesInput(e.target.value)}
                          className="flex-grow px-3 py-2 bg-white border border-[var(--border)] rounded-md text-xs text-[var(--text-h)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)] box-border"
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            if (!selectedAllocationLoc || !allocationBusesInput.trim()) return;
                            setAssignedBuses({
                              ...assignedBuses,
                              [selectedAllocationLoc]: allocationBusesInput.trim()
                            });
                            setSelectedAllocationLoc('');
                            setAllocationBusesInput('');
                          }}
                          disabled={!selectedAllocationLoc || !allocationBusesInput.trim()}
                          className="text-xs h-auto py-2 whitespace-nowrap"
                        >
                          Assign
                        </Button>
                      </div>
                    </div>
                  </div>

                  {/* Active list */}
                  <div className="flex flex-col gap-2">
                    <span className="text-xs font-semibold text-[var(--text-h)]">
                      Assigned States ({Object.keys(assignedBuses).length})
                    </span>
                    {Object.entries(assignedBuses).map(([locationId, busesStr]) => {
                      const loc = locations.find(l => l.id === locationId);
                      if (!loc) return null;
                      return (
                        <div
                          key={locationId}
                          className="flex justify-between items-center bg-white border border-[var(--border)] rounded-lg p-3 shadow-sm"
                        >
                          <div className="flex flex-col">
                            <strong className="text-xs text-[var(--text-h)]">{loc.name}</strong>
                            <span className="text-[10px] text-[var(--text)] font-semibold mt-0.5">
                              {busesStr}
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              const updated = { ...assignedBuses };
                              delete updated[locationId];
                              setAssignedBuses(updated);
                            }}
                            className="bg-transparent border-none text-red-500 hover:text-red-700 font-bold text-xs cursor-pointer p-1"
                          >
                            Remove
                          </button>
                        </div>
                      );
                    })}
                    {Object.keys(assignedBuses).length === 0 && (
                      <p className="text-[11px] text-[var(--text)] italic text-center py-2">
                        No locations assigned yet. Select a location above to assign buses.
                      </p>
                    )}
                  </div>
                </div>

                <Button type="submit" variant="default" disabled={createDepLoading} className="w-full py-2.5 mt-2">
                  {createDepLoading ? 'Deploying...' : 'Deploy Program'}
                </Button>
              </form>
            </div>
          </div>
        </>
      )}

      {/* Custom Confirmation Modal for Deletion */}
      {locationToDelete && (
        <div className="fixed inset-0 bg-black/40 z-[60] flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6">
              <h3 className="text-sm font-bold text-[var(--text-h)] m-0 mb-2">
                Remove Approved Location
              </h3>
              <p className="text-xs text-[var(--text)] m-0 leading-relaxed">
                Are you sure you want to remove <strong>{locationToDelete.name}</strong> from the transit network? This action cannot be undone.
              </p>
            </div>
            <div className="p-4 bg-neutral-50 border-t border-[var(--border)] flex justify-end gap-3">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setLocationToDelete(null)}
                disabled={actionLoading}
              >
                Cancel
              </Button>
              <Button
                variant="default"
                size="sm"
                onClick={confirmDeleteLocation}
                disabled={actionLoading}
                className="bg-red-600 hover:bg-red-700 text-white"
              >
                {actionLoading ? 'Removing...' : 'Remove Location'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Expanded Map Modal */}
      {isMapExpanded && (
        <div className="fixed inset-0 bg-black/50 z-[70] flex items-center justify-center p-4 md:p-8 animate-in fade-in duration-200">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col h-[80vh]">
            <div className="flex justify-between items-center p-5 border-b border-[var(--border)]">
              <div>
                <h3 className="text-sm font-bold text-[var(--text-h)] m-0">
                  Select Location Coordinates
                </h3>
                <p className="text-[11px] text-[var(--text)] mt-1">
                  Click anywhere on the large map to precisely drop the pin for {newLocName || 'the selected location'}.
                </p>
              </div>
              <button
                onClick={() => setIsMapExpanded(false)}
                className="bg-neutral-100 hover:bg-neutral-200 border-none w-8 h-8 rounded-full flex items-center justify-center cursor-pointer text-neutral-600 transition-colors"
              >
                ✕
              </button>
            </div>

            <div className="flex-grow bg-neutral-100 relative">
              <div
                id="expanded-location-map"
                className="w-full h-full"
              />
            </div>

            <div className="p-4 bg-neutral-50 border-t border-[var(--border)] flex justify-between items-center">
              <div className="text-xs text-[var(--text)] font-mono">
                {pickedCoords ? (
                  <span>Selected: <strong>{pickedCoords.lat.toFixed(6)}, {pickedCoords.lng.toFixed(6)}</strong></span>
                ) : (
                  <span>No location selected. Click map to set coordinates.</span>
                )}
              </div>
              <Button
                variant="default"
                size="sm"
                onClick={() => setIsMapExpanded(false)}
              >
                Apply Coordinates
              </Button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
export default AdminConsole;
