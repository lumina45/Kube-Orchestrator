import { useState, useEffect } from 'react';
import { 
  ClusterNode, 
  Deployment, 
  PodReplica, 
  StorageVolume, 
  NetworkService, 
  ConfigurationItem, 
  ClusterEvent,
  PodStatus
} from './types';
import { 
  INITIAL_NODES, 
  INITIAL_DEPLOYMENTS, 
  INITIAL_PODS, 
  INITIAL_SERVICES, 
  INITIAL_VOLUMES, 
  INITIAL_CONFIGURATIONS, 
  INITIAL_EVENTS 
} from './data';

import DashboardOverview from './components/DashboardOverview';
import WorkloadsManager from './components/WorkloadsManager';
import ServiceDiscovery from './components/ServiceDiscovery';
import StorageOrchestration from './components/StorageOrchestration';
import SecretsConfig from './components/SecretsConfig';
import YAMLDeployer from './components/YAMLDeployer';
import TerminalLogs from './components/TerminalLogs';

import { 
  Server, 
  Activity, 
  Globe, 
  HardDrive, 
  Lock, 
  Terminal as TermIcon, 
  FolderPlus, 
  CheckCircle,
  HelpCircle
} from 'lucide-react';
import { motion } from 'motion/react';

interface ActiveRolloutItem {
  deploymentId: string;
  newImage: string;
  targetReplicas: number;
  completedCount: number;
  originalPodsList: string[]; // Pod IDs to decommission
  newPodsList: string[]; // Pod IDs created
}

