'use client';
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import MiniLogo from '@/components/MiniLogo';
import BottomNav from '@/components/BottomNav';
import PinModal from '@/components/PinModal';
import API from '@/lib/api';
import { isLoggedIn } from '@/lib/store';
import { needsPin } from '@/lib/paymentRules';
import jsQR from 'jsqr';

type State = 'scanning' | 'listening' | 'processing' | 'success';

const C = { bg: '#080812', card: '#0F0F1E', input: '#14142A', border: '#1E2040', accent: '#6366F1', green: '#10B981', text: '#EEF2FF', muted: '#8B8BAD', dim: '#5A5A7A', err: '#EF4444' };

function parseUpiQR(data: string): { vpa: string; name: string; amount?: number } | null {
  if (!data.toLowerCase().startsWith('upi://')) return null;
  try {
    const url = new URL(data);
    const vpa = url.searchParams.get('pa') || '';
    const name = url.searchParams.get('pn') || vpa;
    const amStr = url.searchParams.get('am');
    const amount = amStr ? parseFloat(amStr) : undefined;
    if (!vpa) return null;
    return { vpa, name: decodeURIComponent(name), amount };
  } catch { return null; }
}

export default function ScanPage() {
  const router = useRouter();
  const [state, setState] = useState<State>('scanning');
  const [vendor, setVendor] = useState({ name: '', upi: '' });
  const [amount, setAmount] = useState(0);
  const [voiceText, setVoiceText] = useState('');
  const [error, setError] = useState('');
  const [showPin, setShowPin] = useState(false);
  const [camError, setCamError] = useState('');

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const scanRef = useRef<any>(null);

  useEffect(() => { if (!isLoggedIn()) router.replace('/login'); }, [router]);

  // Camera + QR scanning
  useEffect(() => {
    if (state !== 'scanning') return;
    let cancelled = false;

    (async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment', width: { ideal: 640 }, height: { ideal: 480 } }
        });
        if (cancelled) { stream.getTracks().forEach(t => t.stop()); return; }
        streamRef.current = stream;
        if (videoRef.current) { videoRef.current.srcObject = stream; videoRef.current.play(); }

        scanRef.current = setInterval(() => {
          const video = videoRef.current;
          const canvas = canvasRef.current;
          if (!video || !canvas || video.readyState < video.HAVE_ENOUGH_DATA) return;
          const ctx = canvas.getContext('2d')!;
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
          ctx.drawImage(video, 0, 0);
          const img = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const code = jsQR(img.data, img.width, img.height, { inversionAttempts: 'dontInvert' });
          if (code?.data) {
            const parsed = parseUpiQR(code.data);
            if (parsed) {
              stopCam();
              setVendor({ name: parsed.name, upi: parsed.vpa });
              if (parsed.amount) setAmount(parsed.amount);
              setState('listening');
            }
          }
        }, 200);
      } catch (e: any) {
        if (!cancelled) setCamError(e.name === 'NotAllowedError' ? 'Camera permission denied. Tap "Enter manually" below.' : 'Camera not available on this device.');
      }
    })();

    return () => { cancelled = true; stopCam(); };
  }, [state]);

  const stopCam = () => {
    if (scanRef.current) { clearInterval(scanRef.current); scanRef.current = null; }
    if (streamRef.current) { streamRef.current.getTracks().forEach(t => t.stop()); streamRef.current = null; }
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
    } catch { setError('Processing failed.'); setState('listening'); }
  };

  const simulateScan = () => { stopCam(); setVendor({ name: 'Sharma General Store', upi: 'sharma.store@upi' }); setState('listening'); };
  const reset = () => { setState('scanning'); setVendor({ name: '', upi: '' }); setAmount(0); setVoiceText(''); setError(''); setCamError(''); };

  return (
    <div style={{ height: '100vh', height: '100dvh', display: 'flex', flexDirection: 'column', backgroundColor: C.bg }}>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 24 }}>

        {state === 'scanning' && (<>
          {/* Camera with QR frame overlay */}
          <div style={{ position: 'relative', width: 260, height: 260, borderRadius: 20, overflow: 'hidden', marginBottom: 32, backgroundColor: '#000' }}>
            <video ref={videoRef} playsInline muted style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            <canvas ref={canvasRef} style={{ display: 'none' }} />

            {/* Corner brackets */}
            <svg style={{ position: 'absolute', inset: 0 }} width="100%" height="100%" viewBox="0 0 260 260" fill="none">
              <path d="M2 50V14a12 12 0 0112-12h36" stroke={C.accent} strokeWidth="3.5" strokeLinecap="round"/>
              <path d="M210 2h36a12 12 0 0112 12v36" stroke={C.accent} strokeWidth="3.5" strokeLinecap="round"/>
              <path d="M258 210v36a12 12 0 01-12 12h-36" stroke={C.accent} strokeWidth="3.5" strokeLinecap="round"/>
              <path d="M50 258H14a12 12 0 01-12-12v-36" stroke={C.accent} strokeWidth="3.5" strokeLinecap="round"/>
            </svg>

            {/* Animated scan line */}
            <div style={{ position: 'absolute', left: 20, right: 20, height: 2, backgroundColor: C.accent, opacity: 0.6, borderRadius: 1, animation: 'scanLine 2s ease-in-out infinite' }} />

            {/* Camera error overlay */}
            {camError && (
              <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.85)', padding: 24 }}>
                <p style={{ color: C.muted, fontSize: 14, textAlign: 'center', lineHeight: 1.5 }}>{camError}</p>
              </div>
            )}
          </div>

          <h2 style={{ color: C.text, fontSize: 22, fontWeight: 700, marginBottom: 6 }}>Scan & Pay</h2>
          <p style={{ color: C.dim, fontSize: 14, marginBottom: 32 }}>Point camera at any UPI QR code</p>

          <button onClick={simulateScan} style={{ backgroundColor: C.card, border: `1px solid ${C.border}`, borderRadius: 14, padding: '12px 28px', color: C.muted, fontSize: 14, cursor: 'pointer' }}>
            Enter manually
          </button>
        </>)}

        {(state === 'listening' || state === 'processing') && (
          <div style={{ width: '100%', maxWidth: 360, textAlign: 'center' }}>
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

            {error && <p style={{ color: C.err, fontSize: 14, marginBottom: 12 }}>{error}</p>}

            <div style={{ display: 'flex', alignItems: 'center', gap: 8, backgroundColor: C.card, borderRadius: 18, border: `1px solid ${C.border}`, padding: '8px 16px' }}>
              <input type="text" placeholder='"250 rupaye pay karo"' autoFocus
                style={{ flex: 1, backgroundColor: 'transparent', border: 'none', color: C.text, fontSize: 16, padding: '8px 0', outline: 'none' }}
                value={voiceText} onChange={e => setVoiceText(e.target.value)} onKeyDown={e => e.key === 'Enter' && processVoice()} />
              <button onClick={processVoice} disabled={!voiceText.trim()}
                style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: voiceText.trim() ? C.text : C.border, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
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
              <span style={{ color: C.muted, fontSize: 24, fontWeight: 300, marginRight: 4 }}>₹</span>{amount.toLocaleString('en-IN')}
            </p>
            <p style={{ color: C.muted, fontSize: 16, fontWeight: 500, marginBottom: 2 }}>{vendor.name}</p>
            <p style={{ color: C.dim, fontSize: 13, marginBottom: 48 }}>{vendor.upi}</p>
            <button onClick={reset} style={{ backgroundColor: C.card, border: `1px solid ${C.border}`, borderRadius: 14, padding: '14px 48px', color: C.text, fontSize: 16, fontWeight: 600, cursor: 'pointer' }}>Done</button>
          </div>
        )}
      </div>

      <BottomNav />
      {showPin && <PinModal amount={amount} payee={vendor.name} onConfirm={() => { setShowPin(false); setState('success'); }} onCancel={() => { setShowPin(false); setState('listening'); }} />}
      <style>{`@keyframes scanLine { 0% { top: 15%; } 50% { top: 80%; } 100% { top: 15%; } }`}</style>
    </div>
  );
}
