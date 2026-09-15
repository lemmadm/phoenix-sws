export type QuestionType = 'multiple_choice' | 'rating' | 'open_text' | 'nps';

export interface QuestionOption {
  id: string;
  text: string;
  color?: string;
}

export interface Question {
  id: string;
  sessionId: string;
  title: string;
  description?: string;
  type: QuestionType;
  options: QuestionOption[];
  minRating?: number;
  maxRating?: number;
  ratingLabels?: { min: string; max: string };
  orderIndex: number;
  allowMultiple?: boolean;
  isRequired?: boolean;
  createdAt: string;
}

export interface AudienceIdentityConfig {
  enabled: boolean;
  captureName: boolean;
  captureEmail: boolean;
  capturePhone: boolean;
  required: boolean; // When true attendees must register their details before voting
}

// Registered attendee identity. Each record receives a unique tracking ID that is
// attached to every response so answers can be followed up later.
export interface AudienceParticipant {
  id: string; // Internal record id
  uniqueId: string; // Issued unique tracking ID, e.g. "PHX-4F9K2T"
  voterToken: string; // Device token that binds this identity to one attendee
  sessionId: string;
  name?: string;
  email?: string;
  phone?: string;
  createdAt: string;
  updatedAt: string;
  responseCount?: number; // Derived: how many answers this attendee has submitted
}

export interface SurveyResponse {
  id: string;
  questionId: string;
  sessionId: string;
  voterToken: string; // Unique voter ID for tracking
  selectedOptionIds?: string[];
  ratingValue?: number;
  textValue?: string;
  isApproved?: boolean; // For open text moderation
  // Optional audience identity captured
  audienceName?: string;
  audienceEmail?: string;
  audiencePhone?: string;
  audienceUniqueId?: string; // Unique issued attendee ID for later tracking
  createdAt: string;
}

export interface ReactionPulse {
  id: string;
  emoji: string;
  timestamp: number;
  xPosition?: number;
}

export interface Gift {
  id: string;
  name: string;
  description?: string;
  emoji: string; // e.g., "🎁", "☕", "👕"
  quantity: number; // hard cap - total units available for this survey
  color?: string;
}

export interface GiftConfig {
  enabled: boolean;
  winRatio: number; // 0-100, percentage of respondents who will receive a gift (cap ratio)
  gifts: Gift[];
  claimInstructions?: string;
}

export interface GiftWinning {
  id: string;
  giftId: string;
  giftName: string;
  giftEmoji: string;
  sessionId: string;
  voterToken: string;
  participantUniqueId?: string;
  participantName?: string;
  participantEmail?: string;
  claimed: boolean;
  claimedAt?: string | null;
  claimedBy?: 'attendee' | 'coordinator' | 'admin' | null;
  createdAt: string;
}

export interface SurveySession {
  id: string;
  code: string; // e.g., "LIVE-892"
  projectorPasskey?: string; // Set by Moderator for Projector access
  title: string;
  description?: string;
  activeQuestionId: string | null;
  isVotingOpen: boolean;
  areResultsRevealed: boolean;
  timerSecondsRemaining: number | null;
  timerTotalSeconds: number | null;
  theme: 'stage-dark' | 'bright-conference' | 'neon-indigo' | 'clean-minimal';
  showQRCodeOnProjector: boolean;
  showResponsesCount: boolean;
  autoScrollProjector?: boolean;
  // Audience identity capture settings
  identityConfig?: AudienceIdentityConfig;
  giftConfig?: GiftConfig;
  createdAt: string;
}

export interface AggregatedResult {
  questionId: string;
  totalResponses: number;
  optionCounts: Record<string, number>;
  averageRating?: number;
  ratingDistribution?: Record<number, number>;
  npsScore?: { promoters: number; passives: number; detractors: number; score: number };
  openResponses: Array<{
    id: string;
    text: string;
    isApproved: boolean;
    createdAt: string;
    attendeeUniqueId?: string;
    attendeeName?: string;
    attendeeEmail?: string;
    attendeePhone?: string;
  }>;
}

export type ViewRole = 'audience' | 'projector' | 'admin';

export interface DatabaseStatus {
  connected: boolean;
  type: 'neon-postgresql' | 'embedded-store';
  urlConfigured: boolean;
  message: string;
}
