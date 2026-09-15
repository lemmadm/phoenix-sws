import pg from 'pg';
import { SurveySession, Question, SurveyResponse, DatabaseStatus, AudienceParticipant, GiftConfig, GiftWinning, Gift } from '../src/types.js';

const { Pool } = pg;

// Pre-seeded default session data
const defaultSessionId = 'session-default-live';
const defaultQuestions: Question[] = [
  {
    id: 'q1',
    sessionId: defaultSessionId,
    title: 'How would you rate the keynote presentation so far?',
    description: 'Provide your quick sentiment rating',
    type: 'rating',
    options: [],
    minRating: 1,
    maxRating: 5,
    ratingLabels: { min: 'Needs Improvement', max: 'Outstanding!' },
    orderIndex: 0,
    allowMultiple: false,
    isRequired: true,
    createdAt: new Date().toISOString()
  },
  {
    id: 'q2',
    sessionId: defaultSessionId,
    title: 'Which live survey feature is most valuable for your events?',
    description: 'Select your top priority',
    type: 'multiple_choice',
    options: [
      { id: 'opt1', text: 'Instant Projector Screen sync & animations', color: '#3b82f6' },
      { id: 'opt2', text: 'Anonymous attendee privacy with no app install', color: '#10b981' },
      { id: 'opt3', text: 'Moderator controls & response filtering', color: '#8b5cf6' },
      { id: 'opt4', text: 'Live Q&A and real-time word clouds', color: '#f59e0b' }
    ],
    orderIndex: 1,
    allowMultiple: false,
    isRequired: true,
    createdAt: new Date().toISOString()
  },
  {
    id: 'q3',
    sessionId: defaultSessionId,
    title: 'What burning question or feedback do you have for the speaker?',
    description: 'Post anonymous feedback or questions to display on stage',
    type: 'open_text',
    options: [],
    orderIndex: 2,
    allowMultiple: false,
    isRequired: false,
    createdAt: new Date().toISOString()
  },
  {
    id: 'q4',
    sessionId: defaultSessionId,
    title: 'How likely are you to recommend this event session to colleagues? (NPS)',
    description: 'Net Promoter Score scale from 0 to 10',
    type: 'nps',
    options: [],
    minRating: 0,
    maxRating: 10,
    ratingLabels: { min: 'Not Likely', max: 'Extremely Likely' },
    orderIndex: 3,
    allowMultiple: false,
    isRequired: true,
    createdAt: new Date().toISOString()
  }
];

let defaultSession: SurveySession = {
  id: defaultSessionId,
  code: 'LIVE-892',
  projectorPasskey: '8920', // Default Moderator Passkey for Projector Screen access
  title: 'Phoenix SWS Live Interactive Survey',
  description: 'Audience survey and live stage presentation powered by Phoenix SWS',
  activeQuestionId: 'q2',
  isVotingOpen: true,
  areResultsRevealed: true,
  timerSecondsRemaining: null,
  timerTotalSeconds: null,
  theme: 'stage-dark',
  showQRCodeOnProjector: true,
  showResponsesCount: true,
  autoScrollProjector: false,
  identityConfig: {
    enabled: false,
    captureName: true,
    captureEmail: true,
    capturePhone: false,
    required: false
  },
  giftConfig: {
    enabled: false,
    winRatio: 35, // cap ratio: ~35% of respondents win a gift
    gifts: [
      { id: 'gift-1', name: 'Free Coffee Voucher', description: 'Redeem at the lobby café', emoji: '☕', quantity: 12, color: '#8b5cf6' },
      { id: 'gift-2', name: 'Event T-Shirt', description: 'Limited Phoenix SWS tee', emoji: '👕', quantity: 8, color: '#f59e0b' },
      { id: 'gift-3', name: 'VIP Networking Pass', description: 'Exclusive after-event access', emoji: '🎟️', quantity: 3, color: '#10b981' }
    ],
    claimInstructions: 'Meet the coordinator at the entrance desk to claim your gift. Show your gift code.'
  },
  createdAt: new Date().toISOString()
};

// In-memory store fallback — real data lives in DB, no mock responses.
// Audience answers are pulled live from the database so analytics reflect only genuine submissions.
let memorySession: SurveySession = { ...defaultSession };
let memoryQuestions: Question[] = [...defaultQuestions];
let memoryResponses: SurveyResponse[] = [];

// Audience identity registry: every registered attendee gets a unique tracking ID
let memoryParticipants: AudienceParticipant[] = [];

// Gift lottery fallback store (real data in DB when connected)
let memoryGiftWinnings: GiftWinning[] = [];

let pool: pg.Pool | null = null;
let dbStatus: DatabaseStatus = {
  connected: false,
  type: 'embedded-store',
  urlConfigured: false,
  message: 'Initialized with fast real-time store. Set DATABASE_URL to connect Neon PostgreSQL.'
};

