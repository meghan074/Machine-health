import React from 'react';
import { HardHat, ShieldCheck, KeyRound, Activity, Cpu, Lock, ArrowRight, Zap, CheckCircle2, ShieldAlert } from 'lucide-react';

export default function LoginSelectionPage({ onSelectPortal }) {
  return (
    <div className="min-h-screen bg-[#080d1a] text-slate-100 flex flex-col justify-between p-4 sm:p-6 lg:p-8 relative overflow-hidden">
      {/* Background ambient decorative glow */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-10 right-1/4 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Top Header */}
      <header className="max-w-6xl w-full mx-auto flex items-center justify-between pb-6 border-b border-slate-800/80">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500/20 to-indigo-500/20 border border-cyan-500/40 flex items-center justify-center shadow-cyan-glow">
            <Activity className="w-5 h-5 text-cyan-400 animate-status-pulse" />
          </div>
          <div>
            <h1 className="text-base font-extrabold tracking-tight text-white">
              Apex Predictive Maintenance System
            </h1>
            <p className="text-xs text-slate-400 font-mono">
              AI4I 2020 ML &bull; Dual Classification &bull; SHAP Prognostics
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-xs font-mono text-emerald-400 font-medium hidden sm:inline">
            Security Core: PBKDF2 600K
          </span>
        </div>
      </header>

      {/* Main Selection Area */}
      <main className="max-w-6xl w-full mx-auto my-auto py-8">
        <div className="text-center max-w-2xl mx-auto mb-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 text-xs font-mono font-medium mb-4">
            <Lock className="w-3.5 h-3.5" />
            <span>Authenticated Plant Access Gateway</span>
          </div>
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight text-white mb-3">
            Select Your Operational Role Portal
          </h2>
          <p className="text-sm text-slate-400">
            Access is partitioned according to strict enterprise authorization policies. 
            Authenticate with your designated identity to begin.
          </p>
        </div>

        {/* 3 Portal Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8">
          
          {/* Card 1: Worker Login */}
          <div 
            onClick={() => onSelectPortal('WORKER_LOGIN')}
            className="group relative rounded-2xl bg-slate-900/70 border border-slate-800 hover:border-cyan-500/60 p-6 flex flex-col justify-between cursor-pointer transition-all duration-300 hover:shadow-2xl hover:shadow-cyan-500/10 hover:-translate-y-1 backdrop-blur-xl"
          >
            <div className="absolute top-4 right-4 text-[10px] font-mono px-2 py-0.5 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 font-semibold">
              EMPLOYEE ID
            </div>

            <div>
              <div className="w-12 h-12 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 mb-5 group-hover:scale-110 group-hover:bg-cyan-500/20 transition-all">
                <HardHat className="w-6 h-6" />
              </div>

              <h3 className="text-lg font-bold text-white mb-1 group-hover:text-cyan-300 transition-colors">
                Worker Portal
              </h3>
              <p className="text-xs text-slate-400 mb-4 font-mono">
                Machinery Maintenance & Field Operations
              </p>

              <div className="space-y-2 mb-6">
                <div className="flex items-start gap-2 text-xs text-slate-300">
                  <CheckCircle2 className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
                  <span>Assigned machine telemetry monitoring</span>
                </div>
                <div className="flex items-start gap-2 text-xs text-slate-300">
                  <CheckCircle2 className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
                  <span>Manual sensor inputs & ML failure scoring</span>
                </div>
                <div className="flex items-start gap-2 text-xs text-slate-300">
                  <CheckCircle2 className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
                  <span>SHAP risk drivers & alert acknowledgment</span>
                </div>
              </div>
            </div>

            <button 
              type="button"
              className="w-full py-2.5 px-4 rounded-xl bg-cyan-500/15 group-hover:bg-cyan-500 text-cyan-300 group-hover:text-slate-950 font-semibold text-xs transition-all duration-200 flex items-center justify-center gap-2 border border-cyan-500/40"
            >
              <span>Worker Login</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </button>
          </div>

          {/* Card 2: User Login (Organiser / Operations Lead) */}
          <div 
            onClick={() => onSelectPortal('USER_LOGIN')}
            className="group relative rounded-2xl bg-slate-900/70 border border-slate-800 hover:border-indigo-500/60 p-6 flex flex-col justify-between cursor-pointer transition-all duration-300 hover:shadow-2xl hover:shadow-indigo-500/10 hover:-translate-y-1 backdrop-blur-xl"
          >
            <div className="absolute top-4 right-4 text-[10px] font-mono px-2 py-0.5 rounded-full bg-indigo-500/10 border border-indigo-500/30 text-indigo-400 font-semibold">
              USERNAME / EMAIL
            </div>

            <div>
              <div className="w-12 h-12 rounded-xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400 mb-5 group-hover:scale-110 group-hover:bg-indigo-500/20 transition-all">
                <ShieldCheck className="w-6 h-6" />
              </div>

              <h3 className="text-lg font-bold text-white mb-1 group-hover:text-indigo-300 transition-colors">
                Company User Portal
              </h3>
              <p className="text-xs text-slate-400 mb-4 font-mono">
                Fleet Oversight & Operations Engineering
              </p>

              <div className="space-y-2 mb-6">
                <div className="flex items-start gap-2 text-xs text-slate-300">
                  <CheckCircle2 className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
                  <span>Fleet-wide multi-machine monitoring</span>
                </div>
                <div className="flex items-start gap-2 text-xs text-slate-300">
                  <CheckCircle2 className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
                  <span>Register machines & configure sensor definitions</span>
                </div>
                <div className="flex items-start gap-2 text-xs text-slate-300">
                  <CheckCircle2 className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
                  <span>Dispatch worker alerts & audit email logs</span>
                </div>
              </div>
            </div>

            <button 
              type="button"
              className="w-full py-2.5 px-4 rounded-xl bg-indigo-500/15 group-hover:bg-indigo-600 text-indigo-300 group-hover:text-white font-semibold text-xs transition-all duration-200 flex items-center justify-center gap-2 border border-indigo-500/40"
            >
              <span>User Login</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </button>
          </div>

          {/* Card 3: Admin Login */}
          <div 
            onClick={() => onSelectPortal('ADMIN_LOGIN')}
            className="group relative rounded-2xl bg-slate-900/70 border border-slate-800 hover:border-amber-500/60 p-6 flex flex-col justify-between cursor-pointer transition-all duration-300 hover:shadow-2xl hover:shadow-amber-500/10 hover:-translate-y-1 backdrop-blur-xl"
          >
            <div className="absolute top-4 right-4 text-[10px] font-mono px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 font-semibold">
              ADMINISTRATOR
            </div>

            <div>
              <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 mb-5 group-hover:scale-110 group-hover:bg-amber-500/20 transition-all">
                <KeyRound className="w-6 h-6" />
              </div>

              <h3 className="text-lg font-bold text-white mb-1 group-hover:text-amber-300 transition-colors">
                Admin Console
              </h3>
              <p className="text-xs text-slate-400 mb-4 font-mono">
                Enterprise Governance & Security Control
              </p>

              <div className="space-y-2 mb-6">
                <div className="flex items-start gap-2 text-xs text-slate-300">
                  <CheckCircle2 className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                  <span>Provision workers, users, and administrators</span>
                </div>
                <div className="flex items-start gap-2 text-xs text-slate-300">
                  <CheckCircle2 className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                  <span>Assign and reassign worker machine limits</span>
                </div>
                <div className="flex items-start gap-2 text-xs text-slate-300">
                  <CheckCircle2 className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                  <span>Instant account suspension & session revocation</span>
                </div>
              </div>
            </div>

            <button 
              type="button"
              className="w-full py-2.5 px-4 rounded-xl bg-amber-500/15 group-hover:bg-amber-500 text-amber-300 group-hover:text-slate-950 font-semibold text-xs transition-all duration-200 flex items-center justify-center gap-2 border border-amber-500/40"
            >
              <span>Admin Login</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </button>
          </div>

        </div>
      </main>

      {/* Footer */}
      <footer className="max-w-6xl w-full mx-auto pt-6 border-t border-slate-800/80 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-400 gap-3">
        <div className="flex items-center gap-4">
          <span>AI4I 2020 Predictive Maintenance</span>
          <span>&bull;</span>
          <span>RF (98.4%) &amp; XGBoost (98.55%)</span>
          <span>&bull;</span>
          <span>SHAP Explainability</span>
        </div>
        <div className="font-mono text-slate-400">
          Industrial Safety Standard: Zero Unauthenticated Bypass
        </div>
      </footer>
    </div>
  );
}
