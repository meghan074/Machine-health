import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import MachineCard from './components/MachineCard';
import MachineDetailModal from './components/MachineDetailModal';
import ShapExplanationModal from './components/ShapExplanationModal';
import RulEstimationModal from './components/RulEstimationModal';
import SendAlertModal from './components/SendAlertModal';
import WorkerAlertsDrawer from './components/WorkerAlertsDrawer';
import ModelComparisonModal from './components/ModelComparisonModal';
import EmailLogsModal from './components/EmailLogsModal';
import MachineManagementModal from './components/MachineManagementModal';
import ManualPredictionModal from './components/ManualPredictionModal';

// Dedicated Auth & Admin Components
import LoginSelectionPage from './components/auth/LoginSelectionPage';
import WorkerLoginPage from './components/auth/WorkerLoginPage';
import UserLoginPage from './components/auth/UserLoginPage';
import AdminLoginPage from './components/auth/AdminLoginPage';
import AdminConsoleModal from './components/admin/AdminConsoleModal';

import { 
  Activity, ShieldCheck, User, Search, Filter, AlertTriangle, 
  CheckCircle2, Clock, Send, Zap, Mail, BarChart2, Cpu, Sliders, 
  Plus, Lock, KeyRound, HardHat 
} from 'lucide-react';

