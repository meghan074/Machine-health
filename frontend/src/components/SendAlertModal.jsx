import React, { useState } from 'react';
import { X, Send, AlertTriangle, Mail, ShieldAlert, CheckCircle2 } from 'lucide-react';

export default function SendAlertModal({ machine, machines, onClose, onAlertSent }) {
  const [selectedMachineId, setSelectedMachineId] = useState(machine ? machine.id : (machines[0]?.id || ''));
  const [severity, setSeverity] = useState('CRITICAL');
  const [message, setMessage] = useState(
    'Abnormal operating conditions detected. Please inspect tool wear, cutting torque, and spindle assembly immediately.'
  );
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState(null);

  const currentMachine = machines.find(m => m.id === selectedMachineId) || machine;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSending(true);
    try {
      const res = await fetch('/api/alerts/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          machine_id: selectedMachineId,
          severity,
          message,
          sender: 'Company Organiser'
        })
      });
      const data = await res.json();
      if (data.success) {
        setResult(data);
        if (onAlertSent) onAlertSent(data.alert);
      }
    } catch (err) {
      console.error('Failed to send alert:', err);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-xl bg-slate-900 border border-slate-700/80 rounded-2xl p-6 shadow-2xl text-white font-sans overflow-hidden">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-indigo-950/80 border border-indigo-500/40 text-indigo-400 shadow-indigo-glow">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">
                Dispatch Maintenance Alert to Worker
              </h2>
              <p className="text-xs text-slate-400 font-mono mt-0.5">
                Company Organiser Risk Dispatch &bull; Auto-Mail to nukameghan@gmail.com
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

        {/* Content */}
        {result ? (
          <div className="py-6 text-center space-y-4">
            <div className="w-12 h-12 mx-auto rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 shadow-lg">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white font-mono">
                Alert Successfully Dispatched!
              </h3>
              <p className="text-xs text-slate-300 font-mono mt-1">
                Notification & Telemetry Payload sent to worker mailbox:
              </p>
              <div className="inline-block mt-2 px-3 py-1 rounded-lg bg-slate-950 border border-indigo-500/40 text-sm font-mono text-cyan-400 font-bold">
                nukameghan@gmail.com
              </div>
            </div>

            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-left text-xs font-mono space-y-1.5 max-w-md mx-auto">
              <div className="flex justify-between">
                <span className="text-slate-400">Alert ID:</span>
                <span className="text-white font-bold">{result.alert.id}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Target Machine:</span>
                <span className="text-white">{result.alert.machine_name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">XGBoost Prob:</span>
                <span className="text-cyan-400 font-bold">{result.alert.xgb_probability}%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Random Forest Prob:</span>
                <span className="text-indigo-400 font-bold">{result.alert.rf_probability}%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">RUL Attached:</span>
                <span className="text-white">{result.alert.rul_hours} Hours</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Mail Status:</span>
                <span className="text-emerald-400 font-bold">{result.email_log.status}</span>
              </div>
            </div>

            <button
              onClick={onClose}
              className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs transition-all shadow-indigo-glow"
            >
              Done & Return to Fleet Dashboard
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4 my-4">
            
            {/* Recipient Notice */}
            <div className="p-3.5 rounded-xl bg-indigo-950/40 border border-indigo-500/30 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-cyan-400" />
                <span className="text-xs font-medium text-slate-300">Recipient Worker Mailbox:</span>
              </div>
              <span className="text-xs font-mono font-bold text-cyan-300 bg-slate-950 px-2.5 py-1 rounded-md border border-cyan-800/60">
                nukameghan@gmail.com
              </span>
            </div>

            {/* Select Target Machine */}
            <div>
              <label className="block text-xs font-mono text-slate-300 mb-1.5">
                Select Machine Under Risk:
              </label>
              <select
                value={selectedMachineId}
                onChange={(e) => setSelectedMachineId(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-indigo-500"
              >
                {machines.map(m => (
                  <option key={m.id} value={m.id}>
                    {m.id} - {m.name} ({m.consensus.status} &bull; {m.consensus.risk_level})
                  </option>
                ))}
              </select>
            </div>

            {/* Target Machine Quick Diagnostics Preview */}
            {currentMachine && (
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 grid grid-cols-3 gap-2 text-center text-xs font-mono">
                <div>
                  <div className="text-[10px] text-slate-400">XGBoost Risk</div>
                  <div className="font-bold text-cyan-400">{currentMachine.prediction_xgb.failure_probability}%</div>
                </div>
                <div>
                  <div className="text-[10px] text-slate-400">RF Risk</div>
                  <div className="font-bold text-indigo-400">{currentMachine.prediction_rf.failure_probability}%</div>
                </div>
                <div>
                  <div className="text-[10px] text-slate-400">RUL Hours</div>
                  <div className="font-bold text-white">{currentMachine.rul.hours}h</div>
                </div>
              </div>
            )}

            {/* Severity Radio */}
            <div>
              <label className="block text-xs font-mono text-slate-300 mb-1.5">
                Alert Severity Level:
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setSeverity('CRITICAL')}
                  className={`py-2 px-3 rounded-xl font-mono text-xs font-bold border transition-all flex items-center justify-center gap-2 ${
                    severity === 'CRITICAL'
                      ? 'bg-rose-500/20 border-rose-500 text-rose-300 shadow-rose-glow'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  <AlertTriangle className="w-3.5 h-3.5" />
                  CRITICAL SHUTDOWN
                </button>

                <button
                  type="button"
                  onClick={() => setSeverity('WARNING')}
                  className={`py-2 px-3 rounded-xl font-mono text-xs font-bold border transition-all flex items-center justify-center gap-2 ${
                    severity === 'WARNING'
                      ? 'bg-amber-500/20 border-amber-500 text-amber-300'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  PREVENTATIVE WARNING
                </button>
              </div>
            </div>

            {/* Worker Directive Message */}
            <div>
              <label className="block text-xs font-mono text-slate-300 mb-1.5">
                Maintenance Instructions for Worker:
              </label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={3}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-xs font-mono text-white focus:outline-none focus:border-indigo-500 leading-relaxed"
                placeholder="Enter specific instructions for the maintenance worker..."
              />
            </div>

            {/* Submit Button */}
            <div className="pt-2 flex justify-end gap-2.5">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium text-xs transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={sending}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white font-medium text-xs transition-all shadow-indigo-glow disabled:opacity-50"
              >
                <Send className="w-3.5 h-3.5" />
                <span>{sending ? 'Dispatching...' : 'Dispatch Alert to nukameghan@gmail.com'}</span>
              </button>
            </div>

          </form>
        )}

      </div>
    </div>
  );
}
