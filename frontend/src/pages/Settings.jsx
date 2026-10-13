import React, { useState, useEffect } from 'react';
import { 
  checkBackendHealth, 
  fetchVisionStatus, 
  resetDemoData 
} from '../api/client';
import Modal from '../components/Modal';
import { 
  Settings, 
  Activity, 
  Database, 
  Cpu, 
  Sparkles, 
  RefreshCw, 
  RotateCcw, 
  CheckCircle2, 
  AlertTriangle, 
  BookOpen, 
  ShieldCheck, 
  Sliders 
} from 'lucide-react';

export default function SettingsPage({ onDataReset }) {
  const [health, setHealth] = useState(null);
  const [visionStatus, setVisionStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [resetModalOpen, setResetModalOpen] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [resetMessage, setResetMessage] = useState(null);

  const loadStatus = async () => {
    try {
      setLoading(true);
      const [hRes, vRes] = await Promise.all([
        checkBackendHealth().catch(err => ({ status: 'error', error: err.message })),
        fetchVisionStatus().catch(err => ({ status: 'error', error: err.message }))
      ]);
      setHealth(hRes);
      setVisionStatus(vRes);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStatus();
  }, []);

  const handleExecuteReset = async () => {
    try {
      setResetting(true);
      const res = await resetDemoData();
      setResetMessage({ type: 'success', text: res.message || "Demonstration data reset successfully." });
      setResetModalOpen(false);
      if (onDataReset) onDataReset();
      loadStatus();
    } catch (err) {
      setResetMessage({ type: 'error', text: err.message || "Failed to reset demo data." });
    } finally {
      setResetting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Page Title */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm flex items-center justify-between">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900 flex items-center gap-2">
            <Settings className="w-5 h-5 text-brand-600" />
            System Status & Configuration
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Verify runtime connectivity, vision pipelines, and maintenance reset controls.
          </p>
        </div>
        <button
          onClick={loadStatus}
          className="p-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 transition"
          title="Refresh Diagnostics"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-brand-600' : ''}`} />
        </button>
      </div>

      {resetMessage && (
        <div className={`p-4 rounded-2xl border text-sm flex items-center justify-between ${
          resetMessage.type === 'success' 
            ? 'bg-emerald-50 border-emerald-200 text-emerald-800' 
            : 'bg-rose-50 border-rose-200 text-rose-800'
        }`}>
          <span>{resetMessage.text}</span>
          <button 
            onClick={() => setResetMessage(null)} 
            className="text-xs font-bold underline ml-3"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Diagnostics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Backend API */}
        <div className="p-5 bg-white rounded-2xl border border-slate-200/80 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
              <Activity className="w-4 h-4 text-brand-600" />
              Backend FastAPI
            </span>
            <span className={`w-2.5 h-2.5 rounded-full ${health?.status === 'healthy' ? 'bg-emerald-500' : 'bg-rose-500'}`} />
          </div>
          <div>
            <div className="text-lg font-extrabold text-slate-900">
              {health?.status === 'healthy' ? 'Online & Healthy' : 'Degraded / Offline'}
            </div>
            <p className="text-xs text-slate-500 mt-0.5">Uvicorn on Port 8001</p>
          </div>
          <div className="pt-2 border-t border-slate-100 text-[11px] text-slate-400 font-mono">
            Origin: http://127.0.0.1:8001
          </div>
        </div>

        {/* Database */}
        <div className="p-5 bg-white rounded-2xl border border-slate-200/80 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
              <Database className="w-4 h-4 text-emerald-600" />
              SQLite Database
            </span>
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
          </div>
          <div>
            <div className="text-lg font-extrabold text-slate-900">
              {health?.database || 'Active'}
            </div>
            <p className="text-xs text-slate-500 mt-0.5">campuslens.db (Persistent Storage)</p>
          </div>
          <div className="pt-2 border-t border-slate-100 text-[11px] text-slate-400 font-mono">
            Foreign Keys ON • Audit History
          </div>
        </div>

        {/* Vision Model */}
        <div className="p-5 bg-white rounded-2xl border border-slate-200/80 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
              <Cpu className="w-4 h-4 text-amber-500" />
              Vision Engine
            </span>
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
          </div>
          <div>
            <div className="text-lg font-extrabold text-slate-900 truncate">
              {visionStatus?.model_name?.split('/')[1] || 'CLIP ViT'}
            </div>
            <p className="text-xs text-slate-500 mt-0.5">Status: {visionStatus?.status || 'Ready'}</p>
          </div>
          <div className="pt-2 border-t border-slate-100 text-[11px] text-slate-400 font-mono">
            Hugging Face Zero-Shot
          </div>
        </div>
      </div>

      {/* Guide & Architecture Section */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm space-y-4">
        <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
          <BookOpen className="w-4 h-4 text-brand-600" />
          CampusLens Technical Architecture & Hackathon Guide
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs sm:text-sm text-slate-600">
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/60 space-y-2">
            <h4 className="font-bold text-slate-900">Zero-Shot Vision Pipeline</h4>
            <p className="leading-relaxed">
              When a photo is uploaded, CampusLens employs <code className="text-brand-700 bg-brand-50 px-1 py-0.5 rounded font-mono">openai/clip-vit-base-patch32</code> via Hugging Face Transformers. The model compares visual patch tokens against tailored campus maintenance category prompts without requiring cloud API keys.
            </p>
          </div>
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/60 space-y-2">
            <h4 className="font-bold text-slate-900">Human-in-the-Loop Verification</h4>
            <p className="leading-relaxed">
              AI outputs are formatted strictly as relevance scores rather than guaranteed diagnoses. Reporters always confirm or manually override suggestions before saving to ensure database integrity.
            </p>
          </div>
        </div>
      </div>

      {/* Danger Zone: Reset Data */}
      <div className="bg-white p-6 rounded-2xl border border-rose-200 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h3 className="font-bold text-slate-900 text-base text-rose-700 flex items-center gap-2">
            <RotateCcw className="w-4 h-4 text-rose-600" />
            Reset Demonstration Data
          </h3>
          <p className="text-xs text-slate-500 mt-1 max-w-lg">
            Restore sample campus issues and facility records to default values. Ideal for testing presentation flows.
          </p>
        </div>
        <button
          onClick={() => setResetModalOpen(true)}
          className="px-4 py-2.5 rounded-xl text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100 transition shrink-0"
        >
          Reset Demo Data
        </button>
      </div>

      {/* Reset Confirmation Modal */}
      {resetModalOpen && (
        <Modal
          isOpen={resetModalOpen}
          onClose={() => setResetModalOpen(false)}
          title="Confirm Demo Data Reset"
          maxWidth="max-w-md"
        >
          <div className="space-y-4">
            <p className="text-sm text-slate-600">
              Are you sure you want to restore the baseline demo issues and facilities? Any custom issues you submitted will be cleared.
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setResetModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleExecuteReset}
                disabled={resetting}
                className="px-5 py-2 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white shadow-sm disabled:opacity-50 flex items-center gap-1.5"
              >
                {resetting ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Resetting...</span>
                  </>
                ) : (
                  <span>Confirm Reset</span>
                )}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
