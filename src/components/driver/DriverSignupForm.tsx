import React from 'react';
import { Button } from '../ui/button';

interface DriverSignupFormProps {
  email: string;
  fullName: string;
  setFullName: (val: string) => void;
  phone: string;
  setPhone: (val: string) => void;
  licenseNumber: string;
  setLicenseNumber: (val: string) => void;
  vehicleType: string;
  setVehicleType: (val: string) => void;
  vehicleCapacity: string;
  setVehicleCapacity: (val: string) => void;
  vehiclePlate: string;
  setVehiclePlate: (val: string) => void;
  busNumber: string;
  setBusNumber: (val: string) => void;
  totalBuses: number;
  loading: boolean;
  onSubmit: (e: React.FormEvent) => void;
  onSignOut: () => void;
}

export const DriverSignupForm: React.FC<DriverSignupFormProps> = ({
  email,
  fullName,
  setFullName,
  phone,
  setPhone,
  licenseNumber,
  setLicenseNumber,
  vehicleType,
  setVehicleType,
  vehicleCapacity,
  setVehicleCapacity,
  vehiclePlate,
  setVehiclePlate,
  busNumber,
  setBusNumber,
  totalBuses,
  loading,
  onSubmit,
  onSignOut,
}) => {
  return (
      <div className="w-full max-w-[520px] bg-white border border-[var(--border)] rounded-xl shadow-sm p-8 box-border animate-in fade-in duration-200">

        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-lg font-extrabold text-[var(--text-h)] m-0">Driver Profile Setup</h2>
            <p className="text-[11px] text-[var(--text)] mt-1">Complete your registration to start shifts.</p>
          </div>
          <Button variant="outline" size="sm" onClick={onSignOut}>
            Sign Out
          </Button>
        </div>

        <form onSubmit={onSubmit} className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-[var(--text-h)] mb-1.5">Full Name</label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
                placeholder="e.g. John Doe"
                className="w-full px-3.5 py-2.5 bg-white border border-[var(--border)] rounded-md text-sm text-[var(--text-h)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)] box-border"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[var(--text-h)] mb-1.5">Email Address</label>
              <input
                type="email"
                value={email}
                required
                disabled
                placeholder="driver@citybus.com"
                className="w-full px-3.5 py-2.5 bg-neutral-50 border border-[var(--border)] rounded-md text-sm text-neutral-500 cursor-not-allowed focus:outline-none box-border"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-[var(--text-h)] mb-1.5">Phone Number</label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                required
                placeholder="+234..."
                className="w-full px-3.5 py-2.5 bg-white border border-[var(--border)] rounded-md text-sm text-[var(--text-h)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)] box-border"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[var(--text-h)] mb-1.5">License Number</label>
              <input
                type="text"
                value={licenseNumber}
                onChange={(e) => setLicenseNumber(e.target.value)}
                required
                placeholder="e.g. ABC123456789"
                className="w-full px-3.5 py-2.5 bg-white border border-[var(--border)] rounded-md text-sm text-[var(--text-h)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)] box-border"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-[var(--text-h)] mb-1.5">Vehicle Type</label>
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
                className="w-full px-3.5 py-2.5 bg-white border border-[var(--border)] rounded-md text-sm text-[var(--text-h)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)] box-border"
              >
                <option value="Mini-bus">Mini-bus</option>
                <option value="Coaster">Coaster (22 Seats)</option>
                <option value="Shuttle">Shuttle</option>
                <option value="Coach">Coach</option>
                <option value="Van">Van</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-[var(--text-h)] mb-1.5">Capacity (Seats)</label>
              <input
                type="number"
                value={vehicleCapacity}
                onChange={(e) => setVehicleCapacity(e.target.value)}
                required
                min="1"
                className="w-full px-3.5 py-2.5 bg-white border border-[var(--border)] rounded-md text-sm text-[var(--text-h)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)] box-border"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-[var(--text-h)] mb-1.5">Bus Registry Number</label>
              <select
                value={busNumber}
                onChange={(e) => setBusNumber(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-white border border-[var(--border)] rounded-md text-sm text-[var(--text-h)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)] box-border"
              >
                {Array.from({ length: totalBuses }, (_, i) => `Bus ${i + 1}`).map((num) => (
                  <option key={num} value={num}>{num}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-[var(--text-h)] mb-1.5">License Plate Number</label>
              <input
                type="text"
                value={vehiclePlate}
                onChange={(e) => setVehiclePlate(e.target.value)}
                required
                placeholder="e.g. EKY-456-XY"
                className="w-full px-3.5 py-2.5 bg-white border border-[var(--border)] rounded-md text-sm text-[var(--text-h)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)] box-border"
              />
            </div>
          </div>

          <Button type="submit" disabled={loading} className="w-full py-2.5 mt-2">
            {loading ? 'Submitting Application...' : 'Submit Application'}
          </Button>
        </form>

      </div>
  );
};
