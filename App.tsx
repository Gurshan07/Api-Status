import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Github,
  ShieldCheck,
  ShieldAlert,
  AlertCircle,
  HelpCircle,
  Zap,
  Layers,
  Activity,
  Server
} from 'lucide-react';
import { ServiceStatus, HourlyStatus, ApiConfig } from './types';

// --- Inline Constants & Types ---
const SLOW_THRESHOLD = 800;
const WORKER_BASE = 'https://pulse-sync-status.jawandha-moecounter.workers.dev';

const API_LIST: ApiConfig[] = [
  { id: 'moecounter', name: 'MoeCounter API', url: '' },
  { id: 'chatpulse', name: 'ChatPulse', url: '' }
];

interface DayRecord {
  status: ServiceStatus;
  label: string;
  subLabel: string;
  date: string;
}

// --- Helper Component: StatusBadge ---
interface StatusBadgeProps {
  status: ServiceStatus;
  size?: 'sm' | 'md' | 'lg';
  showIcon?: boolean;
}

const StatusBadge: React.FC<StatusBadgeProps> = ({ status, size = 'md', showIcon = true }) => {
  const getStyles = () => {
    switch (status) {
      case ServiceStatus.OPERATIONAL:
        return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 shadow-[0_0_15px_rgba(52,211,153,0.15)]';
      case ServiceStatus.SLOW:
        return 'bg-amber-500/10 text-amber-400 border-amber-500/20 shadow-[0_0_15px_rgba(251,191,36,0.15)]';
      case ServiceStatus.DOWN:
        return 'bg-rose-500/10 text-rose-400 border-rose-500/20 shadow-[0_0_15px_rgba(244,63,94,0.15)]';
      default:
        return 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20';
    }
  };

  const getIcon = () => {
    switch (status) {
      case ServiceStatus.OPERATIONAL: return <ShieldCheck className={size === 'lg' ? 'w-5 h-5' : 'w-3.5 h-3.5'} />;
      case ServiceStatus.SLOW: return <AlertCircle className={size === 'lg' ? 'w-5 h-5' : 'w-3.5 h-3.5'} />;
      case ServiceStatus.DOWN: return <ShieldAlert className={size === 'lg' ? 'w-5 h-5' : 'w-3.5 h-3.5'} />;
      default: return <HelpCircle className={size === 'lg' ? 'w-5 h-5' : 'w-3.5 h-3.5'} />;
    }
  };

  const sizeClasses = {
    sm: 'px-2 py-0.5 text-[10px]',
    md: 'px-3 py-1 text-xs',
    lg: 'px-4 py-1.5 text-sm'
  };

  const getLabel = () => {
    switch(status) {
      case ServiceStatus.OPERATIONAL: return 'Healthy';
      case ServiceStatus.SLOW: return 'Busy';
      case ServiceStatus.DOWN: return 'Down';
      default: return status;
    }
  }

  return (
    <div className={`inline-flex items-center gap-2 rounded-full border font-bold uppercase tracking-wider backdrop-blur-md transition-all duration-300 ${getStyles()} ${sizeClasses[size]}`}>
      {showIcon && getIcon()}
      <span>{getLabel()}</span>
    </div>
  );
};

// --- Helper Component: StatusGrid ---
interface StatusGridProps {
  data: DayRecord[];
  title: string;
  variant?: 'small' | 'large';
}

