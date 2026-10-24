import React, { useState } from 'react';
import { User } from '../types';
import { DEFAULT_USERS } from '../config/constants';
import { Lock, ShieldCheck, KeyRound, ArrowRight } from 'lucide-react';

interface LoginModalProps {
  onSignIn: (user: User) => void;
}

export const LoginModal: React.FC<LoginModalProps> = ({ onSignIn }) => {
  const [selectedIndex, setSelectedIndex] = useState<number>(0);
  const [pin, setPin] = useState<string>('');
  const [error, setError] = useState<string>('');

  const selectedUser = DEFAULT_USERS[selectedIndex];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;

    if (pin.trim() !== selectedUser.pin) {
      setError('Incorrect security PIN. Please try again.');
      return;
    }

    setError('');
    onSignIn(selectedUser);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
      <div className="w-full max-w-md bg-white rounded-xl shadow-xl border border-slate-200 overflow-hidden">
        {/* Header Banner */}
        <div className="bg-[#0e5773] px-6 py-6 text-white text-center">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-white/10 mb-3">
            <ShieldCheck className="w-6 h-6 text-white" />
          </div>
          <h2 className="text-xl font-bold tracking-tight">Divisional Project Tracker</h2>
          <p className="text-xs text-sky-100 mt-1 max-w-xs mx-auto">
            Authorized portal for divisional managers and executive leads
          </p>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {error && (
            <div className="p-3 text-xs text-rose-700 bg-rose-50 border border-rose-200 rounded-lg flex items-center gap-2">
              <Lock className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Select User Profile
            </label>
            <select
              value={selectedIndex}
              onChange={(e) => {
                setSelectedIndex(Number(e.target.value));
                setPin('');
                setError('');
              }}
              className="w-full px-3.5 py-2.5 text-sm bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#0e5773] focus:border-[#0e5773] outline-none"
            >
              {DEFAULT_USERS.map((u, i) => (
                <option key={i} value={i}>
                  {u.name} — {u.role === 'manager' ? 'Divisional Manager' : `Executive (${(u.divisions || []).join(', ')})`}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Security PIN
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <KeyRound className="w-4 h-4" />
              </div>
              <input
                type="password"
                inputMode="numeric"
                value={pin}
                onChange={(e) => {
                  setPin(e.target.value);
                  setError('');
                }}
                placeholder="Enter 4-digit PIN"
                autoFocus
                className="w-full pl-10 pr-3.5 py-2.5 text-sm font-mono tracking-widest bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#0e5773] focus:border-[#0e5773] outline-none"
              />
            </div>
          </div>

          <button
            type="submit"
            className="w-full py-2.5 px-4 bg-[#0e5773] hover:bg-[#0a4359] text-white text-sm font-semibold rounded-lg shadow-sm transition-colors flex items-center justify-center gap-2 cursor-pointer"
          >
            <span>Sign In to Portal</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
};
