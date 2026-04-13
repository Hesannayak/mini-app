export type ScoreBucket = 'seedling' | 'growing' | 'good' | 'star' | 'champion';

export interface MiniScoreComponents {
  bill_discipline: number;    // 30% weight
  spending_control: number;   // 25% weight
  savings_rate: number;       // 25% weight
  income_stability: number;   // 20% weight
}

export interface MiniScore {
  score: number; // 0-100
  bucket: ScoreBucket;
  components: MiniScoreComponents;
  explanation?: string; // In user's language
  computed_at: string;
}

export interface MiniScoreHistory {
  id: string;
  user_id: string;
  score: number;
  components: MiniScoreComponents;
  week_start: string;
  created_at: string;
}

export function getScoreBucket(score: number): ScoreBucket {
  if (score <= 40) return 'seedling';
  if (score <= 60) return 'growing';
  if (score <= 75) return 'good';
  if (score <= 90) return 'star';
  return 'champion';
}

export function getScoreEmoji(bucket: ScoreBucket): string {
  const emojis: Record<ScoreBucket, string> = {
    seedling: '🌱',
    growing: '📈',
    good: '✅',
    star: '🌟',
    champion: '🏆',
  };
  return emojis[bucket];
}
