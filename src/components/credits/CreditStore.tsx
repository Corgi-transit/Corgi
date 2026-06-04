import React, { useEffect, useState } from 'react';
import { supabase } from '../../utils/supabase';
import { CreditBalance } from './CreditBalance';

interface Package {
  naira: number;
  credits: number;
  popular?: boolean;
}

const PACKAGES: Package[] = [
  { naira: 2000,  credits: 2 },
  { naira: 5000,  credits: 5, popular: true },
  { naira: 10000, credits: 10 },
  { naira: 20000, credits: 20 },
];

interface CreditStoreProps {
  passengerId: string;
  passengerEmail: string;
  currentCredits: number;
  onSuccess: (newCredits: number) => void;
}

export const CreditStore: React.FC<CreditStoreProps> = ({
  passengerId,
  passengerEmail,
  currentCredits,
  onSuccess,
}) => {
  const [selected, setSelected] = useState<Package>(PACKAGES[1]);
  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [pendingRef, setPendingRef] = useState<string | null>(null);

  // On mount: check if we're returning from a Paystack redirect
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    // Paystack appends ?reference=xxx&trxref=xxx on redirect
    const ref = params.get('reference') || params.get('trxref');
    const credits = parseInt(params.get('paystack_credits') ?? '0');

    if (ref && credits > 0) {
      // Clean URL
      const clean = window.location.pathname;
      window.history.replaceState({}, '', clean);

      setPendingRef(ref);
      setVerifying(true);

      supabase.functions
        .invoke('verify-payment', {
          body: { reference: ref, passenger_id: passengerId, credits },
        })
        .then(({ data, error }) => {
          if (error || !data?.success) {
            alert('Payment received but credit update failed. Reference: ' + ref);
          } else {
            onSuccess(currentCredits + credits);
          }
        })
        .finally(() => {
          setVerifying(false);
          setPendingRef(null);
        });
    }
  }, []);

  const handleBuy = async () => {
    setLoading(true);
    try {
      // Paystack automatically appends ?reference=xxx&trxref=xxx to this URL
      const callbackUrl =
        `${window.location.origin}${window.location.pathname}` +
        `?paystack_credits=${selected.credits}`;

      const { data, error } = await supabase.functions.invoke('init-payment', {
        body: {
          email: passengerEmail,
          amount_kobo: selected.naira * 100,
          passenger_id: passengerId,
          credits: selected.credits,
          callback_url: callbackUrl,
        },
      });

      if (error || !data?.authorization_url) throw new Error('Could not start payment');

      // Redirect to Paystack checkout — works on HTTP/localhost too
      window.location.href = data.authorization_url;
    } catch (err: any) {
      alert(err.message || 'Payment failed to start.');
      setLoading(false);
    }
  };

  if (verifying) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-16">
        <svg className="animate-spin h-8 w-8 text-purple-600" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
        </svg>
        <p className="text-sm font-semibold text-neutral-600">Confirming your payment…</p>
        <p className="text-xs text-neutral-400">Ref: {pendingRef}</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <CreditBalance credits={currentCredits} />

      <div>
        <p className="text-xs font-bold text-neutral-500 uppercase tracking-wider mb-3">Choose a package</p>
        <div className="grid grid-cols-2 gap-3">
          {PACKAGES.map((pkg) => (
            <button
              key={pkg.naira}
              type="button"
              onClick={() => setSelected(pkg)}
              className={`relative flex flex-col items-start gap-1 p-4 rounded-xl border-2 text-left transition-all cursor-pointer ${
                selected.naira === pkg.naira
                  ? 'border-purple-500 bg-purple-50'
                  : 'border-neutral-200 bg-white hover:border-purple-200'
              }`}
            >
              {pkg.popular && (
                <span className="absolute -top-2 left-3 text-[10px] font-bold bg-purple-600 text-white px-2 py-0.5 rounded-full">
                  Popular
                </span>
              )}
              <span className="text-lg font-extrabold text-[var(--text-h)]">
                {pkg.credits} <span className="text-xs font-semibold text-neutral-400">credits</span>
              </span>
              <span className="text-sm font-bold text-neutral-600">₦{pkg.naira.toLocaleString()}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="bg-neutral-50 border border-neutral-200 rounded-xl px-4 py-3 flex items-center justify-between text-sm">
        <span className="text-neutral-500">You'll receive</span>
        <span className="font-extrabold text-purple-700">{selected.credits} credits</span>
      </div>

      <button
        type="button"
        onClick={handleBuy}
        disabled={loading}
        className="w-full py-3.5 rounded-xl bg-purple-600 hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold text-sm transition-colors cursor-pointer border-none"
      >
        {loading ? 'Redirecting to Paystack…' : `Pay ₦${selected.naira.toLocaleString()}`}
      </button>

      <p className="text-[10px] text-neutral-400 text-center m-0">
        Secured by Paystack · Credits never expire
      </p>
    </div>
  );
};
