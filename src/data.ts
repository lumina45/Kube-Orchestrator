import { ClusterNode, Deployment, PodReplica, StorageVolume, NetworkService, ConfigurationItem, ClusterEvent } from './types';

export const INITIAL_NODES: ClusterNode[] = [
  {
    id: 'node-aws-1',
    name: 'aws-us-east-t3large-01',
    provider: 'AWS',
    region: 'us-east-1',
    status: 'Ready',
    ipAddress: '54.210.12.98',
    cpuCapacity: 4,
    ramCapacity: 16,
    cpuAllocated: 1.5,
    ramAllocated: 6,
  },
  {
    id: 'node-gcp-1',
    name: 'gcp-us-central-n2standard-01',
    provider: 'GCP',
    region: 'us-central1',
    status: 'Ready',
    ipAddress: '34.68.214.103',
    cpuCapacity: 8,
    ramCapacity: 32,
    cpuAllocated: 2.5,
    ramAllocated: 10,
  },
  {
    id: 'node-azure-1',
    name: 'azure-euwest-ds2v2-01',
    provider: 'Azure',
    region: 'westeurope',
    status: 'Ready',
    ipAddress: '13.69.143.51',
    cpuCapacity: 4,
    ramCapacity: 14,
    cpuAllocated: 1.0,
    ramAllocated: 4,
  },
  {
    id: 'node-onprem-1',
    name: 'onprem-rack-b12-hp360',
    provider: 'On-Premises',
    region: 'HQ-DataCenter',
    status: 'Ready',
    ipAddress: '192.168.10.40',
    cpuCapacity: 16,
    ramCapacity: 64,
    cpuAllocated: 4.0,
    ramAllocated: 16,
  },
];

export const INITIAL_CONFIGURATIONS: ConfigurationItem[] = [
  {
    id: 'config-postgres',
    name: 'postgres-credentials',
    type: 'Secret',
    data: {
      'POSTGRES_USER': 'db_kubelite',
      'POSTGRES_PASSWORD': 'a8f9Gh82_kS91!bZq',
      'API_PRIVATE_KEY': '-----BEGIN RSA PRIVATE KEY-----\nMIIEowIBAAKCAQEA0y...\n-----END RSA PRIVATE KEY-----'
    },
    createdAt: new Date(Date.now() - 480 * 60000).toISOString()
  },
  {
    id: 'config-global',
    name: 'global-app-config',
    type: 'ConfigMap',
    data: {
      'LOG_LEVEL': 'debug',
      'CACHE_TTL_SEC': '3600',
      'ENABLE_METRICS_FORWARD': 'true',
      'RETRY_BACKOFF_MS': '150'
    },
    createdAt: new Date(Date.now() - 480 * 60000).toISOString()
  }
];

