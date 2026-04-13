'use client';
import { useState, useEffect } from 'react';

const CORRECT_PIN = '1234';
const MAX_TRIES = 3;
const KEYS = [['1','2','3'],['4','5','6'],['7','8','9'],['','0','del']];

export default function PinModal({ amount, payee, onConfirm, onCancel }: {
  amount: number; payee: string; onConfirm: () => void; onCancel: () => void;
}) {
  const [pin, setPin] = useState('');
  const [tries, setTries] = useState(0);
  const [error, setError] = useState('');
  const [locked, setLocked] = useState(false);
  const [shake, setShake] = useState(false);

  useEffect(() => { setPin(''); setTries(0); setError(''); setLocked(false); }, []);

  const pressKey = (key: string) => {
    if (locked) return;
    if (key === 'del') { setPin(p => p.slice(0, -1)); setError(''); return; }
    if (pin.length >= 4) return;
    const next = pin + key;
    setPin(next); setError('');
    if (next.length === 4) {
      setTimeout(() => {
        if (next === CORRECT_PIN) { onConfirm(); setPin(''); }
        else {
          const n = tries + 1; setTries(n);
          setShake(true); setTimeout(() => setShake(false), 300);
          if (n >= MAX_TRIES) { setError('3 galat PIN. Payment blocked.'); setLocked(true); }
          else { setError(`Galat PIN. ${MAX_TRIES - n} try baaki.`); setPin(''); }
        }
      }, 120);
    }
  };

  const C = { bg: '#14142A', border: '#1E2040', accent: '#6366F1', text: '#EEF2FF', muted: '#8B8BAD', dim: '#5A5A7A', key: '#0F0F1E', err: '#EF4444' };

  return (
    <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.92)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: 32 }}>
      <div style={{ backgroundColor: C.bg, borderRadius: 28, padding: 28, width: '100%', maxWidth: 340, textAlign: 'center', border: `1px solid ${C.border}` }}>

        <h2 style={{ color: C.text, fontSize: 20, fontWeight: 700, marginBottom: 6 }}>Enter PIN</h2>
        <p style={{ color: '#10B981', fontSize: 16, fontWeight: 600, marginBottom: 24 }}>₹{amount.toLocaleString('en-IN')} to {payee}</p>
        <p style={{ color: C.muted, fontSize: 13, marginBottom: 18 }}>{locked ? 'Payment blocked' : '4-digit UPI PIN'}</p>

        {/* Dots */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: 20, marginBottom: 12, transform: shake ? 'translateX(8px)' : 'none', transition: 'transform 0.1s' }}>
          {[0,1,2,3].map(i => (
            <div key={i} style={{
              width: 18, height: 18, borderRadius: 9,
              border: `2px solid ${error && !pin ? C.err : pin.length > i ? C.accent : '#2E2E50'}`,
              backgroundColor: pin.length > i ? C.accent : 'transparent',
              transition: 'all 0.15s',
            }} />
          ))}
        </div>

        {error ? <p style={{ color: C.err, fontSize: 13, marginBottom: 12 }}>{error}</p> : <div style={{ height: 28 }} />}

        {/* Keypad */}
        <div style={{ marginBottom: 8 }}>
          {KEYS.map((row, ri) => (
            <div key={ri} style={{ display: 'flex', justifyContent: 'center', gap: 12, marginBottom: 8 }}>
              {row.map((key, ki) => {
                if (key === '') return <div key={ki} style={{ width: 72, height: 60 }} />;
                return (
                  <button key={ki} onClick={() => pressKey(key)} disabled={locked}
                    style={{
                      width: 72, height: 60, borderRadius: 16,
                      backgroundColor: key === 'del' ? C.bg : C.key,
                      border: `1px solid ${C.border}`,
                      color: locked ? '#3A3A5A' : key === 'del' ? C.muted : C.text,
                      fontSize: key === 'del' ? 14 : 22, fontWeight: 500,
                      cursor: locked ? 'not-allowed' : 'pointer',
                      opacity: locked ? 0.3 : 1,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      transition: 'all 0.1s',
                    }}>
                    {key === 'del' ? '⌫' : key}
                  </button>
                );
              })}
            </div>
          ))}
        </div>

        <button onClick={onCancel} style={{ background: 'none', border: 'none', color: C.muted, fontSize: 15, fontWeight: 500, padding: '12px 32px', cursor: 'pointer', marginTop: 4 }}>
          {locked ? 'Close' : 'Cancel'}
        </button>
      </div>
    </div>
  );
}
