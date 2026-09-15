import React, { createContext, useContext, useEffect, useState, useRef, useCallback } from 'react';
import {
  SurveySession,
  Question,
  AggregatedResult,
  SurveyResponse,
  ReactionPulse,
  ViewRole,
  DatabaseStatus,
  AudienceParticipant,
  AudienceIdentityConfig,
  GiftConfig,
  GiftWinning
} from '../types';

interface LiveSurveyContextType {
  role: ViewRole;
  setRole: (r: ViewRole) => void;
  session: SurveySession | null;
  questions: Question[];
  activeQuestion: Question | null;
  aggregates: Record<string, AggregatedResult>;
  audienceCount: number;
  dbStatus: DatabaseStatus | null;
  isConnected: boolean;
  voterToken: string;
  mySubmittedVotes: Record<string, { optionIds?: string[]; rating?: number; text?: string }>;
  recentReactions: ReactionPulse[];
  // Audience identity: this device's registered identity + full attendee registry
  participant: AudienceParticipant | null;
  participants: AudienceParticipant[];
  identityConfig: AudienceIdentityConfig;
  registerIdentity: (fields: {
    name?: string;
    email?: string;
    phone?: string;
  }) => Promise<{ success: boolean; message?: string; participant?: AudienceParticipant }>;
  clearIdentity: () => void;
  submitVote: (
    questionId: string,
    answer: { selectedOptionIds?: string[]; ratingValue?: number; textValue?: string }
  ) => Promise<{ success: boolean; message?: string; giftWinning?: GiftWinning | null; isFinalCompletion?: boolean }>;
  sendReaction: (emoji: string) => void;
  updateSessionSettings: (updates: Partial<SurveySession> & { timerSeconds?: number }) => Promise<void>;
  createQuestion: (q: Partial<Question>) => Promise<void>;
  updateQuestionData: (id: string, q: Partial<Question>) => Promise<void>;
  deleteQuestionData: (id: string) => Promise<void>;
  moderateResponse: (responseId: string, isApproved: boolean) => Promise<void>;
  editResponseContent: (responseId: string, textValue: string) => Promise<void>;
  clearQuestionResponses: (questionId?: string) => Promise<void>;
  setupSingleSurvey: (config: {
    title: string;
    description?: string;
    questionTitle: string;
    questionType: 'multiple_choice' | 'rating' | 'open_text' | 'nps';
    options?: Array<{ id: string; text: string }>;
    allowMultiple?: boolean;
    identityConfig?: AudienceIdentityConfig;
    giftConfig?: GiftConfig;
  }) => Promise<{ success: boolean; session?: SurveySession; question?: Question }>;
  refreshData: () => Promise<void>;
  // Gift lottery
  giftConfig: GiftConfig;
  giftWinnings: GiftWinning[];
  myGiftWinning: GiftWinning | null;
  updateGiftConfig: (cfg: GiftConfig) => Promise<{ success: boolean; message?: string }>;
  claimGift: (winningId?: string) => Promise<{ success: boolean; message?: string }>;
  claimGiftForVoter: (voterToken: string) => Promise<{ success: boolean; message?: string }>;
  clearGiftWinnings: () => Promise<void>;
  refreshGifts: () => Promise<void>;
}

const LiveSurveyContext = createContext<LiveSurveyContextType | null>(null);

function getOrCreateVoterToken(): string {
  let token = localStorage.getItem('live_survey_voter_token');
  if (!token) {
    token = 'voter_' + Math.random().toString(36).substring(2, 11) + Date.now().toString(36);
    localStorage.setItem('live_survey_voter_token', token);
  }
  return token;
}

const PARTICIPANT_STORAGE_KEY = 'live_survey_participant';

const DEFAULT_IDENTITY_CONFIG: AudienceIdentityConfig = {
  enabled: false,
  captureName: true,
  captureEmail: true,
  capturePhone: false,
  required: false
};

