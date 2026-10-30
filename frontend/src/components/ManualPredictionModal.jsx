import React, { useState, useEffect } from 'react';
import { X, Activity, Zap, Clock, AlertTriangle, CheckCircle2, RefreshCw, Sliders, History, FileText, ChevronRight, Send, User } from 'lucide-react';

export default function ManualPredictionModal({
  isOpen,
  onClose,
  machines,
  initialMachine,
  currentRole,
  onAppliedToLive
}) {
  if (!isOpen) return null;

  // Selected Machine
  const [selectedMachineId, setSelectedMachineId] = useState(
    initialMachine ? initialMachine.id : (machines[0]?.id || '')
  );

  // Active view: 'predict' or 'history'
  const [activeTab, setActiveTab] = useState('predict');

  // Manual readings state
  const [sensorInputs, setSensorInputs] = useState({});
  const [operatorNotes, setOperatorNotes] = useState('');
  const [operatorName, setOperatorName] = useState(
    currentRole === 'worker' ? 'Meghan Nuka (Worker)' : 'Company Organiser'
  );

  // Prediction execution state
  const [predicting, setPredicting] = useState(false);
  const [predictionResult, setPredictionResult] = useState(null);
  const [appliedNotice, setAppliedNotice] = useState(false);

  // History state
  const [historyList, setHistoryList] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  // Get active machine
  const currentMachine = machines.find(m => m.id === selectedMachineId) || machines[0];

  // Initialize sensorInputs whenever selected machine changes
  useEffect(() => {
    if (currentMachine) {
      const initialReadings = {};
      const defs = currentMachine.sensor_definitions || [];
      defs.forEach(s => {
        // Use current live reading if available, else nominal, else default
        const currentVal = currentMachine.readings?.[s.key];
        initialReadings[s.key] = currentVal !== undefined ? currentVal : (s.nominal || 0.0);
      });
      setSensorInputs(initialReadings);
      setPredictionResult(null);
      setAppliedNotice(false);
    }
  }, [selectedMachineId]);

  // Load history when switching to history tab
  const fetchHistory = async () => {
    setHistoryLoading(true);
    try {
      const res = await fetch(`/api/predictions/history?machine_id=${selectedMachineId}`);
      const data = await res.json();
      setHistoryList(data);
    } catch (err) {
      console.error('Failed to load history:', err);
    } finally {
      setHistoryLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'history') {
      fetchHistory();
    }
  }, [activeTab, selectedMachineId]);

  const handleInputChange = (key, val) => {
    setSensorInputs(prev => ({
      ...prev,
      [key]: val === '' ? '' : parseFloat(val)
    }));
    setAppliedNotice(false);
  };

  // Stress-Testing Presets
  const applyPreset = (type) => {
    if (!currentMachine) return;
    const updated = { ...sensorInputs };

    if (type === 'nominal') {
      currentMachine.sensor_definitions?.forEach(s => {
        updated[s.key] = s.nominal;
      });
    } else if (type === 'thermal_stress') {
      if ('air_temperature_k' in updated) updated['air_temperature_k'] = 303.5;
      if ('process_temperature_k' in updated) updated['process_temperature_k'] = 314.8;
    } else if (type === 'high_torque') {
      if ('torque_nm' in updated) updated['torque_nm'] = 68.5;
      if ('rotational_speed_rpm' in updated) updated['rotational_speed_rpm'] = 1320;
    } else if (type === 'extreme_wear') {
      if ('tool_wear_min' in updated) updated['tool_wear_min'] = 225.0;
      if ('torque_nm' in updated) updated['torque_nm'] = 58.0;
    }

    setSensorInputs(updated);
    setAppliedNotice(false);
  };

  const handleRunPrediction = async () => {
    if (!currentMachine) return;
    setPredicting(true);
    setAppliedNotice(false);

    try {
      const res = await fetch('/api/predictions/manual', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          machine_id: currentMachine.id,
          readings: sensorInputs,
          operator: operatorName,
          role: currentRole,
          notes: operatorNotes
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.detail || 'Prediction failed');
      }

      setPredictionResult(data);
    } catch (err) {
      alert(`Prediction Error: ${err.message}`);
    } finally {
      setPredicting(false);
    }
  };

  const handleApplyToLive = async () => {
    if (!currentMachine) return;
    try {
      await fetch(`/api/machines/${currentMachine.id}/update-sensors`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          machine_id: currentMachine.id,
          readings: sensorInputs
        })
      });
      setAppliedNotice(true);
      if (onAppliedToLive) {
        onAppliedToLive(currentMachine.id, sensorInputs);
      }
    } catch (err) {
      console.error('Failed to update live readings:', err);
    }
  };

  const consensus = predictionResult?.predictions?.consensus;
  const rf = predictionResult?.predictions?.random_forest;
  const xgb = predictionResult?.predictions?.xgboost;
  const shap = predictionResult?.shap_explanation;
  const rul = predictionResult?.rul_estimation;

  const isCritical = consensus?.status === 'Critical';
  const isWarning = consensus?.status === 'Warning';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-5xl max-h-[90vh] bg-slate-900 border border-slate-700/80 rounded-2xl p-6 shadow-2xl text-white font-sans flex flex-col overflow-hidden">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-cyan-950/80 border border-cyan-500/40 text-cyan-400 shadow-cyan-glow">
              <Activity className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-white">
                  Manual Sensor Input & Predictive Diagnostics
                </h2>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 font-semibold">
                  Dual ML Engine (RF &bull; XGBoost &bull; SHAP)
                </span>
              </div>
              <p className="text-xs text-slate-400 font-mono mt-0.5">
                Simulate manual readings, validate bounds, compute SHAP root-cause & save persistent prediction logs
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

        {/* Machine Selector Bar & Tabs */}
        <div className="my-4 p-3 rounded-xl bg-slate-950/80 border border-slate-800 flex flex-col md:flex-row items-start md:items-center justify-between gap-3 shrink-0">
          
          {/* Machine Selection Dropdown */}
          <div className="flex items-center gap-2.5 w-full md:w-auto">
            <span className="text-xs font-mono text-slate-300 font-semibold shrink-0">Select Machine:</span>
            <select
              value={selectedMachineId}
              onChange={(e) => setSelectedMachineId(e.target.value)}
              className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs font-mono text-cyan-300 focus:outline-none focus:border-cyan-500 w-full md:w-72"
            >
              {machines.map(m => (
                <option key={m.id} value={m.id}>
                  {m.id} - {m.name} ({m.industry})
                </option>
              ))}
            </select>
          </div>

          {/* Machine Quick Location & Industry Info */}
          {currentMachine && (
            <div className="hidden lg:flex items-center gap-3 text-xs font-mono text-slate-400">
              <span>Location: <strong className="text-white">{currentMachine.location || 'Central Facility'}</strong></span>
              <span>&bull;</span>
              <span>Type: <strong className="text-slate-200">{currentMachine.type}</strong></span>
            </div>
          )}

          {/* Tabs: Predict vs History */}
          <div className="flex items-center gap-1.5 bg-slate-900 p-1 rounded-lg border border-slate-800 self-end md:self-auto">
            <button
              onClick={() => setActiveTab('predict')}
              className={`px-3 py-1 rounded-md text-xs font-mono font-medium transition-all ${
                activeTab === 'predict'
                  ? 'bg-cyan-600 text-white shadow-cyan-glow'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Manual Prediction
            </button>
            <button
              onClick={() => setActiveTab('history')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-mono font-medium transition-all ${
                activeTab === 'history'
                  ? 'bg-indigo-600 text-white shadow-indigo-glow'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <History className="w-3 h-3" />
              <span>Prediction History</span>
            </button>
          </div>

        </div>

        {/* TAB 1: MANUAL SENSOR INPUT AND PREDICTION */}
        {activeTab === 'predict' && (
          <div className="flex-1 overflow-y-auto space-y-4 pr-1">
            
            {/* Sensor Input Section */}
            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3.5">
              
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border-b border-slate-850 pb-2">
                <div>
                  <h3 className="text-xs font-mono font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                    <Sliders className="w-4 h-4 text-cyan-400" />
                    Configured Sensor Telemetry Parameters ({currentMachine?.sensor_definitions?.length || 0})
                  </h3>
                  <p className="text-[11px] text-slate-400 font-mono mt-0.5">
                    Enter physical sensor readings. Values are validated against calibrated operating bounds.
                  </p>
                </div>

                {/* Quick Presets */}
                <div className="flex flex-wrap items-center gap-1.5 text-xs font-mono">
                  <span className="text-slate-400 text-[10px]">Test Presets:</span>
                  <button
                    type="button"
                    onClick={() => applyPreset('nominal')}
                    className="px-2 py-0.5 rounded bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 text-[10px]"
                  >
                    Nominal
                  </button>
                  <button
                    type="button"
                    onClick={() => applyPreset('thermal_stress')}
                    className="px-2 py-0.5 rounded bg-slate-900 hover:bg-amber-950/60 border border-amber-800/60 text-amber-300 text-[10px]"
                  >
                    Thermal Stress
                  </button>
                  <button
                    type="button"
                    onClick={() => applyPreset('high_torque')}
                    className="px-2 py-0.5 rounded bg-slate-900 hover:bg-orange-950/60 border border-orange-800/60 text-orange-300 text-[10px]"
                  >
                    High Torque
                  </button>
                  <button
                    type="button"
                    onClick={() => applyPreset('extreme_wear')}
                    className="px-2 py-0.5 rounded bg-slate-900 hover:bg-rose-950/60 border border-rose-800/60 text-rose-300 text-[10px]"
                  >
                    Critical Wear
                  </button>
                </div>
              </div>

              {/* Sensor Input Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
                {currentMachine?.sensor_definitions?.map(s => {
                  const val = sensorInputs[s.key] !== undefined ? sensorInputs[s.key] : '';
                  const numVal = parseFloat(val);
                  const isOutOfRange = !isNaN(numVal) && (numVal < s.min || numVal > s.max);

                  return (
                    <div
                      key={s.key}
                      className={`p-3 rounded-xl border transition-all ${
                        isOutOfRange
                          ? 'bg-amber-950/20 border-amber-500/50'
                          : 'bg-slate-900/90 border-slate-800'
                      }`}
                    >
                      <div className="flex justify-between items-center text-xs font-mono mb-1">
                        <span className="text-slate-200 font-semibold">{s.label}:</span>
                        <span className="text-[10px] text-slate-400">[{s.min} - {s.max} {s.unit}]</span>
                      </div>

                      <div className="relative mt-1.5">
                        <input
                          type="number"
                          step={s.key.includes('temperature') || s.key.includes('torque') ? '0.1' : '1'}
                          value={val}
                          onChange={(e) => handleInputChange(s.key, e.target.value)}
                          placeholder={`Nominal: ${s.nominal}`}
                          className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-xs font-mono text-cyan-300 focus:outline-none focus:border-cyan-500"
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-mono text-slate-400">
                          {s.unit}
                        </span>
                      </div>

                      <div className="flex justify-between items-center text-[10px] font-mono mt-1.5">
                        <span className="text-slate-400">Nominal: {s.nominal}</span>
                        {isOutOfRange ? (
                          <span className="text-amber-400 font-semibold flex items-center gap-1">
                            <AlertTriangle className="w-3 h-3" />
                            Out of Range
                          </span>
                        ) : (
                          <span className="text-emerald-400 flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3" />
                            Valid
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Operator Notes & Predict Button Row */}
              <div className="pt-2 flex flex-col md:flex-row items-center justify-between gap-3">
                <div className="flex items-center gap-2 w-full md:w-auto">
                  <input
                    type="text"
                    value={operatorNotes}
                    onChange={(e) => setOperatorNotes(e.target.value)}
                    placeholder="Enter diagnostic notes (optional)..."
                    className="w-full md:w-80 bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-cyan-500"
                  />
                </div>

                <div className="flex items-center gap-2 w-full md:w-auto justify-end">
                  <button
                    type="button"
                    onClick={handleRunPrediction}
                    disabled={predicting}
                    className="flex-1 md:flex-initial flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-cyan-600 to-cyan-500 hover:from-cyan-500 hover:to-cyan-400 text-white font-medium text-xs font-mono transition-all shadow-cyan-glow disabled:opacity-50"
                  >
                    <RefreshCw className={`w-4 h-4 ${predicting ? 'animate-spin' : ''}`} />
                    <span>{predicting ? 'Evaluating ML Models...' : 'Predict Machine Health'}</span>
                  </button>
                </div>
              </div>

            </div>

            {/* PREDICTION RESULTS SECTION */}
            {predictionResult && (
              <div className="space-y-4 animate-fade-in">
                
                {/* Result Top Banner */}
                <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className={`px-2.5 py-0.5 rounded-full text-xs font-mono font-bold ${
                        isCritical
                          ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40 shadow-rose-glow'
                          : isWarning
                          ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                          : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                      }`}>
                        {consensus?.risk_level}
                      </span>
                      <span className="text-xs text-slate-400 font-mono">
                        Record ID: <strong className="text-white">{predictionResult.record_id}</strong> &bull; {predictionResult.timestamp}
                      </span>
                    </div>

                    <div className="text-xl font-bold text-white mt-1">
                      Health Score: <span className={isCritical ? 'text-rose-400' : isWarning ? 'text-amber-400' : 'text-emerald-400'}>{consensus?.health_score}%</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleApplyToLive}
                      className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-mono transition-colors border border-slate-700"
                    >
                      <span>Apply Readings to Live Machine</span>
                    </button>
                    {appliedNotice && (
                      <span className="text-xs font-mono text-emerald-400 flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Live Synchronized!
                      </span>
                    )}
                  </div>
                </div>

                {/* Validation Warnings if any */}
                {predictionResult.validation_warnings?.length > 0 && (
                  <div className="p-3 rounded-xl bg-amber-950/30 border border-amber-500/40 space-y-1">
                    <div className="text-xs font-mono font-bold text-amber-400 flex items-center gap-1.5">
                      <AlertTriangle className="w-3.5 h-3.5" />
                      Parameter Range Warnings:
                    </div>
                    {predictionResult.validation_warnings.map((w, idx) => (
                      <p key={idx} className="text-[11px] font-mono text-amber-200/90 pl-5">
                        &bull; {w}
                      </p>
                    ))}
                  </div>
                )}

                {/* Dual ML Model Predictions Comparison */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                  
                  {/* XGBoost Box */}
                  <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 hover:border-cyan-500/40 transition-colors">
                    <div className="flex items-center justify-between text-xs font-mono text-cyan-400 mb-1.5">
                      <span className="font-bold">XGBoost Classifier</span>
                      <span className="px-2 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-800/50 text-[10px]">
                        {xgb?.status}
                      </span>
                    </div>
                    <div className="text-3xl font-black font-mono text-white">
                      {xgb?.failure_probability}%
                    </div>
                    <div className="text-xs font-mono text-slate-400 mt-1">
                      Failure Probability (Evaluated on Gradient Boosted Trees)
                    </div>
                  </div>

                  {/* Random Forest Box */}
                  <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 hover:border-indigo-500/40 transition-colors">
                    <div className="flex items-center justify-between text-xs font-mono text-indigo-400 mb-1.5">
                      <span className="font-bold">Random Forest Classifier</span>
                      <span className="px-2 py-0.5 rounded bg-indigo-950 text-indigo-300 border border-indigo-800/50 text-[10px]">
                        {rf?.status}
                      </span>
                    </div>
                    <div className="text-3xl font-black font-mono text-white">
                      {rf?.failure_probability}%
                    </div>
                    <div className="text-xs font-mono text-slate-400 mt-1">
                      Failure Probability (Evaluated on Bagging Ensemble)
                    </div>
                  </div>

                </div>

                {/* SHAP Feature Contribution Waterfall Diagnostics */}
                {shap && (
                  <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
                    <div className="flex items-center justify-between border-b border-slate-850 pb-2">
                      <div className="flex items-center gap-2">
                        <Zap className="w-4 h-4 text-cyan-400" />
                        <h4 className="text-xs font-mono font-bold text-white uppercase tracking-wider">
                          SHAP Root-Cause Feature Explanations
                        </h4>
                      </div>
                      <span className="text-xs font-mono text-rose-400 font-bold">
                        Primary Risk Driver: {shap.top_risk_driver}
                      </span>
                    </div>

                    <div className="space-y-2.5">
                      {shap.features?.map(f => {
                        const isRisk = f.shap_impact > 0;
                        const absVal = Math.abs(f.shap_impact);
                        const barWidth = Math.min(100, Math.max(10, absVal * 35));

                        return (
                          <div key={f.feature} className="space-y-1">
                            <div className="flex justify-between text-xs font-mono">
                              <span className="text-slate-200 font-medium">{f.display_name}</span>
                              <span className="text-slate-400">{f.value}</span>
                              <span className={`font-bold ${isRisk ? 'text-rose-400' : 'text-emerald-400'}`}>
                                {isRisk ? `+${f.shap_impact}` : f.shap_impact}
                              </span>
                            </div>
                            <div className="w-full bg-slate-900 h-2 rounded-full overflow-hidden flex items-center">
                              <div
                                className={`h-full rounded-full transition-all duration-500 ${
                                  isRisk
                                    ? 'bg-gradient-to-r from-rose-500 to-red-400 shadow-rose-glow ml-auto'
                                    : 'bg-gradient-to-r from-emerald-500 to-teal-400 mr-auto'
                                }`}
                                style={{ width: `${barWidth}%` }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* RUL Trajectory Prognostics */}
                {rul && (
                  <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
                    <div className="flex items-center justify-between border-b border-slate-850 pb-2">
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-cyan-400" />
                        <h4 className="text-xs font-mono font-bold text-white uppercase tracking-wider">
                          Remaining Useful Life (RUL) Prognostics
                        </h4>
                      </div>
                      <span className="text-xs font-mono text-cyan-400 font-bold">
                        {rul.estimated_rul_hours} Hours Left ({rul.estimated_rul_cycles} Cycles)
                      </span>
                    </div>

                    <div className="p-3 rounded-lg bg-slate-900 border border-slate-800 text-xs font-mono text-slate-200 leading-relaxed">
                      <strong>Directive:</strong> {rul.recommendation}
                    </div>
                  </div>
                )}

              </div>
            )}

          </div>
        )}

        {/* TAB 2: PREDICTION HISTORY */}
        {activeTab === 'history' && (
          <div className="flex-1 overflow-y-auto space-y-3 pr-1">
            
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <span className="text-xs font-mono text-slate-300">
                Logged Prediction Records for <strong className="text-cyan-400">{currentMachine?.name} ({currentMachine?.id})</strong>:
              </span>
              <button
                type="button"
                onClick={fetchHistory}
                className="text-xs font-mono text-cyan-400 hover:text-cyan-300 underline flex items-center gap-1"
              >
                <RefreshCw className="w-3 h-3" />
                Refresh History
              </button>
            </div>

            {historyLoading ? (
              <div className="py-16 text-center text-xs font-mono text-cyan-400">
                Loading history records...
              </div>
            ) : historyList.length === 0 ? (
              <div className="py-16 text-center text-xs font-mono text-slate-400">
                No manual prediction history logged for this machine yet. Execute a prediction to record history.
              </div>
            ) : (
              historyList.map(item => (
                <div
                  key={item.id}
                  className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 hover:border-slate-700 transition-all text-xs font-mono space-y-2"
                >
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-1 border-b border-slate-850 pb-1.5">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-cyan-400">{item.id}</span>
                      <span className="text-slate-400">&bull; {item.timestamp}</span>
                      <span className="text-slate-300">Operator: <strong>{item.operator}</strong></span>
                    </div>

                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      item.predictions?.consensus?.risk_level === 'CRITICAL'
                        ? 'bg-rose-500/20 text-rose-300'
                        : item.predictions?.consensus?.risk_level === 'HIGH RISK'
                        ? 'bg-amber-500/20 text-amber-300'
                        : 'bg-emerald-500/20 text-emerald-300'
                    }`}>
                      {item.predictions?.consensus?.risk_level || 'ANALYZED'}
                    </span>
                  </div>

                  {item.notes && (
                    <div className="text-slate-400 italic">
                      "{item.notes}"
                    </div>
                  )}

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 text-slate-300">
                    <div>
                      <span className="text-slate-400 text-[10px] block">Health Score</span>
                      <strong className="text-white">{item.predictions?.consensus?.health_score}%</strong>
                    </div>
                    <div>
                      <span className="text-slate-400 text-[10px] block">XGBoost Prob</span>
                      <strong className="text-cyan-400">{item.predictions?.xgboost?.failure_probability}%</strong>
                    </div>
                    <div>
                      <span className="text-slate-400 text-[10px] block">RF Prob</span>
                      <strong className="text-indigo-400">{item.predictions?.random_forest?.failure_probability}%</strong>
                    </div>
                    <div>
                      <span className="text-slate-400 text-[10px] block">Top Driver</span>
                      <strong className="text-rose-400 truncate block">{item.top_shap_driver}</strong>
                    </div>
                  </div>
                </div>
              ))
            )}

          </div>
        )}

        {/* Footer */}
        <div className="pt-3 border-t border-slate-800 flex justify-between items-center text-xs font-mono text-slate-400 shrink-0">
          <span>Active Operator Role: <strong className="text-white uppercase">{currentRole}</strong></span>
          <button
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors"
          >
            Close Predictor
          </button>
        </div>

      </div>
    </div>
  );
}