export async function initDatabase(): Promise<DatabaseStatus> {
  const connectionString = process.env.DATABASE_URL?.trim();

  if (!connectionString) {
    console.log('[Database] No DATABASE_URL provided. Using high-performance embedded store.');
    dbStatus = {
      connected: true,
      type: 'embedded-store',
      urlConfigured: false,
      message: 'Embedded real-time store active (Ready for Neon PostgreSQL DATABASE_URL).'
    };
    return dbStatus;
  }

  dbStatus.urlConfigured = true;

  try {
    console.log('[Database] Attempting to connect to Neon PostgreSQL...');
    pool = new Pool({
      connectionString,
      ssl: {
        rejectUnauthorized: false
      },
      connectionTimeoutMillis: 5000
    });

    // Test connection
    const client = await pool.connect();
    await client.query('SELECT NOW()');
    console.log('[Database] Successfully connected to Neon PostgreSQL!');

    // Initialize Schema
    await client.query(`
      CREATE TABLE IF NOT EXISTS sessions (
        id TEXT PRIMARY KEY,
        code TEXT UNIQUE NOT NULL,
        projector_passkey TEXT DEFAULT '8920',
        title TEXT NOT NULL,
        description TEXT,
        active_question_id TEXT,
        is_voting_open BOOLEAN DEFAULT true,
        are_results_revealed BOOLEAN DEFAULT true,
        timer_seconds_remaining INT,
        timer_total_seconds INT,
        theme TEXT DEFAULT 'stage-dark',
        show_qr_code BOOLEAN DEFAULT true,
        show_responses_count BOOLEAN DEFAULT true,
        auto_scroll_projector BOOLEAN DEFAULT false,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );

      ALTER TABLE sessions ADD COLUMN IF NOT EXISTS projector_passkey TEXT DEFAULT '8920';
      ALTER TABLE sessions ADD COLUMN IF NOT EXISTS auto_scroll_projector BOOLEAN DEFAULT false;
      ALTER TABLE sessions ADD COLUMN IF NOT EXISTS identity_config JSONB DEFAULT '{"enabled":false,"captureName":true,"captureEmail":true,"capturePhone":false,"required":false}'::jsonb;
      ALTER TABLE sessions ADD COLUMN IF NOT EXISTS gift_config JSONB DEFAULT '{"enabled":false,"winRatio":35,"gifts":[{"id":"gift-1","name":"Free Coffee Voucher","description":"Redeem at the lobby café","emoji":"☕","quantity":12},{"id":"gift-2","name":"Event T-Shirt","description":"Limited Phoenix SWS tee","emoji":"👕","quantity":8},{"id":"gift-3","name":"VIP Networking Pass","description":"Exclusive after-event access","emoji":"🎟️","quantity":3}],"claimInstructions":"Meet the coordinator at the entrance desk to claim your gift. Show your gift code."}'::jsonb;

      -- Gift lottery: winnings issued to respondents (random, capped by quantity + winRatio)
      CREATE TABLE IF NOT EXISTS gift_winnings (
        id TEXT PRIMARY KEY,
        gift_id TEXT NOT NULL,
        gift_name TEXT NOT NULL,
        gift_emoji TEXT NOT NULL,
        session_id TEXT NOT NULL,
        voter_token TEXT NOT NULL,
        participant_unique_id TEXT,
        participant_name TEXT,
        participant_email TEXT,
        claimed BOOLEAN DEFAULT false,
        claimed_at TIMESTAMPTZ,
        claimed_by TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_gift_winnings_session ON gift_winnings(session_id);
      CREATE INDEX IF NOT EXISTS idx_gift_winnings_gift ON gift_winnings(gift_id);
      CREATE INDEX IF NOT EXISTS idx_gift_winnings_voter ON gift_winnings(voter_token, session_id);
      CREATE UNIQUE INDEX IF NOT EXISTS idx_gift_winnings_voter_unique ON gift_winnings(voter_token, session_id);

      CREATE TABLE IF NOT EXISTS questions (
        id TEXT PRIMARY KEY,
        session_id TEXT NOT NULL,
        title TEXT NOT NULL,
        description TEXT,
        type TEXT NOT NULL,
        options JSONB DEFAULT '[]'::jsonb,
        min_rating INT,
        max_rating INT,
        rating_labels JSONB,
        order_index BIGINT DEFAULT 0,
        allow_multiple BOOLEAN DEFAULT false,
        is_required BOOLEAN DEFAULT false,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
      -- Ensure order_index can hold Date.now() values (fix legacy INT)
      DO $$ BEGIN
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='questions' AND column_name='order_index' AND data_type='integer') THEN
          ALTER TABLE questions ALTER COLUMN order_index TYPE BIGINT USING order_index::bigint;
        END IF;
      EXCEPTION WHEN OTHERS THEN
        -- ignore if already bigint or not exists
        NULL;
      END $$;

      CREATE TABLE IF NOT EXISTS responses (
        id TEXT PRIMARY KEY,
        question_id TEXT NOT NULL,
        session_id TEXT NOT NULL,
        voter_token TEXT NOT NULL,
        selected_option_ids JSONB DEFAULT '[]'::jsonb,
        rating_value INT,
        text_value TEXT,
        is_approved BOOLEAN DEFAULT true,
        audience_name TEXT,
        audience_email TEXT,
        audience_phone TEXT,
        audience_unique_id TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );

      ALTER TABLE responses ADD COLUMN IF NOT EXISTS audience_name TEXT;
      ALTER TABLE responses ADD COLUMN IF NOT EXISTS audience_email TEXT;
      ALTER TABLE responses ADD COLUMN IF NOT EXISTS audience_phone TEXT;
      ALTER TABLE responses ADD COLUMN IF NOT EXISTS audience_unique_id TEXT;

      -- Audience identity registry used to issue unique attendee IDs for later tracking
      CREATE TABLE IF NOT EXISTS participants (
        id TEXT PRIMARY KEY,
        unique_id TEXT NOT NULL,
        voter_token TEXT NOT NULL,
        session_id TEXT NOT NULL,
        name TEXT,
        email TEXT,
        phone TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );

      ALTER TABLE participants ADD COLUMN IF NOT EXISTS session_id TEXT;
      CREATE UNIQUE INDEX IF NOT EXISTS idx_participants_token_session ON participants(voter_token, session_id);
      CREATE INDEX IF NOT EXISTS idx_participants_unique_id ON participants(unique_id);

      CREATE INDEX IF NOT EXISTS idx_responses_question ON responses(question_id);
      CREATE INDEX IF NOT EXISTS idx_responses_session ON responses(session_id);
      CREATE INDEX IF NOT EXISTS idx_responses_voter ON responses(question_id, voter_token);
    `);

    // Ensure no mock voter-seed responses remain — all data must be genuine DB entries
    try {
      await client.query(`DELETE FROM responses WHERE voter_token LIKE 'voter-seed-%'`);
    } catch {}

    // Check if session exists; if not, seed default from DB (no mock responses)
    const existingSession = await client.query('SELECT * FROM sessions WHERE id = $1', [defaultSessionId]);
    if (existingSession.rows.length === 0) {
      await client.query(
        `INSERT INTO sessions (id, code, title, description, active_question_id, is_voting_open, are_results_revealed, theme, identity_config, gift_config)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
        [
          defaultSession.id,
          defaultSession.code,
          defaultSession.title,
          defaultSession.description,
          defaultSession.activeQuestionId,
          defaultSession.isVotingOpen,
          defaultSession.areResultsRevealed,
          defaultSession.theme,
          JSON.stringify(defaultSession.identityConfig),
          JSON.stringify(defaultSession.giftConfig)
        ]
      );

      for (const q of defaultQuestions) {
        await client.query(
          `INSERT INTO questions (id, session_id, title, description, type, options, min_rating, max_rating, rating_labels, order_index, allow_multiple, is_required)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
           ON CONFLICT (id) DO NOTHING`,
          [
            q.id,
            q.sessionId,
            q.title,
            q.description,
            q.type,
            JSON.stringify(q.options),
            q.minRating || null,
            q.maxRating || null,
            JSON.stringify(q.ratingLabels || null),
            q.orderIndex,
            q.allowMultiple || false,
            q.isRequired || false
          ]
        );
      }
    } else {
      // Existing session: ensure gift_config column is populated and clean legacy mock data
      try {
        if (!existingSession.rows[0].gift_config) {
          await client.query(`UPDATE sessions SET gift_config = $2 WHERE id = $1`, [defaultSessionId, JSON.stringify(defaultSession.giftConfig)]);
        }
        if (!existingSession.rows[0].identity_config) {
          await client.query(`UPDATE sessions SET identity_config = $2 WHERE id = $1`, [defaultSessionId, JSON.stringify(defaultSession.identityConfig)]);
        }
      } catch {}
    }

    client.release();

    dbStatus = {
      connected: true,
      type: 'neon-postgresql',
      urlConfigured: true,
      message: 'Connected to Neon PostgreSQL database.'
    };
    return dbStatus;
  } catch (err: any) {
    console.error('[Database] Neon PostgreSQL connection failed:', err.message);
    dbStatus = {
      connected: false,
      type: 'embedded-store',
      urlConfigured: true,
      message: `Neon connection error: ${err.message}. Using resilient embedded store fallback.`
    };
    return dbStatus;
  }
}

export function getDatabaseStatus(): DatabaseStatus {
  return dbStatus;
}

// Session queries
export async function getSession(id: string = defaultSessionId): Promise<SurveySession> {
  if (pool && dbStatus.connected && dbStatus.type === 'neon-postgresql') {
    try {
      const res = await pool.query('SELECT * FROM sessions WHERE id = $1', [id]);
      if (res.rows.length > 0) {
        const row = res.rows[0];
        let identityCfg = memorySession.identityConfig;
        if (row.identity_config) {
          identityCfg = typeof row.identity_config === 'string' ? JSON.parse(row.identity_config) : row.identity_config;
        }
        let giftCfg = memorySession.giftConfig;
        if (row.gift_config) {
          giftCfg = typeof row.gift_config === 'string' ? JSON.parse(row.gift_config) : row.gift_config;
        }
        return {
          id: row.id,
          code: row.code,
          projectorPasskey: row.projector_passkey || '8920',
          title: row.title,
          description: row.description,
          activeQuestionId: row.active_question_id,
          isVotingOpen: row.is_voting_open,
          areResultsRevealed: row.are_results_revealed,
          timerSecondsRemaining: row.timer_seconds_remaining,
          timerTotalSeconds: row.timer_total_seconds,
          theme: row.theme,
          showQRCodeOnProjector: row.show_qr_code,
          showResponsesCount: row.show_responses_count,
          autoScrollProjector: row.auto_scroll_projector ?? false,
          identityConfig: identityCfg,
          giftConfig: giftCfg,
          createdAt: row.created_at
        };
      }
    } catch (e) {
      console.error('Error fetching session from DB:', e);
    }
  }
  return memorySession;
}

export async function updateSession(updates: Partial<SurveySession>): Promise<SurveySession> {
  memorySession = { ...memorySession, ...updates };

  if (pool && dbStatus.connected && dbStatus.type === 'neon-postgresql') {
    try {
      const s = memorySession;
      await pool.query(
        `UPDATE sessions SET
          title = COALESCE($2, title),
          active_question_id = $3,
          is_voting_open = COALESCE($4, is_voting_open),
          are_results_revealed = COALESCE($5, are_results_revealed),
          timer_seconds_remaining = $6,
          timer_total_seconds = $7,
          theme = COALESCE($8, theme),
          show_qr_code = COALESCE($9, show_qr_code),
          show_responses_count = COALESCE($10, show_responses_count),
          projector_passkey = COALESCE($11, projector_passkey),
          auto_scroll_projector = COALESCE($12, auto_scroll_projector),
          identity_config = COALESCE($13, identity_config),
          gift_config = COALESCE($14, gift_config)
         WHERE id = $1`,
        [
          s.id,
          updates.title ?? null,
          updates.activeQuestionId !== undefined ? updates.activeQuestionId : s.activeQuestionId,
          updates.isVotingOpen !== undefined ? updates.isVotingOpen : s.isVotingOpen,
          updates.areResultsRevealed !== undefined ? updates.areResultsRevealed : s.areResultsRevealed,
          updates.timerSecondsRemaining !== undefined ? updates.timerSecondsRemaining : s.timerSecondsRemaining,
          updates.timerTotalSeconds !== undefined ? updates.timerTotalSeconds : s.timerTotalSeconds,
          updates.theme ?? null,
          updates.showQRCodeOnProjector !== undefined ? updates.showQRCodeOnProjector : s.showQRCodeOnProjector,
          updates.showResponsesCount !== undefined ? updates.showResponsesCount : s.showResponsesCount,
          updates.projectorPasskey ?? null,
          updates.autoScrollProjector !== undefined ? updates.autoScrollProjector : s.autoScrollProjector,
          updates.identityConfig ? JSON.stringify(updates.identityConfig) : null,
          (updates as any).giftConfig ? JSON.stringify((updates as any).giftConfig) : null
        ]
      );
    } catch (e) {
      console.error('Error updating session in DB:', e);
    }
  }
  return memorySession;
}

// Question queries
export async function getQuestions(sessionId: string = defaultSessionId): Promise<Question[]> {
  if (pool && dbStatus.connected && dbStatus.type === 'neon-postgresql') {
    try {
      const res = await pool.query(
        'SELECT * FROM questions WHERE session_id = $1 ORDER BY order_index ASC, created_at ASC',
        [sessionId]
      );
      if (res.rows.length > 0) {
        return res.rows.map((row) => ({
          id: row.id,
          sessionId: row.session_id,
          title: row.title,
          description: row.description,
          type: row.type,
          options: typeof row.options === 'string' ? JSON.parse(row.options) : row.options,
          minRating: row.min_rating,
          maxRating: row.max_rating,
          ratingLabels: typeof row.rating_labels === 'string' ? JSON.parse(row.rating_labels) : row.rating_labels,
          orderIndex: row.order_index,
          allowMultiple: row.allow_multiple,
          isRequired: row.is_required,
          createdAt: row.created_at
        }));
      }
    } catch (e) {
      console.error('Error getting questions from DB:', e);
    }
  }
  return memoryQuestions;
}

export async function addQuestion(q: Question): Promise<Question> {
  memoryQuestions.push(q);

  if (pool && dbStatus.connected && dbStatus.type === 'neon-postgresql') {
    try {
      await pool.query(
        `INSERT INTO questions (id, session_id, title, description, type, options, min_rating, max_rating, rating_labels, order_index, allow_multiple, is_required)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
        [
          q.id,
          q.sessionId,
          q.title,
          q.description,
          q.type,
          JSON.stringify(q.options),
          q.minRating || null,
          q.maxRating || null,
          JSON.stringify(q.ratingLabels || null),
          q.orderIndex,
          q.allowMultiple || false,
          q.isRequired || false
        ]
      );
    } catch (e) {
      console.error('Error inserting question to DB:', e);
    }
  }
  return q;
}

