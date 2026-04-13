'use client';
import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import API from '@/lib/api';
import { setAuth, setUserName } from '@/lib/store';

export default function LoginPage() {
  const router = useRouter();
  const [step, setStep] = useState<'phone' | 'otp' | 'name'>('phone');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);

  const sendOtp = async () => {
    if (phone.length !== 10 || !/^[6-9]/.test(phone)) { setError('Valid 10-digit number daalo'); return; }
    setError(''); setLoading(true);
    try {
      const res = await fetch(`${API.auth}/otp/send`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ phone }) });
      const data = await res.json();
      if (data.success) { setStep('otp'); setTimeout(() => otpRefs.current[0]?.focus(), 300); }
      else setError(data.error || 'OTP bhej nahi paaye');
    } catch { setError('Server se connect nahi ho paaya'); }
    finally { setLoading(false); }
  };

  const verifyOtp = async () => {
    const code = otp.join('');
    if (code.length !== 6) { setError('6 digit OTP daalo'); return; }
    setError(''); setLoading(true);
    try {
      const res = await fetch(`${API.auth}/otp/verify`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ phone, otp: code }) });
      const data = await res.json();
      if (data.success) {
        setAuth(data.data.access_token, data.data.refresh_token, phone);
        if (data.data.user.name) { setUserName(data.data.user.name); router.push('/chat'); }
        else setStep('name');
      } else setError(data.error || 'Galat OTP');
    } catch { setError('Verify nahi ho paaya'); }
    finally { setLoading(false); }
  };

  const saveName = () => {
    if (!name.trim()) { setError('Apna naam batao'); return; }
    setUserName(name.trim()); router.push('/chat');
  };

  const skipDemo = () => {
    setAuth('demo_token', 'demo_refresh', '9876543210');
    setUserName('Rahul');
    router.push('/chat');
  };

  const handleOtp = (val: string, i: number) => {
    const d = val.replace(/\D/g, '').slice(-1);
    const n = [...otp]; n[i] = d; setOtp(n); setError('');
    if (d && i < 5) otpRefs.current[i + 1]?.focus();
    if (d && i === 5) { const code = [...n]; code[5] = d; setOtp(code); setTimeout(verifyOtp, 200); }
  };
  const handleOtpKey = (key: string, i: number) => {
    if (key === 'Backspace' && !otp[i] && i > 0) otpRefs.current[i - 1]?.focus();
  };

  const C = { bg: '#080812', card: '#0F0F1E', input: '#14142A', border: '#1E2040', accent: '#6366F1', text: '#EEF2FF', muted: '#8B8BAD', dim: '#5A5A7A', err: '#EF4444' };

  return (
    <div style={{ minHeight: '100vh', minHeight: '100dvh', backgroundColor: C.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div style={{ width: '100%', maxWidth: 380 }}>

        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          <div style={{ width: 96, height: 96, borderRadius: 48, backgroundColor: C.input, border: `1.5px solid ${C.border}`, margin: '0 auto 20px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ color: C.accent, fontSize: 40, fontWeight: 800 }}>M</span>
          </div>
          <h1 style={{ color: C.text, fontSize: 34, fontWeight: 800, letterSpacing: -1, margin: 0 }}>Mini</h1>
          <p style={{ color: C.dim, fontSize: 14, marginTop: 8, fontStyle: 'italic' }}>Apni bhaasha mein, apna paisa</p>
        </div>

        {/* Card */}
        <div style={{ backgroundColor: C.card, borderRadius: 24, border: `1px solid ${C.border}`, padding: 28, overflow: 'hidden' }}>

          {/* ── Phone ── */}
          {step === 'phone' && <>
            <h2 style={{ color: C.text, fontSize: 24, fontWeight: 700, marginBottom: 20, letterSpacing: -0.5 }}>Welcome back</h2>

            <div style={{ display: 'flex', gap: 10, marginBottom: 24 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 5, backgroundColor: C.input, borderRadius: 14, border: `1.5px solid ${C.border}`, padding: '0 12px', flexShrink: 0 }}>
                <span style={{ color: C.accent, fontSize: 11, fontWeight: 700, letterSpacing: 0.5 }}>IN</span>
                <span style={{ color: C.muted, fontSize: 14, fontWeight: 600 }}>+91</span>
              </div>
              <input type="tel" inputMode="numeric" maxLength={10} autoFocus placeholder="Phone number"
                style={{ flex: 1, minWidth: 0, backgroundColor: C.input, borderRadius: 14, border: `1.5px solid ${C.border}`, padding: '16px 14px', color: C.text, fontSize: 18, fontWeight: 600, outline: 'none' }}
                value={phone} onChange={e => { setPhone(e.target.value.replace(/\D/g, '').slice(0, 10)); setError(''); }}
              />
            </div>

            {error && <p style={{ color: C.err, fontSize: 13, textAlign: 'center', marginBottom: 16 }}>{error}</p>}

            <button onClick={sendOtp} disabled={loading || phone.length !== 10}
              style={{ width: '100%', borderRadius: 14, padding: '18px 0', fontSize: 17, fontWeight: 700, border: `1.5px solid ${phone.length === 10 ? C.accent : C.border}`, backgroundColor: phone.length === 10 ? C.accent : C.input, color: phone.length === 10 ? '#FFF' : C.dim, cursor: phone.length === 10 ? 'pointer' : 'default', marginTop: 4, transition: 'all 0.2s' }}>
              {loading ? '...' : 'Continue'}
            </button>

            <button onClick={skipDemo} style={{ display: 'block', margin: '12px auto 0', padding: '8px 16px', background: 'none', border: 'none', color: '#4A4A6A', fontSize: 13, textDecoration: 'underline', cursor: 'pointer' }}>
              Skip — Try Demo
            </button>
          </>}

          {/* ── OTP ── */}
          {step === 'otp' && <>
            <button onClick={() => { setStep('phone'); setOtp(['','','','','','']); setError(''); }}
              style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 20, background: 'none', border: 'none', color: C.muted, fontSize: 14, cursor: 'pointer', padding: 0 }}>
              ← Change number
            </button>
            <h2 style={{ color: C.text, fontSize: 24, fontWeight: 700, marginBottom: 20, letterSpacing: -0.5 }}>Verify OTP</h2>

            <div style={{ display: 'flex', gap: 6, marginBottom: 28 }}>
              {otp.map((d, i) => (
                <input key={i} ref={r => { otpRefs.current[i] = r; }} type="tel" inputMode="numeric" maxLength={1}
                  style={{ flex: 1, minWidth: 0, height: 56, backgroundColor: d ? '#13133A' : C.input, borderRadius: 12, border: `1.5px solid ${d ? C.accent : C.border}`, textAlign: 'center', color: C.text, fontSize: 22, fontWeight: 700, outline: 'none', transition: 'all 0.2s' }}
                  value={d} onChange={e => handleOtp(e.target.value, i)} onKeyDown={e => handleOtpKey(e.key, i)}
                />
              ))}
            </div>

            {error && <p style={{ color: C.err, fontSize: 13, textAlign: 'center', marginBottom: 16 }}>{error}</p>}

            <button onClick={verifyOtp} disabled={loading || otp.join('').length !== 6}
              style={{ width: '100%', borderRadius: 14, padding: '18px 0', fontSize: 17, fontWeight: 700, border: `1.5px solid ${otp.join('').length === 6 ? C.accent : C.border}`, backgroundColor: otp.join('').length === 6 ? C.accent : C.input, color: otp.join('').length === 6 ? '#FFF' : C.dim, cursor: otp.join('').length === 6 ? 'pointer' : 'default', transition: 'all 0.2s' }}>
              {loading ? '...' : 'Verify'}
            </button>
          </>}

          {/* ── Name ── */}
          {step === 'name' && <>
            <h2 style={{ color: C.text, fontSize: 24, fontWeight: 700, marginBottom: 20, letterSpacing: -0.5 }}>Aapka naam?</h2>
            <input type="text" autoFocus placeholder="Your name"
              style={{ width: '100%', backgroundColor: C.input, borderRadius: 14, border: `1.5px solid ${C.border}`, padding: '18px', color: C.text, fontSize: 20, fontWeight: 600, outline: 'none', marginBottom: 24, boxSizing: 'border-box' }}
              value={name} onChange={e => { setName(e.target.value); setError(''); }} onKeyDown={e => e.key === 'Enter' && saveName()}
            />
            {error && <p style={{ color: C.err, fontSize: 13, textAlign: 'center', marginBottom: 16 }}>{error}</p>}
            <button onClick={saveName} disabled={!name.trim()}
              style={{ width: '100%', borderRadius: 14, padding: '18px 0', fontSize: 17, fontWeight: 700, border: `1.5px solid ${name.trim() ? C.accent : C.border}`, backgroundColor: name.trim() ? C.accent : C.input, color: name.trim() ? '#FFF' : C.dim, cursor: name.trim() ? 'pointer' : 'default', transition: 'all 0.2s' }}>
              Start using Mini
            </button>
          </>}
        </div>
      </div>
    </div>
  );
}
