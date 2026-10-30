import React, { useState } from 'react';
import { X, Bell, Mail, CheckCircle2, AlertTriangle, Zap, Clock, ExternalLink } from 'lucide-react';

export default function WorkerAlertsDrawer({
  alerts,
  onClose,
  onAcknowledgeAlert,
  onOpenShapForMachine,
  machines
}) {
  const [selectedEmailLog, setSelectedEmailLog] = useState(null);

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/75 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-xl h-full bg-slate-900 border-l border-slate-850 p-6 shadow-2xl flex flex-col font-sans text-white overflow-hidden">
        
        {/* Drawer Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-cyan-950/80 border border-cyan-500/40 text-cyan-400 shadow-cyan-glow">
              <Bell className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">
                Worker Alerts & Dispatch Inbox
              </h2>
              <div className="flex items-center gap-2 text-xs text-slate-400 font-mono mt-0.5">
                <Mail className="w-3.5 h-3.5 text-cyan-400" />
                <span>Recipient: <strong className="text-slate-200">nukameghan@gmail.com</strong></span>
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Selected Email Payload Modal / Subview */}
        {selectedEmailLog ? (
          <div className="flex-1 flex flex-col overflow-hidden my-4 p-4 rounded-xl bg-slate-950 border border-slate-800">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2 text-xs font-mono text-cyan-400">
                <Mail className="w-4 h-4" />
                <span>Delivered Email Payload (To: nukameghan@gmail.com)</span>
              </div>
              <button
                onClick={() => setSelectedEmailLog(null)}
                className="text-xs font-mono text-slate-400 hover:text-white underline"
              >
                &larr; Back to Alerts List
              </button>
            </div>
            <div className="flex-1 overflow-y-auto mt-3 p-2 bg-white rounded-lg text-xs">
              <iframe
                title="Email Payload"
                srcDoc={selectedEmailLog.html_content || '<p>No HTML</p>'}
                className="w-full h-full min-h-[400px] border-0 rounded"
              />
            </div>
          </div>
        ) : (
          /* Alerts List */
          <div className="flex-1 overflow-y-auto my-4 space-y-4 pr-1">
            {alerts.length === 0 ? (
              <div className="py-16 text-center text-slate-400 font-mono text-xs">
                No active alerts in worker inbox.
              </div>
            ) : (
              alerts.map(a => {
                const isAck = a.worker_acknowledged;
                const isCrit = a.severity === 'CRITICAL';
                const relatedMachine = machines.find(m => m.id === a.machine_id);

                return (
                  <div
                    key={a.id}
                    className={`p-4 rounded-xl border transition-all ${
                      isCrit
                        ? 'bg-rose-950/20 border-rose-500/40 hover:border-rose-500'
                        : 'bg-slate-950/80 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    {/* Alert Top Info */}
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold ${
                            isCrit ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40' : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                          }`}>
                            {a.severity}
                          </span>
                          <span className="text-xs font-bold text-white">
                            {a.machine_name}
                          </span>
                        </div>
                        <div className="text-[11px] font-mono text-slate-400 mt-1">
                          From: {a.sender} &bull; {a.timestamp}
                        </div>
                      </div>

                      {/* Status / Acknowledge Badge */}
                      {isAck ? (
                        <span className="flex items-center gap-1 text-[11px] font-mono text-emerald-400 font-semibold bg-emerald-950/60 px-2 py-0.5 rounded-md border border-emerald-800/60">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Acknowledged
                        </span>
                      ) : (
                        <button
                          onClick={() => onAcknowledgeAlert(a.id)}
                          className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-medium transition-all shadow-sm"
                        >
                          Acknowledge
                        </button>
                      )}
                    </div>

                    {/* Organiser Directive Message */}
                    <div className="p-3 rounded-lg bg-slate-950 border border-slate-850 text-xs font-mono text-slate-200 my-2 leading-relaxed">
                      "{a.message}"
                    </div>

                    {/* Diagnostic Metric Summary Attached */}
                    <div className="grid grid-cols-4 gap-1.5 p-2 rounded-lg bg-slate-900 border border-slate-800 text-center text-xs font-mono my-2">
                      <div>
                        <div className="text-[9px] text-slate-400">XGBoost</div>
                        <div className="font-bold text-cyan-400">{a.xgb_probability}%</div>
                      </div>
                      <div>
                        <div className="text-[9px] text-slate-400">RF</div>
                        <div className="font-bold text-indigo-400">{a.rf_probability}%</div>
                      </div>
                      <div>
                        <div className="text-[9px] text-slate-400">RUL</div>
                        <div className="font-bold text-white">{a.rul_hours}h</div>
                      </div>
                      <div>
                        <div className="text-[9px] text-slate-400">Top Driver</div>
                        <div className="font-bold text-rose-400 truncate">{a.top_shap_driver}</div>
                      </div>
                    </div>

                    {/* Action buttons */}
                    <div className="flex items-center justify-between pt-2 border-t border-slate-850 text-xs font-mono">
                      <div className="flex items-center gap-1.5 text-slate-400 text-[11px]">
                        <Mail className="w-3.5 h-3.5 text-cyan-400" />
                        <span>Mailed to nukameghan@gmail.com</span>
                      </div>

                      {relatedMachine && (
                        <button
                          onClick={() => {
                            onClose();
                            onOpenShapForMachine(relatedMachine);
                          }}
                          className="flex items-center gap-1 text-cyan-400 hover:text-cyan-300 underline font-medium"
                        >
                          <Zap className="w-3 h-3 text-cyan-400" />
                          Explain with SHAP &rarr;
                        </button>
                      )}
                    </div>

                  </div>
                );
              })
            )}
          </div>
        )}

        {/* Footer */}
        <div className="pt-3.5 border-t border-slate-800 flex justify-between items-center text-xs font-mono text-slate-400">
          <span>Total Alerts: {alerts.length}</span>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors"
          >
            Close Inbox
          </button>
        </div>

      </div>
    </div>
  );
}
