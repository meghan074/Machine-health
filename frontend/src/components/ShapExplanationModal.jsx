import React, { useState, useEffect } from 'react';
import { X, Zap, Cpu, AlertTriangle, ShieldCheck, Info } from 'lucide-react';

export default function ShapExplanationModal({ machine, onClose }) {
  const [selectedModel, setSelectedModel] = useState('xgboost');
  const [shapData, setShapData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!machine) return;
    setLoading(true);
    fetch(`/api/shap/${machine.id}?model=${selectedModel}`)
      .then(res => res.json())
      .then(data => {
        setShapData(data);
        setLoading(false);
      })
      .catch(err => {
        console.error('Failed to load SHAP data:', err);
        setLoading(false);
      });
  }, [machine, selectedModel]);

  if (!machine) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-2xl bg-slate-900 border border-slate-700/80 rounded-2xl p-6 shadow-2xl text-white font-sans overflow-hidden">
        
        {/* Top Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-cyan-950/80 border border-cyan-500/40 text-cyan-400 shadow-cyan-glow">
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-white">
                  SHAP Explainable AI (Root Cause Diagnostic)
                </h2>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 font-semibold">
                  Worker Diagnostic Mode
                </span>
              </div>
              <p className="text-xs text-slate-400 font-mono mt-0.5">
                Target: {machine.name} ({machine.id})
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

        {/* Model Selector for SHAP */}
        <div className="flex items-center justify-between my-4 p-3 rounded-xl bg-slate-950/70 border border-slate-800">
          <span className="text-xs font-medium text-slate-300">
            Select Explainer Engine:
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setSelectedModel('xgboost')}
              className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition-all ${
                selectedModel === 'xgboost'
                  ? 'bg-cyan-600 text-white shadow-cyan-glow'
                  : 'bg-slate-800 text-slate-300 hover:text-white'
              }`}
            >
              XGBoost TreeExplainer
            </button>
            <button
              onClick={() => setSelectedModel('random_forest')}
              className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition-all ${
                selectedModel === 'random_forest'
                  ? 'bg-indigo-600 text-white shadow-indigo-glow'
                  : 'bg-slate-800 text-slate-300 hover:text-white'
              }`}
            >
              Random Forest TreeExplainer
            </button>
          </div>
        </div>

        {/* Main Content Area */}
        {loading ? (
          <div className="py-12 flex flex-col items-center justify-center gap-3 font-mono text-xs text-cyan-400">
            <div className="w-8 h-8 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />
            <span>Computing SHAP game-theoretic feature contributions...</span>
          </div>
        ) : shapData ? (
          <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1">
            
            {/* Top Root Cause Callout Box */}
            <div className="p-4 rounded-xl bg-rose-950/30 border border-rose-500/40">
              <div className="flex items-start gap-3">
                <div className="p-1.5 rounded-lg bg-rose-500/20 text-rose-400 mt-0.5 shrink-0">
                  <AlertTriangle className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-mono uppercase tracking-wider text-rose-400 font-bold">
                    Primary Failure Risk Driver Identified
                  </h4>
                  <p className="text-base font-bold text-white mt-0.5">
                    {shapData.top_risk_driver}
                  </p>
                  <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                    This sensor parameter exerts the highest positive mathematical influence pushing the machine toward breakdown. Inspect and service this mechanical subsystem onsite.
                  </p>
                </div>
              </div>
            </div>

            {/* Feature Impact Bars (Waterfall Visualization) */}
            <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800">
              <div className="flex justify-between items-center text-xs font-mono text-slate-400 mb-3 border-b border-slate-850 pb-2">
                <span>Sensor Feature</span>
                <span>Current Value</span>
                <span>SHAP Impact Score</span>
              </div>

              <div className="space-y-3.5">
                {shapData.features.map(f => {
                  const isRisk = f.shap_impact > 0;
                  const absVal = Math.abs(f.shap_impact);
                  const barWidth = Math.min(100, Math.max(8, absVal * 35));

                  return (
                    <div key={f.feature} className="space-y-1.5">
                      <div className="flex justify-between text-xs font-mono">
                        <span className="text-slate-200 font-medium">{f.display_name}</span>
                        <span className="text-slate-400">{f.value}</span>
                        <span className={`font-bold ${isRisk ? 'text-rose-400' : 'text-emerald-400'}`}>
                          {isRisk ? `+${f.shap_impact}` : f.shap_impact}
                        </span>
                      </div>

                      {/* Bar indicator */}
                      <div className="w-full bg-slate-850 h-2 rounded-full overflow-hidden flex items-center">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${
                            isRisk
                              ? 'bg-gradient-to-r from-rose-500 to-red-400 shadow-rose-glow ml-auto'
                              : 'bg-gradient-to-r from-emerald-500 to-teal-400 mr-auto'
                          }`}
                          style={{ width: `${barWidth}%` }}
                        />
                      </div>
                      <div className="text-[10px] font-mono text-slate-400">
                        {f.direction}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Explainer Interpretation Note */}
            <div className="p-3 rounded-xl bg-slate-800/50 border border-slate-700/60 flex items-start gap-2.5 text-xs text-slate-300">
              <Info className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
              <span>
                <strong>SHAP (SHapley Additive exPlanations)</strong> calculates the exact marginal contribution of each physical sensor reading toward the machine learning failure probability, providing complete root-cause interpretability for plant technicians.
              </span>
            </div>

          </div>
        ) : (
          <div className="py-8 text-center text-slate-400 font-mono text-xs">
            Unable to compute SHAP values for this machine.
          </div>
        )}

        {/* Footer */}
        <div className="mt-5 pt-3.5 border-t border-slate-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-medium text-xs transition-all shadow-cyan-glow"
          >
            Close Diagnostic
          </button>
        </div>

      </div>
    </div>
  );
}
