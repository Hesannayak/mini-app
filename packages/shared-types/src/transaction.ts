export type TransactionCategory =
  | 'food'
  | 'transport'
  | 'groceries'
  | 'bills'
  | 'emi'
  | 'entertainment'
  | 'shopping'
  | 'health'
  | 'education'
  | 'family'
  | 'other';

export type TransactionType = 'debit' | 'credit';

export type TransactionSource = 'upi' | 'sms' | 'account_aggregator';

export interface Transaction {
  id: string;
  user_id: string;
  amount: number;
  type: TransactionType;
  category: TransactionCategory;
  merchant?: string;
  description?: string;
  source: TransactionSource;
  upi_ref_id?: string;
  timestamp: string;
  created_at: string;
}

export interface TransactionSummary {
  total_spent: number;
  total_received: number;
  by_category: Record<TransactionCategory, number>;
  count: number;
  period: string;
}