export const INITIAL_DEPLOYMENTS: Deployment[] = [
  {
    id: 'deploy-web-portal',
    name: 'web-portal-frontend',
    image: 'nginx:1.25-alpine',
    replicasNeeded: 3,
    status: 'Healthy',
    cpuPerPod: 0.25,
    ramPerPod: 0.5,
    volumeClaimName: 'assets-volume-claim',
    serviceId: 'svc-web-portal',
    currentRevision: 1,
    revisionHistory: [
      {
        revision: 1,
        image: 'nginx:1.25-alpine',
        replicas: 3,
        updatedAt: new Date(Date.now() - 120 * 60000).toISOString()
      }
    ],
    envVars: [
      { key: 'CACHE_TTL_SEC', value: '3600', configRef: 'global-app-config' }
    ],
    healthCheckPath: '/healthz',
    healthCheckInterval: 5,
    lastRolloutTime: new Date(Date.now() - 120 * 60000).toISOString(),
  },
  {
    id: 'deploy-auth-service',
    name: 'auth-gateway-service',
    image: 'node:20-alpine',
    replicasNeeded: 2,
    status: 'Healthy',
    cpuPerPod: 0.5,
    ramPerPod: 1.0,
    volumeClaimName: null,
    serviceId: 'svc-auth',
    currentRevision: 2,
    revisionHistory: [
      {
        revision: 1,
        image: 'node:18-alpine',
        replicas: 2,
        updatedAt: new Date(Date.now() - 180 * 60000).toISOString()
      },
      {
        revision: 2,
        image: 'node:20-alpine',
        replicas: 2,
        updatedAt: new Date(Date.now() - 60 * 60000).toISOString()
      }
    ],
    envVars: [
      { key: 'DB_USER', value: 'db_kubelite', secretRef: 'postgres-credentials' },
      { key: 'DB_PASS', value: '********', isSecret: true, secretRef: 'postgres-credentials' },
      { key: 'LOG_LEVEL', value: 'debug', configRef: 'global-app-config' }
    ],
    healthCheckPath: '/api/v1/health',
    healthCheckInterval: 8,
    lastRolloutTime: new Date(Date.now() - 60 * 60000).toISOString(),
  },
  {
    id: 'deploy-data-processor',
    name: 'data-cruncher-daemon',
    image: 'python:3.11-slim',
    replicasNeeded: 1,
    status: 'Healthy',
    cpuPerPod: 1.0,
    ramPerPod: 2.0,
    volumeClaimName: 'data-scratch-volume',
    serviceId: null,
    currentRevision: 1,
    revisionHistory: [
      {
        revision: 1,
        image: 'python:3.11-slim',
        replicas: 1,
        updatedAt: new Date(Date.now() - 240 * 60000).toISOString()
      }
    ],
    envVars: [
      { key: 'PROCESSING_THREADS', value: '4' },
      { key: 'TEMP_DIR_PATH', value: '/mnt/scratch' }
    ],
    healthCheckPath: '/status',
    healthCheckInterval: 12,
    lastRolloutTime: new Date(Date.now() - 240 * 60000).toISOString(),
  }
];

export const INITIAL_PODS: PodReplica[] = [
  // Web Portal Pods
  {
    id: 'pod-web-1',
    name: 'web-portal-frontend-7c9f86-xk891',
    deploymentId: 'deploy-web-portal',
    nodeId: 'node-aws-1',
    status: 'Running',
    ipAddress: '10.244.1.33',
    createdAt: new Date(Date.now() - 120 * 60000).toISOString(),
    restartsCount: 0,
    unhealthyCount: 0
  },
  {
    id: 'pod-web-2',
    name: 'web-portal-frontend-7c9f86-qp452',
    deploymentId: 'deploy-web-portal',
    nodeId: 'node-gcp-1',
    status: 'Running',
    ipAddress: '10.244.2.14',
    createdAt: new Date(Date.now() - 119 * 60000).toISOString(),
    restartsCount: 1,
    lastRestartReason: 'OOMKilled',
    unhealthyCount: 0
  },
  {
    id: 'pod-web-3',
    name: 'web-portal-frontend-7c9f86-zy209',
    deploymentId: 'deploy-web-portal',
    nodeId: 'node-azure-1',
    status: 'Running',
    ipAddress: '10.244.3.88',
    createdAt: new Date(Date.now() - 118 * 60000).toISOString(),
    restartsCount: 0,
    unhealthyCount: 0
  },
  // Auth Gateway Service Pods
  {
    id: 'pod-auth-1',
    name: 'auth-gateway-service-5bbcf4-m902q',
    deploymentId: 'deploy-auth-service',
    nodeId: 'node-onprem-1',
    status: 'Running',
    ipAddress: '10.244.4.156',
    createdAt: new Date(Date.now() - 60 * 60000).toISOString(),
    restartsCount: 0,
    unhealthyCount: 0
  },
  {
    id: 'pod-auth-2',
    name: 'auth-gateway-service-5bbcf4-v7b10',
    deploymentId: 'deploy-auth-service',
    nodeId: 'node-gcp-1',
    status: 'Running',
    ipAddress: '10.244.2.227',
    createdAt: new Date(Date.now() - 58 * 60000).toISOString(),
    restartsCount: 0,
    unhealthyCount: 0
  },
  // Data Processor Pods
  {
    id: 'pod-data-1',
    name: 'data-cruncher-daemon-af0e20-7u882',
    deploymentId: 'deploy-data-processor',
    nodeId: 'node-onprem-1',
    status: 'Running',
    ipAddress: '10.244.4.199',
    createdAt: new Date(Date.now() - 240 * 60000).toISOString(),
    restartsCount: 2,
    lastRestartReason: 'LivenessProbeFailed',
    unhealthyCount: 0
  }
];