export async function updateQuestion(id: string, updates: Partial<Question>): Promise<Question | null> {
  const idx = memoryQuestions.findIndex((q) => q.id === id);
  if (idx === -1) return null;
  memoryQuestions[idx] = { ...memoryQuestions[idx], ...updates };
  const updated = memoryQuestions[idx];

  if (pool && dbStatus.connected && dbStatus.type === 'neon-postgresql') {
    try {
      await pool.query(
        `UPDATE questions SET
          title = COALESCE($2, title),
          description = COALESCE($3, description),
          type = COALESCE($4, type),
          options = COALESCE($5, options),
          min_rating = COALESCE($6, min_rating),
          max_rating = COALESCE($7, max_rating),
          order_index = COALESCE($8, order_index),
          allow_multiple = COALESCE($9, allow_multiple)
         WHERE id = $1`,
        [
          id,
          updates.title,
          updates.description,
          updates.type,
          updates.options ? JSON.stringify(updates.options) : null,
          updates.minRating,
          updates.maxRating,
          updates.orderIndex,
          updates.allowMultiple
        ]
      );
    } catch (e) {
      console.error('Error updating question in DB:', e);
    }
  }
  return updated;
}

export async function deleteQuestion(id: string): Promise<boolean> {
  memoryQuestions = memoryQuestions.filter((q) => q.id !== id);
  memoryResponses = memoryResponses.filter((r) => r.questionId !== id);

  if (pool && dbStatus.connected && dbStatus.type === 'neon-postgresql') {
    try {
      await pool.query('DELETE FROM responses WHERE question_id = $1', [id]);
      await pool.query('DELETE FROM questions WHERE id = $1', [id]);
    } catch (e) {
      console.error('Error deleting question from DB:', e);
    }
  }
  return true;
}

