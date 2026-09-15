import React, { useState, useEffect } from 'react';
import { useLiveSurvey } from '../context/LiveSurveyContext';
import { ConfettiOverlay } from './ConfettiOverlay';
import {
  CheckCircle2,
  Clock,
  Lock,
  Send,
  Star,
  AlertCircle,
  BadgeCheck,
  Mail,
  Phone,
  UserRound,
  ArrowRight,
  Sparkles,
  Gift,
  Ticket,
  Award,
  HandHeart
} from 'lucide-react';

export const AudienceView: React.FC = () => {
  const {
    session,
    questions,
    activeQuestion,
    mySubmittedVotes,
    submitVote,
    sendReaction,
    participant,
    identityConfig,
    registerIdentity,
    giftConfig,
    giftWinnings,
    myGiftWinning,
    claimGift
  } = useLiveSurvey();

  // Selected state for active question
  const [selectedOptions, setSelectedOptions] = useState<string[]>([]);
  const [selectedRating, setSelectedRating] = useState<number | null>(null);
  const [openText, setOpenText] = useState<string>('');
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [feedbackMsg, setFeedbackMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [triggerConfetti, setTriggerConfetti] = useState<boolean>(false);

  // Audience identity capture state
  const [identityName, setIdentityName] = useState<string>('');
  const [identityEmail, setIdentityEmail] = useState<string>('');
  const [identityPhone, setIdentityPhone] = useState<string>('');
  const [identityError, setIdentityError] = useState<string | null>(null);
  const [identitySaving, setIdentitySaving] = useState<boolean>(false);
  const [identitySkipped, setIdentitySkipped] = useState<boolean>(false);

  // Gift lottery state
  const [showGiftModal, setShowGiftModal] = useState(false);
  const [newlyWonGift, setNewlyWonGift] = useState<any>(null);
  const [claimingGift, setClaimingGift] = useState(false);

  // Sync state with previously submitted vote if any
  useEffect(() => {
    if (activeQuestion) {
      const existing = mySubmittedVotes[activeQuestion.id];
      if (existing) {
        setSelectedOptions(existing.optionIds || []);
        setSelectedRating(existing.rating !== undefined ? existing.rating : null);
        setOpenText(existing.text || '');
      } else {
        setSelectedOptions([]);
        setSelectedRating(null);
        setOpenText('');
      }
      setFeedbackMsg(null);
    }
  }, [activeQuestion?.id, mySubmittedVotes]);

  // Prefill the identity form with the already registered details
  useEffect(() => {
    if (participant) {
      setIdentityName(participant.name || '');
      setIdentityEmail(participant.email || '');
      setIdentityPhone(participant.phone || '');
    }
  }, [participant]);

  if (!session) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center p-6 text-center text-slate-600">
        <div className="w-9 h-9 border-4 border-[#0c244d] border-t-red-600 rounded-full animate-spin mb-3" />
        <p className="font-semibold text-slate-800">Connecting to Phoenix SWS live survey...</p>
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // Subtle survey progress (how many questions are still ahead)
  // ---------------------------------------------------------------------------
  const totalQuestions = questions.length;
  const answeredCount = questions.filter((q) => Boolean(mySubmittedVotes[q.id])).length;
  const remainingQuestions = Math.max(totalQuestions - answeredCount, 0);
  const progressPercent = totalQuestions > 0 ? Math.round((answeredCount / totalQuestions) * 100) : 0;
  const currentQuestionNumber = activeQuestion
    ? questions.findIndex((q) => q.id === activeQuestion.id) + 1
    : 0;
  const isSurveyCompleted = totalQuestions > 0 && answeredCount >= totalQuestions;

  const progressBar = totalQuestions > 0 ? (
    <div
      id="audience-progress-bar"
      className="fixed top-0 left-0 right-0 z-[60] pointer-events-none select-none"
      title={`${answeredCount} of ${totalQuestions} answered`}
      aria-label={`Survey progress: ${answeredCount} of ${totalQuestions} answered, ${remainingQuestions} remaining`}
      role="progressbar"
      aria-valuenow={answeredCount}
      aria-valuemin={0}
      aria-valuemax={totalQuestions}
    >
      <div className="h-[3px] w-full bg-slate-200/60 backdrop-blur-[1px]">
        <div
          id="audience-progress-fill"
          className="h-full bg-gradient-to-r from-red-500 via-red-600 to-[#0c244d] rounded-r-full transition-all duration-700 ease-out shadow-[0_0_6px_rgba(220,38,38,0.35)]"
          style={{ width: `${progressPercent}%` }}
        />
      </div>
      <div className="flex justify-center mt-1.5">
        <span
          id="audience-progress-label"
          className="px-2.5 py-0.5 rounded-full bg-white/90 backdrop-blur-sm border border-slate-200 text-[10px] font-semibold tracking-wide text-slate-500 shadow-sm"
        >
          {remainingQuestions === 0
            ? `All ${totalQuestions} question${totalQuestions !== 1 ? 's' : ''} answered ✓`
            : currentQuestionNumber > 0
            ? `Question ${currentQuestionNumber} of ${totalQuestions} · ${remainingQuestions} remaining`
            : `${remainingQuestions} of ${totalQuestions} question${totalQuestions !== 1 ? 's' : ''} remaining`}
        </span>
      </div>
    </div>
  ) : null;

  // ---------------------------------------------------------------------------
  // Audience identity (unique ID issuance & tracking)
  // ---------------------------------------------------------------------------
  const identityEnabled = Boolean(identityConfig?.enabled);
  const identityRequired = identityEnabled && Boolean(identityConfig?.required);
  const showIdentityGate = identityEnabled && !participant && (!identitySkipped || identityRequired);

  const identityChip = identityEnabled ? (
    participant ? (
      <div
        id="audience-identity-chip"
        className="mb-3 flex items-center justify-between gap-2 px-3 py-1.5 rounded-xl bg-white border border-slate-200 shadow-xs"
      >
        <span className="flex items-center gap-1.5 min-w-0">
          <BadgeCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
          <span className="truncate text-[11px] font-semibold text-slate-700">
            {participant.name || participant.email || participant.phone || 'Registered attendee'}
          </span>
        </span>
        <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-slate-100 border border-slate-200 text-slate-500 shrink-0">
          {participant.uniqueId}
        </span>
      </div>
    ) : (
      <button
        id="audience-add-details-btn"
        onClick={() => setIdentitySkipped(false)}
        className="mb-3 w-full flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-dashed border-slate-300 text-[11px] font-semibold text-slate-500 hover:text-red-600 hover:border-red-300 transition cursor-pointer"
      >
        <BadgeCheck className="w-3.5 h-3.5" />
        <span>Add your details to get a unique attendee ID</span>
      </button>
    )
  ) : null;

  const handleRegisterIdentity = async (e: React.FormEvent) => {
    e.preventDefault();
    if (identitySaving) return;

    const trimmedName = identityName.trim();
    const trimmedEmail = identityEmail.trim();
    const trimmedPhone = identityPhone.trim();

    if (identityRequired) {
      if (identityConfig.captureName && !trimmedName) {
        setIdentityError('Please enter your full name');
        return;
      }
      if (identityConfig.captureEmail && !trimmedEmail) {
        setIdentityError('Please enter your email address');
        return;
      }
      if (identityConfig.capturePhone && !trimmedPhone) {
        setIdentityError('Please enter your phone number');
        return;
      }
    }

    if (trimmedName && trimmedName.length < 2) {
      setIdentityError('Please enter a valid name (at least 2 characters)');
      return;
    }
    if (trimmedEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      setIdentityError('Please enter a valid email address');
      return;
    }
    if (trimmedPhone && trimmedPhone.replace(/[^0-9]/g, '').length < 7) {
      setIdentityError('Please enter a valid phone number');
      return;
    }
    if (!trimmedName && !trimmedEmail && !trimmedPhone) {
      setIdentityError('Add at least one detail so we can issue your attendee ID');
      return;
    }

    setIdentitySaving(true);
    setIdentityError(null);
    const res = await registerIdentity({
      name: trimmedName || undefined,
      email: trimmedEmail || undefined,
      phone: trimmedPhone || undefined
    });
    setIdentitySaving(false);

    if (!res.success) {
      setIdentityError(res.message || 'Could not save your details. Please try again.');
      return;
    }

    setIdentitySkipped(false);
    setTriggerConfetti(true);
  };

  // Identity gate screen (shown before answering when identity capture is enabled)
  if (showIdentityGate) {
    return (
      <div className="max-w-md mx-auto px-4 pt-9 pb-6 flex flex-col min-h-[calc(100vh-56px)] relative">
        <ConfettiOverlay trigger={triggerConfetti} onComplete={() => setTriggerConfetti(false)} />
        {progressBar}

        <div id="audience-identity-gate" className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center text-red-600 shrink-0">
              <BadgeCheck className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-base font-black text-[#0c244d] leading-tight">Who's joining us?</h1>
              <p className="text-[11px] text-slate-500">
                {identityRequired
                  ? 'Required to take part in this survey'
                  : 'Optional — you can also continue as a guest'}
              </p>
            </div>
          </div>

          <p className="text-xs text-slate-500 leading-relaxed my-3">
            <strong className="text-slate-700">{session.title}</strong> issues a unique attendee ID to everyone who
            registers, so your answers stay linked to you during and after the event.
          </p>

          <form onSubmit={handleRegisterIdentity} className="space-y-3">
            {identityConfig.captureName && (
              <div>
                <label htmlFor="audience-identity-name" className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                  Full name {identityRequired ? '*' : '(optional)'}
                </label>
                <div className="relative">
                  <input
                    id="audience-identity-name"
                    type="text"
                    value={identityName}
                    onChange={(e) => setIdentityName(e.target.value)}
                    placeholder="e.g. Ada Lovelace"
                    maxLength={80}
                    className="w-full px-3.5 py-2.5 pl-10 text-sm border border-slate-300 rounded-xl focus:outline-none focus:border-red-600 transition"
                  />
                  <UserRound className="w-4 h-4 text-slate-400 absolute left-3 top-3.5" />
                </div>
              </div>
            )}

            {identityConfig.captureEmail && (
              <div>
                <label htmlFor="audience-identity-email" className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                  Email {identityRequired ? '*' : '(optional)'}
                </label>
                <div className="relative">
                  <input
                    id="audience-identity-email"
                    type="email"
                    value={identityEmail}
                    onChange={(e) => setIdentityEmail(e.target.value)}
                    placeholder="you@company.com"
                    maxLength={120}
                    className="w-full px-3.5 py-2.5 pl-10 text-sm border border-slate-300 rounded-xl focus:outline-none focus:border-red-600 transition"
                  />
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3.5" />
                </div>
              </div>
            )}

            {identityConfig.capturePhone && (
              <div>
                <label htmlFor="audience-identity-phone" className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                  Phone number {identityRequired ? '*' : '(optional)'}
                </label>
                <div className="relative">
                  <input
                    id="audience-identity-phone"
                    type="tel"
                    value={identityPhone}
                    onChange={(e) => setIdentityPhone(e.target.value)}
                    placeholder="+1 555 000 1234"
                    maxLength={24}
                    className="w-full px-3.5 py-2.5 pl-10 text-sm border border-slate-300 rounded-xl focus:outline-none focus:border-red-600 transition"
                  />
                  <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-3.5" />
                </div>
              </div>
            )}

            {identityError && (
              <div
                id="audience-identity-error"
                className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2"
              >
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{identityError}</span>
              </div>
            )}

            <button
              id="audience-save-identity-btn"
              type="submit"
              disabled={identitySaving}
              className="w-full py-3.5 px-4 rounded-xl bg-red-600 hover:bg-red-500 disabled:opacity-60 text-white font-bold text-sm flex items-center justify-center gap-2 shadow-sm transition active:scale-[0.99] cursor-pointer"
            >
              {identitySaving ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>Save &amp; Get My Attendee ID</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>

            {!identityRequired && (
              <button
                id="audience-skip-identity-btn"
                type="button"
                onClick={() => setIdentitySkipped(true)}
                className="w-full py-2.5 rounded-xl border border-slate-200 text-slate-500 text-xs font-semibold hover:bg-slate-50 transition cursor-pointer"
              >
                Skip for now and answer as guest
              </button>
            )}
          </form>
        </div>
      </div>
    );
  }

  // Simple, light & fun waiting screen
  if (!activeQuestion) {
    return (
      <div className="max-w-md mx-auto px-4 pt-9 pb-6 flex flex-col items-center justify-center min-h-[calc(100vh-56px)] text-center">
        {progressBar}

        <div className="w-16 h-16 rounded-2xl bg-blue-50 border border-blue-200 flex items-center justify-center text-red-600 mb-4 shadow-sm">
          <Clock className="w-8 h-8 animate-pulse text-red-600" />
        </div>
        <h2 className="text-xl font-bold text-slate-900 mb-1">You're in! 🎉</h2>
        <p className="text-slate-500 text-sm mb-6">
          The survey question will appear right here when the presenter begins.
        </p>

        <div className="w-full">
          {identityChip}
        </div>

        {/* Fun Cheer buttons while waiting */}
        <div className="w-full bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-3">
            Tap to Cheer the Speaker
          </span>
          <div className="flex justify-center gap-2 sm:gap-3">
            {['👏', '🔥', '❤️', '💡', '🚀'].map((emoji) => (
              <button
                key={emoji}
                onClick={() => sendReaction(emoji)}
                className="w-12 h-12 text-2xl rounded-xl bg-slate-50 border border-slate-200 hover:border-red-400 active:scale-90 transition-transform shadow-xs flex items-center justify-center cursor-pointer"
              >
                {emoji}
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const hasVoted = Boolean(mySubmittedVotes[activeQuestion.id]);
  const isVotingOpen = session.isVotingOpen;

  const handleOptionToggle = (optId: string) => {
    if (!isVotingOpen) return;
    if (activeQuestion.allowMultiple) {
      setSelectedOptions((prev) =>
        prev.includes(optId) ? prev.filter((id) => id !== optId) : [...prev, optId]
      );
    } else {
      setSelectedOptions([optId]);
    }
  };

  const handleSubmit = async () => {
    if (!isVotingOpen || submitting) return;

    let payload: { selectedOptionIds?: string[]; ratingValue?: number; textValue?: string } = {};

    if (activeQuestion.type === 'multiple_choice') {
      if (selectedOptions.length === 0) {
        setFeedbackMsg({ text: 'Please pick an answer before submitting', type: 'error' });
        return;
      }
      payload = { selectedOptionIds: selectedOptions };
    } else if (activeQuestion.type === 'rating' || activeQuestion.type === 'nps') {
      if (selectedRating === null) {
        setFeedbackMsg({ text: 'Please select a score rating before submitting', type: 'error' });
        return;
      }
      payload = { ratingValue: selectedRating };
    } else if (activeQuestion.type === 'open_text') {
      if (!openText.trim()) {
        setFeedbackMsg({ text: 'Please type your answer', type: 'error' });
        return;
      }
      payload = { textValue: openText.trim() };
    }

    setSubmitting(true);
    setFeedbackMsg(null);

    const res = await submitVote(activeQuestion.id, payload);
    setSubmitting(false);

    if (res.success) {
      const isFinal = Boolean((res as any).isFinalCompletion);
      if (isFinal && (res as any).giftWinning) {
        setNewlyWonGift((res as any).giftWinning);
        setShowGiftModal(true);
        setFeedbackMsg({ text: `🎉 Survey completed! You won: ${(res as any).giftWinning.giftEmoji} ${(res as any).giftWinning.giftName}!`, type: 'success' });
      } else if (isFinal && giftConfig?.enabled) {
        setFeedbackMsg({ text: '🎉 Survey completed! Thanks for finishing — lottery winners are being picked 🎲', type: 'success' });
      } else if (isFinal) {
        setFeedbackMsg({ text: '🎉 Survey completed! Thank you for your feedback!', type: 'success' });
      } else {
        const remainingAfter = Math.max(totalQuestions - (answeredCount + 1), 0);
        if (remainingAfter > 0) setFeedbackMsg({ text: `Response saved! ${remainingAfter} question${remainingAfter !== 1 ? 's' : ''} remaining 🎉`, type: 'success' });
        else setFeedbackMsg({ text: 'Response saved! Thank you 🎉', type: 'success' });
      }
      setTriggerConfetti(true);
    } else {
      setFeedbackMsg({ text: res.message || 'Failed to submit', type: 'error' });
    }
  };

  const handleClaimGift = async () => {
    if (!myGiftWinning || claimingGift) return;
    if (myGiftWinning.claimed) return;
    setClaimingGift(true);
    const res = await claimGift();
    setClaimingGift(false);
    if (res.success) setFeedbackMsg({ text: 'Gift claimed! Show this screen to the coordinator 🎉', type: 'success' });
  };

  const giftPersistentCard = myGiftWinning ? (
    <div id="audience-gift-card" className="mb-3 rounded-2xl border-2 border-amber-300 bg-gradient-to-br from-amber-50 to-orange-50 p-3.5 shadow-md relative overflow-hidden">
      <div className="absolute -right-6 -top-6 w-20 h-20 bg-amber-200/40 rounded-full blur-xl" />
      <div className="relative flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-white border border-amber-200 flex items-center justify-center text-xl shadow-sm shrink-0">
            {myGiftWinning.giftEmoji}
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <Gift className="w-3.5 h-3.5 text-amber-600" />
              <span className="text-[11px] font-bold uppercase tracking-wider text-amber-700">You Won a Gift!</span>
              {myGiftWinning.claimed && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-100 border border-emerald-200 text-emerald-700 font-bold">Claimed ✓</span>}
            </div>
            <p className="text-sm font-black text-slate-900 leading-tight">{myGiftWinning.giftName}</p>
            <p className="text-[11px] text-slate-600 leading-snug">{giftConfig?.claimInstructions || 'Meet the coordinator at the desk to claim your gift.'}</p>
          </div>
        </div>
        {!myGiftWinning.claimed ? (
          <button onClick={handleClaimGift} disabled={claimingGift} className="shrink-0 px-3 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 disabled:opacity-60 text-white text-xs font-bold shadow-sm flex items-center gap-1">
            {claimingGift ? <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <><HandHeart className="w-3.5 h-3.5" /><span>Claim</span></>}
          </button>
        ) : (
          <div className="shrink-0 flex flex-col items-center gap-1">
            <Award className="w-6 h-6 text-emerald-600" />
            <span className="text-[10px] font-bold text-emerald-700">Ready to collect</span>
          </div>
        )}
      </div>
      <div className="mt-2 flex items-center gap-2">
        <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-white border border-amber-200 text-slate-500">Code: {myGiftWinning.id.slice(-6).toUpperCase()}</span>
        <span className="text-[10px] text-slate-500">Show to coordinator</span>
      </div>
    </div>
  ) : giftConfig?.enabled ? (
    <div className="mb-3 rounded-xl border border-dashed border-amber-200 bg-amber-50/50 px-3 py-2 flex items-center gap-2">
      <Ticket className="w-4 h-4 text-amber-600 shrink-0" />
      <span className="text-[11px] font-medium text-amber-800">Submit your answer to enter the gift lottery — {giftConfig.winRatio}% will win! 🎁</span>
    </div>
  ) : null;

  return (
    <div className="max-w-md mx-auto px-4 pt-9 pb-5 sm:pb-6 flex flex-col min-h-[calc(100vh-56px)] relative">
      {/* Subtle Confetti Animation on Response Submit */}
      <ConfettiOverlay
        trigger={triggerConfetti}
        onComplete={() => setTriggerConfetti(false)}
      />

      {/* Subtle survey progress bar (questions remaining) */}
      {progressBar}

      {/* Registered attendee identity (unique tracking ID) / guest prompt */}
      {identityChip}

      {/* Persistent gift card (hidden after final completion — completion card shows it) */}
      {!isSurveyCompleted && giftPersistentCard}

      {/* Timer or Locked warning */}
      {session.timerSecondsRemaining !== null && (
        <div
          id="audience-timer-pill"
          className="mb-3 flex items-center justify-between px-3.5 py-2 rounded-xl bg-red-50 border border-red-200 text-xs font-semibold text-red-900"
        >
          <div className="flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-red-600" />
            <span>Time Left</span>
          </div>
          <span className="font-mono font-bold text-sm">
            {Math.floor(session.timerSecondsRemaining / 60)}:
            {(session.timerSecondsRemaining % 60).toString().padStart(2, '0')}
          </span>
        </div>
      )}

      {!isVotingOpen && (
        <div
          id="voting-locked-pill"
          className="mb-3 flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-100 border border-slate-300 text-xs font-semibold text-slate-700"
        >
          <Lock className="w-3.5 h-3.5 text-slate-500" />
          <span>Voting is paused by speaker</span>
        </div>
      )}

      {/* Survey Completed — gift after final completion */}
      {isSurveyCompleted && (
        <div id="audience-completion-card" className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs mb-4 flex-1 flex flex-col items-center text-center justify-center">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center text-2xl shadow-lg mb-3">🎉</div>
          <h2 className="text-xl font-black text-[#0c244d]">Survey Completed!</h2>
          <p className="text-sm text-slate-500 mt-1 max-w-xs">Thank you for completing all {totalQuestions} questions. Your feedback has been recorded.</p>
          {myGiftWinning ? (
            <div className="mt-4 w-full p-3 rounded-xl bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200 text-left">
              <div className="flex items-center gap-2 mb-1"><Gift className="w-4 h-4 text-amber-600" /><span className="text-xs font-bold uppercase tracking-wider text-amber-700">Your Gift</span><span className={`ml-auto text-[10px] px-1.5 py-0.5 rounded-full border font-bold ${myGiftWinning.claimed ? 'bg-emerald-100 border-emerald-200 text-emerald-700' : 'bg-white border-amber-200 text-amber-700'}`}>{myGiftWinning.claimed ? 'Claimed ✓' : 'Ready to claim'}</span></div>
              <p className="font-black text-slate-900 flex items-center gap-2"><span className="text-lg">{myGiftWinning.giftEmoji}</span> {myGiftWinning.giftName}</p>
              <p className="text-xs text-slate-600 mt-1">{giftConfig?.claimInstructions}</p>
              <p className="font-mono text-[10px] mt-2 px-2 py-1 rounded bg-white border border-amber-200 inline-block">Code: {myGiftWinning.id.slice(-6).toUpperCase()}</p>
              {!myGiftWinning.claimed && <button onClick={handleClaimGift} disabled={claimingGift} className="mt-3 w-full py-2 rounded-xl bg-amber-600 hover:bg-amber-700 disabled:opacity-60 text-white text-sm font-bold flex items-center justify-center gap-1.5"><HandHeart className="w-4 h-4" />{claimingGift ? 'Claiming...' : 'Claim — Meet Coordinator'}</button>}
              {myGiftWinning.claimed && <p className="mt-2 text-xs text-emerald-700 font-semibold flex items-center justify-center gap-1"><CheckCircle2 className="w-3.5 h-3.5" /> Claimed — show this to the coordinator on your way out</p>}
            </div>
          ) : giftConfig?.enabled ? (
            <div className="mt-4 p-3 rounded-xl bg-slate-50 border border-slate-200 w-full">
              <p className="text-xs font-semibold text-slate-700 flex items-center justify-center gap-1.5"><Ticket className="w-4 h-4 text-slate-500" /> Lottery drawn — {giftWinnings.length} winners picked among {questions.length} questions completed</p>
              <p className="text-[11px] text-slate-500 mt-1">You didn’t win this time, but thanks for completing! Winners are meeting the coordinator at the desk.</p>
            </div>
          ) : null}
          <div className="mt-4 flex items-center gap-2 text-[11px] text-slate-400"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /><span>All {totalQuestions} questions answered • {progressPercent}% complete</span></div>
        </div>
      )}

      {/* Main Question Box - Light, clean, fun */}
      {!isSurveyCompleted && (
        <div
          id="audience-question-card"
          className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs mb-4 flex-1 flex flex-col justify-between"
        >
          <div>
          {/* Question Title */}
          <h1 className="text-xl sm:text-2xl font-black text-[#0c244d] mb-4 leading-snug">
            {activeQuestion.title}
          </h1>

          {/* MULTIPLE CHOICE OPTIONS */}
          {activeQuestion.type === 'multiple_choice' && (
            <div className="space-y-2.5 my-2">
              {activeQuestion.options.map((opt, idx) => {
                const isSelected = selectedOptions.includes(opt.id);
                return (
                  <button
                    key={opt.id}
                    id={`audience-opt-${opt.id}`}
                    onClick={() => handleOptionToggle(opt.id)}
                    disabled={!isVotingOpen}
                    className={`w-full text-left p-3.5 rounded-xl border-2 transition-all flex items-center justify-between ${
                      isSelected
                        ? 'border-red-600 bg-red-50 text-slate-900 font-bold shadow-xs'
                        : 'border-slate-200 bg-white hover:border-blue-300 text-slate-800'
                    } ${!isVotingOpen ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer active:scale-[0.99]'}`}
                  >
                    <div className="flex items-center gap-3">
                      <span
                        className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold ${
                          isSelected
                            ? 'bg-red-600 text-white'
                            : 'bg-slate-100 text-slate-700'
                        }`}
                      >
                        {String.fromCharCode(65 + idx)}
                      </span>
                      <span className="text-base">{opt.text}</span>
                    </div>
                    {isSelected && <CheckCircle2 className="w-5 h-5 text-red-600 shrink-0" />}
                  </button>
                );
              })}
            </div>
          )}

          {/* RATING (1-5 Stars) */}
          {activeQuestion.type === 'rating' && (
            <div className="my-4">
              <div className="flex justify-between items-center gap-1.5 mb-2">
                {[1, 2, 3, 4, 5].map((val) => {
                  const isSelected = selectedRating === val;
                  return (
                    <button
                      key={val}
                      id={`rating-star-btn-${val}`}
                      onClick={() => isVotingOpen && setSelectedRating(val)}
                      disabled={!isVotingOpen}
                      className={`flex-1 py-3 flex flex-col items-center justify-center rounded-xl border-2 transition ${
                        isSelected
                          ? 'border-amber-500 bg-amber-50 text-amber-950 font-bold shadow-xs'
                          : 'border-slate-200 bg-white text-slate-700 hover:border-amber-300'
                      } ${!isVotingOpen ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer active:scale-95'}`}
                    >
                      <Star
                        className={`w-7 h-7 mb-0.5 ${
                          isSelected
                            ? 'fill-amber-500 text-amber-500'
                            : selectedRating && selectedRating >= val
                            ? 'fill-amber-300 text-amber-400'
                            : 'text-slate-300'
                        }`}
                      />
                      <span className="text-sm">{val}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* NPS (0-10) */}
          {activeQuestion.type === 'nps' && (
            <div className="my-4">
              <div className="grid grid-cols-11 gap-1 mb-2">
                {Array.from({ length: 11 }, (_, i) => i).map((score) => {
                  const isSelected = selectedRating === score;
                  return (
                    <button
                      key={score}
                      id={`nps-btn-${score}`}
                      onClick={() => isVotingOpen && setSelectedRating(score)}
                      disabled={!isVotingOpen}
                      className={`h-11 flex items-center justify-center font-bold text-sm rounded-lg border-2 transition ${
                        isSelected
                          ? 'border-red-600 bg-red-600 text-white'
                          : 'border-slate-200 bg-white text-slate-800 hover:border-blue-400'
                      } ${!isVotingOpen ? 'opacity-50 cursor-not-allowed' : 'active:scale-95'}`}
                    >
                      {score}
                    </button>
                  );
                })}
              </div>
              <div className="flex justify-between text-[11px] text-slate-400 px-1">
                <span>0 = Not likely</span>
                <span>10 = Extremely likely</span>
              </div>
            </div>
          )}

          {/* OPEN TEXT */}
          {activeQuestion.type === 'open_text' && (
            <div className="my-2">
              <textarea
                id="audience-text-input"
                rows={3}
                value={openText}
                onChange={(e) => setOpenText(e.target.value)}
                disabled={!isVotingOpen}
                placeholder="Type your answer here..."
                maxLength={240}
                className="w-full p-3.5 text-base border-2 border-slate-200 rounded-xl focus:border-red-600 focus:outline-none transition resize-none disabled:bg-slate-50"
              />
            </div>
          )}
        </div>

        {/* Feedback message */}
        {feedbackMsg && (
          <div
            id="vote-feedback-alert"
            className={`my-2 p-2.5 rounded-xl flex items-center gap-2 text-xs font-semibold ${
              feedbackMsg.type === 'success'
                ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                : 'bg-rose-50 text-rose-800 border border-rose-200'
            }`}
          >
            {feedbackMsg.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            )}
            <span>{feedbackMsg.text}</span>
          </div>
        )}

        {/* Submit button */}
        <div className="mt-4 pt-3 border-t border-slate-100">
          <button
            id="audience-submit-vote-btn"
            onClick={handleSubmit}
            disabled={!isVotingOpen || submitting}
            className={`w-full py-3.5 px-4 rounded-xl font-bold text-base flex items-center justify-center gap-2 shadow-sm transition-all ${
              !isVotingOpen
                ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                : hasVoted
                ? 'bg-[#0c244d] hover:bg-[#143975] text-white cursor-pointer active:scale-[0.98]'
                : 'bg-red-600 hover:bg-red-500 text-white cursor-pointer active:scale-[0.98]'
            }`}
          >
            {submitting ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : hasVoted ? (
              <>
                <CheckCircle2 className="w-5 h-5" />
                <span>Update Answer</span>
              </>
            ) : (
              <>
                <Send className="w-4 h-4" />
                <span>Submit Answer</span>
              </>
            )}
          </button>
        </div>
      </div>
      )}

      {/* Light & Fun Reaction bar */}
      <div
        id="audience-reactions-bar"
        className="bg-white border border-slate-200 rounded-2xl p-2.5 shadow-sm flex items-center justify-around"
      >
        {['👏', '🔥', '❤️', '💡', '🚀'].map((emoji) => (
          <button
            key={emoji}
            id={`reaction-btn-${emoji}`}
            onClick={() => sendReaction(emoji)}
            className="w-10 h-10 rounded-xl bg-slate-50 hover:bg-red-50 border border-slate-200 active:scale-90 transition flex items-center justify-center text-xl cursor-pointer"
          >
            {emoji}
          </button>
        ))}
      </div>

      {/* Gift win modal - appears right after successful submit when you win */}
      {showGiftModal && (newlyWonGift || myGiftWinning) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in" onClick={() => setShowGiftModal(false)}>
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 text-center shadow-2xl border border-amber-200 relative overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="absolute inset-0 bg-gradient-to-br from-amber-50 via-orange-50 to-pink-50 opacity-60 pointer-events-none" />
            <div className="relative">
              <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-3xl shadow-lg shadow-amber-500/30 mb-3">
                {(newlyWonGift || myGiftWinning)?.giftEmoji}
              </div>
              <h2 className="text-xl font-black text-slate-900">Congratulations! 🎉</h2>
              <p className="text-sm text-slate-600 mt-1">You’ve won a</p>
              <p className="text-lg font-black text-amber-700">{(newlyWonGift || myGiftWinning)?.giftName}</p>
              <p className="text-xs text-slate-500 mt-2 leading-relaxed">{giftConfig?.claimInstructions || 'Meet the coordinator at the entrance desk to claim your gift.'}</p>
              <div className="mt-3 inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-900 text-white font-mono text-xs">
                <span>Gift Code</span>
                <strong>{(newlyWonGift || myGiftWinning)?.id.slice(-6).toUpperCase()}</strong>
              </div>
              <div className="mt-4 flex gap-2">
                {!myGiftWinning?.claimed ? (
                  <button onClick={async () => { setClaimingGift(true); await claimGift(); setClaimingGift(false); }} disabled={claimingGift} className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white text-sm font-bold flex items-center justify-center gap-1.5">
                    {claimingGift ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <><HandHeart className="w-4 h-4" /><span>I’ve met the coordinator</span></>}
                  </button>
                ) : (
                  <div className="flex-1 py-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm font-bold flex items-center justify-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4" /> Claimed ✓
                  </div>
                )}
                <button onClick={() => setShowGiftModal(false)} className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 text-sm font-semibold">Close</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
