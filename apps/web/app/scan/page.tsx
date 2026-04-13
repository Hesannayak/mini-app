'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import MiniLogo from '@/components/MiniLogo';
import BottomNav from '@/components/BottomNav';
import PinModal from '@/components/PinModal';
import API from '@/lib/api';
import { isLoggedIn } from '@/lib/store';
import { needsPin } from '@/lib/paymentRules';

type State = 'scanning' | 'listening' | 'processing' | 'success';

const C = { bg: '#080812', card: '#0F0F1E', input: '#14142A', border: '#1E2040', accent: '#6366F1', green: '#10B981', text: '#EEF2FF', muted: '#8B8BAD', dim: '#5A5A7A' };

export default function ScanPage() {
  const router = useRouter();
  const [state, setState] = useState<State>('scanning');
  const [vendor, setVendor] = useState({ name: '', upi: '' });
  const [amount, setAmount] = useState(0);
  const [voiceText, setVoiceText] = useState('');
  const [error, setError] = useState('');
  const [showPin, setShowPin] = useState(false);

  useEffect(() => { if (!isLoggedIn()) router.replace('/login'); }, [router]);

  const simulateScan = () => {
    setVendor({ name: 'Sharma General Store', upi: 'sharma.store@upi' });
    setState('listening');
  };

  const processVoice = async () => {
    if (!voiceText.trim()) return;
    setState('processing');
    try {
      const res = await fetch(`${API.coach}/voice`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transcript: voiceText.trim(), language: 'hi', user_id: 'scan_user' }),
      });
      const data = await res.json();
      if (data.entities?.amount > 0) {
        setAmount(data.entities.amount);
        if (data.requires_pin) setShowPin(true);
        else setState('success');
      } else { setError('Amount samajh nahi aaya.'); setState('listening'); }
    } catch { setError('Voice processing failed.'); setState('listening'); }
  };

  const reset = () => { setState('scanning'); setVendor({ name: '', upi: '' }); setAmount(0); setVoiceText(''); setError(''); };

  return (
    <div style={{ height: '100vh', height: '100dvh', display: 'flex', flexDirection: 'column', backgroundColor: C.bg }}>
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 32 }}>

        {state === 'scanning' && (
          <div style={{ textAlign: 'center' }}>
            <div style={{ width: 220, height: 220, position: 'relative', margin: '0 auto 40px' }}>
              <svg width="220" height="220" viewBox="0 0 220 220" fill="none" style={{ position: 'absolute', top: 0, left: 0 }}>
                <path d="M2 44V12a10 10 0 0110-10h32" stroke={C.accent} strokeWidth="3" strokeLinecap="round"/>
                <path d="M176 2h32a10 10 0 0110 10v32" stroke={C.accent} strokeWidth="3" strokeLinecap="round"/>
                <path d="M218 176v32a10 10 0 01-10 10h-32" stroke={C.accent} strokeWidth="3" strokeLinecap="round"/>
                <path d="M44 218H12a10 10 0 01-10-10v-32" stroke={C.accent} strokeWidth="3" strokeLinecap="round"/>
                <line x1="30" y1="110" x2="190" y2="110" stroke={C.accent} strokeWidth="2" opacity="0.3"/>
              </svg>
              <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0.1 }}>
                <MiniLogo size={48} />
              </div>
            </div>
            <h2 style={{ color: C.text, fontSize: 24, fontWeight: 700, marginBottom: 8, letterSpacing: -0.5 }}>Scan & Pay</h2>
            <p style={{ color: C.dim, fontSize: 15, marginBottom: 48 }}>Point camera at any UPI QR code</p>
            <button onClick={simulateScan} style={{ backgroundColor: C.accent, color: '#FFF', fontWeight: 700, fontSize: 16, border: 'none', borderRadius: 14, padding: '16px 40px', cursor: 'pointer', boxShadow: `0 6px 20px ${C.accent}55` }}>
              Simulate QR Scan
            </button>
          </div>
        )}

        {(state === 'listening' || state === 'processing') && (
          <div style={{ width: '100%', textAlign: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, backgroundColor: C.card, borderRadius: 18, border: `1px solid ${C.border}`, padding: '16px 20px', marginBottom: 40, textAlign: 'left' }}>
              <div style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: C.green, flexShrink: 0 }} />
              <div>
                <p style={{ color: C.text, fontSize: 16, fontWeight: 600 }}>{vendor.name}</p>
                <p style={{ color: C.dim, fontSize: 13, marginTop: 2 }}>{vendor.upi}</p>
              </div>
            </div>

            <div style={{ width: 88, height: 88, borderRadius: 44, backgroundColor: '#0F0F2A', border: `2px solid ${C.border}`, margin: '0 auto 16px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <div style={{ width: 56, height: 56, borderRadius: 28, backgroundColor: state === 'processing' ? '#3B3B6E' : C.accent, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: `0 4px 16px ${C.accent}66` }}>
                {state === 'processing' ? <MiniLogo size={24} spinning /> : <span style={{ fontSize: 24 }}>🎙️</span>}
              </div>
            </div>
            <p style={{ color: C.muted, marginBottom: 24 }}>{state === 'processing' ? 'Processing...' : 'Kitna pay karna hai?'}</p>

            {error && <p style={{ color: '#EF4444', fontSize: 14, marginBottom: 12 }}>{error}</p>}

            <div style={{ display: 'flex', alignItems: 'center', gap: 8, backgroundColor: C.card, borderRadius: 18, border: `1px solid ${C.border}`, padding: '8px 16px' }}>
              <input type="text" placeholder='"250 rupaye pay karo"' autoFocus
                style={{ flex: 1, backgroundColor: 'transparent', border: 'none', color: C.text, fontSize: 16, padding: '8px 0', outline: 'none' }}
                value={voiceText} onChange={e => setVoiceText(e.target.value)} onKeyDown={e => e.key === 'Enter' && processVoice()}
              />
              <button onClick={processVoice} style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: voiceText.trim() ? C.text : C.border, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ fontSize: 16, fontWeight: 700, color: voiceText.trim() ? C.bg : C.dim }}>↑</span>
              </button>
            </div>
          </div>
        )}

        {state === 'success' && (
          <div style={{ textAlign: 'center' }}>
            <div style={{ width: 96, height: 96, borderRadius: 48, backgroundColor: '#0F0F2A', border: `2px solid ${C.border}`, margin: '0 auto 28px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <div style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: C.green, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: `0 8px 24px ${C.green}55` }}>
                <span style={{ fontSize: 28, fontWeight: 800, color: '#FFF' }}>✓</span>
              </div>
            </div>
            <p style={{ color: C.green, fontSize: 12, fontWeight: 600, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 12 }}>Payment Successful</p>
            <p style={{ fontSize: 48, fontWeight: 800, color: C.text, letterSpacing: -2, marginBottom: 8 }}>
              <span style={{ color: C.muted, fontSize: 24, fontWeight: 300, marginRight: 4 }}>₹</span>
              {amount.toLocaleString('en-IN')}
            </p>
            <p style={{ color: C.muted, fontSize: 16, fontWeight: 500, marginBottom: 2 }}>{vendor.name}</p>
            <p style={{ color: C.dim, fontSize: 13, marginBottom: 48 }}>{vendor.upi}</p>
            <button onClick={reset} style={{ backgroundColor: C.card, border: `1px solid ${C.border}`, borderRadius: 14, padding: '14px 48px', color: C.text, fontSize: 16, fontWeight: 600, cursor: 'pointer' }}>
              Done
            </button>
          </div>
        )}
      </div>

      <BottomNav />
      {showPin && <PinModal amount={amount} payee={vendor.name} onConfirm={() => { setShowPin(false); setState('success'); }} onCancel={() => { setShowPin(false); setState('listening'); }} />}
    </div>
  );
}