// Response queries
export async function submitResponse(response: SurveyResponse): Promise<SurveyResponse> {
  // Upsert or replace vote by same voterToken for same question - keep the original id so DB stays consistent
  const existingIdx = memoryResponses.findIndex(
    (r) => r.questionId === response.questionId && r.voterToken === response.voterToken
  );

  if (existingIdx >= 0) {
    // Preserve original id for stable DB primary key
    response = { ...response, id: memoryResponses[existingIdx].id };
    memoryResponses[existingIdx] = { ...memoryResponses[existingIdx], ...response };
  } else {
    memoryResponses.push(response);
  }

  if (pool && dbStatus.connected && dbStatus.type === 'neon-postgresql') {
    try {
      // Check if a row already exists for this voter + question (non-id based deduplication)
      const existingDb = await pool.query(
        'SELECT id FROM responses WHERE question_id = $1 AND voter_token = $2 LIMIT 1',
        [response.questionId, response.voterToken]
      );
      if (existingDb.rows.length > 0) {
        const existingId = existingDb.rows[0].id;
        // Keep id stable
        response.id = existingId;
        await pool.query(
          `UPDATE responses SET
            selected_option_ids = $2,
            rating_value = $3,
            text_value = $4,
            is_approved = $5,
            audience_name = $6,
            audience_email = $7,
            audience_phone = $8,
            audience_unique_id = $9
           WHERE id = $1`,
          [
            existingId,
            JSON.stringify(response.selectedOptionIds || []),
            response.ratingValue ?? null,
            response.textValue || null,
            response.isApproved ?? true,
            response.audienceName || null,
            response.audienceEmail || null,
            response.audiencePhone || null,
            response.audienceUniqueId || null
          ]
        );
        // Keep memory id in sync
        if (existingIdx >= 0) memoryResponses[existingIdx].id = existingId;
      } else {
        await pool.query(
          `INSERT INTO responses (id, question_id, session_id, voter_token, selected_option_ids, rating_value, text_value, is_approved, audience_name, audience_email, audience_phone, audience_unique_id)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
           ON CONFLICT (id) DO UPDATE SET
              selected_option_ids = EXCLUDED.selected_option_ids,
              rating_value = EXCLUDED.rating_value,
              text_value = EXCLUDED.text_value,
              is_approved = EXCLUDED.is_approved,
              audience_name = EXCLUDED.audience_name,
              audience_email = EXCLUDED.audience_email,
              audience_phone = EXCLUDED.audience_phone,
              audience_unique_id = EXCLUDED.audience_unique_id`,
          [
            response.id,
            response.questionId,
            response.sessionId,
            response.voterToken,
            JSON.stringify(response.selectedOptionIds || []),
            response.ratingValue ?? null,
            response.textValue || null,
            response.isApproved ?? true,
            response.audienceName || null,
            response.audienceEmail || null,
            response.audiencePhone || null,
            response.audienceUniqueId || null
          ]
        );
      }
    } catch (e) {
      console.error('Error recording response in DB:', e);
    }
  }
  return response;
}

