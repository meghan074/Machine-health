import React, { useState } from 'react';
import { HardHat, Lock, Eye, EyeOff, ArrowLeft, LogIn, AlertCircle, ShieldAlert } from 'lucide-react';

export default function WorkerLoginPage({ onBack, onLoginSuccess }) {
  const [employeeId, setEmployeeId] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    if (!employeeId.trim()) {
      setError('Please enter your Employee ID.');
      return;
    }
    if (!password) {
      setError('Please enter your account password.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/auth/worker-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employee_id: employeeId.trim(),
          password: password
        })
      });

      let data = {};
      try {
        data = await res.json();
      } catch (jsonErr) {
        if (!res.ok) {
          throw new Error('Backend server is not responding. Please make sure uvicorn is running on port 8000.');
        }
      }

      if (!res.ok) {
        throw new Error(data.detail || 'Worker authentication failed.');
      }

      // Successful login
      onLoginSuccess(data.token, data.user);
    } catch (err) {
      setError(err.message || 'Network error during worker authentication.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#080d1a] text-slate-100 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Ambient background glow */}
      <div className="absolute top-1/4 left-1/3 w-80 h-80 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-md w-full relative z-10">
        
        {/* Back navigation */}
        <button
          onClick={onBack}
          type="button"
          className="inline-flex items-center gap-2 text-xs font-mono text-slate-400 hover:text-cyan-400 mb-6 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Return to Portal Selection</span>
        </button>

        {/* Login Card */}
        <div className="rounded-2xl bg-slate-900/80 border border-slate-800 shadow-2xl shadow-black/60 p-6 sm:p-8 backdrop-blur-xl">
          
          <div className="flex items-center gap-3.5 mb-6">
            <div className="w-12 h-12 rounded-xl bg-cyan-500/15 border border-cyan-500/40 flex items-center justify-center text-cyan-400 shrink-0">
              <HardHat className="w-6 h-6" />
            </div>
            <div>
              <div className="inline-block text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-cyan-500/15 text-cyan-400 border border-cyan-500/30 mb-1">
                OPERATIONAL ACCESS
              </div>
              <h2 className="text-xl font-extrabold text-white">
                Worker Portal Login
              </h2>
            </div>
          </div>

          <p className="text-xs text-slate-400 mb-6">
            Sign in with your assigned industrial Employee ID and password to access telemetry and diagnostic tools for your designated machinery.
          </p>

          {/* Error Banner */}
          {error && (
            <div className="mb-5 p-3 rounded-xl bg-rose-950/60 border border-rose-500/40 text-rose-300 text-xs flex items-start gap-2.5 animate-fadeIn">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <div className="flex-1 font-mono">{error}</div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            
            {/* Employee ID */}
            <div>
              <label className="block text-xs font-mono text-slate-300 mb-1.5 font-medium">
                Employee ID / Badge ID
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={employeeId}
                  onChange={(e) => setEmployeeId(e.target.value)}
                  placeholder="e.g. WRK-2001 or worker_meghan"
                  autoFocus
                  required
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950/80 border border-slate-800 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 text-sm text-white placeholder-slate-600 transition-all font-mono"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="block text-xs font-mono text-slate-300 mb-1.5 font-medium">
                Account Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your security password"
                  required
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950/80 border border-slate-800 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 text-sm text-white placeholder-slate-600 transition-all font-mono pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 py-3 px-4 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-bold text-sm transition-all shadow-lg shadow-cyan-500/20 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                  <span>Authenticating via PBKDF2...</span>
                </>
              ) : (
                <>
                  <LogIn className="w-4 h-4" />
                  <span>Authenticate as Worker</span>
                </>
              )}
            </button>

          </form>

          {/* Security Notice */}
          <div className="mt-6 pt-4 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400 font-mono">
            <span>Machine-Scoped Session</span>
            <span>12h Inactivity Limit</span>
          </div>

        </div>

      </div>
    </div>
  );
}
