import React, { useState } from 'react';
import { ShieldCheck, Mail, Lock, ArrowRight, AlertCircle, KeyRound, Sparkles } from 'lucide-react';

interface AdminAuthGuardProps {
  onAuthenticated: (email: string) => void;
  onCancelToAudience: () => void;
}

export const AdminAuthGuard: React.FC<AdminAuthGuardProps> = ({
  onAuthenticated,
  onCancelToAudience
}) => {
  const [email, setEmail] = useState('moderator@phoenix.sws');
  const [password, setPassword] = useState('admin123');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      setErrorMsg('Please provide both moderator email and password.');
      return;
    }

    setLoading(true);
    setErrorMsg(null);

    setTimeout(() => {
      // Allow moderator authentication (standard event credentials)
      if (email.trim().length > 3 && password.trim().length >= 4) {
        sessionStorage.setItem('phoenix_admin_auth', email.trim());
        onAuthenticated(email.trim());
      } else {
        setErrorMsg('Invalid moderator credentials. Password must be at least 4 characters.');
      }
      setLoading(false);
    }, 400);
  };

  return (
    <div className="min-h-screen bg-[#0a1936] text-slate-100 flex items-center justify-center p-4 sm:p-6 relative overflow-hidden">
      {/* Brand brighter navy & touch of red atmospheric lights */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-[#1d3d70]/35 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-10 left-10 w-72 h-72 bg-red-600/10 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10 w-full max-w-md bg-[#0f244a] border border-[#1d3d70] rounded-3xl p-6 sm:p-8 shadow-2xl backdrop-blur-md">
        {/* Brand Header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-[#0a1936] border-2 border-red-500/80 text-white mb-3 shadow-lg shadow-red-500/20">
            <span className="font-black text-lg text-white">SWS</span>
          </div>
          <div className="flex items-center justify-center gap-1.5 mb-1">
            <span className="text-xs font-bold uppercase tracking-widest text-red-400">Phoenix SWS</span>
            <span className="text-xs text-slate-400">•</span>
            <span className="text-xs font-medium text-slate-300">Event Console</span>
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Moderator Sign-in</h1>
          <p className="text-xs sm:text-sm text-slate-300 mt-1.5 leading-relaxed">
            Manage survey questions, live attendee responses, session settings, and projection controls.
          </p>
        </div>

        {/* Demo Credentials hint */}
        <div className="mb-4 p-3 rounded-xl bg-blue-950/60 border border-blue-800/60 text-blue-200 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-red-400 shrink-0" />
            <span>
              Moderator login: <strong>moderator@phoenix.sws</strong> / <strong>admin123</strong>
            </span>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5">
              Moderator Email
            </label>
            <div className="relative">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="moderator@phoenix.sws"
                required
                className="w-full px-4 py-3 rounded-xl bg-[#09152b] border border-[#1d3d70] text-white text-sm focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 transition pl-10"
              />
              <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5">
              Password
            </label>
            <div className="relative">
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="w-full px-4 py-3 rounded-xl bg-[#09152b] border border-[#1d3d70] text-white text-sm focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 transition pl-10"
              />
              <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
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
                <span>Enter Moderator Console</span>
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
          <span className="font-mono text-[11px] text-slate-400">/admin</span>
        </div>
      </div>
    </div>
  );
};
