import React, { useState } from 'react';
import { ConfigurationItem, Deployment } from '../types';
import { Eye, EyeOff, Key, Plus, Settings, Check, Trash2, ShieldCheck, Lock, Landmark } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface SecretsConfigProps {
  configs: ConfigurationItem[];
  deployments: Deployment[];
  onCreateConfig: (newItem: Omit<ConfigurationItem, 'id' | 'createdAt'>) => void;
  onDeleteConfig: (id: string) => void;
}

export default function SecretsConfig({ configs, deployments, onCreateConfig, onDeleteConfig }: SecretsConfigProps) {
  const [selectedConfId, setSelectedConfId] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [revealSecrets, setRevealSecrets] = useState<Record<string, boolean>>({});

  // Form states
  const [confName, setConfName] = useState('redis-cache-secrets');
  const [confType, setConfType] = useState<'Secret' | 'ConfigMap'>('Secret');
  const [keyValues, setKeyValues] = useState<{ key: string; value: string }[]>([
    { key: 'REDIS_PASSWORD', value: '7hf19YhJsa8b' },
    { key: 'REDIS_PORT', value: '6379' },
  ]);

  const activeConfig = selectedConfId ? configs.find(c => c.id === selectedConfId) : null;

  // Add field to keyValues form
  const addKeyValueField = () => {
    setKeyValues([...keyValues, { key: '', value: '' }]);
  };

  // Remove field
  const removeKeyValueField = (index: number) => {
    setKeyValues(keyValues.filter((_, i) => i !== index));
  };

  const handleCreateConfig = (e: React.FormEvent) => {
    e.preventDefault();
    const dataObj: Record<string, string> = {};
    keyValues.forEach(kv => {
      if (kv.key) dataObj[kv.key] = kv.value;
    });

    onCreateConfig({
      name: confName,
      type: confType,
      data: dataObj,
    });

    // Reset Form
    setShowAddModal(false);
    setConfName('api-ssl-keys');
    setConfType('Secret');
    setKeyValues([{ key: 'SSL_CERT_PASSPHRASE', value: 'pass123!' }]);
  };

  const toggleReveal = (key: string) => {
    setRevealSecrets(prev => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <div className="space-y-6">
      {/* Topology Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h3 className="text-xl font-bold text-white font-display">Secret & Config Store</h3>
          <p className="text-xs text-slate-400 font-medium">Inject passwords, tokens, env parameters, and configurations directly code-decoupled, safe from standard exposure.</p>
        </div>
        <button 
          onClick={() => setShowAddModal(true)}
          className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-slate-950 rounded-sm text-xs font-bold uppercase tracking-widest transition-all duration-150 flex items-center gap-1.5 cursor-pointer"
        >
          <Plus className="w-4 h-4" /> Create Resource
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column: Resources List */}
        <div className="lg:col-span-2 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {configs.map(item => {
              const keys = Object.keys(item.data);
              const isSelected = selectedConfId === item.id;

              return (
                <div 
                  key={item.id}
                  onClick={() => setSelectedConfId(item.id)}
                  className={`cursor-pointer rounded-sm border-2 p-5 transition-all duration-150 flex flex-col justify-between hover:translate-y-[-1px] ${
                    isSelected 
                      ? 'border-cyan-500 bg-slate-900 shadow-[0_0_15px_rgba(6,182,212,0.15)] text-white' 
                      : item.type === 'Secret'
                      ? 'border-rose-950/20 bg-slate-900/30 hover:border-slate-700 text-slate-300 shadow-sm'
                      : 'border-slate-850 bg-slate-900/30 hover:border-slate-700 text-slate-350 shadow-sm'
                  }`}
                >
                  <div className="space-y-4">
                    <div className="flex justify-between items-start">
                      <div className="flex items-center gap-2.5">
                        <div className={`p-2 rounded-sm border ${
                          item.type === 'Secret' 
                            ? 'bg-rose-950/40 border-rose-900/30 text-rose-400' 
                            : 'bg-slate-850 border-slate-800 text-cyan-400'
                        }`}>
                          {item.type === 'Secret' ? <Lock className="w-4 h-4" /> : <Settings className="w-4 h-4" />}
                        </div>
                        <div>
                          <h4 className="text-sm font-bold text-white font-display">{item.name}</h4>
                          <span className="text-[9px] text-slate-400 font-mono font-bold tracking-wider uppercase">
                            TYPE: {item.type.toUpperCase()}
                          </span>
                        </div>
                      </div>

                      {item.type === 'Secret' ? (
                        <span className="text-[9px] bg-rose-955/20 border border-rose-900/40 text-rose-400 px-2 py-0.5 rounded-sm font-mono tracking-wider font-bold uppercase">Encrypted</span>
                      ) : (
                        <span className="text-[9px] bg-slate-850 border border-slate-800 text-cyan-455 px-2 py-0.5 rounded-sm font-mono tracking-wider font-bold uppercase">Plaintext</span>
                      ) }
                    </div>

                    <div className="pt-2 border-t border-slate-800/80 space-y-1.5 text-xs text-slate-400 font-mono">
                      <div className="flex justify-wrap gap-1 mb-1">
                        <span className="text-[10px] text-slate-500 font-sans font-bold block uppercase tracking-wider">Keys ({keys.length}):</span>
                        {keys.map(k => (
                          <span key={k} className="bg-slate-950 text-cyan-400 px-1.5 py-0.5 rounded-sm text-[10px] font-mono border border-slate-850/50">{k}</span>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-slate-800 mt-4 flex justify-between items-center text-[10px] uppercase font-bold text-slate-500 font-mono">
                    <span>Injected Variables</span>
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteConfig(item.id);
                        if (selectedConfId === item.id) setSelectedConfId(null);
                      }}
                      className="text-rose-450 hover:text-rose-400 p-1 rounded-sm transition-colors cursor-pointer"
                      title="Delete secret"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right column: Values inspector and secret decrypting mechanics */}
        <div className="bg-slate-900/40 border border-slate-800 p-5 rounded-sm shadow-lg space-y-4 h-full flex flex-col justify-between">
          {!activeConfig ? (
            <div className="py-24 text-center flex flex-col items-center justify-center text-slate-500">
              <Lock className="w-12 h-12 mb-4 stroke-1 text-slate-605" />
              <p className="text-xs font-bold text-slate-400 mb-1 uppercase tracking-wider">Select a resource element</p>
              <p className="text-[11px] text-slate-500 max-w-[200px] mx-auto leading-relaxed">Click any file keys or API vault secrets to inspect encrypted key values, decrypt with visual security locks, and preview bindings.</p>
            </div>
          ) : (
            <div className="space-y-4 flex-1 flex flex-col justify-between">
              <div>
                <div className="pb-3 border-b border-slate-800 flex align-center justify-between">
                  <div>
                    <span className="text-[10px] font-mono font-bold uppercase text-cyan-400 tracking-widest">Resource Key Inspector</span>
                    <h4 className="text-base font-bold text-white font-display">{activeConfig.name}</h4>
                  </div>
                  <div className="flex items-center gap-1">
                    {activeConfig.type === 'Secret' ? (
                      <span className="bg-rose-950/40 text-rose-450 border border-rose-900/30 text-[10px] font-mono px-2 py-0.5 rounded-sm font-bold uppercase tracking-wider">Secured Store</span>
                    ) : (
                      <span className="bg-slate-800 text-cyan-400 border border-slate-75ba/40 text-[10px] font-mono px-2 py-0.5 rounded-sm font-bold uppercase tracking-wider">ConfigMap</span>
                    )}
                  </div>
                </div>

                {/* Key value mapping table */}
                <div className="mt-4 space-y-2">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block">Decrypted Key Vault Data</span>
                  <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                    {Object.entries(activeConfig.data).map(([key, value]) => {
                      const isRevealed = revealSecrets[`${activeConfig.id}-${key}`] || activeConfig.type !== 'Secret';

                      return (
                        <div 
                          key={key}
                          className="bg-slate-950 p-3 rounded-sm border border-slate-850 space-y-1.5"
                        >
                          <div className="flex justify-between items-center">
                            <span className="font-mono text-xs font-bold text-slate-300 tracking-tight">{key}</span>
                            {activeConfig.type === 'Secret' && (
                              <button 
                                onClick={() => toggleReveal(`${activeConfig.id}-${key}`)}
                                className="text-slate-500 hover:text-white cursor-pointer"
                              >
                                {isRevealed ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                              </button>
                            )}
                          </div>
                          
                          <div className="font-mono text-xs text-cyan-400 bg-slate-900 border border-slate-800 p-1.5 rounded-sm truncate select-all">
                            {isRevealed ? value : '••••••••••••••••'}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Secure explanation box */}
              <div className="p-3 bg-slate-950 border border-slate-850 rounded-sm space-y-1.5 text-[10px] text-slate-500 leading-relaxed font-mono">
                <div className="flex items-center gap-1 font-bold text-slate-400 tracking-wider text-[9px] uppercase">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  <span>DECOUPLED SECRET INJECTION SUCCESSFUL</span>
                </div>
                <p>
                  Workloads bind these values as environmental strings, meaning container images themselves are never compiled with passwords inside, maintaining secure environment setups.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Resource creation modal dialog */}
      <AnimatePresence>
        {showAddModal && (
          <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-slate-900 w-full max-w-md p-6 shadow-2xl border border-slate-800 space-y-4 rounded-sm text-slate-100"
            >
              <div className="flex justify-between items-center pb-2 border-b border-slate-800">
                <h4 className="text-base font-bold text-white font-display uppercase tracking-widest text-xs">Create Env Parameter</h4>
                <button 
                  onClick={() => setShowAddModal(false)}
                  className="p-1 hover:bg-slate-800 rounded-sm text-slate-400 hover:text-white transition-colors cursor-pointer"
                >
                  ✖
                </button>
              </div>

              <form onSubmit={handleCreateConfig} className="space-y-4 text-xs">
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-slate-400 font-semibold uppercase tracking-wider text-[10px] mb-1">Resource Name</label>
                      <input 
                        type="text" 
                        required
                        value={confName}
                        onChange={(e) => setConfName(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-sm px-3 py-2 text-white focus:outline-none focus:ring-1 focus:ring-cyan-500"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-400 font-semibold uppercase tracking-wider text-[10px] mb-1">Resource Type</label>
                      <select 
                        value={confType}
                        onChange={(e) => setConfType(e.target.value as any)}
                        className="w-full bg-slate-955 bg-slate-950 border border-slate-800 rounded-sm px-3 py-2 text-white focus:outline-none focus:ring-1 focus:ring-cyan-500"
                      >
                        <option value="Secret" className="bg-slate-900 text-slate-100">Secret (Auto Crypt Vault)</option>
                        <option value="ConfigMap" className="bg-slate-900 text-slate-100">ConfigMap (Raw Key/Value)</option>
                      </select>
                    </div>
                  </div>

                  <div className="space-y-2 pt-2 border-t border-slate-800">
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-slate-400 uppercase tracking-widest text-[10px]">Resource Key Data Value</span>
                      <button 
                        type="button"
                        onClick={addKeyValueField}
                        className="text-cyan-400 hover:text-cyan-300 font-bold flex items-center gap-1 cursor-pointer uppercase tracking-wider text-[10px]"
                      >
                        <Plus className="w-3.5 h-3.5" /> Add Field
                      </button>
                    </div>

                    <div className="space-y-2 max-h-[160px] overflow-y-auto pr-1">
                      {keyValues.map((kv, idx) => (
                        <div key={idx} className="flex gap-2 items-center">
                          <input 
                            type="text" 
                            required
                            placeholder="KEY_NAME"
                            value={kv.key}
                            onChange={(e) => {
                              const updated = [...keyValues];
                              updated[idx].key = e.target.value.toUpperCase();
                              setKeyValues(updated);
                            }}
                            className="bg-slate-950 border border-slate-800 rounded-sm px-2.5 py-1.5 text-white font-mono w-1/2 focus:outline-none focus:ring-1 focus:ring-cyan-500"
                          />
                          <input 
                            type="text" 
                            required
                            placeholder="Value"
                            value={kv.value}
                            onChange={(e) => {
                              const updated = [...keyValues];
                              updated[idx].value = e.target.value;
                              setKeyValues(updated);
                            }}
                            className="bg-slate-950 border border-slate-800 rounded-sm px-2.5 py-1.5 text-white font-mono w-1/2 focus:outline-none focus:ring-1 focus:ring-cyan-500"
                          />
                          {keyValues.length > 1 && (
                            <button 
                              type="button"
                              onClick={() => removeKeyValueField(idx)}
                              className="text-slate-500 hover:text-rose-400 cursor-pointer"
                            >
                              ✖
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="flex gap-2.5 justify-end pt-4 border-t border-slate-800">
                  <button 
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    className="px-4 py-2 border border-slate-800 text-slate-400 rounded-sm hover:bg-slate-850 hover:text-white transition-colors cursor-pointer text-[10px] uppercase font-bold tracking-wider"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit"
                    className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-bold rounded-sm shadow-md transition-colors cursor-pointer text-[10px] uppercase tracking-wider"
                  >
                    Store Resource
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
