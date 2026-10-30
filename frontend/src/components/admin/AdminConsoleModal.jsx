import React, { useState, useEffect } from 'react';
import { 
  X, ShieldAlert, KeyRound, UserPlus, Users, CheckCircle2, 
  AlertTriangle, Power, Trash2, Edit3, Lock, Shield, Cpu, 
  RefreshCw, Check, AlertCircle, Plus
} from 'lucide-react';

export default function AdminConsoleModal({ isOpen, onClose, authToken, currentUser, onRefreshData }) {
  const [activeTab, setActiveTab] = useState('ACCOUNTS'); // 'ACCOUNTS' or 'CREATE'
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  // Assignment editing state
  const [editingWorker, setEditingWorker] = useState(null);
  const [selectedMachines, setSelectedMachines] = useState([]);

  // Create account form state
  const [formData, setFormData] = useState({
    username: '',
    full_name: '',
    email: '',
    employee_id: '',
    password: '',
    role: 'worker',
    department: '',
    assigned_machines: []
  });

  const availableMachinesList = [
    { id: 'CNC-M14860', name: 'Titan 5-Axis CNC Milling Center' },
    { id: 'CNC-L47181', name: 'Precision CNC Lathe Turning Station' },
    { id: 'MOT-IND-01', name: '3-Phase Heavy Induction Motor Drive' },
    { id: 'BRG-AUTO-03', name: 'Automotive Planetary Bearing Assembly' },
    { id: 'PUMP-HP-02', name: 'High-Pressure Centrifugal Slurry Pump' },
    { id: 'COMP-GAS-05', name: 'Rotary Screw Industrial Gas Compressor' },
    { id: 'ROBO-WELD-04', name: '6-Axis Robotic Spot Welding Arm' },
    { id: 'CONV-MAIN-01', name: 'Heavy Ore Conveyor Drive Pulley' },
    { id: 'PRESS-HYD-08', name: '800-Ton Hydraulic Stamping Press' },
    { id: 'TURB-VAP-02', name: 'Superheated Steam Co-Gen Turbine' }
  ];

  const fetchAccounts = async () => {
    if (!authToken) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/accounts', {
        headers: { 'Authorization': `Bearer ${authToken}` }
      });
      if (!res.ok) {
        throw new Error('Failed to load accounts. Ensure you are an administrator.');
      }
      const data = await res.json();
      setAccounts(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchAccounts();
    }
  }, [isOpen, authToken]);

  const showNotification = (msg) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(null), 4000);
  };

  // Toggle Account Status (ACTIVE <-> SUSPENDED)
  const handleToggleStatus = async (user) => {
    const newStatus = user.status === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE';
    try {
      const res = await fetch(`/api/admin/accounts/${user.id}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify({ status: newStatus })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Failed to update status.');

      showNotification(`Account '${user.username}' is now ${newStatus}. All active sessions updated.`);
      fetchAccounts();
      if (onRefreshData) onRefreshData();
    } catch (err) {
      setError(err.message);
    }
  };

  // Save worker machine assignments
  const handleSaveAssignments = async () => {
    if (!editingWorker) return;
    try {
      const res = await fetch(`/api/admin/accounts/${editingWorker.id}/assign`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify({ assigned_machines: selectedMachines })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Failed to update assignments.');

      showNotification(`Machine assignments for '${editingWorker.full_name}' updated.`);
      setEditingWorker(null);
      fetchAccounts();
      if (onRefreshData) onRefreshData();
    } catch (err) {
      setError(err.message);
    }
  };

  // Delete account
  const handleDeleteAccount = async (user) => {
    if (!window.confirm(`Are you sure you want to permanently delete account '${user.username}' (${user.full_name})?`)) {
      return;
    }
    try {
      const res = await fetch(`/api/admin/accounts/${user.id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${authToken}` }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Failed to delete account.');

      showNotification(`Account '${user.username}' deleted successfully.`);
      fetchAccounts();
      if (onRefreshData) onRefreshData();
    } catch (err) {
      setError(err.message);
    }
  };

  // Create new account
  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    if (formData.password.length < 8) {
      setError('Password must be at least 8 characters long.');
      return;
    }

    try {
      const res = await fetch('/api/admin/accounts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify(formData)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Failed to create account.');

      showNotification(`Account '${data.user.username}' (${data.user.role}) provisioned successfully with PBKDF2 600K.`);
      setFormData({
        username: '',
        full_name: '',
        email: '',
        employee_id: '',
        password: '',
        role: 'worker',
        department: '',
        assigned_machines: []
      });
      setActiveTab('ACCOUNTS');
      fetchAccounts();
      if (onRefreshData) onRefreshData();
    } catch (err) {
      setError(err.message);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-5xl max-h-[92vh] flex flex-col rounded-2xl bg-[#0b1120] border border-amber-500/40 shadow-2xl shadow-amber-500/10 overflow-hidden text-slate-100">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/90 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-500/40 flex items-center justify-center text-amber-400">
              <KeyRound className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-extrabold text-white">
                  Administrator Governance Console
                </h3>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-400 font-semibold">
                  RESTRICTED ACCESS
                </span>
              </div>
              <p className="text-xs text-slate-400 font-mono">
                Account provisioning, worker machine isolation, status toggling &amp; instant session revocation
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Notifications & Error alerts */}
        {error && (
          <div className="mx-6 mt-4 p-3 rounded-xl bg-rose-950/70 border border-rose-500/50 text-rose-300 text-xs flex items-center justify-between font-mono animate-fadeIn">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
              <span>{error}</span>
            </div>
            <button onClick={() => setError(null)} className="text-rose-400 hover:text-white">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {successMsg && (
          <div className="mx-6 mt-4 p-3 rounded-xl bg-emerald-950/70 border border-emerald-500/50 text-emerald-300 text-xs flex items-center gap-2 font-mono animate-fadeIn">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Navigation Tabs */}
        <div className="flex items-center gap-3 px-6 pt-4 border-b border-slate-800 shrink-0">
          <button
            onClick={() => setActiveTab('ACCOUNTS')}
            className={`flex items-center gap-2 px-4 py-2 text-xs font-mono font-medium border-b-2 transition-all ${
              activeTab === 'ACCOUNTS'
                ? 'border-amber-400 text-amber-300 font-bold'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Active Accounts ({accounts.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('CREATE')}
            className={`flex items-center gap-2 px-4 py-2 text-xs font-mono font-medium border-b-2 transition-all ${
              activeTab === 'CREATE'
                ? 'border-amber-400 text-amber-300 font-bold'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <UserPlus className="w-4 h-4" />
            <span>Provision New Account</span>
          </button>
        </div>

        {/* Tab Content Body */}
        <div className="flex-1 overflow-y-auto p-6">
          
          {/* TAB 1: ACCOUNTS LIST */}
          {activeTab === 'ACCOUNTS' && (
            <div className="space-y-4">
              
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono text-slate-400">
                  Showing all user, worker, and admin accounts stored in SQLite auth.db
                </span>
                <button
                  onClick={fetchAccounts}
                  disabled={loading}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-xs font-mono text-slate-300 hover:text-white"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-amber-400' : ''}`} />
                  <span>Refresh</span>
                </button>
              </div>

              {/* Table */}
              <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-950/60">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-900/90 text-slate-400 font-mono uppercase text-[11px] border-b border-slate-800">
                    <tr>
                      <th className="px-4 py-3">Account / ID</th>
                      <th className="px-4 py-3">Role</th>
                      <th className="px-4 py-3">Department</th>
                      <th className="px-4 py-3">Assigned Machines</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/80">
                    {accounts.map((user) => {
                      const isCurrent = currentUser?.id === user.id;
                      const isWorker = user.role === 'worker';
                      const assignedCount = user.assigned_machines?.length || 0;

                      return (
                        <tr key={user.id} className="hover:bg-slate-900/40 transition-colors">
                          <td className="px-4 py-3.5">
                            <div className="font-semibold text-white">{user.full_name}</div>
                            <div className="text-[11px] font-mono text-slate-400">
                              @{user.username} &bull; <span className="text-cyan-400">{user.id}</span>
                              {user.employee_id && user.employee_id !== user.id && (
                                <span> &bull; Emp: {user.employee_id}</span>
                              )}
                            </div>
                            {user.email && (
                              <div className="text-[10px] text-slate-400">{user.email}</div>
                            )}
                          </td>

                          <td className="px-4 py-3.5">
                            <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase ${
                              user.role === 'admin'
                                ? 'bg-amber-500/15 border border-amber-500/30 text-amber-400'
                                : user.role === 'worker'
                                ? 'bg-cyan-500/15 border border-cyan-500/30 text-cyan-400'
                                : 'bg-indigo-500/15 border border-indigo-500/30 text-indigo-400'
                            }`}>
                              {user.role}
                            </span>
                          </td>

                          <td className="px-4 py-3.5 text-slate-300 font-mono text-[11px]">
                            {user.department || 'General'}
                          </td>

                          <td className="px-4 py-3.5">
                            {isWorker ? (
                              <div className="flex flex-wrap items-center gap-1.5 max-w-xs">
                                {assignedCount === 0 ? (
                                  <span className="text-[11px] font-mono text-rose-400 italic">No machines assigned</span>
                                ) : (
                                  user.assigned_machines.slice(0, 3).map((mId) => (
                                    <span key={mId} className="px-1.5 py-0.5 rounded bg-slate-900 border border-slate-700 text-[10px] font-mono text-cyan-300">
                                      {mId}
                                    </span>
                                  ))
                                )}
                                {assignedCount > 3 && (
                                  <span className="text-[10px] font-mono text-slate-400">
                                    +{assignedCount - 3} more
                                  </span>
                                )}
                                <button
                                  onClick={() => {
                                    setEditingWorker(user);
                                    setSelectedMachines(user.assigned_machines || []);
                                  }}
                                  className="p-1 hover:text-cyan-400 text-slate-400 transition-colors ml-1"
                                  title="Edit assigned machines"
                                >
                                  <Edit3 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            ) : (
                              <span className="text-slate-400 text-[11px] font-mono">Full Fleet Access</span>
                            )}
                          </td>

                          <td className="px-4 py-3.5">
                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold ${
                              user.status === 'ACTIVE'
                                ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                                : 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
                            }`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${user.status === 'ACTIVE' ? 'bg-emerald-400 animate-pulse' : 'bg-rose-400'}`} />
                              {user.status}
                            </span>
                          </td>

                          <td className="px-4 py-3.5 text-right space-x-2">
                            {/* Suspend / Activate Button */}
                            {!isCurrent && (
                              <button
                                onClick={() => handleToggleStatus(user)}
                                className={`px-2.5 py-1 rounded-lg text-xs font-mono font-medium transition-colors ${
                                  user.status === 'ACTIVE'
                                    ? 'bg-rose-950/60 hover:bg-rose-900 text-rose-300 border border-rose-700/50'
                                    : 'bg-emerald-950/60 hover:bg-emerald-900 text-emerald-300 border border-emerald-700/50'
                                }`}
                                title={user.status === 'ACTIVE' ? 'Suspend account and revoke active sessions' : 'Activate account'}
                              >
                                {user.status === 'ACTIVE' ? 'Suspend' : 'Activate'}
                              </button>
                            )}

                            {/* Delete Button */}
                            {!isCurrent && (
                              <button
                                onClick={() => handleDeleteAccount(user)}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-950/50 transition-colors"
                                title="Delete account"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

            </div>
          )}

          {/* TAB 2: PROVISION NEW ACCOUNT */}
          {activeTab === 'CREATE' && (
            <div className="max-w-2xl mx-auto py-2">
              <div className="mb-5">
                <h4 className="text-sm font-bold text-white mb-1">
                  Provision System Identity
                </h4>
                <p className="text-xs text-slate-400 font-mono">
                  All accounts use PBKDF2-HMAC-SHA256 with 600,000 iterations and unique 16-byte random salts.
                </p>
              </div>

              <form onSubmit={handleCreateSubmit} className="space-y-4">
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-mono text-slate-300 mb-1">
                      Account Role *
                    </label>
                    <select
                      value={formData.role}
                      onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white font-mono focus:border-amber-500"
                    >
                      <option value="worker">Worker (Assigned Telemetry & Diagnostics)</option>
                      <option value="user">User / Organiser (Operations Fleet Oversight)</option>
                      <option value="admin">Administrator (Governance & Account Management)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-mono text-slate-300 mb-1">
                      Full Name *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Alex Henderson"
                      value={formData.full_name}
                      onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white font-mono focus:border-amber-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-mono text-slate-300 mb-1">
                      Username *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. a_henderson"
                      value={formData.username}
                      onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white font-mono focus:border-amber-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-mono text-slate-300 mb-1">
                      Initial Password (min 8 chars) *
                    </label>
                    <input
                      type="password"
                      required
                      placeholder="Enter secure initial password"
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white font-mono focus:border-amber-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-mono text-slate-300 mb-1">
                      Employee ID {formData.role === 'worker' ? '(for Worker Login)' : '(optional)'}
                    </label>
                    <input
                      type="text"
                      placeholder={formData.role === 'worker' ? 'e.g. WRK-2010' : 'e.g. EMP-1010'}
                      value={formData.employee_id}
                      onChange={(e) => setFormData({ ...formData, employee_id: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white font-mono focus:border-amber-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-mono text-slate-300 mb-1">
                      Email Address (for alert dispatches)
                    </label>
                    <input
                      type="email"
                      placeholder="e.g. worker@plant.local"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white font-mono focus:border-amber-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-mono text-slate-300 mb-1">
                    Department
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Mechanical Reliability & Vibration Lab"
                    value={formData.department}
                    onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white font-mono focus:border-amber-500"
                  />
                </div>

                {/* Worker Machine Assignment Checklist */}
                {formData.role === 'worker' && (
                  <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800">
                    <label className="block text-xs font-mono font-bold text-cyan-400 mb-2">
                      Assign Worker Monitoring Machines:
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-2">
                      {availableMachinesList.map((m) => {
                        const checked = formData.assigned_machines.includes(m.id);
                        return (
                          <label
                            key={m.id}
                            className={`flex items-center gap-2 p-2 rounded-lg border text-xs cursor-pointer transition-colors ${
                              checked
                                ? 'bg-cyan-950/40 border-cyan-500/50 text-white'
                                : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700'
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => {
                                const newAssigned = checked
                                  ? formData.assigned_machines.filter((id) => id !== m.id)
                                  : [...formData.assigned_machines, m.id];
                                setFormData({ ...formData, assigned_machines: newAssigned });
                              }}
                              className="rounded border-slate-700 text-cyan-500 focus:ring-0"
                            />
                            <div className="truncate font-mono">
                              <span className="font-bold text-cyan-300">{m.id}</span>
                              <span className="text-[10px] text-slate-400 block truncate">{m.name}</span>
                            </div>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                )}

                <button
                  type="submit"
                  className="w-full py-3 px-4 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-sm transition-all shadow-lg shadow-amber-500/20 flex items-center justify-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  <span>Provision Account with 600K PBKDF2</span>
                </button>

              </form>
            </div>
          )}

        </div>

      </div>

      {/* Worker Machine Assignment Modal Dialog */}
      {editingWorker && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-lg rounded-2xl bg-[#0b1120] border border-cyan-500/50 shadow-2xl p-6 text-slate-100">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
              <div>
                <h4 className="text-sm font-bold text-white">
                  Update Machine Assignments
                </h4>
                <p className="text-xs text-slate-400 font-mono">
                  Worker: <span className="text-cyan-400 font-bold">{editingWorker.full_name}</span> ({editingWorker.id})
                </p>
              </div>
              <button
                onClick={() => setEditingWorker(null)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-300 mb-3">
              Workers can only stream telemetry, perform manual predictions, view SHAP explainability, and acknowledge alerts for their assigned machines.
            </p>

            <div className="space-y-2 max-h-64 overflow-y-auto pr-2 mb-5">
              {availableMachinesList.map((m) => {
                const checked = selectedMachines.includes(m.id);
                return (
                  <label
                    key={m.id}
                    className={`flex items-center gap-2.5 p-2.5 rounded-lg border text-xs cursor-pointer transition-colors ${
                      checked
                        ? 'bg-cyan-950/40 border-cyan-500/50 text-white'
                        : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => {
                        const newSel = checked
                          ? selectedMachines.filter((id) => id !== m.id)
                          : [...selectedMachines, m.id];
                        setSelectedMachines(newSel);
                      }}
                      className="rounded border-slate-700 text-cyan-500 focus:ring-0"
                    />
                    <div className="font-mono flex-1">
                      <div className="font-bold text-cyan-300">{m.id}</div>
                      <div className="text-[11px] text-slate-400">{m.name}</div>
                    </div>
                  </label>
                );
              })}
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setEditingWorker(null)}
                className="px-4 py-2 rounded-xl text-xs font-mono text-slate-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveAssignments}
                className="px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs transition-colors"
              >
                Save Machine Assignments
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