export async function getResponses(questionId?: string): Promise<SurveyResponse[]> {
  if (pool && dbStatus.connected && dbStatus.type === 'neon-postgresql') {
    try {
      let query = 'SELECT * FROM responses';
      const params: any[] = [];
      if (questionId) {
        query += ' WHERE question_id = $1';
        params.push(questionId);
      }
      query += ' ORDER BY created_at ASC';
      const res = await pool.query(query, params);
      return res.rows.map((row) => ({
        id: row.id,
        questionId: row.question_id,
        sessionId: row.session_id,
        voterToken: row.voter_token,
        selectedOptionIds: typeof row.selected_option_ids === 'string' ? JSON.parse(row.selected_option_ids) : row.selected_option_ids,
        ratingValue: row.rating_value,
        textValue: row.text_value,
        isApproved: row.is_approved,
        audienceName: row.audience_name,
        audienceEmail: row.audience_email,
        audiencePhone: row.audience_phone,
        audienceUniqueId: row.audience_unique_id || undefined,
        createdAt: row.created_at
      }));
    } catch (e) {
      console.error('Error getting responses from DB:', e);
    }
  }

  if (questionId) {
    return memoryResponses.filter((r) => r.questionId === questionId);
  }
  return memoryResponses;
}

export async function clearResponses(questionId?: string): Promise<void> {
  if (questionId) {
    memoryResponses = memoryResponses.filter((r) => r.questionId !== questionId);
  } else {
    memoryResponses = [];
  }

  if (pool && dbStatus.connected && dbStatus.type === 'neon-postgresql') {
    try {
      if (questionId) {
        await pool.query('DELETE FROM responses WHERE question_id = $1', [questionId]);
      } else {
        await pool.query('DELETE FROM responses');
      }
    } catch (e) {
      console.error('Error clearing responses in DB:', e);
    }
  }
}

// ---------------------------------------------------------------------------
// Audience identity registry
// ---------------------------------------------------------------------------

// Characters exclude easily confused letters/numbers (I, O, 0, 1)
const UNIQUE_ID_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

function generateUniqueAudienceId(taken: Set<string>): string {
  for (let attempt = 0; attempt < 500; attempt++) {
    let code = '';
    for (let i = 0; i < 6; i++) {
      code += UNIQUE_ID_ALPHABET[Math.floor(Math.random() * UNIQUE_ID_ALPHABET.length)];
    }
    const candidate = `PHX-${code}`;
    if (!taken.has(candidate)) return candidate;
  }
  return `PHX-${Date.now().toString(36).toUpperCase()}`;
}

function cleanIdentityValue(value?: string): string | undefined {
  const cleaned = (value ?? '').toString().trim();
  return cleaned.length > 0 ? cleaned : undefined;
}

// Attach how many answers each attendee has submitted (used for tracking reports)
async function withResponseCounts(participants: AudienceParticipant[]): Promise<AudienceParticipant[]> {
  const responses = await getResponses();
  return participants.map((p) => ({
    ...p,
    responseCount: responses.filter((r) => r.voterToken === p.voterToken).length
  }));
}

export interface RegisterParticipantInput {
  voterToken: string;
  sessionId?: string;
  name?: string;
  email?: string;
  phone?: string;
}

/**
 * Registers (or updates) an attendee identity and issues a unique tracking ID.
 * The issued unique ID stays stable for the attendee for the whole survey so the
 * same person can be followed across every question and after the event.
 */