const DEFAULT_GIFT_CONFIG: GiftConfig = {
  enabled: false,
  winRatio: 35,
  gifts: [
    { id: 'gift-1', name: 'Free Coffee Voucher', description: 'Redeem at the lobby café', emoji: '☕', quantity: 12 },
    { id: 'gift-2', name: 'Event T-Shirt', description: 'Limited Phoenix SWS tee', emoji: '👕', quantity: 8 },
    { id: 'gift-3', name: 'VIP Networking Pass', description: 'Exclusive after-event access', emoji: '🎟️', quantity: 3 }
  ],
  claimInstructions: 'Meet the coordinator at the entrance desk to claim your gift. Show your gift code.'
};

// Vercel: frontend (phoenix-sws.neka.ng) may talk to external persistent backend.
// Set VITE_API_URL=https://your-api.onrender.com and VITE_WS_URL=wss://your-api.onrender.com
// If unset, falls back to same-origin (local dev + single-server deploy).
const API_BASE = (import.meta as any).env?.VITE_API_URL?.replace(/\/$/, '') || '';
const WS_BASE = (import.meta as any).env?.VITE_WS_URL?.replace(/\/$/, '') || '';
const api = (path: string) => `${API_BASE}${path}`;
const getWsUrl = () => {
  if (WS_BASE) return `${WS_BASE.replace(/^http/, 'ws')}/ws`;
  if (API_BASE) {
    try {
      const u = new URL(API_BASE);
      const proto = u.protocol === 'https:' ? 'wss:' : 'ws:';
      return `${proto}//${u.host}/ws`;
    } catch {}
  }
  const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  return `${proto}//${window.location.host}/ws`;
};

async function safeJson(res: Response) {
  const ct = res.headers.get('content-type') || '';
  if (!res.ok || !ct.includes('application/json')) {
    const text = await res.text().catch(() => '');
    // Vercel static fallback returns HTML for /api when mis-routed — surface as error
    throw new Error(text.slice(0, 200) || `HTTP ${res.status}`);
  }
  return res.json();
}

function readStoredParticipant(): AudienceParticipant | null {
  try {
    const raw = localStorage.getItem(PARTICIPANT_STORAGE_KEY);
    return raw ? (JSON.parse(raw) as AudienceParticipant) : null;
  } catch {
    return null;
  }
}

