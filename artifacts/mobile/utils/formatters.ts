export function formatIndianCurrency(amount: number): string {
  const isNegative = amount < 0;
  const absAmount = Math.abs(amount);
  const parts = absAmount.toFixed(0).split('.');
  const intPart = parts[0];

  let formatted: string;
  if (intPart.length <= 3) {
    formatted = intPart;
  } else {
    const last3 = intPart.slice(-3);
    const rest = intPart.slice(0, -3);
    const groups = rest.replace(/\B(?=(\d{2})+(?!\d))/g, ',');
    formatted = `${groups},${last3}`;
  }

  return isNegative ? `-₹${formatted}` : `₹${formatted}`;
}

export function formatIndianDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  const months = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
  ];
  return `${d.getDate()} ${months[d.getMonth()]}`;
}

export function formatRelativeTime(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return formatIndianDate(d);
}

export function maskPhone(phone: string): string {
  if (phone.length < 10) return phone;
  return phone.slice(0, 5) + 'XXXXX';
}
