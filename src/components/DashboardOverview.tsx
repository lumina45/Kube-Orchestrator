import { ClusterNode, Deployment, PodReplica, StorageVolume, NetworkService, ConfigurationItem } from '../types';
import MetricCard from './MetricCard';
import ClusterMap from './ClusterMap';
import { Server, Activity, HardDrive, ShieldCheck, Globe, Cpu, Layers } from 'lucide-react';
import { motion } from 'motion/react';

interface DashboardOverviewProps {
  nodes: ClusterNode[];
  deployments: Deployment[];
  pods: PodReplica[];
  volumes: StorageVolume[];
  services: NetworkService[];
  configs: ConfigurationItem[];
  deploymentsMap: Record<string, string>;
  onKillPod: (podId: string) => void;
}

export default function DashboardOverview({
  nodes,
  deployments,
  pods,
  volumes,
  services,
  configs,
  deploymentsMap,
  onKillPod
}: DashboardOverviewProps) {
  const healthyPodsCount = pods.filter(p => p.status === 'Running').length;
  const activeNodesCount = nodes.filter(n => n.status === 'Ready').length;
  const activeSvcCount = services.length;
  const totalVolumeSize = volumes.reduce((sum, v) => sum + v.sizeGB, 0);

  // Compute total system resource limits & allocation %
  const totalCpuCapacity = nodes.reduce((sum, n) => sum + n.cpuCapacity, 0);
  const totalRamCapacity = nodes.reduce((sum, n) => sum + n.ramCapacity, 0);
  const currentCpuAllocated = nodes.reduce((sum, n) => sum + n.cpuAllocated, 0);
  const currentRamAllocated = nodes.reduce((sum, n) => sum + n.ramAllocated, 0);

  const cpuPct = Math.min(100, Math.round((currentCpuAllocated / totalCpuCapacity) * 100));
  const ramPct = Math.min(100, Math.round((currentRamAllocated / totalRamCapacity) * 100));

  return (
    <div className="space-y-6">
      {/* Top statistics banners */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <MetricCard
          title="Active Hot Nodes"
          value={`${activeNodesCount} / ${nodes.length}`}
          subtitle="Ready hybrid cluster hosts"
          icon={<Server className="w-5 h-5 text-indigo-600" />}
          trend={{ value: "100% SLA", isPositive: true }}
        />

        <MetricCard
          title="Managed Replicas"
          value={`${healthyPodsCount} / ${pods.length}`}
          subtitle="Active container pods running"
          icon={<Activity className="w-5 h-5 text-emerald-500" />}
          trend={{ value: "Online", isPositive: true }}
        />

        <MetricCard
          title="DNS Ingress Gateways"
          value={activeSvcCount}
          subtitle="Load-balanced network endpoints"
          icon={<Globe className="w-5 h-5 text-sky-500" />}
        />

        <MetricCard
          title="Dynamic Cloud Disk"
          value={`${totalVolumeSize} GB`}
          subtitle="Provisioned Block Storage size"
          icon={<HardDrive className="w-5 h-5 text-amber-500" />}
        />
      </div>

      {/* Cluster resource utilization summary */}
      <div className="bg-slate-900 border border-slate-800 rounded-sm p-5 shadow-lg text-slate-100 grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
        <div>
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-0.5">Aggregated Operations Pool</span>
          <h3 className="text-lg font-bold font-display text-white">Hybrid Cloud Capacity reservation</h3>
          <p className="text-xs text-slate-400 mt-1 leading-relaxed">
            Allocated cluster resources mapped across AWS EBS, GCP Persistent Disks, Azure, and On-Premises bare metal. Scheduler updates reservation rates dynamically during workload scaling.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="bg-slate-950/40 p-4 rounded-sm border border-slate-800">
            <div className="flex justify-between items-center mb-1 text-xs">
              <span className="flex items-center gap-1 font-semibold text-slate-300">
                <Cpu className="w-3.5 h-3.5 text-cyan-400" /> CPU RESERVATION
              </span>
              <span className="font-mono text-cyan-400">{currentCpuAllocated.toFixed(2)}/ {totalCpuCapacity} Cores</span>
            </div>
            <div className="w-full bg-slate-850 h-1 rounded-sm overflow-hidden mt-1.5">
              <div className="h-full bg-cyan-500" style={{ width: `${cpuPct}%` }}></div>
            </div>
            <span className="text-[10px] text-slate-500 font-mono mt-1.5 block text-right">{cpuPct}% system limit reached</span>
          </div>

          <div className="bg-slate-950/40 p-4 rounded-sm border border-slate-800">
            <div className="flex justify-between items-center mb-1 text-xs">
              <span className="flex items-center gap-1 font-semibold text-slate-300">
                <Layers className="w-3.5 h-3.5 text-emerald-400" /> RAM ALLOCATION
              </span>
              <span className="font-mono text-emerald-400">{currentRamAllocated.toFixed(1)}/ {totalRamCapacity} GB</span>
            </div>
            <div className="w-full bg-slate-850 h-1 rounded-sm overflow-hidden mt-1.5">
              <div className="h-full bg-emerald-50" style={{ width: `${ramPct}%` }}></div>
            </div>
            <span className="text-[10px] text-slate-500 font-mono mt-1.5 block text-right">{ramPct}% system limit reached</span>
          </div>
        </div>
      </div>

      {/* Cluster Map Topology component */}
      <ClusterMap
        nodes={nodes}
        pods={pods}
        deploymentsMap={deploymentsMap}
        onKillPod={onKillPod}
      />
    </div>
  );
}
