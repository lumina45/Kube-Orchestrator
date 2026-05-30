import React from 'react';

interface MetricCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ReactNode;
  trend?: {
    value: string;
    isPositive: boolean;
  };
}

export default function MetricCard({ title, value, subtitle, icon, trend }: MetricCardProps) {
  return (
    <div className="bg-slate-900/40 backdrop-blur-md rounded-sm p-5 border border-slate-800 shadow-lg flex items-start justify-between min-w-[200px]">
      <div className="flex flex-col">
        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">{title}</span>
        <span className="text-3xl font-bold font-display text-white tracking-tight">{value}</span>
        {subtitle && <span className="text-xs text-slate-400 mt-1">{subtitle}</span>}
        {trend && (
          <div className="flex items-center gap-1.5 mt-2">
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-sm uppercase tracking-wider ${
              trend.isPositive ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
            }`}>
              {trend.value}
            </span>
            <span className="text-[10px] text-slate-500 font-mono">vs last hour</span>
          </div>
        )}
      </div>
      <div className="p-3 bg-slate-850 rounded-sm text-cyan-400 border border-slate-800">
        {icon}
      </div>
    </div>
  );
}
