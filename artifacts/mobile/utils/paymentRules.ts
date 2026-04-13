export type PayeeType = 'known' | 'unknown' | 'vendor';

export interface PaymentCheck {
  requiresPin: boolean;
  reason?: string;
}

const KNOWN_ALIASES = [
  'maa', 'mummy', 'mom', 'mother', 'amma',
  'papa', 'daddy', 'dad', 'father', 'nanna',
  'bhai', 'bhaiya', 'brother', 'anna',
  'didi', 'behen', 'sister', 'akka',
  'chacha', 'uncle', 'mama', 'tau',
  'chachi', 'aunty', 'mami', 'bua',
  'dada', 'dadi', 'nana', 'nani',
  'wife', 'husband', 'biwi', 'pati',
];

export function isKnownContact(name: string): boolean {
  return KNOWN_ALIASES.includes(name.toLowerCase().trim());
}

export function checkPaymentAuth(
  amount: number,
  payeeName: string,
  isUserVoice: boolean = true,
): PaymentCheck {
  if (!isUserVoice) {
    return { requiresPin: true, reason: 'Voice not recognized — PIN required' };
  }

  const isKnown = isKnownContact(payeeName);

  if (isKnown && amount < 1000) return { requiresPin: false };
  if (!isKnown && amount < 500) return { requiresPin: false };

  if (amount >= 1000) {
    return { requiresPin: true, reason: `₹${amount.toLocaleString('en-IN')} ke liye PIN daalo` };
  }

  return { requiresPin: true, reason: 'PIN required for this payment' };
}
