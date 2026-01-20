
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Github,
  ShieldCheck,
  ShieldAlert,
  ChevronRight,
  AlertCircle,
  Globe,
  Zap,
  Layers,
  List,
  Grid,
  Clock
} from 'lucide-react';
import { ServiceStatus, HourlyStatus, ApiConfig } from './types';
import StatusGrid from './components/StatusGrid';

const SLOW_THRESHOLD = 800;
const WORKER_BASE = 'https://pulse-sync-status.jawandha-moecounter.workers.dev';

const API_LIST: ApiConfig[] = [
  { id: 'moecounter', name: 'MoeCounter API', url: '' },
  { id: 'chatpulse', name: 'ChatPulse', url: '' }
];

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
  const [showLogs, setShowLogs] = useState(false);

  const fetchFromWorker = useCallback(async () => {
    try {
      const statusRes = await fetch(`${WORKER_BASE}/status`);
      if (!statusRes.ok) {
        throw new Error(`Status endpoint responded ${statusRes.status}`);
      }

      const statusData = await statusRes.json();
      const apiStatus = statusData[selectedApi.id];

      if (!apiStatus) {
        throw new Error(`No status found for ${selectedApi.id}`);
      }

      setCurrentStatus(normalizeStatus(apiStatus.status));
      setLastCheck(new Date(apiStatus.timestamp));

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
    } catch (err) {
      console.error('Worker fetch error:', err);
      setNetworkError('Failed to load service telemetry');
      setCurrentStatus(ServiceStatus.DOWN);
    }
  }, [selectedApi.id]);

  useEffect(() => {
    fetchFromWorker();
    const interval = setInterval(fetchFromWorker, 3600000); // 1 hour
    return () => clearInterval(interval);
  }, [fetchFromWorker]);

  const todayHistory = useMemo(() => {
    const now = new Date();
    const dateStr = now.toISOString().split('T')[0];

    // Filter only records that exist for today
    return history
      .filter(h => h.dateStr === dateStr)
      .map(record => ({
        status: record.status,
        label: `Today ${record.hour.toString().padStart(2, '0')}:00`,
        subLabel: `${record.responseTime.toFixed(0)}ms Received`
      }));
  }, [history]);

  const monthlyHistory = useMemo(() => {
    // Group history by dateStr and only include dates that have records
    // Explicitly define the accumulator type to avoid 'unknown' errors
    const grouped = history.reduce<Record<string, HourlyStatus[]>>((acc, curr) => {
      if (!acc[curr.dateStr]) acc[curr.dateStr] = [];
      acc[curr.dateStr].push(curr);
      return acc;
    }, {});

    return Object.entries(grouped)
      .sort(([dateA], [dateB]) => dateA.localeCompare(dateB))
      .map(([dateStr, dayRecords]: [string, HourlyStatus[]]) => {
        let dayStatus = ServiceStatus.OPERATIONAL;
        if (dayRecords.some((r: HourlyStatus) => r.status === ServiceStatus.DOWN)) dayStatus = ServiceStatus.DOWN;
        else if (dayRecords.some((r: HourlyStatus) => r.status === ServiceStatus.SLOW)) dayStatus = ServiceStatus.SLOW;

        const avgLatency =
          dayRecords.reduce((accSum: number, currRec: HourlyStatus) => accSum + currRec.responseTime, 0) / dayRecords.length;

        return {
          status: dayStatus,
          label: dateStr,
          subLabel: `${avgLatency.toFixed(0)}ms Avg Pulse`
        };
      });
  }, [history]);

  const statusStats = useMemo(() => {
    const total = history.length;
    if (total === 0) return { nominal: 0, slow: 0, down: 0 };

    return {
      nominal: ((history.filter(h => h.status === ServiceStatus.OPERATIONAL).length / total) * 100).toFixed(1),
      slow: ((history.filter(h => h.status === ServiceStatus.SLOW).length / total) * 100).toFixed(1),
      down: ((history.filter(h => h.status === ServiceStatus.DOWN).length / total) * 100).toFixed(1)
    };
  }, [history]);

  const getStatusColorClass = () => {
    if (networkError || currentStatus === ServiceStatus.DOWN)
      return 'text-rose-400 border-rose-400/20 bg-rose-400/5';
    if (currentStatus === ServiceStatus.SLOW)
      return 'text-amber-400 border-amber-400/20 bg-amber-400/5';
    if (currentStatus === ServiceStatus.OPERATIONAL)
      return 'text-emerald-400 border-emerald-400/20 bg-emerald-400/5';
    return 'text-gray-400 border-gray-400/20 bg-gray-400/5';
  };

  return (
    <div className="min-h-screen bg-[#070707] text-gray-200 px-4 py-6 sm:px-10 md:px-16 lg:px-24 flex flex-col items-center">
      {/* Header */}
      <header className="w-full max-w-5xl flex justify-between items-center mb-10 md:mb-16">
        <div className="flex items-center gap-3 sm:gap-4">
          <div className="bg-white p-2 sm:p-3 rounded-xl sm:rounded-2xl shadow-xl shrink-0">
            <Globe className="w-5 h-5 sm:w-7 h-7 text-black" />
          </div>
          <div>
            <h1 className="text-lg sm:text-2xl font-black italic uppercase leading-none">
              Pulse <span className="text-gray-600">Sync</span>
            </h1>
            <p className="text-[8px] sm:text-[10px] text-gray-500 font-bold uppercase tracking-[0.2em] mt-1 flex items-center gap-1.5">
              <span className={`w-1.5 h-1.5 rounded-full ${currentStatus === ServiceStatus.OPERATIONAL ? 'bg-emerald-500' : currentStatus === ServiceStatus.SLOW ? 'bg-amber-400' : 'bg-rose-500'} pulse-status`}></span>
              Auto-Audit Every 1H
            </p>
          </div>
        </div>
        <a href="https://github.com/Gurshan07" target="_blank" rel="noopener noreferrer" className="p-2.5 sm:p-3.5 bg-[#111] border border-[#222] rounded-xl sm:rounded-2xl hover:border-gray-500 transition-all">
          <Github className="w-5 h-5 text-gray-400" />
        </a>
      </header>

      <main className="w-full max-w-5xl space-y-8 sm:space-y-12">
        {/* Service Health Block */}
        <section className="bg-[#111] border border-[#222] rounded-[2.5rem] p-6 sm:p-10 md:p-12">
          <div className="flex flex-col gap-10">
            <div className="flex flex-col gap-8">
              <div className="w-full">
                <h2 className="text-gray-600 text-[10px] font-black uppercase tracking-[0.3em] mb-4">Service Health</h2>
                <div className={`text-5xl sm:text-7xl md:text-8xl font-black tracking-tighter leading-none mb-8 break-words ${currentStatus === ServiceStatus.OPERATIONAL ? 'text-emerald-500' : currentStatus === ServiceStatus.SLOW ? 'text-amber-400' : 'text-rose-500'}`}>
                  {currentStatus === ServiceStatus.OPERATIONAL ? 'OPERATIONAL' : currentStatus.toUpperCase()}
                </div>
                <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-[9px] sm:text-[10px] font-black border uppercase tracking-wider ${getStatusColorClass()}`}>
                  {currentStatus === ServiceStatus.OPERATIONAL ? <ShieldCheck className="w-4 h-4" /> : <ShieldAlert className="w-4 h-4" />}
                  {lastCheck ? `Validated : ${lastCheck.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: 'UTC' })} UTC` : 'Calibrating...'}
                </div>
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6 sm:gap-8 bg-white/[0.03] p-6 rounded-3xl border border-white/[0.05]">
                {[
                  { label: 'Latency', val: `${history.length > 0 ? (history.reduce((a, b) => a + b.responseTime, 0) / history.length).toFixed(0) : 0}ms` },
                  { label: 'Uptime', val: `${history.length > 0 ? ((history.filter(d => d.status !== ServiceStatus.DOWN).length / history.length) * 100).toFixed(1) : 100}%`, color: 'text-emerald-500' },
                  {
                    label: 'Peak', val: (() => {
                      const valid = history.filter(h => h.responseTime > 0).map(h => h.responseTime);
                      return valid.length > 0 ? `${Math.min(...valid).toFixed(0)}ms` : '—';
                    })(), color: 'text-blue-400'
                  }
                  , { label: 'History', val: `${history.length}h`, color: 'text-gray-400' }
                ].map((stat, i) => (
                  <div key={i} className="flex flex-col">
                    <p className="text-[9px] text-gray-500 font-bold uppercase tracking-widest mb-1">{stat.label}</p>
                    <p className={`text-xl sm:text-3xl font-black italic tracking-tight ${stat.color || ''}`}>{stat.val}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="h-[1px] bg-gradient-to-r from-transparent via-[#222] to-transparent"></div>

            {/* Endpoint Cluster (API Selection) */}
            <div className="w-full">
              <p className="text-[9px] text-gray-500 uppercase font-black tracking-widest mb-5 flex items-center gap-2">
                <Layers className="w-3.5 h-3.5" /> Endpoint Cluster
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {API_LIST.map((api) => (
                  <button
                    key={api.id}
                    onClick={() => setSelectedApi(api)}
                    className={`text-left p-4 rounded-2xl transition-all flex items-center justify-between group
                      ${selectedApi.id === api.id ? 'bg-white text-black' : 'bg-[#1a1a1a] text-gray-400 hover:text-white hover:bg-[#222]'}
                    `}
                  >
                    <span className="text-[11px] font-black uppercase truncate pr-2">{api.name}</span>
                    {selectedApi.id === api.id ? <Zap className="w-4 h-4 fill-black" /> : <ChevronRight className="w-4 h-4 opacity-30 group-hover:opacity-100 transition-opacity" />}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* History Section */}
        <section className="bg-[#111] border border-[#222] rounded-[2.5rem] p-6 sm:p-10 md:p-12">
          <div className="mb-10 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
            <div>
              <h3 className="text-2xl font-black italic tracking-tight">HISTORY</h3>
              <p className="text-[10px] text-gray-500 mt-1 uppercase font-bold tracking-widest">
                {showLogs ? "Sequential Audit Trails" : "Chronological Pulse Snapshot"}
              </p>
            </div>
            <button
              onClick={() => setShowLogs(!showLogs)}
              className={`flex items-center gap-2 px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all w-full sm:w-auto justify-center
                ${showLogs ? 'bg-white text-black shadow-lg shadow-white/5' : 'bg-white/5 text-gray-400 border border-white/10 hover:bg-white/10'}
              `}
            >
              {showLogs ? <Grid className="w-4 h-4" /> : <List className="w-4 h-4" />}
              {showLogs ? 'METRICS' : 'RECORDS'}
            </button>
          </div>

          <div className="w-full">
            {showLogs ? (
              <div className="space-y-12">
                <div className="p-5 sm:p-8 bg-black/40 rounded-[2rem] border border-[#222]">
                  <StatusGrid data={monthlyHistory} title="Monthly Recorded Aggregate" variant="small" />
                </div>

                <div className="space-y-6">
                  <div className="flex items-center gap-2 px-1">
                    <Clock className="w-4 h-4 text-gray-600" />
                    <h4 className="text-[11px] font-black text-gray-600 uppercase tracking-[0.2em] italic">Hourly Telemetry Log</h4>
                  </div>
                  <div className="w-full max-h-[450px] overflow-y-auto custom-scrollbar pr-3 space-y-3">
                    {history.length === 0 ? (
                      <div className="py-24 flex flex-col items-center justify-center text-gray-700 space-y-5">
                        <Zap className="w-12 h-12 animate-pulse opacity-10" />
                        <p className="text-[11px] font-black uppercase tracking-widest">Waiting for incoming telemetry...</p>
                      </div>
                    ) : (
                      [...history].reverse().map((log, i) => (
                        <div key={i} className="flex items-center justify-between p-4 bg-[#161616] rounded-2xl border border-white/[0.03] hover:border-white/10 transition-colors group">
                          <div className="flex items-center gap-4 sm:gap-6">
                            <div className={`w-2 h-2 rounded-full ${log.status === ServiceStatus.OPERATIONAL ? 'bg-emerald-500' : log.status === ServiceStatus.SLOW ? 'bg-amber-400' : 'bg-rose-500'}`}></div>
                            <div className="mono text-[10px] sm:text-[11px]">
                              <span className="text-gray-600 font-medium">{log.dateStr}</span>
                              <span className="text-gray-400 font-black ml-4">{log.hour.toString().padStart(2, '0')}:00</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-5 sm:gap-8">
                            <span className={`text-[9px] font-black uppercase px-3 py-1 rounded-full border ${log.status === ServiceStatus.OPERATIONAL ? 'text-emerald-500 border-emerald-500/10' : log.status === ServiceStatus.SLOW ? 'text-amber-400 border-amber-400/10' : 'text-rose-500 border-rose-500/10'}`}>
                              {log.status === ServiceStatus.OPERATIONAL ? 'NOMINAL' : log.status.toUpperCase()}
                            </span>
                            <span className="mono text-[10px] sm:text-[11px] font-black text-gray-500 group-hover:text-gray-200 transition-colors">{log.responseTime.toFixed(0)}ms</span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="py-2 sm:py-6">
                <StatusGrid data={todayHistory} title="Daily Service Pulse" />
              </div>
            )}
          </div>

          {networkError && (
            <div className="mt-10 p-6 bg-rose-500/5 border border-rose-500/10 rounded-2xl flex items-center gap-4">
              <AlertCircle className="w-6 h-6 text-rose-500 shrink-0" />
              <p className="text-[11px] text-rose-400/90 font-black uppercase tracking-wide leading-relaxed">{networkError}</p>
            </div>
          )}
        </section>

        {/* Status Legends Section */}
        <section className="bg-[#111] border border-[#222] rounded-[2.5rem] p-8 sm:p-12">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-8">
            <div className="max-w-xs">
              <h3 className="text-[11px] font-black text-gray-500 uppercase tracking-[0.4em] mb-4">Pulse Classifiers</h3>
              <p className="text-xs text-gray-600 font-medium leading-relaxed">Automatic classification based on millisecond response thresholds and HTTP validity checks.</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 w-full md:w-auto">
              {[
                { label: 'Nominal', sub: `< ${SLOW_THRESHOLD}ms`, p: statusStats.nominal, color: 'emerald' },
                { label: 'Delayed', sub: `> ${SLOW_THRESHOLD}ms`, p: statusStats.slow, color: 'amber' },
                { label: 'Outage', sub: 'Failed Check', p: statusStats.down, color: 'rose' }
              ].map((item, i) => (
                <div key={i} className="flex flex-col p-5 bg-white/[0.02] rounded-3xl border border-white/[0.05] min-w-[160px]">
                  <span className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1">
                    <div className={`w-2 h-2 rounded-full bg-${item.color === 'emerald' ? 'emerald-500' : item.color === 'amber' ? 'amber-400' : 'rose-500'}`}></div> {item.label}
                  </span>
                  <span className="text-[9px] font-bold text-gray-600 uppercase italic mb-4">{item.sub}</span>
                  <span className={`text-3xl font-black ${item.color === 'emerald' ? 'text-emerald-500' : item.color === 'amber' ? 'text-amber-400' : 'text-rose-500'}`}>{item.p}%</span>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-10 pt-8 border-t border-[#222] flex flex-col sm:flex-row justify-between items-center gap-4">
            <div className="text-center sm:text-left">
              <p className="text-[9px] font-black text-gray-700 uppercase tracking-[0.3em]">Aggregate Reliability Score</p>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-4xl font-black italic text-white">
                  {history.length > 0 ? (history.filter(h => h.status === ServiceStatus.OPERATIONAL).length / history.length * 100).toFixed(0) : 100}
                </span>
                <span className="text-xs text-gray-600 font-bold uppercase tracking-widest">/ 100 Precision</span>
              </div>
            </div>
            <div className="px-6 py-2 border border-[#222] rounded-full bg-black/40">
              <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest italic">{history.length} CHECKPOINT SNAPSHOTS</p>
            </div>
          </div>
        </section>
      </main>

      <footer className="mt-24 pb-16 pt-12 border-t border-[#1a1a1a] w-full text-center max-w-5xl">
        <p className="text-[10px] text-gray-800 font-black uppercase tracking-[0.8em]">SYSTEM PULSE MONITOR v2.9 — RECOVERY TARGET: 100%</p>
      </footer>
    </div>
  );
};

export default App;