export default function App() {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'workloads' | 'networking' | 'storage' | 'secrets' | 'declarative'>('dashboard');

  // State Store
  const [nodes, setNodes] = useState<ClusterNode[]>(INITIAL_NODES);
  const [deployments, setDeployments] = useState<Deployment[]>(INITIAL_DEPLOYMENTS);
  const [pods, setPods] = useState<PodReplica[]>(INITIAL_PODS);
  const [volumes, setVolumes] = useState<StorageVolume[]>(INITIAL_VOLUMES);
  const [services, setServices] = useState<NetworkService[]>(INITIAL_SERVICES);
  const [configs, setConfigs] = useState<ConfigurationItem[]>(INITIAL_CONFIGURATIONS);
  const [logs, setLogs] = useState<ClusterEvent[]>(INITIAL_EVENTS);

  // Rollout processes tracker
  const [activeRollouts, setActiveRollouts] = useState<Record<string, ActiveRolloutItem>>({});

  // Help Map for component mapping
  const deploymentsMap = deployments.reduce((acc, d) => {
    acc[d.id] = d.name;
    return acc;
  }, {} as Record<string, string>);

  // Helper: Append log
  const pushLog = (
    component: ClusterEvent['component'], 
    type: ClusterEvent['type'], 
    message: string
  ) => {
    const newEvent: ClusterEvent = {
      id: `evt-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      timestamp: new Date().toISOString(),
      component,
      type,
      message,
    };
    setLogs(prev => [...prev, newEvent]);
  };

  // Node allocator helper - chooses nodes with least current allocated footprint (simplifies multi-cloud scheduler)
  const findLeastLoadedNode = (cpu: number, ram: number) => {
    // Filter Ready nodes
    const readyNodes = nodes.filter(n => n.status === 'Ready');
    if (readyNodes.length === 0) return null;

    // Find node that has capacity and lowest allocated CPU percentage
    const sorted = [...readyNodes].sort((a, b) => {
      const loadA = a.cpuAllocated / a.cpuCapacity;
      const loadB = b.cpuAllocated / b.cpuCapacity;
      return loadA - loadB;
    });

    const target = sorted[0];
    if (target.cpuAllocated + cpu <= target.cpuCapacity && target.ramAllocated + ram <= target.ramCapacity) {
      return target.id;
    }

    // Try finding any node that fits
    for (const n of sorted) {
      if (n.cpuAllocated + cpu <= n.cpuCapacity && n.ramAllocated + ram <= n.ramCapacity) {
        return n.id;
      }
    }
    return target.id; // Fallback to avoid starvation, simulate resource scheduling
  };

  // State modifier: allocate node resources
  const adjustNodeResources = (nodeId: string, cpuDelta: number, ramDelta: number) => {
    setNodes(prev => prev.map(n => {
      if (n.id === nodeId) {
        return {
          ...n,
          cpuAllocated: Math.max(0, Math.min(n.cpuCapacity, n.cpuAllocated + cpuDelta)),
          ramAllocated: Math.max(0, Math.min(n.ramCapacity, n.ramAllocated + ramDelta)),
        };
      }
      return n;
    }));
  };

  // App tick scheduler: handles self-healing & rolling rollouts simulation
  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date().toISOString();

      // --- SECTION 1: SELF-HEALING ENGINE ---
      // 1. Identify any manually killed/failed pods and cycle them back to 'Restarting' -> 'Running'
      setPods(currentPods => {
        let changed = false;
        const nextPods = currentPods.map(pod => {
          if (pod.status === 'Failed') {
            changed = true;
            pushLog(
              'SelfHealing', 
              'warning', 
              `Scheduler detected liveness failure on pod "${pod.name}". Initiating automatic container replacement.`
            );
            return {
              ...pod,
              status: 'Restarting' as PodStatus
            };
          } else if (pod.status === 'Restarting') {
            changed = true;
            // Generate a fresh IP simulation
            const segment3 = Math.floor(Math.random() * 4) + 1;
            const segment4 = Math.floor(Math.random() * 254) + 1;
            const newIp = `10.244.${segment3}.${segment4}`;
            
            const deploy = deployments.find(d => d.id === pod.deploymentId);
            const isRolling = deploy?.status === 'Rolling';

            pushLog(
              'SelfHealing', 
              'success', 
              `Container replaced successfully on host node. Registered replica "${pod.name}" online at IP ${newIp}.`
            );

            return {
              ...pod,
              status: 'Running' as PodStatus,
              ipAddress: newIp,
              restartsCount: pod.restartsCount + 1,
              unhealthyCount: 0
            };
          }
          return pod;
        });

        return nextPods;
      });

      // 2. Scheduler reconciliation: ensure actual running pods align with `replicasNeeded` per deployment
      deployments.forEach(deploy => {
        // Skip deployment if it is actively undergoing a rolling rollout (rollout system handles its scaling)
        if (deploy.status === 'Rolling') return;

        const deployPods = pods.filter(p => p.deploymentId === deploy.id);
        const nonFailedPods = deployPods.filter(p => p.status !== 'Failed');

        // Case A: Need more replicas (Scale up / Self-heal missing node)
        if (nonFailedPods.length < deploy.replicasNeeded) {
          const diff = deploy.replicasNeeded - nonFailedPods.length;
          
          pushLog(
            'Scheduler', 
            'info', 
            `Reconciliation loop: "${deploy.name}" demands ${deploy.replicasNeeded} replicas, but only ${nonFailedPods.length} are ready. Launching ${diff} new pod agent(s).`
          );

          for (let i = 0; i < diff; i++) {
            const nodeId = findLeastLoadedNode(deploy.cpuPerPod, deploy.ramPerPod);
            if (!nodeId) continue;

            const segment3 = Math.floor(Math.random() * 4) + 1;
            const segment4 = Math.floor(Math.random() * 254) + 1;
            const ipAddress = `10.244.${segment3}.${segment4}`;
            const randSuffix = Math.random().toString(36).substr(2, 5);
            const podName = `${deploy.name}-${randSuffix}`;

            const newPod: PodReplica = {
              id: `pod-${Date.now()}-${randSuffix}`,
              name: podName,
              deploymentId: deploy.id,
              nodeId,
              status: 'Pending',
              ipAddress,
              createdAt: now,
              restartsCount: 0,
              unhealthyCount: 0
            };

            setPods(prev => [...prev, newPod]);
            adjustNodeResources(nodeId, deploy.cpuPerPod, deploy.ramPerPod);

            // Stagger transition Pending -> Running
            setTimeout(() => {
              setPods(prev => prev.map(p => p.id === newPod.id ? { ...p, status: 'Running' } : p));
              pushLog('Scheduler', 'success', `Scheduled pod "${podName}" assigned successfully to cloud agent node.`);
            }, 1500);
          }
        }

        // Case B: Scaling down (Too many replicas)
        if (nonFailedPods.length > deploy.replicasNeeded) {
          const excessCount = nonFailedPods.length - deploy.replicasNeeded;
          pushLog(
            'Scheduler', 
            'info', 
            `Reconciliation loop: "${deploy.name}" has excess instances (Found ${nonFailedPods.length}, needs ${deploy.replicasNeeded}). Terminating ${excessCount} old replica(s).`
          );

          // Get excess pods to delete (prefer deleting Pending/Restarting ones, or oldest ones)
          const surplusPods = nonFailedPods.slice(0, excessCount);
          surplusPods.forEach(p => {
            setPods(prev => prev.filter(item => item.id !== p.id));
            if (p.nodeId) {
              adjustNodeResources(p.nodeId, -deploy.cpuPerPod, -deploy.ramPerPod);
            }
          });
        }
      });

      // --- SECTION 2: ROLLING UPDATE ROLLOUT CONTROLLER ---
      const activeRolloutsList = Object.values(activeRollouts) as ActiveRolloutItem[];
      if (activeRolloutsList.length > 0) {
        const rolloutObj = activeRolloutsList[0]; // Process first rollout queue item
        const deploy = deployments.find(d => d.id === rolloutObj.deploymentId);

        if (deploy) {
          const oldDecommissionBatch = rolloutObj.originalPodsList.filter(pid => pods.some(p => p.id === pid));
          
          if (oldDecommissionBatch.length > 0) {
            // Take 1 pod to decommission
            const podToDecom = oldDecommissionBatch[0];
            const matchingPod = pods.find(p => p.id === podToDecom);

            if (matchingPod) {
              pushLog(
                'Rollout', 
                'info', 
                `[Rollout R${deploy.currentRevision}] Terminating older replica pod "${matchingPod.name}"...`
              );

              // 1. Delete matching old pod
              setPods(prev => prev.filter(p => p.id !== podToDecom));
              if (matchingPod.nodeId) {
                adjustNodeResources(matchingPod.nodeId, -deploy.cpuPerPod, -deploy.ramPerPod);
              }

              // 2. Schedule single brand new pod node with updated image
              const randSuffix = Math.random().toString(36).substr(2, 5);
              const nodeAlloc = findLeastLoadedNode(deploy.cpuPerPod, deploy.ramPerPod) || 'node-gcp-1';
              const ipGen = `10.244.${Math.floor(Math.random() * 4) + 1}.${Math.floor(Math.random() * 254) + 1}`;
              const newPodName = `${deploy.name}-v${deploy.currentRevision}-${randSuffix}`;

              const newPod: PodReplica = {
                id: `pod-new-${Date.now()}-${randSuffix}`,
                name: newPodName,
                deploymentId: deploy.id,
                nodeId: nodeAlloc,
                status: 'Running', // Spawn running to look fast and responsive
                ipAddress: ipGen,
                createdAt: now,
                restartsCount: 0,
                unhealthyCount: 0
              };

              setPods(prev => [...prev, newPod]);
              adjustNodeResources(nodeAlloc, deploy.cpuPerPod, deploy.ramPerPod);

              pushLog(
                'Rollout', 
                'success', 
                `[Rollout R${deploy.currentRevision}] Successfully deployed active replica "${newPodName}" running image "${rolloutObj.newImage}".`
              );

              // Update active rollout state
              setActiveRollouts(prev => {
                const item = prev[deploy.id];
                const cleanOriginal = item.originalPodsList.filter(id => id !== podToDecom);
                const complete = cleanOriginal.length === 0;

                if (complete) {
                  // Finish Rollout
                  setTimeout(() => {
                    setDeployments(deploysList => deploysList.map(d => {
                      if (d.id === deploy.id) {
                        return { ...d, status: 'Healthy', image: item.newImage };
                      }
                      return d;
                    }));
                    pushLog(
                      'Rollout', 
                      'success', 
                      `Dynamic rolling update for "${deploy.name}" finished without any cluster outage. Promoted to Revision R${deploy.currentRevision}.`
                    );
                  }, 1000);

                  const nextState = { ...prev };
                  delete nextState[deploy.id];
                  return nextState;
                }

                return {
                  ...prev,
                  [deploy.id]: {
                    ...item,
                    originalPodsList: cleanOriginal,
                    completedCount: item.completedCount + 1
                  }
                };
              });
            }
          }
        }
      }

    }, 3000);

    return () => clearInterval(interval);
  }, [nodes, deployments, pods, activeRollouts]);

  // ACTION: SCALE WORKLOAD REPLICAS
  const handleScale = (deployId: string, isIncrement: boolean) => {
    setDeployments(prev => prev.map(d => {
      if (d.id === deployId) {
        const originalVal = d.replicasNeeded;
        const nextVal = isIncrement ? originalVal + 1 : Math.max(1, originalVal - 1);
        if (originalVal !== nextVal) {
          pushLog(
            'Scheduler', 
            'info', 
            `Scale Request: Resizing replicas for workload "${d.name}" from ${originalVal} to ${nextVal}.`
          );
        }
        return { ...d, replicasNeeded: nextVal };
      }
      return d;
    }));
  };

  // ACTION: START AUTOMATED ROLLOUT DEPLOYMENT (Update Image)
  const handleRollout = (deployId: string, newImage: string) => {
    const deploy = deployments.find(d => d.id === deployId);
    if (!deploy) return;

    if (deploy.status === 'Rolling') {
      pushLog('Rollout', 'warning', `Wait, cannot trigger rollout. A rolling deploy is already running on "${deploy.name}".`);
      return;
    }

    const currentDeployPods = pods.filter(p => p.deploymentId === deployId).map(p => p.id);
    const nextRevision = deploy.currentRevision + 1;

    pushLog(
      'Rollout', 
      'info', 
      `Initiating Automated Rolling update for "${deploy.name}". Upgrade target: "${newImage}".`
    );

    // 1. Update deployment's current state to Rolling, increment revision stats
    setDeployments(prev => prev.map(d => {
      if (d.id === deployId) {
        return {
          ...d,
          status: 'Rolling',
          currentRevision: nextRevision,
          revisionHistory: [
            ...d.revisionHistory,
            {
              revision: nextRevision,
              image: newImage,
              replicas: d.replicasNeeded,
              updatedAt: new Date().toISOString()
            }
          ]
        };
      }
      return d;
    }));

    // 2. Record Active Rollout queue to decouple execution across interval ticks
    setActiveRollouts(prev => ({
      ...prev,
      [deployId]: {
        deploymentId: deployId,
        newImage,
        targetReplicas: deploy.replicasNeeded,
        completedCount: 0,
        originalPodsList: currentDeployPods,
        newPodsList: []
      }
    }));
  };

  // ACTION: TRIGGER AUTOMATED ROLLBACK (Revert Revision)
  const handleRollback = (deployId: string) => {
    const deploy = deployments.find(d => d.id === deployId);
    if (!deploy || deploy.revisionHistory.length <= 1) return;

    // Grab second to last history item
    const prevHistoryItem = deploy.revisionHistory[deploy.revisionHistory.length - 2];
    pushLog(
      'Rollout', 
      'info', 
      `Rollback Command: Restoring workload "${deploy.name}" back to revision R${prevHistoryItem.revision} ("${prevHistoryItem.image}").`
    );

    handleRollout(deployId, prevHistoryItem.image);
  };

  // ACTION: INFLICT FORCE KILL / TERMINATION (Simulating Crash)
  const handleKillPod = (podId: string) => {
    const matchingPod = pods.find(p => p.id === podId);
    if (!matchingPod) return;

    // Set pod status to Failed
    setPods(prev => prev.map(p => {
      if (p.id === podId) {
        return { ...p, status: 'Failed', unhealthyCount: 1 };
      }
      return p;
    }));

    pushLog(
      'SelfHealing', 
      'danger', 
      `CRASH INTRUSION: Manual hardware failure mock triggered on replica "${matchingPod.name}".`
    );
  };

  // ACTION: PROVISION STORAGE BLOCK VOLUME
  const handleProvisionVolume = (newVol: Omit<StorageVolume, 'id' | 'status' | 'boundDeploymentId'>) => {
    const created: StorageVolume = {
      ...newVol,
      id: `vol-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      status: 'Available',
      boundDeploymentId: null,
    };

    setVolumes(prev => [...prev, created]);
    pushLog(
      'Storage', 
      'success', 
      `CSI Driver: Provisioned cloud block disk claim "${created.name}" (${created.sizeGB}GB type ${created.type}) successfully.`
    );
  };

  // ACTION: DYNAMIC MOUNT STORAGE BLOCK TO ACTIVE WORKLOAD
  const handleMountVolume = (volumeId: string, deployId: string) => {
    const deploy = deployments.find(d => d.id === deployId);
    const vol = volumes.find(v => v.id === volumeId);

    if (!deploy || !vol) return;

    // Update volume bound status
    setVolumes(prev => prev.map(v => {
      if (v.id === volumeId) {
        return { ...v, status: 'Bound', boundDeploymentId: deployId };
      }
      return v;
    }));

    // Update target deployment spec
    setDeployments(prev => prev.map(d => {
      if (d.id === deployId) {
        return { ...d, volumeClaimName: vol.name };
      }
      return d;
    }));

    pushLog(
      'Storage', 
      'info', 
      `Mounting Volume Claim: Bound disk "${vol.name}" onto deployment "${deploy.name}" at directory target "${vol.mountPath}".`
    );
  };

  // ACTION: DISMOUNT MOUNTED STORAGE BLOCK
  const handleDismountVolume = (volumeId: string) => {
    const vol = volumes.find(v => v.id === volumeId);
    if (!vol) return;

    const deployId = vol.boundDeploymentId;

    // Dismount volume status
    setVolumes(prev => prev.map(v => {
      if (v.id === volumeId) {
        return { ...v, status: 'Available', boundDeploymentId: null };
      }
      return v;
    }));

    // Free deployment reference
    if (deployId) {
      setDeployments(prev => prev.map(d => {
        if (d.id === deployId) {
          return { ...d, volumeClaimName: null };
        }
        return d;
      }));

      const deploy = deployments.find(d => d.id === deployId);
      if (deploy) {
        pushLog(
          'Storage', 
          'info', 
          `Unmounting Volume Claim: Dismounted storage block disk "${vol.name}" from deployment "${deploy.name}".`
        );
      }
    }
  };

  // ACTION: NEW ENDPOINT SERVICE DISCOVERY IP CREATED
  const handleCreateService = (newSvc: Omit<NetworkService, 'id' | 'totalRequests' | 'activeConnections' | 'virtualIP'>) => {
    // Generate virtual Cluster ip
    const genVIP = `10.96.${Math.floor(Math.random() * 254) + 1}.${Math.floor(Math.random() * 254) + 1}`;
    
    const created: NetworkService = {
      ...newSvc,
      id: `svc-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      virtualIP: genVIP,
      totalRequests: 0,
      activeConnections: 0,
    };

    setServices(prev => [...prev, created]);
    
    // Bind service to target deployment
    setDeployments(prev => prev.map(d => {
      if (d.id === newSvc.targetDeploymentId) {
        return { ...d, serviceId: created.id };
      }
      return d;
    }));

    pushLog(
      'LoadBalancer', 
      'success', 
      `Inbound Router: Exposing cluster Service Gateway. IP ${genVIP} assigned. Proxy DNS "${created.dnsName}" configured.`
    );
  };

  // ACTION: SIMULATE BALANCER INCOMING WEB TRAFFIC HITS
  const handleSendTraffic = (serviceId: string, count: number) => {
    setServices(prev => prev.map(s => {
      if (s.id === serviceId) {
        return {
          ...s,
          totalRequests: s.totalRequests + count,
          activeConnections: Math.min(20, Math.floor(Math.random() * 5) + 3)
        };
      }
      return s;
    }));
    
    const svc = services.find(s => s.id === serviceId);
    if (svc) {
      pushLog(
        'LoadBalancer', 
        'info', 
        `LoadBalancer: Balancing wave of ${count} requests for "${svc.dnsName}" using ${svc.lbType} across online backend pod IPs.`
      );
    }
  };

  // ACTION: CREATING KEY ENVIRONMENT RESOURCE
  const handleCreateConfig = (newItem: Omit<ConfigurationItem, 'id' | 'createdAt'>) => {
    const created: ConfigurationItem = {
      ...newItem,
      id: `config-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      createdAt: new Date().toISOString(),
    };

    setConfigs(prev => [...prev, created]);
    pushLog(
      'Secrets', 
      'success', 
      `Resource Injected: Secured Cluster Configuration file "${created.name}" stored in vault environment.`
    );
  };

  // ACTION: DELETE CONFIGURATION ELEMENT
  const handleDeleteConfig = (id: string) => {
    const matching = configs.find(c => c.id === id);
    if (matching) {
      setConfigs(prev => prev.filter(c => c.id !== id));
      pushLog(
        'Secrets', 
        'info', 
        `Decoupled Config: Deleted stored cluster variable configuration: "${matching.name}"`
      );
    }
  };

  // ACTION: PARSING AND CREATING RESOURCE VIA DECLARATIVE KUBERNETES-LIKE YAML API
  const handleDeployYAML = (yamlType: string, parsedData: any) => {
    const now = new Date().toISOString();
    const cleanKind = yamlType.toLowerCase();

    if (cleanKind.includes('deployment')) {
      const name = parsedData.name || 'billing-api-service';
      const image = parsedData.image || 'node:20-alpine';
      const replicasNeeded = Number(parsedData.replicas) || 2;
      
      const newDeploy: Deployment = {
        id: `deploy-${Date.now()}`,
        name,
        image,
        replicasNeeded,
        status: 'Healthy',
        cpuPerPod: 0.5,
        ramPerPod: 1.0,
        volumeClaimName: null,
        serviceId: null,
        currentRevision: 1,
        revisionHistory: [
          {
            revision: 1,
            image,
            replicas: replicasNeeded,
            updatedAt: now
          }
        ],
        envVars: [],
        healthCheckPath: parsedData.path || '/healthz',
        healthCheckInterval: 10,
        lastRolloutTime: now
      };

      setDeployments(prev => [...prev, newDeploy]);
      pushLog(
        'Scheduler', 
        'success', 
        `Declarative API: Applied Deployment "${newDeploy.name}". Reconciling ${replicasNeeded} replicas across multi-cloud.`
      );
    } 
    else if (cleanKind.includes('service')) {
      const name = parsedData.name || 'billing-svc';
      const dnsName = parsedData.dnsName || 'billing.kubelite.io';
      const policy = (parsedData.loadBalancingPolicy || 'Round_Robin') as any;

      // Find recently created deployment to map service
      const possibleDeploy = deployments.find(d => d.name === (parsedData.selector || 'billing-api-service')) || deployments[0];

      const newSvc: NetworkService = {
        id: `svc-${Date.now()}`,
        name,
        targetDeploymentId: possibleDeploy ? possibleDeploy.id : 'deploy-web-portal',
        dnsName,
        virtualIP: `10.96.${Math.floor(Math.random() * 254) + 1}.${Math.floor(Math.random() * 254) + 1}`,
        port: Number(parsedData.port) || 80,
        targetPort: Number(parsedData.targetPort) || 3000,
        lbType: policy,
        totalRequests: 0,
        activeConnections: 0,
      };

      setServices(prev => [...prev, newSvc]);
      pushLog(
        'LoadBalancer', 
        'success', 
        `Declarative API: Exposing exposed DNS mapping "${dnsName}" on Cluster VIP ${newSvc.virtualIP}.`
      );
    } 
    else if (cleanKind.includes('volume') || cleanKind.includes('claim')) {
      const name = parsedData.name || 'billing-db-storage';
      const prov = (parsedData.storageProvider || 'AWS_EBS') as any;
      const sizeStr = parsedData.storage || '100G';
      const size = Number(sizeStr.replace(/[^0-9]/g, '')) || 100;

      const newVol: StorageVolume = {
        id: `vol-${Date.now()}`,
        name,
        sizeGB: size,
        type: prov,
        mountPath: parsedData.mountPath || '/data/db',
        status: 'Available',
        boundDeploymentId: null,
      };

      setVolumes(prev => [...prev, newVol]);
      pushLog(
        'Storage', 
        'success', 
        `Declarative API: Claim for cloud Persistent Volume claim "${name}" allocated successfully.`
      );
    } 
    else if (cleanKind.includes('secret')) {
      const name = parsedData.name || 'stripe-gateway-token';
      const cleanData: Record<string, string> = {};
      
      // Parse key values from payload
      Object.entries(parsedData).forEach(([k, v]) => {
        if (!['apiVersion', 'kind', 'metadata', 'name'].includes(k)) {
          cleanData[k] = v as string;
        }
      });

      const newSec: ConfigurationItem = {
        id: `config-${Date.now()}`,
        name,
        type: 'Secret',
        data: cleanData,
        createdAt: now,
      };

      setConfigs(prev => [...prev, newSec]);
      pushLog(
        'Secrets', 
        'success', 
        `Declarative API: Applied Secure Secrets resource map file "${name}" to cryptographic vault.`
      );
    }
  };

  const clearEventLogs = () => {
    setLogs([]);
    pushLog('Scheduler', 'info', 'Cluster System Console Event log cleared by Administrator.');
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 font-sans antialiased pb-12">
      
      {/* Dynamic Nav Header Bar */}
      <header className="bg-slate-900/50 backdrop-blur-md border-b border-slate-800 sticky top-0 z-30 shadow-[0_4px_20px_rgba(0,0,0,0.3)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-cyan-500 rounded-sm rotate-45 flex items-center justify-center shadow-[0_0_12px_rgba(6,182,212,0.3)]">
              <div className="w-4 h-4 border-2 border-slate-950 -rotate-45"></div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold text-white tracking-tight font-display">KORE<span className="text-cyan-500 font-light underline underline-offset-4 decoration-1 ml-1 font-sans">OS</span></h1>
                <span className="bg-cyan-500/10 text-cyan-400 text-[9px] font-mono font-bold px-2 py-0.5 rounded-sm border border-cyan-500/20 uppercase tracking-widest leading-none">v1.2-STABLE</span>
              </div>
              <p className="text-[10px] text-slate-400 mt-1 font-mono leading-none tracking-tight">KubeLite Multi-Cloud Container Orchestration Panel</p>
            </div>
          </div>

          {/* Quick SLA Status badge */}
          <div className="flex gap-4 text-xs font-semibold self-stretch justify-between md:justify-end">
            <div className="flex items-center gap-2 px-3 py-1 bg-slate-800 rounded-full border border-slate-700">
              <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]"></div>
              <span className="text-xs font-mono tracking-tighter text-slate-300">PROD-US-WEST-01</span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Panel Content container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-6 space-y-6">
        
        {/* Module navigation tabs selector */}
        <div className="flex overflow-x-auto bg-slate-900/40 backdrop-blur-md border border-slate-800 p-1 rounded-sm gap-1 shadow-sm whitespace-nowrap">
          <button
            id="tab-dashboard"
            onClick={() => setActiveTab('dashboard')}
            className={`px-4 py-2.5 rounded-sm font-sans text-[11px] font-bold uppercase tracking-wider transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'dashboard' 
                ? 'bg-cyan-600/90 text-white shadow-[0_0_10px_rgba(6,182,212,0.15)]' 
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
            }`}
          >
            <Server className="w-4 h-4 text-cyan-400" /> Real-time Nodes
          </button>
          <button
            id="tab-workloads"
            onClick={() => setActiveTab('workloads')}
            className={`px-4 py-2.5 rounded-sm font-sans text-[11px] font-bold uppercase tracking-wider transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'workloads' 
                ? 'bg-cyan-600/90 text-white shadow-[0_0_10px_rgba(6,182,212,0.15)]' 
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
            }`}
          >
            <Activity className="w-4 h-4 text-cyan-400" /> Workloads
          </button>
          <button
            id="tab-networking"
            onClick={() => setActiveTab('networking')}
            className={`px-4 py-2.5 rounded-sm font-sans text-[11px] font-bold uppercase tracking-wider transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'networking' 
                ? 'bg-cyan-600/90 text-white shadow-[0_0_10px_rgba(6,182,212,0.15)]' 
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
            }`}
          >
            <Globe className="w-4 h-4 text-cyan-400" /> Networking
          </button>
          <button
            id="tab-storage"
            onClick={() => setActiveTab('storage')}
            className={`px-4 py-2.5 rounded-sm font-sans text-[11px] font-bold uppercase tracking-wider transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'storage' 
                ? 'bg-cyan-600/90 text-white shadow-[0_0_10px_rgba(6,182,212,0.15)]' 
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
            }`}
          >
            <HardDrive className="w-4 h-4 text-cyan-400" /> Storage Mounts
          </button>
          <button
            id="tab-secrets"
            onClick={() => setActiveTab('secrets')}
            className={`px-4 py-2.5 rounded-sm font-sans text-[11px] font-bold uppercase tracking-wider transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'secrets' 
                ? 'bg-cyan-600/90 text-white shadow-[0_0_10px_rgba(6,182,212,0.15)]' 
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
            }`}
          >
            <Lock className="w-4 h-4 text-cyan-400" /> Configuration Vault
          </button>
          <button
            id="tab-declarative"
            onClick={() => setActiveTab('declarative')}
            className={`px-4 py-2.5 rounded-sm font-sans text-[11px] font-bold uppercase tracking-wider transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'declarative' 
                ? 'bg-cyan-600/90 text-white shadow-[0_0_10px_rgba(6,182,212,0.15)]' 
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
            }`}
          >
            <TermIcon className="w-4 h-4 text-cyan-400" /> Declarative YAML
          </button>
        </div>

        {/* Tab content viewer layout */}
        <div className="min-h-[460px]">
          {activeTab === 'dashboard' && (
            <DashboardOverview
              nodes={nodes}
              deployments={deployments}
              pods={pods}
              volumes={volumes}
              services={services}
              configs={configs}
              deploymentsMap={deploymentsMap}
              onKillPod={handleKillPod}
            />
          )}

          {activeTab === 'workloads' && (
            <WorkloadsManager
              deployments={deployments}
              pods={pods}
              volumes={volumes}
              configs={configs}
              onScale={handleScale}
              onRollout={handleRollout}
              onRollback={handleRollback}
              onKillPodState={handleKillPod}
              onCreateDeployment={(newDep) => {
                const now = new Date().toISOString();
                const created: Deployment = {
                  ...newDep,
                  id: `deploy-${Date.now()}`,
                  status: 'Healthy',
                  currentRevision: 1,
                  revisionHistory: [
                    {
                      revision: 1,
                      image: newDep.image,
                      replicas: newDep.replicasNeeded,
                      updatedAt: now
                    }
                  ],
                  lastRolloutTime: now
                };

                setDeployments(prev => [...prev, created]);
                pushLog('Scheduler', 'success', `Workload Deployment "${created.name}" created successfully. Initiating replica scheduling.`);
              }}
            />
          )}

          {activeTab === 'networking' && (
            <ServiceDiscovery
              services={services}
              deployments={deployments}
              pods={pods}
              onCreateService={handleCreateService}
              onSendTraffic={handleSendTraffic}
            />
          )}

          {activeTab === 'storage' && (
            <StorageOrchestration
              volumes={volumes}
              deployments={deployments}
              onMountVolume={handleMountVolume}
              onDismountVolume={handleDismountVolume}
              onProvisionVolume={handleProvisionVolume}
            />
          )}

          {activeTab === 'secrets' && (
            <SecretsConfig
              configs={configs}
              deployments={deployments}
              onCreateConfig={handleCreateConfig}
              onDeleteConfig={handleDeleteConfig}
            />
          )}

          {activeTab === 'declarative' && (
            <YAMLDeployer
              onDeployYAML={handleDeployYAML}
            />
          )}
        </div>

        {/* Persistent Terminal event log logs */}
        <div className="pt-2">
          <TerminalLogs
            logs={logs}
            onClearLogs={clearEventLogs}
          />
        </div>
      </main>

    </div>
  );
}