export async function registerParticipant(input: RegisterParticipantInput): Promise<AudienceParticipant> {
  const sessionId = input.sessionId || memorySession.id;
  const now = new Date().toISOString();
  const name = cleanIdentityValue(input.name);
  const email = cleanIdentityValue(input.email);
  const phone = cleanIdentityValue(input.phone);

  let existing: AudienceParticipant | undefined = memoryParticipants.find(
    (p) => p.voterToken === input.voterToken && p.sessionId === sessionId
  );

  if (pool && dbStatus.connected && dbStatus.type === 'neon-postgresql') {
    try {
      const res = await pool.query(
        'SELECT * FROM participants WHERE voter_token = $1 AND session_id = $2 LIMIT 1',
        [input.voterToken, sessionId]
      );
      if (res.rows.length > 0) {
        const row = res.rows[0];
        existing = {
          id: row.id,
          uniqueId: row.unique_id,
          voterToken: row.voter_token,
          sessionId: row.session_id || sessionId,
          name: row.name || undefined,
          email: row.email || undefined,
          phone: row.phone || undefined,
          createdAt: row.created_at,
          updatedAt: row.updated_at
        };
      }
    } catch (e) {
      console.error('Error fetching participant from DB:', e);
    }
  }

  // Build a set of all taken unique IDs (memory + DB) to avoid rare collisions
  const takenIds = new Set(memoryParticipants.map((p) => p.uniqueId));
  if (pool && dbStatus.connected && dbStatus.type === 'neon-postgresql') {
    try {
      const uniqueRes = await pool.query('SELECT unique_id FROM participants');
      for (const r of uniqueRes.rows) {
        if (r.unique_id) takenIds.add(r.unique_id);
      }
    } catch {
      // Ignore - fallback to memory set only
    }
  }

  const participant: AudienceParticipant = existing
    ? {
        ...existing,
        name: name ?? existing.name,
        email: email ?? existing.email,
        phone: phone ?? existing.phone,
        updatedAt: now
      }
    : {
        id: 'att-' + Math.random().toString(36).substring(2, 9),
        uniqueId: generateUniqueAudienceId(takenIds),
        voterToken: input.voterToken,
        sessionId,
        name,
        email,
        phone,
        createdAt: now,
        updatedAt: now
      };

  const idx = memoryParticipants.findIndex(
    (p) => p.voterToken === participant.voterToken && p.sessionId === participant.sessionId
  );
  if (idx >= 0) {
    memoryParticipants[idx] = participant;
  } else {
    memoryParticipants.push(participant);
  }

  if (pool && dbStatus.connected && dbStatus.type === 'neon-postgresql') {
    try {
      await pool.query(
        `INSERT INTO participants (id, unique_id, voter_token, session_id, name, email, phone, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
         ON CONFLICT (voter_token, session_id) DO UPDATE SET
           name = COALESCE(EXCLUDED.name, participants.name),
           email = COALESCE(EXCLUDED.email, participants.email),
           phone = COALESCE(EXCLUDED.phone, participants.phone),
           updated_at = EXCLUDED.updated_at`,
        [
          participant.id,
          participant.uniqueId,
          participant.voterToken,
          participant.sessionId,
          participant.name || null,
          participant.email || null,
          participant.phone || null,
          participant.createdAt,
          now
        ]
      );
    } catch (e) {
      console.error('Error saving participant to DB:', e);
    }
  }

  return participant;
}

export async function getParticipants(): Promise<AudienceParticipant[]> {
  if (pool && dbStatus.connected && dbStatus.type === 'neon-postgresql') {
    try {
      const res = await pool.query('SELECT * FROM participants ORDER BY created_at ASC');
      const rows: AudienceParticipant[] = res.rows.map((row) => ({
        id: row.id,
        uniqueId: row.unique_id,
        voterToken: row.voter_token,
        sessionId: row.session_id,
        name: row.name || undefined,
        email: row.email || undefined,
        phone: row.phone || undefined,
        createdAt: row.created_at,
        updatedAt: row.updated_at
      }));
      return withResponseCounts(rows);
    } catch (e) {
      console.error('Error getting participants from DB:', e);
    }
  }
  return withResponseCounts(memoryParticipants);
}

export async function getParticipantByVoterToken(
  voterToken: string,
  sessionId?: string
): Promise<AudienceParticipant | null> {
  const targetSession = sessionId || memorySession.id;
  const all = await getParticipants();
  return all.find((p) => p.voterToken === voterToken && p.sessionId === targetSession) || null;
}

export async function clearParticipants(): Promise<void> {
  memoryParticipants = [];

  if (pool && dbStatus.connected && dbStatus.type === 'neon-postgresql') {
    try {
      await pool.query('DELETE FROM participants');
    } catch (e) {
      console.error('Error clearing participants in DB:', e);
    }
  }
}

export async function updateResponseModeration(responseId: string, isApproved: boolean): Promise<boolean> {
  const resp = memoryResponses.find((r) => r.id === responseId);
  if (resp) {
    resp.isApproved = isApproved;
  }

  if (pool && dbStatus.connected && dbStatus.type === 'neon-postgresql') {
    try {
      await pool.query('UPDATE responses SET is_approved = $2 WHERE id = $1', [responseId, isApproved]);
    } catch (e) {
      console.error('Error updating moderation status in DB:', e);
    }
  }
  return true;
}

export async function updateResponseContent(responseId: string, textValue: string): Promise<boolean> {
  const resp = memoryResponses.find((r) => r.id === responseId);
  if (resp) {
    resp.textValue = textValue;
  }

  if (pool && dbStatus.connected && dbStatus.type === 'neon-postgresql') {
    try {
      await pool.query('UPDATE responses SET text_value = $2 WHERE id = $1', [responseId, textValue]);
    } catch (e) {
      console.error('Error updating response text in DB:', e);
    }
  }
  return true;
}

export interface NewSurveyConfig {
  title: string;
  description?: string;
  questionTitle: string;
  questionType: 'multiple_choice' | 'rating' | 'open_text' | 'nps';
  options?: Array<{ id: string; text: string }>;
  allowMultiple?: boolean;
  identityConfig?: {
    enabled: boolean;
    captureName: boolean;
    captureEmail: boolean;
    capturePhone: boolean;
    required: boolean;
  };
  giftConfig?: GiftConfig;
}

/**
 * Ensures only one survey is active at a time.
 * Generates a brand new Session Code and Projection Passkey every time a survey is setup.
 */
