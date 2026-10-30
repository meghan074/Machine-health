import React, { useState } from 'react';
import { X, ShieldCheck, User, Lock, Mail, Building, Wrench, CheckCircle2, AlertCircle } from 'lucide-react';

export default function AuthModal({
  isOpen,
  onClose,
  currentUser,
  onLoginSuccess
}) {
  if (!isOpen) return null;

  // Tabs: 'user_login', 'worker_login', 'user_register', 'worker_register'
  const [activeTab, setActiveTab] = useState('user_login');

  // Form states
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [department, setDepartment] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Pre-fill demo accounts
  const handleQuickFill = (type) => {
    setError('');
    setSuccessMsg('');
    if (type === 'user') {
      setEmail('organiser@company.com');
      setPassword('organiser123');
    } else if (type === 'worker') {
      setEmail('nukameghan@gmail.com');
      setPassword('worker123');
    }
  };

  const handleLogin = async (roleType) => {
    setError('');
    setSuccessMsg('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          role: roleType,
          email: email.trim(),
          password: password
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.detail || 'Login failed');
      }

      setSuccessMsg(`Logged in successfully as ${data.name || data.role}!`);
      setTimeout(() => {
        onLoginSuccess(data);
        onClose();
      }, 500);
    } catch (err) {
      setError(err.message || 'Login failed. Please check credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (roleType) => {
    setError('');
    setSuccessMsg('');
    if (!name.trim() || !email.trim() || !password) {
      setError('Please fill in all required fields (Name, Email, Password).');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          password,
          role: roleType,
          department: department.trim()
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.detail || 'Registration failed');
      }

      setSuccessMsg(`Registration successful! You can now log in.`);
      setTimeout(() => {
        setActiveTab(roleType === 'worker' ? 'worker_login' : 'user_login');
        setError('');
        setSuccessMsg('');
      }, 1000);
    } catch (err) {
      setError(err.message || 'Registration failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-lg bg-slate-900 border border-slate-700/80 rounded-2xl p-6 shadow-2xl text-white font-sans overflow-hidden">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-gradient-to-br from-indigo-500/20 to-cyan-500/20 border border-indigo-500/40 text-cyan-400 shadow-cyan-glow">
              <Lock className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">
                Industrial Authentication Portal
              </h2>
              <p className="text-xs text-slate-400 font-mono mt-0.5">
                Role-Based Access Control: Worker &bull; Company User
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="grid grid-cols-4 gap-1.5 bg-slate-950 p-1.5 rounded-xl border border-slate-800 my-4 text-xs font-mono">
          <button
            onClick={() => { setActiveTab('user_login'); setError(''); setSuccessMsg(''); }}
            className={`py-2 px-1 rounded-lg font-semibold transition-all text-center ${
              activeTab === 'user_login'
                ? 'bg-indigo-600 text-white shadow-indigo-glow'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            User Login
          </button>

          <button
            onClick={() => { setActiveTab('worker_login'); setError(''); setSuccessMsg(''); }}
            className={`py-2 px-1 rounded-lg font-semibold transition-all text-center ${
              activeTab === 'worker_login'
                ? 'bg-cyan-600 text-white shadow-cyan-glow'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Worker Login
          </button>

          <button
            onClick={() => { setActiveTab('user_register'); setError(''); setSuccessMsg(''); }}
            className={`py-2 px-1 rounded-lg font-semibold transition-all text-center ${
              activeTab === 'user_register'
                ? 'bg-indigo-700 text-white shadow-indigo-glow'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            New User
          </button>

          <button
            onClick={() => { setActiveTab('worker_register'); setError(''); setSuccessMsg(''); }}
            className={`py-2 px-1 rounded-lg font-semibold transition-all text-center ${
              activeTab === 'worker_register'
                ? 'bg-cyan-700 text-white shadow-cyan-glow'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            New Worker
          </button>
        </div>

        {/* Alert Notifications */}
        {error && (
          <div className="mb-4 p-3 rounded-xl bg-rose-950/40 border border-rose-500/50 flex items-center gap-2 text-xs text-rose-300 font-mono">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {successMsg && (
          <div className="mb-4 p-3 rounded-xl bg-emerald-950/40 border border-emerald-500/50 flex items-center gap-2 text-xs text-emerald-300 font-mono">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* TAB 1: USER / ORGANISER LOGIN */}
        {activeTab === 'user_login' && (
          <div className="space-y-4">
            <div className="p-3 rounded-xl bg-indigo-950/30 border border-indigo-500/30 text-xs text-slate-300">
              <div className="flex items-center gap-2 text-indigo-400 font-bold font-mono">
                <ShieldCheck className="w-4 h-4" />
                <span>Company User / Organiser Permissions:</span>
              </div>
              <p className="mt-1 text-slate-400">
                Oversee fleet health, register new machines, configure sensor parameters, and dispatch worker alerts.
              </p>
            </div>

            <div>
              <label className="block text-xs font-mono text-slate-300 mb-1">Company Email:</label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="organiser@company.com"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-9 pr-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-mono text-slate-300 mb-1">Password:</label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-9 pr-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            <div className="flex items-center justify-between text-xs font-mono pt-1">
              <button
                type="button"
                onClick={() => handleQuickFill('user')}
                className="text-indigo-400 hover:text-indigo-300 underline"
              >
                Quick-fill Demo Organiser
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('user_register')}
                className="text-slate-400 hover:text-white"
              >
                Create Account &rarr;
              </button>
            </div>

            <button
              onClick={() => handleLogin('organiser')}
              disabled={loading}
              className="w-full mt-2 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white font-medium text-xs font-mono transition-all shadow-indigo-glow disabled:opacity-50"
            >
              {loading ? 'Authenticating...' : 'Sign In as Company User'}
            </button>
          </div>
        )}

        {/* TAB 2: WORKER LOGIN */}
        {activeTab === 'worker_login' && (
          <div className="space-y-4">
            <div className="p-3 rounded-xl bg-cyan-950/30 border border-cyan-500/30 text-xs text-slate-300">
              <div className="flex items-center gap-2 text-cyan-400 font-bold font-mono">
                <User className="w-4 h-4" />
                <span>Worker & Technician Permissions:</span>
              </div>
              <p className="mt-1 text-slate-400">
                Inspect assigned machines, perform manual sensor predictions, investigate SHAP root causes, and acknowledge maintenance alerts.
              </p>
            </div>

            <div>
              <label className="block text-xs font-mono text-slate-300 mb-1">Worker Email:</label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="nukameghan@gmail.com"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-9 pr-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-cyan-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-mono text-slate-300 mb-1">Password:</label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-9 pr-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-cyan-500"
                />
              </div>
            </div>

            <div className="flex items-center justify-between text-xs font-mono pt-1">
              <button
                type="button"
                onClick={() => handleQuickFill('worker')}
                className="text-cyan-400 hover:text-cyan-300 underline"
              >
                Quick-fill Demo Worker (nukameghan@gmail.com)
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('worker_register')}
                className="text-slate-400 hover:text-white"
              >
                Register Worker &rarr;
              </button>
            </div>

            <button
              onClick={() => handleLogin('worker')}
              disabled={loading}
              className="w-full mt-2 py-2.5 rounded-xl bg-gradient-to-r from-cyan-600 to-cyan-500 hover:from-cyan-500 hover:to-cyan-400 text-white font-medium text-xs font-mono transition-all shadow-cyan-glow disabled:opacity-50"
            >
              {loading ? 'Authenticating...' : 'Sign In as Maintenance Worker'}
            </button>
          </div>
        )}

        {/* TAB 3: USER REGISTRATION */}
        {activeTab === 'user_register' && (
          <div className="space-y-3.5">
            <div>
              <label className="block text-xs font-mono text-slate-300 mb-1">Full Name:</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Elena Rostova"
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-mono text-slate-300 mb-1">Corporate Email:</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="e.rostova@company.com"
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-mono text-slate-300 mb-1">Department / Role Title:</label>
              <input
                type="text"
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                placeholder="e.g. Predictive Maintenance Lead"
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-mono text-slate-300 mb-1">Password:</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Minimum 6 characters"
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-indigo-500"
              />
            </div>

            <button
              onClick={() => handleRegister('user')}
              disabled={loading}
              className="w-full mt-2 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white font-medium text-xs font-mono transition-all shadow-indigo-glow disabled:opacity-50"
            >
              {loading ? 'Creating Account...' : 'Register Company User Account'}
            </button>
          </div>
        )}

        {/* TAB 4: WORKER REGISTRATION */}
        {activeTab === 'worker_register' && (
          <div className="space-y-3.5">
            <div>
              <label className="block text-xs font-mono text-slate-300 mb-1">Worker Full Name:</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. James Miller"
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-cyan-500"
              />
            </div>

            <div>
              <label className="block text-xs font-mono text-slate-300 mb-1">Technician Email:</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="j.miller@plant-maintenance.com"
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-cyan-500"
              />
            </div>

            <div>
              <label className="block text-xs font-mono text-slate-300 mb-1">Specialization / Shop:</label>
              <input
                type="text"
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                placeholder="e.g. CNC Spindles & Hydraulics"
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-cyan-500"
              />
            </div>

            <div>
              <label className="block text-xs font-mono text-slate-300 mb-1">Password:</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Minimum 6 characters"
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-cyan-500"
              />
            </div>

            <button
              onClick={() => handleRegister('worker')}
              disabled={loading}
              className="w-full mt-2 py-2.5 rounded-xl bg-gradient-to-r from-cyan-600 to-cyan-500 hover:from-cyan-500 hover:to-cyan-400 text-white font-medium text-xs font-mono transition-all shadow-cyan-glow disabled:opacity-50"
            >
              {loading ? 'Creating Worker Profile...' : 'Register Worker Account'}
            </button>
          </div>
        )}

      </div>
    </div>
  );
}
