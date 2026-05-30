import React, { useState, useEffect } from 'react';
import { NetworkService, Deployment, PodReplica } from '../types';
import { Network, Plus, Shuffle, Waves, Layers, Globe, Server, AlertTriangle, ArrowRight } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface ServiceDiscoveryProps {
  services: NetworkService[];
  deployments: Deployment[];
  pods: PodReplica[];
  onCreateService: (newSvc: Omit<NetworkService, 'id' | 'totalRequests' | 'activeConnections' | 'virtualIP'>) => void;
  onSendTraffic: (serviceId: string, requestsCount: number) => void;
}

export default function ServiceDiscovery({ services, deployments, pods, onCreateService, onSendTraffic }: ServiceDiscoveryProps) {
  const [selectedSvcId, setSelectedSvcId] = useState<string | null>(null);
  const [showAddService, setShowAddService] = useState(false);
  const [animations, setAnimations] = useState<{ id: number; podIp: string }[]>([]);
  const [animationCounter, setAnimationCounter] = useState(0);

  // Form states
  const [svcName, setSvcName] = useState('inventory-gateway-svc');
  const [svcDns, setSvcDns] = useState('inventory.kubelite.io');
  const [targetDeployId, setTargetDeployId] = useState('');
  const [svcPort, setSvcPort] = useState(80);
  const [svcTargetPort, setSvcTargetPort] = useState(8080);
  const [svcLbType, setSvcLbType] = useState<'Round_Robin' | 'IP_Hash'>('Round_Robin');

  const activeService = selectedSvcId ? services.find(s => s.id === selectedSvcId) : null;
  const targetDeployment = activeService ? deployments.find(d => d.id === activeService.targetDeploymentId) : null;
  const targetPods = activeService ? pods.filter(p => p.deploymentId === activeService.targetDeploymentId && p.status === 'Running') : [];

  const handleCreateService = (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetDeployId) return;

    onCreateService({
      name: svcName,
      targetDeploymentId: targetDeployId,
      dnsName: svcDns,
      port: Number(svcPort),
      targetPort: Number(svcTargetPort),
      lbType: svcLbType,
    });
    setShowAddService(false);
  };

  // Simulating animation path for load balancing traffic visualizer
  const triggerTrafficBurst = () => {
    if (!activeService || targetPods.length === 0) return;
    
    const count = 10;
    onSendTraffic(activeService.id, count);

    // Create 10 staggered visual particles
    let currentIdx = 0;
    for (let i = 0; i < count; i++) {
      setTimeout(() => {
        // Choose target pod according to Round Robin
        const targetPod = targetPods[currentIdx % targetPods.length];
        currentIdx++;
        
        const animId = Math.random();
        setAnimations(prev => [...prev, {
          id: animId,
          podIp: targetPod.ipAddress
        }]);

        // Cleanup after animation completes
        setTimeout(() => {
          setAnimations(prev => prev.filter(item => item.id !== animId));
        }, 1200);

      }, i * 150);
    }
  };

  return (
    <div className="space-y-6">
      {/* Topology Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h3 className="text-xl font-bold text-white font-display">Service Discovery & Load Balancing</h3>
          <p className="text-xs text-slate-400 font-medium">Expose workloads behind fully managed container DNS services and virtual cluster IPs with automated request balancing.</p>
        </div>
        <button 
          onClick={() => {
            if (deployments.length > 0) {
              setTargetDeployId(deployments[0].id);
            }
            setShowAddService(true);
          }}
          className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-slate-950 rounded-sm text-xs font-bold uppercase tracking-widest transition-all duration-150 flex items-center gap-1.5 cursor-pointer"
        >
          <Plus className="w-4 h-4" /> Create Service
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Columns: Services list */}
        <div className="lg:col-span-2 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {services.map(svc => {
              const deploy = deployments.find(d => d.id === svc.targetDeploymentId);
              const activePodCount = pods.filter(p => p.deploymentId === svc.targetDeploymentId && p.status === 'Running').length;
              const isSelected = selectedSvcId === svc.id;

              return (
                <div 
                   key={svc.id}
                   onClick={() => setSelectedSvcId(svc.id)}
                   className={`cursor-pointer rounded-sm border-2 p-5 transition-all duration-150 flex flex-col justify-between hover:translate-y-[-1px] ${
                     isSelected 
                       ? 'border-cyan-500 bg-slate-900 shadow-[0_0_15px_rgba(6,182,212,0.15)] text-white' 
                       : 'border-slate-800 bg-slate-900/40 hover:border-slate-700 shadow-sm text-slate-200'
                   }`}
                >
                  <div className="space-y-4">
                    <div className="flex justify-between items-start">
                      <div className="flex items-center gap-2.5">
                        <div className="p-2 bg-slate-800 rounded-sm text-cyan-400 border border-slate-700">
                          <Network className="w-4 h-4" />
                        </div>
                        <div>
                          <h4 className="text-sm font-bold text-white font-display">{svc.name}</h4>
                          <span className="text-[9px] bg-slate-850 border border-slate-700 text-cyan-400 px-1.5 py-0.5 rounded-sm font-bold font-mono tracking-widest uppercase">
                            {svc.lbType.replace('_', ' ')}
                          </span>
                        </div>
                      </div>
                      <span className="text-[10px] font-mono text-cyan-400 font-semibold">{svc.virtualIP}</span>
                    </div>

                    <div className="pt-2 space-y-1.5 border-t border-slate-800 text-xs text-slate-400">
                      <div className="flex justify-between">
                        <span>DNS Record</span>
                        <span className="text-white font-bold font-mono text-[11px]">{svc.dnsName}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Target Backend</span>
                        <span className="font-semibold text-slate-300">{deploy ? deploy.name : 'Unknown Deployment'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Ports Expose</span>
                        <span className="font-mono text-slate-400 font-semibold">
                          {svc.port} → {svc.targetPort}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>Endpoints Online</span>
                        <span className="font-mono font-bold text-white flex items-center gap-1">
                          <span className={`w-1.5 h-1.5 rounded-full ${activePodCount > 0 ? 'bg-emerald-400 animate-pulse' : 'bg-rose-450 animate-ping'}`}></span>
                          {activePodCount} backend pods
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-slate-800 mt-4 flex justify-between items-center text-[10px] uppercase font-semibold text-slate-500 font-mono">
                    <span>⚡ Balanced Hits</span>
                    <span className="text-cyan-400 font-bold text-xs">{svc.totalRequests.toLocaleString()}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Column: Interactive Balancing Traffic Simulator */}
        <div className="bg-slate-900/40 border border-slate-800 p-5 rounded-sm shadow-lg space-y-4 h-full flex flex-col justify-between">
          {!activeService ? (
            <div className="py-24 text-center flex flex-col items-center justify-center text-slate-500">
              <Waves className="w-12 h-12 mb-4 stroke-1 text-slate-600" />
              <p className="text-xs font-bold text-slate-400 mb-1 uppercase tracking-wider">Select a Network Service</p>
              <p className="text-[11px] text-slate-500 max-w-[200px] mx-auto leading-relaxed">Click any of your exposed DNS gateway services to test balancing models and simulate active web request traffic waves.</p>
            </div>
          ) : (
            <div className="space-y-4 flex-1 flex flex-col justify-between">
              <div>
                <div className="pb-4 border-b border-slate-800">
                  <span className="text-[10px] font-mono font-bold uppercase text-cyan-400 tracking-widest">Service DNS Gateway</span>
                  <h4 className="text-base font-bold text-white font-display flex items-center gap-2">
                    <Globe className="w-4 h-4 text-slate-500" /> {activeService.dnsName}
                  </h4>
                  <p className="text-[10px] text-slate-400 font-mono mt-0.5">VIP: {activeService.virtualIP} | Ports: {activeService.port}:{activeService.targetPort}</p>
                </div>

                {/* Animated Map representing LB Ingress routing to Pod targets */}
                <div className="mt-4 bg-slate-950 border border-slate-850 rounded-sm p-4 relative overflow-hidden min-h-[260px] flex flex-col justify-between">
                  
                  {/* Virtual Ingress client node */}
                  <div className="flex justify-center z-10">
                    <div className="bg-cyan-950/40 text-cyan-400 font-mono rounded-sm px-3 py-1.5 text-center text-[9px] font-bold shadow-md border border-cyan-800/40 flex items-center gap-1 uppercase tracking-wider">
                      <Waves className="w-3.5 h-3.5 fill-cyan-400 animate-pulse text-cyan-400" /> INGRESS CLIENT
                    </div>
                  </div>

                  {/* Balancing Hub Router */}
                  <div className="flex justify-center my-3 relative">
                    <div className="bg-slate-900 text-cyan-400 border border-slate-800 p-2 rounded-full shadow z-10 flex items-center justify-center">
                      <Shuffle className="w-5 h-5 text-cyan-400 animate-spin" style={{ animationDuration: '6s' }} />
                    </div>
                    <div className="absolute inset-0 flex justify-center items-center">
                      <div className="h-20 w-px bg-dashed bg-gradient-to-b from-cyan-500/40 to-cyan-500/0 opacity-50"></div>
                    </div>
                  </div>

                  {/* Target Endpoints list */}
                  <div className="space-y-1.5 z-10">
                    <span className="text-[9px] uppercase tracking-widest font-bold text-slate-555 block">ROUND ROBIN POD INSTANCES</span>
                    {targetPods.length === 0 ? (
                      <div className="text-center py-4 bg-rose-950/20 rounded-sm text-[10px] text-rose-400 border border-rose-900/30 flex items-center justify-center gap-1.5 font-bold uppercase tracking-wider">
                        <AlertTriangle className="w-4 h-4" /> Zero stable targets are online!
                      </div>
                    ) : (
                      <div className="space-y-1">
                        {targetPods.map(pod => {
                          // Check if active target animation
                          const hasAnimated = animations.some(a => a.podIp === pod.ipAddress);

                          return (
                            <div 
                              key={pod.id}
                              className={`bg-slate-900/60 rounded-sm p-2 border transition-all duration-300 flex items-center justify-between text-[10px] ${
                                hasAnimated ? 'border-cyan-500 bg-slate-90 w-full shadow-[0_0_10px_rgba(6,182,212,0.1)] translate-x-[2px]' : 'border-slate-800'
                              }`}
                            >
                              <div className="flex items-center gap-1.5 font-mono text-slate-350">
                                <Server className="w-3.5 h-3.5 text-slate-500" />
                                <span>{pod.name.split('-').slice(-1)}</span>
                                <span className="text-slate-500 text-[9px]">({pod.ipAddress})</span>
                              </div>
                              
                              <AnimatePresence>
                                {hasAnimated && (
                                  <motion.span 
                                    initial={{ scale: 0.7, opacity: 0 }}
                                    animate={{ scale: 1, opacity: 1 }}
                                    exit={{ scale: 0.7, opacity: 0 }}
                                    className="bg-cyan-500 text-slate-950 font-bold text-[8px] tracking-widest uppercase px-1.5 py-0.5 rounded-sm animate-pulse"
                                  >
                                    BALANCED HIT
                                  </motion.span>
                                )}
                              </AnimatePresence>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="space-y-3 pt-3 border-t border-slate-800">
                <button 
                  onClick={triggerTrafficBurst}
                  disabled={targetPods.length === 0}
                  className="w-full py-2 bg-cyan-600 hover:bg-cyan-500 text-slate-950 text-xs font-bold rounded-sm shadow-sm transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed uppercase tracking-wider text-[10px]"
                >
                  <Waves className="w-4 h-4" /> Send HTTP Request Wave (x10)
                </button>
                <p className="text-[10px] text-slate-500 text-center leading-relaxed">
                  Sends ten separate clients requesting this service, simulating immediate balancing of traffic across active pod containers behind DNS routing.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Expose virtual service creation modal */}
      <AnimatePresence>
        {showAddService && (
          <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-slate-900 w-full max-w-md p-6 shadow-2xl border border-slate-800 space-y-4 rounded-sm text-slate-100"
            >
              <div className="flex justify-between items-center pb-2 border-b border-slate-800">
                <h4 className="text-base font-bold text-white font-display uppercase tracking-widest text-xs">Expose Virtual IP Service</h4>
                <button 
                  onClick={() => setShowAddService(false)}
                  className="p-1 hover:bg-slate-800 rounded-sm text-slate-400 hover:text-white transition-colors cursor-pointer"
                >
                  ✖
                </button>
              </div>

              <form onSubmit={handleCreateService} className="space-y-4 text-xs">
                <div className="space-y-3">
                  <div>
                    <label className="block text-slate-400 font-semibold uppercase tracking-wider text-[10px] mb-1">Service Name</label>
                    <input 
                      type="text" 
                      required
                      value={svcName}
                      onChange={(e) => setSvcName(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-sm px-3 py-2 text-white focus:outline-none focus:ring-1 focus:ring-cyan-500"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-400 font-semibold uppercase tracking-wider text-[10px] mb-1">Exposed DNS Name</label>
                    <input 
                      type="text" 
                      required
                      value={svcDns}
                      onChange={(e) => setSvcDns(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-sm px-3 py-2 text-white font-mono focus:outline-none focus:ring-1 focus:ring-cyan-500"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-400 font-semibold uppercase tracking-wider text-[10px] mb-1">Target Application Workload</label>
                    <select 
                      value={targetDeployId}
                      onChange={(e) => setTargetDeployId(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-sm px-3 py-2 text-white focus:outline-none focus:ring-1 focus:ring-cyan-500"
                    >
                      <option value="" disabled className="text-slate-500">Select Target Deployment</option>
                      {deployments.map(d => (
                        <option key={d.id} value={d.id} className="text-slate-100 bg-slate-900">{d.name} ({d.image})</option>
                      ))}
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-slate-400 font-semibold uppercase tracking-wider text-[10px] mb-1">External Port</label>
                      <input 
                        type="number" 
                        required
                        value={svcPort}
                        onChange={(e) => setSvcPort(Number(e.target.value))}
                        className="w-full bg-slate-950 border border-slate-800 rounded-sm px-3 py-2 text-white font-mono focus:outline-none focus:ring-1 focus:ring-cyan-500"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-400 font-semibold uppercase tracking-wider text-[10px] mb-1">Container Pod Target Port</label>
                      <input 
                        type="number" 
                        required
                        value={svcTargetPort}
                        onChange={(e) => setSvcTargetPort(Number(e.target.value))}
                        className="w-full bg-slate-950 border border-slate-800 rounded-sm px-3 py-2 text-white font-mono focus:outline-none focus:ring-1 focus:ring-cyan-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-slate-400 font-semibold uppercase tracking-wider text-[10px] mb-1">Load Balancing Strategy</label>
                    <select 
                      value={svcLbType}
                      onChange={(e) => setSvcLbType(e.target.value as 'Round_Robin' | 'IP_Hash')}
                      className="w-full bg-slate-950 border border-slate-800 rounded-sm px-3 py-2 text-white focus:outline-none focus:ring-1 focus:ring-cyan-500"
                    >
                      <option value="Round_Robin" className="text-slate-100 bg-slate-900">Round Robin (Classic Ring Distribution)</option>
                      <option value="IP_Hash" className="text-slate-100 bg-slate-900">IP Hash (Client IP Affinity)</option>
                    </select>
                  </div>
                </div>

                <div className="flex gap-2.5 justify-end pt-4 border-t border-slate-800">
                  <button 
                    type="button"
                    onClick={() => setShowAddService(false)}
                    className="px-4 py-2 border border-slate-800 text-slate-400 rounded-sm hover:bg-slate-850 hover:text-white transition-colors cursor-pointer text-[10px] uppercase font-bold tracking-wider"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit"
                    className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-bold rounded-sm shadow-md transition-colors cursor-pointer text-[10px] uppercase tracking-wider"
                  >
                    Expose Service IP
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
