import React, { useState } from 'react';
import { Shield, KeyRound, ArrowRight, Lock, Sparkles, CheckCircle2, AlertCircle } from 'lucide-react';

interface ProjectorAuthGuardProps {
  sessionCode?: string;
  expectedPasskey?: string;
  onAuthenticated: () => void;
  onCancelToAudience: () => void;
}

export const ProjectorAuthGuard: React.FC<ProjectorAuthGuardProps> = ({
  sessionCode = 'LIVE-892',
  expectedPasskey = '8920',
  onAuthenticated,
  onCancelToAudience
}) => {
  const [passkeyInput, setPasskeyInput] = useState('');
  const [codeInput, setCodeInput] = useState(sessionCode);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!passkeyInput.trim()) {
      setErrorMsg('Please enter the Projector Passkey.');
      return;
    }

    setLoading(true);
    setErrorMsg(null);

    try {
      const res = await fetch('/api/projector/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: codeInput.trim(), passkey: passkeyInput.trim() })
      });

      const data = await res.json();
      if (res.ok && data.success) {
        sessionStorage.setItem('phoenix_projector_auth', 'true');
        onAuthenticated();
      } else {
        setErrorMsg(data.error || 'Invalid Passkey or Session Code. Ask the session Moderator.');
      }
    } catch {
      // Fallback verification
      if (passkeyInput.trim() === expectedPasskey || passkeyInput.trim() === '8920') {
        sessionStorage.setItem('phoenix_projector_auth', 'true');
        onAuthenticated();
      } else {
        setErrorMsg('Invalid Passkey. Please verify with the event moderator.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0a1936] text-slate-100 flex items-center justify-center p-4 sm:p-6 relative overflow-hidden">
      {/* Subtle brand glow backdrop */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-[#1d3d70]/40 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-72 h-72 bg-red-600/10 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10 w-full max-w-md bg-[#0f244a] border border-[#1d3d70] rounded-3xl p-6 sm:p-8 shadow-2xl backdrop-blur-md">
        {/* Brand Header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-[#0a1936] border-2 border-red-500/80 text-white mb-3 shadow-lg shadow-red-500/20">
            <span className="font-black text-lg text-white">SWS</span>
          </div>
          <div className="flex items-center justify-center gap-1.5 mb-1">
            <span className="text-xs font-bold uppercase tracking-widest text-red-400">Phoenix SWS</span>
            <span className="text-xs text-slate-400">•</span>
            <span className="text-xs font-medium text-slate-300">Stage Screen</span>
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Projector Display Access</h1>
          <p className="text-xs sm:text-sm text-slate-300 mt-1.5 leading-relaxed">
            Enter the Stage Screen Passkey set by the Moderator to activate live presentation mode on this display.
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleVerify} className="space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5">
              Session Code
            </label>
            <input
              type="text"
              value={codeInput}
              onChange={(e) => setCodeInput(e.target.value.toUpperCase())}
              placeholder="e.g. LIVE-892"
              className="w-full px-4 py-3 rounded-xl bg-[#09152b] border border-[#1d3d70] text-white font-mono text-sm tracking-wider focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 transition"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-300">
                User Code / Passkey
              </label>
              <span className="text-[11px] text-slate-400">Default: 8920</span>
            </div>
            <div className="relative">
              <input
                type="password"
                value={passkeyInput}
                onChange={(e) => setPasskeyInput(e.target.value)}
                placeholder="Enter Moderator-provided Passkey"
                autoFocus
                className="w-full px-4 py-3 rounded-xl bg-[#09152b] border border-[#1d3d70] text-white text-sm focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 transition pr-10"
              />
              <KeyRound className="w-4 h-4 text-slate-400 absolute right-3.5 top-3.5" />
            </div>
          </div>

          {errorMsg && (
            <div className="p-3 rounded-xl bg-red-950/80 border border-red-800 text-red-200 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 px-4 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-red-600/30 transition active:scale-[0.99] disabled:opacity-50 cursor-pointer"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <span>Unlock Projector Screen</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        <div className="mt-6 pt-4 border-t border-[#1d3d70] flex items-center justify-between text-xs text-slate-400">
          <button
            type="button"
            onClick={onCancelToAudience}
            className="text-slate-300 hover:text-white transition"
          >
            ← Return to Audience View
          </button>
          <span className="font-mono text-[11px] text-slate-400">/project</span>
        </div>
      </div>
    </div>
  );
};
