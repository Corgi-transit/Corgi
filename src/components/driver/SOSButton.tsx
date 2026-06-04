import React, { useState } from 'react';
import { supabase } from '../../utils/supabase';

const SOS_TYPES = [
  { id: 'engine',    label: 'Engine Problem',     emoji: '🔧', color: '#f59e0b' },
  { id: 'breakdown', label: 'Vehicle Breakdown',   emoji: '🚗', color: '#f97316' },
  { id: 'accident',  label: 'Accident',            emoji: '💥', color: '#ef4444' },
  { id: 'medical',   label: 'Medical Emergency',   emoji: '🏥', color: '#ef4444' },
  { id: 'fuel',      label: 'Out of Fuel',         emoji: '⛽', color: '#8b5cf6' },
  { id: 'emergency', label: 'Super Emergency',     emoji: '🆘', color: '#dc2626' },
];

interface SOSButtonProps {
  driverId: string;
  currentLat: number | null;
  currentLng: number | null;
}

export const SOSButton: React.FC<SOSButtonProps> = ({ driverId, currentLat, currentLng }) => {
  const [open, setOpen] = useState(false);
  const [activeSOS, setActiveSOS] = useState<{ id: string; type: string } | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSend = async (type: typeof SOS_TYPES[number]) => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('sos_alerts')
        .insert({
          driver_id: driverId,
          type: type.id,
          latitude: currentLat,
          longitude: currentLng,
          active: true,
        })
        .select()
        .single();

      if (error) throw error;
      setActiveSOS({ id: data.id, type: type.label });
      setOpen(false);
    } catch (err: any) {
      alert(err.message || 'Failed to send SOS.');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = async () => {
    if (!activeSOS) return;
    setLoading(true);
    try {
      const { error } = await supabase
        .from('sos_alerts')
        .update({ active: false, resolved_at: new Date().toISOString() })
        .eq('id', activeSOS.id);

      if (error) throw error;
      setActiveSOS(null);
    } catch (err: any) {
      alert(err.message || 'Failed to cancel SOS.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* SOS trigger / active indicator */}
      {activeSOS ? (
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center gap-2 px-3 py-2 bg-red-600 text-white rounded-lg shadow-lg text-xs font-bold animate-pulse">
            <span>🆘</span>
            <span>{activeSOS.type}</span>
          </div>
          <button
            type="button"
            onClick={handleCancel}
            disabled={loading}
            className="px-3 py-1.5 bg-white border border-red-300 text-red-600 rounded-lg text-[10px] font-bold cursor-pointer hover:bg-red-50 transition-colors border-none"
          >
            {loading ? 'Cancelling...' : 'Cancel SOS'}
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="flex items-center gap-1.5 px-3 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg shadow-md text-xs font-bold border-none cursor-pointer transition-all"
        >
          🆘 SOS
        </button>
      )}

      {/* Options sheet */}
      {open && (
        <div className="fixed inset-0 z-[2000] flex items-end justify-center md:items-center p-4 bg-black/50"
          onClick={() => setOpen(false)}>
          <div
            className="w-full max-w-sm bg-white rounded-2xl shadow-2xl overflow-hidden animate-in slide-in-from-bottom duration-200"
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div className="bg-red-600 px-5 py-4 flex items-center justify-between">
              <div>
                <p className="text-white font-extrabold text-base m-0">Send SOS Alert</p>
                <p className="text-red-200 text-xs mt-0.5 m-0">Passengers & admin will be notified</p>
              </div>
              <button type="button" onClick={() => setOpen(false)}
                className="text-white bg-red-700 hover:bg-red-800 border-none w-7 h-7 rounded-full flex items-center justify-center cursor-pointer text-sm">
                ✕
              </button>
            </div>

            {/* Options grid */}
            <div className="p-4 grid grid-cols-2 gap-3">
              {SOS_TYPES.map(type => (
                <button
                  key={type.id}
                  type="button"
                  disabled={loading}
                  onClick={() => handleSend(type)}
                  className="flex flex-col items-center gap-2 p-4 rounded-xl border-2 border-neutral-100 hover:border-red-300 hover:bg-red-50 cursor-pointer bg-white transition-all disabled:opacity-50"
                >
                  <span className="text-2xl">{type.emoji}</span>
                  <span className="text-xs font-bold text-neutral-700 text-center leading-tight">
                    {type.label}
                  </span>
                </button>
              ))}
            </div>

            <div className="px-4 pb-4">
              <button type="button" onClick={() => setOpen(false)}
                className="w-full py-2.5 text-xs font-semibold text-neutral-500 bg-neutral-100 hover:bg-neutral-200 rounded-xl border-none cursor-pointer transition-colors">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
