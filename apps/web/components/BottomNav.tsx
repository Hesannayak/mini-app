'use client';
import { usePathname, useRouter } from 'next/navigation';

const C = { bg: '#080812', border: '#0F0F1E', text: '#EEF2FF', dim: '#5A5A7A', accent: '#6366F1', green: '#10B981' };

export default function BottomNav() {
  const pathname = usePathname();
  const router = useRouter();

  return (
    <nav style={{ display: 'flex', alignItems: 'flex-end', backgroundColor: C.bg, borderTop: `1px solid ${C.border}`, paddingBottom: 'env(safe-area-inset-bottom, 10px)', paddingTop: 10 }}>

      {/* Chat tab */}
      <button onClick={() => router.push('/chat')} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '4px 0', background: 'none', border: 'none', cursor: 'pointer' }}>
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={pathname === '/chat' ? C.text : C.dim} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/>
        </svg>
        <span style={{ fontSize: 11, marginTop: 4, fontWeight: 500, color: pathname === '/chat' ? C.text : C.dim }}>Chat</span>
      </button>

      {/* Scan tab — elevated green */}
      <button onClick={() => router.push('/scan')} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', marginTop: -24, background: 'none', border: 'none', cursor: 'pointer' }}>
        <div style={{ width: 56, height: 56, borderRadius: 28, backgroundColor: C.green, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: `0 4px 16px ${C.green}66` }}>
          <svg width="26" height="26" viewBox="0 0 26 26" fill="none">
            <path d="M2 8V3a1 1 0 011-1h5M18 2h5a1 1 0 011 1v5M24 18v5a1 1 0 01-1 1h-5M8 24H3a1 1 0 01-1-1v-5" stroke="#fff" strokeWidth="2.5" strokeLinecap="round"/>
            <rect x="8" y="8" width="4" height="4" rx="0.5" fill="#fff"/>
            <rect x="14" y="8" width="4" height="4" rx="0.5" fill="#fff"/>
            <rect x="8" y="14" width="4" height="4" rx="0.5" fill="#fff"/>
          </svg>
        </div>
        <span style={{ fontSize: 11, color: C.text, marginTop: 5, fontWeight: 500 }}>Scan</span>
      </button>

      {/* History tab */}
      <button onClick={() => router.push('/history')} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '4px 0', background: 'none', border: 'none', cursor: 'pointer' }}>
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={pathname === '/history' ? C.text : C.dim} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10"/>
          <polyline points="12 6 12 12 16 14"/>
        </svg>
        <span style={{ fontSize: 11, marginTop: 4, fontWeight: 500, color: pathname === '/history' ? C.text : C.dim }}>History</span>
      </button>
    </nav>
  );
}
