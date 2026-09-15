/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { LiveSurveyProvider, useLiveSurvey } from './context/LiveSurveyContext';
import { AudienceView } from './components/AudienceView';
import { ProjectorView } from './components/ProjectorView';
import { AdminDashboard } from './components/AdminDashboard';
import { ProjectorAuthGuard } from './components/ProjectorAuthGuard';
import { AdminAuthGuard } from './components/AdminAuthGuard';

function SurveyAppContent() {
  const { role, setRole, session } = useLiveSurvey();

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

  return (
    <div className="min-h-screen bg-[#0a1936] text-slate-100 font-sans flex flex-col">

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
