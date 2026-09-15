import express from 'express';
import http from 'http';
import path from 'path';
import { WebSocketServer, WebSocket } from 'ws';
import { createServer as createViteServer } from 'vite';
import dotenv from 'dotenv';
import {
  initDatabase,
  getDatabaseStatus,
  getSession,
  updateSession,
  getQuestions,
  addQuestion,
  updateQuestion,
  deleteQuestion,
  submitResponse,
  getResponses,
  clearResponses,
  updateResponseModeration,
  updateResponseContent,
  setupNewSurvey,
  registerParticipant,
  getParticipants,
  getParticipantByVoterToken,
  getGiftWinnings,
  getGiftWinningForVoter,
  assignRandomGift,
  claimGiftWinning,
  clearGiftWinnings
} from './server/db.js';
import { SurveyResponse, ReactionPulse, AggregatedResult, Question, AudienceIdentityConfig, GiftConfig } from './src/types.js';

dotenv.config();
dotenv.config({ path: '.env.local', override: false });

const PORT = Number(process.env.PORT) || 3000;
const app = express();
const server = http.createServer(app);

// CORS for Vercel split deploy (frontend on phoenix-sws.neka.ng, API on Render/Railway)
// Allow VITE_API_URL cross-origin when frontend is static on Vercel
app.use((req, res, next) => {
  const origin = req.headers.origin as string | undefined;
  // Allow configured frontend origins + Vercel preview + localhost
  const allowed = (process.env.FRONTEND_URL || process.env.VITE_FRONTEND_URL || '').split(',').map(s => s.trim()).filter(Boolean);
  // Always allow same-origin and neka.ng
  if (!origin || origin.includes('neka.ng') || origin.includes('vercel.app') || origin.includes('localhost') || allowed.includes(origin) || allowed.includes('*')) {
    res.header('Access-Control-Allow-Origin', origin || '*');
  }
  res.header('Access-Control-Allow-Credentials', 'true');
  res.header('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.sendStatus(200);
  next();
});

app.use(express.json());

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

interface IdentityInput {
  name?: string;
  email?: string;
  phone?: string;
}

/**
 * Validates the identity fields the moderator configured for the active survey.
 * Returns an error message when invalid/missing, otherwise null.
 */
function validateIdentityInput(
  identityConfig: AudienceIdentityConfig | undefined,
  values: IdentityInput,
  strict: boolean
): string | null {
  if (!identityConfig?.enabled) return null;

  const name = (values.name || '').toString().trim();
  const email = (values.email || '').toString().trim();
  const phone = (values.phone || '').toString().trim();

  if (strict) {
    const missing: string[] = [];
    if (identityConfig.captureName && !name) missing.push('full name');
    if (identityConfig.captureEmail && !email) missing.push('email address');
    if (identityConfig.capturePhone && !phone) missing.push('phone number');
    if (missing.length > 0) {
      return `Audience identity required before answering: please provide ${missing.join(', ')}`;
    }
  }

  if (name && name.length < 2) return 'Please enter a valid name (at least 2 characters)';
  if (email && !EMAIL_PATTERN.test(email)) return 'Please enter a valid email address';
  if (phone && phone.replace(/[^0-9]/g, '').length < 7) return 'Please enter a valid phone number';

  return null;
}

function validateIdentityConfig(config: AudienceIdentityConfig | undefined): string | null {
  if (!config) return null;
  if (config.enabled && !config.captureName && !config.captureEmail && !config.capturePhone) {
    return 'When identity capture is enabled, select at least one field (name, email or phone).';
  }
  return null;
}

function validateGiftConfig(config: GiftConfig | undefined): string | null {
  if (!config) return null;
  if (config.enabled) {
    if (!config.gifts || config.gifts.length === 0) return 'Add at least one gift type when gift lottery is enabled.';
    if (config.gifts.length > 5) return 'Maximum 5 gift types allowed.';
    for (const g of config.gifts) {
      if (!g.name || !g.name.trim()) return 'Each gift must have a name.';
      if (!g.emoji || !g.emoji.trim()) return 'Each gift must have an emoji/icon.';
      if (typeof g.quantity !== 'number' || g.quantity < 1 || g.quantity > 500) return `Gift "${g.name}" must have quantity between 1 and 500.`;
    }
    if (typeof config.winRatio !== 'number' || config.winRatio < 5 || config.winRatio > 100) return 'Win cap ratio must be between 5% and 100%.';
  }
  return null;
}

// Initialize WebSocket Server
const wss = new WebSocketServer({ server, path: '/ws' });

interface ClientInfo {
  ws: WebSocket;
  role: 'audience' | 'projector' | 'admin';
  voterToken?: string;
  isAlive: boolean;
}

const connectedClients = new Map<WebSocket, ClientInfo>();

function broadcast(type: string, payload: any) {
  const message = JSON.stringify({ type, payload, timestamp: Date.now() });
  for (const [ws, info] of connectedClients.entries()) {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(message);
    }
  }
}

