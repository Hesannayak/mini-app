export type VoiceIntent =
  | 'send_money'
  | 'check_balance'
  | 'request_money'
  | 'pay_bill'
  | 'spending_summary'
  | 'transaction_history'
  | 'set_budget'
  | 'coach_query';

export interface VoiceCommand {
  transcript: string;
  intent: VoiceIntent;
  confidence: number;
  entities: Record<string, string | number>;
  language: string;
}

export interface VoiceSession {
  id: string;
  user_id: string;
  intent: VoiceIntent;
  confidence: number;
  transcript?: string; // Deleted after 30 days
  response_text: string;
  latency_ms: number;
  created_at: string;
}

export const CONFIDENCE_THRESHOLDS = {
  AUTO_EXECUTE: 0.9,
  CONFIRM: 0.7,
  PAYMENT_MIN: 0.8,
  RETRY: 0.7,
} as const;
