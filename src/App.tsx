/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { LiveSurveyProvider, useLiveSurvey } from './context/LiveSurveyContext';
import { NavigationHeader } from './components/NavigationHeader';
import { AudienceView } from './components/AudienceView';
import { ProjectorView } from './components/ProjectorView';
import { AdminDashboard } from './components/AdminDashboard';
import { ProjectorAuthGuard } from './components/ProjectorAuthGuard';
import { AdminAuthGuard } from './components/AdminAuthGuard';
import { Tv, ChevronDown, Menu } from 'lucide-react';

function SurveyAppContent() {
  const { role, setRole, session } = useLiveSurvey();

  // Header nav bar is hidden platform-wide by default so every view (audience,
  // stage and moderator console) opens as a clean, distraction-free screen.
  // The floating pill below brings it back on demand.
  const [isNavBarVisible, setIsNavBarVisible] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return sessionStorage.getItem('phoenix_nav_bar_visible') === 'true';
  });

  const toggleNavBar = () => {
    setIsNavBarVisible((prev) => {
      const next = !prev;
      try {
        sessionStorage.setItem('phoenix_nav_bar_visible', String(next));
      } catch {
        // Session storage unavailable - keep the in-memory state only
      }
      return next;
    });
  };

  // Authentication states
  const [isProjectorAuthed, setIsProjectorAuthed] = useState<boolean>(() => {
    return (
      typeof window !== 'undefined' &&
      (sessionStorage.getItem('phoenix_projector_auth') === 'true' ||
        sessionStorage.getItem('phonex_projector_auth') === 'true')
    );
  });

  const [isAdminAuthed, setIsAdminAuthed] = useState<boolean>(() => {
    return (
      typeof window !== 'undefined' &&
      Boolean(
        sessionStorage.getItem('phoenix_admin_auth') ||
          sessionStorage.getItem('phonex_admin_auth')
      )
    );
  });

  const handleAdminLogout = () => {
    sessionStorage.removeItem('phoenix_admin_auth');
    sessionStorage.removeItem('phonex_admin_auth');
    setIsAdminAuthed(false);
  };

  const handleProjectorLogout = () => {
    sessionStorage.removeItem('phoenix_projector_auth');
    sessionStorage.removeItem('phonex_projector_auth');
    setIsProjectorAuthed(false);
  };

  const isProjector = role === 'projector';

  return (
    <div className="min-h-screen bg-[#0a1936] text-slate-100 font-sans flex flex-col">
      {/* Navigation Header: hidden by default platform-wide, revealed on demand */}
      {isNavBarVisible && (
        <NavigationHeader
          isAdminAuthed={isAdminAuthed}
          isProjectorAuthed={isProjectorAuthed}
          onAdminLogout={handleAdminLogout}
          onProjectorLogout={handleProjectorLogout}
          onHideNavBar={toggleNavBar}
        />
      )}

      {/* Subtle floating pill to reveal the header nav bar (hidden while nav is open) */}
      {!isNavBarVisible && (
        <button
          id="toggle-nav-bar-pill"
          onClick={toggleNavBar}
          className="fixed top-2.5 right-3 z-50 px-2.5 py-1 bg-[#0c182e]/80 hover:bg-[#0c182e] text-slate-300 hover:text-white text-[11px] font-semibold rounded-full border border-[#1e3a63] shadow-md backdrop-blur-xs flex items-center gap-1.5 transition opacity-60 hover:opacity-100"
          title="Show navigation bar"
        >
          {isProjector ? <Tv className="w-3 h-3 text-red-400" /> : <Menu className="w-3 h-3 text-red-400" />}
          <span>Show Nav</span>
          <ChevronDown className="w-3 h-3" />
        </button>
      )}

      {/* Main View Area */}
      <main className="flex-1 flex flex-col">
        {/* Audience Screen: Default, light, simple and fun */}
        {role === 'audience' && (
          <div className="flex-1 bg-slate-50 text-slate-900">
            <AudienceView />
          </div>
        )}

        {/* Projector Screen: Stage presentation with passkey authentication */}
        {role === 'projector' && (
          <div className="flex-1">
            {!isProjectorAuthed ? (
              <ProjectorAuthGuard
                sessionCode={session?.code || 'LIVE-892'}
                expectedPasskey={session?.projectorPasskey || '8920'}
                onAuthenticated={() => setIsProjectorAuthed(true)}
                onCancelToAudience={() => setRole('audience')}
              />
            ) : (
              <ProjectorView />
            )}
          </div>
        )}

        {/* Admin Screen: Moderator console with email/password authentication */}
        {role === 'admin' && (
          <div className="flex-1 bg-slate-50 text-slate-900">
            {!isAdminAuthed ? (
              <AdminAuthGuard
                onAuthenticated={() => setIsAdminAuthed(true)}
                onCancelToAudience={() => setRole('audience')}
              />
            ) : (
              <AdminDashboard />
            )}
          </div>
        )}
      </main>
    </div>
  );
}

export default function App() {
  return (
    <LiveSurveyProvider>
      <SurveyAppContent />
    </LiveSurveyProvider>
  );
}
