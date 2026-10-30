import React, { useState, useEffect } from 'react';
import { X, Mail, CheckCircle2, Clock, FileText } from 'lucide-react';

export default function EmailLogsModal({ onClose }) {
  const [logs, setLogs] = useState([]);
  const [selectedLog, setSelectedLog] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/email-logs')
      .then(res => res.json())
      .then(data => {
        setLogs(data.logs || []);
        if (data.logs && data.logs.length > 0) {
          setSelectedLog(data.logs[0]);
        }
        setLoading(false);
      })
      .catch(err => {
        console.error('Failed to load email logs:', err);
        setLoading(false);
      });
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-4xl h-[80vh] bg-slate-900 border border-slate-700/80 rounded-2xl p-6 shadow-2xl text-white font-sans flex flex-col overflow-hidden">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-cyan-950/80 border border-cyan-500/40 text-cyan-400 shadow-cyan-glow">
              <Mail className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">
                Dispatched Worker Email Notifications
              </h2>
              <p className="text-xs text-slate-400 font-mono mt-0.5">
                Target Recipient: <span className="font-semibold text-cyan-400">nukameghan@gmail.com</span>
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

        {/* Content Layout */}
        {loading ? (
          <div className="flex-1 flex items-center justify-center text-slate-400 font-mono text-xs">
            Loading email logs...
          </div>
        ) : logs.length === 0 ? (
          <div className="flex-1 flex items-center justify-center text-slate-400 font-mono text-xs">
            No dispatched email records found yet. Send an alert from the Organiser portal to trigger an email dispatch.
          </div>
        ) : (
          <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-4 my-4 overflow-hidden">
            
            {/* Left list of emails */}
            <div className="overflow-y-auto space-y-2.5 pr-1 border-r border-slate-800">
              {logs.map(log => (
                <div
                  key={log.id}
                  onClick={() => setSelectedLog(log)}
                  className={`p-3.5 rounded-xl border cursor-pointer transition-all text-xs font-mono ${
                    selectedLog?.id === log.id
                      ? 'bg-cyan-950/40 border-cyan-500/70 shadow-cyan-glow'
                      : 'bg-slate-950/80 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="flex justify-between items-center mb-1">
                    <span className="font-bold text-cyan-400">{log.id}</span>
                    <span className="text-[10px] text-slate-400">{log.timestamp}</span>
                  </div>
                  <div className="font-semibold text-white truncate">{log.machine_name}</div>
                  <div className="text-[10px] text-slate-400 mt-1 flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                    <span className="truncate">{log.status}</span>
                  </div>
                </div>
              ))}
            </div>

            {/* Right: Rendered HTML Email Preview */}
            <div className="col-span-2 flex flex-col overflow-hidden bg-slate-950 rounded-xl border border-slate-800 p-3">
              {selectedLog ? (
                <>
                  <div className="pb-2.5 mb-2 border-b border-slate-800 text-xs font-mono space-y-1">
                    <div className="flex justify-between text-slate-400">
                      <span>To: <strong className="text-cyan-400">{selectedLog.recipient}</strong></span>
                      <span>Time: {selectedLog.timestamp}</span>
                    </div>
                    <div className="text-slate-200 font-medium truncate">
                      Subject: {selectedLog.subject}
                    </div>
                  </div>
                  <div className="flex-1 overflow-y-auto rounded-lg bg-white shadow-inner">
                    <iframe
                      title="Email Preview"
                      srcDoc={selectedLog.html_content}
                      className="w-full h-full min-h-[350px] border-0"
                    />
                  </div>
                </>
              ) : null}
            </div>

          </div>
        )}

        {/* Footer */}
        <div className="pt-3.5 border-t border-slate-800 flex justify-between items-center text-xs font-mono text-slate-400">
          <span>Recipient: nukameghan@gmail.com</span>
          <button
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-medium text-xs transition-all shadow-cyan-glow"
          >
            Close Mail Viewer
          </button>
        </div>

      </div>
    </div>
  );
}