const StatusGrid: React.FC<StatusGridProps> = ({ data, title, variant = 'large' }) => {
  if (!data || data.length === 0) {
    return (
      <div className="w-full">
        <h4 className="text-[11px] font-bold text-zinc-500 uppercase tracking-widest mb-4">{title}</h4>
        <div className="flex flex-wrap gap-1.5 opacity-20 animate-pulse">
          {Array.from({ length: 30 }).map((_, i) => (
            <div key={i} className={`bg-zinc-700 ${variant === 'large' ? 'w-3 h-3 sm:w-4 sm:h-4 rounded-full' : 'w-2 h-8 rounded'}`} />
          ))}
        </div>
      </div>
    );
  }

  const getColor = (status: ServiceStatus) => {
    switch (status) {
      case ServiceStatus.OPERATIONAL: return 'bg-emerald-500 hover:bg-emerald-400 shadow-[0_0_10px_rgba(16,185,129,0.3)]';
      case ServiceStatus.SLOW: return 'bg-amber-400 hover:bg-amber-300 shadow-[0_0_10px_rgba(251,191,36,0.3)]';
      case ServiceStatus.DOWN: return 'bg-rose-500 hover:bg-rose-400 shadow-[0_0_10px_rgba(244,63,94,0.3)]';
      default: return 'bg-zinc-800 hover:bg-zinc-700';
    }
  };

  return (
    <div className="w-full">
      <div className="flex justify-between items-end mb-4">
        <h4 className="text-[11px] font-bold text-zinc-500 uppercase tracking-widest">{title}</h4>
        {variant === 'large' && (
          <div className="flex items-center gap-2 text-[10px] text-zinc-600 font-mono">
             <span>Less</span>
             <div className="flex gap-1">
               <div className="w-2.5 h-2.5 rounded-full bg-zinc-800"></div>
               <div className="w-2.5 h-2.5 rounded-full bg-emerald-900"></div>
               <div className="w-2.5 h-2.5 rounded-full bg-emerald-500"></div>
             </div>
             <span>More</span>
          </div>
        )}
      </div>

      <div className="w-full flex flex-wrap gap-1.5 sm:gap-2">
        {data.map((item, idx) => (
          <div key={idx} className="group relative">
            <div 
              className={`
                ${variant === 'small' ? 'w-2 h-8 sm:w-3 sm:h-10 rounded-sm' : 'w-3 h-3 sm:w-4 sm:h-4 rounded-full'} 
                transition-all duration-300 cursor-default
                ${getColor(item.status)}
              `}
            />
            {/* Tooltip */}
            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-max hidden group-hover:block z-50">
              <div className="bg-zinc-900 text-zinc-200 text-[10px] font-mono px-3 py-2 rounded-lg border border-zinc-800 shadow-xl whitespace-nowrap">
                <div className="font-bold text-white mb-0.5">{item.label}</div>
                <div className="text-zinc-400">{item.subLabel}</div>
                <div className={`mt-1 text-[9px] uppercase tracking-wider font-bold ${
                  item.status === ServiceStatus.OPERATIONAL ? 'text-emerald-400' : 
                  item.status === ServiceStatus.SLOW ? 'text-amber-400' : 'text-rose-400'
                }`}>
                  {item.status === ServiceStatus.OPERATIONAL ? 'HEALTHY' : item.status === ServiceStatus.SLOW ? 'BUSY' : item.status.toUpperCase()}
                </div>
              </div>
              {/* Arrow */}
              <div className="w-2 h-2 bg-zinc-900 border-r border-b border-zinc-800 transform rotate-45 absolute -bottom-1 left-1/2 -translate-x-1/2"></div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// --- Helper Component: LatencyChart ---
interface LatencyChartProps {
  history: HourlyStatus[];
}

const LatencyChart: React.FC<LatencyChartProps> = ({ history }) => {
  const data = useMemo(() => {
    // Get last 48 items
    return [...history].slice(-48);
  }, [history]);

  const maxLatency = useMemo(() => {
    if (data.length === 0) return 1000;
    // Add 20% buffer to max for visual headroom
    return Math.max(...data.map(d => d.responseTime)) * 1.2;
  }, [data]);

  if (data.length === 0) {
    return (
        <div className="h-32 flex items-center justify-center border border-zinc-800 rounded-xl bg-zinc-900/30 text-xs text-zinc-500 font-mono uppercase tracking-widest">
            No Telemetry Data Available
        </div>
    );
  }

  return (
    <div className="w-full">
      <div className="flex justify-between items-end mb-6">
        <h4 className="text-[11px] font-bold text-zinc-500 uppercase tracking-widest">Response Time Trend (48H)</h4>
        <div className="flex items-center gap-4 text-[10px] text-zinc-600 font-mono uppercase">
           <div className="flex items-center gap-1.5">
             <div className="w-2 h-2 bg-emerald-500/50 rounded-sm"></div>
             <span>&lt;{SLOW_THRESHOLD}ms</span>
           </div>
           <div className="flex items-center gap-1.5">
             <div className="w-2 h-2 bg-amber-500/50 rounded-sm"></div>
             <span>&gt;{SLOW_THRESHOLD}ms</span>
           </div>
        </div>
      </div>
      
      <div className="h-40 flex items-end gap-[2px] sm:gap-1 pt-6 pb-0 relative border-b border-zinc-800/50">
        {/* Background Guide Lines */}
        <div className="absolute inset-0 pointer-events-none flex flex-col justify-between opacity-10">
            <div className="border-t border-zinc-500 w-full h-0"></div>
            <div className="border-t border-zinc-500 w-full h-0"></div>
            <div className="border-t border-zinc-500 w-full h-0"></div>
        </div>

        {data.map((item, i) => {
            const heightPercentage = Math.max(4, (item.responseTime / maxLatency) * 100);
            const isSlow = item.responseTime > SLOW_THRESHOLD;
            const isDown = item.status === ServiceStatus.DOWN;
            
            let barColor = 'bg-emerald-500/40 hover:bg-emerald-400 shadow-[0_0_10px_rgba(16,185,129,0.1)]';
            if (isSlow) barColor = 'bg-amber-500/40 hover:bg-amber-400 shadow-[0_0_10px_rgba(245,158,11,0.1)]';
            if (isDown) barColor = 'bg-rose-500/40 hover:bg-rose-400 shadow-[0_0_10px_rgba(244,63,94,0.1)]';

            return (
                <div key={i} className="flex-1 flex flex-col justify-end group relative h-full">
                    <div 
                        className={`w-full rounded-t-sm transition-all duration-300 ${barColor}`}
                        style={{ height: `${heightPercentage}%` }}
                    />
                    
                    {/* Tooltip */}
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block z-50">
                        <div className="bg-zinc-900/90 backdrop-blur border border-zinc-700 text-zinc-200 text-[10px] font-mono px-3 py-2 rounded-lg shadow-2xl whitespace-nowrap">
                            <div className="font-bold text-white mb-1">{item.dateStr} <span className="text-zinc-500">at</span> {item.hour}:00</div>
                            <div className="flex justify-between gap-4">
                                <span className="text-zinc-400">Latency</span>
                                <span className={`font-bold ${isSlow ? 'text-amber-400' : 'text-emerald-400'}`}>{item.responseTime}ms</span>
                            </div>
                        </div>
                        {/* Arrow */}
                        <div className="w-2 h-2 bg-zinc-700 border-r border-b border-zinc-600 transform rotate-45 absolute -bottom-1 left-1/2 -translate-x-1/2"></div>
                    </div>
                </div>
            );
        })}
      </div>
      <div className="flex justify-between mt-2 text-[9px] text-zinc-600 font-mono uppercase tracking-widest">
          <span>Oldest</span>
          <span>Latest</span>
      </div>
    </div>
  );
};


// --- Main Application ---
const normalizeStatus = (status: any): ServiceStatus => {
  const statusStr = String(status).toLowerCase();
  if (statusStr === 'ok' || statusStr === 'operational') return ServiceStatus.OPERATIONAL;
  if (statusStr === 'slow') return ServiceStatus.SLOW;
  if (statusStr === 'down') return ServiceStatus.DOWN;
  return ServiceStatus.UNKNOWN;
};

const App: React.FC = () => {
  const [selectedApi, setSelectedApi] = useState<ApiConfig>(API_LIST[0]);
  const [currentStatus, setCurrentStatus] = useState<ServiceStatus>(ServiceStatus.UNKNOWN);
  const [history, setHistory] = useState<HourlyStatus[]>([]);
  const [lastCheck, setLastCheck] = useState<Date | null>(null);
  const [networkError, setNetworkError] = useState<string | null>(null);

  // --- Mouse Tracking Effect ---
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      document.documentElement.style.setProperty('--mouse-x', `${e.clientX}px`);
      document.documentElement.style.setProperty('--mouse-y', `${e.clientY}px`);
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  const fetchFromWorker = useCallback(async () => {
    try {
      const statusRes = await fetch(`${WORKER_BASE}/status`);
      if (!statusRes.ok) throw new Error(`Status check failed: ${statusRes.status}`);
      
      const statusData = await statusRes.json();
      const apiStatus = statusData[selectedApi.id];

      if (!apiStatus) throw new Error(`Status not found for ${selectedApi.id}`);

      setCurrentStatus(normalizeStatus(apiStatus.status));
      setLastCheck(new Date(apiStatus.timestamp));

      // Fetch History
      const historyRes = await fetch(`${WORKER_BASE}/history?id=${selectedApi.id}`);
      if (historyRes.ok) {
        const historyData = await historyRes.json();
        if (Array.isArray(historyData)) {
          const mapped: HourlyStatus[] = historyData.map((e: any) => {
            const d = new Date(e.timestamp);
            return {
              hour: d.getUTCHours(),
              dateStr: d.toISOString().split('T')[0],
              status: normalizeStatus(e.status),
              lastChecked: e.timestamp,
              responseTime: typeof e.responseTime === 'number' ? e.responseTime : 0
            };
          });
          mapped.sort((a, b) => a.lastChecked - b.lastChecked);
          setHistory(mapped);
        }
      }
      setNetworkError(null);
    } catch (err: any) {
      console.error('Fetch error:', err);
      setNetworkError(err.message || 'Failed to connect to telemetry worker');
      setCurrentStatus(ServiceStatus.UNKNOWN);
    }
  }, [selectedApi.id]);

  useEffect(() => {
    fetchFromWorker();
    const interval = setInterval(fetchFromWorker, 3600000); // 1 hour
    return () => clearInterval(interval);
  }, [fetchFromWorker]);

  // --- Derived State Calculations ---

  const todayHistory = useMemo<DayRecord[]>(() => {
    const now = new Date();
    const dateStr = now.toISOString().split('T')[0];
    return history
      .filter(h => h.dateStr === dateStr)
      .map(record => ({
        status: record.status,
        label: `Today ${record.hour.toString().padStart(2, '0')}:00`,
        subLabel: `${record.responseTime.toFixed(0)}ms`,
        date: dateStr
      }));
  }, [history]);

  const monthlyHistory = useMemo<DayRecord[]>(() => {
    const grouped = history.reduce<Record<string, HourlyStatus[]>>((acc, curr) => {
      if (!acc[curr.dateStr]) acc[curr.dateStr] = [];
      acc[curr.dateStr].push(curr);
      return acc;
    }, {});

    return Object.entries(grouped)
      .sort(([dateA], [dateB]) => dateA.localeCompare(dateB))
      .map(([dateStr, data]) => {
        const dayRecords = data as HourlyStatus[];
        let dayStatus = ServiceStatus.OPERATIONAL;
        if (dayRecords.some(r => r.status === ServiceStatus.DOWN)) dayStatus = ServiceStatus.DOWN;
        else if (dayRecords.some(r => r.status === ServiceStatus.SLOW)) dayStatus = ServiceStatus.SLOW;

        const avgLatency = dayRecords.reduce((acc, curr) => acc + curr.responseTime, 0) / dayRecords.length;

        return {
          status: dayStatus,
          label: dateStr,
          subLabel: `${avgLatency.toFixed(0)}ms avg`,
          date: dateStr
        };
      });
  }, [history]);

  const stats = useMemo(() => {
    const total = history.length;
    if (total === 0) return { nominal: 0, slow: 0, down: 0, avgLatency: 0, uptime: 100 };
    
    const nominal = history.filter(h => h.status === ServiceStatus.OPERATIONAL).length;
    const slow = history.filter(h => h.status === ServiceStatus.SLOW).length;
    const down = history.filter(h => h.status === ServiceStatus.DOWN).length;
    const avgLatency = history.reduce((a, b) => a + b.responseTime, 0) / total;

    return {
      nominal: ((nominal / total) * 100).toFixed(1),
      slow: ((slow / total) * 100).toFixed(1),
      down: ((down / total) * 100).toFixed(1),
      avgLatency: avgLatency.toFixed(0),
      uptime: (((total - down) / total) * 100).toFixed(2)
    };
  }, [history]);

  // --- UI Helpers ---

  const getGradient = () => {
    switch (currentStatus) {
      case ServiceStatus.OPERATIONAL: return 'from-emerald-500/20 via-zinc-900/0 to-zinc-900/0';
      case ServiceStatus.SLOW: return 'from-amber-500/20 via-zinc-900/0 to-zinc-900/0';
      case ServiceStatus.DOWN: return 'from-rose-500/20 via-zinc-900/0 to-zinc-900/0';
      default: return 'from-zinc-500/10 via-zinc-900/0 to-zinc-900/0';
    }
  };

  const getStatusLabel = (status: ServiceStatus) => {
    if (status === ServiceStatus.OPERATIONAL) return 'HEALTHY';
    if (status === ServiceStatus.SLOW) return 'BUSY';
    if (status === ServiceStatus.UNKNOWN) return 'CONNECTING';
    return status.toUpperCase();
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 font-sans selection:bg-zinc-700 selection:text-white relative overflow-hidden select-none">
      
      {/* --- Background Layers --- */}
      
      {/* 1. Base Gradient Ambience (Status based) */}
      <div className={`fixed inset-0 pointer-events-none bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] ${getGradient()} opacity-40 transition-colors duration-1000 ease-in-out`}></div>
      
      {/* 2. Grainy Noise Overlay */}
      <div className="fixed inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 pointer-events-none brightness-100 contrast-150 mix-blend-overlay"></div>
      
      {/* 3. Mouse Follower Spotlight (New) */}
      <div 
        className="fixed inset-0 pointer-events-none z-0"
        style={{
          background: `radial-gradient(600px circle at var(--mouse-x, 50%) var(--mouse-y, 50%), rgba(255, 255, 255, 0.06), transparent 40%)`
        }}
      ></div>

      <div className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        
        {/* Header */}
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-16">
          <div className="flex items-center gap-4">
            <div className="relative group">
               <div className="absolute -inset-0.5 bg-gradient-to-r from-zinc-700 to-zinc-800 rounded-2xl blur opacity-30 group-hover:opacity-75 transition duration-500"></div>
               <div className="relative bg-zinc-900 border border-zinc-800 p-3 rounded-xl shadow-2xl">
                 <Activity className="w-6 h-6 text-zinc-100" />
               </div>
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
                PULSE SYNC <span className="text-zinc-600 font-thin">/</span> MONITOR
              </h1>
              <div className="flex items-center gap-2 mt-1">
                <span className="relative flex h-2 w-2">
                  <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${currentStatus === ServiceStatus.OPERATIONAL ? 'bg-emerald-400' : 'bg-rose-400'}`}></span>
                  <span className={`relative inline-flex rounded-full h-2 w-2 ${currentStatus === ServiceStatus.OPERATIONAL ? 'bg-emerald-500' : currentStatus === ServiceStatus.DOWN ? 'bg-rose-500' : 'bg-zinc-500'}`}></span>
                </span>
                <p className="text-[10px] font-mono uppercase tracking-[0.2em] text-zinc-500">
                  System Auditing Active
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
             <a 
               href="https://github.com/Gurshan07" 
               target="_blank" 
               rel="noopener noreferrer" 
               className="flex items-center gap-2 px-4 py-2.5 bg-zinc-100 hover:bg-white text-zinc-950 rounded-lg text-xs font-bold uppercase tracking-wider transition-colors shadow-[0_0_20px_rgba(255,255,255,0.1)]"
             >
               <Github className="w-4 h-4" />
               <span>Source</span>
             </a>
          </div>
        </header>

        {/* Main Dashboard Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          
          {/* Status Hero Card */}
          <div className="lg:col-span-2 relative overflow-hidden rounded-[2rem] border border-zinc-800 bg-zinc-900/40 backdrop-blur-xl p-8 sm:p-10 flex flex-col justify-between min-h-[300px] group">
            {/* Glossy gradient overlay */}
            <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none"></div>
            
            <div className="relative z-10">
              <div className="flex justify-between items-start mb-8">
                <StatusBadge status={currentStatus} size="lg" />
                <div className="text-right">
                   <p className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold mb-1">Last Validated</p>
                   <p className="font-mono text-xs text-zinc-300">
                     {lastCheck ? lastCheck.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit', second:'2-digit'}) : '--:--:--'} UTC
                   </p>
                </div>
              </div>

              <div>
                <p className="text-sm font-medium text-zinc-500 uppercase tracking-widest mb-2">Current Status</p>
                <h2 className={`text-5xl sm:text-7xl font-black tracking-tighter ${
                  currentStatus === ServiceStatus.OPERATIONAL ? 'text-emerald-500' :
                  currentStatus === ServiceStatus.SLOW ? 'text-amber-400' :
                  currentStatus === ServiceStatus.DOWN ? 'text-rose-500' : 'text-zinc-600'
                }`}>
                  {getStatusLabel(currentStatus)}
                </h2>
              </div>
            </div>
            
            {/* Quick Metrics */}
            <div className="relative z-10 grid grid-cols-3 gap-4 mt-8 pt-8 border-t border-zinc-800/50">
               <div>
                 <p className="text-[10px] text-zinc-500 uppercase font-bold mb-1">Latency</p>
                 <p className="text-xl font-mono text-zinc-200">{stats.avgLatency}ms</p>
               </div>
               <div>
                 <p className="text-[10px] text-zinc-500 uppercase font-bold mb-1">Uptime</p>
                 <p className="text-xl font-mono text-emerald-400">{stats.uptime}%</p>
               </div>
               <div>
                 <p className="text-[10px] text-zinc-500 uppercase font-bold mb-1">Checkpoints</p>
                 <p className="text-xl font-mono text-blue-400">{history.length}</p>
               </div>
            </div>
          </div>

          {/* API Selector & Controls */}
          <div className="space-y-6">
             {/* API Selector */}
             <div className="rounded-[2rem] border border-zinc-800 bg-zinc-900/40 backdrop-blur-xl p-6">
                <div className="flex items-center gap-2 mb-6">
                  <Layers className="w-4 h-4 text-zinc-500" />
                  <h3 className="text-xs font-bold uppercase tracking-widest text-zinc-400">Endpoint Cluster</h3>
                </div>
                <div className="space-y-2">
                  {API_LIST.map((api) => (
                    <button
                      key={api.id}
                      onClick={() => setSelectedApi(api)}
                      className={`w-full flex items-center justify-between p-4 rounded-xl text-left transition-all duration-300 border ${
                        selectedApi.id === api.id 
                        ? 'bg-zinc-100 border-zinc-100 text-zinc-900 shadow-lg shadow-zinc-900/20' 
                        : 'bg-zinc-900/50 border-zinc-800 text-zinc-400 hover:border-zinc-700 hover:bg-zinc-800/50'
                      }`}
                    >
                      <div>
                        <span className="block text-xs font-black uppercase tracking-wide">{api.name}</span>
                        <span className="block text-[10px] font-mono opacity-60 mt-0.5">ID: {api.id}</span>
                      </div>
                      {selectedApi.id === api.id && <Zap className="w-4 h-4 fill-zinc-900" />}
                    </button>
                  ))}
                </div>
             </div>

             {/* Stats Summary */}
             <div className="rounded-[2rem] border border-zinc-800 bg-zinc-900/40 backdrop-blur-xl p-6">
               <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xs font-bold uppercase tracking-widest text-zinc-400">Health Index</h3>
                  <div className="text-[10px] px-2 py-0.5 rounded bg-zinc-800 text-zinc-400 border border-zinc-700">24H</div>
               </div>
               <div className="space-y-3">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-zinc-500 font-medium">Healthy</span>
                    <span className="font-mono text-emerald-500">{stats.nominal}%</span>
                  </div>
                  <div className="w-full h-1 bg-zinc-800 rounded-full overflow-hidden">
                    <div className="h-full bg-emerald-500" style={{ width: `${stats.nominal}%` }}></div>
                  </div>

                  <div className="flex justify-between items-center text-xs pt-1">
                    <span className="text-zinc-500 font-medium">Busy</span>
                    <span className="font-mono text-amber-500">{stats.slow}%</span>
                  </div>
                  <div className="w-full h-1 bg-zinc-800 rounded-full overflow-hidden">
                    <div className="h-full bg-amber-500" style={{ width: `${stats.slow}%` }}></div>
                  </div>
               </div>
             </div>
          </div>
        </div>

        {/* System Telemetry Section */}
        <section className="rounded-[2rem] border border-zinc-800 bg-zinc-900/40 backdrop-blur-xl overflow-hidden">
          <div className="p-6 sm:p-8 border-b border-zinc-800/50">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <Server className="w-5 h-5 text-zinc-500" />
              System Telemetry
            </h3>
            <p className="text-xs text-zinc-500 mt-1">Real-time availability zones and latency visualization.</p>
          </div>

          <div className="p-6 sm:p-8">
            {networkError ? (
              <div className="p-8 rounded-xl bg-rose-500/5 border border-rose-500/10 flex flex-col items-center justify-center text-center">
                <div className="p-3 bg-rose-500/10 rounded-full mb-3">
                  <Activity className="w-6 h-6 text-rose-500" />
                </div>
                <h4 className="text-rose-500 font-bold mb-1">Telemetry Error</h4>
                <p className="text-xs text-rose-400/70">{networkError}</p>
              </div>
            ) : (
              <div className="space-y-12">
                 {/* Latency Chart now at the top */}
                 <div className="w-full">
                    <LatencyChart history={history} />
                 </div>

                 {/* Grids below, 30-day (smaller dots) and 24-hour pulse side-by-side */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                   <div className="space-y-4">
                      <div className="h-px bg-zinc-800/50 mb-8 lg:hidden"></div>
                      <StatusGrid data={monthlyHistory} title="30-Day Availability" />
                   </div>
                   
                   <div className="space-y-4">
                      <div className="h-px bg-zinc-800/50 mb-8 lg:hidden"></div>
                      <StatusGrid data={todayHistory} title="24-Hour Pulse" variant="small" />
                   </div>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* Footer Legend */}
        <div className="mt-8 flex flex-wrap justify-center gap-6 text-[10px] uppercase font-bold tracking-widest text-zinc-600">
           <div className="flex items-center gap-2">
             <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]"></span>
             Healthy &lt; {SLOW_THRESHOLD}ms
           </div>
           <div className="flex items-center gap-2">
             <span className="w-2 h-2 rounded-full bg-amber-500 shadow-[0_0_8px_rgba(251,191,36,0.5)]"></span>
             Busy &gt; {SLOW_THRESHOLD}ms
           </div>
           <div className="flex items-center gap-2">
             <span className="w-2 h-2 rounded-full bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.5)]"></span>
             Outage / Error
           </div>
        </div>
      </div>
    </div>
  );
};

export default App;