import React, { useState, useEffect } from 'react';
import { useLiveSurvey } from '../context/LiveSurveyContext';
import { Question, QuestionType, QuestionOption, AudienceParticipant, Gift, GiftConfig } from '../types';
import {
  Sliders,
  Plus,
  Trash2,
  Edit2,
  Radio,
  Play,
  Pause,
  RotateCcw,
  CheckCircle2,
  XCircle,
  Eye,
  EyeOff,
  Lock,
  Unlock,
  Download,
  Database,
  BarChart3,
  MessageSquare,
  ShieldAlert,
  Clock,
  Palette,
  Check,
  Sparkles,
  HelpCircle,
  Users,
  KeyRound,
  ArrowDownUp,
  Save,
  CheckSquare,
  Sparkle,
  BadgeCheck,
  Fingerprint,
  Mail,
  Phone,
  UserRound,
  Gift as GiftIcon,
  Ticket,
  Award,
  Percent,
  HandHeart,
  PartyPopper
} from 'lucide-react';

export const AdminDashboard: React.FC = () => {
  const {
    session,
    questions,
    activeQuestion,
    aggregates,
    audienceCount,
    dbStatus,
    updateSessionSettings,
    createQuestion,
    updateQuestionData,
    deleteQuestionData,
    moderateResponse,
    editResponseContent,
    clearQuestionResponses,
    setupSingleSurvey,
    participants,
    refreshData,
    giftConfig,
    giftWinnings,
    updateGiftConfig,
    claimGiftForVoter,
    clearGiftWinnings
  } = useLiveSurvey();

  // Active Admin Sub-tab
  const [adminTab, setAdminTab] = useState<'questions' | 'moderation' | 'analytics' | 'settings' | 'gifts'>('questions');

  // Question Modal State
  const [showQuestionModal, setShowQuestionModal] = useState<boolean>(false);
  const [editingQuestionId, setEditingQuestionId] = useState<string | null>(null);

  // Inline Response Editing State
  const [editingResponseId, setEditingResponseId] = useState<string | null>(null);
  const [editingResponseText, setEditingResponseText] = useState<string>('');

  // Passkey & Settings State
  const [passkeyInput, setPasskeyInput] = useState<string>(session?.projectorPasskey || '8920');
  const [passkeySavedMsg, setPasskeySavedMsg] = useState<boolean>(false);

  // Audience Identity & Unique ID Tracking State (current active survey)
  const [identityEnabled, setIdentityEnabled] = useState<boolean>(Boolean(session?.identityConfig?.enabled));
  const [identityCaptureName, setIdentityCaptureName] = useState<boolean>(session?.identityConfig?.captureName ?? true);
  const [identityCaptureEmail, setIdentityCaptureEmail] = useState<boolean>(session?.identityConfig?.captureEmail ?? true);
  const [identityCapturePhone, setIdentityCapturePhone] = useState<boolean>(session?.identityConfig?.capturePhone ?? false);
  const [identityRequired, setIdentityRequired] = useState<boolean>(Boolean(session?.identityConfig?.required));
  const [identitySavedMsg, setIdentitySavedMsg] = useState<boolean>(false);

  // Gift lottery State (admin can set 3 gift kinds, cap ratio, random assignment)
  const [giftEnabled, setGiftEnabled] = useState<boolean>(Boolean(session?.giftConfig?.enabled));
  const [giftWinRatio, setGiftWinRatio] = useState<number>(session?.giftConfig?.winRatio ?? 35);
  const [giftList, setGiftList] = useState<Gift[]>(() => {
    const g = session?.giftConfig?.gifts;
    return g && g.length > 0 ? g.map((gift) => ({ ...gift })) : [
      { id: 'gift-1', name: 'Free Coffee Voucher', description: 'Redeem at the lobby café', emoji: '☕', quantity: 12 },
      { id: 'gift-2', name: 'Event T-Shirt', description: 'Limited Phoenix SWS tee', emoji: '👕', quantity: 8 },
      { id: 'gift-3', name: 'VIP Networking Pass', description: 'Exclusive after-event access', emoji: '🎟️', quantity: 3 }
    ];
  });
  const [giftInstructions, setGiftInstructions] = useState<string>(session?.giftConfig?.claimInstructions || 'Meet the coordinator at the entrance desk to claim your gift. Show your gift code.');
  const [giftSavedMsg, setGiftSavedMsg] = useState<boolean>(false);
  const [giftSaveError, setGiftSaveError] = useState<string | null>(null);

  // Question Form State
  const [formTitle, setFormTitle] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formType, setFormType] = useState<QuestionType>('multiple_choice');
  const [formOptions, setFormOptions] = useState<QuestionOption[]>([
    { id: 'opt-1', text: 'Option A' },
    { id: 'opt-2', text: 'Option B' },
    { id: 'opt-3', text: 'Option C' }
  ]);
  const [formAllowMultiple, setFormAllowMultiple] = useState(false);
  const [formMinRatingLabel, setFormMinRatingLabel] = useState('Needs Improvement');
  const [formMaxRatingLabel, setFormMaxRatingLabel] = useState('Outstanding!');

  // Custom Timer Input
  const [customTimerSeconds, setCustomTimerSeconds] = useState<number>(60);
  const [confirmClearModal, setConfirmClearModal] = useState<string | null>(null);

  // Setup Single Survey Modal State (Admin can only setup one survey at a time)
  const [showSetupSurveyModal, setShowSetupSurveyModal] = useState<boolean>(false);
  const [setupSurveyTitle, setSetupSurveyTitle] = useState<string>('Phoenix SWS Live Interactive Survey');
  const [setupQuestionTitle, setSetupQuestionTitle] = useState<string>('');
  const [setupQuestionType, setSetupQuestionType] = useState<QuestionType>('multiple_choice');
  const [setupOptions, setSetupOptions] = useState<QuestionOption[]>([
    { id: 'opt-1', text: 'Strongly Agree' },
    { id: 'opt-2', text: 'Agree' },
    { id: 'opt-3', text: 'Neutral' },
    { id: 'opt-4', text: 'Disagree' }
  ]);
  const [setupAllowMultiple, setSetupAllowMultiple] = useState<boolean>(false);
  const [setupLoading, setSetupLoading] = useState<boolean>(false);
  const [setupSuccessNotice, setSetupSuccessNotice] = useState<string | null>(null);
  const [setupError, setSetupError] = useState<string | null>(null);

  // Identity capture options chosen while setting up the new survey
  const [setupIdentityEnabled, setSetupIdentityEnabled] = useState<boolean>(false);
  const [setupCaptureName, setSetupCaptureName] = useState<boolean>(true);
  const [setupCaptureEmail, setSetupCaptureEmail] = useState<boolean>(true);
  const [setupCapturePhone, setSetupCapturePhone] = useState<boolean>(false);
  const [setupIdentityRequired, setSetupIdentityRequired] = useState<boolean>(false);
  // Gift lottery options chosen while setting up the new survey
  const [setupGiftEnabled, setSetupGiftEnabled] = useState<boolean>(false);
  const [setupGiftWinRatio, setSetupGiftWinRatio] = useState<number>(35);
  const [setupGiftList, setSetupGiftList] = useState<Gift[]>([
    { id: 'gift-1', name: 'Free Coffee Voucher', description: 'Redeem at the lobby café', emoji: '☕', quantity: 12 },
    { id: 'gift-2', name: 'Event T-Shirt', description: 'Limited Phoenix SWS tee', emoji: '👕', quantity: 8 },
    { id: 'gift-3', name: 'VIP Networking Pass', description: 'Exclusive after-event access', emoji: '🎟️', quantity: 3 }
  ]);

  // Keep the identity settings panel in sync with the live session configuration
  const sessionIdentity = session?.identityConfig;
  useEffect(() => {
    if (!sessionIdentity) return;
    setIdentityEnabled(Boolean(sessionIdentity.enabled));
    setIdentityCaptureName(Boolean(sessionIdentity.captureName));
    setIdentityCaptureEmail(Boolean(sessionIdentity.captureEmail));
    setIdentityCapturePhone(Boolean(sessionIdentity.capturePhone));
    setIdentityRequired(Boolean(sessionIdentity.required));
  }, [
    sessionIdentity?.enabled,
    sessionIdentity?.captureName,
    sessionIdentity?.captureEmail,
    sessionIdentity?.capturePhone,
    sessionIdentity?.required
  ]);

  // Keep gift settings in sync with live session
  const sessionGift = session?.giftConfig;
  useEffect(() => {
    if (!sessionGift) return;
    setGiftEnabled(Boolean(sessionGift.enabled));
    setGiftWinRatio(sessionGift.winRatio ?? 35);
    if (sessionGift.gifts && sessionGift.gifts.length > 0) setGiftList(sessionGift.gifts.map((g) => ({ ...g })));
    setGiftInstructions(sessionGift.claimInstructions || 'Meet the coordinator at the entrance desk to claim your gift. Show your gift code.');
  }, [sessionGift?.enabled, sessionGift?.winRatio, JSON.stringify(sessionGift?.gifts), sessionGift?.claimInstructions]);

  // Open Setup Survey modal pre-filled with the current identity capture settings
  const handleOpenSetupSurvey = () => {
    setSetupSurveyTitle(session?.title || 'Phoenix SWS Live Interactive Survey');
    setSetupQuestionTitle('');
    setSetupQuestionType('multiple_choice');
    setSetupOptions([
      { id: 'opt-1', text: 'Strongly Agree' },
      { id: 'opt-2', text: 'Agree' },
      { id: 'opt-3', text: 'Neutral' },
      { id: 'opt-4', text: 'Disagree' }
    ]);
    setSetupAllowMultiple(false);
    setSetupIdentityEnabled(identityEnabled);
    setSetupCaptureName(identityCaptureName);
    setSetupCaptureEmail(identityCaptureEmail);
    setSetupCapturePhone(identityCapturePhone);
    setSetupIdentityRequired(identityRequired);
    setSetupGiftEnabled(giftEnabled);
    setSetupGiftWinRatio(giftWinRatio);
    setSetupGiftList(giftList.map((g) => ({ ...g })));
    setShowSetupSurveyModal(true);
  };

  const handleExecuteSetupSurvey = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!setupQuestionTitle.trim()) {
      setSetupError('Question title is required');
      return;
    }
    setSetupLoading(true);
    setSetupError(null);
    try {
      const res: any = await setupSingleSurvey({
        title: setupSurveyTitle.trim(),
        questionTitle: setupQuestionTitle.trim(),
        questionType: setupQuestionType,
        options: setupQuestionType === 'multiple_choice'
          ? setupOptions.filter((o) => o.text.trim().length > 0)
          : [],
        allowMultiple: setupAllowMultiple,
        identityConfig: {
          enabled: setupIdentityEnabled,
          captureName: setupCaptureName,
          captureEmail: setupCaptureEmail,
          capturePhone: setupCapturePhone,
          required: setupIdentityRequired
        },
        giftConfig: {
          enabled: setupGiftEnabled,
          winRatio: setupGiftWinRatio,
          gifts: setupGiftList.filter((g) => g.name.trim().length > 0),
          claimInstructions: giftInstructions
        }
      });
      setSetupLoading(false);
      if (res.success) {
        setShowSetupSurveyModal(false);
        setSetupSuccessNotice(`New survey initialized! New session code: ${res.session?.code}, new passkey: ${res.session?.projectorPasskey}`);
        setTimeout(() => setSetupSuccessNotice(null), 6000);
      } else {
        setSetupError(res.message || 'Failed to create survey. Please check your inputs.');
      }
    } catch (err: any) {
      setSetupLoading(false);
      setSetupError(err?.message || 'Failed to create survey');
    }
  };

  // Open Question Modal for Create or Edit
  const handleOpenCreateModal = () => {
    setEditingQuestionId(null);
    setFormTitle('');
    setFormDescription('');
    setFormType('multiple_choice');
    setFormOptions([
      { id: 'opt-1', text: 'Option A' },
      { id: 'opt-2', text: 'Option B' },
      { id: 'opt-3', text: 'Option C' }
    ]);
    setFormAllowMultiple(false);
    setFormMinRatingLabel('Needs Improvement');
    setFormMaxRatingLabel('Outstanding!');
    setShowQuestionModal(true);
  };

  const handleOpenEditModal = (q: Question) => {
    setEditingQuestionId(q.id);
    setFormTitle(q.title);
    setFormDescription(q.description || '');
    setFormType(q.type);
    setFormOptions(q.options && q.options.length > 0 ? q.options : [
      { id: 'opt-1', text: 'Option A' },
      { id: 'opt-2', text: 'Option B' }
    ]);
    setFormAllowMultiple(Boolean(q.allowMultiple));
    setFormMinRatingLabel(q.ratingLabels?.min || 'Needs Improvement');
    setFormMaxRatingLabel(q.ratingLabels?.max || 'Outstanding!');
    setShowQuestionModal(true);
  };

  const handleSaveQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim()) return;

    const payload: Partial<Question> = {
      title: formTitle.trim(),
      description: formDescription.trim(),
      type: formType,
      options: formType === 'multiple_choice' ? formOptions.filter((o) => o.text.trim().length > 0) : [],
      allowMultiple: formType === 'multiple_choice' ? formAllowMultiple : false,
      ratingLabels: formType === 'rating' || formType === 'nps' ? { min: formMinRatingLabel, max: formMaxRatingLabel } : undefined,
      minRating: formType === 'rating' ? 1 : formType === 'nps' ? 0 : undefined,
      maxRating: formType === 'rating' ? 5 : formType === 'nps' ? 10 : undefined
    };

    if (editingQuestionId) {
      await updateQuestionData(editingQuestionId, payload);
    } else {
      await createQuestion(payload);
    }

    setShowQuestionModal(false);
  };

  const handleAddOption = () => {
    setFormOptions((prev) => [
      ...prev,
      { id: 'opt-' + Math.random().toString(36).substring(2, 7), text: `Option ${String.fromCharCode(65 + prev.length)}` }
    ]);
  };

  const handleRemoveOption = (index: number) => {
    setFormOptions((prev) => prev.filter((_, i) => i !== index));
  };

  const handleOptionChange = (index: number, text: string) => {
    setFormOptions((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], text };
      return updated;
    });
  };

  // Save projector passkey
  const handleSavePasskey = async () => {
    if (!passkeyInput.trim()) return;
    await updateSessionSettings({ projectorPasskey: passkeyInput.trim() });
    setPasskeySavedMsg(true);
    setTimeout(() => setPasskeySavedMsg(false), 2500);
  };

  // Save the audience identity capture configuration for the active survey
  const handleSaveIdentityConfig = async () => {
    await updateSessionSettings({
      identityConfig: {
        enabled: identityEnabled,
        captureName: identityCaptureName,
        captureEmail: identityCaptureEmail,
        capturePhone: identityCapturePhone,
        required: identityRequired
      }
    });
    setIdentitySavedMsg(true);
    setTimeout(() => setIdentitySavedMsg(false), 2500);
  };

  const identityFieldsCount = [identityCaptureName, identityCaptureEmail, identityCapturePhone].filter(Boolean).length;

  // Gift handlers
  const handleSaveGiftConfig = async () => {
    setGiftSaveError(null);
    const cleaned = giftList.filter((g) => g.name.trim().length > 0);
    if (giftEnabled && cleaned.length === 0) {
      setGiftSaveError('Add at least one gift type.');
      return;
    }
    const cfg: GiftConfig = {
      enabled: giftEnabled,
      winRatio: giftWinRatio,
      gifts: cleaned.map((g) => ({ ...g, name: g.name.trim(), description: g.description?.trim(), quantity: Math.max(1, Math.min(500, Math.round(g.quantity) || 1)) })),
      claimInstructions: giftInstructions.trim() || 'Meet the coordinator at the entrance desk to claim your gift.'
    };
    const res = await updateGiftConfig(cfg);
    if (!res.success) {
      setGiftSaveError(res.message || 'Could not save gifts');
      return;
    }
    setGiftSavedMsg(true);
    setTimeout(() => setGiftSavedMsg(false), 2500);
  };

  const handleGiftFieldChange = (idx: number, field: keyof Gift, value: string | number) => {
    setGiftList((prev) => {
      const copy = [...prev];
      copy[idx] = { ...copy[idx], [field]: value } as Gift;
      return copy;
    });
  };

  const handleAddGift = () => {
    if (giftList.length >= 5) return;
    setGiftList((prev) => [...prev, { id: 'gift-' + Math.random().toString(36).substring(2, 6), name: '', description: '', emoji: '🎁', quantity: 5 }]);
  };

  const handleRemoveGift = (idx: number) => {
    setGiftList((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleExportWinningsCSV = () => {
    let csv = 'Gift,Winner Name,Winner Email,Winner ID,Voter Token,Winner Unique ID,Claimed,Claimed By,Claimed At,Won At\n';
    for (const w of giftWinnings) {
      const clean = (v?: string) => (v || '').replace(/"/g, '""');
      csv += `"${clean(w.giftName)}","${clean(w.participantName)}","${clean(w.participantEmail)}","${clean(w.participantUniqueId)}","${w.voterToken}","${w.participantUniqueId || ''}",${w.claimed ? 'Yes' : 'No'},"${w.claimedBy || ''}","${w.claimedAt || ''}","${w.createdAt}"\n`;
    }
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `gift-winners-${session?.code || 'live'}-${Date.now()}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  // Export the attendee registry (unique IDs + captured details) to CSV for later tracking
  const handleExportAttendeesCSV = () => {
    let csv = 'Unique Attendee ID,Name,Email,Phone,Answers Submitted,Registered At\n';

    for (const p of participants) {
      const clean = (v?: string) => (v || '').replace(/"/g, '""');
      csv += `"${p.uniqueId}","${clean(p.name)}","${clean(p.email)}","${clean(p.phone)}",${p.responseCount ?? 0},"${p.createdAt}"\n`;
    }

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `attendees-${session?.code || 'live'}-${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Response content edit handler
  const handleStartEditResponse = (id: string, text: string) => {
    setEditingResponseId(id);
    setEditingResponseText(text);
  };

  const handleSaveResponseEdit = async (id: string) => {
    if (!editingResponseText.trim()) return;
    await editResponseContent(id, editingResponseText.trim());
    setEditingResponseId(null);
  };

  // Export Analytics to CSV
  const handleExportCSV = () => {
    let csv = 'Question Title,Type,Total Responses,Option / Metric,Count / Score,Attendee ID,Attendee Name\n';

    for (const q of questions) {
      const agg = aggregates[q.id];
      const total = agg?.totalResponses || 0;

      if (q.type === 'multiple_choice') {
        q.options.forEach((opt) => {
          const count = agg?.optionCounts?.[opt.id] || 0;
          csv += `"${q.title.replace(/"/g, '""')}",Multiple Choice,${total},"${opt.text.replace(/"/g, '""')}",${count}\n`;
        });
      } else if (q.type === 'rating') {
        csv += `"${q.title.replace(/"/g, '""')}",Rating,${total},Average Rating,${agg?.averageRating || 0}\n`;
      } else if (q.type === 'nps') {
        csv += `"${q.title.replace(/"/g, '""')}",NPS,${total},NPS Score,${agg?.npsScore?.score ?? 'N/A'}\n`;
      } else if (q.type === 'open_text') {
        agg?.openResponses?.forEach((resp) => {
          const cleanText = resp.text.replace(/"/g, '""');
          csv += `"${q.title.replace(/"/g, '""')}",Open Text,${total},"${cleanText}",${resp.isApproved ? 'Approved' : 'Hidden'},"${resp.attendeeUniqueId || ''}","${(resp.attendeeName || '').replace(/"/g, '""')}"\n`;
        });
      }
    }

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `survey-results-${session?.code || 'live'}-${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const currentAgg = activeQuestion ? aggregates[activeQuestion.id] : null;

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 sm:py-8">
      {/* Admin Top Action Header with Phoenix SWS Branding */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 pb-6 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-red-600 bg-red-50 px-2.5 py-1 rounded-md border border-red-200">
              Phoenix SWS Moderator
            </span>
            <span className="text-xs font-mono text-slate-500">Session: {session?.code}</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-[#0c244d] mt-1 tracking-tight">
            Live Survey & Event Controls
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Manage survey questions, live attendee responses, session passkeys, and real-time projection updates.
          </p>
        </div>

        {/* Live Audience & Quick Session Stats */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <div className="px-3.5 py-2 rounded-xl bg-slate-100 border border-slate-200 flex items-center gap-2">
            <Users className="w-4 h-4 text-red-600" />
            <span className="text-xs font-semibold text-slate-900">
              <strong className="text-sm text-red-600">{audienceCount}</strong> Live Attendees
            </span>
          </div>

          <button
            id="admin-export-csv-btn"
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#0c182e] hover:bg-[#152e59] text-white text-xs font-bold shadow-sm transition"
          >
            <Download className="w-4 h-4 text-red-400" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* QUICK STAGE MODERATION TOOLBAR (Sticky / Prominent) */}
      <div
        id="admin-moderation-toolbar"
        className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-sm mb-8"
      >
        <div className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Radio className="w-4 h-4 text-red-600 animate-pulse" />
            <span className="text-slate-900">Live Stage & Audience Broadcast Controls</span>
          </div>
          <span className="text-[11px] font-normal text-slate-500">Instant cross-device sync</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* 1. Toggle Voting Open/Locked */}
          <button
            id="admin-toggle-voting-btn"
            onClick={() => updateSessionSettings({ isVotingOpen: !session?.isVotingOpen })}
            className={`p-3.5 rounded-xl border flex items-center justify-between transition-all ${
              session?.isVotingOpen
                ? 'bg-emerald-50 border-emerald-300 text-emerald-950 hover:bg-emerald-100/80'
                : 'bg-amber-50 border-amber-300 text-amber-950 hover:bg-amber-100/80'
            }`}
          >
            <div className="text-left">
              <span className="text-xs font-medium opacity-80 block">Audience Voting</span>
              <strong className="text-sm">
                {session?.isVotingOpen ? 'Voting is OPEN' : 'Voting is LOCKED'}
              </strong>
            </div>
            {session?.isVotingOpen ? (
              <Unlock className="w-5 h-5 text-emerald-600 shrink-0" />
            ) : (
              <Lock className="w-5 h-5 text-amber-600 shrink-0" />
            )}
          </button>

          {/* 2. Toggle Reveal Results on Stage */}
          <button
            id="admin-toggle-reveal-btn"
            onClick={() => updateSessionSettings({ areResultsRevealed: !session?.areResultsRevealed })}
            className={`p-3.5 rounded-xl border flex items-center justify-between transition-all ${
              session?.areResultsRevealed
                ? 'bg-blue-50 border-blue-300 text-blue-950 hover:bg-blue-100/80'
                : 'bg-red-50 border-red-300 text-red-950 hover:bg-red-100/80'
            }`}
          >
            <div className="text-left">
              <span className="text-xs font-medium opacity-80 block">Projector Results</span>
              <strong className="text-sm">
                {session?.areResultsRevealed ? 'Results REVEALED' : 'Results HIDDEN'}
              </strong>
            </div>
            {session?.areResultsRevealed ? (
              <Eye className="w-5 h-5 text-blue-600 shrink-0" />
            ) : (
              <EyeOff className="w-5 h-5 text-red-600 shrink-0" />
            )}
          </button>

          {/* 3. Stage Auto-Scroll Toggle */}
          <button
            id="admin-toggle-autoscroll-btn"
            onClick={() => updateSessionSettings({ autoScrollProjector: !session?.autoScrollProjector })}
            className={`p-3.5 rounded-xl border flex items-center justify-between transition-all ${
              session?.autoScrollProjector
                ? 'bg-red-50 border-red-300 text-red-950 hover:bg-red-100'
                : 'bg-slate-50 border-slate-300 text-slate-800 hover:bg-slate-100'
            }`}
            title="Automatically scrolls stage results up and down when there are many items"
          >
            <div className="text-left">
              <span className="text-xs font-medium opacity-80 block">Stage Auto-Scroll</span>
              <strong className="text-sm">
                {session?.autoScrollProjector ? 'Auto-Scroll ACTIVE' : 'Auto-Scroll OFF'}
              </strong>
            </div>
            <ArrowDownUp className={`w-5 h-5 shrink-0 ${session?.autoScrollProjector ? 'text-red-600' : 'text-slate-400'}`} />
          </button>

          {/* 4. Quick Timer Countdown */}
          <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-between">
            <div className="text-left">
              <span className="text-xs font-medium text-slate-500 block">Timer Countdown</span>
              <span className="text-sm font-bold text-slate-800 font-mono">
                {session?.timerSecondsRemaining !== null
                  ? `${session?.timerSecondsRemaining}s left`
                  : 'No active timer'}
              </span>
            </div>
            <div className="flex items-center gap-1">
              {session?.timerSecondsRemaining !== null ? (
                <button
                  onClick={() => updateSessionSettings({ timerSeconds: null as any })}
                  className="px-2.5 py-1 text-xs font-bold rounded-lg bg-red-600 text-white hover:bg-red-700 transition"
                  title="Cancel timer"
                >
                  Stop
                </button>
              ) : (
                <>
                  <button
                    onClick={() => updateSessionSettings({ timerSeconds: 30 })}
                    className="px-2 py-1 text-xs font-bold rounded-lg bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 transition"
                  >
                    30s
                  </button>
                  <button
                    onClick={() => updateSessionSettings({ timerSeconds: 60 })}
                    className="px-2 py-1 text-xs font-bold rounded-lg bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 transition"
                  >
                    60s
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Admin Navigation Tabs */}
      <div className="flex border-b border-slate-200 mb-6 gap-2">
        <button
          id="admin-tab-questions-btn"
          onClick={() => setAdminTab('questions')}
          className={`pb-3 px-4 text-sm font-semibold border-b-2 transition flex items-center gap-2 ${
            adminTab === 'questions'
              ? 'border-red-600 text-red-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Sliders className="w-4 h-4" />
          <span>Survey Questions ({questions.length})</span>
        </button>

        <button
          id="admin-tab-moderation-btn"
          onClick={() => setAdminTab('moderation')}
          className={`pb-3 px-4 text-sm font-semibold border-b-2 transition flex items-center gap-2 ${
            adminTab === 'moderation'
              ? 'border-red-600 text-red-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <MessageSquare className="w-4 h-4" />
          <span>Responses & Moderation</span>
        </button>

        <button
          id="admin-tab-analytics-btn"
          onClick={() => setAdminTab('analytics')}
          className={`pb-3 px-4 text-sm font-semibold border-b-2 transition flex items-center gap-2 ${
            adminTab === 'analytics'
              ? 'border-red-600 text-red-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <BarChart3 className="w-4 h-4" />
          <span>Live Analytics</span>
        </button>

        <button
          id="admin-tab-gifts-btn"
          onClick={() => setAdminTab('gifts')}
          className={`pb-3 px-4 text-sm font-semibold border-b-2 transition flex items-center gap-2 ${
            adminTab === 'gifts'
              ? 'border-red-600 text-red-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <GiftIcon className="w-4 h-4" />
          <span>Gifts & Lottery ({giftWinnings.length})</span>
        </button>

        <button
          id="admin-tab-settings-btn"
          onClick={() => setAdminTab('settings')}
          className={`pb-3 px-4 text-sm font-semibold border-b-2 transition flex items-center gap-2 ${
            adminTab === 'settings'
              ? 'border-red-600 text-red-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Database className="w-4 h-4" />
          <span>Passkeys & Database</span>
        </button>
      </div>

      {/* Success banner if new survey was setup */}
      {setupSuccessNotice && (
        <div
          id="setup-success-banner"
          className="mb-4 p-3 rounded-xl bg-emerald-50 border border-emerald-300 text-emerald-900 text-xs font-semibold flex items-center justify-between animate-in fade-in"
        >
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>{setupSuccessNotice}</span>
          </div>
          <button
            onClick={() => setSetupSuccessNotice(null)}
            className="text-emerald-700 hover:text-emerald-900 font-bold"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* TAB 1: SURVEY QUESTIONS MANAGEMENT */}
      {adminTab === 'questions' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-2">
            <div>
              <h3 className="font-bold text-slate-900 text-base">Active Survey Question & Agenda</h3>
              <p className="text-xs text-slate-500">
                Only one active survey runs at a time. Setting up a new survey automatically issues a fresh session code and projection passkey.
              </p>
            </div>

            <div className="flex items-center gap-2">
              {/* Setup New Survey (One survey at a time) */}
              <button
                id="admin-setup-single-survey-btn"
                onClick={handleOpenSetupSurvey}
                className="flex items-center gap-1.5 px-3.5 py-2 bg-[#0c244d] hover:bg-[#143975] text-white rounded-xl text-xs font-bold shadow-sm transition border border-[#1d3d70]"
                title="Setup a fresh survey and issue new projection code"
              >
                <Sparkles className="w-4 h-4 text-red-400" />
                <span>Setup New Survey</span>
              </button>

              <button
                id="admin-create-question-btn"
                onClick={handleOpenCreateModal}
                className="flex items-center gap-1.5 px-3.5 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold shadow-sm transition"
              >
                <Plus className="w-4 h-4" />
                <span>Add Question</span>
              </button>
            </div>
          </div>

          {/* Question List */}
          <div className="space-y-3">
            {questions.map((q, idx) => {
              const isActive = activeQuestion?.id === q.id;
              const agg = aggregates[q.id];

              return (
                <div
                  key={q.id}
                  id={`admin-question-item-${q.id}`}
                  className={`p-4 sm:p-5 rounded-2xl border transition-all ${
                    isActive
                      ? 'bg-red-50/40 border-red-500 ring-2 ring-red-500/20 shadow-sm'
                      : 'bg-white border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-start gap-3">
                      <span
                        className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 mt-0.5 ${
                          isActive
                            ? 'bg-red-600 text-white'
                            : 'bg-slate-100 text-slate-700'
                        }`}
                      >
                        {idx + 1}
                      </span>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-bold text-slate-900 text-base">{q.title}</h4>
                          {isActive && (
                            <span className="text-[10px] font-bold uppercase tracking-wider bg-red-600 text-white px-2 py-0.5 rounded-full flex items-center gap-1">
                              <Radio className="w-3 h-3 animate-pulse" /> Live Now
                            </span>
                          )}
                        </div>
                        {q.description && (
                          <p className="text-xs text-slate-500 mt-0.5">{q.description}</p>
                        )}
                        <div className="flex flex-wrap items-center gap-3 mt-2 text-xs text-slate-400">
                          <span className="font-medium text-slate-600 uppercase text-[10px] bg-slate-100 px-2 py-0.5 rounded">
                            {q.type.replace('_', ' ')}
                          </span>
                          <span>•</span>
                          <span>{q.options?.length || 0} options</span>
                          <span>•</span>
                          <span className="font-mono font-semibold text-slate-600">
                            {agg?.totalResponses || 0} votes recorded
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Action buttons */}
                    <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
                      {/* Project Live Button */}
                      {!isActive ? (
                        <button
                          id={`admin-project-question-${q.id}`}
                          onClick={() => updateSessionSettings({ activeQuestionId: q.id })}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition shadow-xs"
                        >
                          <Play className="w-3.5 h-3.5 fill-white" />
                          <span>Project Live</span>
                        </button>
                      ) : (
                        <div className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-red-100 text-red-800 text-xs font-bold border border-red-200">
                          <CheckCircle2 className="w-3.5 h-3.5 text-red-600" />
                          <span>On Stage</span>
                        </div>
                      )}

                      {/* Edit Question */}
                      <button
                        onClick={() => handleOpenEditModal(q)}
                        className="p-2 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 transition"
                        title="Edit question text and options"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>

                      {/* Clear Responses */}
                      <button
                        onClick={() => {
                          if (confirm(`Clear all ${agg?.totalResponses || 0} votes for "${q.title}"?`)) {
                            clearQuestionResponses(q.id);
                          }
                        }}
                        className="p-2 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-400 hover:text-amber-600 transition"
                        title="Reset votes for this question"
                      >
                        <RotateCcw className="w-4 h-4" />
                      </button>

                      {/* Delete Question */}
                      <button
                        onClick={() => {
                          if (confirm(`Delete question "${q.title}"? This cannot be undone.`)) {
                            deleteQuestionData(q.id);
                          }
                        }}
                        className="p-2 rounded-xl bg-white border border-slate-200 hover:bg-rose-50 text-slate-400 hover:text-rose-600 transition"
                        title="Delete question"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 2: TEXT MODERATION & RESPONSE CONTENT EDITING */}
      {adminTab === 'moderation' && (
        <div className="space-y-4">
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="font-bold text-slate-900 text-sm">Attendee Responses & Moderation</h3>
              <p className="text-xs text-slate-500">
                Review, edit content, and approve or hide audience comments before they render on the stage screen.
              </p>
            </div>
            <button
              onClick={() => refreshData()}
              className="self-start sm:self-auto px-3 py-1.5 rounded-lg bg-white border border-slate-200 hover:bg-slate-100 text-xs font-semibold text-slate-700"
            >
              Refresh Submissions
            </button>
          </div>

          <div className="space-y-3">
            {questions
              .filter((q) => q.type === 'open_text')
              .map((q) => {
                const agg = aggregates[q.id];
                const responses = agg?.openResponses || [];

                return (
                  <div key={q.id} className="bg-white border border-slate-200 rounded-2xl p-5">
                    <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-100">
                      <h4 className="font-bold text-slate-900">{q.title}</h4>
                      <span className="text-xs text-slate-500 font-mono">
                        {responses.length} total comments
                      </span>
                    </div>

                    {responses.length === 0 ? (
                      <p className="text-center py-6 text-sm text-slate-400">
                        No text feedback submitted for this question yet.
                      </p>
                    ) : (
                      <div className="space-y-2.5">
                        {responses.map((resp) => (
                          <div
                            key={resp.id}
                            className={`p-3.5 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                              resp.isApproved
                                ? 'bg-emerald-50/40 border-emerald-200 text-slate-800'
                                : 'bg-rose-50/40 border-rose-200 text-slate-500 opacity-60'
                            }`}
                          >
                            <div className="flex-1 pr-3">
                              {editingResponseId === resp.id ? (
                                <div className="space-y-2">
                                  <textarea
                                    value={editingResponseText}
                                    onChange={(e) => setEditingResponseText(e.target.value)}
                                    className="w-full p-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-red-500"
                                    rows={2}
                                  />
                                  <div className="flex items-center gap-2">
                                    <button
                                      onClick={() => handleSaveResponseEdit(resp.id)}
                                      className="px-2.5 py-1 bg-red-600 text-white rounded text-xs font-bold flex items-center gap-1"
                                    >
                                      <Save className="w-3 h-3" /> Save Content
                                    </button>
                                    <button
                                      onClick={() => setEditingResponseId(null)}
                                      className="px-2 py-1 text-slate-600 text-xs"
                                    >
                                      Cancel
                                    </button>
                                  </div>
                                </div>
                              ) : (
                                <>
                                  <p className="text-sm font-medium text-slate-900">"{resp.text}"</p>
                                  <span className="text-[11px] font-mono text-slate-400 mt-1 flex flex-wrap items-center gap-x-2 gap-y-1">
                                    <span>Submitted {new Date(resp.createdAt).toLocaleTimeString()}</span>
                                    {resp.attendeeUniqueId && (
                                      <span className="px-1.5 py-0.5 rounded bg-slate-100 border border-slate-200 text-slate-500">
                                        {resp.attendeeUniqueId}
                                      </span>
                                    )}
                                    {resp.attendeeName && <span className="text-slate-400">{resp.attendeeName}</span>}
                                  </span>
                                </>
                              )}
                            </div>

                            <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
                              {editingResponseId !== resp.id && (
                                <button
                                  onClick={() => handleStartEditResponse(resp.id, resp.text)}
                                  className="p-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 text-xs rounded-lg transition"
                                  title="Edit attendee submission text"
                                >
                                  <Edit2 className="w-3.5 h-3.5" />
                                </button>
                              )}

                              {resp.isApproved ? (
                                <button
                                  onClick={() => moderateResponse(resp.id, false)}
                                  className="flex items-center gap-1 px-3 py-1 bg-white border border-rose-200 hover:bg-rose-50 text-rose-700 text-xs font-semibold rounded-lg transition"
                                >
                                  <XCircle className="w-3.5 h-3.5" />
                                  <span>Hide from Screen</span>
                                </button>
                              ) : (
                                <button
                                  onClick={() => moderateResponse(resp.id, true)}
                                  className="flex items-center gap-1 px-3 py-1 bg-white border border-emerald-300 hover:bg-emerald-50 text-emerald-700 text-xs font-semibold rounded-lg transition"
                                >
                                  <CheckCircle2 className="w-3.5 h-3.5" />
                                  <span>Approve for Stage</span>
                                </button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}

            {questions.filter((q) => q.type === 'open_text').length === 0 && (
              <div className="text-center py-12 bg-white border border-slate-200 rounded-2xl">
                <MessageSquare className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                <p className="text-sm font-medium text-slate-600">No open text questions created.</p>
                <button
                  onClick={handleOpenCreateModal}
                  className="mt-3 text-xs font-bold text-red-600 hover:underline"
                >
                  Create an Open Feedback Question
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 3: LIVE ANALYTICS */}
      {adminTab === 'analytics' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-5 bg-white border border-slate-200 rounded-2xl shadow-xs">
              <span className="text-xs uppercase font-bold text-slate-400 block mb-1">
                Total Live Attendees
              </span>
              <span className="text-3xl font-black text-red-600">{audienceCount}</span>
              <span className="text-xs text-slate-500 block mt-1">Currently connected devices</span>
            </div>

            <div className="p-5 bg-white border border-slate-200 rounded-2xl shadow-xs">
              <span className="text-xs uppercase font-bold text-slate-400 block mb-1">
                Active Question Responses
              </span>
              <span className="text-3xl font-black text-slate-900">
                {currentAgg?.totalResponses || 0}
              </span>
              <span className="text-xs text-slate-500 block mt-1">
                {audienceCount > 0
                  ? `${Math.round(((currentAgg?.totalResponses || 0) / Math.max(1, audienceCount)) * 100)}% participation`
                  : 'Awaiting participants'}
              </span>
            </div>

            <div className="p-5 bg-white border border-slate-200 rounded-2xl shadow-xs">
              <span className="text-xs uppercase font-bold text-slate-400 block mb-1">
                Total Questions Configured
              </span>
              <span className="text-3xl font-black text-slate-900">{questions.length}</span>
              <span className="text-xs text-slate-500 block mt-1">Live survey deck</span>
            </div>
          </div>

          {/* Breakdown for all questions */}
          <div className="space-y-4">
            <h3 className="font-bold text-base text-slate-900">Question Results Summary</h3>
            {questions.map((q) => {
              const agg = aggregates[q.id];
              const total = agg?.totalResponses || 0;

              return (
                <div key={q.id} className="p-5 bg-white border border-slate-200 rounded-2xl">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <span className="text-xs font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-700 uppercase">
                        {q.type.replace('_', ' ')}
                      </span>
                      <h4 className="font-bold text-base text-slate-900 mt-1">{q.title}</h4>
                    </div>
                    <span className="text-xs font-mono font-bold text-red-600 bg-red-50 px-2.5 py-1 rounded-full border border-red-100">
                      {total} votes
                    </span>
                  </div>

                  {q.type === 'multiple_choice' && (
                    <div className="space-y-2 mt-4">
                      {q.options.map((opt) => {
                        const count = agg?.optionCounts?.[opt.id] || 0;
                        const pct = total > 0 ? Math.round((count / total) * 100) : 0;
                        return (
                          <div key={opt.id} className="text-xs">
                            <div className="flex justify-between mb-1 text-slate-700 font-medium">
                              <span>{opt.text}</span>
                              <span className="font-mono">
                                {count} ({pct}%)
                              </span>
                            </div>
                            <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-red-600 rounded-full transition-all duration-300"
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {q.type === 'rating' && (
                    <div className="mt-3 flex items-center gap-4 text-sm font-semibold text-slate-700">
                      <span>Average Score: <strong className="text-amber-600 font-bold">{agg?.averageRating || 0} / 5.0</strong></span>
                    </div>
                  )}

                  {q.type === 'nps' && (
                    <div className="mt-3 flex items-center gap-4 text-sm font-semibold text-slate-700">
                      <span>Net Promoter Score: <strong className="text-red-600 font-bold">{agg?.npsScore?.score ?? 'N/A'}</strong></span>
                      <span className="text-xs text-slate-500 font-normal">
                        ({agg?.npsScore?.promoters || 0} promoters, {agg?.npsScore?.detractors || 0} detractors)
                      </span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 4: GIFT LOTTERY (random gifts capped by quantity + winRatio, claim via coordinator) */}
      {adminTab === 'gifts' && (
        <div className="space-y-6">
          {/* Gift lottery config */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600">
                <GiftIcon className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-lg text-slate-900">Gift Lottery & Random Rewards</h3>
                <p className="text-xs text-slate-500">Set up to 5 gift kinds — winners are picked randomly among respondents, capped by quantity &amp; win ratio. Winners claim by meeting the coordinator.</p>
              </div>
            </div>

            <div className="space-y-4 max-w-2xl">
              {/* Enable */}
              <button
                id="admin-gift-toggle-btn"
                onClick={() => setGiftEnabled((p) => !p)}
                className={`w-full p-3.5 rounded-xl border flex items-center justify-between transition-all ${giftEnabled ? 'bg-amber-50 border-amber-300 text-amber-950 hover:bg-amber-100/80' : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'}`}
              >
                <div className="text-left">
                  <span className="text-xs font-medium opacity-80 block">Gift lottery for this survey</span>
                  <strong className="text-sm">{giftEnabled ? 'ENABLED — respondents enter lottery' : 'DISABLED'}</strong>
                </div>
                {giftEnabled ? <PartyPopper className="w-5 h-5 text-amber-600" /> : <GiftIcon className="w-5 h-5 text-slate-400" />}
              </button>

              <div className={`${giftEnabled ? '' : 'opacity-50 pointer-events-none'}`}>
                {/* Win ratio cap */}
                <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50">
                  <label className="flex items-center gap-2 text-xs font-bold text-slate-700 mb-2">
                    <Percent className="w-4 h-4 text-amber-600" />
                    <span>Cap ratio — % of respondents who win a gift</span>
                    <span className="ml-auto px-2 py-0.5 rounded-full bg-amber-100 border border-amber-200 text-amber-800 font-mono text-xs">{giftWinRatio}%</span>
                  </label>
                  <input type="range" min={5} max={100} step={5} value={giftWinRatio} onChange={(e) => setGiftWinRatio(parseInt(e.target.value))} className="w-full accent-amber-600" />
                  <div className="flex justify-between text-[10px] text-slate-500 mt-1"><span>5% (rare)</span><span>50% (balanced)</span><span>100% (everyone with stock wins)</span></div>
                </div>

                {/* Gifts list */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Gift kinds ({giftList.length}/5) — pulled from DB</span>
                    <button onClick={handleAddGift} disabled={giftList.length >= 5} className="text-xs font-bold text-amber-700 hover:text-amber-800 disabled:opacity-40 flex items-center gap-1">
                      <Plus className="w-3.5 h-3.5" /> Add Gift
                    </button>
                  </div>
                  {giftList.map((g, idx) => {
                    const assigned = giftWinnings.filter((w) => w.giftId === g.id).length;
                    const remaining = Math.max(g.quantity - assigned, 0);
                    return (
                      <div key={g.id} className="p-3 rounded-xl border border-slate-200 bg-white flex flex-col gap-2">
                        <div className="flex items-center gap-2">
                          <input value={g.emoji} onChange={(e) => handleGiftFieldChange(idx, 'emoji', e.target.value)} placeholder="🎁" className="w-12 text-center text-lg px-1 py-1 border border-slate-200 rounded-lg" maxLength={2} />
                          <input value={g.name} onChange={(e) => handleGiftFieldChange(idx, 'name', e.target.value)} placeholder="Gift name (e.g., Free Coffee)" className="flex-1 px-3 py-1.5 border border-slate-200 rounded-lg text-sm font-semibold" maxLength={40} />
                          <div className="flex items-center gap-1">
                            <span className="text-[11px] text-slate-500">Qty</span>
                            <input type="number" min={1} max={500} value={g.quantity} onChange={(e) => handleGiftFieldChange(idx, 'quantity', parseInt(e.target.value) || 1)} className="w-16 px-2 py-1 border border-slate-200 rounded-lg text-sm font-mono" />
                          </div>
                          <button onClick={() => handleRemoveGift(idx)} className="p-1.5 text-slate-400 hover:text-rose-600"><Trash2 className="w-4 h-4" /></button>
                        </div>
                        <input value={g.description || ''} onChange={(e) => handleGiftFieldChange(idx, 'description', e.target.value)} placeholder="Short description (where to redeem)" className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs" maxLength={80} />
                        <div className="flex items-center gap-2 text-[11px]">
                          <span className={`px-1.5 py-0.5 rounded-full border font-mono ${remaining === 0 ? 'bg-rose-50 border-rose-200 text-rose-700' : 'bg-emerald-50 border-emerald-200 text-emerald-700'}`}>{assigned}/{g.quantity} awarded • {remaining} left</span>
                          <span className="text-slate-400">{g.quantity} cap for this gift</span>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Claim instructions shown to winners</label>
                  <input value={giftInstructions} onChange={(e) => setGiftInstructions(e.target.value)} placeholder="Meet the coordinator at the entrance desk..." className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm" maxLength={120} />
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <button id="admin-save-gift-config-btn" onClick={handleSaveGiftConfig} className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm">
                    <Save className="w-3.5 h-3.5" /><span>Save Gift Lottery</span>
                  </button>
                  {giftSavedMsg && <span className="text-xs text-emerald-600 font-semibold flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5" /> Saved!</span>}
                  {giftSaveError && <span className="text-xs text-rose-600 font-semibold">{giftSaveError}</span>}
                </div>
              </div>
            </div>
          </div>

          {/* Winners & claims */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600"><Award className="w-5 h-5" /></div>
                <div>
                  <h3 className="font-bold text-slate-900">Lottery Winners</h3>
                  <p className="text-xs text-slate-500">{giftWinnings.length} winner{giftWinnings.length !== 1 ? 's' : ''} • {giftWinnings.filter((w) => w.claimed).length} claimed • {giftWinnings.filter((w) => !w.claimed).length} awaiting coordinator</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={handleExportWinningsCSV} disabled={giftWinnings.length === 0} className="px-3 py-1.5 rounded-xl bg-[#0c182e] hover:bg-[#152e59] disabled:opacity-40 text-white text-xs font-bold flex items-center gap-1.5"><Download className="w-3.5 h-3.5 text-red-400" /><span>Export Winners CSV</span></button>
                <button onClick={() => { if (confirm('Clear all gift winnings for this survey? Winners will lose their gift.')) clearGiftWinnings(); }} disabled={giftWinnings.length === 0} className="px-3 py-1.5 rounded-xl border border-rose-200 text-rose-700 hover:bg-rose-50 disabled:opacity-40 text-xs font-semibold">Clear</button>
              </div>
            </div>

            {giftWinnings.length === 0 ? (
              <p className="text-xs text-slate-500 bg-slate-50 border border-slate-200 rounded-xl p-3">No winners yet. Enable lottery and let attendees submit — gifts are awarded randomly with your cap ratio, directly from DB. No mock winners.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="text-[11px] uppercase tracking-wider text-slate-500 border-b border-slate-200">
                      <th className="py-2 pr-3">Gift</th>
                      <th className="py-2 pr-3">Winner</th>
                      <th className="py-2 pr-3">Contact</th>
                      <th className="py-2 pr-3">Code</th>
                      <th className="py-2 pr-3 text-center">Claimed</th>
                      <th className="py-2 pr-3">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[...giftWinnings].reverse().slice(0, 50).map((w) => (
                      <tr key={w.id} className="border-b border-slate-100 last:border-0">
                        <td className="py-2 pr-3"><span className="inline-flex items-center gap-1.5"><span className="text-base">{w.giftEmoji}</span><span className="font-semibold text-slate-800">{w.giftName}</span></span></td>
                        <td className="py-2 pr-3 font-semibold text-slate-800">{w.participantName || <span className="text-slate-400 font-normal">Guest</span>}</td>
                        <td className="py-2 pr-3 text-slate-600">{w.participantEmail || w.participantUniqueId || <span className="text-slate-400">—</span>}</td>
                        <td className="py-2 pr-3 font-mono text-[11px]">{w.id.slice(-6).toUpperCase()}</td>
                        <td className="py-2 pr-3 text-center">{w.claimed ? <span className="px-1.5 py-0.5 rounded-full bg-emerald-100 border border-emerald-200 text-emerald-700 font-bold text-[10px]">Claimed by {w.claimedBy}</span> : <span className="px-1.5 py-0.5 rounded-full bg-amber-100 border border-amber-200 text-amber-700 font-bold text-[10px]">Awaiting</span>}</td>
                        <td className="py-2 pr-3">
                          {!w.claimed ? (
                            <button onClick={() => claimGiftForVoter(w.voterToken)} className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold flex items-center gap-1"><HandHeart className="w-3 h-3" /> Mark Claimed</button>
                          ) : (
                            <span className="text-[11px] text-slate-500 font-mono">{w.claimedAt ? new Date(w.claimedAt).toLocaleTimeString() : ''}</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {giftWinnings.length > 50 && <p className="text-[11px] text-slate-500 mt-2">Showing 50 most recent. Export CSV for full list.</p>}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 5: PASSKEYS, PROJECTION CONTROLS & NEON DATABASE */}
      {adminTab === 'settings' && (
        <div className="space-y-6">
          {/* Moderator Passkey Configuration for /project */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-red-50 border border-red-200 flex items-center justify-center text-red-600">
                <KeyRound className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-lg text-slate-900">Stage Screen Passkey / User Code</h3>
                <p className="text-xs text-slate-500">
                  Set the passkey required to access the projector stage screen at <code>/project</code>.
                </p>
              </div>
            </div>

            <div className="max-w-md space-y-3">
              <label className="block text-xs font-bold text-slate-700">
                Projector Passkey (Current: {session?.projectorPasskey || '8920'})
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={passkeyInput}
                  onChange={(e) => setPasskeyInput(e.target.value)}
                  placeholder="e.g. 8920"
                  className="flex-1 px-3.5 py-2 rounded-xl border border-slate-300 font-mono text-sm focus:outline-none focus:border-red-500"
                />
                <button
                  onClick={handleSavePasskey}
                  className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold transition shadow-xs flex items-center gap-1.5"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>Save Passkey</span>
                </button>
              </div>
              {passkeySavedMsg && (
                <span className="text-xs text-emerald-600 font-semibold flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Passkey updated successfully!
                </span>
              )}
            </div>
          </div>

          {/* Audience Identity & Unique Attendee IDs */}
          <div id="admin-identity-config-card" className="bg-white border border-slate-200 rounded-2xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-200 flex items-center justify-center text-indigo-600">
                <Fingerprint className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-lg text-slate-900">Audience Identity &amp; Unique IDs</h3>
                <p className="text-xs text-slate-500">
                  Choose what attendee data this survey captures. Everyone who registers receives a unique ID used for
                  tracking across every question and after the event.
                </p>
              </div>
            </div>

            <div className="space-y-4 max-w-xl">
              {/* Master switch */}
              <button
                id="admin-identity-toggle-btn"
                onClick={() => setIdentityEnabled((prev) => !prev)}
                className={`w-full p-3.5 rounded-xl border flex items-center justify-between transition-all ${
                  identityEnabled
                    ? 'bg-indigo-50 border-indigo-300 text-indigo-950 hover:bg-indigo-100/80'
                    : 'bg-slate-50 border-slate-300 text-slate-700 hover:bg-slate-100'
                }`}
              >
                <div className="text-left">
                  <span className="text-xs font-medium opacity-80 block">Identity capture for this survey</span>
                  <strong className="text-sm">{identityEnabled ? 'ENABLED' : 'DISABLED'}</strong>
                </div>
                {identityEnabled ? (
                  <BadgeCheck className="w-5 h-5 text-indigo-600 shrink-0" />
                ) : (
                  <Fingerprint className="w-5 h-5 text-slate-400 shrink-0" />
                )}
              </button>

              {/* Field selection */}
              <div className={`space-y-2 ${identityEnabled ? '' : 'opacity-50 pointer-events-none'}`}>
                <span className="block text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  Data to capture
                </span>

                <label className="flex items-center gap-2.5 p-2.5 rounded-xl border border-slate-200 cursor-pointer hover:bg-slate-50">
                  <input
                    id="admin-identity-capture-name"
                    type="checkbox"
                    checked={identityCaptureName}
                    onChange={(e) => setIdentityCaptureName(e.target.checked)}
                    className="rounded border-slate-300 text-red-600"
                  />
                  <UserRound className="w-4 h-4 text-slate-500" />
                  <span className="text-sm text-slate-800">Full name</span>
                </label>

                <label className="flex items-center gap-2.5 p-2.5 rounded-xl border border-slate-200 cursor-pointer hover:bg-slate-50">
                  <input
                    id="admin-identity-capture-email"
                    type="checkbox"
                    checked={identityCaptureEmail}
                    onChange={(e) => setIdentityCaptureEmail(e.target.checked)}
                    className="rounded border-slate-300 text-red-600"
                  />
                  <Mail className="w-4 h-4 text-slate-500" />
                  <span className="text-sm text-slate-800">Email address</span>
                </label>

                <label className="flex items-center gap-2.5 p-2.5 rounded-xl border border-slate-200 cursor-pointer hover:bg-slate-50">
                  <input
                    id="admin-identity-capture-phone"
                    type="checkbox"
                    checked={identityCapturePhone}
                    onChange={(e) => setIdentityCapturePhone(e.target.checked)}
                    className="rounded border-slate-300 text-red-600"
                  />
                  <Phone className="w-4 h-4 text-slate-500" />
                  <span className="text-sm text-slate-800">Phone number</span>
                </label>

                <label className="flex items-center gap-2.5 p-2.5 rounded-xl border border-slate-200 cursor-pointer hover:bg-slate-50">
                  <input
                    id="admin-identity-required"
                    type="checkbox"
                    checked={identityRequired}
                    onChange={(e) => setIdentityRequired(e.target.checked)}
                    className="rounded border-slate-300 text-red-600"
                  />
                  <CheckSquare className="w-4 h-4 text-slate-500" />
                  <span className="text-sm text-slate-800">
                    Require it before attendees can answer
                    <span className="block text-[11px] text-slate-500">
                      When off, attendees may also answer as guests without a unique ID.
                    </span>
                  </span>
                </label>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <button
                  id="admin-save-identity-config-btn"
                  onClick={handleSaveIdentityConfig}
                  disabled={identityEnabled && identityFieldsCount === 0}
                  className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-bold transition shadow-xs flex items-center gap-1.5"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>Save Identity Settings</span>
                </button>

                {identityEnabled && identityFieldsCount === 0 && (
                  <span className="text-xs text-rose-600 font-semibold">Select at least one field to capture</span>
                )}

                {identitySavedMsg && (
                  <span className="text-xs text-emerald-600 font-semibold flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Identity settings updated!
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Registered attendees (unique ID tracking) */}
          <div id="admin-attendees-card" className="bg-white border border-slate-200 rounded-2xl p-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600">
                  <BadgeCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-lg text-slate-900">Identified Attendees</h3>
                  <p className="text-xs text-slate-500">
                    <strong className="text-slate-800">{participants.length}</strong> unique ID
                    {participants.length !== 1 ? 's' : ''} issued in this survey.
                  </p>
                </div>
              </div>

              <button
                id="admin-export-attendees-btn"
                onClick={handleExportAttendeesCSV}
                disabled={participants.length === 0}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#0c182e] hover:bg-[#152e59] disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-bold shadow-sm transition"
              >
                <Download className="w-4 h-4 text-red-400" />
                <span>Export Attendees CSV</span>
              </button>
            </div>

            {participants.length === 0 ? (
              <p className="text-xs text-slate-500 bg-slate-50 border border-slate-200 rounded-xl p-3">
                No attendee identities captured yet. Enable identity capture above to start issuing unique IDs.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="text-[11px] uppercase tracking-wider text-slate-500 border-b border-slate-200">
                      <th className="py-2 pr-3 font-bold">Unique ID</th>
                      <th className="py-2 pr-3 font-bold">Attendee</th>
                      <th className="py-2 pr-3 font-bold">Contact</th>
                      <th className="py-2 pr-3 font-bold text-center">Answers</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[...participants]
                      .reverse()
                      .slice(0, 12)
                      .map((p: AudienceParticipant) => (
                        <tr key={p.id} className="border-b border-slate-100 last:border-0">
                          <td className="py-2 pr-3 font-mono text-[11px] text-slate-700">{p.uniqueId}</td>
                          <td className="py-2 pr-3 text-slate-800 font-semibold">
                            {p.name || <span className="text-slate-400 font-normal">Guest</span>}
                          </td>
                          <td className="py-2 pr-3 text-slate-600">
                            {p.email || ''}
                            {p.email && p.phone ? ' · ' : ''}
                            {p.phone || ''}
                            {!p.email && !p.phone ? <span className="text-slate-400">—</span> : null}
                          </td>
                          <td className="py-2 pr-3 text-center font-semibold text-slate-700">{p.responseCount ?? 0}</td>
                        </tr>
                      ))}
                  </tbody>
                </table>
                {participants.length > 12 && (
                  <p className="text-[11px] text-slate-500 mt-2">
                    Showing the 12 most recent registrations. Export the CSV for the full list.
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Neon PostgreSQL Cloud Database */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600">
                <Database className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-lg text-slate-900">Neon PostgreSQL Integration</h3>
                <p className="text-xs text-slate-500">
                  Reliable cloud storage for Phonex AWS live surveys, audience responses, and session configuration.
                </p>
              </div>
            </div>

            <div
              className={`p-4 rounded-xl border mb-5 ${
                dbStatus?.type === 'neon-postgresql'
                  ? 'bg-emerald-50 border-emerald-300 text-emerald-950'
                  : 'bg-amber-50 border-amber-300 text-amber-950'
              }`}
            >
              <div className="flex items-center gap-2 font-bold text-sm mb-1">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>Neon PostgreSQL Active & Synchronized</span>
              </div>
              <p className="text-xs leading-relaxed opacity-85">{dbStatus?.message}</p>
            </div>
          </div>

          {/* Reset Survey Data Zone */}
          <div className="bg-rose-50/50 border border-rose-200 rounded-2xl p-6">
            <h3 className="font-bold text-base text-rose-950 mb-1 flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-rose-600" />
              <span>Danger Zone: Clear Session Data</span>
            </h3>
            <p className="text-xs text-rose-800 mb-4">
              Clearing responses deletes all collected attendee votes across all questions for a fresh rehearsal or new session.
            </p>
            <button
              onClick={() => {
                if (confirm('Are you sure you want to delete ALL responses for ALL questions in this session? This cannot be undone.')) {
                  clearQuestionResponses();
                }
              }}
              className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-xs transition"
            >
              Clear All Session Responses
            </button>
          </div>
        </div>
      )}

      {/* CREATE / EDIT QUESTION MODAL */}
      {showQuestionModal && (
        <div
          id="question-editor-modal"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in"
          onClick={() => setShowQuestionModal(false)}
        >
          <div
            className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-slate-900">
                {editingQuestionId ? 'Edit Survey Question' : 'Create New Survey Question'}
              </h3>
              <button
                onClick={() => setShowQuestionModal(false)}
                className="text-slate-400 hover:text-slate-700 p-1"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveQuestion} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Question Title *
                </label>
                <input
                  type="text"
                  required
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  placeholder="e.g. Which cloud feature are you most excited for?"
                  className="w-full px-3.5 py-2 border border-slate-300 rounded-xl text-sm focus:border-red-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Description / Context (Optional)
                </label>
                <input
                  type="text"
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  placeholder="Optional context for the audience"
                  className="w-full px-3.5 py-2 border border-slate-300 rounded-xl text-sm focus:border-red-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Question Type
                </label>
                <select
                  value={formType}
                  onChange={(e) => setFormType(e.target.value as QuestionType)}
                  className="w-full px-3.5 py-2 border border-slate-300 rounded-xl text-sm focus:border-red-500 focus:outline-none"
                >
                  <option value="multiple_choice">Multiple Choice</option>
                  <option value="rating">Star Rating (1-5)</option>
                  <option value="nps">Net Promoter Score (0-10)</option>
                  <option value="open_text">Open Text / Feedback</option>
                </select>
              </div>

              {/* Multiple Choice Options Builder */}
              {formType === 'multiple_choice' && (
                <div className="space-y-2 pt-2">
                  <div className="flex justify-between items-center">
                    <label className="block text-xs font-bold text-slate-700">
                      Options ({formOptions.length})
                    </label>
                    <button
                      type="button"
                      onClick={handleAddOption}
                      className="text-xs font-bold text-red-600 hover:text-red-700 flex items-center gap-1"
                    >
                      <Plus className="w-3.5 h-3.5" /> Add Option
                    </button>
                  </div>

                  {formOptions.map((opt, idx) => (
                    <div key={opt.id} className="flex items-center gap-2">
                      <span className="w-6 text-xs font-bold text-slate-400">
                        {String.fromCharCode(65 + idx)}.
                      </span>
                      <input
                        type="text"
                        required
                        value={opt.text}
                        onChange={(e) => handleOptionChange(idx, e.target.value)}
                        placeholder={`Option ${String.fromCharCode(65 + idx)}`}
                        className="flex-1 px-3 py-1.5 border border-slate-300 rounded-lg text-sm"
                      />
                      {formOptions.length > 2 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveOption(idx)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 rounded"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  ))}

                  <div className="pt-2">
                    <label className="flex items-center gap-2 text-xs font-medium text-slate-700 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formAllowMultiple}
                        onChange={(e) => setFormAllowMultiple(e.target.checked)}
                        className="rounded border-slate-300 text-red-600"
                      />
                      <span>Allow attendees to select multiple options</span>
                    </label>
                  </div>
                </div>
              )}

              <div className="pt-4 border-t border-slate-100 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowQuestionModal(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 text-xs font-bold hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold shadow-sm"
                >
                  {editingQuestionId ? 'Update Question' : 'Create Question'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* SETUP SINGLE SURVEY MODAL (Enforces one survey at a time with new projection passkey) */}
      {showSetupSurveyModal && (
        <div
          id="admin-setup-survey-modal-backdrop"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto animate-in fade-in"
          onClick={() => !setupLoading && setShowSetupSurveyModal(false)}
        >
          <div
            id="admin-setup-survey-modal-card"
            className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 text-slate-900 my-8"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-red-50 border border-red-200 flex items-center justify-center text-red-600">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Setup New Active Survey</h3>
                  <span className="text-[11px] text-slate-500">Resets session & issues new projection code</span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => !setupLoading && setShowSetupSurveyModal(false)}
                className="p-1 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 leading-relaxed">
              <strong>Single Survey Rule:</strong> Phoenix SWS maintains one active survey at a time. Setting up this new survey will archive the previous questions/responses and immediately issue a brand new Session Code and Projector Passkey.
            </div>

            <form onSubmit={handleExecuteSetupSurvey} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Survey Event Title
                </label>
                <input
                  type="text"
                  value={setupSurveyTitle}
                  onChange={(e) => setSetupSurveyTitle(e.target.value)}
                  placeholder="e.g. Phoenix SWS Live Interactive Survey"
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl focus:outline-none focus:border-red-600"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  First Survey Question Title *
                </label>
                <input
                  type="text"
                  value={setupQuestionTitle}
                  onChange={(e) => setSetupQuestionTitle(e.target.value)}
                  placeholder="e.g. How would you rate today's keynote presentation?"
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl focus:outline-none focus:border-red-600"
                  required
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Question Response Format
                </label>
                <select
                  value={setupQuestionType}
                  onChange={(e) => setSetupQuestionType(e.target.value as QuestionType)}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl focus:outline-none focus:border-red-600 bg-white"
                >
                  <option value="multiple_choice">Multiple Choice Poll</option>
                  <option value="rating">Star Rating (1-5)</option>
                  <option value="nps">Net Promoter Score (0-10)</option>
                  <option value="open_text">Open Text / Feedback</option>
                </select>
              </div>

              {setupQuestionType === 'multiple_choice' && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Poll Choices
                  </label>
                  <div className="space-y-2">
                    {setupOptions.map((opt, idx) => (
                      <div key={opt.id} className="flex items-center gap-2">
                        <span className="w-6 text-center text-xs font-bold text-slate-400">
                          {String.fromCharCode(65 + idx)}
                        </span>
                        <input
                          type="text"
                          value={opt.text}
                          onChange={(e) => {
                            const val = e.target.value;
                            setSetupOptions((prev) => {
                              const copy = [...prev];
                              copy[idx] = { ...copy[idx], text: val };
                              return copy;
                            });
                          }}
                          className="flex-1 px-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:outline-none focus:border-red-600"
                          placeholder={`Choice ${String.fromCharCode(65 + idx)}`}
                        />
                      </div>
                    ))}
                  </div>

                  <div className="mt-2">
                    <label className="flex items-center gap-2 text-xs font-medium text-slate-700 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={setupAllowMultiple}
                        onChange={(e) => setSetupAllowMultiple(e.target.checked)}
                        className="rounded border-slate-300 text-red-600"
                      />
                      <span>Allow attendees to pick multiple choices</span>
                    </label>
                  </div>
                </div>
              )}

              {/* Audience identity capture for the new survey */}
              <div className="p-3 bg-indigo-50/60 border border-indigo-200 rounded-xl space-y-2.5">
                <label className="flex items-start gap-2 text-xs font-bold text-indigo-950 cursor-pointer">
                  <input
                    id="setup-identity-enabled"
                    type="checkbox"
                    checked={setupIdentityEnabled}
                    onChange={(e) => setSetupIdentityEnabled(e.target.checked)}
                    className="mt-0.5 rounded border-indigo-300 text-red-600"
                  />
                  <span>
                    Capture audience identity &amp; issue unique IDs
                    <span className="block text-[11px] font-normal text-indigo-800/80">
                      Registers attendee details and gives everyone a unique tracking ID for this survey.
                    </span>
                  </span>
                </label>

                {setupIdentityEnabled && (
                  <div className="pl-6 space-y-2">
                    <span className="block text-[11px] font-bold uppercase tracking-wider text-indigo-800">
                      Data to capture
                    </span>

                    <label className="flex items-center gap-2 text-xs text-indigo-950 cursor-pointer">
                      <input
                        id="setup-capture-name"
                        type="checkbox"
                        checked={setupCaptureName}
                        onChange={(e) => setSetupCaptureName(e.target.checked)}
                        className="rounded border-indigo-300 text-red-600"
                      />
                      <UserRound className="w-3.5 h-3.5 text-indigo-700" />
                      <span>Full name</span>
                    </label>

                    <label className="flex items-center gap-2 text-xs text-indigo-950 cursor-pointer">
                      <input
                        id="setup-capture-email"
                        type="checkbox"
                        checked={setupCaptureEmail}
                        onChange={(e) => setSetupCaptureEmail(e.target.checked)}
                        className="rounded border-indigo-300 text-red-600"
                      />
                      <Mail className="w-3.5 h-3.5 text-indigo-700" />
                      <span>Email address</span>
                    </label>

                    <label className="flex items-center gap-2 text-xs text-indigo-950 cursor-pointer">
                      <input
                        id="setup-capture-phone"
                        type="checkbox"
                        checked={setupCapturePhone}
                        onChange={(e) => setSetupCapturePhone(e.target.checked)}
                        className="rounded border-indigo-300 text-red-600"
                      />
                      <Phone className="w-3.5 h-3.5 text-indigo-700" />
                      <span>Phone number</span>
                    </label>

                    <label className="flex items-center gap-2 text-xs text-indigo-950 cursor-pointer">
                      <input
                        id="setup-identity-required"
                        type="checkbox"
                        checked={setupIdentityRequired}
                        onChange={(e) => setSetupIdentityRequired(e.target.checked)}
                        className="rounded border-indigo-300 text-red-600"
                      />
                      <CheckSquare className="w-3.5 h-3.5 text-indigo-700" />
                      <span>Require details before attendees can answer</span>
                    </label>
                  </div>
                )}
              </div>

              {/* Gift lottery for the new survey */}
              <div className="p-3 bg-amber-50/60 border border-amber-200 rounded-xl space-y-2.5">
                <label className="flex items-start gap-2 text-xs font-bold text-amber-950 cursor-pointer">
                  <input
                    id="setup-gift-enabled"
                    type="checkbox"
                    checked={setupGiftEnabled}
                    onChange={(e) => setSetupGiftEnabled(e.target.checked)}
                    className="mt-0.5 rounded border-amber-300 text-amber-600"
                  />
                  <span>
                    Enable gift lottery &amp; random rewards
                    <span className="block text-[11px] font-normal text-amber-800/80">
                      Winners picked randomly among respondents, capped by quantity &amp; win ratio. They claim via coordinator.
                    </span>
                  </span>
                </label>

                {setupGiftEnabled && (
                  <div className="pl-6 space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-bold text-amber-800">Win cap ratio</span>
                      <input type="range" min={5} max={100} step={5} value={setupGiftWinRatio} onChange={(e) => setSetupGiftWinRatio(parseInt(e.target.value))} className="flex-1 accent-amber-600" />
                      <span className="text-xs font-mono font-bold text-amber-700">{setupGiftWinRatio}%</span>
                    </div>
                    <div className="space-y-1.5">
                      {setupGiftList.map((g, idx) => (
                        <div key={g.id} className="flex items-center gap-1.5">
                          <input value={g.emoji} onChange={(e) => { const v = e.target.value; setSetupGiftList((prev) => { const c=[...prev]; c[idx]={...c[idx], emoji:v}; return c; }); }} className="w-10 text-center border border-amber-200 rounded-lg py-1 text-sm" maxLength={2} />
                          <input value={g.name} onChange={(e) => { const v = e.target.value; setSetupGiftList((prev) => { const c=[...prev]; c[idx]={...c[idx], name:v}; return c; }); }} className="flex-1 px-2 py-1 border border-amber-200 rounded-lg text-xs" placeholder="Gift name" />
                          <input type="number" min={1} max={500} value={g.quantity} onChange={(e) => { const v=parseInt(e.target.value)||1; setSetupGiftList((prev)=>{const c=[...prev]; c[idx]={...c[idx], quantity:v}; return c;}); }} className="w-14 px-1 py-1 border border-amber-200 rounded-lg text-xs font-mono" />
                        </div>
                      ))}
                      {setupGiftList.length < 5 && <button type="button" onClick={() => setSetupGiftList((p) => [...p, { id: 'gift-'+Math.random().toString(36).slice(2,6), name:'', emoji:'🎁', quantity:5 }])} className="text-[11px] font-bold text-amber-700">+ Add gift kind</button>}
                    </div>
                  </div>
                )}
              </div>

              {setupError && (
                <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
                  <XCircle className="w-4 h-4 shrink-0" />
                  <span>{setupError}</span>
                </div>
              )}

              <div className="pt-4 border-t border-slate-100 flex justify-end gap-2">
                <button
                  type="button"
                  disabled={setupLoading}
                  onClick={() => setShowSetupSurveyModal(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 text-xs font-bold hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={setupLoading || !setupQuestionTitle.trim()}
                  className="px-5 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold shadow-sm transition flex items-center gap-2 disabled:opacity-50"
                >
                  {setupLoading ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Setup & Issue New Code</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
