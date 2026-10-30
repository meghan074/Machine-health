import React from 'react';
import { X, Clock, AlertTriangle, ShieldCheck, TrendingDown, Wrench } from 'lucide-react';

export default function RulEstimationModal({ machine, onClose }) {
  if (!machine) return null;

  const { id, name, readings, rul } = machine;
  const currentWear = readings.tool_wear_min || 0;
  const maxWear = 240;
  const wearPct = Math.min(100, Math.round((currentWear / maxWear) * 100));

  const wearTextColor = wearPct > 80 ? 'text-rose-400' : wearPct > 50 ? 'text-amber-400' : 'text-emerald-400';
  const wearBarGradient = wearPct > 80
    ? 'from-rose-500 to-red-400'
    : wearPct > 50
    ? 'from-amber-500 to-orange-400'
    : 'from-emerald-500 to-cyan-400';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-2xl bg-slate-900 border border-slate-700/80 rounded-2xl p-6 shadow-2xl text-white font-sans overflow-hidden">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-cyan-950/80 border border-cyan-500/40 text-cyan-400 shadow-cyan-glow">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-white">
                  Remaining Useful Life (RUL) Prognostics
                </h2>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 font-semibold">
                  Degradation Physics
                </span>
              </div>
              <p className="text-xs text-slate-400 font-mono mt-0.5">
                {name} ({id})
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

        {/* Key RUL KPI Metrics */}
        <div className="grid grid-cols-3 gap-3 my-4">
          <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 text-center">
            <div className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">Estimated RUL</div>
            <div className="text-2xl font-black font-mono text-cyan-400 mt-1">
              {rul.hours} <span className="text-xs text-slate-400 font-normal">HRS</span>
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5 font-mono">
              Operational Time Left
            </div>
          </div>

          <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 text-center">
            <div className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">Machining Cycles</div>
            <div className="text-2xl font-black font-mono text-indigo-400 mt-1">
              {rul.cycles} <span className="text-xs text-slate-400 font-normal">CYCLES</span>
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5 font-mono">
              Cycles to Failure
            </div>
          </div>

          <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 text-center">
            <div className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">Degradation</div>
            <div className={`text-2xl font-black font-mono mt-1 ${wearTextColor}`}>
              {wearPct}%
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5 font-mono">
              {currentWear} / {maxWear} min limit
            </div>
          </div>
        </div>

        {/* Degradation Gauge Bar */}
        <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 my-3">
          <div className="flex justify-between items-center text-xs font-medium mb-2">
            <span className="text-slate-300">Tool Wear Degradation Progression</span>
            <span className="text-white font-mono font-semibold">{currentWear} min accumulated</span>
          </div>
          <div className="w-full bg-slate-850 h-2.5 rounded-full overflow-hidden border border-slate-800">
            <div
              className={`h-full bg-gradient-to-r ${wearBarGradient} transition-all duration-500`}
              style={{ width: `${wearPct}%` }}
            />
          </div>
          <div className="flex justify-between text-[10px] font-mono text-slate-400 mt-2">
            <span>0 min (Pristine)</span>
            <span>120 min (Nominal)</span>
            <span>180 min (Service Threshold)</span>
            <span className="text-rose-400 font-semibold">240 min (Critical Failure)</span>
          </div>
        </div>

        {/* Prescriptive Recommendation Box */}
        <div className="p-4 rounded-xl bg-slate-950/80 border border-cyan-500/30 my-4 flex items-start gap-3">
          <div className="p-2 rounded-lg bg-cyan-500/10 text-cyan-400 shrink-0 mt-0.5">
            <Wrench className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-xs font-mono uppercase tracking-wider text-cyan-400 font-bold">
              Engineering Maintenance Directive
            </h4>
            <p className="text-sm text-slate-200 font-medium mt-1 leading-relaxed">
              {rul.recommendation}
            </p>
          </div>
        </div>

        {/* Degradation Trajectory Projection Visual */}
        <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 my-2">
          <div className="flex items-center justify-between text-xs font-mono text-slate-400 mb-2.5">
            <span className="flex items-center gap-1.5 text-slate-300 font-medium">
              <TrendingDown className="w-4 h-4 text-cyan-400" />
              Projected Health Trajectory (Next 12 Hours)
            </span>
            <span className="text-[10px] text-slate-400">Physics Stress Model</span>
          </div>

          <div className="grid grid-cols-4 gap-2 text-center text-xs font-mono">
            {[0, 4, 8, 12].map(h => {
              const projWear = Math.min(maxWear, Math.round(currentWear + (h * 2.2)));
              const projHealth = Math.max(0, Math.round(100 - (projWear / maxWear * 100)));
              return (
                <div key={h} className="p-2.5 rounded-lg bg-slate-900 border border-slate-800">
                  <div className="text-slate-400 text-[10px]">+{h} Hours</div>
                  <div className="text-white font-bold my-0.5">{projHealth}% Health</div>
                  <div className="text-[10px] text-cyan-400">{projWear} min wear</div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Close Button */}
        <div className="mt-5 pt-3.5 border-t border-slate-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-medium text-xs transition-all shadow-cyan-glow"
          >
            Close RUL Analysis
          </button>
        </div>

      </div>
    </div>
  );
}
