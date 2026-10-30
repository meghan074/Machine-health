import React, { useState, useEffect } from 'react';
import { X, BarChart2, CheckCircle2, Cpu, Layers, GitCompare } from 'lucide-react';

export default function ModelComparisonModal({ onClose }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/models/comparison')
      .then(res => res.json())
      .then(resData => {
        setData(resData);
        setLoading(false);
      })
      .catch(err => {
        console.error('Failed to load comparison data:', err);
        setLoading(false);
      });
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-3xl bg-slate-900 border border-slate-700/80 rounded-2xl p-6 shadow-2xl text-white font-sans overflow-hidden">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-indigo-950/80 border border-indigo-500/40 text-indigo-400 shadow-indigo-glow">
              <GitCompare className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">
                ML Model Benchmarking: Random Forest vs XGBoost
              </h2>
              <p className="text-xs text-slate-400 font-mono mt-0.5">
                Evaluated on UCI AI4I 2020 Predictive Maintenance Dataset (10,000 Samples)
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

        {loading ? (
          <div className="py-16 text-center font-mono text-xs text-cyan-400">
            Loading model evaluation metrics...
          </div>
        ) : data ? (
          <div className="space-y-5 my-4 max-h-[65vh] overflow-y-auto pr-1">
            
            {/* Metric Comparison Table */}
            <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800">
              <h3 className="text-xs font-mono uppercase tracking-wider text-slate-300 mb-3 font-bold">
                Classification Performance Metrics (Test Set Evaluation)
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full text-xs font-mono">
                  <thead>
                    <tr className="border-b border-slate-800 text-slate-400">
                      <th className="text-left py-2.5">Metric</th>
                      <th className="text-center py-2.5 text-indigo-300 font-bold">Random Forest</th>
                      <th className="text-center py-2.5 text-cyan-300 font-bold">XGBoost</th>
                      <th className="text-right py-2.5">Delta</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-850">
                    <tr>
                      <td className="py-2.5 font-medium text-white">Accuracy</td>
                      <td className="text-center text-slate-200 font-bold">{(data.models.random_forest.accuracy * 100).toFixed(2)}%</td>
                      <td className="text-center text-cyan-400 font-bold">{(data.models.xgboost.accuracy * 100).toFixed(2)}%</td>
                      <td className="text-right text-emerald-400">
                        {((data.models.xgboost.accuracy - data.models.random_forest.accuracy) * 100).toFixed(2)}%
                      </td>
                    </tr>
                    <tr>
                      <td className="py-2.5 font-medium text-white">Precision</td>
                      <td className="text-center text-slate-200 font-bold">{(data.models.random_forest.precision * 100).toFixed(2)}%</td>
                      <td className="text-center text-cyan-400 font-bold">{(data.models.xgboost.precision * 100).toFixed(2)}%</td>
                      <td className="text-right text-emerald-400">
                        {((data.models.xgboost.precision - data.models.random_forest.precision) * 100).toFixed(2)}%
                      </td>
                    </tr>
                    <tr>
                      <td className="py-2.5 font-medium text-white">Recall</td>
                      <td className="text-center text-slate-200 font-bold">{(data.models.random_forest.recall * 100).toFixed(2)}%</td>
                      <td className="text-center text-cyan-400 font-bold">{(data.models.xgboost.recall * 100).toFixed(2)}%</td>
                      <td className="text-right text-emerald-400">
                        {((data.models.xgboost.recall - data.models.random_forest.recall) * 100).toFixed(2)}%
                      </td>
                    </tr>
                    <tr>
                      <td className="py-2.5 font-medium text-white">F1-Score</td>
                      <td className="text-center text-slate-200 font-bold">{(data.models.random_forest.f1_score * 100).toFixed(2)}%</td>
                      <td className="text-center text-cyan-400 font-bold">{(data.models.xgboost.f1_score * 100).toFixed(2)}%</td>
                      <td className="text-right text-emerald-400">
                        {((data.models.xgboost.f1_score - data.models.random_forest.f1_score) * 100).toFixed(2)}%
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* Confusion Matrices Side-by-Side */}
            <div className="grid grid-cols-2 gap-4">
              
              {/* RF Confusion Matrix */}
              <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-xs font-mono font-bold text-indigo-300">Random Forest Matrix</h4>
                  <span className="text-[10px] font-mono text-slate-400">n=2,000</span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-center text-xs font-mono">
                  <div className="p-2.5 bg-slate-900 rounded-lg border border-slate-800">
                    <div className="text-[10px] text-slate-400">True Normal</div>
                    <div className="text-base font-bold text-white mt-1">{data.models.random_forest.confusion_matrix[0][0]}</div>
                  </div>
                  <div className="p-2.5 bg-slate-900 rounded-lg border border-slate-800">
                    <div className="text-[10px] text-slate-400">False Failure</div>
                    <div className="text-base font-bold text-amber-400 mt-1">{data.models.random_forest.confusion_matrix[0][1]}</div>
                  </div>
                  <div className="p-2.5 bg-slate-900 rounded-lg border border-slate-800">
                    <div className="text-[10px] text-slate-400">Missed Failure</div>
                    <div className="text-base font-bold text-rose-400 mt-1">{data.models.random_forest.confusion_matrix[1][0]}</div>
                  </div>
                  <div className="p-2.5 bg-slate-900 rounded-lg border border-slate-800">
                    <div className="text-[10px] text-slate-400">True Failure</div>
                    <div className="text-base font-bold text-emerald-400 mt-1">{data.models.random_forest.confusion_matrix[1][1]}</div>
                  </div>
                </div>
              </div>

              {/* XGBoost Confusion Matrix */}
              <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-xs font-mono font-bold text-cyan-300">XGBoost Matrix</h4>
                  <span className="text-[10px] font-mono text-slate-400">n=2,000</span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-center text-xs font-mono">
                  <div className="p-2.5 bg-slate-900 rounded-lg border border-slate-800">
                    <div className="text-[10px] text-slate-400">True Normal</div>
                    <div className="text-base font-bold text-white mt-1">{data.models.xgboost.confusion_matrix[0][0]}</div>
                  </div>
                  <div className="p-2.5 bg-slate-900 rounded-lg border border-slate-800">
                    <div className="text-[10px] text-slate-400">False Failure</div>
                    <div className="text-base font-bold text-amber-400 mt-1">{data.models.xgboost.confusion_matrix[0][1]}</div>
                  </div>
                  <div className="p-2.5 bg-slate-900 rounded-lg border border-slate-800">
                    <div className="text-[10px] text-slate-400">Missed Failure</div>
                    <div className="text-base font-bold text-rose-400 mt-1">{data.models.xgboost.confusion_matrix[1][0]}</div>
                  </div>
                  <div className="p-2.5 bg-slate-900 rounded-lg border border-slate-800">
                    <div className="text-[10px] text-slate-400">True Failure</div>
                    <div className="text-base font-bold text-emerald-400 mt-1">{data.models.xgboost.confusion_matrix[1][1]}</div>
                  </div>
                </div>
              </div>

            </div>

            {/* Architecture Summary */}
            <div className="p-3.5 rounded-xl bg-slate-800/60 border border-slate-700/60 text-xs text-slate-300 leading-relaxed">
              <strong>Dual-Model Ensemble Consensus:</strong> The system computes predictions from both models simultaneously. Random Forest provides high variance reduction across bagging trees, while XGBoost minimizes residual gradient error on minority failure cases (TWF, HDF, PWF, OSF).
            </div>

          </div>
        ) : null}

        {/* Footer */}
        <div className="mt-4 pt-3.5 border-t border-slate-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs transition-all shadow-indigo-glow"
          >
            Close Comparison
          </button>
        </div>

      </div>
    </div>
  );
}