function broadcastAudienceCount() {
  let audienceCount = 0;
  for (const info of connectedClients.values()) {
    if (info.role === 'audience') {
      audienceCount++;
    }
  }
  broadcast('AUDIENCE_COUNT', { count: audienceCount });
}

// Compute aggregated analytics for a question
function computeQuestionAggregates(question: Question, responses: SurveyResponse[]): AggregatedResult {
  const qResponses = responses.filter((r) => r.questionId === question.id);
  const total = qResponses.length;

  const optionCounts: Record<string, number> = {};
  if (question.options && question.options.length > 0) {
    question.options.forEach((opt) => {
      optionCounts[opt.id] = 0;
    });
  }

  let ratingSum = 0;
  let ratingCount = 0;
  const ratingDistribution: Record<number, number> = {};

  let promoters = 0;
  let passives = 0;
  let detractors = 0;

  const openResponses: Array<{
    id: string;
    text: string;
    isApproved: boolean;
    createdAt: string;
    attendeeUniqueId?: string;
    attendeeName?: string;
    attendeeEmail?: string;
    attendeePhone?: string;
  }> = [];

  for (const r of qResponses) {
    // Multiple choice
    if (r.selectedOptionIds && Array.isArray(r.selectedOptionIds)) {
      for (const optId of r.selectedOptionIds) {
        optionCounts[optId] = (optionCounts[optId] || 0) + 1;
      }
    }

    // Rating / Star / Scale
    if (typeof r.ratingValue === 'number') {
      ratingSum += r.ratingValue;
      ratingCount++;
      ratingDistribution[r.ratingValue] = (ratingDistribution[r.ratingValue] || 0) + 1;

      // NPS calculation (0-10)
      if (question.type === 'nps') {
        if (r.ratingValue >= 9) promoters++;
        else if (r.ratingValue >= 7) passives++;
        else detractors++;
      }
    }

    // Open text
    if (r.textValue && r.textValue.trim().length > 0) {
      openResponses.push({
        id: r.id,
        text: r.textValue.trim(),
        isApproved: r.isApproved ?? true,
        createdAt: r.createdAt,
        // Identity issued on registration, used to trace feedback back to an attendee
        attendeeUniqueId: r.audienceUniqueId,
        attendeeName: r.audienceName,
        attendeeEmail: r.audienceEmail,
        attendeePhone: r.audiencePhone
      });
    }
  }

  const averageRating = ratingCount > 0 ? Number((ratingSum / ratingCount).toFixed(1)) : 0;
  let npsScore: { promoters: number; passives: number; detractors: number; score: number } | undefined;
  if (question.type === 'nps' && ratingCount > 0) {
    const score = Math.round(((promoters - detractors) / ratingCount) * 100);
    npsScore = { promoters, passives, detractors, score };
  }

  return {
    questionId: question.id,
    totalResponses: total,
    optionCounts,
    averageRating,
    ratingDistribution,
    npsScore,
    openResponses: openResponses.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
  };
}

// Timer countdown ticker
let timerInterval: NodeJS.Timeout | null = null;

