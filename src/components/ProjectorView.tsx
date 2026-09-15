import React, { useState, useEffect, useRef } from 'react';
import { useLiveSurvey } from '../context/LiveSurveyContext';
import QRCode from 'qrcode';
import {
  Users,
  QrCode,
  Eye,
  EyeOff,
  Lock,
  Unlock,
  Maximize2,
  Minimize2,
  ChevronLeft,
  ChevronRight,
  Clock,
  Trophy,
  Star,
  CheckCircle2,
  MessageSquare,
  Sparkles,
  Palette,
  ArrowDownUp,
  Flame
} from 'lucide-react';

export const ProjectorView: React.FC = () => {
  const {
    session,
    questions,
    activeQuestion,
    aggregates,
    audienceCount,
    recentReactions,
    updateSessionSettings
  } = useLiveSurvey();

  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [showQRCard, setShowQRCard] = useState<boolean>(true);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [showThemePicker, setShowThemePicker] = useState<boolean>(false);

  // Auto-scroll toggle (persisted or controlled)
  const isAutoScrollActive = Boolean(session?.autoScrollProjector);

  // Auto-scroll ref
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);

  // Current aggregate for active question
  const currentAgg = activeQuestion ? aggregates[activeQuestion.id] : null;

  // Generate QR Code for on-screen audience join
  const audienceUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/`
    : '';

  useEffect(() => {
    if (audienceUrl) {
      QRCode.toDataURL(audienceUrl, {
        width: 260,
        margin: 1,
        color: {
          dark: '#081224',
          light: '#ffffff'
        }
      })
        .then((url) => setQrDataUrl(url))
        .catch((err) => console.error('Error generating projector QR code:', err));
    }
  }, [audienceUrl]);

  // Fullscreen change listener
  useEffect(() => {
    const handleFsChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };
    document.addEventListener('fullscreenchange', handleFsChange);
    return () => document.removeEventListener('fullscreenchange', handleFsChange);
  }, []);

  // Auto-scroll effect for long lists of options or comments
  useEffect(() => {
    if (!isAutoScrollActive) return;

    const el = scrollContainerRef.current;
    if (!el) return;

    let animationFrameId: number;
    let scrollDirection: 'down' | 'up' = 'down';
    let pauseCounter = 0;

    const step = () => {
      if (!scrollContainerRef.current) return;
      const container = scrollContainerRef.current;

      const maxScroll = container.scrollHeight - container.clientHeight;
      if (maxScroll <= 10) {
        // Not enough items to scroll
        animationFrameId = requestAnimationFrame(step);
        return;
      }

      if (pauseCounter > 0) {
        pauseCounter--;
        animationFrameId = requestAnimationFrame(step);
        return;
      }

      if (scrollDirection === 'down') {
        container.scrollTop += 0.7; // Smooth steady scrolling speed
        if (container.scrollTop >= maxScroll - 2) {
          scrollDirection = 'up';
          pauseCounter = 120; // 2 seconds pause at bottom
        }
      } else {
        container.scrollTop -= 1.2; // Return back smoothly
        if (container.scrollTop <= 2) {
          scrollDirection = 'down';
          pauseCounter = 90; // 1.5 seconds pause at top
        }
      }

      animationFrameId = requestAnimationFrame(step);
    };

    animationFrameId = requestAnimationFrame(step);

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [isAutoScrollActive, activeQuestion?.id, currentAgg]);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  };

  const handleNextQuestion = () => {
    if (!activeQuestion) return;
    const currentIndex = questions.findIndex((q) => q.id === activeQuestion.id);
    if (currentIndex < questions.length - 1) {
      updateSessionSettings({ activeQuestionId: questions[currentIndex + 1].id });
    }
  };

  const handlePrevQuestion = () => {
    if (!activeQuestion) return;
    const currentIndex = questions.findIndex((q) => q.id === activeQuestion.id);
    if (currentIndex > 0) {
      updateSessionSettings({ activeQuestionId: questions[currentIndex - 1].id });
    }
  };

  const toggleAutoScroll = () => {
    updateSessionSettings({ autoScrollProjector: !isAutoScrollActive });
  };

  const handleThemeChange = (newTheme: 'stage-dark' | 'bright-conference' | 'neon-indigo' | 'clean-minimal') => {
    updateSessionSettings({ theme: newTheme });
    setShowThemePicker(false);
  };

  // Phoenix SWS Default Theme: Brighter NavyBlue with touch of red
  const theme = session?.theme || 'stage-dark';

  const themeClasses = {
    'stage-dark': 'bg-[#0a1936] text-slate-100', // Phoenix SWS Brighter Navy Blue
    'bright-conference': 'bg-slate-50 text-slate-900',
    'neon-indigo': 'bg-[#08152e] text-slate-100',
    'clean-minimal': 'bg-[#0c1e3f] text-zinc-100'
  }[theme];

  const cardBgClass = {
    'stage-dark': 'bg-[#0f244a]/95 border-[#1d3d70] text-slate-100 shadow-2xl',
    'bright-conference': 'bg-white border-slate-200 text-slate-900 shadow-xl',
    'neon-indigo': 'bg-[#112a57]/90 border-red-900/40 text-slate-50 shadow-2xl shadow-red-950/20',
    'clean-minimal': 'bg-[#0d2142] border-[#1b3a6b] text-zinc-100 shadow-xl'
  }[theme];

  const currentQuestionIdx = activeQuestion
    ? questions.findIndex((q) => q.id === activeQuestion.id)
    : -1;

  const optionListLength = activeQuestion?.options?.length || 0;
  const shouldSuggestAutoScroll = optionListLength > 5;

  return (
    <div
      id="projector-stage-container"
      className={`min-h-screen w-full relative overflow-hidden flex flex-col justify-between p-6 sm:p-10 transition-colors duration-300 ${themeClasses}`}
    >
      {/* Floating Reaction Animation Layer */}
      <div className="pointer-events-none fixed inset-0 z-30 overflow-hidden">
        {recentReactions.map((rx) => (
          <div
            key={rx.id}
            className="absolute bottom-6 text-4xl sm:text-5xl"
            style={{
              left: `${rx.xPosition ?? 50}%`,
              animation: 'floatUp 3.2s cubic-bezier(0.2, 0.8, 0.2, 1) forwards',
              opacity: 0.95
            }}
          >
            {rx.emoji}
          </div>
        ))}
      </div>

      {/* Stage Header */}
      <header className="flex items-center justify-between gap-4 z-20 pb-4 border-b border-[#1d3d70]/70">
        <div className="flex items-center gap-3 sm:gap-4">
          {/* Phoenix SWS Brand Logo Badge */}
          <div className="w-11 h-11 rounded-2xl bg-[#0f2750] border-2 border-red-500/90 flex items-center justify-center font-black text-white text-base shadow-lg shadow-red-600/20">
            SWS
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-widest text-red-400">Phoenix SWS</span>
              <span className="text-xs text-slate-500">•</span>
              <span className="text-xs text-slate-300 font-medium">Stage Screen</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black tracking-tight flex items-center gap-3 text-white">
              <span>{session?.title || 'Interactive Audience Live Survey'}</span>
              <span className="text-xs px-2.5 py-1 rounded-md bg-red-950/80 text-red-300 font-mono font-bold border border-red-800/80">
                {session?.code || 'LIVE-892'}
              </span>
            </h1>
          </div>
        </div>

        {/* Live Audience & QR toggle on stage */}
        <div className="flex items-center gap-3">
          {/* Timer Display if running */}
          {session?.timerSecondsRemaining !== null && (
            <div
              className={`px-4 py-2 rounded-2xl border flex items-center gap-2 font-mono ${
                (session.timerSecondsRemaining || 0) <= 10
                  ? 'bg-red-950/80 border-red-500 text-red-200 animate-pulse'
                  : 'bg-[#10274f] border-[#1d3d70] text-amber-300'
              }`}
            >
              <Clock className="w-4 h-4" />
              <span className="font-bold text-lg">
                {Math.floor(session.timerSecondsRemaining / 60)}:
                {(session.timerSecondsRemaining % 60).toString().padStart(2, '0')}
              </span>
            </div>
          )}

          {/* Connected Attendees count */}
          <div className="px-4 py-2 rounded-2xl bg-[#10274f] border border-[#1d3d70] flex items-center gap-2">
            <Users className="w-4 h-4 text-red-400" />
            <span className="font-mono font-bold text-white text-base">{audienceCount}</span>
            <span className="text-xs text-slate-300">Live Attendees</span>
          </div>

          {/* Toggle QR side-card */}
          <button
            id="proj-toggle-qr-btn"
            onClick={() => setShowQRCard(!showQRCard)}
            className={`p-2.5 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition ${
              showQRCard
                ? 'bg-red-600 text-white border-red-500 shadow-md shadow-red-600/20'
                : 'bg-[#0f244a] border-[#1d3d70] text-slate-300 hover:text-white'
            }`}
          >
            <QrCode className="w-4 h-4" />
            <span className="hidden sm:inline">QR Code</span>
          </button>
        </div>
      </header>

      {/* Main Presentation Stage */}
      <main className="flex-1 flex flex-col lg:flex-row gap-8 items-stretch justify-center my-6 z-10 max-w-7xl mx-auto w-full min-h-0">
        {/* Left Column: Active Question & Live Aggregated Results */}
        <div className="flex-1 flex flex-col justify-between min-h-0">
          <div className="flex-1 flex flex-col min-h-0">
            {/* Question Header & Auto-scroll indicator */}
            <div className="mb-4">
              <div className="flex items-center justify-between gap-2 mb-2">
                <span className="text-xs font-bold uppercase tracking-wider text-red-400 bg-red-950/60 px-2.5 py-1 rounded-md border border-red-900/60">
                  Question {currentQuestionIdx + 1} of {questions.length} • {activeQuestion?.type.replace('_', ' ')}
                </span>

                {isAutoScrollActive && (
                  <span className="text-xs font-semibold text-emerald-400 bg-emerald-950/60 px-2.5 py-1 rounded-md border border-emerald-800/60 flex items-center gap-1.5 animate-pulse">
                    <ArrowDownUp className="w-3.5 h-3.5" />
                    <span>Auto-scrolling stage</span>
                  </span>
                )}
              </div>

              <h2 className="text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight leading-tight text-white mb-2">
                {activeQuestion ? activeQuestion.title : 'Waiting for survey to start...'}
              </h2>
              {activeQuestion?.description && (
                <p className="text-sm sm:text-base text-slate-300 font-medium leading-relaxed">
                  {activeQuestion.description}
                </p>
              )}
            </div>

            {/* Results Revealed vs Suspense Concealed */}
            {!session?.areResultsRevealed ? (
              <div
                className={`p-12 rounded-3xl border text-center flex flex-col items-center justify-center my-auto ${cardBgClass}`}
              >
                <div className="w-20 h-20 rounded-full bg-red-500/10 border border-red-500/30 flex items-center justify-center text-red-400 mb-4 animate-pulse">
                  <EyeOff className="w-10 h-10" />
                </div>
                <h3 className="text-2xl font-bold mb-2 text-white">Results are Hidden for Suspense</h3>
                <p className="text-sm text-slate-300 max-w-md">
                  Audience responses are being collected live. The moderator will reveal the aggregate results shortly!
                </p>
                <div className="mt-6 flex items-center gap-2 text-sm font-semibold text-red-400">
                  <span className="w-2 h-2 rounded-full bg-red-400 animate-ping" />
                  <span>{currentAgg?.totalResponses || 0} votes recorded</span>
                </div>
              </div>
            ) : activeQuestion ? (
              /* RESULTS DISPLAY BY TYPE with auto-scrolling container support */
              <div
                ref={scrollContainerRef}
                className="my-auto overflow-y-auto max-h-[56vh] pr-2 space-y-3.5 scroll-smooth"
              >
                {/* 1. MULTIPLE CHOICE BAR CHART */}
                {activeQuestion.type === 'multiple_choice' && (
                  <div className="space-y-3">
                    {activeQuestion.options.map((opt, idx) => {
                      const count = currentAgg?.optionCounts[opt.id] || 0;
                      const total = currentAgg?.totalResponses || 0;
                      const pct = total > 0 ? Math.round((count / total) * 100) : 0;

                      // Find if this option is the leader
                      const voteCounts = Object.values(currentAgg?.optionCounts || {}) as number[];
                      const maxVotes = voteCounts.length > 0 ? Math.max(0, ...voteCounts) : 0;
                      const isLeader = count > 0 && count === maxVotes;

                      return (
                        <div
                          key={opt.id}
                          className={`p-4 sm:p-5 rounded-2xl border transition-all relative overflow-hidden ${cardBgClass} ${
                            isLeader && total > 2
                              ? 'border-red-500 ring-2 ring-red-500/30'
                              : ''
                          }`}
                        >
                          {/* Animated Navy & Red Progress Bar Fill */}
                          <div
                            className={`absolute left-0 top-0 bottom-0 transition-all duration-700 ease-out ${
                              isLeader && total > 2
                                ? 'bg-gradient-to-r from-red-600/30 to-red-500/40'
                                : 'bg-[#1e3a63]/50'
                            }`}
                            style={{ width: `${pct}%` }}
                          />

                          <div className="relative z-10 flex items-center justify-between gap-4">
                            <div className="flex items-center gap-3 sm:gap-4 flex-1">
                              <span
                                className={`w-8 h-8 rounded-xl flex items-center justify-center font-black text-sm shrink-0 ${
                                  isLeader && total > 2
                                    ? 'bg-red-600 text-white shadow-md shadow-red-600/30'
                                    : 'bg-[#081224] border border-[#1e3a63] text-slate-200'
                                }`}
                              >
                                {String.fromCharCode(65 + idx)}
                              </span>
                              <span className="text-base sm:text-xl font-bold text-white">
                                {opt.text}
                              </span>
                              {isLeader && total > 2 && (
                                <span className="text-xs uppercase font-bold text-red-400 flex items-center gap-1 bg-red-950/80 px-2 py-0.5 rounded border border-red-800">
                                  <Flame className="w-3.5 h-3.5 fill-red-400" /> Leader
                                </span>
                              )}
                            </div>

                            <div className="flex items-center gap-4 shrink-0">
                              <span className="text-xs sm:text-sm font-mono text-slate-300">
                                {count} {count === 1 ? 'vote' : 'votes'}
                              </span>
                              <span className="text-xl sm:text-2xl font-black font-mono w-14 text-right text-white">
                                {pct}%
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* 2. RATING (1-5 STARS) SUMMARY */}
                {activeQuestion.type === 'rating' && (
                  <div className={`p-6 sm:p-8 rounded-3xl border ${cardBgClass}`}>
                    <div className="flex flex-col sm:flex-row items-center justify-around gap-6 mb-8">
                      <div className="text-center">
                        <span className="text-xs uppercase font-bold text-slate-400 block mb-1">
                          Average Rating
                        </span>
                        <div className="text-6xl font-black font-mono text-amber-400 flex items-center justify-center gap-2">
                          <span>{currentAgg?.averageRating?.toFixed(1) || '0.0'}</span>
                          <Star className="w-10 h-10 fill-amber-400 text-amber-400" />
                        </div>
                        <span className="text-xs text-slate-400 mt-1 block">
                          out of 5.0 stars ({currentAgg?.totalResponses || 0} responses)
                        </span>
                      </div>

                      {/* Stars distribution bars */}
                      <div className="w-full sm:w-80 space-y-2">
                        {[5, 4, 3, 2, 1].map((star) => {
                          const count = currentAgg?.ratingDistribution?.[star] || 0;
                          const total = currentAgg?.totalResponses || 0;
                          const pct = total > 0 ? Math.round((count / total) * 100) : 0;

                          return (
                            <div key={star} className="flex items-center gap-2 text-xs">
                              <span className="w-6 font-bold flex items-center gap-0.5 font-mono text-slate-300">
                                {star}★
                              </span>
                              <div className="flex-1 h-3 rounded-full bg-[#081224] border border-[#1e3a63] overflow-hidden">
                                <div
                                  className="h-full bg-amber-400 rounded-full transition-all duration-500"
                                  style={{ width: `${pct}%` }}
                                />
                              </div>
                              <span className="w-8 text-right font-mono text-slate-400">{pct}%</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}

                {/* 3. NPS (NET PROMOTER SCORE) */}
                {activeQuestion.type === 'nps' && (
                  <div className={`p-6 sm:p-8 rounded-3xl border ${cardBgClass}`}>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
                      <div className="p-4 rounded-2xl bg-emerald-950/30 border border-emerald-800/60 text-center">
                        <span className="text-xs font-bold uppercase text-emerald-400 block mb-1">Promoters (9-10)</span>
                        <span className="text-3xl font-black font-mono text-emerald-300">
                          {currentAgg?.npsScore?.promoters || 0}
                        </span>
                      </div>
                      <div className="p-4 rounded-2xl bg-amber-950/30 border border-amber-800/60 text-center">
                        <span className="text-xs font-bold uppercase text-amber-400 block mb-1">Passives (7-8)</span>
                        <span className="text-3xl font-black font-mono text-amber-300">
                          {currentAgg?.npsScore?.passives || 0}
                        </span>
                      </div>
                      <div className="p-4 rounded-2xl bg-red-950/30 border border-red-800/60 text-center">
                        <span className="text-xs font-bold uppercase text-red-400 block mb-1">Detractors (0-6)</span>
                        <span className="text-3xl font-black font-mono text-red-300">
                          {currentAgg?.npsScore?.detractors || 0}
                        </span>
                      </div>
                    </div>

                    <div className="text-center pt-2 border-t border-[#1e3a63]/60">
                      <span className="text-xs uppercase tracking-wider text-slate-400">Calculated Net Promoter Score</span>
                      <div className="text-5xl font-black font-mono mt-1 text-white">
                        {currentAgg?.npsScore?.score !== undefined ? currentAgg.npsScore.score : 0}
                      </div>
                    </div>
                  </div>
                )}

                {/* 4. OPEN-ENDED LIVE AUDIENCE FEEDBACK WALL */}
                {activeQuestion.type === 'open_text' && (
                  <div className={`p-6 sm:p-8 rounded-3xl border ${cardBgClass}`}>
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2">
                        <MessageSquare className="w-5 h-5 text-red-400" />
                        <h3 className="font-bold text-lg text-white">Live Audience Comments & Questions</h3>
                      </div>
                      <span className="text-xs font-mono text-slate-400">
                        {currentAgg?.openResponses.filter((r) => r.isApproved).length || 0} approved
                      </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                      {currentAgg?.openResponses
                        .filter((r) => r.isApproved)
                        .map((item) => (
                          <div
                            key={item.id}
                            className="p-4 rounded-2xl bg-[#081224] border border-[#1e3a63] text-base font-medium leading-relaxed animate-in fade-in"
                          >
                            <p className="mb-2 text-white">"{item.text}"</p>
                            <span className="text-[11px] font-mono text-slate-400 block">
                              {new Date(item.createdAt).toLocaleTimeString([], {
                                hour: '2-digit',
                                minute: '2-digit',
                                second: '2-digit'
                              })}
                            </span>
                          </div>
                        ))}

                      {(!currentAgg?.openResponses ||
                        currentAgg.openResponses.filter((r) => r.isApproved).length === 0) && (
                        <div className="col-span-2 text-center py-12 text-slate-400">
                          <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-40 text-red-400" />
                          <p>Waiting for attendees to submit feedback...</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ) : null}
          </div>

          {/* Question Summary Bar */}
          <div className="flex items-center justify-between mt-4 pt-3 border-t border-[#1e3a63]/70 text-xs sm:text-sm font-medium text-slate-400">
            <div className="flex items-center gap-4">
              <span>
                Total Responses: <strong className="font-mono text-white">{currentAgg?.totalResponses || 0}</strong>
              </span>
              <span>
                Audience Participation:{' '}
                <strong className="font-mono text-red-400">
                  {audienceCount > 0 && currentAgg
                    ? Math.min(100, Math.round((currentAgg.totalResponses / audienceCount) * 100))
                    : 0}
                  %
                </strong>
              </span>
            </div>

            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              <span className="text-slate-300">Live Stage Broadcast</span>
            </div>
          </div>
        </div>

        {/* Right Column: High-Visibility QR Code Card for Audience Join */}
        {showQRCard && (
          <aside className="w-full lg:w-72 flex flex-col items-center justify-center shrink-0">
            <div
              id="projector-qr-card"
              className={`w-full p-6 rounded-3xl border text-center flex flex-col items-center justify-center ${cardBgClass}`}
            >
              <span className="text-xs font-bold uppercase tracking-wider text-red-400 mb-1">
                Scan to Participate
              </span>
              <span className="text-xs text-slate-400 mb-3">
                Open phone camera to vote instantly
              </span>

              {qrDataUrl ? (
                <div className="p-2.5 bg-white rounded-2xl shadow-xl my-2 border-2 border-red-500/20">
                  <img
                    src={qrDataUrl}
                    alt="Join live survey"
                    className="w-44 h-44 sm:w-48 sm:h-48 rounded-xl"
                    referrerPolicy="no-referrer"
                  />
                </div>
              ) : (
                <div className="w-48 h-48 rounded-2xl bg-[#081224] flex items-center justify-center text-xs opacity-50">
                  Loading QR...
                </div>
              )}

              <div className="w-full mt-3 pt-3 border-t border-[#1e3a63]">
                <span className="text-[11px] text-slate-400 block uppercase font-medium">Session Code</span>
                <span className="text-2xl font-black tracking-widest text-red-400 font-mono">
                  {session?.code || 'LIVE-892'}
                </span>
                <p className="text-[10px] text-slate-400 mt-1 break-all">Join: {audienceUrl || `${typeof window !== 'undefined' ? window.location.origin : ''}/`}</p>
                <p className="text-[11px] text-slate-400">Default link to audience page</p>
              </div>
            </div>
          </aside>
        )}
      </main>

      {/* Floating Presentation Control Dock (Bottom Stage Toolbar) */}
      <footer className="z-20 flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-[#1e3a63]/70">
        {/* Navigation buttons */}
        <div className="flex items-center gap-2">
          <button
            id="proj-prev-question-btn"
            onClick={handlePrevQuestion}
            disabled={currentQuestionIdx <= 0}
            className="p-2.5 rounded-xl bg-[#0c182e] hover:bg-[#122340] border border-[#1e3a63] disabled:opacity-30 disabled:cursor-not-allowed transition text-xs font-semibold flex items-center gap-1 text-white"
            title="Previous question"
          >
            <ChevronLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Prev</span>
          </button>
          <span className="text-xs font-mono text-slate-400 px-1">
            {currentQuestionIdx + 1} / {questions.length}
          </span>
          <button
            id="proj-next-question-btn"
            onClick={handleNextQuestion}
            disabled={currentQuestionIdx >= questions.length - 1}
            className="p-2.5 rounded-xl bg-[#0c182e] hover:bg-[#122340] border border-[#1e3a63] disabled:opacity-30 disabled:cursor-not-allowed transition text-xs font-semibold flex items-center gap-1 text-white"
            title="Next question"
          >
            <span className="hidden sm:inline">Next</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* Presentation Controls: Auto-scroll, Lock voting, Reveal/Conceal, Fullscreen */}
        <div className="flex items-center gap-2">
          {/* THEME SWITCH (light/dark etc.) */}
          <div className="relative">
            <button
              id="proj-theme-btn"
              onClick={() => setShowThemePicker((v) => !v)}
              className={`p-2.5 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition ${
                showThemePicker ? 'bg-[#122340] border-[#1e3a63] text-white' : 'bg-[#0c182e] border-[#1e3a63] text-slate-300 hover:text-white hover:bg-[#122340]'
              }`}
              title="Switch stage theme (light/dark)"
            >
              <Palette className="w-4 h-4" />
              <span>Theme</span>
            </button>
            {showThemePicker && (
              <div className="absolute bottom-full mb-2 left-0 bg-[#0c182e] border border-[#1e3a63] rounded-xl p-2 shadow-xl z-30 w-56">
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 px-1 mb-1">Stage Theme</p>
                {[
                  { id: 'stage-dark', label: 'Dark (Navy)', desc: 'Default bright navy + red' },
                  { id: 'bright-conference', label: 'Light', desc: 'Bright conference light' },
                  { id: 'neon-indigo', label: 'Neon Indigo', desc: 'Deep indigo neon' },
                  { id: 'clean-minimal', label: 'Clean Minimal', desc: 'Minimal dark blue' },
                ].map((t) => (
                  <button
                    key={t.id}
                    onClick={() => handleThemeChange(t.id as any)}
                    className={`w-full text-left px-3 py-2 rounded-lg text-xs flex items-center justify-between ${theme === t.id ? 'bg-red-600 text-white' : 'text-slate-300 hover:bg-[#10274f] hover:text-white'}`}
                  >
                    <span><strong>{t.label}</strong><span className="block text-[10px] opacity-70">{t.desc}</span></span>
                    {theme === t.id && <CheckCircle2 className="w-3.5 h-3.5" />}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* AUTO-SCROLL TOGGLE FEATURE (Requested: ensures all items remain visible) */}
          <button
            id="proj-toggle-autoscroll-btn"
            onClick={toggleAutoScroll}
            className={`p-2.5 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition ${
              isAutoScrollActive
                ? 'bg-red-600 text-white border-red-500 shadow-md shadow-red-600/20'
                : 'bg-[#0c182e] border-[#1e3a63] text-slate-300 hover:text-white hover:bg-[#122340]'
            }`}
            title="Automatically scroll down and up to show all survey items on screen"
          >
            <ArrowDownUp className="w-4 h-4" />
            <span>{isAutoScrollActive ? 'Auto-Scroll ON' : 'Auto-Scroll'}</span>
          </button>

          {/* Toggle Voting Lock */}
          <button
            id="proj-toggle-lock-btn"
            onClick={() => updateSessionSettings({ isVotingOpen: !session?.isVotingOpen })}
            className={`p-2.5 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition ${
              session?.isVotingOpen
                ? 'bg-emerald-950/80 text-emerald-300 border-emerald-800 hover:bg-emerald-900/80'
                : 'bg-amber-950/80 text-amber-300 border-amber-800 hover:bg-amber-900/80'
            }`}
            title={session?.isVotingOpen ? 'Lock Audience Voting' : 'Unlock Audience Voting'}
          >
            {session?.isVotingOpen ? <Unlock className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
            <span className="hidden sm:inline">
              {session?.isVotingOpen ? 'Voting Open' : 'Voting Locked'}
            </span>
          </button>

          {/* Toggle Reveal / Hide Results */}
          <button
            id="proj-toggle-reveal-btn"
            onClick={() => updateSessionSettings({ areResultsRevealed: !session?.areResultsRevealed })}
            className={`p-2.5 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition ${
              session?.areResultsRevealed
                ? 'bg-[#0e2243] text-slate-200 border-[#1e3a63] hover:bg-[#152e59]'
                : 'bg-red-950/80 text-red-200 border-red-800 hover:bg-red-900/80'
            }`}
            title="Conceal or Reveal Results on Stage"
          >
            {session?.areResultsRevealed ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
            <span className="hidden sm:inline">
              {session?.areResultsRevealed ? 'Results Visible' : 'Results Hidden'}
            </span>
          </button>

          {/* Fullscreen Button */}
          <button
            id="proj-fullscreen-btn"
            onClick={toggleFullscreen}
            className="p-2.5 rounded-xl bg-[#0c182e] hover:bg-[#122340] border border-[#1e3a63] text-white transition text-xs font-semibold flex items-center gap-1.5"
            title="Toggle Stage Fullscreen"
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            <span className="hidden sm:inline">{isFullscreen ? 'Exit' : 'Fullscreen'}</span>
          </button>
        </div>
      </footer>

      {/* Global Float Up Animation Keyframes */}
      <style>{`
        @keyframes floatUp {
          0% {
            transform: translateY(0) scale(0.7);
            opacity: 0;
          }
          15% {
            opacity: 1;
            transform: translateY(-50px) scale(1.2);
          }
          80% {
            opacity: 0.9;
          }
          100% {
            transform: translateY(-550px) scale(1.4);
            opacity: 0;
          }
        }
      `}</style>
    </div>
  );
};
