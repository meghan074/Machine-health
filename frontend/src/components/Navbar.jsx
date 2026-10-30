import React from 'react';
import { 
  Activity, ShieldCheck, User, Bell, Mail, RefreshCw, BarChart2, 
  Radio, Cpu, Sliders, LogOut, KeyRound, HardHat, ShieldAlert
} from 'lucide-react';

export default function Navbar({
  currentUser,
  onLogout,
  onOpenAdminConsole,
  unreadAlertsCount,
  onOpenAlerts,
  onOpenModelComparison,
  onOpenEmailLogs,
  isAutoSimulating,
  onToggleAutoSim,
  onManualTick,
  simulatingLoading,
  onOpenMachineManagement,
  onOpenManualPrediction
}) {
  const userRole = (currentUser?.role || 'worker').toLowerCase();
  const isAdmin = userRole === 'admin';
  const isOrganiserOrAdmin = userRole === 'organiser' || userRole === 'user' || userRole === 'admin';

  return (
    <header className="sticky top-0 z-40 bg-slate-950/85 backdrop-blur-xl border-b border-slate-800/80 px-4 lg:px-8 py-3 transition-colors shadow-lg shadow-black/40">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-3">
        
        {/* Brand Title */}
        <div className="flex items-center gap-3">
          <div className="relative flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500/20 to-indigo-500/20 border border-cyan-500/40 shadow-cyan-glow shrink-0">
            <Activity className="w-5 h-5 text-cyan-400 animate-status-pulse" />
            <div className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-cyan-400 rounded-full animate-ping" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-extrabold tracking-tight text-white">
                Apex Predictive Maintenance
              </h1>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 font-semibold">
                AI4I 2020 ML
              </span>
            </div>
            <p className="text-xs text-slate-400 font-mono">
              Industrial Health &bull; RF &bull; XGBoost &bull; SHAP &bull; RUL
            </p>
          </div>
        </div>

        {/* Action Controls & Navigation */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-2.5">
          
          {/* Admin Governance Console Button (Admin only) */}
          {isAdmin && onOpenAdminConsole && (
            <button
              onClick={onOpenAdminConsole}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500/15 border border-amber-500/40 hover:bg-amber-500/25 text-xs font-mono font-bold text-amber-300 transition-all shadow-sm"
              title="Admin Accounts & Security Governance"
            >
              <KeyRound className="w-3.5 h-3.5 text-amber-400" />
              <span>Admin Console</span>
            </button>
          )}

          {/* Machine Management Button (User/Organiser/Admin) */}
          {isOrganiserOrAdmin && onOpenMachineManagement && (
            <button
              onClick={onOpenMachineManagement}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900/90 border border-slate-800 hover:border-indigo-500/50 hover:bg-slate-850 text-xs font-mono font-medium text-slate-200 hover:text-white transition-all shadow-sm"
              title="Machine Registration & Sensor Parameters"
            >
              <Cpu className="w-3.5 h-3.5 text-indigo-400" />
              <span>Machine Management</span>
            </button>
          )}

          {/* Manual Prediction Button (Available to all authenticated roles) */}
          {onOpenManualPrediction && (
            <button
              onClick={onOpenManualPrediction}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900/90 border border-slate-800 hover:border-cyan-500/50 hover:bg-slate-850 text-xs font-mono font-medium text-slate-200 hover:text-white transition-all shadow-sm"
              title="Manual Sensor Readings & Health Prediction"
            >
              <Sliders className="w-3.5 h-3.5 text-cyan-400" />
              <span>Manual Prediction</span>
            </button>
          )}

          {/* Live Simulation Controls */}
          {isOrganiserOrAdmin && (
            <div className="flex items-center bg-slate-900/90 border border-slate-800 rounded-lg p-1 shadow-inner">
              <button
                onClick={onToggleAutoSim}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-mono font-medium transition-all ${
                  isAutoSimulating
                    ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-bold shadow-cyan-glow'
                    : 'bg-slate-800/80 text-slate-400 hover:text-slate-200'
                }`}
                title="Toggle automatic telemetry streaming simulation"
              >
                <Radio className={`w-3.5 h-3.5 ${isAutoSimulating ? 'text-white animate-pulse' : 'text-slate-400'}`} />
                {isAutoSimulating ? 'LIVE STREAM' : 'PAUSED'}
              </button>

              <button
                onClick={onManualTick}
                disabled={simulatingLoading}
                className="px-2.5 py-1.5 text-xs text-slate-300 hover:text-white transition-colors flex items-center gap-1.5 disabled:opacity-50"
                title="Simulate next sensor step manually"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${simulatingLoading ? 'animate-spin text-cyan-400' : ''}`} />
                <span className="hidden sm:inline font-mono">Tick</span>
              </button>
            </div>
          )}

          {/* Model Comparison Button */}
          <button
            onClick={onOpenModelComparison}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900/90 border border-slate-800 hover:border-indigo-500/50 hover:bg-slate-850 text-xs font-medium text-slate-200 hover:text-white transition-all shadow-sm"
          >
            <BarChart2 className="w-3.5 h-3.5 text-indigo-400" />
            <span className="hidden sm:inline">RF vs XGBoost</span>
          </button>

          {/* Worker Alerts Button */}
          <button
            onClick={onOpenAlerts}
            className="relative flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900/90 border border-slate-800 hover:border-cyan-500/50 hover:bg-slate-850 text-xs font-medium text-slate-200 hover:text-white transition-all shadow-sm"
            title="Alert Notifications"
          >
            <Bell className="w-3.5 h-3.5 text-cyan-400" />
            <span>Alerts</span>
            {unreadAlertsCount > 0 && (
              <span className="flex items-center justify-center px-1.5 py-0.5 rounded-full bg-rose-500 text-white text-[10px] font-bold shadow-rose-glow">
                {unreadAlertsCount}
              </span>
            )}
          </button>

          {/* Email Audit Logs (User/Organiser/Admin only) */}
          {isOrganiserOrAdmin && onOpenEmailLogs && (
            <button
              onClick={onOpenEmailLogs}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900/90 border border-slate-800 hover:border-slate-700 text-xs font-medium text-slate-300 hover:text-white transition-all"
              title="Audit logs of dispatched alert emails"
            >
              <Mail className="w-3.5 h-3.5 text-slate-400" />
              <span className="hidden md:inline">Mail Log</span>
            </button>
          )}

          {/* Active User Identity Profile & Logout */}
          <div className="flex items-center gap-2 pl-2 border-l border-slate-800">
            <div className="flex items-center gap-2 px-2.5 py-1 rounded-xl bg-slate-900/90 border border-slate-800">
              <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold ${
                isAdmin
                  ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                  : userRole === 'worker'
                  ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30'
                  : 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/30'
              }`}>
                {currentUser?.full_name ? currentUser.full_name[0].toUpperCase() : 'U'}
              </div>
              <div className="hidden sm:block text-left">
                <div className="text-xs font-bold text-white leading-tight truncate max-w-[120px]">
                  {currentUser?.full_name || 'Authenticated User'}
                </div>
                <div className="flex items-center gap-1.5">
                  <span className={`text-[10px] font-mono font-bold uppercase ${
                    isAdmin
                      ? 'text-amber-400'
                      : userRole === 'worker'
                      ? 'text-cyan-400'
                      : 'text-indigo-400'
                  }`}>
                    {userRole}
                  </span>
                  {currentUser?.employee_id && userRole === 'worker' && (
                    <span className="text-[10px] font-mono text-slate-500">
                      ({currentUser.employee_id})
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Logout Button */}
            <button
              onClick={onLogout}
              className="p-2 rounded-xl bg-slate-900/90 border border-slate-800 hover:border-rose-500/50 hover:bg-rose-950/40 text-slate-400 hover:text-rose-400 transition-all"
              title="Sign Out (Invalidate Session Token)"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>

        </div>

      </div>

      {/* Role Context Notification Bar */}
      <div className="max-w-7xl mx-auto mt-2.5 pt-2 border-t border-slate-850/80 flex flex-wrap items-center justify-between text-xs font-mono text-slate-400">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-slate-400">Active Identity:</span>
          {isAdmin ? (
            <span className="text-amber-200 bg-amber-950/60 px-2.5 py-0.5 rounded-md border border-amber-700/50 font-semibold flex items-center gap-1.5">
              <KeyRound className="w-3.5 h-3.5 text-amber-400" />
              Administrator &bull; Governance &bull; Account Provisioning &bull; Machine Scoping
            </span>
          ) : userRole === 'organiser' || userRole === 'user' ? (
            <span className="text-indigo-200 bg-indigo-950/60 px-2.5 py-0.5 rounded-md border border-indigo-700/50 font-semibold flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-indigo-400" />
              Company User &bull; Fleet Command &bull; Machine Registration &bull; Alert Dispatch
            </span>
          ) : (
            <span className="text-cyan-200 bg-cyan-950/60 px-2.5 py-0.5 rounded-md border border-cyan-700/50 font-semibold flex items-center gap-1.5">
              <HardHat className="w-3.5 h-3.5 text-cyan-400" />
              Worker &bull; Assigned Monitoring ({currentUser?.assigned_machines?.length || 0} machines) &bull; Manual Prediction &bull; SHAP Diagnostics
            </span>
          )}
        </div>
        <div className="text-slate-500 hidden sm:block">
          Security: PBKDF2 600K &bull; Zero Plaintext &bull; Backend RBAC Enforced
        </div>
      </div>
    </header>
  );
}
