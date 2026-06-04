import React, { useState, useEffect } from 'react';
import { supabase } from '../../utils/supabase';
import { normalizeEmailInput } from '../../utils/email';
import { ROUTES, navigate } from '../../utils/routes';
import { Alert } from '../ui/alert';
import { Button } from '../ui/button';
import { PassengerAuthForm } from './PassengerAuthForm';
import { AuthScreenLayout } from '../auth/AuthScreenLayout';
import { PassengerMap } from './PassengerMap';
import { CreditStore, CreditBalance } from '../credits';

const NIGERIAN_STATES = [
  'Abia', 'Adamawa', 'Akwa Ibom', 'Anambra', 'Bauchi', 'Bayelsa', 'Benue',
  'Borno', 'Cross River', 'Delta', 'Ebonyi', 'Edo', 'Ekiti', 'Enugu',
  'FCT - Abuja', 'Gombe', 'Imo', 'Jigawa', 'Kaduna', 'Kano', 'Katsina',
  'Kebbi', 'Kogi', 'Kwara', 'Lagos', 'Nasarawa', 'Niger', 'Ogun', 'Ondo',
  'Osun', 'Oyo', 'Plateau', 'Rivers', 'Sokoto', 'Taraba', 'Yobe', 'Zamfara'
];

export const PassengerPortal: React.FC = () => {
  const [sessionUser, setSessionUser] = useState<any>(null);
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [selectedState, setSelectedState] = useState('');
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [activeSubTab, setActiveSubTab] = useState<'map' | 'routes' | 'bookings' | 'credits'>('map');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isDesktopSidebarCollapsed, setIsDesktopSidebarCollapsed] = useState(false);

  // Profile status
  const [passengerProfile, setPassengerProfile] = useState<any>(null);
  const [onboardLoading, setOnboardLoading] = useState(false);
  const [onboardError, setOnboardError] = useState<string | null>(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const [hasCheckedProfile, setHasCheckedProfile] = useState(false);

  // Bookings & Deployments
  const [activeDeployments, setActiveDeployments] = useState<any[]>([]);
  const [loadingDeployments, setLoadingDeployments] = useState(false);
  const [selectedBus, setSelectedBus] = useState<any>(null);
  const [busBookings, setBusBookings] = useState<any[]>([]);
  const [myBookings, setMyBookings] = useState<any[]>([]);
  const [bookingLoading, setBookingLoading] = useState(false);
  const [selectedSeatNumber, setSelectedSeatNumber] = useState<number | null>(null);
  const [busCapacity, setBusCapacity] = useState<number>(14);

  // Route coordinates for passenger map
  const [originCoords, setOriginCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [destCoords, setDestCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [originName, setOriginName] = useState('Boarding Terminal');
  const [destName, setDestName] = useState('Redemption Camp, Lagos');
  const [driverId, setDriverId] = useState<string | null>(null);

  // Fetch session on load
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSessionUser(session?.user ?? null);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSessionUser(session?.user ?? null);
      if (!session) {
        setPassengerProfile(null);
        setHasCheckedProfile(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (sessionUser) {
      fetchProfile();
      const googleName = sessionUser.user_metadata?.full_name || sessionUser.user_metadata?.name;
      if (googleName && !fullName) {
        setFullName(googleName);
      }
    } else {
      setPassengerProfile(null);
    }
  }, [sessionUser]);

  useEffect(() => {
    if (passengerProfile) {
      fetchActiveDeployments();
      fetchMyBookings();
    }
  }, [passengerProfile]);

  const fetchProfile = async () => {
    if (!sessionUser) return;
    setProfileLoading(true);
    try {
      const { data, error } = await supabase
        .from('passengers')
        .select('*')
        .eq('id', sessionUser.id)
        .maybeSingle();

      if (error) throw error;
      setPassengerProfile(data);
      if (data) {
        setFullName(data.full_name);
        setPhone(data.phone);
        setSelectedState(data.state);
      }
    } catch (err) {
      console.error('Failed to fetch profile:', err);
    } finally {
      setHasCheckedProfile(true);
      setProfileLoading(false);
    }
  };

  const fetchActiveDeployments = async () => {
    setLoadingDeployments(true);
    try {
      // Fetch deployment buses assigned to passenger's state
      const { data, error } = await supabase
        .from('deployment_buses')
        .select(`
          *,
          deployments (*),
          locations (*)
        `);
      if (error) throw error;

      // Filter in JS to ensure clean parsing of inner relations
      const filtered = (data || []).filter((db: any) => {
        return db.locations?.name === passengerProfile?.state && db.deployments;
      });
      setActiveDeployments(filtered);
    } catch (err) {
      console.error('Failed to load active deployments:', err);
    } finally {
      setLoadingDeployments(false);
    }
  };

  const fetchMyBookings = async () => {
    if (!sessionUser) return;
    try {
      const { data, error } = await supabase
        .from('passenger_bookings')
        .select(`
          *,
          deployment_buses (
            bus_number,
            locations (
              name,
              latitude,
              longitude
            ),
            deployments (
              name,
              departure_time
            )
          )
        `)
        .eq('passenger_id', sessionUser.id);
      if (error) throw error;
      setMyBookings(data || []);
    } catch (err) {
      console.error('Failed to load user bookings:', err);
    }
  };

  const handleGoogleAuth = async () => {
    setAuthLoading(true);
    setAuthError(null);
    setSuccessMsg(null);
    localStorage.setItem('oauth_role', 'passenger');
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/`,
        },
      });
      if (error) throw error;
    } catch (err: any) {
      setAuthError(err.message || 'Google authentication failed.');
      setAuthLoading(false);
      localStorage.removeItem('oauth_role');
    }
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthLoading(true);
    setAuthError(null);
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
              role: 'passenger'
            }
          }
        });
        if (error) throw error;
        setSuccessMsg('Registration successful! Please check your email, then sign in.');
        setAuthMode('signin');
        setPassword('');
      }
    } catch (err: any) {
      setAuthError(err.message || 'Auth failed.');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleOnboarding = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim() || !phone.trim() || !selectedState) {
      setOnboardError('All fields are required.');
      return;
    }

    setOnboardLoading(true);
    setOnboardError(null);

    try {
      // 1. Save profile
      const { error: profileError } = await supabase
        .from('passengers')
        .upsert({
          id: sessionUser.id,
          email: sessionUser.email,
          full_name: fullName.trim(),
          phone: phone.trim(),
          state: selectedState
        });
      if (profileError) throw profileError;

      // 2. Set user role to passenger in user_roles
      const { error: roleError } = await supabase
        .from('user_roles')
        .upsert({
          id: sessionUser.id,
          role: 'passenger'
        });
      if (roleError) throw roleError;

      await fetchProfile();
    } catch (err: any) {
      setOnboardError(err.message || 'Onboarding failed.');
    } finally {
      setOnboardLoading(false);
    }
  };

  const loadBusBookings = async (busId: string) => {
    try {
      const { data, error } = await supabase
        .from('passenger_bookings')
        .select('*')
        .eq('deployment_bus_id', busId);
      if (error) throw error;
      setBusBookings(data || []);
    } catch (err) {
      console.error('Failed to load bus bookings:', err);
    }
  };

  const handleSelectBus = async (bus: any) => {
    setSelectedBus(bus);
    setBusCapacity(14); // default fallback
    loadBusBookings(bus.id);

    try {
      const { data, error } = await supabase
        .from('drivers')
        .select('vehicle_capacity')
        .eq('bus_number', bus.bus_number)
        .maybeSingle();

      if (error) throw error;
      if (data?.vehicle_capacity) {
        setBusCapacity(data.vehicle_capacity);
      }
    } catch (err) {
      console.error('Failed to load driver capacity:', err);
    }
  };

  const BOOKING_CREDIT_COST = 2;

  const handleBookSeat = async () => {
    if (!selectedBus || selectedSeatNumber === null) return;

    // Check credit balance before proceeding
    if ((passengerProfile?.credits ?? 0) < BOOKING_CREDIT_COST) {
      setSelectedBus(null);
      setActiveSubTab('credits');
      return;
    }

    setBookingLoading(true);
    try {
      // Insert booking
      const { error } = await supabase
        .from('passenger_bookings')
        .insert({
          passenger_id: sessionUser.id,
          deployment_id: selectedBus.deployment_id,
          deployment_bus_id: selectedBus.id,
          seat_number: selectedSeatNumber
        });
      if (error) throw error;

      // Deduct 2 credits atomically
      const { data: deducted } = await supabase.rpc('deduct_credits', {
        p_passenger_id: sessionUser.id,
        p_amount: BOOKING_CREDIT_COST,
      });

      if (deducted === false) throw new Error('Insufficient credits.');

      // Log the deduction
      await supabase.from('credit_transactions').insert({
        passenger_id: sessionUser.id,
        type: 'deduction',
        amount: -BOOKING_CREDIT_COST,
        description: `Seat ${selectedSeatNumber} booked on ${selectedBus.bus_number}`,
      });

      // Update credit balance in local state immediately
      setPassengerProfile((prev: any) => ({
        ...prev,
        credits: (prev.credits ?? 0) - BOOKING_CREDIT_COST,
      }));

      loadBusBookings(selectedBus.id);
      fetchMyBookings();
      setSelectedSeatNumber(null);
      setSelectedBus(null);
      alert('Booking registered! 2 credits deducted.');
    } catch (err: any) {
      alert(err.message || 'Seat is already booked. Please pick another one.');
    } finally {
      setBookingLoading(false);
    }
  };

  const handleCancelBooking = async (bookingId: string) => {
    if (!confirm('Are you sure you want to cancel this booking?')) return;
    setBookingLoading(true);
    try {
      const { error } = await supabase
        .from('passenger_bookings')
        .delete()
        .eq('id', bookingId);
      if (error) throw error;

      if (selectedBus) {
        loadBusBookings(selectedBus.id);
      }
      fetchMyBookings();
    } catch (err: any) {
      alert(err.message || 'Failed to cancel booking.');
    } finally {
      setBookingLoading(false);
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate(ROUTES.home);
  };

  // Fetch route coordinates and active driver whenever bookings change
  useEffect(() => {
    if (myBookings.length === 0) {
      setOriginCoords(null);
      setDestCoords(null);
      setDriverId(null);
      return;
    }

    const fetchRouteCoords = async () => {
      try {
        const booking = myBookings[0];
        const originLocationName = booking.deployment_buses?.locations?.name;
        const deploymentId = booking.deployment_id;

        // Fetch primary (destination) location
        const { data: primaryLocs } = await supabase
          .from('locations')
          .select('*')
          .eq('type', 'primary')
          .limit(1);

        const primary = primaryLocs?.[0];
        if (primary) {
          setDestCoords({ lat: primary.latitude || 6.8024, lng: primary.longitude || 3.4975 });
          setDestName(primary.name || 'Redemption Camp, Lagos');
        }

        // Fetch secondary (boarding) location by name
        if (originLocationName) {
          const { data: secondaryLocs } = await supabase
            .from('locations')
            .select('*')
            .eq('name', originLocationName)
            .limit(1);

          const secondary = secondaryLocs?.[0];
          if (secondary) {
            setOriginCoords({ lat: secondary.latitude || 6.5244, lng: secondary.longitude || 3.3792 });
            setOriginName(secondary.name || originLocationName);
          }
        }

        // Find the driver assigned to this deployment and currently on a journey
        if (deploymentId) {
          const { data: drivers } = await supabase
            .from('drivers')
            .select('id, ride_status')
            .eq('active_deployment_id', deploymentId)
            .in('ride_status', ['enroute', 'returning'])
            .limit(1);

          setDriverId(drivers?.[0]?.id ?? null);
        }
      } catch (err) {
        console.error('Failed to load route coordinates:', err);
      }
    };

    fetchRouteCoords();

    // Watch for driver going active on this deployment in real time
    const booking = myBookings[0];
    const deploymentId = booking?.deployment_id;
    if (!deploymentId) return;

    const channel = supabase
      .channel(`deployment-driver-${deploymentId}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'drivers' },
        (payload) => {
          const updated = payload.new as any;
          if (updated.active_deployment_id === deploymentId) {
            if (updated.ride_status === 'enroute' || updated.ride_status === 'returning') {
              setDriverId(updated.id);
            } else {
              setDriverId(null);
            }
          }
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [myBookings]);

  // Auth screen
  if (!sessionUser) {
    const authBanner = authError
      ? { variant: 'error' as const, message: authError }
      : successMsg
        ? { variant: 'success' as const, message: successMsg }
        : null;

    return (
      <AuthScreenLayout banner={authBanner}>
        <PassengerAuthForm
          authMode={authMode}
          setAuthMode={setAuthMode}
          email={email}
          setEmail={setEmail}
          password={password}
          setPassword={setPassword}
          authLoading={authLoading}
          handleAuth={handleAuth}
          onGoogleAuth={handleGoogleAuth}
        />
      </AuthScreenLayout>
    );
  }

  // Loading state when fetching profile
  if (sessionUser && !hasCheckedProfile && profileLoading) {
    return (
      <div className="w-full min-h-screen bg-[var(--bg)] flex items-center justify-center p-4 box-border">
        <div className="w-full max-w-[400px] bg-white border border-[var(--border)] rounded-xl shadow-sm p-8 box-border relative flex flex-col items-center justify-center min-h-[250px] gap-3 text-center">
          <svg className="animate-spin h-8 w-8 text-[var(--accent)]" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          <span className="text-xs text-[var(--text)] font-semibold text-neutral-500">Retrieving Passenger Profile...</span>
        </div>
      </div>
    );
  }

  // Profile onboarding wizard
  if (!passengerProfile) {
    return (
      <div className="max-w-[460px] mx-auto my-16 bg-white border border-[var(--border)] rounded-2xl p-8 shadow-md">
        <h2 className="text-lg font-bold text-[var(--text-h)] m-0">Passenger profile setup</h2>
        <p className="text-xs text-[var(--text)] mt-1">Complete your registration profile to book active transit programs.</p>

        {onboardError && (
          <Alert variant="error" className="mt-4">
            {onboardError}
          </Alert>
        )}

        <form onSubmit={handleOnboarding} className="mt-5 flex flex-col gap-4 text-left">
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-[var(--text-h)]">Full Name</label>
            <input
              type="text"
              placeholder="e.g. John Doe"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
              className="p-2.5 border border-[var(--border)] rounded-lg text-xs outline-none focus:border-[var(--accent)]"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-[var(--text-h)]">Phone Number</label>
            <input
              type="text"
              placeholder="e.g. +2348012345678"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              required
              className="p-2.5 border border-[var(--border)] rounded-lg text-xs outline-none focus:border-[var(--accent)]"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-[var(--text-h)]">Origin State / Location</label>
            <select
              value={selectedState}
              onChange={(e) => setSelectedState(e.target.value)}
              required
              className="p-2.5 border border-[var(--border)] rounded-lg text-xs bg-white outline-none focus:border-[var(--accent)]"
            >
              <option value="">-- Select your state --</option>
              {NIGERIAN_STATES.map((state) => (
                <option key={state} value={state}>
                  {state}
                </option>
              ))}
            </select>
            <p className="text-[9px] text-[var(--text)] mt-1">
              Select the state you will be boarding the bus from.
            </p>
          </div>

          <Button variant="default" size="sm" type="submit" disabled={onboardLoading} className="w-full py-3 mt-2">
            {onboardLoading ? 'Completing Onboarding...' : 'Save Profile & Onboard'}
          </Button>
        </form>
      </div>
    );
  }

  // Dashboard & Booking Pass View
  return (
    <div className="w-full h-screen bg-[var(--bg)] flex box-border overflow-hidden">
      {/* Mobile Sidebar Backdrop */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-40 md:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed md:relative top-0 bottom-0 left-0 z-50 md:z-0
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
              <div className="flex flex-col">
                <span className="text-[10px] font-bold tracking-wider text-[var(--text)] opacity-60">
                  Passenger Portal
                </span>
                <h2 className="text-base font-extrabold text-[var(--text-h)] m-0 mt-1">
                  CityBus Transit
                </h2>
              </div>
            ) : (
              <div className="flex justify-center items-center py-1 text-[var(--accent)]" title="CityBus Transit">
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
                setActiveSubTab('map');
                setIsSidebarOpen(false);
              }}
              className={`w-full rounded-lg text-xs font-semibold transition-all duration-150 border-none cursor-pointer flex items-center ${
                isDesktopSidebarCollapsed ? 'justify-center p-2.5' : 'text-left px-3.5 py-2.5 gap-2.5'
              } ${
                activeSubTab === 'map'
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
                setActiveSubTab('routes');
                setIsSidebarOpen(false);
              }}
              className={`w-full rounded-lg text-xs font-semibold transition-all duration-150 border-none cursor-pointer flex items-center ${
                isDesktopSidebarCollapsed ? 'justify-center p-2.5' : 'text-left px-3.5 py-2.5 gap-2.5'
              } ${
                activeSubTab === 'routes'
                  ? 'bg-[var(--accent-bg)] text-[var(--accent)]'
                  : 'bg-transparent text-[var(--text)] hover:bg-neutral-100 hover:text-[var(--text-h)]'
              }`}
              title={isDesktopSidebarCollapsed ? 'Book Routes' : undefined}
            >
              <svg className="w-3.5 h-3.5 shrink-0" fill="currentColor" viewBox="0 0 24 24"><path d="M4 16c0 .88.39 1.67 1 2.22V20c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h8v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1.78c.61-.55 1-1.34 1-2.22V6c0-3.5-3.58-4-8-4s-8 .5-8 4v10zm3.5 1c-.83 0-1.5-.67-1.5-1.5S6.67 14 7.5 14s1.5.67 1.5 1.5S8.33 17 7.5 17zm9 0c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zm1.5-6H6V6h12v5z"/></svg>
              {!isDesktopSidebarCollapsed && <span>Book Routes</span>}
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveSubTab('bookings');
                setIsSidebarOpen(false);
              }}
              className={`w-full rounded-lg text-xs font-semibold transition-all duration-150 border-none cursor-pointer flex items-center ${
                isDesktopSidebarCollapsed ? 'justify-center p-2.5' : 'text-left px-3.5 py-2.5 gap-2.5'
              } ${
                activeSubTab === 'bookings'
                  ? 'bg-[var(--accent-bg)] text-[var(--accent)]'
                  : 'bg-transparent text-[var(--text)] hover:bg-neutral-100 hover:text-[var(--text-h)]'
              }`}
              title={isDesktopSidebarCollapsed ? 'My Bookings' : undefined}
            >
              <div className="relative flex items-center justify-center shrink-0">
                <svg className="w-3.5 h-3.5 shrink-0" fill="currentColor" viewBox="0 0 24 24"><path d="M19 3h-1V1h-2v2H8V1H6v2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V8h14v11zM7 10h5v5H7z"/></svg>
                {isDesktopSidebarCollapsed && myBookings.length > 0 && (
                  <span className="absolute -top-1 -right-1 w-2 h-2 bg-purple-600 rounded-full border border-white" />
                )}
              </div>
              {!isDesktopSidebarCollapsed && <span>My Bookings</span>}
              {!isDesktopSidebarCollapsed && myBookings.length > 0 && (
                <span className="ml-auto text-[10px] font-semibold bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded">
                  {myBookings.length}
                </span>
              )}
            </button>
            <button
              type="button"
              onClick={() => { setActiveSubTab('credits'); setIsSidebarOpen(false); }}
              className={`w-full rounded-lg text-xs font-semibold transition-all duration-150 border-none cursor-pointer flex items-center ${
                isDesktopSidebarCollapsed ? 'justify-center p-2.5' : 'text-left px-3.5 py-2.5 gap-2.5'
              } ${
                activeSubTab === 'credits'
                  ? 'bg-[var(--accent-bg)] text-[var(--accent)]'
                  : 'bg-transparent text-[var(--text)] hover:bg-neutral-100 hover:text-[var(--text-h)]'
              }`}
              title={isDesktopSidebarCollapsed ? 'Credits' : undefined}
            >
              <svg className="w-3.5 h-3.5 shrink-0" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1.41 16.09V20h-2.67v-1.93c-1.71-.36-3.16-1.46-3.27-3.4h1.96c.1 1.05.82 1.87 2.65 1.87 1.96 0 2.4-.98 2.4-1.59 0-.83-.44-1.61-2.67-2.14-2.48-.6-4.18-1.62-4.18-3.67 0-1.72 1.39-2.84 3.11-3.21V4h2.67v1.95c1.86.45 2.79 1.86 2.85 3.39H14.3c-.05-1.11-.64-1.87-2.22-1.87-1.5 0-2.4.68-2.4 1.64 0 .84.65 1.39 2.67 1.91s4.18 1.39 4.18 3.91c-.01 1.83-1.38 2.83-3.12 3.16z"/>
              </svg>
              {!isDesktopSidebarCollapsed && <span>Credits</span>}
              {!isDesktopSidebarCollapsed && (
                <span className="ml-auto text-[10px] font-semibold bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded">
                  {passengerProfile?.credits ?? 0}
                </span>
              )}
            </button>
          </nav>
        </div>

        {/* Sidebar bottom: user info + sign out */}
        <div className={`border-t border-[var(--border)] p-4 flex flex-col gap-3 shrink-0 ${isDesktopSidebarCollapsed ? 'items-center px-2' : ''}`}>
          {!isDesktopSidebarCollapsed ? (
            <div className="flex flex-col gap-0.5 text-left w-full">
              <span className="text-[10px] font-semibold text-[var(--text)]">Passenger:</span>
              <span className="text-xs font-semibold text-[var(--text-h)] truncate" title={passengerProfile.email}>
                {passengerProfile.full_name}
              </span>
              <span className="text-[10px] text-[var(--text)] mt-1.5 flex flex-col gap-0.5">
                <span>Terminal:</span>
                <span className="font-semibold text-[var(--accent)]">{passengerProfile.state}</span>
              </span>
              <div className="mt-2">
                <CreditBalance credits={passengerProfile.credits ?? 0} compact />
              </div>
            </div>
          ) : (
            <div className="w-8 h-8 rounded-full bg-[var(--accent-bg)] text-[var(--accent)] flex items-center justify-center font-bold text-xs shrink-0" title={`${passengerProfile.full_name} (${passengerProfile.state} Terminal)`}>
              {passengerProfile.full_name.charAt(0).toUpperCase()}
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
      <div className="flex-grow flex flex-col min-w-0 overflow-hidden bg-[var(--bg)] relative">

        {/* Mobile Menu Button - Fixed top-left, always above Leaflet tile panes */}
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

        {/* Map is ALWAYS rendered in the background */}
        <div className="w-full h-full absolute inset-0 z-0">
          <PassengerMap
            originCoords={originCoords}
            destCoords={destCoords}
            originName={originName}
            destName={destName}
            driverId={driverId}
          />
        </div>

        {/* Mobile bottom CTA sheet card - Bolt style */}
        {activeSubTab === 'map' && (
          <div className="md:hidden absolute bottom-6 left-4 right-4 z-30 bg-white border border-[var(--border)] rounded-2xl shadow-xl p-4 flex flex-col gap-3 animate-in slide-in-from-bottom duration-300">
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setActiveSubTab('routes')}
                className="flex-grow flex items-center gap-3 bg-neutral-50 border border-neutral-100 rounded-xl px-4 py-3.5 text-left cursor-pointer text-neutral-500 hover:bg-neutral-100/80 transition-colors"
              >
                <svg className="w-4.5 h-4.5 text-[var(--accent)] shrink-0" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.602 10.602z" />
                </svg>
                <span className="text-xs font-bold text-neutral-800">Where to? Book transit route...</span>
              </button>
              
              <button
                type="button"
                onClick={() => setActiveSubTab('bookings')}
                className="w-12 bg-neutral-50 hover:bg-neutral-100 border border-neutral-100 rounded-xl flex items-center justify-center cursor-pointer transition-colors relative"
                title="My Bookings"
              >
                <svg className="w-5 h-5 text-neutral-600" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 6v.75m0 3v.75m0 3v.75m0 3V18m-9-5.25h5.25M7.5 15h3M3.375 5.25c-.621 0-1.125.504-1.125 1.125v3.026c0 .621.504 1.125 1.125 1.125h17.25c.621 0 1.125-.504 1.125-1.125V6.375c0-.621-.504-1.125-1.125-1.125H3.375zM3.375 11.25c-.621 0-1.125.504-1.125 1.125v3.026c0 .621.504 1.125 1.125 1.125h17.25c.621 0 1.125-.504 1.125-1.125v-3.026c0-.621-.504-1.125-1.125-1.125H3.375z" />
                </svg>
                {myBookings.length > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-purple-600 text-white rounded-full flex items-center justify-center font-bold text-[9px] border border-white">
                    {myBookings.length}
                  </span>
                )}
              </button>
            </div>
          </div>
        )}



        {/* Right Sidebar for Book Routes */}
        {activeSubTab === 'routes' && (
          <>
            <div
              className="fixed inset-0 bg-black/20 z-40 transition-opacity"
              onClick={() => {
                setActiveSubTab('map');
                setSelectedBus(null);
              }}
            />
            <div className="fixed bottom-0 left-0 right-0 md:top-0 md:right-0 md:bottom-0 md:left-auto w-full md:max-w-[400px] h-[50vh] md:h-full bg-[var(--bg)] rounded-t-3xl md:rounded-none shadow-2xl z-50 flex flex-col animate-in slide-in-from-bottom md:slide-in-from-right duration-300">
              {/* Grab handle indicator for mobile bottom sheet */}
              <div className="md:hidden w-12 h-1.5 bg-neutral-300 rounded-full mx-auto my-3 shrink-0" />
              {/* Header */}
              <div className="flex justify-between items-center p-6 border-b border-[var(--border)] shrink-0 bg-white">
                <div>
                  <h3 className="text-sm font-bold text-[var(--text-h)] m-0">Book Routes</h3>
                  <p className="text-[11px] text-[var(--text)] mt-1">Available routes from {passengerProfile.state}</p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setActiveSubTab('map');
                    setSelectedBus(null);
                  }}
                  className="bg-neutral-100 hover:bg-neutral-200 border-none w-8 h-8 rounded-full flex items-center justify-center cursor-pointer text-neutral-600 transition-colors"
                >
                  ✕
                </button>
              </div>

              {/* Scrollable Content */}
              <div className="flex-grow overflow-y-auto p-6 flex flex-col gap-4 box-border">
                {selectedBus ? (
                  // Detailed view for registering
                  <div className="flex flex-col gap-4 text-left">
                    <button
                      type="button"
                      onClick={() => setSelectedBus(null)}
                      className="self-start text-[11px] font-bold text-[var(--accent)] hover:underline bg-transparent border-none cursor-pointer flex items-center gap-1.5 p-0"
                    >
                      ← Back to available buses
                    </button>

                    <div className="bg-white border border-[var(--border)] rounded-xl p-5 shadow-sm flex flex-col gap-3">
                      <h4 className="text-sm font-extrabold text-[var(--text-h)] m-0">
                        {selectedBus.deployments?.name}
                      </h4>
                      <div className="grid grid-cols-2 gap-4 text-xs mt-1">
                        <div>
                          <span className="text-[10px] text-neutral-400 block font-medium">Bus number</span>
                          <span className="font-semibold text-[var(--accent)] text-sm">{selectedBus.bus_number}</span>
                        </div>
                        <div>
                          <span className="text-[10px] text-neutral-400 block font-medium">Capacity</span>
                          <span className="font-semibold text-neutral-700 text-sm">{busCapacity} Seats</span>
                        </div>
                        <div className="col-span-2">
                          <span className="text-[10px] text-neutral-400 block font-medium">Departure time</span>
                          <span className="font-semibold text-[var(--text-h)]">
                            {new Date(selectedBus.deployments?.departure_time).toLocaleString()}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Seat selector inline right here in the sidebar! */}
                    <div className="flex flex-col gap-2">
                      <label className="text-xs font-bold text-[var(--text-h)]">Select Seat</label>
                      {(() => {
                        const bookedSeatNumbers = busBookings.map(b => b.seat_number);
                        const availableSeats = [];
                        for (let i = 1; i <= busCapacity; i++) {
                          if (!bookedSeatNumbers.includes(i)) {
                            availableSeats.push(i);
                          }
                        }

                        if (availableSeats.length === 0) {
                          return (
                            <p className="text-xs text-red-500 font-medium">This bus is fully booked. Please select another route.</p>
                          );
                        }

                        return (
                          <select
                            value={selectedSeatNumber ?? ''}
                            onChange={(e) => setSelectedSeatNumber(e.target.value ? parseInt(e.target.value) : null)}
                            className="w-full p-2.5 border border-[var(--border)] rounded-lg text-xs bg-white focus:outline-none focus:ring-1 focus:ring-[var(--accent)] font-medium text-neutral-700"
                          >
                            <option value="">-- Choose a Seat --</option>
                            {availableSeats.map(seatNum => (
                              <option key={seatNum} value={seatNum}>Seat {seatNum}</option>
                            ))}
                          </select>
                        );
                      })()}
                    </div>

                    {(passengerProfile?.credits ?? 0) < 2 && (
                      <p className="text-[11px] text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 m-0">
                        You need <strong>2 credits</strong> to book. You have <strong>{passengerProfile?.credits ?? 0}</strong>.{' '}
                        <button type="button" onClick={() => setActiveSubTab('credits')} className="underline font-bold cursor-pointer bg-transparent border-none text-amber-700 p-0">Buy credits →</button>
                      </p>
                    )}
                    <Button
                      variant="default"
                      size="default"
                      disabled={selectedSeatNumber === null || bookingLoading || (passengerProfile?.credits ?? 0) < 2}
                      onClick={handleBookSeat}
                      className="w-full py-3 mt-2"
                    >
                      {bookingLoading ? 'Registering...' : 'Register Booking (2 credits)'}
                    </Button>
                  </div>
                ) : (
                  // List of available buses
                  <div className="flex flex-col gap-3">
                    {loadingDeployments ? (
                      <div className="py-12 text-center text-xs text-[var(--text)] font-semibold flex items-center justify-center gap-2">
                        <svg className="animate-spin h-5 w-5 text-[var(--accent)]" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        <span>Searching routes...</span>
                      </div>
                    ) : activeDeployments.length === 0 ? (
                      <div className="text-center py-12 border-2 border-dashed border-[var(--border)] rounded-xl bg-white/50 p-6">
                        <p className="text-xs font-semibold text-[var(--text-h)] m-0">No active deployments</p>
                        <p className="text-[10px] text-neutral-400 mt-1">Check back once the administrator schedules routes from {passengerProfile.state}.</p>
                      </div>
                    ) : (
                      activeDeployments.map((bus) => (
                        <div
                          key={bus.id}
                          className="p-4 border border-[var(--border)] hover:border-[var(--accent)] rounded-lg cursor-pointer hover:bg-neutral-50/50 bg-white transition-all text-left"
                          onClick={() => handleSelectBus(bus)}
                        >
                          <div className="flex justify-between items-start">
                            <div>
                              <h4 className="text-sm font-bold text-[var(--text-h)] m-0">
                                {bus.deployments?.name}
                              </h4>
                              <span className="text-[11px] text-[var(--text)] block mt-1">
                                Departure: <strong>{new Date(bus.deployments?.departure_time).toLocaleString()}</strong>
                              </span>
                            </div>
                            <span className="text-xs font-semibold text-[var(--accent)] bg-purple-100/50 px-2.5 py-1 rounded">
                              {bus.bus_number}
                            </span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            </div>
          </>
        )}

        {/* Right Sidebar for My Bookings */}
        {activeSubTab === 'bookings' && (
          <>
            <div
              className="fixed inset-0 bg-black/20 z-40 transition-opacity"
              onClick={() => setActiveSubTab('map')}
            />
            <div className="fixed bottom-0 left-0 right-0 md:top-0 md:right-0 md:bottom-0 md:left-auto w-full md:max-w-[400px] h-[50vh] md:h-full bg-[var(--bg)] rounded-t-3xl md:rounded-none shadow-2xl z-50 flex flex-col animate-in slide-in-from-bottom md:slide-in-from-right duration-300">
              {/* Grab handle indicator for mobile bottom sheet */}
              <div className="md:hidden w-12 h-1.5 bg-neutral-300 rounded-full mx-auto my-3 shrink-0" />
              {/* Header */}
              <div className="flex justify-between items-center p-6 border-b border-[var(--border)] shrink-0 bg-white">
                <div>
                  <h3 className="text-sm font-bold text-[var(--text-h)] m-0">My Bookings</h3>
                  <p className="text-[11px] text-[var(--text)] mt-1">Your active boarding passes</p>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveSubTab('map')}
                  className="bg-neutral-100 hover:bg-neutral-200 border-none w-8 h-8 rounded-full flex items-center justify-center cursor-pointer text-neutral-600 transition-colors"
                >
                  ✕
                </button>
              </div>

              {/* Scrollable Content */}
              <div className="flex-grow overflow-y-auto p-6 flex flex-col gap-4 box-border">
                {myBookings.length === 0 ? (
                  <div className="bg-white border border-[var(--border)] rounded-xl p-8 text-center shadow-sm">
                    <span className="text-xs text-neutral-400 italic">No bookings made yet.</span>
                    <Button variant="outline" size="sm" onClick={() => setActiveSubTab('routes')} className="w-full mt-4 justify-center">
                      Book a Route
                    </Button>
                  </div>
                ) : (
                  myBookings.map((b) => (
                    <div key={b.id} className="border border-purple-200 rounded-xl p-6 bg-white shadow-sm flex flex-col gap-4 relative overflow-hidden text-left">
                      <div className="absolute top-0 left-0 w-1 h-full bg-[var(--accent)]"></div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-semibold text-[var(--text-h)]">
                          {b.deployment_buses?.deployments?.name}
                        </span>
                        <span className={`inline-block px-2.5 py-1 rounded text-[10px] font-semibold ${
                          b.checked_in
                            ? 'bg-green-100 text-green-700'
                            : 'bg-amber-100 text-amber-700'
                        }`}>
                          {b.checked_in ? 'Boarded' : 'Pending'}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-4 text-xs border-t border-b border-dashed border-[var(--border)] py-4">
                        <div>
                          <span className="text-[10px] text-neutral-400 block font-medium">Bus number</span>
                          <span className="font-semibold text-[var(--accent)] text-sm">{b.deployment_buses?.bus_number}</span>
                        </div>
                        <div>
                          <span className="text-[10px] text-neutral-400 block font-medium">Seat number</span>
                          <span className="font-semibold text-[var(--accent)] text-sm">Seat {b.seat_number}</span>
                        </div>
                        <div className="col-span-2 mt-1">
                          <span className="text-[10px] text-neutral-400 block font-medium">Departure time</span>
                          <span className="font-bold text-[var(--text-h)]">
                            {new Date(b.deployment_buses?.deployments?.departure_time).toLocaleString()}
                          </span>
                        </div>
                      </div>

                      <Button variant="outline" size="sm" onClick={() => handleCancelBooking(b.id)} className="text-red-600 hover:text-red-700 border-red-200 w-full justify-center">
                        Cancel Registration
                      </Button>
                    </div>
                  ))
                )}
              </div>
            </div>
          </>
        )}

        {/* Credits panel */}
        {activeSubTab === 'credits' && (
          <>
            <div
              className="fixed inset-0 bg-black/20 z-40 transition-opacity"
              onClick={() => setActiveSubTab('map')}
            />
            <div className="fixed bottom-0 left-0 right-0 md:top-0 md:right-0 md:bottom-0 md:left-auto w-full md:max-w-[400px] h-[85vh] md:h-full bg-[var(--bg)] rounded-t-3xl md:rounded-none shadow-2xl z-50 flex flex-col animate-in slide-in-from-bottom md:slide-in-from-right duration-300">
              <div className="md:hidden w-12 h-1.5 bg-neutral-300 rounded-full mx-auto my-3 shrink-0" />
              <div className="flex justify-between items-center p-6 border-b border-[var(--border)] shrink-0 bg-white">
                <div>
                  <h3 className="text-sm font-bold text-[var(--text-h)] m-0">Credits</h3>
                  <p className="text-[11px] text-[var(--text)] mt-1">₦1,000 = 1 credit · 2 credits per booking</p>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveSubTab('map')}
                  className="bg-neutral-100 hover:bg-neutral-200 border-none w-8 h-8 rounded-full flex items-center justify-center cursor-pointer text-neutral-600 transition-colors"
                >
                  ✕
                </button>
              </div>
              <div className="flex-grow overflow-y-auto p-6 box-border">
                <CreditStore
                  passengerId={passengerProfile.id}
                  passengerEmail={passengerProfile.email}
                  currentCredits={passengerProfile.credits ?? 0}
                  onSuccess={(newCredits) => {
                    setPassengerProfile((prev: any) => ({ ...prev, credits: newCredits }));
                  }}
                />
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
