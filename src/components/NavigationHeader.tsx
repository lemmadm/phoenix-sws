import React, { useState } from 'react';
import { useLiveSurvey } from '../context/LiveSurveyContext';
import { QRCodeModal } from './QRCodeModal';
import {
  Smartphone,
  Tv,
  Sliders,
  Users,
  Wifi,
  WifiOff,
  QrCode,
  ExternalLink,
  Database,
  Info,
  LogOut,
  Share2,
  Check,
  ChevronUp
} from 'lucide-react';

interface NavigationHeaderProps {
  onAdminLogout?: () => void;
  onProjectorLogout?: () => void;
  isAdminAuthed?: boolean;
  isProjectorAuthed?: boolean;
  onHideNavBar?: () => void;
}

export const NavigationHeader: React.FC<NavigationHeaderProps> = ({
  onAdminLogout,
  onProjectorLogout,
  isAdminAuthed = false,
  isProjectorAuthed = false,
  onHideNavBar
}) => {
  const { role, setRole, session, audienceCount, isConnected, dbStatus } = useLiveSurvey();
  const [showQRModal, setShowQRModal] = useState(false);
  const [showDbInfo, setShowDbInfo] = useState(false);
  const [shareCopied, setShareCopied] = useState(false);

  const audienceUrl = typeof window !== 'undefined' ? `${window.location.origin}/` : '';
  const shareText = `Join the Phoenix SWS live survey! Code: ${session?.code || ''} ${audienceUrl}`;

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Phoenix SWS Live Survey',
          text: `Join the live survey (Code: ${session?.code || ''})`,
          url: audienceUrl
        });
        return;
      } catch {
        // User dismissed share dialog
      }
    }

    // Fallback: Open WhatsApp directly or copy to clipboard
    const whatsappUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(shareText)}`;
    const win = window.open(whatsappUrl, '_blank', 'noopener,noreferrer');
    if (!win) {
      navigator.clipboard.writeText(audienceUrl);
      setShareCopied(true);
      setTimeout(() => setShareCopied(false), 2000);
    }
  };

  return (
    <>
      <header
        id="app-navigation-header"
        className="w-full bg-[#0a1b38] border-b border-[#1b3663] text-slate-100 px-4 py-2.5 sm:px-6 sticky top-0 z-40 shadow-md"
      >
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Brand & Active Session Details */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              {/* Phoenix SWS Brand Logo */}
              <div className="w-8 h-8 rounded-lg bg-[#0e2752] border border-red-500 flex items-center justify-center font-black text-white text-xs shadow-md shadow-red-500/20">
                P-SWS
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-sm tracking-tight text-white">Phoenix SWS</span>
                  <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-[#133060] text-red-300 border border-red-900/60 font-semibold">
                    {session?.code || 'LIVE-892'}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-[11px] text-slate-300">
                  <span className="truncate max-w-[200px] sm:max-w-xs">{session?.title || 'Audience Survey'}</span>
                </div>
              </div>
            </div>

            {/* Connection indicator */}
            <div className="flex items-center gap-1.5 text-[11px] font-mono border-l border-[#1b3663] pl-3 ml-1 text-slate-300">
              {isConnected ? (
                <>
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="text-emerald-400 font-semibold">Live</span>
                </>
              ) : (
                <>
                  <span className="w-2 h-2 rounded-full bg-amber-400" />
                  <span className="text-amber-400">Reconnecting</span>
                </>
              )}
            </div>

            {/* Live attendee count */}
            <div className="hidden sm:flex items-center gap-1 text-[11px] text-slate-300 bg-[#0e2752] px-2.5 py-1 rounded-md border border-[#1b3663]">
              <Users className="w-3.5 h-3.5 text-red-400" />
              <span>
                <strong className="text-white">{audienceCount}</strong> attendee{audienceCount !== 1 ? 's' : ''}
              </span>
            </div>
          </div>

          {/* View Mode Switcher (Audience, Projector, Admin) */}
          <div className="flex items-center bg-[#07142b] p-1 rounded-xl border border-[#1b3663] text-xs font-semibold self-start md:self-auto overflow-x-auto max-w-full">
            <button
              id="nav-role-audience-btn"
              onClick={() => setRole('audience')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition whitespace-nowrap ${
                role === 'audience'
                  ? 'bg-red-600 text-white shadow-sm font-bold'
                  : 'text-slate-300 hover:text-white hover:bg-[#0e2752]'
              }`}
            >
              <Smartphone className="w-3.5 h-3.5" />
              <span>Audience View</span>
            </button>

            <button
              id="nav-role-projector-btn"
              onClick={() => setRole('projector')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition whitespace-nowrap ${
                role === 'projector'
                  ? 'bg-red-600 text-white shadow-sm font-bold'
                  : 'text-slate-300 hover:text-white hover:bg-[#0e2752]'
              }`}
            >
              <Tv className="w-3.5 h-3.5" />
              <span>Projector (/project)</span>
            </button>

            <button
              id="nav-role-admin-btn"
              onClick={() => setRole('admin')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition whitespace-nowrap ${
                role === 'admin'
                  ? 'bg-red-600 text-white shadow-sm font-bold'
                  : 'text-slate-300 hover:text-white hover:bg-[#0e2752]'
              }`}
            >
              <Sliders className="w-3.5 h-3.5" />
              <span>Admin (/admin)</span>
            </button>
          </div>

          {/* Action Icons */}
          <div className="flex items-center gap-2 self-end md:self-auto">
            {/* Database status pill - Only shown on Admin or Projector screens, hidden on Audience view */}
            {role !== 'audience' && (
              <div className="relative">
                <button
                  id="db-status-pill-btn"
                  onClick={() => setShowDbInfo(!showDbInfo)}
                  className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium border transition ${
                    dbStatus?.type === 'neon-postgresql'
                      ? 'bg-emerald-950/40 text-emerald-300 border-emerald-800 hover:bg-emerald-900/50'
                      : 'bg-[#0e2752] text-slate-300 border-[#1b3663] hover:bg-[#143975]'
                  }`}
                  title="Database configuration"
                >
                  <Database className="w-3 h-3 text-emerald-400" />
                  <span className="hidden sm:inline">
                    {dbStatus?.type === 'neon-postgresql' ? 'Neon DB' : 'PostgreSQL'}
                  </span>
                  <Info className="w-3 h-3 text-slate-400" />
                </button>

                {showDbInfo && (
                  <div
                    id="db-info-popover"
                    className="absolute right-0 top-full mt-2 w-72 p-3 bg-[#0a1b38] border border-[#1b3663] rounded-xl shadow-xl text-xs text-slate-200 z-50 animate-in fade-in"
                  >
                    <div className="font-semibold text-white mb-1 flex items-center justify-between">
                      <span>Database Status</span>
                      <span
                        className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                          dbStatus?.type === 'neon-postgresql'
                            ? 'bg-emerald-900 text-emerald-300'
                            : 'bg-amber-900/60 text-amber-300'
                        }`}
                      >
                        {dbStatus?.type === 'neon-postgresql' ? 'Active' : 'Connected'}
                      </span>
                    </div>
                    <p className="text-slate-300 text-[11px] mb-2 leading-relaxed">
                      {dbStatus?.message ||
                        'Neon PostgreSQL database configured for real-time synchronization and durable storage.'}
                    </p>
                    <div className="pt-2 border-t border-[#1b3663] flex justify-between items-center text-[10px] text-slate-400 font-mono">
                      <span>Neon PostgreSQL Ready</span>
                      <button
                        onClick={() => setShowDbInfo(false)}
                        className="text-red-400 hover:text-red-300 font-semibold"
                      >
                        Dismiss
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Icon 1: QR Code trigger */}
            <button
              id="header-open-qr-btn"
              onClick={() => setShowQRModal(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#0e2752] hover:bg-[#143975] text-slate-200 text-xs font-medium border border-[#1b3663] transition"
              title="Show Attendee QR Code"
            >
              <QrCode className="w-3.5 h-3.5 text-red-400" />
              <span className="hidden sm:inline">Join QR</span>
            </button>

            {/* Icon 2: Open in new tab button */}
            <a
              id="header-open-tab-btn"
              href={
                role === 'projector'
                  ? `${window.location.origin}/project`
                  : role === 'admin'
                  ? `${window.location.origin}/admin`
                  : `${window.location.origin}/`
              }
              target="_blank"
              rel="noreferrer"
              className="p-1.5 rounded-lg bg-[#0e2752] hover:bg-[#143975] text-slate-300 hover:text-white border border-[#1b3663] transition"
              title="Open current view in new window"
            >
              <ExternalLink className="w-3.5 h-3.5" />
            </a>

            {/* Icon 3: Hide the nav bar for a clean, distraction-free stage view */}
            {onHideNavBar && (
              <button
                id="header-hide-nav-btn"
                onClick={onHideNavBar}
                className="p-1.5 rounded-lg bg-[#0e2752] hover:bg-[#143975] text-slate-300 hover:text-white border border-[#1b3663] transition"
                title="Hide navigation bar"
              >
                <ChevronUp className="w-3.5 h-3.5" />
              </button>
            )}

            {/* Icon 4: Share action button to share survey link via WhatsApp & Others */}
            <button
              id="header-share-survey-btn"
              onClick={handleShare}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-[#0e2752] hover:bg-[#143975] text-slate-200 hover:text-white border border-[#1b3663] transition"
              title="Share survey link via WhatsApp & others"
            >
              {shareCopied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-[11px] text-emerald-300 font-bold hidden sm:inline">Copied</span>
                </>
              ) : (
                <>
                  <Share2 className="w-3.5 h-3.5 text-red-400" />
                  <span className="text-[11px] font-semibold hidden sm:inline">Share</span>
                </>
              )}
            </button>

            {/* Lock/Logout button when in Admin or Projector */}
            {role === 'admin' && isAdminAuthed && onAdminLogout && (
              <button
                onClick={onAdminLogout}
                className="p-1.5 rounded-lg bg-red-950/60 hover:bg-red-900 border border-red-800 text-red-300 hover:text-white transition"
                title="Lock Moderator Console"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            )}

            {role === 'projector' && isProjectorAuthed && onProjectorLogout && (
              <button
                onClick={onProjectorLogout}
                className="p-1.5 rounded-lg bg-red-950/60 hover:bg-red-900 border border-red-800 text-red-300 hover:text-white transition"
                title="Lock Stage Screen"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      </header>

      <QRCodeModal
        isOpen={showQRModal}
        onClose={() => setShowQRModal(false)}
        sessionCode={session?.code || 'LIVE-892'}
      />
    </>
  );
};
