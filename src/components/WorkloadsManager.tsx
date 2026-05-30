import React, { useState, useEffect } from 'react';
import { Deployment, PodReplica, StorageVolume, ConfigurationItem } from '../types';
import { Layers, Plus, Minus, Tag, RefreshCw, Undo, Eye, ToggleLeft, Activity, Info, ShieldAlert, CheckCircle2, HardDrive, Key } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface WorkloadsManagerProps {
  deployments: Deployment[];
  pods: PodReplica[];
  volumes: StorageVolume[];
  configs: ConfigurationItem[];
  onScale: (deployId: string, isIncrement: boolean) => void;
  onRollout: (deployId: string, newImage: string) => void;
  onRollback: (deployId: string) => void;
  onKillPodState: (podId: string) => void;
  onCreateDeployment: (newDeploy: Omit<Deployment, 'id' | 'currentRevision' | 'revisionHistory' | 'lastRolloutTime' | 'status'>) => void;
}

export default function WorkloadsManager({ 
  deployments, 
  pods, 
  volumes,
  configs,
  onScale, 
  onRollout, 
  onRollback, 
  onKillPodState,
  onCreateDeployment 
}: WorkloadsManagerProps) {
  const [selectedDeployId, setSelectedDeployId] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  
  // Create Form State
  const [newName, setNewName] = useState('auth-microservice');
  const [newImage, setNewImage] = useState('node:20-alpine');
  const [newReplicas, setNewReplicas] = useState(2);
  const [newCpu, setNewCpu] = useState(0.5);
  const [newRam, setNewRam] = useState(1.0);
  const [newVolume, setNewVolume] = useState<string>('');
  const [newEnvUrl, setNewEnvUrl] = useState('');
  const [newHealthCheck, setNewHealthCheck] = useState('/healthz');

  // Rollout modal/input state
  const [rolloutImageMap, setRolloutImageMap] = useState<Record<string, string>>({});

  const activeDeployment = selectedDeployId ? deployments.find(d => d.id === selectedDeployId) : null;
  const activePods = selectedDeployId ? pods.filter(p => p.deploymentId === selectedDeployId) : [];

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    onCreateDeployment({
      name: newName,
      image: newImage,
      replicasNeeded: Number(newReplicas),
      cpuPerPod: Number(newCpu),
      ramPerPod: Number(newRam),
      volumeClaimName: newVolume ? newVolume : null,
      serviceId: null,
      envVars: newEnvUrl ? [{ key: 'DATABASE_URL', value: newEnvUrl }] : [],
      healthCheckPath: newHealthCheck,
      healthCheckInterval: 10
    });
    setShowCreateModal(false);
    // Reset form
    setNewName('custom-worker');
    setNewImage('redis:7-alpine');
    setNewReplicas(2);
    setNewCpu(0.25);
    setNewRam(0.5);
    setNewVolume('');
    setNewEnvUrl('');
  };

  const calculateDeploymentHealth = (deploy: Deployment) => {
    const deployPods = pods.filter(p => p.deploymentId === deploy.id);
    const activeRunningCount = deployPods.filter(p => p.status === 'Running').length;
    if (deploy.status === 'Rolling') return 'Rolling';
    if (activeRunningCount === 0) return 'Degraded';
    if (activeRunningCount < deploy.replicasNeeded) return 'De-scaled';
    return 'Healthy';
  };

  return (
    <div className="space-y-6">
      {/* Topology Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h3 className="text-xl font-bold text-white font-display">Containerized Workloads</h3>
          <p className="text-xs text-slate-400">Deploy, scale, config-mount, rollout and maintain cloud application deployments below.</p>
        </div>
        <button 
          onClick={() => setShowCreateModal(true)}
          className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-slate-950 rounded-sm text-xs font-bold uppercase tracking-widest transition-all duration-150 flex items-center gap-1.5 cursor-pointer"
        >
          <Plus className="w-4 h-4" /> New Deployment
        </button>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Left column: Deployments List */}
        <div className="xl:col-span-2 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {deployments.map(deploy => {
              const deployPods = pods.filter(p => p.deploymentId === deploy.id);
              const runningPods = deployPods.filter(p => p.status === 'Running').length;
              const isSelected = selectedDeployId === deploy.id;
              const healthStatus = calculateDeploymentHealth(deploy);

              return (
                <div 
                  key={deploy.id}
                  onClick={() => setSelectedDeployId(deploy.id)}
                  className={`cursor-pointer rounded-sm border-2 p-5 transition-all duration-150 flex flex-col justify-between hover:translate-y-[-1px] ${
                    isSelected 
                      ? 'border-cyan-500 bg-slate-900 shadow-[0_0_15px_rgba(6,182,212,0.15)] text-white' 
                      : 'border-slate-800 bg-slate-900/40 hover:border-slate-700 shadow-sm text-slate-200'
                  }`}
                >
                  <div>
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <span className="text-[10px] font-mono text-cyan-450 uppercase tracking-widest font-bold">Deployment</span>
                        <h4 className="text-base font-bold text-white tracking-tight">{deploy.name}</h4>
                      </div>
                      <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-sm ${
                        healthStatus === 'Healthy' 
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                          : healthStatus === 'Rolling'
                          ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20 animate-pulse'
                          : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                      }`}>
                        {healthStatus}
                      </span>
                    </div>

                    <div className="space-y-1.5 mb-5 text-xs text-slate-400 font-medium">
                      <div className="flex justify-between">
                        <span>Image URI</span>
                        <span className="font-mono text-cyan-400 bg-slate-950 border border-slate-800 px-1.5 py-0.5 rounded-sm text-[11px] max-w-[200px] truncate">{deploy.image}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Replicas Status</span>
                        <span className="font-sans font-bold text-white">
                          {runningPods} / {deploy.replicasNeeded} Online
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>Service Binder</span>
                        <span className="text-slate-300 font-mono text-[10px]">
                          {deploy.serviceId ? 'Linked' : 'No service'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Resource footer */}
                  <div className="border-t border-slate-800 pt-3 flex justify-between items-center text-[10px] uppercase font-semibold text-slate-500">
                    <span className="bg-slate-800 text-slate-300 px-1.5 py-0.5 rounded-sm border border-slate-700 font-mono">R{deploy.currentRevision}</span>
                    <span className="flex gap-2">
                      <span>⚡ {deploy.cpuPerPod * deploy.replicasNeeded} CORES</span>
                      <span>💾 {deploy.ramPerPod * deploy.replicasNeeded} GB</span>
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right column: Selected Deployment & Self-Healing & Rolling Rollouts Config */}
        <div className="bg-slate-900/40 border border-slate-800 p-5 rounded-sm shadow-lg space-y-5 h-full flex flex-col justify-between">
          {!activeDeployment ? (
            <div className="py-24 text-center flex flex-col items-center justify-center text-slate-500">
              <Layers className="w-12 h-12 mb-4 stroke-1 text-slate-600" />
              <p className="text-xs font-bold text-slate-400 mb-1 uppercase tracking-wider">Select a deployment workload</p>
              <p className="text-[11px] text-slate-500 max-w-[200px] mx-auto leading-relaxed">Click one of the deployment cards to inspect running pods, scale replicas, and trigger rolling out configurations.</p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="pb-4 border-b border-slate-800">
                <span className="text-[10px] font-mono font-bold uppercase text-slate-500 tracking-widest block">Selected Workload</span>
                <h4 className="text-lg font-bold text-white font-display mb-1">{activeDeployment.name}</h4>
                <p className="text-xs text-slate-400 flex items-center gap-1">
                  <Activity className="w-3.5 h-3.5 text-cyan-400" /> Image: <span className="font-mono text-cyan-400 font-bold">{activeDeployment.image}</span>
                </p>
              </div>

              {/* Dynamic Operations block */}
              <div className="space-y-4">
                {/* 1. Replica Scaling (Load management) */}
                <div className="bg-slate-950 p-4 rounded-sm border border-slate-800 space-y-2">
                  <div className="flex justify-between items-center">
                    <div>
                      <span className="text-[10px] font-bold text-slate-300 uppercase tracking-widest block">Deploy Scaling</span>
                      <p className="text-[10px] text-slate-500 text-slate-500">Provision/De-provision active pod nodes.</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <button 
                        onClick={() => onScale(activeDeployment.id, false)}
                        disabled={activeDeployment.replicasNeeded <= 1}
                        className="p-1.5 bg-slate-900 border border-slate-800 rounded-sm hover:bg-slate-800 text-slate-300 disabled:opacity-40 transition-colors cursor-pointer"
                      >
                        <Minus className="w-3.5 h-3.5" />
                      </button>
                      <span className="font-mono font-bold text-sm text-cyan-400">{activeDeployment.replicasNeeded}</span>
                      <button 
                        onClick={() => onScale(activeDeployment.id, true)}
                        className="p-1.5 bg-slate-900 border border-slate-800 rounded-sm hover:bg-slate-800 text-slate-300 transition-colors cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>

                {/* 2. Automated Rollout & Rollback */}
                <div className="bg-slate-950 p-4 rounded-sm border border-slate-800 space-y-3">
                  <div>
                    <span className="text-[10px] font-bold text-slate-300 uppercase tracking-widest block">Continuous Integration Rollout</span>
                    <p className="text-[10px] text-slate-500">Trigger standard rolling deploy without downtime.</p>
                  </div>

                  <div className="flex gap-2">
                    <input 
                      type="text" 
                      placeholder="e.g. nginx:1.26-alpine"
                      value={rolloutImageMap[activeDeployment.id] || ''}
                      onChange={(e) => setRolloutImageMap({ ...rolloutImageMap, [activeDeployment.id]: e.target.value })}
                      className="bg-slate-900 border border-slate-800 rounded-sm text-xs px-2.5 py-1.5 font-mono text-white flex-1 focus:outline-none focus:ring-1 focus:ring-cyan-500"
                    />
                    <button 
                      onClick={() => {
                        const newImg = rolloutImageMap[activeDeployment.id];
                        if (newImg) {
                          onRollout(activeDeployment.id, newImg);
                          setRolloutImageMap({ ...rolloutImageMap, [activeDeployment.id]: '' });
                        }
                      }}
                      className="px-3 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-bold rounded-sm text-xs flex items-center gap-1 cursor-pointer transition-colors uppercase tracking-widest text-[10px]"
                    >
                      <RefreshCw className="w-3.5 h-3.5" /> Rollout
                    </button>
                  </div>

                  {activeDeployment.revisionHistory.length > 1 && (
                    <div className="flex items-center justify-between pt-2 border-t border-slate-800 text-[11px]">
                      <span className="text-slate-400 font-medium">Revision History (R{activeDeployment.currentRevision})</span>
                      <button 
                        onClick={() => onRollback(activeDeployment.id)}
                        className="text-cyan-400 hover:text-cyan-300 font-bold flex items-center gap-1 cursor-pointer transition-colors"
                      >
                        <Undo className="w-3 h-3" /> Rollback to R{activeDeployment.revisionHistory[activeDeployment.revisionHistory.length - 2].revision}
                      </button>
                    </div>
                  )}
                </div>

                {/* 3. Pod Monitor Section with Interactive Killing (Self-Healing Demo) */}
                <div className="space-y-2">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Live Pod Status & Self Healing</span>
                  <div className="space-y-1.5 max-h-[160px] overflow-y-auto pr-1">
                    {activePods.map(pod => (
                      <div 
                        key={pod.id}
                        className="bg-slate-950 p-2.5 rounded-sm border border-slate-800 flex items-center justify-between text-xs"
                      >
                        <div className="space-y-0.5 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className={`w-2 h-2 rounded-full ${
                              pod.status === 'Running' 
                                ? 'bg-emerald-500' 
                                : pod.status === 'Restarting' 
                                ? 'bg-cyan-500' 
                                : pod.status === 'Failed' 
                                ? 'bg-rose-500 animate-bounce' 
                                : 'bg-amber-500'
                            }`} />
                            <span className="font-mono text-[11px] font-bold text-white truncate block max-w-[170px]" title={pod.name}>
                              {pod.name.split('-').slice(-2).join('-')}
                            </span>
                          </div>
                          <span className="text-[10px] text-slate-400 font-mono">Restarts: <span className="font-bold text-rose-450">{pod.restartsCount}</span> • IP: <span className="text-slate-500">{pod.ipAddress}</span></span>
                        </div>

                        {pod.status === 'Running' && (
                          <button 
                            onClick={() => onKillPodState(pod.id)}
                            className="bg-red-500/10 hover:bg-red-500/20 text-rose-400 p-1.5 rounded-sm border border-red-500/20 hover:border-red-500/30 transition-colors cursor-pointer"
                            title="Induce pod failure (Crash Simulator)"
                          >
                            <ShieldAlert className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Mounted volumes & configs info alerts */}
                <div className="space-y-1 bg-slate-950 p-3 rounded-sm text-[10px] text-slate-400 border border-slate-800">
                  <span className="font-bold text-[9px] text-slate-500 uppercase tracking-widest block mb-1">Configuration Bind Tracker</span>
                  {activeDeployment.volumeClaimName ? (
                    <div className="flex items-center gap-1 text-slate-350">
                      <HardDrive className="w-3.5 h-3.5 text-cyan-400" />
                      <span>Shares: <span className="font-bold text-white">{activeDeployment.volumeClaimName}</span> at <span className="font-mono bg-slate-900 px-1 rounded-sm border border-slate-800">/usr/share/nginx/html</span></span>
                    </div>
                  ) : (
                    <span className="text-slate-500 block">• No active persistent volumes mounted</span>
                  )}
                  {activeDeployment.envVars.length > 0 ? (
                    <div className="flex items-center gap-1 text-slate-350 mt-1">
                      <Key className="w-3.5 h-3.5 text-cyan-400" />
                      <span>Environments: <span className="font-bold text-white">{activeDeployment.envVars.length} keys</span> linked successfully.</span>
                    </div>
                  ) : (
                    <span className="text-slate-500 block">• No active configurations linked</span>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Creation Modal dialog */}
      <AnimatePresence>
        {showCreateModal && (
          <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-slate-900 w-full max-w-lg p-6 shadow-2xl border border-slate-800 space-y-4 rounded-sm text-slate-100"
            >
              <div className="flex justify-between items-center pb-2 border-b border-slate-800">
                <h4 className="text-base font-bold text-white font-display uppercase tracking-widest text-xs">Create KubeLite Workload</h4>
                <button 
                  onClick={() => setShowCreateModal(false)}
                  className="p-1 hover:bg-slate-800 rounded-sm text-slate-400 hover:text-white transition-colors cursor-pointer"
                >
                  ✖
                </button>
              </div>

              <form onSubmit={handleCreate} className="space-y-4 text-xs">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-slate-400 font-semibold uppercase tracking-wider text-[10px] mb-1">Deployment Name</label>
                    <input 
                      type="text" 
                      required
                      value={newName}
                      onChange={(e) => setNewName(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-sm px-3 py-2 text-white focus:outline-none focus:ring-1 focus:ring-cyan-500"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 font-semibold uppercase tracking-wider text-[10px] mb-1">Container Image URI</label>
                    <input 
                      type="text" 
                      required
                      value={newImage}
                      onChange={(e) => setNewImage(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-sm px-3 py-2 text-white focus:outline-none focus:ring-1 focus:ring-cyan-500 font-mono"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-slate-400 font-semibold uppercase tracking-wider text-[10px] mb-1">Scale Replicas</label>
                    <input 
                      type="number" 
                      min="1"
                      max="10"
                      required
                      value={newReplicas}
                      onChange={(e) => setNewReplicas(Number(e.target.value))}
                      className="w-full bg-slate-950 border border-slate-800 rounded-sm px-3 py-2 text-white font-mono focus:outline-none focus:ring-1 focus:ring-cyan-500"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 font-semibold uppercase tracking-wider text-[10px] mb-1">CPU per pod</label>
                    <select 
                      value={newCpu}
                      onChange={(e) => setNewCpu(Number(e.target.value))}
                      className="w-full bg-slate-950 border border-slate-800 rounded-sm px-3 py-2 text-white focus:outline-none focus:ring-1 focus:ring-cyan-500"
                    >
                      <option value={0.1}>0.1 Cores</option>
                      <option value={0.25}>0.25 Cores</option>
                      <option value={0.5}>0.5 Cores</option>
                      <option value={1.0}>1.0 Cores</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-slate-400 font-semibold uppercase tracking-wider text-[10px] mb-1">RAM per pod</label>
                    <select 
                      value={newRam}
                      onChange={(e) => setNewRam(Number(e.target.value))}
                      className="w-full bg-slate-950 border border-slate-800 rounded-sm px-3 py-2 text-white focus:outline-none focus:ring-1 focus:ring-cyan-500"
                    >
                      <option value={0.25}>256 MB</option>
                      <option value={0.5}>512 MB</option>
                      <option value={1.0}>1.0 GB</option>
                      <option value={2.0}>2.0 GB</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-slate-400 font-semibold uppercase tracking-wider text-[10px] mb-1">PV Mount (Optional)</label>
                    <select 
                      value={newVolume}
                      onChange={(e) => setNewVolume(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-sm px-3 py-2 text-white focus:outline-none focus:ring-1 focus:ring-cyan-500"
                    >
                      <option value="">-- No Volumes --</option>
                      {volumes.filter(v => v.status === 'Available').map(vol => (
                        <option key={vol.id} value={vol.name}>{vol.name} ({vol.sizeGB}GB {vol.type})</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-slate-400 font-semibold uppercase tracking-wider text-[10px] mb-1">Liveness Health Probe Path</label>
                    <input 
                      type="text" 
                      required
                      value={newHealthCheck}
                      onChange={(e) => setNewHealthCheck(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-sm px-3 py-2 text-white font-mono focus:outline-none focus:ring-1 focus:ring-cyan-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-slate-400 font-semibold uppercase tracking-wider text-[10px] mb-1">Static Config variables (Key=Value)</label>
                  <input 
                    type="text" 
                    placeholder="e.g. redis://user:pass@host:3000"
                    value={newEnvUrl}
                    onChange={(e) => setNewEnvUrl(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-sm px-3 py-2 text-white font-mono focus:outline-none focus:ring-1 focus:ring-cyan-500"
                  />
                </div>

                <div className="flex gap-2.5 justify-end pt-4 border-t border-slate-800">
                  <button 
                    type="button"
                    onClick={() => setShowCreateModal(false)}
                    className="px-4 py-2 border border-slate-800 text-slate-400 rounded-sm hover:bg-slate-850 hover:text-white transition-colors cursor-pointer text-[10px] uppercase font-bold tracking-wider"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit"
                    className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-bold rounded-sm shadow-md transition-colors cursor-pointer text-[10px] uppercase tracking-wider"
                  >
                    Deploy to Cluster
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
