import React, { useState } from 'react';
import { X, Activity, Cpu, Sliders, RefreshCw, Send, Zap, Clock, Radio, Info } from 'lucide-react';

export default function MachineDetailModal({
  machine,
  currentRole,
  onClose,
  onOpenShap,
  onOpenRul,
  onOpenSendAlert,
  onUpdateSensorReading
}) {
  if (!machine) return null;

  const [customReadings, setCustomReadings] = useState({ ...machine.readings });
  const [liveResult, setLiveResult] = useState(null);
  const [evaluating, setEvaluating] = useState(false);

  const handleSliderChange = (key, val) => {
    const updated = { ...customReadings, [key]: parseFloat(val) };
    setCustomReadings(updated);
  };

  const handleTestPrediction = async () => {
    setEvaluating(true);
    try {
      const res = await fetch('/api/predict', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(customReadings)
      });
      const data = await res.json();
      setLiveResult(data);
    } catch (err) {
      console.error('Failed to run test prediction:', err);
    } finally {
      setEvaluating(false);
    }
  };

  const handleApplyToLiveMachine = async () => {
    if (onUpdateSensorReading) {
      onUpdateSensorReading(machine.id, customReadings);
    }
  };

  const activePreds = liveResult ? liveResult.predictions : {
    random_forest: machine.prediction_rf,
    xgboost: machine.prediction_xgb,
    consensus: machine.consensus
  };

  const telemetrySource = machine.telemetry_source || 'SIMULATED';
  const isHardware = telemetrySource === 'HARDWARE';
  const isManual = telemetrySource === 'MANUAL';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-3xl bg-slate-900 border border-slate-700/80 rounded-2xl p-6 shadow-2xl text-white font-sans overflow-hidden">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-cyan-950/80 border border-cyan-500/40 text-cyan-400 shadow-cyan-glow">
              <Activity className="w-5 h-5" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-mono font-semibold px-2 py-0.5 rounded-md bg-slate-800 border border-slate-700 text-cyan-300">
                  {machine.id}
                </span>
                <span className="text-xs font-medium text-slate-400">
                  {machine.industry} &bull; {machine.type}
                </span>
                {isHardware ? (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold flex items-center gap-1 bg-emerald-500/20 border border-emerald-500/50 text-emerald-300">
                    <Radio className="w-3 h-3 text-emerald-400 animate-pulse" />
                    HARDWARE CONNECTED
                  </span>
                ) : isManual ? (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold flex items-center gap-1 bg-purple-500/20 border border-purple-500/50 text-purple-300">
                    <Sliders className="w-3 h-3 text-purple-400" />
                    MANUAL OVERRIDE
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-medium flex items-center gap-1 bg-amber-500/15 border border-amber-500/40 text-amber-300">
                    <Activity className="w-3 h-3 text-amber-400" />
                    SIMULATED TELEMETRY
                  </span>
                )}
              </div>
              <h2 className="text-base font-bold text-white mt-0.5">
                {machine.name}
              </h2>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="space-y-4 my-4 max-h-[65vh] overflow-y-auto pr-1">
          
          <div className="flex items-center justify-between p-3 rounded-xl bg-slate-950/70 border border-slate-800 text-xs text-slate-300">
            <span>{machine.description}</span>
            <span className="font-mono text-[11px] text-slate-400">Location: <strong className="text-white">{machine.location || 'Operations Floor'}</strong></span>
          </div>

          {/* Feature compatibility banner */}
          {machine.feature_compatibility && !machine.feature_compatibility.is_compatible && (
            <div className="p-3 rounded-xl bg-amber-950/40 border border-amber-500/40 text-xs font-mono text-amber-300 flex items-start gap-2.5">
              <Info className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <div>
                <strong className="block text-amber-200">Custom Sensor Configuration (Non-AI4I Dataset):</strong>
                <span>{machine.feature_compatibility.message}</span>
              </div>
            </div>
          )}

          {/* Current Live Consensus Banner */}
          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="text-[11px] font-mono text-slate-400 uppercase tracking-wider">Operational Status</div>
              <div className="text-lg font-bold text-white flex items-center gap-2 mt-1">
                <span className={`w-2.5 h-2.5 rounded-full ${activePreds.consensus.status === 'Critical' ? 'bg-rose-500 animate-ping' : 'bg-emerald-400'}`} />
                {activePreds.consensus.status} ({activePreds.consensus.risk_level})
              </div>
            </div>

            <div className="flex items-center gap-4 text-center">
              <div>
                <div className="text-[10px] font-mono text-cyan-400">XGBoost Prob</div>
                <div className="text-lg font-mono font-bold text-white">
                  {activePreds.xgboost.failure_probability}%
                </div>
              </div>
              <div className="w-px h-8 bg-slate-800" />
              <div>
                <div className="text-[10px] font-mono text-indigo-400">Random Forest</div>
                <div className="text-lg font-mono font-bold text-white">
                  {activePreds.random_forest.failure_probability}%
                </div>
              </div>
              <div className="w-px h-8 bg-slate-800" />
              <div>
                <div className="text-[10px] font-mono text-emerald-400">Health Index</div>
                <div className="text-lg font-mono font-bold text-emerald-400">
                  {activePreds.consensus.health_score}%
                </div>
              </div>
            </div>
          </div>

          {/* Interactive Sensor Parameter Tuning & Simulation */}
          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800">
            <div className="flex items-center justify-between mb-3 border-b border-slate-850 pb-2">
              <div className="flex items-center gap-2">
                <Sliders className="w-4 h-4 text-cyan-400" />
                <h4 className="text-xs font-mono font-bold text-white uppercase tracking-wider">
                  Real-Time Parameter Calibration & Stress Test
                </h4>
              </div>
              <span className="text-[10px] font-mono text-slate-400">
                Adjust sliders to test model sensitivity
              </span>
            </div>

            <div className="space-y-3.5">
              {machine.sensor_definitions.map(s => {
                const val = customReadings[s.key] !== undefined ? customReadings[s.key] : s.nominal;
                return (
                  <div key={s.key} className="space-y-1">
                    <div className="flex justify-between text-xs font-mono">
                      <span className="text-slate-300">{s.label} ({s.unit}):</span>
                      <span className="font-bold text-cyan-400 font-mono">{val} {s.unit}</span>
                    </div>
                    <input
                      type="range"
                      min={s.min}
                      max={s.max}
                      step={s.key.includes('temperature') || s.key.includes('torque') ? 0.1 : 1}
                      value={val}
                      onChange={(e) => handleSliderChange(s.key, e.target.value)}
                      className="w-full accent-cyan-500 cursor-pointer"
                    />
                  </div>
                );
              })}
            </div>

            <div className="flex justify-end gap-2 mt-4 pt-3 border-t border-slate-850">
              <button
                onClick={handleApplyToLiveMachine}
                className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium text-xs border border-slate-700 transition-colors"
              >
                Apply to Live Telemetry
              </button>
              <button
                onClick={handleTestPrediction}
                disabled={evaluating}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-600 to-cyan-500 hover:from-cyan-500 hover:to-cyan-400 text-white font-medium text-xs transition-all shadow-cyan-glow"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${evaluating ? 'animate-spin' : ''}`} />
                <span>Evaluate ML Models</span>
              </button>
            </div>
          </div>

          {/* Quick Action Buttons */}
          <div className="flex flex-wrap items-center justify-between gap-2 pt-2">
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  onClose();
                  onOpenShap(machine);
                }}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-cyan-950/80 border border-cyan-500/40 text-cyan-300 font-medium text-xs hover:bg-cyan-900/60 transition-all"
              >
                <Zap className="w-3.5 h-3.5 text-cyan-400" />
                <span>SHAP Diagnostics</span>
              </button>

              <button
                onClick={() => {
                  onClose();
                  onOpenRul(machine);
                }}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-800 border border-slate-700 text-slate-200 font-medium text-xs hover:border-slate-600 transition-all"
              >
                <Clock className="w-3.5 h-3.5 text-slate-400" />
                <span>RUL Trajectory</span>
              </button>
            </div>

            {currentRole === 'organiser' && (
              <button
                onClick={() => {
                  onClose();
                  onOpenSendAlert(machine);
                }}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white font-medium text-xs transition-all shadow-indigo-glow"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Send Alert to Worker</span>
              </button>
            )}
          </div>

        </div>

      </div>
    </div>
  );
}
