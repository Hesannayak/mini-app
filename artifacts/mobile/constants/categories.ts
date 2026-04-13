export type TransactionCategory =
  | 'food' | 'transport' | 'groceries' | 'bills'
  | 'emi' | 'entertainment' | 'shopping' | 'health'
  | 'education' | 'family' | 'other';

export const CATEGORY_ICONS: Record<TransactionCategory, string> = {
  food: 'coffee',
  transport: 'navigation',
  groceries: 'shopping-cart',
  bills: 'zap',
  emi: 'credit-card',
  entertainment: 'film',
  shopping: 'shopping-bag',
  health: 'heart',
  education: 'book-open',
  family: 'users',
  other: 'more-horizontal',
};

export const CATEGORY_COLORS: Record<TransactionCategory, string> = {
  food: '#F97316',
  transport: '#22D3EE',
  groceries: '#4ADE80',
  bills: '#A78BFA',
  emi: '#FBBF24',
  entertainment: '#F472B6',
  shopping: '#FB923C',
  health: '#34D399',
  education: '#60A5FA',
  family: '#C084FC',
  other: '#94A3B8',
};

export const CATEGORY_LABELS: Record<TransactionCategory, string> = {
  food: 'Food',
  transport: 'Transport',
  groceries: 'Groceries',
  bills: 'Bills',
  emi: 'EMI',
  entertainment: 'Entertainment',
  shopping: 'Shopping',
  health: 'Health',
  education: 'Education',
  family: 'Family',
  other: 'Other',
};

export const ALL_CATEGORIES: TransactionCategory[] = [
  'food', 'transport', 'groceries', 'bills', 'emi',
  'entertainment', 'shopping', 'health', 'education', 'family', 'other',
];