export async function setupNewSurvey(config: NewSurveyConfig): Promise<{ session: SurveySession; question: Question }> {
  // Generate random 3-digit suffix for session code e.g. SWS-472
  const randomCodeSuffix = Math.floor(100 + Math.random() * 900);
  const newSessionCode = `SWS-${randomCodeSuffix}`;
  
  // Generate a brand new 4-digit numeric projector passkey e.g. 7419
  const newPasskey = Math.floor(1000 + Math.random() * 9000).toString();

  const newQuestionId = 'q-' + Math.random().toString(36).substring(2, 9);
  const now = new Date().toISOString();

  const newQuestion: Question = {
    id: newQuestionId,
    sessionId: defaultSessionId,
    title: config.questionTitle.trim(),
    description: config.description?.trim() || '',
    type: config.questionType,
    options: config.questionType === 'multiple_choice' && config.options ? config.options : [],
    minRating: config.questionType === 'rating' ? 1 : config.questionType === 'nps' ? 0 : undefined,
    maxRating: config.questionType === 'rating' ? 5 : config.questionType === 'nps' ? 10 : undefined,
    ratingLabels: config.questionType === 'rating' 
      ? { min: 'Needs Improvement', max: 'Outstanding' }
      : config.questionType === 'nps' 
      ? { min: 'Not Likely', max: 'Extremely Likely' }
      : undefined,
    orderIndex: 0,
    allowMultiple: Boolean(config.allowMultiple),
    isRequired: true,
    createdAt: now
  };

  // Reset in-memory questions to only this new single active survey question
  memoryQuestions = [newQuestion];
  // Clear prior responses and gift lottery state for a completely fresh survey
  memoryResponses = [];
  memoryGiftWinnings = [];
  // Fresh survey => fresh identity registry so brand new unique IDs are issued
  memoryParticipants = [];

  const identityCfg = config.identityConfig || memorySession.identityConfig || {
    enabled: false,
    captureName: true,
    captureEmail: true,
    capturePhone: false,
    required: false
  };

  const giftCfg: GiftConfig = config.giftConfig || memorySession.giftConfig || defaultSession.giftConfig!;

  memorySession = {
    ...memorySession,
    code: newSessionCode,
    projectorPasskey: newPasskey,
    title: config.title.trim() || 'Phoenix SWS Live Interactive Survey',
    description: config.description?.trim() || '',
    activeQuestionId: newQuestionId,
    isVotingOpen: true,
    areResultsRevealed: true,
    timerSecondsRemaining: null,
    timerTotalSeconds: null,
    autoScrollProjector: false,
    identityConfig: identityCfg,
    giftConfig: giftCfg,
    createdAt: now
  };

  if (pool && dbStatus.connected && dbStatus.type === 'neon-postgresql') {
    try {
      // Clear old responses and old questions in PostgreSQL
      await pool.query('DELETE FROM responses WHERE session_id = $1', [defaultSessionId]);
      await pool.query('DELETE FROM questions WHERE session_id = $1', [defaultSessionId]);
      // Reset the identity registry so the new survey issues fresh unique IDs
      await pool.query('DELETE FROM participants WHERE session_id = $1', [defaultSessionId]);
      // Reset gift lottery winnings for the new survey
      await pool.query('DELETE FROM gift_winnings WHERE session_id = $1', [defaultSessionId]);

      // Insert the new single active survey question
      await pool.query(
        `INSERT INTO questions (id, session_id, title, description, type, options, min_rating, max_rating, rating_labels, order_index, allow_multiple, is_required)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
        [
          newQuestion.id,
          defaultSessionId,
          newQuestion.title,
          newQuestion.description,
          newQuestion.type,
          JSON.stringify(newQuestion.options),
          newQuestion.minRating || null,
          newQuestion.maxRating || null,
          JSON.stringify(newQuestion.ratingLabels || null),
          0,
          newQuestion.allowMultiple,
          newQuestion.isRequired
        ]
      );

      // Update session with new code and passkey plus lottery configs
      await pool.query(
        `UPDATE sessions SET
          code = $2,
          projector_passkey = $3,
          title = $4,
          description = $5,
          active_question_id = $6,
          is_voting_open = true,
          are_results_revealed = true,
          timer_seconds_remaining = NULL,
          timer_total_seconds = NULL,
          auto_scroll_projector = false,
          identity_config = $7,
          gift_config = $8
         WHERE id = $1`,
        [
          defaultSessionId,
          newSessionCode,
          newPasskey,
          memorySession.title,
          memorySession.description,
          newQuestionId,
          JSON.stringify(identityCfg),
          JSON.stringify(giftCfg)
        ]
      );
    } catch (e) {
      console.error('Error syncing new survey to Neon PostgreSQL:', e);
    }
  }

  return { session: memorySession, question: newQuestion };
}

// ---------------------------------------------------------------------------
// Gift lottery (random gifts capped by quantity + winRatio, claim via coordinator)
// ---------------------------------------------------------------------------

export async function getGiftWinnings(sessionId: string = defaultSessionId): Promise<GiftWinning[]> {
  if (pool && dbStatus.connected && dbStatus.type === 'neon-postgresql') {
    try {
      const res = await pool.query('SELECT * FROM gift_winnings WHERE session_id = $1 ORDER BY created_at ASC', [sessionId]);
      return res.rows.map((r) => ({
        id: r.id,
        giftId: r.gift_id,
        giftName: r.gift_name,
        giftEmoji: r.gift_emoji,
        sessionId: r.session_id,
        voterToken: r.voter_token,
        participantUniqueId: r.participant_unique_id || undefined,
        participantName: r.participant_name || undefined,
        participantEmail: r.participant_email || undefined,
        claimed: r.claimed,
        claimedAt: r.claimed_at,
        claimedBy: r.claimed_by || null,
        createdAt: r.created_at
      }));
    } catch (e) {
      console.error('Error getting gift winnings from DB:', e);
    }
  }
  return [...memoryGiftWinnings].filter((w) => w.sessionId === sessionId).sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
}

export async function getGiftWinningForVoter(voterToken: string, sessionId: string = defaultSessionId): Promise<GiftWinning | null> {
  const all = await getGiftWinnings(sessionId);
  return all.find((w) => w.voterToken === voterToken) || null;
}

export async function clearGiftWinnings(sessionId?: string): Promise<void> {
  const target = sessionId || defaultSessionId;
  memoryGiftWinnings = memoryGiftWinnings.filter((w) => w.sessionId !== target);
  if (pool && dbStatus.connected && dbStatus.type === 'neon-postgresql') {
    try {
      if (sessionId) await pool.query('DELETE FROM gift_winnings WHERE session_id = $1', [target]);
      else await pool.query('DELETE FROM gift_winnings');
    } catch (e) {
      console.error('Error clearing gift winnings:', e);
    }
  }
}

/**
 * Randomly assigns a gift to a voter after they successfully submit feedback.
 * Respects per-gift quantity caps and the global winRatio (cap ratio).
 * Each voter can win at most one gift per survey session.
 */
export async function assignRandomGift(
  voterToken: string,
  sessionId: string = defaultSessionId
): Promise<GiftWinning | null> {
  const session = await getSession(sessionId);
  const giftCfg = session.giftConfig;
  if (!giftCfg?.enabled || !giftCfg.gifts || giftCfg.gifts.length === 0) return null;

  // One gift per voter per session only
  const existing = await getGiftWinningForVoter(voterToken, sessionId);
  if (existing) return existing;

  const winnings = await getGiftWinnings(sessionId);
  const assignedCounts: Record<string, number> = {};
  for (const w of winnings) assignedCounts[w.giftId] = (assignedCounts[w.giftId] || 0) + 1;

  // Eligible gifts still have stock
  const eligible = giftCfg.gifts.filter((g) => (assignedCounts[g.id] || 0) < g.quantity);
  if (eligible.length === 0) return null;

  // Global cap ratio check — e.g., winRatio 35 means 35% of respondents win
  const winRatio = typeof giftCfg.winRatio === 'number' ? giftCfg.winRatio : 35;
  if (winRatio < 100 && Math.random() * 100 >= winRatio) return null;

  // Weighted random among eligible gifts (weight = remaining stock) so rarer gifts with low quantity are harder to hit
  let poolGifts: Gift[] = [];
  for (const g of eligible) {
    const remaining = g.quantity - (assignedCounts[g.id] || 0);
    for (let i = 0; i < remaining; i++) poolGifts.push(g);
  }
  if (poolGifts.length === 0) return null;
  const chosen = poolGifts[Math.floor(Math.random() * poolGifts.length)];

  // Need participant snapshot for winner display
  const participant = await getParticipantByVoterToken(voterToken, sessionId);

  const winning: GiftWinning = {
    id: 'win-' + Math.random().toString(36).substring(2, 9),
    giftId: chosen.id,
    giftName: chosen.name,
    giftEmoji: chosen.emoji,
    sessionId,
    voterToken,
    participantUniqueId: participant?.uniqueId,
    participantName: participant?.name,
    participantEmail: participant?.email,
    claimed: false,
    claimedAt: null,
    claimedBy: null,
    createdAt: new Date().toISOString()
  };

  memoryGiftWinnings.push(winning);

  if (pool && dbStatus.connected && dbStatus.type === 'neon-postgresql') {
    try {
      await pool.query(
        `INSERT INTO gift_winnings (id, gift_id, gift_name, gift_emoji, session_id, voter_token, participant_unique_id, participant_name, participant_email, claimed, created_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) ON CONFLICT (id) DO NOTHING`,
        [
          winning.id,
          winning.giftId,
          winning.giftName,
          winning.giftEmoji,
          winning.sessionId,
          winning.voterToken,
          winning.participantUniqueId || null,
          winning.participantName || null,
          winning.participantEmail || null,
          false,
          winning.createdAt
        ]
      );
    } catch (e) {
      console.error('Error saving gift winning:', e);
    }
  }

  return winning;
}

export async function claimGiftWinning(winningId: string, claimedBy: 'attendee' | 'coordinator' | 'admin' = 'attendee'): Promise<GiftWinning | null> {
  // Update memory
  const idx = memoryGiftWinnings.findIndex((w) => w.id === winningId);
  if (idx >= 0) {
    memoryGiftWinnings[idx] = { ...memoryGiftWinnings[idx], claimed: true, claimedAt: new Date().toISOString(), claimedBy };
  }

  if (pool && dbStatus.connected && dbStatus.type === 'neon-postgresql') {
    try {
      const res = await pool.query(`UPDATE gift_winnings SET claimed = true, claimed_at = NOW(), claimed_by = $2 WHERE id = $1 RETURNING *`, [winningId, claimedBy]);
      if (res.rows.length > 0) {
        const r = res.rows[0];
        const updated: GiftWinning = {
          id: r.id,
          giftId: r.gift_id,
          giftName: r.gift_name,
          giftEmoji: r.gift_emoji,
          sessionId: r.session_id,
          voterToken: r.voter_token,
          participantUniqueId: r.participant_unique_id || undefined,
          participantName: r.participant_name || undefined,
          participantEmail: r.participant_email || undefined,
          claimed: r.claimed,
          claimedAt: r.claimed_at,
          claimedBy: r.claimed_by || claimedBy,
          createdAt: r.created_at
        };
        if (idx >= 0) memoryGiftWinnings[idx] = updated;
        return updated;
      }
    } catch (e) {
      console.error('Error claiming gift:', e);
    }
  }
  return idx >= 0 ? memoryGiftWinnings[idx] : null;
}

