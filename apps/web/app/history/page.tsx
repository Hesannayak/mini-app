'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import BottomNav from '@/components/BottomNav';
import API from '@/lib/api';
import { isLoggedIn } from '@/lib/store';

type Period = 'today' | 'week' | 'month';

const C = { bg: '#080812', card: '#0F0F1E', border: '#1E2040', accent: '#6366F1', green: '#10B981', text: '#EEF2FF', muted: '#8B8BAD', dim: '#5A5A7A' };

const catColors: Record<string, string> = {
  food: '#FF6B6B', transport: '#4ECDC4', groceries: '#45B7D1', bills: '#96CEB4',
  emi: '#FFEAA7', entertainment: '#DDA0DD', shopping: '#FF8A65', health: '#81C784',
  education: '#64B5F6', family: '#FFB74D', other: '#90A4AE',
};

function timeAgo(ts: string): string {
  const diff = Date.now() - new Date(ts).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(ts).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

export default function HistoryPage() {
  const router = useRouter();
  const [period, setPeriod] = useState<Period>('month');
  const [summary, setSummary] = useState<any>(null);
  const [transactions, setTransactions] = useState<any[]>([]);

  useEffect(() => { if (!isLoggedIn()) router.replace('/login'); }, [router]);

  useEffect(() => {
    fetch(`${API.intelligence}/transactions/summary?period=${period}`).then(r => r.json()).then(d => setSummary(d.data)).catch(() => {});
    fetch(`${API.intelligence}/transactions?limit=50`).then(r => r.json()).then(d => setTransactions(d.data || [])).catch(() => {});
  }, [period]);

  const total = summary?.total_spent ?? 0;
  const cats = summary?.by_category ?? {};
  const sorted = Object.entries(cats).sort(([,a]: any, [,b]: any) => b - a).filter(([,v]: any) => v > 0);

  return (
    <div style={{ height: '100vh', height: '100dvh', display: 'flex', flexDirection: 'column', backgroundColor: C.bg }}>
      <div style={{ flex: 1, overflowY: 'auto', padding: '60px 20px 20px' }}>

        <h1 style={{ color: C.text, fontSize: 24, fontWeight: 700, marginBottom: 20 }}>History</h1>

        {/* Period selector */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
          {(['today', 'week', 'month'] as Period[]).map(p => (
            <button key={p} onClick={() => setPeriod(p)}
              style={{ padding: '8px 16px', borderRadius: 20, fontSize: 14, fontWeight: 500, border: 'none', cursor: 'pointer', backgroundColor: period === p ? C.accent : C.card, color: period === p ? '#FFF' : C.muted, transition: 'all 0.2s' }}>
              {p === 'today' ? 'Today' : p === 'week' ? 'This Week' : 'This Month'}
            </button>
          ))}
        </div>

        {/* Summary card */}
        <div style={{ backgroundColor: C.card, borderRadius: 20, padding: 24, marginBottom: 24, textAlign: 'center', border: `1px solid ${C.border}` }}>
          <p style={{ color: C.muted, fontSize: 14, marginBottom: 4 }}>Total Spent</p>
          <p style={{ color: C.text, fontSize: 36, fontWeight: 800, letterSpacing: -1 }}>₹{total.toLocaleString('en-IN')}</p>
        </div>

        {/* Category breakdown */}
        {sorted.length > 0 && (
          <>
            <h2 style={{ color: C.text, fontSize: 16, fontWeight: 600, marginBottom: 12 }}>By Category</h2>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 24 }}>
              {sorted.map(([cat, amt]: any) => (
                <div key={cat} style={{ display: 'flex', alignItems: 'center', gap: 6, backgroundColor: C.card, borderRadius: 12, padding: '8px 12px', border: `1px solid ${C.border}` }}>
                  <div style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: catColors[cat] || '#666' }} />
                  <span style={{ color: C.muted, fontSize: 13, textTransform: 'capitalize' }}>{cat}</span>
                  <span style={{ color: C.text, fontSize: 13, fontWeight: 600 }}>₹{amt.toLocaleString('en-IN')}</span>
                </div>
              ))}
            </div>
          </>
        )}

        {/* Transaction list */}
        <h2 style={{ color: C.text, fontSize: 16, fontWeight: 600, marginBottom: 12 }}>Transactions</h2>
        {transactions.length === 0 ? (
          <p style={{ color: C.dim, textAlign: 'center', padding: '32px 0' }}>No transactions yet</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, paddingBottom: 16 }}>
            {transactions.map((txn: any) => (
              <div key={txn.id} style={{ display: 'flex', alignItems: 'center', backgroundColor: C.card, borderRadius: 14, padding: '14px 16px', border: `1px solid ${C.border}` }}>
                <div style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: catColors[txn.category] || '#666', marginRight: 12, flexShrink: 0 }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ color: C.text, fontSize: 15, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {txn.merchant || txn.description || txn.category}
                  </p>
                  <p style={{ color: C.dim, fontSize: 12, marginTop: 2 }}>
                    {txn.timestamp ? timeAgo(txn.timestamp) : ''} {txn.upi_ref_id ? `· ${txn.upi_ref_id}` : ''}
                  </p>
                </div>
                <span style={{ color: txn.type === 'credit' ? C.green : C.text, fontSize: 16, fontWeight: 600, marginLeft: 12 }}>
                  {txn.type === 'credit' ? '+' : '-'}₹{txn.amount?.toLocaleString('en-IN')}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      <BottomNav />
    </div>
  );
}
