import React, { useState, useEffect } from 'react';
import { supabase } from '../../utils/supabase';
import { normalizeEmailInput } from '../../utils/email';
import { ROUTES, navigate } from '../../utils/routes';
import { Alert } from '../ui/alert';
import { Button } from '../ui/button';
import { DriverSignupForm } from './DriverSignupForm';
import { AuthScreenLayout } from '../auth/AuthScreenLayout';
import { DriverMap } from './DriverMap';
import { SOSButton } from './SOSButton';

export const DriverPortal: React.FC = () => {
  // Auth state
  const [sessionUser, setSessionUser] = useState<any>(null);
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Registration state
  const [driverProfile, setDriverProfile] = useState<any>(null);
  const [hasCheckedProfile, setHasCheckedProfile] = useState(false);

  // Form input states
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [licenseNumber, setLicenseNumber] = useState('');
  const [vehicleType, setVehicleType] = useState('Mini-bus');
  const [vehicleCapacity, setVehicleCapacity] = useState('14');
  const [vehiclePlate, setVehiclePlate] = useState('');
  const [busNumber, setBusNumber] = useState('Bus 1');
  const [activeSubTab, setActiveSubTab] = useState<'dashboard' | 'shift' | 'bus'>('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isDesktopSidebarCollapsed, setIsDesktopSidebarCollapsed] = useState(false);
  const [isEditingVehicle, setIsEditingVehicle] = useState(false);
  const [totalBuses, setTotalBuses] = useState<number>(100);

  // Active shift states
  const [activeShift, setActiveShift] = useState<any>(null);
  const [shiftBookings, setShiftBookings] = useState<any[]>([]);
  const [loadingShift, setLoadingShift] = useState(false);
  const [originCoords, setOriginCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [destCoords, setDestCoords] = useState<{ lat: number; lng: number } | null>(null);

  // Loading/feedback states
  const [loading, setLoading] = useState(false);
  const [profileLoading, setProfileLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Monitor auth state changes
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSessionUser(session?.user ?? null);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSessionUser(session?.user ?? null);
      if (!session) {
        setDriverProfile(null);
        setHasCheckedProfile(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // Fetch system settings for bus registry dropdown
  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const { data, error } = await supabase
          .from('settings')
          .select('value')
          .eq('key', 'total_buses')
          .maybeSingle();

        if (error) throw error;
        if (data && data.value) {
          const parsed = parseInt(data.value);
          if (!isNaN(parsed) && parsed > 0) {
            setTotalBuses(parsed);
          }
        }
      } catch (err) {
        console.error('Error fetching settings:', err);
      }
    };
    fetchSettings();
  }, []);

  // Fetch driver profile once authenticated
  useEffect(() => {
    if (sessionUser) {
      fetchDriverProfile();
    }
  }, [sessionUser]);

  const fetchActiveShift = async (busNo: string) => {
    setLoadingShift(true);
    try {
      const { data: dbData, error: dbError } = await supabase
        .from('deployment_buses')
        .select(`
          *,
          deployments (*),
          locations (*)
        `)
        .eq('bus_number', busNo);

      if (dbError) throw dbError;

      const activeBus = (dbData || []).find((db: any) => db.deployments);
      if (activeBus) {
        setActiveShift(activeBus);

        const { data: primaryLocs } = await supabase
          .from('locations')
          .select('*')
          .eq('type', 'primary')
          .limit(1);

        if (primaryLocs && primaryLocs.length > 0) {
          const prim = primaryLocs[0];
          const lat = prim.latitude || 6.8024;
          const lng = prim.longitude || 3.4975;
          setDestCoords(prev => (prev?.lat === lat && prev?.lng === lng) ? prev : { lat, lng });
        }

        if (activeBus.locations) {
          const lat = activeBus.locations.latitude || 6.5244;
          const lng = activeBus.locations.longitude || 3.3792;
          setOriginCoords(prev => (prev?.lat === lat && prev?.lng === lng) ? prev : { lat, lng });
        }

        const { data: bookingsData, error: bookingsError } = await supabase
          .from('passenger_bookings')
          .select(`
            *,
            passengers (*)
          `)
          .eq('deployment_bus_id', activeBus.id);

        if (bookingsError) throw bookingsError;
        setShiftBookings(bookingsData || []);
      } else {
        setActiveShift(null);
        setShiftBookings([]);
        setOriginCoords(null);
        setDestCoords(null);
      }
    } catch (err) {
      console.error('Error loading active shift:', err);
    } finally {
      setLoadingShift(false);
    }
  };

  const handleUpdateRideStatus = async (status: 'idle' | 'enroute' | 'returning' | 'completed') => {
    if (!driverProfile) return;
    try {
      const { error } = await supabase
        .from('drivers')
        .update({
          ride_status: status === 'completed' ? 'idle' : status,
          active_deployment_id: status === 'completed' || status === 'idle' ? null : activeShift?.deployments?.id
        })
        .eq('id', driverProfile.id);

      if (error) throw error;
      fetchDriverProfile();
    } catch (err: any) {
      alert(err.message || 'Failed to update ride status.');
    }
  };

  const handleCheckInPassenger = async (bookingId: string) => {
    try {
      const { error } = await supabase
        .from('passenger_bookings')
        .update({ checked_in: true })
        .eq('id', bookingId);

      if (error) throw error;
      if (activeShift) {
        const { data: bookingsData } = await supabase
          .from('passenger_bookings')
          .select(`
            *,
            passengers (*)
          `)
          .eq('deployment_bus_id', activeShift.id);
        setShiftBookings(bookingsData || []);
      }
    } catch (err: any) {
      alert(err.message || 'Failed to check-in passenger.');
    }
  };

  const fetchDriverProfile = async () => {
    if (!sessionUser) return;
    setProfileLoading(true);
    try {
      const { data, error } = await supabase
        .from('drivers')
        .select('*')
        .eq('id', sessionUser.id)
        .maybeSingle();

      if (error) throw error;
      setDriverProfile(data);
      if (data) {
        // Prefill form states in case they want to review/resubmit
        setFullName(data.full_name);
        setPhone(data.phone);
        setLicenseNumber(data.license_number);
        setVehicleType(data.vehicle_type);
        setVehicleCapacity(data.vehicle_capacity.toString());
        setVehiclePlate(data.vehicle_plate);
        setBusNumber(data.bus_number || 'Bus 1');

        // Fetch active shift assignments for this bus
        fetchActiveShift(data.bus_number);
      }
    } catch (err: any) {
      console.error('Error fetching driver profile:', err);
    } finally {
      setHasCheckedProfile(true);
      setProfileLoading(false);
    }
  };

  // Handle email/password sign-in or sign-up
  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccessMsg(null);

    try {
      const normalizedEmail = normalizeEmailInput(email);
      if (authMode === 'signin') {
        const { error } = await supabase.auth.signInWithPassword({ email: normalizedEmail, password });
        if (error) throw error;
      } else {
        const { error } = await supabase.auth.signUp({
          email: normalizedEmail,
          password,
          options: {
            data: {
              role: 'driver'
            }
          }
        });
        if (error) throw error;
        setSuccessMsg('Registration successful! Please check your email for verification, then log in.');
        setAuthMode('signin');
        setPassword('');
      }
    } catch (err: any) {
      setError(err.message || 'Authentication failed.');
    } finally {
      setLoading(false);
    }
  };

  // Trigger OAuth login with Google
  const handleGoogleAuth = async () => {
    setLoading(true);
    setError(null);
    localStorage.setItem('oauth_role', 'driver');
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/`
        }
      });
      if (error) throw error;
    } catch (err: any) {
      setError(err.message || 'Google Authentication failed.');
      setLoading(false);
    }
  };

  // Submit driver registration application
  const handleRegisterDriver = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sessionUser) return;
    setLoading(true);
    setError(null);

    try {
      const { error } = await supabase
        .from('drivers')
        .upsert({
          id: sessionUser.id,
          email: sessionUser.email,
          full_name: fullName.trim(),
          phone: phone.trim(),
          license_number: licenseNumber.trim(),
          vehicle_type: vehicleType,
          vehicle_capacity: parseInt(vehicleCapacity) || 0,
          vehicle_plate: vehiclePlate.trim().toUpperCase(),
          bus_number: busNumber,
          status: 'pending' // Always defaults to pending on registration or update
        });

      if (error) throw error;

      // Update user role to driver
      const { error: roleError } = await supabase
        .from('user_roles')
        .upsert({
          id: sessionUser.id,
          role: 'driver'
        });
      if (roleError) throw roleError;

      await fetchDriverProfile();
    } catch (err: any) {
      setError(err.message || 'Failed to submit driver registration.');
    } finally {
      setLoading(false);
    }
  };

  // Update vehicle details directly from driver dashboard
  const handleUpdateVehicle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sessionUser) return;
    setLoading(true);
    setError(null);
    setSuccessMsg(null);

    try {
      const { error } = await supabase
        .from('drivers')
        .update({
          vehicle_type: vehicleType,
          vehicle_capacity: parseInt(vehicleCapacity) || 0,
          vehicle_plate: vehiclePlate.trim().toUpperCase(),
          bus_number: busNumber
        })
        .eq('id', sessionUser.id);

      if (error) throw error;

      // Update local driverProfile state
      setDriverProfile((prev: any) => prev ? {
        ...prev,
        vehicle_type: vehicleType,
        vehicle_capacity: parseInt(vehicleCapacity) || 0,
        vehicle_plate: vehiclePlate.trim().toUpperCase(),
        bus_number: busNumber
      } : null);

      setIsEditingVehicle(false);
      setSuccessMsg('Vehicle details updated successfully.');
    } catch (err: any) {
      setError(err.message || 'Failed to update vehicle details.');
    } finally {
      setLoading(false);
    }
  };



  // Sign out driver
  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate(ROUTES.home);
  };

  // 1. Loading state when fetching profile
  if (sessionUser && !hasCheckedProfile && profileLoading) {
    return (
      <div className="w-full min-h-screen bg-[var(--bg)] flex items-center justify-center p-4 box-border">
        <div className="w-full max-w-[400px] bg-white border border-[var(--border)] rounded-xl shadow-sm p-8 box-border relative flex flex-col items-center justify-center min-h-[250px] gap-3 text-center">
          <svg className="animate-spin h-8 w-8 text-[var(--accent)]" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          <span className="text-xs text-[var(--text)] font-semibold text-neutral-500">Retrieving Driver Profile...</span>
        </div>
      </div>
    );
  }

  // 2. Authenticated, has profile -> Display Driver Dashboard / Status Board
  if (sessionUser && driverProfile) {
    const isPending = driverProfile.status === 'pending';
    const isApproved = driverProfile.status === 'approved';
    const isRejected = driverProfile.status === 'rejected';

    if (isApproved) {
      return (
        <>
        {/* SOS — outside all overflow-hidden containers so fixed positioning works */}
        {(driverProfile.ride_status === 'enroute' || driverProfile.ride_status === 'returning') && (
          <div className="fixed bottom-6 right-6 z-[9999]">
            <SOSButton
              driverId={sessionUser.id}
              currentLat={driverProfile.latitude ?? null}
              currentLng={driverProfile.longitude ?? null}
            />
          </div>
        )}
        <div className="w-full h-screen bg-[var(--bg)] flex box-border overflow-hidden relative">
          {/* Mobile sidebar overlay */}
          {isSidebarOpen && (
            <div
              className="md:hidden fixed inset-0 bg-black/20 z-[1200] transition-opacity"
              onClick={() => setIsSidebarOpen(false)}
            />
          )}

          {/* Sidebar */}
          <aside className={`
            fixed md:relative top-0 bottom-0 left-0 z-[1300] md:z-0
            border-r border-[var(--border)] bg-white box-border
            flex flex-col shrink-0 overflow-hidden transition-all duration-300
            ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
            ${isDesktopSidebarCollapsed ? 'md:w-[64px]' : 'md:w-[220px]'}
            w-[220px]
          `}>
            {/* Top: branding + nav */}
            <div className={`p-5 flex flex-col gap-5 flex-grow ${isDesktopSidebarCollapsed ? 'items-center px-2' : ''}`}>
              <div className={`flex items-center w-full ${isDesktopSidebarCollapsed ? 'flex-col gap-4 justify-center' : 'justify-between'}`}>
                {!isDesktopSidebarCollapsed ? (
                  <div className="flex flex-col text-left">
                    <span className="text-[10px] font-bold tracking-wider text-[var(--text)] opacity-60">
                      Driver Portal
                    </span>
                    <h2 className="text-base font-extrabold text-[var(--text-h)] m-0 mt-1">
                      CityBus Transit
                    </h2>
                  </div>
                ) : (
                  <div className="flex justify-center items-center py-1 text-[var(--accent)]" title="Driver Portal">
                    <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M4 16c0 .88.39 1.67 1 2.22V20c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h8v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1.78c.61-.55 1-1.34 1-2.22V6c0-3.5-3.58-4-8-4s-8 .5-8 4v10zm3.5 1c-.83 0-1.5-.67-1.5-1.5S6.67 14 7.5 14s1.5.67 1.5 1.5S8.33 17 7.5 17zm9 0c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zm1.5-6H6V6h12v5z"/>
                    </svg>
                  </div>
                )}

                {/* Desktop Collapse/Expand Button (inside sidebar header) */}
                <button
                  type="button"
                  onClick={() => setIsDesktopSidebarCollapsed(!isDesktopSidebarCollapsed)}
                  className="hidden md:flex bg-neutral-100 hover:bg-neutral-200 border-none w-8 h-8 rounded-lg items-center justify-center cursor-pointer text-neutral-500 hover:text-neutral-800 transition-colors shrink-0"
                  title={isDesktopSidebarCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="3" width="18" height="18" rx="2" />
                    <path d="M9 3v18" />
                    {isDesktopSidebarCollapsed ? (
                      <path d="M12 9l3 3-3 3" />
                    ) : (
                      <path d="M16 15l-3-3 3-3" />
                    )}
                  </svg>
                </button>

                {/* Mobile close button */}
                <button
                  type="button"
                  onClick={() => setIsSidebarOpen(false)}
                  className="md:hidden bg-neutral-100 hover:bg-neutral-200 border-none w-8 h-8 rounded-full flex items-center justify-center cursor-pointer text-neutral-600 transition-colors shrink-0"
                >
                  ✕
                </button>
              </div>

              {/* Vertical Menu Navigation */}
              <nav className="flex flex-col gap-1 w-full">
                <button
                  type="button"
                  onClick={() => {
                    setActiveSubTab('dashboard');
                    setIsSidebarOpen(false);
                  }}
                  className={`w-full rounded-lg text-xs font-semibold transition-all duration-150 border-none cursor-pointer flex items-center ${
                    isDesktopSidebarCollapsed ? 'justify-center p-2.5' : 'text-left px-3.5 py-2.5 gap-2.5'
                  } ${
                    activeSubTab === 'dashboard'
                      ? 'bg-[var(--accent-bg)] text-[var(--accent)]'
                      : 'bg-transparent text-[var(--text)] hover:bg-neutral-100 hover:text-[var(--text-h)]'
                  }`}
                  title={isDesktopSidebarCollapsed ? 'Live Map' : undefined}
                >
                  <svg className="w-3.5 h-3.5 shrink-0" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/></svg>
                  {!isDesktopSidebarCollapsed && <span>Live Map</span>}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setActiveSubTab('shift');
                    setIsSidebarOpen(false);
                  }}
                  className={`w-full rounded-lg text-xs font-semibold transition-all duration-150 border-none cursor-pointer flex items-center ${
                    isDesktopSidebarCollapsed ? 'justify-center p-2.5' : 'text-left px-3.5 py-2.5 gap-2.5'
                  } ${
                    activeSubTab === 'shift'
                      ? 'bg-[var(--accent-bg)] text-[var(--accent)]'
                      : 'bg-transparent text-[var(--text)] hover:bg-neutral-100 hover:text-[var(--text-h)]'
                  }`}
                  title={isDesktopSidebarCollapsed ? 'Active Shift' : undefined}
                >
                  <div className="relative flex items-center justify-center shrink-0">
                    <svg className="w-3.5 h-3.5 shrink-0" fill="currentColor" viewBox="0 0 24 24"><path d="M19 3h-1V1h-2v2H8V1H6v2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V8h14v11zM7 10h5v5H7z"/></svg>
                    {isDesktopSidebarCollapsed && activeShift && (
                      <span className="absolute -top-1 -right-1 w-2 h-2 bg-purple-600 rounded-full border border-white" />
                    )}
                  </div>
                  {!isDesktopSidebarCollapsed && <span>Active Shift</span>}
                  {!isDesktopSidebarCollapsed && activeShift && (
                    <span className="ml-auto text-[9px] font-black bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded">
                      {activeShift.bus_number?.replace('Bus ', '')}
                    </span>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setActiveSubTab('bus');
                    setIsSidebarOpen(false);
                  }}
                  className={`w-full rounded-lg text-xs font-semibold transition-all duration-150 border-none cursor-pointer flex items-center ${
                    isDesktopSidebarCollapsed ? 'justify-center p-2.5' : 'text-left px-3.5 py-2.5 gap-2.5'
                  } ${
                    activeSubTab === 'bus'
                      ? 'bg-[var(--accent-bg)] text-[var(--accent)]'
                      : 'bg-transparent text-[var(--text)] hover:bg-neutral-100 hover:text-[var(--text-h)]'
                  }`}
                  title={isDesktopSidebarCollapsed ? 'My Vehicle' : undefined}
                >
                  <svg className="w-3.5 h-3.5 shrink-0" fill="currentColor" viewBox="0 0 24 24"><path d="M4 16c0 .88.39 1.67 1 2.22V20c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h8v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1.78c.61-.55 1-1.34 1-2.22V6c0-3.5-3.58-4-8-4s-8 .5-8 4v10zm3.5 1c-.83 0-1.5-.67-1.5-1.5S6.67 14 7.5 14s1.5.67 1.5 1.5S8.33 17 7.5 17zm9 0c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zm1.5-6H6V6h12v5z"/></svg>
                  {!isDesktopSidebarCollapsed && <span>My Vehicle</span>}
                </button>
              </nav>

            </div>

            {/* Sidebar bottom: driver info + sign out */}
            <div className={`border-t border-[var(--border)] p-4 flex flex-col gap-3 shrink-0 ${isDesktopSidebarCollapsed ? 'items-center px-2' : ''}`}>
              {!isDesktopSidebarCollapsed ? (
                <div className="flex flex-col gap-0.5 text-left w-full">
                  <span className="text-[10px] font-semibold text-[var(--text)]">Driver:</span>
                  <span className="text-xs font-bold text-[var(--text-h)] truncate" title={driverProfile.email}>
                    {driverProfile.full_name}
                  </span>
                </div>
              ) : (
                <div className="w-8 h-8 rounded-full bg-[var(--accent-bg)] text-[var(--accent)] flex items-center justify-center font-bold text-xs shrink-0" title={`${driverProfile.full_name} (${driverProfile.email})`}>
                  {driverProfile.full_name.charAt(0).toUpperCase()}
                </div>
              )}
              <Button
                variant="outline"
                size={isDesktopSidebarCollapsed ? "icon" : "sm"}
                onClick={handleSignOut}
                className="w-full justify-center shrink-0"
                title={isDesktopSidebarCollapsed ? "Sign Out" : undefined}
              >
                {isDesktopSidebarCollapsed ? (
                  <svg className="w-4 h-4 text-red-500" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l-3 3m0 0l3 3m-3-3h12.75" />
                  </svg>
                ) : (
                  "Sign Out"
                )}
              </Button>
            </div>
          </aside>

          {/* Main content area */}
          <div className="flex-grow flex flex-col min-w-0 overflow-hidden relative">
            {/* Mobile Menu Button */}
            {!isSidebarOpen && (
              <button
                type="button"
                onClick={() => setIsSidebarOpen(true)}
                className="md:hidden fixed top-4 left-4 z-[1100] w-11 h-11 bg-white border border-[var(--border)] rounded-full shadow-xl flex items-center justify-center cursor-pointer text-neutral-700 hover:bg-neutral-50 active:scale-95 transition-all"
                aria-label="Open navigation"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
                </svg>
              </button>
            )}


            {activeSubTab === 'dashboard' ? (
              /* Full-page map */
              <div className="flex-grow w-full h-full" style={{ minHeight: 0, height: '100%', isolation: 'isolate' }}>
                <DriverMap
                  driverId={sessionUser.id}
                  initialLat={driverProfile.latitude}
                  initialLng={driverProfile.longitude}
                  onLocationUpdate={(lat, lng) => {
                    setDriverProfile((prev: any) => prev ? { ...prev, latitude: lat, longitude: lng } : null);
                  }}
                  originCoords={originCoords}
                  destCoords={destCoords}
                  rideStatus={driverProfile.ride_status}
                />
              </div>
            ) : activeSubTab === 'shift' ? (
              /* Active Shift tab */
              <main className="flex-grow p-4 sm:p-8 pt-20 md:pt-8 box-border overflow-y-auto">
                <div className="max-w-[600px] flex flex-col gap-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-lg font-extrabold text-[var(--text-h)] m-0">Active Shift Assignment</h2>
                      <p className="text-xs text-neutral-400 mt-1 m-0">Your current deployment and passenger manifest</p>
                    </div>
                    {activeShift && (
                      <span className="text-sm font-black uppercase px-3 py-1 rounded-lg bg-purple-100 text-purple-700">
                        {activeShift.bus_number}
                      </span>
                    )}
                  </div>

                  {loadingShift && !activeShift ? (
                    <div className="flex items-center justify-center py-16 text-xs text-neutral-400 font-semibold">Loading shift...</div>
                  ) : !activeShift ? (
                    <div className="bg-white border border-[var(--border)] rounded-xl p-8 text-center">
                      <svg className="w-10 h-10 mx-auto mb-3 text-neutral-300" fill="currentColor" viewBox="0 0 24 24"><path d="M19 3h-1V1h-2v2H8V1H6v2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V8h14v11zM7 10h5v5H7z"/></svg>
                      <p className="text-sm font-semibold text-neutral-500 m-0">No active assignments</p>
                      <p className="text-xs text-neutral-400 mt-1 m-0">You have not been assigned to any transit routes yet.</p>
                    </div>
                  ) : (
                    <>
                      {/* Trip Details card */}
                      <div className="bg-white border border-[var(--border)] rounded-xl overflow-hidden shadow-sm">
                        <div className="px-6 py-4 border-b border-[var(--border)] bg-neutral-50">
                          <h3 className="text-[10px] font-bold text-neutral-400 m-0 tracking-wider uppercase">Trip Details</h3>
                        </div>
                        <div className="p-6">
                          <h4 className="text-base font-extrabold text-[var(--text-h)] m-0">{activeShift.deployments?.name}</h4>
                          <div className="grid grid-cols-2 gap-4 mt-4 text-xs">
                            <div>
                              <span className="block text-[10px] font-semibold text-neutral-400 mb-0.5">Route</span>
                              <span className="font-semibold text-[var(--text-h)]">
                                {driverProfile.ride_status === 'returning'
                                  ? `${activeShift.locations?.name} ➔ Lagos (Redemption Camp)`
                                  : `Lagos (Redemption Camp) ➔ ${activeShift.locations?.name}`}
                              </span>
                            </div>
                            <div>
                              <span className="block text-[10px] font-semibold text-neutral-400 mb-0.5">Departure</span>
                              <span className="font-semibold text-[var(--text-h)]">{new Date(activeShift.deployments?.departure_time).toLocaleString()}</span>
                            </div>
                            <div>
                              <span className="block text-[10px] font-semibold text-neutral-400 mb-0.5">Status</span>
                              <span className="font-extrabold uppercase text-[var(--accent)]">{driverProfile.ride_status || 'idle'}</span>
                            </div>
                            <div>
                              <span className="block text-[10px] font-semibold text-neutral-400 mb-0.5">Passengers Boarded</span>
                              <span className="font-semibold text-[var(--text-h)]">{shiftBookings.filter(b => b.checked_in).length} / {shiftBookings.length}</span>
                            </div>
                          </div>

                          {/* Journey action buttons */}
                          <div className="flex gap-3 mt-6">
                            {(driverProfile.ride_status === 'idle' || !driverProfile.ride_status) && (
                              <Button variant="default" className="text-xs font-bold" onClick={() => handleUpdateRideStatus('enroute')}>
                                Start Outbound Journey
                              </Button>
                            )}
                            {driverProfile.ride_status === 'enroute' && (
                              <Button variant="default" className="text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white" onClick={() => handleUpdateRideStatus('returning')}>
                                Start Return Journey
                              </Button>
                            )}
                            {driverProfile.ride_status === 'returning' && (
                              <Button variant="default" className="text-xs font-bold bg-red-600 hover:bg-red-700 text-white" onClick={() => handleUpdateRideStatus('completed')}>
                                End Shift & Complete
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Passenger Checklist card */}
                      <div className="bg-white border border-[var(--border)] rounded-xl overflow-hidden shadow-sm">
                        <div className="px-6 py-4 border-b border-[var(--border)] bg-neutral-50 flex justify-between items-center">
                          <h3 className="text-[10px] font-bold text-neutral-400 m-0 tracking-wider uppercase">Passenger Checklist</h3>
                          <span className="text-[10px] font-bold text-neutral-600">
                            {shiftBookings.filter(b => b.checked_in).length} / {shiftBookings.length} Boarded
                          </span>
                        </div>
                        <div className="divide-y divide-[var(--border)]">
                          {shiftBookings.length === 0 ? (
                            <p className="text-xs text-neutral-400 italic text-center py-6 m-0">No passengers booked.</p>
                          ) : shiftBookings.map((b) => (
                            <div key={b.id} className="px-6 py-3 flex items-center justify-between">
                              <div>
                                <span className="font-semibold text-sm text-[var(--text-h)] block">{b.passengers?.full_name}</span>
                                <span className="text-[11px] text-neutral-400">Seat #{b.seat_number}</span>
                              </div>
                              {b.checked_in ? (
                                <span className="text-[9px] font-black uppercase text-green-700 bg-green-100 px-2 py-1 rounded">Boarded</span>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => handleCheckInPassenger(b.id)}
                                  className="px-3 py-1.5 text-[10px] font-bold text-white bg-[var(--accent)] border-none rounded cursor-pointer hover:bg-purple-700"
                                >
                                  Check In
                                </button>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </main>
            ) : (
              /* Bus tab — normal padded layout with editing support */
              <main className="flex-grow p-4 sm:p-8 pt-20 md:pt-8 box-border overflow-y-auto">
                <div className="max-w-[540px] bg-white border border-[var(--border)] rounded-xl p-6 box-border shadow-sm">
                  <div className="flex justify-between items-center mb-6">
                    <h3 className="text-xs font-bold text-neutral-400 m-0 tracking-wider">Assigned Bus Details</h3>
                    {!isEditingVehicle && (
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => {
                          setError(null);
                          setSuccessMsg(null);
                          setVehicleType(driverProfile.vehicle_type);
                          setVehicleCapacity(driverProfile.vehicle_capacity.toString());
                          setVehiclePlate(driverProfile.vehicle_plate);
                          setBusNumber(driverProfile.bus_number || 'Bus 1');
                          setIsEditingVehicle(true);
                        }}
                      >
                        Edit Details
                      </Button>
                    )}
                  </div>

                  {successMsg && (
                    <Alert variant="success" className="mb-4">
                      {successMsg}
                    </Alert>
                  )}

                  {error && (
                    <Alert variant="error" className="mb-4">
                      {error}
                    </Alert>
                  )}

                  {!isEditingVehicle ? (
                    <div className="flex flex-col gap-4">
                      <div className="border-b border-neutral-100 pb-3 flex justify-between items-center text-xs">
                        <span className="text-neutral-400">Bus Type</span>
                        <span className="font-semibold text-[var(--text-h)]">{driverProfile.vehicle_type}</span>
                      </div>
                      <div className="border-b border-neutral-100 pb-3 flex justify-between items-center text-xs">
                        <span className="text-neutral-400">Seats Capacity</span>
                        <span className="font-semibold text-[var(--text-h)]">{driverProfile.vehicle_capacity} Seats</span>
                      </div>
                      <div className="border-b border-neutral-100 pb-3 flex justify-between items-center text-xs">
                        <span className="text-neutral-400">Plate Number</span>
                        <span className="font-semibold text-[var(--text-h)] font-mono">{driverProfile.vehicle_plate}</span>
                      </div>
                      <div className="pb-1 flex justify-between items-center text-xs">
                        <span className="text-neutral-400">Bus Registry Number</span>
                        <span className="font-semibold text-[var(--text-h)]">{driverProfile.bus_number || 'N/A'}</span>
                      </div>
                    </div>
                  ) : (
                    <form onSubmit={handleUpdateVehicle} className="flex flex-col gap-5">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-[10px] font-semibold text-neutral-400 mb-1.5 tracking-wider">Bus Type</label>
                          <select
                            value={vehicleType}
                            onChange={(e) => {
                              const type = e.target.value;
                              setVehicleType(type);
                              if (type === 'Coaster') setVehicleCapacity('22');
                              else if (type === 'Mini-bus') setVehicleCapacity('14');
                              else if (type === 'Shuttle') setVehicleCapacity('18');
                              else if (type === 'Coach') setVehicleCapacity('45');
                              else if (type === 'Van') setVehicleCapacity('8');
                            }}
                            className="w-full px-3 py-2 bg-white border border-[var(--border)] rounded-md text-xs text-[var(--text-h)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)] box-border"
                          >
                            <option value="Mini-bus">Mini-bus</option>
                            <option value="Coaster">Coaster (22 Seats)</option>
                            <option value="Shuttle">Shuttle</option>
                            <option value="Coach">Coach</option>
                            <option value="Van">Van</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-[10px] font-semibold text-neutral-400 mb-1.5 tracking-wider">Capacity (Seats)</label>
                          <input
                            type="number"
                            value={vehicleCapacity}
                            onChange={(e) => setVehicleCapacity(e.target.value)}
                            required
                            min="1"
                            className="w-full px-3 py-2 bg-white border border-[var(--border)] rounded-md text-xs text-[var(--text-h)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)] box-border"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-[10px] font-semibold text-neutral-400 mb-1.5 tracking-wider">Bus Registry Number</label>
                          <select
                            value={busNumber}
                            onChange={(e) => setBusNumber(e.target.value)}
                            className="w-full px-3 py-2 bg-white border border-[var(--border)] rounded-md text-xs text-[var(--text-h)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)] box-border"
                          >
                            {Array.from({ length: totalBuses }, (_, i) => `Bus ${i + 1}`).map((num) => (
                              <option key={num} value={num}>{num}</option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="block text-[10px] font-semibold text-neutral-400 mb-1.5 tracking-wider">License Plate Number</label>
                          <input
                            type="text"
                            value={vehiclePlate}
                            onChange={(e) => setVehiclePlate(e.target.value)}
                            required
                            placeholder="e.g. EKY-456-XY"
                            className="w-full px-3 py-2 bg-white border border-[var(--border)] rounded-md text-xs text-[var(--text-h)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)] box-border"
                          />
                        </div>
                      </div>

                      <div className="flex gap-3 justify-end mt-2">
                        <Button 
                          type="button" 
                          variant="outline" 
                          onClick={() => {
                            setIsEditingVehicle(false);
                            setError(null);
                          }}
                          disabled={loading}
                        >
                          Cancel
                        </Button>
                        <Button type="submit" disabled={loading}>
                          {loading ? 'Saving...' : 'Save Changes'}
                        </Button>
                      </div>
                    </form>
                  )}
                </div>
              </main>
            )}
          </div>
        </div>
        </>
      );
    }

    return (
      <div className="w-full min-h-screen bg-[var(--bg)] flex flex-col items-center justify-center p-6 box-border">
        <div className="w-full max-w-[480px] bg-white border border-[var(--border)] rounded-xl shadow-sm p-8 box-border relative animate-in fade-in duration-200">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-lg font-extrabold text-[var(--text-h)] m-0">Driver Portal</h2>
            <Button variant="outline" size="sm" onClick={handleSignOut}>
              Sign Out
            </Button>
          </div>

          {/* Status Panels */}
          {isPending && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-5 mb-6 text-center animate-pulse duration-[2000ms]">
              <span className="inline-block px-3 py-1 bg-amber-100 text-amber-700 rounded-full text-[10px] font-bold mb-3">
                Application under review
              </span>
              <p className="text-xs text-amber-800 m-0 leading-relaxed font-medium">
                Hello, <strong>{driverProfile.full_name}</strong>. Your dispatcher registration is currently pending review by our administrator network. You will be activated shortly.
              </p>
            </div>
          )}

          {isRejected && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-5 mb-6 text-center">
              <span className="inline-block px-3 py-1 bg-red-100 text-red-700 rounded-full text-[10px] font-bold mb-3">
                Application rejected
              </span>
              <p className="text-xs text-red-800 mb-4 leading-relaxed font-medium">
                Your driver application has been rejected. Please review your details and re-apply below if necessary.
              </p>
              <Button variant="default" size="sm" onClick={() => setDriverProfile(null)}>
                Re-submit Application
              </Button>
            </div>
          )}

          {/* Vehicle & Personal Details */}
          <div className="border border-[var(--border)] rounded-xl p-5 bg-neutral-50 flex flex-col gap-3">
            <h3 className="text-xs font-bold text-neutral-400 m-0">Registered details</h3>

            <div className="grid grid-cols-2 gap-4 text-xs">
              <div>
                <span className="block text-[10px] font-semibold text-neutral-400">License number</span>
                <span className="font-semibold text-[var(--text-h)] font-mono">{driverProfile.license_number}</span>
              </div>
              <div>
                <span className="block text-[10px] font-semibold text-neutral-400">Phone number</span>
                <span className="font-semibold text-[var(--text-h)]">{driverProfile.phone}</span>
              </div>
              <div>
                <span className="block text-[10px] font-semibold text-neutral-400">Vehicle assignment</span>
                <span className="font-semibold text-[var(--text-h)]">{driverProfile.vehicle_type} ({driverProfile.vehicle_capacity} Seats)</span>
              </div>
              <div>
                <span className="block text-[10px] font-semibold text-neutral-400">Plate number</span>
                <span className="font-semibold text-[var(--text-h)] font-mono">{driverProfile.vehicle_plate}</span>
              </div>
              <div>
                <span className="block text-[10px] font-semibold text-neutral-400">Bus number</span>
                <span className="font-semibold text-[var(--text-h)]">{driverProfile.bus_number || 'N/A'}</span>
              </div>
            </div>
          </div>

          {/* Back Link */}
          <div className="text-center mt-6 border-t border-[var(--border)] pt-4">
            <button
              type="button"
              onClick={() => navigate(ROUTES.home)}
              className="text-xs font-semibold text-neutral-500 hover:text-[var(--accent)] bg-transparent border-none cursor-pointer hover:underline inline-flex items-center gap-1.5"
            >
              ← Back to Portal Gateway
            </button>
          </div>
        </div>
      </div>
    );
  }

  // 3. Authenticated, needs to register profile
  // 3. Authenticated, profile fetch complete, no profile yet -> show registration
  if (sessionUser && hasCheckedProfile && !driverProfile) {
    return (
      <AuthScreenLayout banner={error ? { variant: 'error', message: error } : null}>
      <DriverSignupForm
        email={sessionUser.email || ''}
        fullName={fullName}
        setFullName={setFullName}
        phone={phone}
        setPhone={setPhone}
        licenseNumber={licenseNumber}
        setLicenseNumber={setLicenseNumber}
        vehicleType={vehicleType}
        setVehicleType={setVehicleType}
        vehicleCapacity={vehicleCapacity}
        setVehicleCapacity={setVehicleCapacity}
        vehiclePlate={vehiclePlate}
        setVehiclePlate={setVehiclePlate}
        busNumber={busNumber}
        setBusNumber={setBusNumber}
        totalBuses={totalBuses}
        loading={loading}
        onSubmit={handleRegisterDriver}
        onSignOut={handleSignOut}
      />
      </AuthScreenLayout>
    );
  }

  // 4. Not Authenticated -> Display Sign In / Sign Up Form
  const authBanner = error
    ? { variant: 'error' as const, message: error }
    : successMsg
      ? { variant: 'success' as const, message: successMsg }
      : null;

  return (
    <AuthScreenLayout banner={authBanner}>
      <div className="w-full max-w-[420px] bg-white border border-[var(--border)] rounded-xl shadow-sm p-8 box-border relative animate-in fade-in duration-200">
        <div className="text-center mb-6">
          <h2 className="text-lg font-bold text-[var(--text-h)] m-0">
            {authMode === 'signin' ? 'Driver Sign In' : 'Driver Sign Up'}
          </h2>
          <p className="text-xs text-[var(--text)] mt-1.5">
            {authMode === 'signin' ? 'Access your driver dispatcher dashboard' : 'Join our transit network and register your bus'}
          </p>
        </div>

        <form onSubmit={handleAuth} className="flex flex-col gap-4">
          <div>
            <label className="block text-xs font-semibold text-[var(--text-h)] mb-1.5">Email Address</label>
            <input
              type="text"
              inputMode="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="you or you@gmail.com"
              className="w-full px-3.5 py-2.5 bg-white border border-[var(--border)] rounded-md text-sm text-[var(--text-h)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)] box-border"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[var(--text-h)] mb-1.5">Password</label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="••••••••"
                className="w-full pl-3.5 pr-11 py-2.5 bg-white border border-[var(--border)] rounded-md text-sm text-[var(--text-h)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)] box-border"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 bg-transparent border-none cursor-pointer text-neutral-400 hover:text-neutral-600 transition-colors p-1 flex items-center justify-center"
                title={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
                  </svg>
                ) : (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                )}
              </button>
            </div>
          </div>

          <Button type="submit" disabled={loading} className="w-full py-2.5 mt-2">
            {loading ? 'Processing...' : authMode === 'signin' ? 'Sign In' : 'Sign Up'}
          </Button>
        </form>

        <div className="flex flex-col gap-5 mt-6">
          <div className="relative flex items-center">
            <div className="flex-grow border-t border-[var(--border)]"></div>
            <span className="flex-shrink mx-4 text-[10px] text-neutral-400 font-semibold">or continue with</span>
            <div className="flex-grow border-t border-[var(--border)]"></div>
          </div>

          <button
            type="button"
            onClick={handleGoogleAuth}
            className="w-full py-2.5 px-4 bg-white hover:bg-neutral-50 active:bg-neutral-100 border border-[var(--border)] rounded-md text-sm font-semibold text-[var(--text-h)] cursor-pointer flex items-center justify-center gap-2 transition-all"
          >
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l3.66-2.85z" fill="#FBBC05" />
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.85c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
          </svg>
            Continue with Google
          </button>

          <div className="text-center text-xs pt-1">
            <span className="text-[var(--text)]">
              {authMode === 'signin' ? "Don't have an account? " : "Already have an account? "}
            </span>
            <button
              type="button"
              onClick={() => {
                setAuthMode(authMode === 'signin' ? 'signup' : 'signin');
                setError(null);
              }}
              className="font-bold text-[#6e54ff] bg-transparent border-none cursor-pointer hover:text-[#5b40e8] hover:underline p-0"
            >
              {authMode === 'signin' ? 'Sign up' : 'Sign in'}
            </button>
          </div>
        </div>

      </div>
    </AuthScreenLayout>
  );
};
