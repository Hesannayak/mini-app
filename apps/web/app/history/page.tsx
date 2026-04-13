'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import BottomNav from '@/components/BottomNav';
import API from '@/lib/api';
import { isLoggedIn } from '@/lib/store';

type Period = 'today' | 'week' | 'month';

const C = { bg: '#080812', card: '#0F0F1E', input: '#14142A', border: '#1E2040', accent: '#6366F1', green: '#10B981', text: '#EEF2FF', muted: '#8B8BAD', dim: '#5A5A7A' };

const catColors: Record<string, string> = {
  food: '#FF6B6B', transport: '#4ECDC4', groceries: '#45B7D1', bills: '#96CEB4',
  emi: '#FFEAA7', entertainment: '#DDA0DD', shopping: '#FF8A65', health: '#81C784',
  education: '#64B5F6', family: '#FFB74D', other: '#90A4AE',
};

export default function HistoryPage() {
  const router = useRouter();
  const [period, setPeriod] = useState<Period>('today');
  const [data, setData] = useState<any>(null);

  useEffect(() => { if (!isLoggedIn()) router.replace('/login'); }, [router]);
  useEffect(() => {
    fetch(`${API.intelligence}/transactions/summary?period=${period}`).then(r => r.json()).then(d => setData(d.data)).catch(() => {});
  }, [period]);

  const total = data?.total_spent ?? 0;
  const cats = data?.by_category ?? {};
  const sorted = Object.entries(cats).sort(([,a]: any, [,b]: any) => b - a).filter(([,v]: any) => v > 0);

  return (
    <div style={{ height: '100vh', height: '100dvh', display: 'flex', flexDirection: 'column', backgroundColor: C.bg }}>
      <div style={{ flex: 1, overflowY: 'auto', padding: '60px 20px 20px' }}>

        <h1 style={{ color: C.text, fontSize: 24, fontWeight: 700, marginBottom: 20, letterSpacing: -0.5 }}>Spending</h1>

        {/* Period selector */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
          {(['today', 'week', 'month'] as Period[]).map(p => (
            <button key={p} onClick={() => setPeriod(p)}
              style={{
                padding: '8px 16px', borderRadius: 20, fontSize: 14, fontWeight: 500, border: 'none', cursor: 'pointer',
                backgroundColor: period === p ? C.accent : C.card,
                color: period === p ? '#FFF' : C.muted,
                transition: 'all 0.2s',
              }}>
              {p === 'today' ? 'Today' : p === 'week' ? 'This Week' : 'This Month'}
            </button>
          ))}
        </div>

        {/* Total card */}
        <div style={{ backgroundColor: C.card, borderRadius: 20, padding: 24, marginBottom: 24, textAlign: 'center', border: `1px solid ${C.border}` }}>
          <p style={{ color: C.muted, fontSize: 14, marginBottom: 4 }}>Total Spent</p>
          <p style={{ color: C.text, fontSize: 36, fontWeight: 800, letterSpacing: -1 }}>₹{total.toLocaleString('en-IN')}</p>
        </div>

        {/* Categories */}
        <h2 style={{ color: C.text, fontSize: 18, fontWeight: 600, marginBottom: 16 }}>By Category</h2>
        {sorted.length === 0 ? (
          <p style={{ color: C.dim, textAlign: 'center', padding: '32px 0' }}>No spending data yet</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, paddingBottom: 16 }}>
            {sorted.map(([cat, amt]: any) => (
              <div key={cat} style={{ display: 'flex', alignItems: 'center', backgroundColor: C.card, borderRadius: 14, padding: '14px 16px', border: `1px solid ${C.border}` }}>
                <div style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: catColors[cat] || '#666', marginRight: 12, flexShrink: 0 }} />
                <span style={{ color: C.text, flex: 1, textTransform: 'capitalize', fontSize: 15 }}>{cat}</span>
                <span style={{ color: C.text, fontWeight: 600, fontSize: 15 }}>₹{amt.toLocaleString('en-IN')}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <BottomNav />
    </div>
  );
}
