import React, { useState } from 'react';
import { X, Plus, Cpu, Sliders, Trash2, Edit2, Check, AlertCircle, CheckCircle2, MapPin, Building, Wrench, RefreshCw } from 'lucide-react';

const STANDARD_SENSORS = [
  { key: 'air_temperature_k', label: 'Air Temperature', unit: 'K', min: 295.0, max: 305.0, nominal: 298.5 },
  { key: 'process_temperature_k', label: 'Process Temperature', unit: 'K', min: 305.0, max: 315.0, nominal: 308.6 },
  { key: 'rotational_speed_rpm', label: 'Rotational / Spindle Speed', unit: 'RPM', min: 1100.0, max: 2800.0, nominal: 1500.0 },
  { key: 'torque_nm', label: 'Operating Torque', unit: 'Nm', min: 10.0, max: 75.0, nominal: 40.0 },
  { key: 'tool_wear_min', label: 'Tool Wear Accumulated', unit: 'min', min: 0.0, max: 250.0, nominal: 60.0 }
];

export default function MachineManagementModal({
  isOpen,
  onClose,
  machines,
  onMachineRegistered,
  onSensorsUpdated,
  currentUserRole
}) {
  if (!isOpen) return null;

  const [viewMode, setViewMode] = useState('list'); // 'list', 'add_machine', 'edit_sensors'
  const [selectedMachine, setSelectedMachine] = useState(null);

  // New Machine Form States
  const [newId, setNewId] = useState('');
  const [newName, setNewName] = useState('');
  const [newIndustry, setNewIndustry] = useState('Manufacturing');
  const [newType, setNewType] = useState('CNC Machine');
  const [newLocation, setNewLocation] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [sensorParams, setSensorParams] = useState([...STANDARD_SENSORS]);

  // Adding single sensor field
  const [paramKey, setParamKey] = useState('');
  const [paramLabel, setParamLabel] = useState('');
  const [paramUnit, setParamUnit] = useState('');
  const [paramMin, setParamMin] = useState('');
  const [paramMax, setParamMax] = useState('');
  const [paramNominal, setParamNominal] = useState('');

  // Editing existing sensor in list
  const [editingIndex, setEditingIndex] = useState(null);
  const [editParam, setEditParam] = useState(null);

  // Status
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const handleOpenAdd = () => {
    setErrorMsg('');
    setSuccessMsg('');
    setNewId(`MAC-${Math.floor(1000 + Math.random() * 9000)}`);
    setNewName('');
    setNewIndustry('Manufacturing');
    setNewType('CNC Milling Center');
    setNewLocation('');
    setNewDescription('');
    setSensorParams([...STANDARD_SENSORS]);
    setViewMode('add_machine');
  };

  const handleOpenEditSensors = (machine) => {
    setErrorMsg('');
    setSuccessMsg('');
    setSelectedMachine(machine);
    setSensorParams([...(machine.sensor_definitions || STANDARD_SENSORS)]);
    setViewMode('edit_sensors');
  };

  const handleAddSensorParam = () => {
    if (!paramKey.trim() || !paramLabel.trim()) {
      setErrorMsg('Sensor Key and Label are required.');
      return;
    }
    const cleanKey = paramKey.trim().toLowerCase().replace(/\s+/g, '_');
    if (sensorParams.some(s => s.key === cleanKey)) {
      setErrorMsg(`Sensor key '${cleanKey}' already exists.`);
      return;
    }

    const newS = {
      key: cleanKey,
      label: paramLabel.trim(),
      unit: paramUnit.trim() || 'units',
      min: parseFloat(paramMin) || 0.0,
      max: parseFloat(paramMax) || 100.0,
      nominal: parseFloat(paramNominal) || 50.0
    };

    setSensorParams([...sensorParams, newS]);
    setParamKey('');
    setParamLabel('');
    setParamUnit('');
    setParamMin('');
    setParamMax('');
    setParamNominal('');
    setErrorMsg('');
  };

  const handleRemoveSensorParam = (index) => {
    if (sensorParams.length <= 1) {
      setErrorMsg('At least one sensor parameter is required.');
      return;
    }
    const updated = sensorParams.filter((_, i) => i !== index);
    setSensorParams(updated);
  };

  const startEditSensor = (index) => {
    setEditingIndex(index);
    setEditParam({ ...sensorParams[index] });
  };

  const saveEditSensor = () => {
    if (!editParam.key.trim() || !editParam.label.trim()) return;
    const updated = [...sensorParams];
    updated[editingIndex] = {
      ...editParam,
      min: parseFloat(editParam.min) || 0.0,
      max: parseFloat(editParam.max) || 100.0,
      nominal: parseFloat(editParam.nominal) || 50.0
    };
    setSensorParams(updated);
    setEditingIndex(null);
    setEditParam(null);
  };

  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (!newId.trim() || !newName.trim() || !newLocation.trim()) {
      setErrorMsg('Machine ID, Name, and Location are required fields.');
      return;
    }

    if (sensorParams.length === 0) {
      setErrorMsg('Please configure at least one sensor parameter.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/machines/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: newId.trim().toUpperCase(),
          name: newName.trim(),
          industry: newIndustry.trim(),
          type: newType.trim(),
          location: newLocation.trim(),
          description: newDescription.trim(),
          sensor_definitions: sensorParams
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.detail || 'Registration failed');
      }

      setSuccessMsg(`Machine '${data.machine.name}' registered successfully!`);
      if (onMachineRegistered) {
        onMachineRegistered(data.machine);
      }
      setTimeout(() => {
        setViewMode('list');
        setSuccessMsg('');
      }, 1200);
    } catch (err) {
      setErrorMsg(err.message || 'Failed to register machine.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSaveSensorsUpdate = async () => {
    if (!selectedMachine) return;
    setErrorMsg('');
    setSuccessMsg('');
    setSubmitting(true);

    try {
      const res = await fetch(`/api/machines/${selectedMachine.id}/sensors`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sensor_definitions: sensorParams })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.detail || 'Failed to update sensors');
      }

      setSuccessMsg(`Sensor parameters updated for ${selectedMachine.name}!`);
      if (onSensorsUpdated) {
        onSensorsUpdated();
      }
      setTimeout(() => {
        setViewMode('list');
        setSuccessMsg('');
      }, 1000);
    } catch (err) {
      setErrorMsg(err.message || 'Failed to update sensors.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-4xl max-h-[85vh] bg-slate-900 border border-slate-700/80 rounded-2xl p-6 shadow-2xl text-white font-sans flex flex-col overflow-hidden">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-indigo-950/80 border border-indigo-500/40 text-indigo-400 shadow-indigo-glow">
              <Cpu className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">
                Machine Management & Telemetry Configuration
              </h2>
              <p className="text-xs text-slate-400 font-mono mt-0.5">
                Register industrial machines &bull; Configure sensor definitions &bull; Fleet Inventory
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

        {/* Action Notifications */}
        {errorMsg && (
          <div className="my-3 p-3 rounded-xl bg-rose-950/40 border border-rose-500/50 flex items-center gap-2 text-xs text-rose-300 font-mono shrink-0">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div className="my-3 p-3 rounded-xl bg-emerald-950/40 border border-emerald-500/50 flex items-center gap-2 text-xs text-emerald-300 font-mono shrink-0">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* VIEW 1: MACHINES LIST / FLEET MANAGEMENT INVENTORY */}
        {viewMode === 'list' && (
          <div className="flex-1 flex flex-col overflow-hidden mt-4">
            
            <div className="flex items-center justify-between pb-3 border-b border-slate-850">
              <div className="flex items-center gap-2 text-xs font-mono text-slate-300">
                <span>Fleet Machine Registry:</span>
                <span className="font-bold text-cyan-400">{machines.length} Total Machines</span>
              </div>

              <button
                onClick={handleOpenAdd}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white font-medium text-xs font-mono transition-all shadow-indigo-glow"
              >
                <Plus className="w-4 h-4" />
                <span>Add Machine</span>
              </button>
            </div>

            <div className="flex-1 overflow-y-auto my-3 space-y-2.5 pr-1">
              {machines.map(m => (
                <div
                  key={m.id}
                  className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 hover:border-slate-700 transition-all flex flex-col md:flex-row items-start md:items-center justify-between gap-4"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono font-bold px-2.5 py-0.5 rounded-md bg-slate-800 text-cyan-300 border border-slate-700">
                        {m.id}
                      </span>
                      <span className="text-xs text-slate-400 font-medium">
                        {m.industry} &bull; {m.type}
                      </span>
                    </div>

                    <h4 className="text-sm font-bold text-white">
                      {m.name}
                    </h4>

                    <div className="flex items-center gap-3 text-xs font-mono text-slate-400 pt-0.5">
                      <span className="flex items-center gap-1 text-slate-300">
                        <MapPin className="w-3.5 h-3.5 text-cyan-400" />
                        {m.location || 'Central Floor'}
                      </span>
                      <span>&bull;</span>
                      <span className="flex items-center gap-1 text-slate-400">
                        <Sliders className="w-3.5 h-3.5 text-indigo-400" />
                        {m.sensor_definitions?.length || 5} Configured Sensors
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => handleOpenEditSensors(m)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-mono transition-colors border border-slate-700"
                    >
                      <Sliders className="w-3.5 h-3.5 text-cyan-400" />
                      <span>Configure Sensors</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>

          </div>
        )}

        {/* VIEW 2: ADD MACHINE FORM */}
        {viewMode === 'add_machine' && (
          <form onSubmit={handleRegisterSubmit} className="flex-1 flex flex-col overflow-hidden mt-3">
            
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <span className="text-xs font-mono text-cyan-400 font-bold uppercase tracking-wider">
                Register New Industrial Asset
              </span>
              <button
                type="button"
                onClick={() => setViewMode('list')}
                className="text-xs font-mono text-slate-400 hover:text-white underline"
              >
                &larr; Back to Inventory
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-4 my-3 pr-1">
              
              {/* Machine Basic Metadata Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-mono text-slate-300 mb-1">Machine Name *</label>
                  <input
                    type="text"
                    required
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder="e.g. Haas VF-4SS Super Speed CNC"
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-mono text-slate-300 mb-1">Machine ID (Unique Alphanumeric) *</label>
                  <input
                    type="text"
                    required
                    value={newId}
                    onChange={(e) => setNewId(e.target.value.toUpperCase())}
                    placeholder="e.g. CNC-VF4-09"
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-mono text-slate-300 mb-1">Industry Sector *</label>
                  <select
                    value={newIndustry}
                    onChange={(e) => setNewIndustry(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-indigo-500"
                  >
                    <option value="Manufacturing">Manufacturing</option>
                    <option value="Automotive">Automotive</option>
                    <option value="Energy">Energy</option>
                    <option value="Aerospace">Aerospace</option>
                    <option value="Robotics">Robotics & Automation</option>
                    <option value="Heavy Machinery">Heavy Machinery</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-mono text-slate-300 mb-1">Machine Type *</label>
                  <input
                    type="text"
                    required
                    value={newType}
                    onChange={(e) => setNewType(e.target.value)}
                    placeholder="e.g. CNC Machining Center"
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-xs font-mono text-slate-300 mb-1">Physical Location / Bay *</label>
                  <input
                    type="text"
                    required
                    value={newLocation}
                    onChange={(e) => setNewLocation(e.target.value)}
                    placeholder="e.g. Bay 4, Precision Line B, North Plant"
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-xs font-mono text-slate-300 mb-1">Operational Description</label>
                  <textarea
                    rows={2}
                    value={newDescription}
                    onChange={(e) => setNewDescription(e.target.value)}
                    placeholder="Provide operational context or tooling notes..."
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              {/* Sensor Parameters Configuration Sub-Section */}
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border-b border-slate-850 pb-2">
                  <div>
                    <h3 className="text-xs font-mono font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                      <Sliders className="w-4 h-4 text-cyan-400" />
                      Configure Machine Sensor Parameters
                    </h3>
                    <p className="text-[11px] text-slate-400 font-mono mt-0.5">
                      Add, edit, or remove machine-specific sensors. Default includes AI4I ML predictive features.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => setSensorParams([...STANDARD_SENSORS])}
                    className="text-[11px] font-mono text-cyan-400 hover:text-cyan-300 underline"
                  >
                    Reset to Standard AI4I Sensors
                  </button>
                </div>

                {/* Sensor List Table */}
                <div className="overflow-x-auto">
                  <table className="w-full text-xs font-mono">
                    <thead>
                      <tr className="border-b border-slate-800 text-slate-400">
                        <th className="text-left py-2">Sensor Key</th>
                        <th className="text-left py-2">Label</th>
                        <th className="text-center py-2">Unit</th>
                        <th className="text-center py-2">Min Range</th>
                        <th className="text-center py-2">Max Range</th>
                        <th className="text-center py-2">Nominal</th>
                        <th className="text-right py-2">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-850">
                      {sensorParams.map((s, idx) => (
                        <tr key={s.key + idx}>
                          {editingIndex === idx ? (
                            <>
                              <td className="py-2">
                                <input
                                  type="text"
                                  value={editParam.key}
                                  onChange={(e) => setEditParam({ ...editParam, key: e.target.value })}
                                  className="w-24 bg-slate-900 border border-slate-700 px-1.5 py-0.5 rounded text-white"
                                />
                              </td>
                              <td className="py-2">
                                <input
                                  type="text"
                                  value={editParam.label}
                                  onChange={(e) => setEditParam({ ...editParam, label: e.target.value })}
                                  className="w-32 bg-slate-900 border border-slate-700 px-1.5 py-0.5 rounded text-white"
                                />
                              </td>
                              <td className="py-2 text-center">
                                <input
                                  type="text"
                                  value={editParam.unit}
                                  onChange={(e) => setEditParam({ ...editParam, unit: e.target.value })}
                                  className="w-16 bg-slate-900 border border-slate-700 px-1.5 py-0.5 rounded text-center text-white"
                                />
                              </td>
                              <td className="py-2 text-center">
                                <input
                                  type="number"
                                  value={editParam.min}
                                  onChange={(e) => setEditParam({ ...editParam, min: e.target.value })}
                                  className="w-16 bg-slate-900 border border-slate-700 px-1.5 py-0.5 rounded text-center text-white"
                                />
                              </td>
                              <td className="py-2 text-center">
                                <input
                                  type="number"
                                  value={editParam.max}
                                  onChange={(e) => setEditParam({ ...editParam, max: e.target.value })}
                                  className="w-16 bg-slate-900 border border-slate-700 px-1.5 py-0.5 rounded text-center text-white"
                                />
                              </td>
                              <td className="py-2 text-center">
                                <input
                                  type="number"
                                  value={editParam.nominal}
                                  onChange={(e) => setEditParam({ ...editParam, nominal: e.target.value })}
                                  className="w-16 bg-slate-900 border border-slate-700 px-1.5 py-0.5 rounded text-center text-white"
                                />
                              </td>
                              <td className="py-2 text-right">
                                <button
                                  type="button"
                                  onClick={saveEditSensor}
                                  className="p-1 rounded bg-emerald-600 hover:bg-emerald-500 text-white mr-1"
                                  title="Save Changes"
                                >
                                  <Check className="w-3 h-3" />
                                </button>
                              </td>
                            </>
                          ) : (
                            <>
                              <td className="py-2 text-cyan-300 font-bold">{s.key}</td>
                              <td className="py-2 text-white">{s.label}</td>
                              <td className="py-2 text-center text-slate-400">{s.unit}</td>
                              <td className="py-2 text-center text-slate-300">{s.min}</td>
                              <td className="py-2 text-center text-slate-300">{s.max}</td>
                              <td className="py-2 text-center text-indigo-300 font-bold">{s.nominal}</td>
                              <td className="py-2 text-right space-x-1">
                                <button
                                  type="button"
                                  onClick={() => startEditSensor(idx)}
                                  className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white"
                                  title="Edit parameter"
                                >
                                  <Edit2 className="w-3 h-3" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleRemoveSensorParam(idx)}
                                  className="p-1 rounded bg-slate-800 hover:bg-rose-900/60 text-slate-400 hover:text-rose-300"
                                  title="Remove parameter"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              </td>
                            </>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Add New Sensor Row */}
                <div className="p-3 rounded-lg bg-slate-900 border border-slate-800 space-y-2">
                  <span className="text-[11px] font-mono font-bold text-slate-300 uppercase tracking-wider block">
                    Add New Sensor Parameter:
                  </span>
                  <div className="grid grid-cols-2 sm:grid-cols-6 gap-2">
                    <input
                      type="text"
                      placeholder="key (e.g. vibration_hz)"
                      value={paramKey}
                      onChange={(e) => setParamKey(e.target.value)}
                      className="bg-slate-950 border border-slate-700 px-2 py-1 rounded text-xs text-white"
                    />
                    <input
                      type="text"
                      placeholder="Label (e.g. Vibration)"
                      value={paramLabel}
                      onChange={(e) => setParamLabel(e.target.value)}
                      className="bg-slate-950 border border-slate-700 px-2 py-1 rounded text-xs text-white"
                    />
                    <input
                      type="text"
                      placeholder="Unit (e.g. Hz)"
                      value={paramUnit}
                      onChange={(e) => setParamUnit(e.target.value)}
                      className="bg-slate-950 border border-slate-700 px-2 py-1 rounded text-xs text-white"
                    />
                    <input
                      type="number"
                      placeholder="Min"
                      value={paramMin}
                      onChange={(e) => setParamMin(e.target.value)}
                      className="bg-slate-950 border border-slate-700 px-2 py-1 rounded text-xs text-white"
                    />
                    <input
                      type="number"
                      placeholder="Max"
                      value={paramMax}
                      onChange={(e) => setParamMax(e.target.value)}
                      className="bg-slate-950 border border-slate-700 px-2 py-1 rounded text-xs text-white"
                    />
                    <input
                      type="number"
                      placeholder="Nominal"
                      value={paramNominal}
                      onChange={(e) => setParamNominal(e.target.value)}
                      className="bg-slate-950 border border-slate-700 px-2 py-1 rounded text-xs text-white"
                    />
                  </div>
                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={handleAddSensorParam}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs font-mono transition-all"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Add Parameter to Machine</span>
                    </button>
                  </div>
                </div>

              </div>

            </div>

            {/* Form Footer */}
            <div className="pt-3 border-t border-slate-800 flex justify-end gap-2 shrink-0">
              <button
                type="button"
                onClick={() => setViewMode('list')}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium text-xs font-mono transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white font-medium text-xs font-mono transition-all shadow-indigo-glow disabled:opacity-50"
              >
                <Cpu className="w-4 h-4" />
                <span>{submitting ? 'Registering...' : 'Save & Register Machine'}</span>
              </button>
            </div>

          </form>
        )}

        {/* VIEW 3: EDIT SENSORS OF EXISTING MACHINE */}
        {viewMode === 'edit_sensors' && selectedMachine && (
          <div className="flex-1 flex flex-col overflow-hidden mt-3">
            
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono text-cyan-400 font-bold">
                  Configuring Sensor Parameters for: {selectedMachine.name} ({selectedMachine.id})
                </span>
              </div>
              <button
                type="button"
                onClick={() => setViewMode('list')}
                className="text-xs font-mono text-slate-400 hover:text-white underline"
              >
                &larr; Back to Inventory
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-4 my-3 pr-1">
              
              <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between text-xs font-mono">
                <div className="flex items-center gap-3">
                  <span className="text-slate-400">Industry: <strong className="text-white">{selectedMachine.industry}</strong></span>
                  <span>&bull;</span>
                  <span className="text-slate-400">Location: <strong className="text-white">{selectedMachine.location || 'Central Floor'}</strong></span>
                </div>
                <button
                  type="button"
                  onClick={() => setSensorParams([...STANDARD_SENSORS])}
                  className="text-cyan-400 hover:text-cyan-300 underline"
                >
                  Load Standard AI4I Set
                </button>
              </div>

              {/* Table of sensors */}
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800">
                <table className="w-full text-xs font-mono">
                  <thead>
                    <tr className="border-b border-slate-800 text-slate-400">
                      <th className="text-left py-2">Sensor Key</th>
                      <th className="text-left py-2">Label</th>
                      <th className="text-center py-2">Unit</th>
                      <th className="text-center py-2">Min</th>
                      <th className="text-center py-2">Max</th>
                      <th className="text-center py-2">Nominal</th>
                      <th className="text-right py-2">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-850">
                    {sensorParams.map((s, idx) => (
                      <tr key={s.key + idx}>
                        {editingIndex === idx ? (
                          <>
                            <td className="py-2">
                              <input
                                type="text"
                                value={editParam.key}
                                onChange={(e) => setEditParam({ ...editParam, key: e.target.value })}
                                className="w-24 bg-slate-900 border border-slate-700 px-1.5 py-0.5 rounded text-white"
                              />
                            </td>
                            <td className="py-2">
                              <input
                                type="text"
                                value={editParam.label}
                                onChange={(e) => setEditParam({ ...editParam, label: e.target.value })}
                                className="w-32 bg-slate-900 border border-slate-700 px-1.5 py-0.5 rounded text-white"
                              />
                            </td>
                            <td className="py-2 text-center">
                              <input
                                type="text"
                                value={editParam.unit}
                                onChange={(e) => setEditParam({ ...editParam, unit: e.target.value })}
                                className="w-16 bg-slate-900 border border-slate-700 px-1.5 py-0.5 rounded text-center text-white"
                              />
                            </td>
                            <td className="py-2 text-center">
                              <input
                                type="number"
                                value={editParam.min}
                                onChange={(e) => setEditParam({ ...editParam, min: e.target.value })}
                                className="w-16 bg-slate-900 border border-slate-700 px-1.5 py-0.5 rounded text-center text-white"
                              />
                            </td>
                            <td className="py-2 text-center">
                              <input
                                type="number"
                                value={editParam.max}
                                onChange={(e) => setEditParam({ ...editParam, max: e.target.value })}
                                className="w-16 bg-slate-900 border border-slate-700 px-1.5 py-0.5 rounded text-center text-white"
                              />
                            </td>
                            <td className="py-2 text-center">
                              <input
                                type="number"
                                value={editParam.nominal}
                                onChange={(e) => setEditParam({ ...editParam, nominal: e.target.value })}
                                className="w-16 bg-slate-900 border border-slate-700 px-1.5 py-0.5 rounded text-center text-white"
                              />
                            </td>
                            <td className="py-2 text-right">
                              <button
                                type="button"
                                onClick={saveEditSensor}
                                className="p-1 rounded bg-emerald-600 hover:bg-emerald-500 text-white"
                              >
                                <Check className="w-3 h-3" />
                              </button>
                            </td>
                          </>
                        ) : (
                          <>
                            <td className="py-2 text-cyan-300 font-bold">{s.key}</td>
                            <td className="py-2 text-white">{s.label}</td>
                            <td className="py-2 text-center text-slate-400">{s.unit}</td>
                            <td className="py-2 text-center text-slate-300">{s.min}</td>
                            <td className="py-2 text-center text-slate-300">{s.max}</td>
                            <td className="py-2 text-center text-indigo-300 font-bold">{s.nominal}</td>
                            <td className="py-2 text-right space-x-1">
                              <button
                                type="button"
                                onClick={() => startEditSensor(idx)}
                                className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white"
                                title="Edit parameter"
                              >
                                <Edit2 className="w-3 h-3" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleRemoveSensorParam(idx)}
                                className="p-1 rounded bg-slate-800 hover:bg-rose-900/60 text-slate-400 hover:text-rose-300"
                                title="Remove parameter"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </td>
                          </>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Add New Sensor Row */}
              <div className="p-3 rounded-lg bg-slate-900 border border-slate-800 space-y-2">
                <span className="text-[11px] font-mono font-bold text-slate-300 uppercase tracking-wider block">
                  Add Additional Sensor:
                </span>
                <div className="grid grid-cols-2 sm:grid-cols-6 gap-2">
                  <input
                    type="text"
                    placeholder="key (e.g. pressure_bar)"
                    value={paramKey}
                    onChange={(e) => setParamKey(e.target.value)}
                    className="bg-slate-950 border border-slate-700 px-2 py-1 rounded text-xs text-white"
                  />
                  <input
                    type="text"
                    placeholder="Label (e.g. Pressure)"
                    value={paramLabel}
                    onChange={(e) => setParamLabel(e.target.value)}
                    className="bg-slate-950 border border-slate-700 px-2 py-1 rounded text-xs text-white"
                  />
                  <input
                    type="text"
                    placeholder="Unit (e.g. bar)"
                    value={paramUnit}
                    onChange={(e) => setParamUnit(e.target.value)}
                    className="bg-slate-950 border border-slate-700 px-2 py-1 rounded text-xs text-white"
                  />
                  <input
                    type="number"
                    placeholder="Min"
                    value={paramMin}
                    onChange={(e) => setParamMin(e.target.value)}
                    className="bg-slate-950 border border-slate-700 px-2 py-1 rounded text-xs text-white"
                  />
                  <input
                    type="number"
                    placeholder="Max"
                    value={paramMax}
                    onChange={(e) => setParamMax(e.target.value)}
                    className="bg-slate-950 border border-slate-700 px-2 py-1 rounded text-xs text-white"
                  />
                  <input
                    type="number"
                    placeholder="Nominal"
                    value={paramNominal}
                    onChange={(e) => setParamNominal(e.target.value)}
                    className="bg-slate-950 border border-slate-700 px-2 py-1 rounded text-xs text-white"
                  />
                </div>
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={handleAddSensorParam}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs font-mono transition-all"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Append Sensor Parameter</span>
                  </button>
                </div>
              </div>

            </div>

            {/* Footer */}
            <div className="pt-3 border-t border-slate-800 flex justify-end gap-2 shrink-0">
              <button
                type="button"
                onClick={() => setViewMode('list')}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium text-xs font-mono transition-colors"
              >
                Back
              </button>
              <button
                type="button"
                onClick={handleSaveSensorsUpdate}
                disabled={submitting}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-600 to-cyan-500 hover:from-cyan-500 hover:to-cyan-400 text-white font-medium text-xs font-mono transition-all shadow-cyan-glow disabled:opacity-50"
              >
                <Sliders className="w-4 h-4" />
                <span>{submitting ? 'Saving Changes...' : 'Save Configured Sensor Set'}</span>
              </button>
            </div>

          </div>
        )}

      </div>
    </div>
  );
}
