import React, { useState } from 'react';
import { ShieldCheck, Lock, Eye, EyeOff, ArrowLeft, LogIn, AlertCircle } from 'lucide-react';

export default function UserLoginPage({ onBack, onLoginSuccess }) {
  const [usernameOrEmail, setUsernameOrEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    if (!usernameOrEmail.trim()) {
      setError('Please enter your Username or Corporate Email.');
      return;
    }
    if (!password) {
      setError('Please enter your account password.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/auth/user-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username_or_email: usernameOrEmail.trim(),
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
        throw new Error(data.detail || 'User authentication failed.');
      }

      onLoginSuccess(data.token, data.user);
    } catch (err) {
      setError(err.message || 'Network error during user authentication.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#080d1a] text-slate-100 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Ambient background glow */}
      <div className="absolute top-1/4 right-1/3 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-md w-full relative z-10">
        
        {/* Back navigation */}
        <button
          onClick={onBack}
          type="button"
          className="inline-flex items-center gap-2 text-xs font-mono text-slate-400 hover:text-indigo-400 mb-6 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Return to Portal Selection</span>
        </button>

        {/* Login Card */}
        <div className="rounded-2xl bg-slate-900/80 border border-slate-800 shadow-2xl shadow-black/60 p-6 sm:p-8 backdrop-blur-xl">
          
          <div className="flex items-center gap-3.5 mb-6">
            <div className="w-12 h-12 rounded-xl bg-indigo-500/15 border border-indigo-500/40 flex items-center justify-center text-indigo-400 shrink-0">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <div className="inline-block text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-indigo-500/15 text-indigo-400 border border-indigo-500/30 mb-1">
                OPERATIONS COMMAND
              </div>
              <h2 className="text-xl font-extrabold text-white">
                Company User Portal
              </h2>
            </div>
          </div>

          <p className="text-xs text-slate-400 mb-6">
            Sign in with your corporate username or registered email address to access fleet management, machine registration, and operations directives.
          </p>

          {/* Error Banner */}
          {error && (
            <div className="mb-5 p-3 rounded-xl bg-rose-950/60 border border-rose-500/40 text-rose-300 text-xs flex items-start gap-2.5 animate-fadeIn">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <div className="flex-1 font-mono">{error}</div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            
            {/* Username or Email */}
            <div>
              <label className="block text-xs font-mono text-slate-300 mb-1.5 font-medium">
                Username or Corporate Email
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={usernameOrEmail}
                  onChange={(e) => setUsernameOrEmail(e.target.value)}
                  placeholder="e.g. organiser or user@company.com"
                  autoFocus
                  required
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950/80 border border-slate-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 text-sm text-white placeholder-slate-600 transition-all font-mono"
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
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950/80 border border-slate-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 text-sm text-white placeholder-slate-600 transition-all font-mono pr-10"
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
              className="w-full mt-2 py-3 px-4 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white font-bold text-sm transition-all shadow-lg shadow-indigo-600/20 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Authenticating via PBKDF2...</span>
                </>
              ) : (
                <>
                  <LogIn className="w-4 h-4" />
                  <span>Authenticate as Operations User</span>
                </>
              )}
            </button>

          </form>

          {/* Security Notice */}
          <div className="mt-6 pt-4 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400 font-mono">
            <span>Fleet Operations Privilege</span>
            <span>Audited Action Logs</span>
          </div>

        </div>

      </div>
    </div>
  );
}