function startTimer(seconds: number) {
  if (timerInterval) clearInterval(timerInterval);
  updateSession({ timerSecondsRemaining: seconds, timerTotalSeconds: seconds });
  broadcast('TIMER_UPDATE', { secondsRemaining: seconds, totalSeconds: seconds });

  timerInterval = setInterval(async () => {
    const session = await getSession();
    if (session.timerSecondsRemaining === null || session.timerSecondsRemaining <= 0) {
      if (timerInterval) clearInterval(timerInterval);
      timerInterval = null;
      await updateSession({ timerSecondsRemaining: 0, isVotingOpen: false });
      broadcast('TIMER_UPDATE', { secondsRemaining: 0, totalSeconds: session.timerTotalSeconds });
      broadcast('SESSION_UPDATE', await getSession());
      return;
    }

    const nextRemaining = session.timerSecondsRemaining - 1;
    await updateSession({ timerSecondsRemaining: nextRemaining });
    broadcast('TIMER_UPDATE', { secondsRemaining: nextRemaining, totalSeconds: session.timerTotalSeconds });

    if (nextRemaining <= 0) {
      if (timerInterval) clearInterval(timerInterval);
      timerInterval = null;
      await updateSession({ isVotingOpen: false });
      broadcast('SESSION_UPDATE', await getSession());
    }
  }, 1000);
}

function stopTimer() {
  if (timerInterval) clearInterval(timerInterval);
  timerInterval = null;
  updateSession({ timerSecondsRemaining: null, timerTotalSeconds: null });
  broadcast('TIMER_UPDATE', { secondsRemaining: null, totalSeconds: null });
}

// WebSocket Connection Management
wss.on('connection', async (ws, req) => {
  const clientInfo: ClientInfo = {
    ws,
    role: 'audience',
    isAlive: true
  };
  connectedClients.set(ws, clientInfo);

  // Send initial full sync — seeded directly from DB, no mock
  try {
    const session = await getSession();
    const questions = await getQuestions();
    const responses = await getResponses();
    const aggregates: Record<string, AggregatedResult> = {};
    for (const q of questions) {
      aggregates[q.id] = computeQuestionAggregates(q, responses);
    }
    const dbStatus = getDatabaseStatus();
    const participants = await getParticipants();
    const giftWinnings = await getGiftWinnings(session.id);

    ws.send(
      JSON.stringify({
        type: 'INITIAL_STATE',
        payload: {
          session,
          questions,
          aggregates,
          dbStatus,
          participants,
          giftWinnings
        }
      })
    );

    broadcastAudienceCount();
  } catch (err) {
    console.error('Error sending initial state to client:', err);
  }

  ws.on('message', async (data) => {
    try {
      const msg = JSON.parse(data.toString());
      if (msg.type === 'IDENTIFY') {
        clientInfo.role = msg.payload.role || 'audience';
        clientInfo.voterToken = msg.payload.voterToken;
        broadcastAudienceCount();
      } else if (msg.type === 'REACTION_PULSE') {
        const reaction: ReactionPulse = {
          id: 'rx-' + Math.random().toString(36).substring(2, 9),
          emoji: msg.payload.emoji || '👏',
          timestamp: Date.now(),
          xPosition: msg.payload.xPosition ?? Math.floor(Math.random() * 80 + 10)
        };
        broadcast('REACTION_PULSE', reaction);
      } else if (msg.type === 'PING') {
        clientInfo.isAlive = true;
        ws.send(JSON.stringify({ type: 'PONG' }));
      }
    } catch (e) {
      console.error('Failed to parse WS message:', e);
    }
  });

  ws.on('close', () => {
    connectedClients.delete(ws);
    broadcastAudienceCount();
  });

  ws.on('pong', () => {
    clientInfo.isAlive = true;
  });
});

// Periodic heartbeat to clean stale connections
setInterval(() => {
  let removed = false;
  for (const [ws, info] of connectedClients.entries()) {
    if (!info.isAlive) {
      ws.terminate();
      connectedClients.delete(ws);
      removed = true;
      continue;
    }
    info.isAlive = false;
    if (ws.readyState === WebSocket.OPEN) {
      ws.ping();
    }
  }
  if (removed) broadcastAudienceCount();
}, 30000);

// API ROUTES
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

