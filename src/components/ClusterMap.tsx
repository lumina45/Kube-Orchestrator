import { useState } from 'react';
import { ClusterNode, PodReplica } from '../types';
import { Server, Cpu, Layers, HardDrive, CheckCircle2, AlertTriangle, Cloud, ShieldAlert } from 'lucide-react';
import { motion } from 'motion/react';

interface ClusterMapProps {
  nodes: ClusterNode[];
  pods: PodReplica[];
  deploymentsMap: Record<string, string>; // deploymentId -> deploymentName
  onKillPod?: (podId: string) => void;
}

export default function ClusterMap({ nodes, pods, deploymentsMap, onKillPod }: ClusterMapProps) {
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);

  const getProviderIcon = (provider: string) => {
    switch (provider) {
      case 'AWS': return <span className="bg-amber-500/10 text-amber-400 px-2 py-0.5 rounded-sm text-[10px] font-bold border border-amber-500/20 font-mono">AWS</span>;
      case 'GCP': return <span className="bg-cyan-500/10 text-cyan-400 px-2 py-0.5 rounded-sm text-[10px] font-bold border border-cyan-500/20 font-mono">GCP</span>;
      case 'Azure': return <span className="bg-sky-500/10 text-sky-400 px-2 py-0.5 rounded-sm text-[10px] font-bold border border-sky-500/20 font-mono">Azure</span>;
      default: return <span className="bg-slate-800 text-slate-300 px-2 py-0.5 rounded-sm text-[10px] font-bold border border-slate-700 font-mono">On-Prem</span>;
    }
  };

  const getProviderBgColor = (provider: string) => {
    switch (provider) {
      case 'AWS': return 'border-slate-800 hover:border-amber-500/40 bg-slate-900/40';
      case 'GCP': return 'border-slate-800 hover:border-cyan-500/40 bg-slate-900/40';
      case 'Azure': return 'border-slate-800 hover:border-sky-500/40 bg-slate-900/40';
      default: return 'border-slate-800 hover:border-slate-700 bg-slate-900/40';
    }
  };

  const getPodStatusColor = (status: string) => {
    switch (status) {
      case 'Running': return 'bg-emerald-500 text-white';
      case 'Failed': return 'bg-rose-500 text-white';
      case 'Pending': return 'bg-amber-500 text-white';
      case 'Restarting': return 'bg-purple-500 text-white animate-pulse';
      default: return 'bg-slate-400 text-white';
    }
  };

  const activeNode = selectedNodeId ? nodes.find(n => n.id === selectedNodeId) : null;
  const activeNodePods = selectedNodeId ? pods.filter(p => p.nodeId === selectedNodeId) : [];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Topology Nodes Grid */}
      <div className="lg:col-span-2 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold text-white font-display">Multi-Cloud Topology Mapper</h3>
            <p className="text-xs text-slate-400">Scheduled cluster agents running distributed workloads on hybrid clouds.</p>
          </div>
          <div className="flex gap-2 text-[10px] uppercase tracking-wider font-semibold text-slate-400">
            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span> Active</span>
            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span> Pending</span>
            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-rose-500"></span> Fault</span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {nodes.map(node => {
            const nodePods = pods.filter(p => p.nodeId === node.id);
            const cpuUsagePercent = Math.min(100, Math.round((node.cpuAllocated / node.cpuCapacity) * 100));
            const ramUsagePercent = Math.min(100, Math.round((node.ramAllocated / node.ramCapacity) * 100));
            const isSelected = selectedNodeId === node.id;

            return (
              <motion.div
                key={node.id}
                layoutId={`node-card-${node.id}`}
                onClick={() => setSelectedNodeId(node.id)}
                className={`cursor-pointer border-2 rounded-sm p-5 transition-all duration-250 relative ${
                  isSelected 
                    ? 'border-cyan-500 bg-slate-900 shadow-[0_0_15px_rgba(6,182,212,0.15)]' 
                    : `${getProviderBgColor(node.provider)} shadow-sm`
                }`}
              >
                {/* Node Identity */}
                <div className="flex justify-between items-start mb-3">
                  <div className="flex gap-2.5 items-center">
                    <div className="p-2 bg-slate-800 rounded-sm text-cyan-400 border border-slate-705">
                      <Server className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="font-bold text-white text-sm whitespace-nowrap overflow-hidden text-ellipsis max-w-[130px] sm:max-w-none">{node.name}</h4>
                      <p className="text-[11px] text-slate-400 font-mono">{node.ipAddress} • {node.region}</p>
                    </div>
                  </div>
                  {getProviderIcon(node.provider)}
                </div>

                {/* Resource Allocations */}
                <div className="space-y-2 mt-4 mb-4">
                  <div>
                    <div className="flex justify-between text-[11px] font-semibold text-slate-300 mb-1">
                      <span className="flex items-center gap-1"><Cpu className="w-3 h-3 text-slate-500" /> CPU Allocation</span>
                      <span className="font-mono text-cyan-400">{node.cpuAllocated.toFixed(2)} / {node.cpuCapacity} Cores ({cpuUsagePercent}%)</span>
                    </div>
                    <div className="w-full bg-slate-950 h-1 rounded-sm overflow-hidden border border-slate-900">
                      <div 
                        className={`h-full rounded-sm transition-all duration-500 ${
                          cpuUsagePercent > 85 ? 'bg-rose-500' : cpuUsagePercent > 60 ? 'bg-amber-500' : 'bg-cyan-500'
                        }`}
                        style={{ width: `${cpuUsagePercent}%` }}
                      ></div>
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-[11px] font-semibold text-slate-300 mb-1">
                      <span className="flex items-center gap-1"><Layers className="w-3 h-3 text-slate-500" /> RAM Allocation</span>
                      <span className="font-mono text-emerald-400">{node.ramAllocated.toFixed(1)} / {node.ramCapacity} GB ({ramUsagePercent}%)</span>
                    </div>
                    <div className="w-full bg-slate-950 h-1 rounded-sm overflow-hidden border border-slate-900">
                      <div 
                        className={`h-full rounded-sm transition-all duration-500 ${
                          ramUsagePercent > 85 ? 'bg-rose-500' : ramUsagePercent > 60 ? 'bg-amber-500' : 'bg-emerald-500'
                        }`}
                        style={{ width: `${ramUsagePercent}%` }}
                      ></div>
                    </div>
                  </div>
                </div>

                {/* Scheduled Pod Badges */}
                <div className="flex flex-wrap gap-1.5 mt-2">
                  <span className="text-[10px] text-slate-550 self-center mr-1 font-mono">PODS ({nodePods.length}):</span>
                  {nodePods.slice(0, 5).map(pod => (
                    <span 
                      key={pod.id}
                      title={`${deploymentsMap[pod.deploymentId] || 'Pod'}: ${pod.status}`}
                      className={`w-3 h-3 rounded-full ${
                        pod.status === 'Running' 
                          ? 'bg-emerald-500 animate-pulse' 
                          : pod.status === 'Failed' 
                          ? 'bg-rose-500 animate-ping' 
                          : 'bg-amber-500'
                      }`}
                    />
                  ))}
                  {nodePods.length > 5 && (
                    <span className="text-[10px] font-bold text-slate-400 self-center bg-slate-800 px-1.5 py-0.5 rounded-sm font-mono border border-slate-700">+{nodePods.length - 5}</span>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Selected Node Inspector Details */}
      <div className="bg-slate-900/40 backdrop-blur-md rounded-sm p-5 border border-slate-800 shadow-lg h-full flex flex-col justify-between">
        <div>
          <div className="flex items-center gap-2 pb-4 border-b border-slate-800 mb-4 justify-between">
            <h3 className="font-sans font-bold text-xs tracking-widest uppercase text-cyan-400 flex items-center gap-2">
              <Cloud className="w-4 h-4" /> NODE TELEMETRY
            </h3>
            {activeNode && (
              <span className="text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded-sm font-mono flex items-center gap-1 font-bold uppercase tracking-wider">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span> Active
              </span>
            )}
          </div>

          {!activeNode ? (
            <div className="py-20 text-center flex flex-col items-center justify-center text-slate-500">
              <Server className="w-10 h-10 mb-4 stroke-1 text-slate-600" />
              <p className="text-xs font-medium max-w-[200px] leading-relaxed">Select a node from the cluster topology map to inspect runtime telemetry and simulated pods.</p>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-500 tracking-widest block">Node Name</span>
                <span className="text-sm font-bold text-white font-mono">{activeNode.name}</span>
              </div>

              <div className="grid grid-cols-2 gap-4 bg-slate-950 p-3 rounded-sm border border-slate-800/80">
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-500 tracking-widest block">Cloud Host</span>
                  <span className="text-xs font-semibold text-slate-200">{activeNode.provider} • {activeNode.region}</span>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-500 tracking-widest block">VPC IP</span>
                  <span className="text-xs font-mono text-slate-300">{activeNode.ipAddress}</span>
                </div>
              </div>

              {/* Mounted Storage list */}
              <div>
                <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-1">
                  <HardDrive className="w-3.5 h-3.5" /> Scheduled Pod Ingress ({activeNodePods.length})
                </h4>

                {activeNodePods.length === 0 ? (
                  <p className="text-xs text-slate-500 italic py-2">No workload replicas are assigned to this host.</p>
                ) : (
                  <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                    {activeNodePods.map(pod => (
                      <div 
                        key={pod.id} 
                        className="bg-slate-950 p-3 border border-slate-800 flex items-center justify-between rounded-sm"
                      >
                        <div className="space-y-1 overflow-hidden mr-2">
                          <div className="flex items-center gap-1.5">
                            <span className={`w-2 h-2 rounded-full ${
                              pod.status === 'Running' ? 'bg-emerald-400' : 'bg-rose-400 animate-pulse'
                            }`} />
                            <span className="text-xs font-mono font-bold text-white block truncate">{pod.name}</span>
                          </div>
                          <span className="text-[10px] text-slate-400 block truncate">
                            Owner: <span className="text-cyan-400 font-mono">{deploymentsMap[pod.deploymentId] || pod.deploymentId}</span>
                          </span>
                          <span className="text-[10px] text-slate-500 block font-mono">IP: {pod.ipAddress} | Restarts: {pod.restartsCount}</span>
                        </div>
                        
                        <div className="flex gap-2">
                          {pod.status === 'Running' && onKillPod && (
                            <button
                              onClick={() => onKillPod(pod.id)}
                              className="px-2 py-1 bg-red-650/10 hover:bg-red-500/25 text-rose-400 border border-red-500/25 rounded-md text-[9px] font-bold tracking-widest uppercase transition-all duration-150 flex items-center gap-1 hover:border-red-500/40 cursor-pointer"
                              title="Force kill container to trigger self-healing"
                            >
                              <ShieldAlert className="w-3 h-3" /> KILL
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {activeNode && (
          <div className="mt-4 p-3 bg-cyan-950/20 border border-cyan-800/30 rounded-sm text-[11px] text-cyan-300">
            <span className="font-bold block mb-0.5">💡 Interactive Demonstration:</span>
            Use the cloud node panel above to "KILL" any active pod. The KubeLite scheduler will detect the failure, update the logs, and spin up a replacement instantly!
          </div>
        )}
      </div>
    </div>
  );
}
