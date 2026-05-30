import { useState } from 'react';
import { ClusterEvent } from '../types';
import { Terminal, Shield, Eye, Trash2, SlidersHorizontal, Layers, RefreshCcw } from 'lucide-react';

interface TerminalLogsProps {
  logs: ClusterEvent[];
  onClearLogs: () => void;
}

export default function TerminalLogs({ logs, onClearLogs }: TerminalLogsProps) {
  const [componentFilter, setComponentFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');

  const getComponentBadgeColor = (comp: string) => {
    switch (comp) {
      case 'Scheduler': return 'text-sky-400 bg-sky-950/40 border-sky-900/30';
      case 'Rollout': return 'text-violet-400 bg-violet-950/40 border-violet-900/30';
      case 'SelfHealing': return 'text-amber-400 bg-amber-950/40 border-amber-900/30';
      case 'Storage': return 'text-amber-500 bg-amber-950/30 border-amber-900/20';
      case 'LoadBalancer': return 'text-emerald-400 bg-emerald-950/40 border-emerald-900/30';
      default: return 'text-teal-400 bg-teal-950/40 border-teal-900/30';
    }
  };

  const getLogColorByLevel = (level: string) => {
    switch (level) {
      case 'success': return 'text-emerald-400';
      case 'warning': return 'text-amber-400';
      case 'danger': return 'text-rose-400 font-semibold';
      default: return 'text-slate-300';
    }
  };

  const filteredLogs = logs.filter(log => {
    if (componentFilter !== 'all' && log.component !== componentFilter) return false;
    if (typeFilter !== 'all' && log.type !== typeFilter) return false;
    return true;
  });

  return (
    <div className="bg-slate-950 border border-slate-800 rounded-sm shadow-xl overflow-hidden font-mono text-xs flex flex-col h-[350px]">
      
      {/* Log Header Controls */}
      <div className="bg-slate-900 border-b border-slate-800 px-4 py-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="flex gap-1.5 mr-1">
            <span className="w-3 h-3 rounded-full bg-rose-500/80"></span>
            <span className="w-3 h-3 rounded-full bg-amber-500/80"></span>
            <span className="w-3 h-3 rounded-full bg-emerald-500/80"></span>
          </div>
          <span className="text-slate-400 font-bold flex items-center gap-1.5">
            <Terminal className="w-4 h-4 text-emerald-400" /> KubeLite Cluster Event Daemon
          </span>
          <span className="text-[10px] bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded font-bold">{filteredLogs.length} live entries</span>
        </div>

        {/* Filter Controls */}
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
            <SlidersHorizontal className="w-3.5 h-3.5" /> Filter:
          </div>

          <select
            value={componentFilter}
            onChange={(e) => setComponentFilter(e.target.value)}
            className="bg-slate-950 border border-slate-800 text-slate-300 text-[10px] rounded px-2 py-1 focus:outline-none"
          >
            <option value="all">Every Component</option>
            <option value="Scheduler">Scheduler Daemon</option>
            <option value="Rollout">Rollout System</option>
            <option value="SelfHealing">SelfHealing Agent</option>
            <option value="Storage">CSI Storage Driver</option>
            <option value="LoadBalancer">Service Ingress</option>
            <option value="Secrets">Secret Engine</option>
          </select>

          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="bg-slate-950 border border-slate-800 text-slate-300 text-[10px] rounded px-2 py-1 focus:outline-none"
          >
            <option value="all">All Severities</option>
            <option value="info">Info</option>
            <option value="success">Success</option>
            <option value="warning">Warning</option>
            <option value="danger">Critical Faults</option>
          </select>

          <button
            onClick={onClearLogs}
            className="text-slate-500 hover:text-rose-400 p-1 rounded transition-colors cursor-pointer"
            title="Clean cluster streams"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Logs body */}
      <div className="p-4 flex-1 overflow-y-auto space-y-2 bg-slate-950/90 leading-relaxed scrollbar-thin">
        {filteredLogs.length === 0 ? (
          <div className="h-full flex flex-col justify-center items-center text-slate-600 gap-2">
            <Terminal className="w-8 h-8 stroke-1" />
            <span>No events caught in filter parameters.</span>
          </div>
        ) : (
          filteredLogs.slice().reverse().map((log) => (
            <div key={log.id} className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border-b border-slate-900/40 pb-2">
              <div className="flex items-start gap-2.5 min-w-0">
                <span className="text-[10px] text-slate-600 shrink-0 self-center">
                  {new Date(log.timestamp).toLocaleTimeString()}
                </span>
                <span className={`px-1.5 py-0.5 rounded border text-[9px] font-bold shrink-0 self-center ${getComponentBadgeColor(log.component)}`}>
                  {log.component.toUpperCase()}
                </span>
                <p className={`${getLogColorByLevel(log.type)} text-[11px] truncate mt-0.5 sm:mt-0 font-medium`}>
                  {log.message}
                </p>
              </div>

              <span className="text-[10px] uppercase font-bold text-slate-700 shrink-0 select-none">
                [{log.type}]
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
