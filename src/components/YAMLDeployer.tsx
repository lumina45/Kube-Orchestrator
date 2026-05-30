import { useState } from 'react';
import { Terminal, Send, HelpCircle, FileText, CheckCircle } from 'lucide-react';
import { motion } from 'motion/react';

interface YAMLDeployerProps {
  onDeployYAML: (yamlType: string, parsedData: any) => void;
}

const TEMPLATES: Record<string, string> = {
  deployment: `apiVersion: kubelite/v1
kind: Deployment
metadata:
  name: billing-api-service
spec:
  replicas: 2
  template:
    spec:
      containers:
        - name: core-api
          image: node:20-alpine
          resources:
            requests:
              cpu: "0.50"
              memory: "1.0G"
          ports:
            - containerPort: 3000
          livenessProbe:
            path: /api/v1/health`,

  service: `apiVersion: kubelite/v1
kind: Service
metadata:
  name: billing-svc
spec:
  type: LoadBalancer
  selector:
    app: billing-api-service
  ports:
    - port: 80
      targetPort: 3000
  dnsName: billing.kubelite.io
  loadBalancingPolicy: Round_Robin`,

  volume: `apiVersion: kubelite/v1
kind: PersistentVolumeClaim
metadata:
  name: billing-db-storage
spec:
  accessModes:
    - ReadWriteOnce
  resources:
    requests:
      storage: 250G
  storageProvider: AWS_EBS
  mountPath: /data/db`,

  secret: `apiVersion: kubelite/v1
kind: Secret
metadata:
  name: stripe-gateway-token
data:
  STRIPE_API_KEY: "sk_live_51M..."
  WEBHOOK_SECRET: "whsec_90jF..."`
};

export default function YAMLDeployer({ onDeployYAML }: YAMLDeployerProps) {
  const [selectedTemplate, setSelectedTemplate] = useState<string>('deployment');
  const [yamlContent, setYamlContent] = useState<string>(TEMPLATES.deployment);
  const [deployFeedback, setDeployFeedback] = useState<string | null>(null);

  const handleTemplateChange = (t: string) => {
    setSelectedTemplate(t);
    setYamlContent(TEMPLATES[t]);
    setDeployFeedback(null);
  };

  const handleDeploy = () => {
    // Basic regex parser to simulate parsing YAML objects
    try {
      const lines = yamlContent.split('\n');
      const data: Record<string, any> = {};
      
      lines.forEach(line => {
        const trimmed = line.trim();
        if (trimmed && trimmed.includes(':') && !trimmed.startsWith('#')) {
          const splitIdx = trimmed.indexOf(':');
          const key = trimmed.slice(0, splitIdx).trim();
          const val = trimmed.slice(splitIdx + 1).replace(/"/g, '').replace(/'/g, '').trim();
          if (key && val) {
            data[key] = val;
          }
        }
      });

      // Pass semantic type & simple parsed metadata structure
      const kindLine = lines.find(l => l.startsWith('kind:'));
      const kind = kindLine ? kindLine.split(':')[1].trim() : 'Deployment';
      
      onDeployYAML(kind, data);
      
      setDeployFeedback(`Successfully parsed and applied ${kind} declarative schema!`);
      setTimeout(() => setDeployFeedback(null), 4000);
    } catch (err) {
      setDeployFeedback('Validation Error: YAML parser failed. Check alignment rules.');
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Editor Console */}
      <div className="lg:col-span-2 bg-slate-950 rounded-sm border border-slate-800 p-5 shadow-lg flex flex-col justify-between min-h-[380px]">
        <div>
          <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-800 mb-4 font-mono">
            <div className="flex items-center gap-2">
              <Terminal className="w-5 h-5 text-cyan-400" />
              <h3 className="font-mono text-sm font-bold tracking-widest text-white uppercase">YAML CONFIG CONSOLE</h3>
            </div>
            
            <div className="flex gap-1.5 bg-slate-900 border border-slate-800 p-1 rounded-sm">
              {Object.keys(TEMPLATES).map(t => (
                <button
                  key={t}
                  onClick={() => handleTemplateChange(t)}
                  className={`px-2.5 py-1 rounded-sm text-[9px] font-mono font-black uppercase tracking-widest transition-colors cursor-pointer ${
                    selectedTemplate === t 
                      ? 'bg-cyan-600 text-slate-950 shadow-md' 
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-850'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          <textarea
            value={yamlContent}
            onChange={(e) => setYamlContent(e.target.value)}
            spellCheck="false"
            className="w-full bg-slate-950 text-emerald-400 font-mono text-[11px] leading-relaxed min-h-[220px] focus:outline-none resize-none"
          />
        </div>

        <div className="pt-3 border-t border-slate-800/80 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <span className="text-[10px] font-mono text-slate-500 font-bold uppercase tracking-wider">apiVersion: kubelite/v1 | compliant</span>
          
          <div className="flex items-center gap-3 w-full sm:w-auto font-mono">
            {deployFeedback && (
              <span className="text-[10px] text-emerald-400 font-mono font-semibold flex items-center gap-1">
                <CheckCircle className="w-3.5 h-3.5" /> {deployFeedback}
              </span>
            )}
            <button
              onClick={handleDeploy}
              className="px-4 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-mono text-[10px] font-bold rounded-sm border border-cyan-400/20 shadow-md flex items-center gap-1.5 cursor-pointer ml-auto transition-colors uppercase tracking-widest"
            >
              <Send className="w-3.5 h-3.5" /> APPLY SPEC
            </button>
          </div>
        </div>
      </div>

      {/* Guide Deck */}
      <div className="bg-slate-900/40 rounded-sm border border-slate-800 p-5 shadow-lg space-y-4 flex flex-col justify-between text-slate-350">
        <div>
          <div className="pb-3 border-b border-slate-800 mb-3 flex items-center gap-2 font-mono">
            <HelpCircle className="w-4 h-4 text-cyan-400" />
            <h4 className="font-mono font-bold text-xs uppercase tracking-widest text-white">Declarative Setup</h4>
          </div>

          <div className="space-y-4 text-xs text-slate-400 leading-relaxed">
            <div className="flex gap-2.5">
              <FileText className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <div>
                <strong className="text-white block uppercase tracking-wider font-bold text-[10px]">What is Declarative Deployment?</strong>
                <p className="text-[11px] text-slate-400 mt-1">Instead of manual point-and-click buttons, real Cloud clusters are set up using codified specs. This enables CI/CD automation systems naturally.</p>
              </div>
            </div>

            <div className="flex gap-2.5">
              <Terminal className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <strong className="text-white block uppercase tracking-wider font-bold text-[10px]">Dynamic YAML Parser</strong>
                <p className="text-[11px] text-slate-400 mt-1">Modify the spec values on the left (e.g. increase replicas count, change image paths) and hit apply. The KubeLite controller updates configuration structures instantly!</p>
              </div>
            </div>
          </div>
        </div>

        <div className="p-3.5 bg-slate-950 border border-slate-850 rounded-sm text-[10px] text-slate-400 font-mono leading-relaxed select-none">
          💡 Try making a quick change to the templates! For example, change <code className="bg-slate-900 text-cyan-400 px-1.5 py-0.5 rounded-sm border border-slate-800 font-bold">replicas: 2</code> to <code className="bg-slate-900 text-cyan-400 px-1.5 py-0.5 rounded-sm border border-slate-800 font-bold">replicas: 4</code> and click Apply. You will see 4 pods start provisioning on the dashboard!
        </div>
      </div>
    </div>
  );
}