export const INITIAL_SERVICES: NetworkService[] = [
  {
    id: 'svc-web-portal',
    name: 'web-portal-svc',
    targetDeploymentId: 'deploy-web-portal',
    dnsName: 'portal.kubelite.io',
    virtualIP: '10.96.120.45',
    port: 80,
    targetPort: 80,
    lbType: 'Round_Robin',
    totalRequests: 84321,
    activeConnections: 12,
  },
  {
    id: 'svc-auth',
    name: 'auth-gateway-svc',
    targetDeploymentId: 'deploy-auth-service',
    dnsName: 'auth.cluster.local',
    virtualIP: '10.96.14.78',
    port: 8080,
    targetPort: 3000,
    lbType: 'IP_Hash',
    totalRequests: 62114,
    activeConnections: 8,
  }
];

export const INITIAL_VOLUMES: StorageVolume[] = [
  {
    id: 'vol-aws-ebs-1',
    name: 'assets-volume-claim',
    sizeGB: 100,
    type: 'AWS_EBS',
    mountPath: '/usr/share/nginx/html',
    status: 'Bound',
    boundDeploymentId: 'deploy-web-portal'
  },
  {
    id: 'vol-gcp-pd-1',
    name: 'data-scratch-volume',
    sizeGB: 500,
    type: 'GCP_PD',
    mountPath: '/mnt/scratch',
    status: 'Bound',
    boundDeploymentId: 'deploy-data-processor'
  },
  {
    id: 'vol-local-ssd-1',
    name: 'unmounted-scratch-pad',
    sizeGB: 50,
    type: 'Local_SSD',
    mountPath: '/tmp/scratchpad',
    status: 'Available',
    boundDeploymentId: null
  },
  {
    id: 'vol-azure-1',
    name: 'backup-shared-nfs',
    sizeGB: 1000,
    type: 'Azure_Disk',
    mountPath: '/srv/backups',
    status: 'Available',
    boundDeploymentId: null
  }
];

export const INITIAL_EVENTS: ClusterEvent[] = [
  {
    id: 'event-1',
    timestamp: new Date(Date.now() - 30 * 60000).toISOString(),
    component: 'Scheduler',
    type: 'success',
    message: 'Successfully allocated pods for web-portal-frontend across AWS, GCP, and Azure to optimize latency.'
  },
  {
    id: 'event-2',
    timestamp: new Date(Date.now() - 28 * 60000).toISOString(),
    component: 'Storage',
    type: 'info',
    message: 'Mounting persist volume claim "assets-volume-claim" to web-portal-frontend at /usr/share/nginx/html'
  },
  {
    id: 'event-3',
    timestamp: new Date(Date.now() - 25 * 60000).toISOString(),
    component: 'LoadBalancer',
    type: 'success',
    message: 'Service Discovery ready. portal.kubelite.io routing to endpoints [10.244.1.33, 10.244.2.14, 10.244.3.88]'
  },
  {
    id: 'event-4',
    timestamp: new Date(Date.now() - 15 * 60000).toISOString(),
    component: 'SelfHealing',
    type: 'warning',
    message: 'Pod web-portal-frontend-7c9f86-qp452 was found unresponsive to liveness probe at "/healthz". Deciding to restart.'
  },
  {
    id: 'event-5',
    timestamp: new Date(Date.now() - 14 * 60000).toISOString(),
    component: 'SelfHealing',
    type: 'success',
    message: 'Liveness test failed container restarted successfully. Pod web-portal-frontend-7c9f86-qp452 is back to Ready state.'
  },
  {
    id: 'event-6',
    timestamp: new Date(Date.now() - 5 * 60000).toISOString(),
    component: 'Rollout',
    type: 'info',
    message: 'Rollout initiated: Node image promotion web-portal-frontend to nginx:1.25-alpine. Initializing rolling update.'
  }
];
