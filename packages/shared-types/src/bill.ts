export type BillStatus = 'pending' | 'paid' | 'overdue';

export type BillType =
  | 'electricity'
  | 'water'
  | 'gas'
  | 'internet'
  | 'mobile'
  | 'dth'
  | 'insurance'
  | 'other';

export interface Bill {
  id: string;
  user_id: string;
  biller_id: string; // BBPS biller ID
  biller_name: string;
  bill_type: BillType;
  amount?: number;
  due_date?: string;
  status: BillStatus;
  is_recurring: boolean;
  last_paid_at?: string;
  created_at: string;
  updated_at: string;
}

export interface BillReminder {
  bill_id: string;
  remind_days_before: number[]; // [7, 3, 1]
  is_enabled: boolean;
}