export const LiveSurveyProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Read role from pathname (/project, /projector, /admin) or query param (?role=projector or ?role=admin)
  const [role, setRoleState] = useState<ViewRole>(() => {
    const pathname = window.location.pathname.toLowerCase();
    if (pathname === '/project' || pathname === '/projector') return 'projector';
    if (pathname === '/admin') return 'admin';

    const params = new URLSearchParams(window.location.search);
    const r = params.get('role') || params.get('view');
    if (r === 'project' || r === 'projector') return 'projector';
    if (r === 'admin') return 'admin';
    return 'audience';
  });

  const [session, setSession] = useState<SurveySession | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [aggregates, setAggregates] = useState<Record<string, AggregatedResult>>({});
  const [audienceCount, setAudienceCount] = useState<number>(1);
  const [dbStatus, setDbStatus] = useState<DatabaseStatus | null>(null);
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [voterToken] = useState<string>(getOrCreateVoterToken);
  const [mySubmittedVotes, setMySubmittedVotes] = useState<
    Record<string, { optionIds?: string[]; rating?: number; text?: string }>
  >(() => {
    try {
      const saved = localStorage.getItem('live_survey_my_votes');
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });
  const [recentReactions, setRecentReactions] = useState<ReactionPulse[]>([]);
  const [participant, setParticipant] = useState<AudienceParticipant | null>(() => readStoredParticipant());
  const [participants, setParticipants] = useState<AudienceParticipant[]>([]);
  const [giftWinnings, setGiftWinnings] = useState<GiftWinning[]>([]);
  const myGiftWinning = giftWinnings.find((w) => w.voterToken === voterToken) || null;

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const wsFailCountRef = useRef(0);
  // Kept in a ref so the socket always identifies with the latest view role
  const roleRef = useRef<ViewRole>(role);
  roleRef.current = role;

  const setRole = (newRole: ViewRole) => {
    setRoleState(newRole);
    const url = new URL(window.location.href);
    if (newRole === 'audience') {
      url.pathname = '/';
      url.searchParams.delete('role');
      url.searchParams.delete('view');
    } else if (newRole === 'projector') {
      url.pathname = '/project';
      url.searchParams.delete('role');
      url.searchParams.delete('view');
    } else if (newRole === 'admin') {
      url.pathname = '/admin';
      url.searchParams.delete('role');
      url.searchParams.delete('view');
    }
    window.history.pushState({}, '', url.toString());

    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({
          type: 'IDENTIFY',
          payload: { role: newRole, voterToken }
        })
      );
    }
  };

  const activeQuestion = questions.find((q) => q.id === session?.activeQuestionId) || null;

  const refreshGifts = useCallback(async () => {
    try {
      const [winsRes, mineRes] = await Promise.all([
        fetch(api('/api/gifts/winnings')).then((r) => r.ok ? r.json().catch(() => []) : []),
        fetch(api(`/api/gifts/mine?voterToken=${encodeURIComponent(voterToken)}`)).then((r) => r.ok ? r.json().catch(() => null) : null).catch(() => null)
      ]);
      if (Array.isArray(winsRes)) setGiftWinnings(winsRes);
    } catch (e) {
      console.warn('Error fetching gifts:', e);
    }
  }, [voterToken]);

  const refreshData = useCallback(async () => {
    try {
      const [sessRes, qRes, dbRes, participantsRes, giftsRes] = await Promise.all([
        fetch(api('/api/session')).then((r) => safeJson(r)).catch(() => null),
        fetch(api('/api/questions')).then((r) => safeJson(r)).catch(() => []),
        fetch(api('/api/db-status')).then((r) => safeJson(r)).catch(() => null),
        fetch(api('/api/participants')).then((r) => (r.ok ? r.json().catch(() => []) : [])).catch(() => []),
        fetch(api('/api/gifts/winnings')).then((r) => (r.ok ? r.json().catch(() => []) : [])).catch(() => [])
      ]);
      if (!sessRes) {
        console.warn('API unavailable — verify Vercel rewrites or VITE_API_URL (see README)');
        return;
      }
      setSession(sessRes);
      setQuestions(Array.isArray(qRes) ? qRes : []);
      if (dbRes) setDbStatus(dbRes);
      if (Array.isArray(giftsRes)) setGiftWinnings(giftsRes);

      // Sync the attendee registry and this device's issued unique ID
      const registry: AudienceParticipant[] = Array.isArray(participantsRes) ? participantsRes : [];
      setParticipants(registry);
      const mine = registry.find((p) => p.voterToken === voterToken && p.sessionId === sessRes?.id);
      if (mine) {
        setParticipant(mine);
        localStorage.setItem(PARTICIPANT_STORAGE_KEY, JSON.stringify(mine));
      } else {
        // Our previous unique ID is stale for this survey (new survey issues fresh IDs) -> clear it
        const stored = readStoredParticipant();
        if (stored && stored.sessionId === sessRes?.id) {
          // No matching entry in registry means the server has reset attendees for this survey
          localStorage.removeItem(PARTICIPANT_STORAGE_KEY);
          setParticipant(null);
        }
        // Also prune local vote cache for questions that no longer exist
        try {
          const validIds = new Set<string>((qRes as Question[]).map((q) => q.id));
          setMySubmittedVotes((prev) => {
            const pruned: typeof prev = {};
            let changed = false;
            for (const [k, v] of Object.entries(prev)) {
              if (validIds.has(k)) pruned[k] = v;
              else changed = true;
            }
            if (changed) localStorage.setItem('live_survey_my_votes', JSON.stringify(pruned));
            return changed ? pruned : prev;
          });
        } catch {
          // ignore
        }
      }

      // fetch aggregates
      const analyticsRes = await fetch(api('/api/analytics')).then((r) => r.ok ? r.json().catch(() => null) : null).catch(() => null);
      if (analyticsRes?.perQuestion) {
        const aggs: Record<string, AggregatedResult> = {};
        for (const item of analyticsRes.perQuestion) {
          aggs[item.questionId] = item;
        }
        setAggregates(aggs);
      }
    } catch (e) {
      console.warn('Error fetching fresh survey data:', e);
    }
  }, [voterToken]);

  // WebSocket connection & lifecycle
  useEffect(() => {
    let unmounted = false;

    function connectWs() {
      if (unmounted) return;
      const wsUrl = getWsUrl();

      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        if (unmounted) return;
        wsFailCountRef.current = 0;
        setIsConnected(true);
        ws.send(
          JSON.stringify({
            type: 'IDENTIFY',
            payload: { role: roleRef.current, voterToken }
          })
        );
      };

      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          switch (msg.type) {
            case 'INITIAL_STATE':
              setSession(msg.payload.session);
              setQuestions(msg.payload.questions);
              setAggregates(msg.payload.aggregates || {});
              setDbStatus(msg.payload.dbStatus);
              if (Array.isArray(msg.payload.participants)) {
                const reg: AudienceParticipant[] = msg.payload.participants;
                setParticipants(reg);
                const mineInit = reg.find((p) => p.voterToken === voterToken && p.sessionId === msg.payload.session?.id);
                if (mineInit) {
                  setParticipant(mineInit);
                  localStorage.setItem(PARTICIPANT_STORAGE_KEY, JSON.stringify(mineInit));
                } else {
                  const storedInit = readStoredParticipant();
                  if (storedInit && storedInit.sessionId === msg.payload.session?.id) {
                    const stillExists = reg.some((p) => p.voterToken === voterToken);
                    if (!stillExists) {
                      localStorage.removeItem(PARTICIPANT_STORAGE_KEY);
                      setParticipant(null);
                    }
                  }
                }
              }
              if (Array.isArray(msg.payload.giftWinnings)) {
                setGiftWinnings(msg.payload.giftWinnings);
              } else if (Array.isArray(msg.payload.participants) && msg.payload.session?.giftConfig?.enabled) {
                // Fallback fetch if not included
                refreshGifts();
              }
              break;

            case 'SESSION_UPDATE':
              setSession(msg.payload);
              break;

            case 'QUESTIONS_UPDATE': {
              const nextQuestions: Question[] = Array.isArray(msg.payload) ? msg.payload : [];
              setQuestions(nextQuestions);
              // Prune local votes for questions that were removed (e.g., new survey with single question)
              const validIds = new Set(nextQuestions.map((q) => q.id));
              setMySubmittedVotes((prev) => {
                const pruned: Record<string, { optionIds?: string[]; rating?: number; text?: string }> = {};
                let changed = false;
                for (const [k, v] of Object.entries(prev)) {
                  if (validIds.has(k)) pruned[k] = v;
                  else changed = true;
                }
                if (changed) localStorage.setItem('live_survey_my_votes', JSON.stringify(pruned));
                return changed ? pruned : prev;
              });
              break;
            }

            case 'AGGREGATES_UPDATE':
              setAggregates((prev) => ({
                ...prev,
                [msg.payload.questionId]: msg.payload.aggregates
              }));
              break;

            case 'FULL_AGGREGATES_RESET':
              setAggregates(msg.payload);
              break;

            case 'AUDIENCE_COUNT':
              setAudienceCount(msg.payload.count);
              break;

            case 'PARTICIPANTS_UPDATE': {
              const reg: AudienceParticipant[] = Array.isArray(msg.payload) ? msg.payload : [];
              setParticipants(reg);
              // Keep local identity in sync - if our token no longer exists (survey reset), clear it
              const mine = reg.find((p) => p.voterToken === voterToken);
              if (mine) {
                setParticipant((prev) => {
                  if (!prev || prev.uniqueId !== mine.uniqueId) {
                    localStorage.setItem(PARTICIPANT_STORAGE_KEY, JSON.stringify(mine));
                  }
                  return mine;
                });
              } else {
                const stored = readStoredParticipant();
                if (stored && stored.voterToken === voterToken) {
                  // Our stored identity not in new registry -> this survey reset attendees
                  localStorage.removeItem(PARTICIPANT_STORAGE_KEY);
                  setParticipant(null);
                }
              }
              break;
            }

            case 'GIFT_WINNINGS_UPDATE':
              setGiftWinnings(Array.isArray(msg.payload) ? msg.payload : []);
              break;

            case 'GIFT_WIN':
              // Personal win notification could trigger extra confetti
              if (msg.payload?.giftWinning?.voterToken === voterToken) {
                setGiftWinnings((prev) => {
                  const exists = prev.find((w) => w.id === msg.payload.giftWinning.id);
                  if (exists) return prev;
                  return [...prev, msg.payload.giftWinning];
                });
              } else {
                // For admin views, just refresh
                setGiftWinnings((prev) => {
                  const exists = prev.find((w) => w.id === msg.payload.giftWinning.id);
                  if (exists) return prev;
                  return [...prev, msg.payload.giftWinning];
                });
              }
              break;

            case 'GIFT_CLAIMED':
              setGiftWinnings((prev) => prev.map((w) => (w.id === msg.payload.id ? msg.payload : w)));
              break;

            case 'TIMER_UPDATE':
              setSession((prev) =>
                prev
                  ? {
                      ...prev,
                      timerSecondsRemaining: msg.payload.secondsRemaining,
                      timerTotalSeconds: msg.payload.totalSeconds
                    }
                  : null
              );
              break;

            case 'REACTION_PULSE':
              setRecentReactions((prev) => [...prev.slice(-14), msg.payload]);
              break;

            case 'PONG':
              break;

            default:
              break;
          }
        } catch (err) {
          console.error('Error handling WebSocket message:', err);
        }
      };

      ws.onclose = () => {
        if (unmounted) return;
        setIsConnected(false);
        wsFailCountRef.current += 1;
        // On Vercel static (phoenix-sws.neka.ng) WS will 404 — after 5 tries, rely on polling
        if (wsFailCountRef.current > 5) {
          console.warn('WS unavailable (Vercel static), using polling fallback for DB sync');
          return;
        }
        reconnectTimeoutRef.current = setTimeout(connectWs, 2500);
      };

      ws.onerror = () => {
        ws.close();
      };
    }

    connectWs();
    refreshData();
    refreshGifts();

    // Polling fallback for Vercel serverless where WS never stays open (phoenix-sws.neka.ng)
    // Ensures projector/admin/audience still see DB truth every 3s even when wss://.../ws 404s
    const pollInterval = setInterval(() => {
      if (document.visibilityState === 'visible') {
        refreshData();
        refreshGifts();
      }
    }, 3000);

    // Heartbeat ping
    const pingInterval = setInterval(() => {
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({ type: 'PING' }));
      }
    }, 15000);

    return () => {
      unmounted = true;
      clearInterval(pingInterval);
      clearInterval(pollInterval);
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
      if (wsRef.current) wsRef.current.close();
    };
  }, [voterToken, refreshData, refreshGifts]);

  // Clean old reactions from queue
  useEffect(() => {
    if (recentReactions.length === 0) return;
    const timer = setTimeout(() => {
      const now = Date.now();
      setRecentReactions((prev) => prev.filter((rx) => now - rx.timestamp < 3500));
    }, 1000);
    return () => clearTimeout(timer);
  }, [recentReactions]);

  // Drop identity issued for a previous survey (a new survey issues fresh unique IDs)
  useEffect(() => {
    if (session?.id && participant && participant.sessionId !== session.id) {
      localStorage.removeItem(PARTICIPANT_STORAGE_KEY);
      setParticipant(null);
    }
  }, [session?.id, participant]);

  // Register (or update) this attendee's details and receive a unique tracking ID
  const registerIdentity = async (fields: { name?: string; email?: string; phone?: string }) => {
    try {
      const res = await fetch(api('/api/participants'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          voterToken,
          sessionId: session?.id,
          name: fields.name,
          email: fields.email,
          phone: fields.phone
        })
      });

      const data = await res.json();
      if (!res.ok || !data.participant) {
        return { success: false, message: data.error || 'Could not save your details. Please try again.' };
      }

      const saved: AudienceParticipant = data.participant;
      setParticipant(saved);
      localStorage.setItem(PARTICIPANT_STORAGE_KEY, JSON.stringify(saved));
      return { success: true, participant: saved };
    } catch (e: any) {
      return { success: false, message: e.message || 'Could not save your details. Please try again.' };
    }
  };

  const clearIdentity = () => {
    localStorage.removeItem(PARTICIPANT_STORAGE_KEY);
    setParticipant(null);
  };

  // Submit audience vote
  const submitVote = async (
    questionId: string,
    answer: { selectedOptionIds?: string[]; ratingValue?: number; textValue?: string }
  ) => {
    const identity = session?.identityConfig;
    if (identity?.enabled && identity.required && !participant) {
      return { success: false, message: 'Please add your details first to receive your unique attendee ID.' };
    }

    try {
      const res = await fetch(api('/api/responses'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          questionId,
          sessionId: session?.id || 'session-default-live',
          voterToken,
          audienceName: participant?.name,
          audienceEmail: participant?.email,
          audiencePhone: participant?.phone,
          ...answer
        })
      });

      const dataBody = await res.json();
      if (!res.ok) {
        return { success: false, message: dataBody.error || 'Voting failed' };
      }

      // Record in local cache
      const updated = {
        ...mySubmittedVotes,
        [questionId]: {
          optionIds: answer.selectedOptionIds,
          rating: answer.ratingValue,
          text: answer.textValue
        }
      };
      setMySubmittedVotes(updated);
      localStorage.setItem('live_survey_my_votes', JSON.stringify(updated));

      // Gift lottery win (only after final completion) arrives in same response; keep giftWinnings in sync
      const giftWinning: GiftWinning | null = dataBody.giftWinning || null;
      const isFinalCompletion: boolean = Boolean(dataBody.isFinalCompletion);
      if (giftWinning) {
        setGiftWinnings((prev) => {
          const exists = prev.find((w) => w.id === giftWinning.id);
          if (exists) return prev;
          return [...prev, giftWinning];
        });
      } else if (isFinalCompletion) {
        refreshGifts();
      }

      return { success: true, giftWinning, isFinalCompletion };
    } catch (e: any) {
      return { success: false, message: e.message };
    }
  };

  const sendReaction = (emoji: string) => {
    // Send via WS or fallback to HTTP
    const xPos = Math.floor(Math.random() * 80 + 10);
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({
          type: 'REACTION_PULSE',
          payload: { emoji, xPosition: xPos }
        })
      );
    } else {
      fetch(api('/api/reaction'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ emoji, xPosition: xPos })
      }).catch(() => {});
    }
  };

  const updateSessionSettings = async (updates: Partial<SurveySession> & { timerSeconds?: number }) => {
    try {
      const res = await fetch(api('/api/session'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      });
      const data = await res.json();
      setSession(data);
    } catch (e) {
      console.error('Failed to update session settings:', e);
    }
  };

  const createQuestion = async (q: Partial<Question>) => {
    try {
      await fetch(api('/api/questions'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(q)
      });
      await refreshData();
    } catch (e) {
      console.error('Failed to create question:', e);
    }
  };

  const updateQuestionData = async (id: string, q: Partial<Question>) => {
    try {
      await fetch(api(`/api/questions/${id}`), {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(q)
      });
      await refreshData();
    } catch (e) {
      console.error('Failed to update question:', e);
    }
  };

  const deleteQuestionData = async (id: string) => {
    try {
      await fetch(api(`/api/questions/${id}`), {
        method: 'DELETE'
      });
      await refreshData();
    } catch (e) {
      console.error('Failed to delete question:', e);
    }
  };

  const moderateResponse = async (responseId: string, isApproved: boolean) => {
    try {
      await fetch(api(`/api/responses/${responseId}/moderation`), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isApproved })
      });
      await refreshData();
    } catch (e) {
      console.error('Failed to moderate response:', e);
    }
  };

  const editResponseContent = async (responseId: string, textValue: string) => {
    try {
      await fetch(api(`/api/responses/${responseId}/content`), {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ textValue })
      });
      await refreshData();
    } catch (e) {
      console.error('Failed to edit response content:', e);
    }
  };

  const clearQuestionResponses = async (questionId?: string) => {
    try {
      await fetch(api('/api/responses/clear'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ questionId })
      });
      await refreshData();
    } catch (e) {
      console.error('Failed to clear responses:', e);
    }
  };

  const setupSingleSurvey = async (config: {
    title: string;
    description?: string;
    questionTitle: string;
    questionType: 'multiple_choice' | 'rating' | 'open_text' | 'nps';
    options?: Array<{ id: string; text: string }>;
    allowMultiple?: boolean;
    identityConfig?: AudienceIdentityConfig;
    giftConfig?: GiftConfig;
  }) => {
    try {
      const res = await fetch(api('/api/surveys/setup'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config)
      });
      const data = await res.json();
      if (!res.ok) {
        return { success: false, message: data.error || 'Setup failed' };
      }
      if (data.session && data.question) {
        setSession(data.session);
        setQuestions([data.question]);
        setAggregates({
          [data.question.id]: {
            questionId: data.question.id,
            totalResponses: 0,
            optionCounts: {},
            openResponses: []
          }
        });
        // Clear local votes for the fresh survey
        localStorage.removeItem('live_survey_my_votes');
        setMySubmittedVotes({});
        // A brand new survey issues brand new unique attendee IDs
        localStorage.removeItem(PARTICIPANT_STORAGE_KEY);
        setParticipant(null);
        setParticipants([]);
        setGiftWinnings([]);
        return { success: true, session: data.session, question: data.question };
      }
      return { success: false, message: data.error || 'Setup failed' };
    } catch (e: any) {
      console.error('Failed to setup single survey:', e);
      return { success: false, message: e.message || 'Setup failed' };
    }
  };

  const updateGiftConfig = async (cfg: GiftConfig) => {
    try {
      const res = await fetch(api('/api/gifts/config'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ giftConfig: cfg })
      });
      const data = await res.json();
      if (!res.ok) return { success: false, message: data.error || 'Failed to save gifts' };
      await refreshData();
      await refreshGifts();
      return { success: true };
    } catch (e: any) {
      return { success: false, message: e.message };
    }
  };

  const claimGift = async (winningId?: string) => {
    try {
      const id = winningId || myGiftWinning?.id;
      if (!id) return { success: false, message: 'No gift to claim' };
      const res = await fetch(api('/api/gifts/claim'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ winningId: id, claimedBy: 'attendee' })
      });
      const data = await res.json();
      if (!res.ok) return { success: false, message: data.error || 'Claim failed' };
      setGiftWinnings((prev) => prev.map((w) => (w.id === id ? data.winning : w)));
      return { success: true };
    } catch (e: any) {
      return { success: false, message: e.message };
    }
  };

  const claimGiftForVoter = async (voterTokenForClaim: string) => {
    try {
      const res = await fetch(api('/api/gifts/claim'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ voterToken: voterTokenForClaim, claimedBy: 'coordinator' })
      });
      const data = await res.json();
      if (!res.ok) return { success: false, message: data.error || 'Claim failed' };
      setGiftWinnings((prev) => prev.map((w) => (w.id === data.winning.id ? data.winning : w)));
      return { success: true };
    } catch (e: any) {
      return { success: false, message: e.message };
    }
  };

  const clearGiftWinnings = async () => {
    try {
      await fetch(api('/api/gifts/clear'), { method: 'POST' });
      setGiftWinnings([]);
    } catch (e) {
      console.error('Failed to clear gift winnings:', e);
    }
  };

  return (
    <LiveSurveyContext.Provider
      value={{
        role,
        setRole,
        session,
        questions,
        activeQuestion,
        aggregates,
        audienceCount,
        dbStatus,
        isConnected,
        voterToken,
        mySubmittedVotes,
        recentReactions,
        participant,
        participants,
        identityConfig: session?.identityConfig || DEFAULT_IDENTITY_CONFIG,
        registerIdentity,
        clearIdentity,
        submitVote,
        sendReaction,
        updateSessionSettings,
        createQuestion,
        updateQuestionData,
        deleteQuestionData,
        moderateResponse,
        editResponseContent,
        clearQuestionResponses,
        setupSingleSurvey,
        refreshData,
        giftConfig: session?.giftConfig || DEFAULT_GIFT_CONFIG,
        giftWinnings,
        myGiftWinning,
        updateGiftConfig,
        claimGift,
        claimGiftForVoter,
        clearGiftWinnings,
        refreshGifts
      }}
    >
      {children}
    </LiveSurveyContext.Provider>
  );
};

export function useLiveSurvey() {
  const ctx = useContext(LiveSurveyContext);
  if (!ctx) {
    throw new Error('useLiveSurvey must be used within LiveSurveyProvider');
  }
  return ctx;
}
