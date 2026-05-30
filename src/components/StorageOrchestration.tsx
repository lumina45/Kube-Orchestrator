import React, { useState } from 'react';
import { StorageVolume, Deployment } from '../types';
import { HardDrive, Plus, Cloud, Link, Unlink, CheckCircle2, Info, Layers } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface StorageOrchestrationProps {
  volumes: StorageVolume[];
  deployments: Deployment[];
  onMountVolume: (volumeId: string, deployId: string) => void;
  onDismountVolume: (volumeId: string) => void;
  onProvisionVolume: (newVolume: Omit<StorageVolume, 'id' | 'status' | 'boundDeploymentId'>) => void;
}

export default function StorageOrchestration({
  volumes,
  deployments,
  onMountVolume,
  onDismountVolume,
  onProvisionVolume,
}: StorageOrchestrationProps) {
  const [selectedVolId, setSelectedVolId] = useState<string | null>(null);
  const [showAddVolModal, setShowAddVolModal] = useState(false);
  const [selectedDeployId, setSelectedDeployId] = useState<string>('');

  // Form states
  const [volName, setVolName] = useState('elastic-cdn-vault');
  const [volSize, setVolSize] = useState(250);
  const [volType, setVolType] = useState<'AWS_EBS' | 'GCP_PD' | 'Azure_Disk' | 'Local_SSD'>('AWS_EBS');
  const [volMountPath, setVolMountPath] = useState('/var/payload/media');

  const activeVolume = selectedVolId ? volumes.find(v => v.id === selectedVolId) : null;
  const boundDeployName = activeVolume?.boundDeploymentId 
    ? deployments.find(d => d.id === activeVolume.boundDeploymentId)?.name 
    : null;

  const handleCreateVolume = (e: React.FormEvent) => {
    e.preventDefault();
    onProvisionVolume({
      name: volName,
      sizeGB: Number(volSize),
      type: volType,
      mountPath: volMountPath,
    });
    setShowAddVolModal(false);
  };

  const getDiskIconAndBg = (type: string) => {
    switch (type) {
      case 'AWS_EBS':
        return {
          icon: <span className="bg-amber-950/40 text-amber-400 border border-amber-800/35 px-2 py-0.5 rounded-sm text-[10px] font-bold font-mono uppercase tracking-wider">AWS EBS</span>,
          bg: 'border-slate-850 bg-slate-900/30 hover:border-slate-700'
        };
      case 'GCP_PD':
        return {
          icon: <span className="bg-cyan-950/40 text-cyan-400 border border-cyan-800/35 px-2 py-0.5 rounded-sm text-[10px] font-bold font-mono uppercase tracking-wider">GCP PD</span>,
          bg: 'border-slate-850 bg-slate-900/30 hover:border-slate-700'
        };
      case 'Azure_Disk':
        return {
          icon: <span className="bg-sky-950/40 text-sky-400 border border-sky-805/35 px-2 py-0.5 rounded-sm text-[10px] font-bold font-mono uppercase tracking-wider">Azure VHD</span>,
          bg: 'border-slate-850 bg-slate-900/30 hover:border-slate-700'
        };
      default:
        return {
          icon: <span className="bg-slate-800 text-slate-400 border border-slate-700 px-2 py-0.5 rounded-sm text-[10px] font-bold font-mono uppercase tracking-wider">Local SSD</span>,
          bg: 'border-slate-850 bg-slate-900/30 hover:border-slate-700'
        };
    }
  };

  return (
    <div className="space-y-6">
      {/* Topology Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h3 className="text-xl font-bold text-white font-display">Storage Orchestration Engine</h3>
          <p className="text-xs text-slate-400 font-medium">Mount storage systems dynamically, supporting Local SSD blocks and cloud persistent volumes automatically.</p>
        </div>
        <button 
          onClick={() => setShowAddVolModal(true)}
          className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-slate-950 rounded-sm text-xs font-bold uppercase tracking-widest transition-all duration-150 flex items-center gap-1.5 cursor-pointer"
        >
          <Plus className="w-4 h-4" /> Provision Volume
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Side: Volumes Grid */}
        <div className="lg:col-span-2 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {volumes.map(vol => {
              const isSelected = selectedVolId === vol.id;
              const meta = getDiskIconAndBg(vol.type);
              const linkedDeploy = vol.boundDeploymentId 
                ? deployments.find(d => d.id === vol.boundDeploymentId) 
                : null;

              return (
                <div 
                  key={vol.id}
                  onClick={() => setSelectedVolId(vol.id)}
                  className={`cursor-pointer rounded-sm border-2 p-5 transition-all duration-150 flex flex-col justify-between hover:translate-y-[-1px] ${
                    isSelected 
                      ? 'border-cyan-500 bg-slate-900 shadow-[0_0_15px_rgba(6,182,212,0.15)] text-white' 
                      : `${meta.bg} text-slate-300 shadow-sm`
                  }`}
                >
                  <div>
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex items-center gap-2.5">
                        <div className="p-2 bg-slate-850 rounded-sm border border-slate-800 text-cyan-400">
                          <HardDrive className="w-4 h-4" />
                        </div>
                        <div>
                          <h4 className="text-sm font-bold text-white font-display truncate max-w-[150px]">{vol.name}</h4>
                          <span className="text-[10px] text-slate-400 font-mono italic">{vol.mountPath}</span>
                        </div>
                      </div>
                      {meta.icon}
                    </div>

                    <div className="pt-2 space-y-1.5 border-t border-slate-800 text-xs text-slate-400">
                      <div className="flex justify-between">
                        <span>Block Storage Size</span>
                        <span className="font-mono text-cyan-400 font-bold">{vol.sizeGB} GB</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Status</span>
                        <span className={`px-2 py-0.5 rounded-sm text-[9px] font-bold tracking-widest uppercase font-mono ${
                          vol.status === 'Bound' 
                            ? 'bg-emerald-950/40 text-emerald-400 border border-emerald-800/30' 
                            : 'bg-cyan-950/40 text-cyan-400 border border-cyan-800/30'
                        }`}>
                          {vol.status}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span>Cluster Binding</span>
                        <span className="text-slate-300 truncate max-w-[130px] font-medium text-right">
                          {linkedDeploy ? linkedDeploy.name : 'Unmounted Block'}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-slate-800 mt-4 text-[10px] uppercase font-bold text-slate-500 flex justify-between items-center font-mono">
                    <span>Provision Status</span>
                    <span className="text-cyan-400 font-bold flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> CSI_READY
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Side: Volume Mounting Orchestrator Panel */}
        <div className="bg-slate-900/40 border border-slate-800 p-5 rounded-sm shadow-lg space-y-4 h-full flex flex-col justify-between">
          {!activeVolume ? (
            <div className="py-24 text-center flex flex-col items-center justify-center text-slate-500">
              <HardDrive className="w-12 h-12 mb-4 stroke-1 text-slate-605" />
              <p className="text-xs font-bold text-slate-400 mb-1 uppercase tracking-wider">Select a Storage Volume</p>
              <p className="text-[11px] text-slate-500 max-w-[200px] mx-auto leading-relaxed">Click any block volume storage resource to manage dynamic cloud volume driver mounts and map directories.</p>
            </div>
          ) : (
            <div className="space-y-4 flex-1 flex flex-col justify-between">
              <div>
                <div className="pb-4 border-b border-slate-800 space-y-1.5">
                  <span className="text-[10px] font-mono font-bold uppercase text-cyan-400 tracking-widest">Volume Storage Handler</span>
                  <h4 className="text-base font-bold text-white font-display">{activeVolume.name}</h4>
                  <span className="text-[10px] font-semibold bg-slate-800 text-cyan-400 border border-slate-755/50 px-2 py-0.5 rounded-sm font-mono uppercase tracking-wider">
                    {activeVolume.type} • {activeVolume.sizeGB}GB
                  </span>
                </div>

                <div className="space-y-4 pt-4 text-xs font-medium text-slate-400">
                  <div className="flex justify-between border-b border-slate-800 pb-2">
                    <span>Mount Target Path</span>
                    <span className="font-mono text-cyan-400 bg-slate-950 px-2 py-0.5 border border-slate-850 rounded-sm">{activeVolume.mountPath}</span>
                  </div>

                  {activeVolume.status === 'Bound' ? (
                    <div className="space-y-3 bg-emerald-950/20 border border-emerald-900/30 p-4 rounded-sm">
                      <div className="flex gap-2 items-start text-emerald-400">
                        <CheckCircle2 className="w-4 h-4 mt-0.5 text-emerald-400" />
                        <div>
                          <span className="font-bold text-xs block uppercase tracking-wider">Volume Connection Mounted!</span>
                          <span className="text-[10px] text-slate-400 leading-normal block mt-1">
                            Driver successfully orchestrated real-time mounting to deployment <strong className="text-white">{boundDeployName}</strong>.
                          </span>
                        </div>
                      </div>
                      <button 
                        onClick={() => onDismountVolume(activeVolume.id)}
                        className="w-full py-1.5 bg-slate-950 border border-rose-900/40 hover:bg-rose-950/10 text-[10px] font-bold text-rose-450 rounded-sm shadow-sm transition-colors cursor-pointer flex items-center justify-center gap-1 hover:border-rose-800 uppercase tracking-wider"
                      >
                        <Unlink className="w-3.5 h-3.5" /> Dismount Storage Block
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-3 bg-slate-950 p-4 rounded-sm border border-slate-850">
                      <div>
                        <span className="font-bold text-white block mb-0.5 uppercase tracking-wider text-[10px]">Attach Volume to Deployment</span>
                        <p className="text-[10px] text-slate-500">Mount this network storage system dynamically to an active workload.</p>
                      </div>

                      <select 
                        value={selectedDeployId}
                        onChange={(e) => setSelectedDeployId(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-800 rounded-sm p-2 text-white font-medium focus:outline-none focus:ring-1 focus:ring-cyan-500"
                        defaultValue=""
                      >
                        <option value="" disabled className="text-slate-500">-- Select target deployment --</option>
                        {deployments.filter(d => !d.volumeClaimName).map(deploy => (
                          <option key={deploy.id} value={deploy.id} className="text-white bg-slate-900">{deploy.name}</option>
                        ))}
                      </select>

                      <button 
                        onClick={() => {
                          if (selectedDeployId) {
                            onMountVolume(activeVolume.id, selectedDeployId);
                            setSelectedDeployId('');
                          }
                        }}
                        disabled={!selectedDeployId}
                        className="w-full py-2 bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-slate-950 font-bold rounded-sm text-[10px] uppercase tracking-wider flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                      >
                        <Link className="w-3.5 h-3.5" /> Mount Block Volume
                      </button>
                    </div>
                  )}
                </div>
              </div>

              <div className="p-3 bg-slate-950 border border-slate-850 rounded-sm text-[10px] text-slate-500 leading-relaxed font-mono">
                <span className="font-bold text-slate-400 block mb-0.5 tracking-wider uppercase">💡 Storage Orchestration Guide:</span>
                KubeLite includes a CSI (Container Storage Interface) driver component. When you click "Mount", the platform updates deployment specifications instantly, enabling real-time mounting of cloud providers directly mock container directory pathways.
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Provision Volume dialog */}
      <AnimatePresence>
        {showAddVolModal && (
          <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-slate-900 w-full max-w-md p-6 shadow-2xl border border-slate-800 space-y-4 rounded-sm text-slate-100"
            >
              <div className="flex justify-between items-center pb-2 border-b border-slate-800">
                <h4 className="text-base font-bold text-white font-display uppercase tracking-widest text-xs">Provision Block Storage Volume</h4>
                <button 
                  onClick={() => setShowAddVolModal(false)}
                  className="p-1 hover:bg-slate-800 rounded-sm text-slate-400 hover:text-white transition-colors cursor-pointer"
                >
                  ✖
                </button>
              </div>

              <form onSubmit={handleCreateVolume} className="space-y-4 text-xs">
                <div className="space-y-3">
                  <div>
                    <label className="block text-slate-400 font-semibold uppercase tracking-wider text-[10px] mb-1">Volume Claim Name</label>
                    <input 
                      type="text" 
                      required
                      value={volName}
                      onChange={(e) => setVolName(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-sm px-3 py-2 text-white focus:outline-none focus:ring-1 focus:ring-cyan-500"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-slate-400 font-semibold uppercase tracking-wider text-[10px] mb-1">Class Disk size (GB)</label>
                      <input 
                        type="number" 
                        required
                        value={volSize}
                        onChange={(e) => setVolSize(Number(e.target.value))}
                        className="w-full bg-slate-950 border border-slate-800 rounded-sm px-3 py-2 text-white font-mono focus:outline-none focus:ring-1 focus:ring-cyan-500"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-400 font-semibold uppercase tracking-wider text-[10px] mb-1">CSI Driver Block Type</label>
                      <select 
                        value={volType}
                        onChange={(e) => setVolType(e.target.value as any)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-sm px-3 py-2 text-white focus:outline-none focus:ring-1 focus:ring-cyan-500"
                      >
                        <option value="AWS_EBS" className="bg-slate-900 text-slate-100">AWS Elastic Block (EBS)</option>
                        <option value="GCP_PD" className="bg-slate-900 text-slate-100">GCP Persistent Disk (PD)</option>
                        <option value="Azure_Disk" className="bg-slate-900 text-slate-100">Azure Storage Disk (VHD)</option>
                        <option value="Local_SSD" className="bg-slate-900 text-slate-100">Local SSD Scratch Block</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-slate-400 font-semibold uppercase tracking-wider text-[10px] mb-1">Path Target Directory (Inside container)</label>
                    <input 
                      type="text" 
                      required
                      value={volMountPath}
                      onChange={(e) => setVolMountPath(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-sm px-3 py-2 text-white font-mono focus:outline-none focus:ring-1 focus:ring-cyan-500"
                    />
                  </div>
                </div>

                <div className="flex gap-2.5 justify-end pt-4 border-t border-slate-800">
                  <button 
                    type="button"
                    onClick={() => setShowAddVolModal(false)}
                    className="px-4 py-2 border border-slate-800 text-slate-400 rounded-sm hover:bg-slate-850 hover:text-white transition-colors cursor-pointer text-[10px] uppercase font-bold tracking-wider"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit"
                    className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-bold rounded-sm shadow-md transition-colors cursor-pointer text-[10px] uppercase tracking-wider"
                  >
                    Provision Block
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
