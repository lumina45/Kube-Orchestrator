export type CloudProvider = 'AWS' | 'GCP' | 'Azure' | 'On-Premises';

export interface ClusterNode {
  id: string;
  name: string;
  provider: CloudProvider;
  region: string;
  status: 'Ready' | 'NotReady';
  ipAddress: string;
  cpuCapacity: number; // in cores
  ramCapacity: number; // in GB
  cpuAllocated: number;
  ramAllocated: number;
}

export type DeploymentStatus = 'Healthy' | 'Rolling' | 'Degraded';

export interface EnvVar {
  key: string;
  value: string;
  isSecret?: boolean;
  secretRef?: string; // name of the Secret
  configRef?: string; // name of the ConfigMap
}

export interface Deployment {
  id: string;
  name: string;
  image: string;
  replicasNeeded: number;
  status: DeploymentStatus;
  cpuPerPod: number;
  ramPerPod: number;
  volumeClaimName: string | null;
  serviceId: string | null;
  currentRevision: number;
  revisionHistory: {
    revision: number;
    image: string;
    replicas: number;
    updatedAt: string;
  }[];
  envVars: EnvVar[];
  healthCheckPath: string;
  healthCheckInterval: number; // in seconds
  lastRolloutTime: string;
}

export type PodStatus = 'Running' | 'Pending' | 'Failed' | 'Restarting';

export interface PodReplica {
  id: string;
  name: string;
  deploymentId: string;
  nodeId: string | null;
  status: PodStatus;
  ipAddress: string;
  createdAt: string;
  restartsCount: number;
  lastRestartReason?: string;
  unhealthyCount: number; // for simulated health failures
}

export interface StorageVolume {
  id: string;
  name: string;
  sizeGB: number;
  type: 'AWS_EBS' | 'GCP_PD' | 'Azure_Disk' | 'Local_SSD';
  mountPath: string;
  status: 'Available' | 'Bound';
  boundDeploymentId: string | null;
}

export type LBType = 'Round_Robin' | 'IP_Hash';

export interface NetworkService {
  id: string;
  name: string;
  targetDeploymentId: string;
  dnsName: string;
  virtualIP: string;
  port: number;
  targetPort: number;
  lbType: LBType;
  totalRequests: number;
  activeConnections: number;
}

export type ConfigType = 'Secret' | 'ConfigMap';

export interface ConfigurationItem {
  id: string;
  name: string;
  type: ConfigType;
  data: Record<string, string>; // Key-Value data
  createdAt: string;
}

export interface ClusterEvent {
  id: string;
  timestamp: string;
  component: 'Scheduler' | 'Rollout' | 'SelfHealing' | 'Storage' | 'LoadBalancer' | 'Secrets';
  type: 'info' | 'success' | 'warning' | 'danger';
  message: string;
}