export default function App() {
  // Authentication & View State
  const [authToken, setAuthToken] = useState(() => sessionStorage.getItem('auth_token'));
  const [currentUser, setCurrentUser] = useState(null);
  const [authChecking, setAuthChecking] = useState(true);
  const [currentView, setCurrentView] = useState(() => {
    return sessionStorage.getItem('auth_token') ? 'DASHBOARD' : 'SELECT_LOGIN';
  });

  // Data & Fleet States
  const [machines, setMachines] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [selectedIndustry, setSelectedIndustry] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterAssignedOnly, setFilterAssignedOnly] = useState(false);
  const [loading, setLoading] = useState(false);

  // Live simulation states
  const [isAutoSimulating, setIsAutoSimulating] = useState(true);
  const [simulatingLoading, setSimulatingLoading] = useState(false);

  // Modals & Drawers
  const [detailMachine, setDetailMachine] = useState(null);
  const [shapMachine, setShapMachine] = useState(null);
  const [rulMachine, setRulMachine] = useState(null);
  const [sendAlertMachine, setSendAlertMachine] = useState(null);
  const [showModelComparison, setShowModelComparison] = useState(false);
  const [showEmailLogs, setShowEmailLogs] = useState(false);
  const [showAlertsDrawer, setShowAlertsDrawer] = useState(false);
  const [showMachineManagement, setShowMachineManagement] = useState(false);
  const [showManualPrediction, setShowManualPrediction] = useState(false);
  const [manualPredictionTarget, setManualPredictionTarget] = useState(null);
  const [showAdminConsole, setShowAdminConsole] = useState(false);

  // Check existing session token on application load
  useEffect(() => {
    const verifySession = async () => {
      const storedToken = sessionStorage.getItem('auth_token');
      if (!storedToken) {
        setAuthChecking(false);
        setCurrentView('SELECT_LOGIN');
        return;
      }

      try {
        const res = await fetch('/api/auth/me', {
          headers: { 'Authorization': `Bearer ${storedToken}` }
        });
        if (res.ok) {
          const data = await res.json();
          setCurrentUser(data.user);
          setAuthToken(storedToken);
          setCurrentView('DASHBOARD');
        } else {
          sessionStorage.removeItem('auth_token');
          setAuthToken(null);
          setCurrentUser(null);
          setCurrentView('SELECT_LOGIN');
        }
      } catch (err) {
        console.error('Session validation error:', err);
        sessionStorage.removeItem('auth_token');
        setAuthToken(null);
        setCurrentUser(null);
        setCurrentView('SELECT_LOGIN');
      } finally {
        setAuthChecking(false);
      }
    };

    verifySession();
  }, []);

  // Fetch machines and alerts when authenticated in dashboard
  const fetchMachines = async () => {
    if (!authToken && !sessionStorage.getItem('auth_token')) return;
    try {
      const res = await fetch('/api/machines');
      if (res.status === 401) {
        handleLogout();
        return;
      }
      const data = await res.json();
      setMachines(data);
    } catch (err) {
      console.error('Failed to fetch machines:', err);
    }
  };

  const fetchAlerts = async () => {
    if (!authToken && !sessionStorage.getItem('auth_token')) return;
    try {
      const res = await fetch('/api/alerts');
      if (res.status === 401) {
        handleLogout();
        return;
      }
      const data = await res.json();
      setAlerts(data);
    } catch (err) {
      console.error('Failed to fetch alerts:', err);
    }
  };

  useEffect(() => {
    if (currentView === 'DASHBOARD' && currentUser) {
      setLoading(true);
      Promise.all([fetchMachines(), fetchAlerts()]).finally(() => setLoading(false));
    }
  }, [currentView, currentUser]);

  // Secure In-Band WebSocket Telemetry Stream (Zero tokens in URL)
  useEffect(() => {
    if (currentView !== 'DASHBOARD' || !authToken) return;

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws/telemetry`;
    let ws;

    try {
      ws = new WebSocket(wsUrl);

      ws.onopen = () => {
        // Send in-band authentication frame within 5s handshake window
        ws.send(JSON.stringify({
          action: 'AUTHENTICATE',
          token: authToken
        }));
      };

      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          if (msg.type === 'TELEMETRY_UPDATE' && Array.isArray(msg.machines)) {
            setMachines((prev) =>
              prev.map((m) => {
                const update = msg.machines.find((u) => u.id === m.id);
                if (update) {
                  return {
                    ...m,
                    readings: update.readings,
                    consensus: update.consensus,
                    prediction_rf: { ...m.prediction_rf, failure_probability: update.rf_prob },
                    prediction_xgb: { ...m.prediction_xgb, failure_probability: update.xgb_prob },
                    last_updated: msg.timestamp
                  };
                }
                return m;
              })
            );
          } else if (msg.type === 'AUTH_ERROR') {
            console.warn('WebSocket Authentication rejected:', msg.message);
          }
        } catch (e) {
          console.error('WebSocket frame parse error:', e);
        }
      };

      ws.onerror = (e) => {
        console.warn('WebSocket connection error (will fallback to manual tick):', e);
      };
    } catch (err) {
      console.error('Failed to initialize WebSocket:', err);
    }

    return () => {
      if (ws) {
        try { ws.close(); } catch (e) {}
      }
    };
  }, [currentView, authToken]);

  // Handle successful login
  const handleLoginSuccess = (token, user) => {
    sessionStorage.setItem('auth_token', token);
    setAuthToken(token);
    setCurrentUser(user);
    setCurrentView('DASHBOARD');
  };

  // Handle logout and session invalidation
  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch (err) {
      console.error('Logout error:', err);
    } finally {
      sessionStorage.removeItem('auth_token');
      setAuthToken(null);
      setCurrentUser(null);
      setMachines([]);
      setAlerts([]);
      setCurrentView('SELECT_LOGIN');
    }
  };

  // Manual simulation step
  const handleManualTick = async () => {
    setSimulatingLoading(true);
    try {
      await fetch('/api/simulation/tick', { method: 'POST' });
      await fetchMachines();
    } catch (err) {
      console.error('Manual tick error:', err);
    } finally {
      setSimulatingLoading(false);
    }
  };

  // Acknowledge alert
  const handleAcknowledgeAlert = async (alertId) => {
    try {
      const res = await fetch(`/api/alerts/${alertId}/acknowledge`, { method: 'POST' });
      if (res.ok) {
        fetchAlerts();
      }
    } catch (err) {
      console.error('Failed to acknowledge alert:', err);
    }
  };

  // Update sensor reading for single machine
  const handleUpdateSensorReading = async (machineId, newReadings) => {
    try {
      await fetch(`/api/machines/${machineId}/update-sensors`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ machine_id: machineId, readings: newReadings })
      });
      fetchMachines();
    } catch (err) {
      console.error('Failed to update sensors:', err);
    }
  };

  // Loading Screen during initial session check
  if (authChecking) {
    return (
      <div className="min-h-screen bg-[#080d1a] text-slate-100 flex flex-col items-center justify-center p-4">
        <div className="relative flex items-center justify-center w-16 h-16 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 mb-4 shadow-cyan-glow">
          <Activity className="w-8 h-8 text-cyan-400 animate-status-pulse" />
        </div>
        <div className="text-sm font-bold text-white font-mono mb-1">
          Apex Predictive Maintenance
        </div>
        <p className="text-xs text-slate-500 font-mono">
          Verifying cryptographic authentication status...
        </p>
      </div>
    );
  }

  // Top-Level View Router: Separate Login Pages
  if (currentView === 'SELECT_LOGIN') {
    return <LoginSelectionPage onSelectPortal={(portal) => setCurrentView(portal)} />;
  }

  if (currentView === 'WORKER_LOGIN') {
    return (
      <WorkerLoginPage
        onBack={() => setCurrentView('SELECT_LOGIN')}
        onLoginSuccess={handleLoginSuccess}
      />
    );
  }

  if (currentView === 'USER_LOGIN') {
    return (
      <UserLoginPage
        onBack={() => setCurrentView('SELECT_LOGIN')}
        onLoginSuccess={handleLoginSuccess}
      />
    );
  }

  if (currentView === 'ADMIN_LOGIN') {
    return (
      <AdminLoginPage
        onBack={() => setCurrentView('SELECT_LOGIN')}
        onLoginSuccess={handleLoginSuccess}
      />
    );
  }

  // ----------------- DASHBOARD VIEW -----------------
  const currentRole = currentUser?.role || 'worker';
  const isAdmin = currentRole === 'admin';
  const isOrganiserOrAdmin = currentRole === 'organiser' || currentRole === 'user' || currentRole === 'admin';

  // KPIs
  const totalMachines = machines.length;
  const criticalCount = machines.filter(m => m.consensus?.status === 'Critical').length;
  const warningCount = machines.filter(m => m.consensus?.status === 'Warning').length;
  const healthyCount = machines.filter(m => m.consensus?.status === 'Healthy').length;
  const unreadAlertsCount = alerts.filter(a => !a.worker_acknowledged).length;

  // Filtered Machines
  const filteredMachines = machines.filter(m => {
    const matchIndustry = selectedIndustry === 'ALL' || m.industry.toLowerCase() === selectedIndustry.toLowerCase();
    const matchSearch = m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                        m.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
                        (m.location && m.location.toLowerCase().includes(searchQuery.toLowerCase())) ||
                        m.type.toLowerCase().includes(searchQuery.toLowerCase());
    return matchIndustry && matchSearch;
  });

  return (
    <div className="min-h-screen text-slate-100 font-sans antialiased pb-16">
      
      {/* Navigation Header */}
      <Navbar
        currentUser={currentUser}
        onLogout={handleLogout}
        onOpenAdminConsole={() => setShowAdminConsole(true)}
        unreadAlertsCount={unreadAlertsCount}
        onOpenAlerts={() => setShowAlertsDrawer(true)}
        onOpenModelComparison={() => setShowModelComparison(true)}
        onOpenEmailLogs={() => setShowEmailLogs(true)}
        isAutoSimulating={isAutoSimulating}
        onToggleAutoSim={() => setIsAutoSimulating(!isAutoSimulating)}
        onManualTick={handleManualTick}
        simulatingLoading={simulatingLoading}
        onOpenMachineManagement={() => setShowMachineManagement(true)}
        onOpenManualPrediction={() => {
          setManualPredictionTarget(machines[0] || null);
          setShowManualPrediction(true);
        }}
      />

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-4 lg:px-8 mt-6">
        
        {/* Role Alert Banner */}
        {isAdmin ? (
          <div className="mb-6 p-4 rounded-2xl bg-gradient-to-r from-amber-950/40 via-slate-900 to-slate-900 border border-amber-500/30 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-lg backdrop-blur-sm">
            <div className="flex items-center gap-3.5">
              <div className="p-2.5 rounded-xl bg-amber-950/80 border border-amber-500/40 text-amber-400">
                <KeyRound className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-white font-mono">
                  Administrator Governance &amp; Security Authority
                </h2>
                <p className="text-xs text-slate-300 mt-0.5">
                  Logged in as <strong className="text-amber-300">{currentUser?.full_name}</strong>. Full access to user provisioning, worker machine isolation, session revocation, and fleet diagnostics.
                </p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => setShowAdminConsole(true)}
                className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 font-mono text-xs transition-all border border-amber-500/40 font-bold"
              >
                <KeyRound className="w-3.5 h-3.5" />
                <span>Open Admin Console</span>
              </button>
              <button
                onClick={() => setShowMachineManagement(true)}
                className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-mono text-xs transition-all border border-slate-700"
              >
                <Cpu className="w-3.5 h-3.5 text-indigo-400" />
                <span>Machine Management</span>
              </button>
            </div>
          </div>
        ) : isOrganiserOrAdmin ? (
          <div className="mb-6 p-4 rounded-2xl bg-gradient-to-r from-indigo-950/40 via-slate-900 to-slate-900 border border-indigo-500/30 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-lg backdrop-blur-sm">
            <div className="flex items-center gap-3.5">
              <div className="p-2.5 rounded-xl bg-indigo-950/80 border border-indigo-500/40 text-indigo-400 shadow-indigo-glow">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-white font-mono">
                  Company User Fleet Command &amp; Operations
                </h2>
                <p className="text-xs text-slate-300 mt-0.5">
                  Logged in as <strong className="text-indigo-300">{currentUser?.full_name}</strong>. Register new machines, configure sensor parameters, and dispatch dynamic worker alerts.
                </p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => setShowMachineManagement(true)}
                className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-mono text-xs transition-all border border-slate-700"
              >
                <Cpu className="w-3.5 h-3.5 text-indigo-400" />
                <span>Machine Management</span>
              </button>
              <button
                onClick={() => {
                  setManualPredictionTarget(machines[0] || null);
                  setShowManualPrediction(true);
                }}
                className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-cyan-300 font-mono text-xs transition-all border border-slate-700"
              >
                <Sliders className="w-3.5 h-3.5 text-cyan-400" />
                <span>Manual Predict</span>
              </button>
              <button
                onClick={() => setSendAlertMachine(machines[0] || null)}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white font-medium text-xs font-mono transition-all shadow-indigo-glow"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Dispatch Alert</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="mb-6 p-4 rounded-2xl bg-gradient-to-r from-cyan-950/40 via-slate-900 to-slate-900 border border-cyan-500/30 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-lg backdrop-blur-sm">
            <div className="flex items-center gap-3.5">
              <div className="p-2.5 rounded-xl bg-cyan-950/80 border border-cyan-500/40 text-cyan-400 shadow-cyan-glow">
                <HardHat className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-sm font-bold text-white font-mono">
                    Worker Portal: {currentUser?.full_name} ({currentUser?.employee_id || currentUser?.id})
                  </h2>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 font-semibold">
                    {currentUser?.assigned_machines?.length || 0} Assigned Machines
                  </span>
                </div>
                <p className="text-xs text-slate-300 mt-0.5">
                  Review assigned machine health, enter manual sensor readings, investigate failure causes with SHAP explainability, and inspect RUL trajectories.
                </p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => {
                  setManualPredictionTarget(machines[0] || null);
                  setShowManualPrediction(true);
                }}
                className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-cyan-300 font-mono text-xs transition-all border border-slate-700"
              >
                <Sliders className="w-3.5 h-3.5 text-cyan-400" />
                <span>Manual Sensor Predict</span>
              </button>
              <button
                onClick={() => setShowAlertsDrawer(true)}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-cyan-600 to-cyan-500 hover:from-cyan-500 hover:to-cyan-400 text-white font-medium text-xs font-mono transition-all shadow-cyan-glow"
              >
                <Mail className="w-3.5 h-3.5 text-cyan-200" />
                <span>Inbox ({unreadAlertsCount} Unread)</span>
              </button>
            </div>
          </div>
        )}

        {/* KPI Metric Summary Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 mb-6">
          <div className="card-glass p-4 rounded-2xl flex flex-col justify-between">
            <span className="text-xs font-mono font-medium text-slate-400 uppercase tracking-wider">
              {currentRole === 'worker' ? 'Assigned Machines' : 'Total Fleet'}
            </span>
            <div className="text-3xl font-black font-mono text-white mt-1.5">{totalMachines}</div>
            <span className="text-[10px] text-slate-400 mt-1 font-mono">
              {currentRole === 'worker' ? 'Monitored Assets' : 'Multi-Industry Assets'}
            </span>
          </div>

          <div className="card-glass p-4 rounded-2xl flex flex-col justify-between">
            <span className="text-xs font-mono font-medium text-slate-400 uppercase tracking-wider">Critical Breakdown Risk</span>
            <div className="text-3xl font-black font-mono text-rose-400 mt-1.5 flex items-center gap-2">
              {criticalCount}
              {criticalCount > 0 && <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping" />}
            </div>
            <span className="text-[10px] text-rose-400/80 mt-1 font-mono">Requires Shift Intervention</span>
          </div>

          <div className="card-glass p-4 rounded-2xl flex flex-col justify-between">
            <span className="text-xs font-mono font-medium text-slate-400 uppercase tracking-wider">Degradation Warning</span>
            <div className="text-3xl font-black font-mono text-amber-400 mt-1.5">{warningCount}</div>
            <span className="text-[10px] text-amber-400/80 mt-1 font-mono">Approaching Wear Limit</span>
          </div>

          <div className="card-glass p-4 rounded-2xl flex flex-col justify-between">
            <span className="text-xs font-mono font-medium text-slate-400 uppercase tracking-wider">Optimal Health</span>
            <div className="text-3xl font-black font-mono text-emerald-400 mt-1.5">{healthyCount}</div>
            <span className="text-[10px] text-emerald-400/80 mt-1 font-mono">Safe Operating Envelope</span>
          </div>
        </div>

        {/* Filters and Search Bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 mb-6 p-3 rounded-2xl card-glass">
          
          {/* Industry Filters */}
          <div className="flex flex-wrap items-center gap-1.5 w-full sm:w-auto">
            <span className="text-xs font-medium text-slate-400 mr-1.5 hidden md:inline">Industry:</span>
            {['ALL', 'Manufacturing', 'Automotive', 'Energy'].map(ind => (
              <button
                key={ind}
                onClick={() => setSelectedIndustry(ind)}
                className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${
                  selectedIndustry.toUpperCase() === ind.toUpperCase()
                    ? 'bg-cyan-600 text-white font-bold shadow-cyan-glow'
                    : 'bg-slate-900/80 text-slate-300 hover:text-white border border-slate-800'
                }`}
              >
                {ind}
              </button>
            ))}
          </div>

          {/* Search Box */}
          <div className="relative w-full sm:w-64">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search machine or ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-900/90 border border-slate-700/80 rounded-xl pl-9 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 transition-colors"
            />
          </div>

        </div>

        {/* Machines Grid */}
        {loading ? (
          <div className="py-24 text-center font-mono text-sm text-cyan-400">
            <div className="w-8 h-8 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <span>Loading industrial fleet telemetry...</span>
          </div>
        ) : filteredMachines.length === 0 ? (
          <div className="py-24 text-center font-mono text-xs text-slate-400">
            {currentRole === 'worker' 
              ? 'No assigned machines found for your worker identity. Contact an administrator to update machine assignments.' 
              : 'No machines matched your search criteria.'}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredMachines.map(machine => (
              <MachineCard
                key={machine.id}
                machine={machine}
                currentRole={currentRole}
                onOpenDetails={(m) => setDetailMachine(m)}
                onOpenShap={(m) => setShapMachine(m)}
                onOpenRul={(m) => setRulMachine(m)}
                onOpenSendAlert={(m) => setSendAlertMachine(m)}
                onOpenManualPrediction={(m) => {
                  setManualPredictionTarget(m);
                  setShowManualPrediction(true);
                }}
              />
            ))}
          </div>
        )}

      </main>

      {/* Modals and Drawers */}
      {detailMachine && (
        <MachineDetailModal
          machine={detailMachine}
          currentRole={currentRole}
          onClose={() => setDetailMachine(null)}
          onOpenShap={(m) => setShapMachine(m)}
          onOpenRul={(m) => setRulMachine(m)}
          onOpenSendAlert={(m) => setSendAlertMachine(m)}
          onUpdateSensorReading={handleUpdateSensorReading}
        />
      )}

      {shapMachine && (
        <ShapExplanationModal
          machine={shapMachine}
          onClose={() => setShapMachine(null)}
        />
      )}

      {rulMachine && (
        <RulEstimationModal
          machine={rulMachine}
          onClose={() => setRulMachine(null)}
        />
      )}

      {sendAlertMachine && (
        <SendAlertModal
          machine={sendAlertMachine}
          machines={machines}
          onClose={() => setSendAlertMachine(null)}
          onAlertSent={() => {
            fetchAlerts();
            fetchMachines();
          }}
        />
      )}

      {showAlertsDrawer && (
        <WorkerAlertsDrawer
          alerts={alerts}
          machines={machines}
          onClose={() => setShowAlertsDrawer(false)}
          onAcknowledgeAlert={handleAcknowledgeAlert}
          onOpenShapForMachine={(m) => setShapMachine(m)}
        />
      )}

      {showModelComparison && (
        <ModelComparisonModal
          onClose={() => setShowModelComparison(false)}
        />
      )}

      {showEmailLogs && (
        <EmailLogsModal
          onClose={() => setShowEmailLogs(false)}
        />
      )}

      {/* Machine Management Modal */}
      {showMachineManagement && (
        <MachineManagementModal
          isOpen={showMachineManagement}
          onClose={() => setShowMachineManagement(false)}
          machines={machines}
          onMachineRegistered={() => {
            fetchMachines();
          }}
          onSensorsUpdated={() => {
            fetchMachines();
          }}
          currentUserRole={currentRole}
        />
      )}

      {/* Manual Sensor Input & Health Prediction Modal */}
      {showManualPrediction && (
        <ManualPredictionModal
          isOpen={showManualPrediction}
          onClose={() => {
            setShowManualPrediction(false);
            setManualPredictionTarget(null);
          }}
          machines={machines}
          initialMachine={manualPredictionTarget}
          currentRole={currentRole}
          onAppliedToLive={() => {
            fetchMachines();
          }}
        />
      )}

      {/* Administrator Governance Console Modal */}
      {showAdminConsole && isAdmin && (
        <AdminConsoleModal
          isOpen={showAdminConsole}
          onClose={() => setShowAdminConsole(false)}
          authToken={authToken}
          currentUser={currentUser}
          onRefreshData={() => {
            fetchMachines();
            fetchAlerts();
          }}
        />
      )}

    </div>
  );
}