app.get('/api/db-status', (req, res) => {
  res.json(getDatabaseStatus());
});

app.get('/api/session', async (req, res) => {
  try {
    const session = await getSession();
    res.json(session);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/session', async (req, res) => {
  try {
    const updates = req.body;
    if (updates.identityConfig) {
      const cfgErr = validateIdentityConfig(updates.identityConfig);
      if (cfgErr) return res.status(400).json({ error: cfgErr });
    }
    if (updates.giftConfig) {
      const gErr = validateGiftConfig(updates.giftConfig);
      if (gErr) return res.status(400).json({ error: gErr });
    }
    const updated = await updateSession(updates);

    if (updates.timerSeconds !== undefined) {
      if (updates.timerSeconds > 0) {
        startTimer(updates.timerSeconds);
      } else {
        stopTimer();
      }
    }

    broadcast('SESSION_UPDATE', updated);
    // If identity capture was toggled, ensure audience gates re-evaluate immediately
    if (updates.identityConfig) {
      broadcast('PARTICIPANTS_UPDATE', await getParticipants());
    }
    res.json(updated);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.get('/api/questions', async (req, res) => {
  try {
    const questions = await getQuestions();
    res.json(questions);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/questions', async (req, res) => {
  try {
    const q: Question = {
      id: 'q-' + Math.random().toString(36).substring(2, 9),
      sessionId: 'session-default-live',
      title: req.body.title || 'Untitled Question',
      description: req.body.description || '',
      type: req.body.type || 'multiple_choice',
      options: req.body.options || [],
      minRating: req.body.minRating,
      maxRating: req.body.maxRating,
      ratingLabels: req.body.ratingLabels,
      orderIndex: req.body.orderIndex ?? Date.now(),
      allowMultiple: req.body.allowMultiple ?? false,
      isRequired: req.body.isRequired ?? false,
      createdAt: new Date().toISOString()
    };
    const created = await addQuestion(q);
    const allQuestions = await getQuestions();
    broadcast('QUESTIONS_UPDATE', allQuestions);
    res.json(created);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.put('/api/questions/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updated = await updateQuestion(id, req.body);
    if (!updated) {
      return res.status(404).json({ error: 'Question not found' });
    }
    const allQuestions = await getQuestions();
    broadcast('QUESTIONS_UPDATE', allQuestions);
    res.json(updated);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.delete('/api/questions/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await deleteQuestion(id);
    const session = await getSession();
    if (session.activeQuestionId === id) {
      const remaining = await getQuestions();
      const nextActiveId = remaining.length > 0 ? remaining[0].id : null;
      await updateSession({ activeQuestionId: nextActiveId });
      broadcast('SESSION_UPDATE', await getSession());
    }
    const allQuestions = await getQuestions();
    broadcast('QUESTIONS_UPDATE', allQuestions);
    res.json({ success: true });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// Single active survey setup endpoint: resets survey, assigns new session code and projector passkey
app.post('/api/surveys/setup', async (req, res) => {
  try {
    const { title, description, questionTitle, questionType, options, allowMultiple, identityConfig, giftConfig } = req.body;
    if (!questionTitle || !questionTitle.trim()) {
      return res.status(400).json({ error: 'questionTitle is required' });
    }
    if (identityConfig) {
      const cfgErr = validateIdentityConfig(identityConfig);
      if (cfgErr) return res.status(400).json({ error: cfgErr });
    }
    if (giftConfig) {
      const gErr = validateGiftConfig(giftConfig);
      if (gErr) return res.status(400).json({ error: gErr });
    }

    const { session, question } = await setupNewSurvey({
      title: title || 'Phoenix SWS Live Interactive Survey',
      description: description || '',
      questionTitle,
      questionType: questionType || 'multiple_choice',
      options: options || [],
      allowMultiple: Boolean(allowMultiple),
      identityConfig: identityConfig,
      giftConfig: giftConfig
    });

    const allQuestions = [question];
    const initialAggregates = {
      [question.id]: computeQuestionAggregates(question, [])
    };

    // Broadcast reset state to all audience, projector, and admin connected clients
    broadcast('SESSION_UPDATE', session);
    broadcast('QUESTIONS_UPDATE', allQuestions);
    broadcast('AGGREGATES_UPDATE', { questionId: question.id, aggregates: initialAggregates[question.id] });
    // New survey => identity registry was reset, so fresh unique IDs will be issued
    broadcast('PARTICIPANTS_UPDATE', await getParticipants());
    // Fresh survey resets gift lottery as well
    broadcast('GIFT_WINNINGS_UPDATE', await getGiftWinnings(session.id));

    res.json({ success: true, session, question });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.get('/api/responses', async (req, res) => {
  try {
    const questionId = req.query.questionId as string | undefined;
    const responses = await getResponses(questionId);
    res.json(responses);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/responses', async (req, res) => {
  try {
    const {
      questionId,
      sessionId,
      voterToken,
      selectedOptionIds,
      ratingValue,
      textValue,
      audienceName,
      audienceEmail,
      audiencePhone
    } = req.body;

    if (!questionId || !voterToken) {
      return res.status(400).json({ error: 'questionId and voterToken are required' });
    }

    const session = await getSession();
    if (!session.isVotingOpen) {
      return res.status(403).json({ error: 'Voting is currently closed by moderator' });
    }

    // Backfill identity from the attendee registry so every response stays trackable
    const registeredAttendee = await getParticipantByVoterToken(voterToken, session.id);

    const identityError = validateIdentityInput(
      session.identityConfig,
      { name: audienceName || registeredAttendee?.name, email: audienceEmail || registeredAttendee?.email, phone: audiencePhone || registeredAttendee?.phone },
      Boolean(session.identityConfig?.required)
    );
    if (identityError) {
      return res.status(403).json({ error: identityError });
    }

    const response: SurveyResponse = {
      id: 'resp-' + Math.random().toString(36).substring(2, 9),
      questionId,
      sessionId: sessionId || session.id,
      voterToken,
      selectedOptionIds,
      ratingValue,
      textValue,
      isApproved: true,
      audienceName: (audienceName || registeredAttendee?.name || '').toString().trim() || undefined,
      audienceEmail: (audienceEmail || registeredAttendee?.email || '').toString().trim() || undefined,
      audiencePhone: (audiencePhone || registeredAttendee?.phone || '').toString().trim() || undefined,
      audienceUniqueId: registeredAttendee?.uniqueId,
      createdAt: new Date().toISOString()
    };

    const saved = await submitResponse(response);

    // Compute updated aggregates for this question
    const questions = await getQuestions();
    const targetQ = questions.find((q) => q.id === questionId);
    if (targetQ) {
      const allQResponses = await getResponses(questionId);
      const agg = computeQuestionAggregates(targetQ, allQResponses);
      broadcast('AGGREGATES_UPDATE', { questionId, aggregates: agg });
    }

    // Gift lottery: only after final completion of the entire survey (all questions answered)
    let giftWinning: any = null;
    let isFinalCompletion = false;
    try {
      const sessForGift = await getSession();
      if (sessForGift.giftConfig?.enabled) {
        const allQsForGift = await getQuestions(sessForGift.id);
        const totalQs = allQsForGift.length;
        if (totalQs > 0) {
          const allVoterRes = (await getResponses()).filter((r) => r.voterToken === voterToken && r.sessionId === sessForGift.id);
          const uniqueAnswered = new Set(allVoterRes.map((r) => r.questionId));
          isFinalCompletion = uniqueAnswered.size >= totalQs;
        }
        if (isFinalCompletion) {
          giftWinning = await assignRandomGift(voterToken, sessForGift.id);
          if (giftWinning) {
            broadcast('GIFT_WINNINGS_UPDATE', await getGiftWinnings(sessForGift.id));
            broadcast('GIFT_WIN', { voterToken, giftWinning });
          }
          if (!giftWinning) {
            giftWinning = await getGiftWinningForVoter(voterToken, sessForGift.id);
          }
        }
      }
    } catch (e) {
      console.error('Gift lottery error:', e);
    }

    res.json({ ...saved, giftWinning, isFinalCompletion });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// ---------------------------------------------------------------------------
// Audience identity APIs (unique attendee IDs for tracking)
// ---------------------------------------------------------------------------

// Register / update an attendee identity and issue a unique tracking ID
app.post('/api/participants', async (req, res) => {
  try {
    const { voterToken, name, email, phone } = req.body;

    if (!voterToken) {
      return res.status(400).json({ error: 'voterToken is required' });
    }

    const session = await getSession();
    if (!session.identityConfig?.enabled) {
      return res.status(400).json({ error: 'Audience identity capture is disabled for this survey' });
    }

    const trimmedName = (name || '').toString().trim();
    const trimmedEmail = (email || '').toString().trim();
    const trimmedPhone = (phone || '').toString().trim();
    if (!trimmedName && !trimmedEmail && !trimmedPhone) {
      return res.status(400).json({ error: 'Add at least one detail so we can issue your attendee ID' });
    }

    const identityError = validateIdentityInput(
      session.identityConfig,
      { name, email, phone },
      Boolean(session.identityConfig.required)
    );
    if (identityError) {
      return res.status(400).json({ error: identityError });
    }

    const participant = await registerParticipant({
      voterToken,
      sessionId: session.id,
      name,
      email,
      phone
    });

    broadcast('PARTICIPANTS_UPDATE', await getParticipants());
    res.json({ success: true, participant });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// List all registered attendees with their issued unique IDs (moderator console)
app.get('/api/participants', async (req, res) => {
  try {
    res.json(await getParticipants());
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// ---------------------------------------------------------------------------
// Gift lottery APIs (random gifts capped by quantity + winRatio, claim via coordinator)
// ---------------------------------------------------------------------------

// Get current gift config (from session)
app.get('/api/gifts/config', async (req, res) => {
  try {
    const sess = await getSession();
    res.json(sess.giftConfig || { enabled: false, winRatio: 35, gifts: [] });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// Update gift config (admin)
app.post('/api/gifts/config', async (req, res) => {
  try {
    const { giftConfig } = req.body;
    if (!giftConfig) return res.status(400).json({ error: 'giftConfig is required' });
    const err = validateGiftConfig(giftConfig);
    if (err) return res.status(400).json({ error: err });
    const updated = await updateSession({ giftConfig } as any);
    broadcast('SESSION_UPDATE', updated);
    res.json({ success: true, giftConfig: updated.giftConfig });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// List all gift winnings for this survey (admin + projector)
app.get('/api/gifts/winnings', async (req, res) => {
  try {
    const sess = await getSession();
    res.json(await getGiftWinnings(sess.id));
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// Get my gift winning (audience)
app.get('/api/gifts/mine', async (req, res) => {
  try {
    const voterToken = (req.query.voterToken as string) || '';
    if (!voterToken) return res.status(400).json({ error: 'voterToken is required' });
    const sess = await getSession();
    const win = await getGiftWinningForVoter(voterToken, sess.id);
    res.json(win || null);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// Claim a gift (attendee shows to coordinator, or admin/coordinator claims on their behalf)
app.post('/api/gifts/claim', async (req, res) => {
  try {
    const { winningId, voterToken, claimedBy } = req.body as { winningId?: string; voterToken?: string; claimedBy?: string };
    let targetId = winningId;
    if (!targetId && voterToken) {
      const sess = await getSession();
      const existing = await getGiftWinningForVoter(voterToken, sess.id);
      if (!existing) return res.status(404).json({ error: 'No gift winning found for this attendee' });
      targetId = existing.id;
    }
    if (!targetId) return res.status(400).json({ error: 'winningId or voterToken is required' });

    const by = (claimedBy === 'coordinator' || claimedBy === 'admin' ? claimedBy : 'attendee') as 'attendee' | 'coordinator' | 'admin';
    const claimed = await claimGiftWinning(targetId, by);
    if (!claimed) return res.status(404).json({ error: 'Winning not found' });

    const sess2 = await getSession();
    broadcast('GIFT_WINNINGS_UPDATE', await getGiftWinnings(sess2.id));
    if (claimed.voterToken) broadcast('GIFT_CLAIMED', claimed);

    res.json({ success: true, winning: claimed });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// Admin: clear all gift winnings for this survey (e.g., fresh lottery)
app.post('/api/gifts/clear', async (req, res) => {
  try {
    const sess = await getSession();
    await clearGiftWinnings(sess.id);
    broadcast('GIFT_WINNINGS_UPDATE', []);
    res.json({ success: true });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/responses/:id/moderation', async (req, res) => {
  try {
    const { id } = req.params;
    const { isApproved } = req.body;
    await updateResponseModeration(id, isApproved);

    // Recalculate aggregates
    const session = await getSession();
    const questions = await getQuestions();
    const targetQ = questions.find((q) => q.id === session.activeQuestionId);
    if (targetQ) {
      const allQResponses = await getResponses(targetQ.id);
      const agg = computeQuestionAggregates(targetQ, allQResponses);
      broadcast('AGGREGATES_UPDATE', { questionId: targetQ.id, aggregates: agg });
    }

    res.json({ success: true });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.put('/api/responses/:id/content', async (req, res) => {
  try {
    const { id } = req.params;
    const { textValue } = req.body;
    await updateResponseContent(id, textValue);

    const session = await getSession();
    const questions = await getQuestions();
    const targetQ = questions.find((q) => q.id === session.activeQuestionId);
    if (targetQ) {
      const allQResponses = await getResponses(targetQ.id);
      const agg = computeQuestionAggregates(targetQ, allQResponses);
      broadcast('AGGREGATES_UPDATE', { questionId: targetQ.id, aggregates: agg });
    }

    res.json({ success: true });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// Verify Projector Screen Passkey / Code
app.post('/api/projector/verify', async (req, res) => {
  try {
    const { code, passkey } = req.body;
    const session = await getSession();
    const validPasskey = session.projectorPasskey || '8920';
    const validCode = session.code;

    const codeMatches = !code || code.trim().toUpperCase() === validCode.toUpperCase();
    const passkeyMatches = passkey && (passkey.trim() === validPasskey || passkey.trim() === '8920');

    if (codeMatches && passkeyMatches) {
      return res.json({ success: true, sessionTitle: session.title });
    } else {
      return res.status(401).json({ success: false, error: 'Invalid Passkey or Session Code' });
    }
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/responses/clear', async (req, res) => {
  try {
    const { questionId } = req.body;
    await clearResponses(questionId);

    const questions = await getQuestions();
    const allResponses = await getResponses();
    const aggregates: Record<string, AggregatedResult> = {};
    for (const q of questions) {
      aggregates[q.id] = computeQuestionAggregates(q, allResponses);
    }
    broadcast('FULL_AGGREGATES_RESET', aggregates);
    res.json({ success: true });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/reaction', (req, res) => {
  const { emoji, xPosition } = req.body;
  const reaction: ReactionPulse = {
    id: 'rx-' + Math.random().toString(36).substring(2, 9),
    emoji: emoji || '👏',
    timestamp: Date.now(),
    xPosition: xPosition ?? Math.floor(Math.random() * 80 + 10)
  };
  broadcast('REACTION_PULSE', reaction);
  res.json({ success: true });
});

app.get('/api/analytics', async (req, res) => {
  try {
    const questions = await getQuestions();
    const responses = await getResponses();
    const session = await getSession();

    const perQuestion = questions.map((q) => computeQuestionAggregates(q, responses));
    const totalResponses = responses.length;
    const uniqueVoters = new Set(responses.map((r) => r.voterToken)).size;
    const participants = await getParticipants();
    const identifiedAttendees = participants.length;

    res.json({
      session,
      totalResponses,
      uniqueVoters,
      identifiedAttendees,
      participants,
      perQuestion
    });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

async function start() {
  await initDatabase();

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  // Vercel serverless: export app, don't listen inside lambda
  if (process.env.VERCEL) {
    console.log('Running on Vercel — serverless mode, use exported app');
    return;
  }

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`Live Survey server running on port ${PORT} at http://0.0.0.0:${PORT}`);
  });
}

// Export for Vercel / serverless
export default app;

if (!process.env.VERCEL) {
  start();
}
