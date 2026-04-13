'use client';
import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import MiniLogo from '@/components/MiniLogo';
import BottomNav from '@/components/BottomNav';
import PinModal from '@/components/PinModal';
import API from '@/lib/api';
import { isLoggedIn, getUserName } from '@/lib/store';

interface Msg { id: string; role: 'user' | 'ai'; text: string; }

const C = { bg: '#080812', card: '#0F0F1E', input: '#14142A', border: '#1E2040', accent: '#6366F1', green: '#10B981', text: '#EEF2FF', muted: '#8B8BAD', dim: '#5A5A7A', aiText: '#C8D0F0' };

function getGreeting() {
  const h = new Date().getHours();
  return h < 12 ? 'morning' : h < 17 ? 'afternoon' : 'evening';
}

export default function ChatPage() {
  const router = useRouter();
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [listening, setListening] = useState(false);
  const [voiceSecs, setVoiceSecs] = useState(0);
  const [volume, setVolume] = useState(0); // 0-1 mic volume level
  const [pin, setPin] = useState<{ amount: number; payee: string } | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);
  const voiceTimerRef = useRef<any>(null);
  const audioCtxRef = useRef<any>(null);
  const analyserRef = useRef<any>(null);
  const animFrameRef = useRef<any>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const name = getUserName();

  useEffect(() => { if (!isLoggedIn()) router.replace('/login'); }, [router]);

  const scroll = () => setTimeout(() => scrollRef.current?.scrollTo({ top: 999999, behavior: 'smooth' }), 100);

  // ── Voice — always-on until user stops ──
  const listeningRef = useRef(false);
  const pendingVoiceRef = useRef<string | null>(null);
  const SRRef = useRef<any>(null); // SpeechRecognition constructor

  // Queue for voice messages — processes one at a time
  const sendingRef = useRef(false);
  const queueRef = useRef<string[]>([]);

  const processQueue = async () => {
    if (sendingRef.current || queueRef.current.length === 0) return;
    sendingRef.current = true;
    const text = queueRef.current.shift()!;
    await send(text);
    sendingRef.current = false;
    processQueue(); // process next in queue if any
  };

  const queueVoice = (text: string) => {
    queueRef.current.push(text);
    processQueue();
  };

  // Single continuous recognition — never stops until user taps stop
  const startRecognition = () => {
    const SR = SRRef.current || (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) return;
    SRRef.current = SR;

    const rec = new SR();
    rec.lang = 'en-IN';  // English-India — transcribes Hinglish (Hindi words in Roman script + English)
    rec.continuous = true;
    rec.interimResults = true;
    recognitionRef.current = rec;

    rec.onresult = (e: any) => {
      for (let i = e.resultIndex; i < e.results.length; i++) {
        if (e.results[i].isFinal) {
          const final = e.results[i][0].transcript;
          setInput('');
          queueVoice(final); // queue it — will send when ready
        } else {
          setInput(e.results[i][0].transcript);
        }
      }
    };

    rec.onerror = () => {
      // Auto-restart on error
      if (listeningRef.current) setTimeout(() => { if (listeningRef.current) startRecognition(); }, 1000);
    };

    rec.onend = () => {
      // Continuous mode can still end (browser timeout) — restart
      if (listeningRef.current) setTimeout(() => { if (listeningRef.current) startRecognition(); }, 300);
    };

    try { rec.start(); } catch { /* already started */ }
  };

  // Start audio analyser for waveform (only once per session)
  const startAudioAnalyser = () => {
    if (audioCtxRef.current) return; // already running
    navigator.mediaDevices.getUserMedia({ audio: true }).then(stream => {
      streamRef.current = stream;
      const ctx = new AudioContext();
      const src = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 512;
      analyser.smoothingTimeConstant = 0.4;
      src.connect(analyser);
      audioCtxRef.current = ctx;
      analyserRef.current = analyser;
      const dataArray = new Uint8Array(analyser.fftSize);

      const tick = () => {
        if (!listeningRef.current) return;
        analyser.getByteTimeDomainData(dataArray);
        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) { const v = (dataArray[i] - 128) / 128; sum += v * v; }
        const rms = Math.sqrt(sum / dataArray.length);
        setVolume(Math.min(rms * 5, 1)); // 5x boost
        animFrameRef.current = requestAnimationFrame(tick);
      };
      tick();
    }).catch(() => {});
  };

  const startListening = () => {
    listeningRef.current = true;
    setListening(true);
    setVoiceSecs(0);
    setVolume(0);
    voiceTimerRef.current = setInterval(() => setVoiceSecs(s => s + 1), 1000);
    startRecognition();
    startAudioAnalyser();
  };

  const stopListening = () => {
    listeningRef.current = false;
    setListening(false);
    setVoiceSecs(0);
    setVolume(0);
    if (voiceTimerRef.current) { clearInterval(voiceTimerRef.current); voiceTimerRef.current = null; }
    if (animFrameRef.current) { cancelAnimationFrame(animFrameRef.current); animFrameRef.current = null; }
    if (audioCtxRef.current) { audioCtxRef.current.close(); audioCtxRef.current = null; }
    if (streamRef.current) { streamRef.current.getTracks().forEach(t => t.stop()); streamRef.current = null; }
    analyserRef.current = null;
    recognitionRef.current?.abort();
    recognitionRef.current = null;
  };

  const toggleVoice = () => {
    if (listening) stopListening();
    else startListening();
  };


  const send = async (text: string) => {
    if (!text.trim()) return;
    const t = text.trim();
    setMsgs(p => [...p, { id: `u${Date.now()}`, role: 'user', text: t }]);
    setInput('');
    setLoading(true);
    scroll();

    try {
      const res = await fetch(`${API.coach}/voice`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transcript: t, language: 'hi', user_id: 'web_default' }),
      });
      const data = await res.json();

      // Handle payment PIN
      if (data.action === 'execute' && data.intent === 'send_money' && data.requires_pin) {
        setLoading(false);
        setPin({ amount: data.entities?.amount || 0, payee: data.entities?.contact_name || 'Unknown' });
        return;
      }

      // Handle ride scanning
      if (data.action === 'scan_rides' && data.intent === 'book_ride') {
        setMsgs(p => [...p, { id: `a${Date.now()}`, role: 'ai', text: data.response_text || 'Ride dhundh raha hoon...' }]);
        // Call ride service to scan
        try {
          const { getCurrentLocation } = await import('@/lib/location');
          const loc = await getCurrentLocation();
          const rideRes = await fetch(`${API.rides || 'http://localhost:3007/api/v1/rides'}/scan`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ origin_lat: loc.lat, origin_lng: loc.lng, destination_lat: loc.lat + 0.05, destination_lng: loc.lng + 0.02, destination_label: data.entities?.destination }),
          });
          const rides = await rideRes.json();
          if (rides.success && rides.options?.length > 0) {
            const best = rides.options[0];
            const tipNote = best.tip_recommended > 0 ? ` + ₹${best.tip_recommended} tip` : '';
            setMsgs(p => [...p, {
              id: `ride${Date.now()}`, role: 'ai',
              text: `Namma Yatri ${best.vehicle_type} available — ₹${best.price}${tipNote}, ${best.eta_minutes} min ETA. Book karoon?`,
            }]);
          } else {
            setMsgs(p => [...p, { id: `ride${Date.now()}`, role: 'ai', text: rides.message || 'Abhi koi driver nahi hai.' }]);
          }
        } catch {
          setMsgs(p => [...p, { id: `ride${Date.now()}`, role: 'ai', text: 'Ride check mein error aaya. Dobara try karo.' }]);
        }
        setLoading(false);
        scroll();
        return;
      }

      setMsgs(p => [...p, { id: `a${Date.now()}`, role: 'ai', text: data.response_text || 'Error' }]);
    } catch {
      setMsgs(p => [...p, { id: `e${Date.now()}`, role: 'ai', text: 'Connection error.' }]);
    } finally {
      setLoading(false);
      scroll();
    }
  };

  const empty = msgs.length === 0;

  return (
    <div style={{ height: '100vh', height: '100dvh', display: 'flex', flexDirection: 'column', backgroundColor: C.bg }}>

      {/* Header */}
      <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px 20px', borderBottom: `1px solid ${C.card}` }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, backgroundColor: C.input, borderRadius: 22, padding: '8px 18px', border: `1px solid ${C.border}` }}>
          <MiniLogo size={20} />
          <span style={{ color: C.text, fontSize: 16, fontWeight: 600 }}>Mini</span>
          <span style={{ color: C.dim, fontSize: 11 }}>▾</span>
        </div>
      </header>

      {/* Messages */}
      <div ref={scrollRef} style={{ flex: 1, overflowY: 'auto', padding: 20 }}>
        {empty ? (
          <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            {/* Greeting — centered */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', paddingBottom: 20 }}>
              <MiniLogo size={48} />
              <p style={{ marginTop: 20, fontSize: 26, fontFamily: 'Georgia, serif', color: C.aiText, textAlign: 'center', lineHeight: 1.4, letterSpacing: -0.5 }}>
                How can I help you<br />this {getGreeting()}{name ? `, ${name}` : ''}?
              </p>
            </div>

            {/* Suggestion cards */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, paddingBottom: 8 }}>
              {[
                { icon: '💸', title: 'Send Money', sub: '"Mummy ko 500 bhej do"' },
                { icon: '📊', title: 'Spending', sub: '"Aaj kitna kharch hua?"' },
                { icon: '⚡', title: 'Pay Bills', sub: '"Bijli ka bill bharo"' },
                { icon: '🎯', title: 'Mini Score', sub: '"Score kaise badhayein?"' },
              ].map((card, i) => (
                <button key={i} onClick={() => send(card.sub.replace(/"/g, ''))}
                  style={{
                    backgroundColor: C.card, border: `1px solid ${C.border}`, borderRadius: 18,
                    padding: '16px 14px', textAlign: 'left', cursor: 'pointer',
                    transition: 'border-color 0.2s',
                  }}
                  onMouseEnter={e => (e.currentTarget.style.borderColor = C.accent)}
                  onMouseLeave={e => (e.currentTarget.style.borderColor = C.border)}
                >
                  <span style={{ fontSize: 22 }}>{card.icon}</span>
                  <p style={{ color: C.text, fontSize: 14, fontWeight: 600, marginTop: 8, marginBottom: 4 }}>{card.title}</p>
                  <p style={{ color: C.dim, fontSize: 12, lineHeight: 1.4 }}>{card.sub}</p>
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {msgs.map(m => (
              <div key={m.id} style={{ display: 'flex', justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start' }}>
                {m.role === 'ai' && (
                  <div style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: '#1E1E50', display: 'flex', alignItems: 'center', justifyContent: 'center', marginRight: 10, marginTop: 4, flexShrink: 0 }}>
                    <span style={{ color: C.accent, fontSize: 11, fontWeight: 700 }}>M</span>
                  </div>
                )}
                <div style={{
                  maxWidth: '80%',
                  padding: '12px 16px',
                  borderRadius: 20,
                  ...(m.role === 'user'
                    ? { backgroundColor: C.card, border: `1px solid ${C.border}`, borderBottomRightRadius: 6 }
                    : {}
                  ),
                }}>
                  <p style={{ fontSize: 15, lineHeight: 1.6, color: m.role === 'user' ? C.text : C.aiText, margin: 0 }}>{m.text}</p>
                </div>
              </div>
            ))}
            {loading && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: '#1E1E50', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <MiniLogo size={16} spinning />
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Input — switches between text mode and voice waveform mode */}
      <div style={{ padding: '8px 16px 4px' }}>
        {listening ? (
          /* ── Voice waveform bar ── */
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, backgroundColor: '#1A1A2E', borderRadius: 28, border: `1px solid ${C.border}`, padding: '8px 8px 8px 12px' }}>
            {/* Cancel button */}
            <button onClick={stopListening} style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: '#2A2A44', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#EEF2FF" strokeWidth="2.5" strokeLinecap="round">
                <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>

            {/* Waveform bars — driven by real mic volume */}
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1.5, height: 36, overflow: 'hidden' }}>
              {Array.from({ length: 40 }).map((_, i) => {
                const center = 20;
                const dist = Math.abs(i - center) / center;
                const sensitivity = 1 - dist * 0.5;
                const jitter = Math.sin(i * 2.3) * 0.25 + 0.75;
                const h = 3 + volume * 50 * sensitivity * jitter;
                return (
                  <div key={i} style={{
                    width: 2.5,
                    borderRadius: 2,
                    backgroundColor: '#EEF2FF',
                    height: Math.max(3, Math.min(h, 36)),
                    transition: 'height 0.06s linear',
                  }} />
                );
              })}
            </div>

            {/* Timer */}
            <span style={{ color: C.muted, fontSize: 14, fontWeight: 500, fontVariantNumeric: 'tabular-nums', minWidth: 32, textAlign: 'right' }}>
              {Math.floor(voiceSecs / 60)}:{(voiceSecs % 60).toString().padStart(2, '0')}
            </span>

            {/* Pause button */}
            <button onClick={stopListening}
              style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: '#3B82F6', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="#FFF">
                <rect x="5" y="3" width="5" height="18" rx="1.5"/>
                <rect x="14" y="3" width="5" height="18" rx="1.5"/>
              </svg>
            </button>
          </div>
        ) : (
          /* ── Normal text input bar ── */
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, backgroundColor: C.card, borderRadius: 24, border: `1px solid ${C.border}`, padding: '6px 6px 6px 18px' }}>
            <input type="text" placeholder="Message Mini..."
              style={{ flex: 1, backgroundColor: 'transparent', border: 'none', color: C.text, fontSize: 16, padding: '10px 0', outline: 'none' }}
              value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && send(input)}
            />
            {/* Mic button */}
            <button onClick={toggleVoice} style={{ width: 38, height: 38, borderRadius: 19, border: 'none', cursor: 'pointer', backgroundColor: 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={C.muted} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z"/>
                <path d="M19 10v2a7 7 0 01-14 0v-2"/>
                <line x1="12" y1="19" x2="12" y2="23"/>
                <line x1="8" y1="23" x2="16" y2="23"/>
              </svg>
            </button>
            {/* Send button */}
            <button onClick={() => send(input)} disabled={!input.trim()}
              style={{ width: 38, height: 38, borderRadius: 19, border: 'none', cursor: input.trim() ? 'pointer' : 'default', backgroundColor: input.trim() ? C.accent : C.border, display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s' }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={input.trim() ? '#FFF' : C.dim} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="19" x2="12" y2="5"/><polyline points="5 12 12 5 19 12"/>
              </svg>
            </button>
          </div>
        )}
      </div>

      <BottomNav />

      {pin && (
        <PinModal amount={pin.amount} payee={pin.payee}
          onConfirm={() => {
            setMsgs(p => [...p, { id: `a${Date.now()}`, role: 'ai', text: `₹${pin.amount.toLocaleString('en-IN')} ${pin.payee} ko bhej diya!` }]);
            setPin(null); scroll();
          }}
          onCancel={() => setPin(null)}
        />
      )}
    </div>
  );
}
