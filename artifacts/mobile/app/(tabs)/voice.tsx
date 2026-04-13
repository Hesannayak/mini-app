import React, { useEffect, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  Platform, StatusBar, TextInput,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import Animated, {
  useSharedValue, useAnimatedStyle,
  withTiming, withRepeat, withSequence, withDelay, Easing,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { Audio } from 'expo-av';
import { useVoiceStore } from '@/store/voiceStore';
import { useUserStore } from '@/store/userStore';
import { VOICE_EXAMPLES } from '@/constants/intents';
import { API, apiFetch } from '@/lib/api';

// ─── Web Speech API types ────────────────────────────────────────────────────
interface SpeechRecognitionEvent { results: { 0: { 0: { transcript: string } } }[] }
interface SpeechRecognitionI extends EventTarget {
  lang: string; continuous: boolean; interimResults: boolean; maxAlternatives: number;
  start(): void; stop(): void; abort(): void;
  onresult: ((e: SpeechRecognitionEvent) => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
}

const LANG_MAP: Record<string, string> = { hi: 'hi-IN', ta: 'ta-IN', te: 'te-IN', en: 'en-IN' };

// WAV recording preset for iOS (LinearPCM = native WAV), metering enabled for auto-stop
const RECORDING_OPTIONS: Audio.RecordingOptions = {
  isMeteringEnabled: true,
  android: {
    extension: '.m4a',
    outputFormat: Audio.AndroidOutputFormat.MPEG_4,
    audioEncoder: Audio.AndroidAudioEncoder.AAC,
    sampleRate: 16000,
    numberOfChannels: 1,
    bitRate: 128000,
  },
  ios: {
    extension: '.wav',
    outputFormat: Audio.IOSOutputFormat.LINEARPCM,
    audioQuality: Audio.IOSAudioQuality.HIGH,
    sampleRate: 16000,
    numberOfChannels: 1,
    bitRate: 256000,
    linearPCMBitDepth: 16,
    linearPCMIsBigEndian: false,
    linearPCMIsFloat: false,
  },
  web: { mimeType: 'audio/webm', bitsPerSecond: 128000 },
};


export default function VoiceScreen() {
  const { status, transcript, responseText, setStatus, setTranscript, setResponse, reset } = useVoiceStore();
  const { language } = useUserStore();
  const insets = useSafeAreaInsets();

  const examples = VOICE_EXAMPLES[language] || VOICE_EXAMPLES.hi;
  const webRecRef = useRef<SpeechRecognitionI | null>(null);
  const nativeRecRef = useRef<Audio.Recording | null>(null);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const recordingStoppingRef = useRef(false);

  const [fallbackText, setFallbackText] = useState('');
  const [showFallback, setShowFallback] = useState(false);
  const [interimText, setInterimText] = useState('');
  const [recordSecs, setRecordSecs] = useState(0);
  const [convHistory, setConvHistory] = useState<Array<{ user: string; ai: string }>>([]);
  const [autoRestarting, setAutoRestarting] = useState(false);
  const autoRestartRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const autoStartFnRef = useRef<() => void>(() => {});
  const scrollRef = useRef<ScrollView>(null);

  const MAX_RECORD_SECS = 8;

  // ── Animations ──────────────────────────────────────────────────────────────
  const r1Scale = useSharedValue(1); const r1Opacity = useSharedValue(0);
  const r2Scale = useSharedValue(1); const r2Opacity = useSharedValue(0);
  const r3Scale = useSharedValue(1); const r3Opacity = useSharedValue(0);
  const btnScale = useSharedValue(1);
  const b1 = useSharedValue(4); const b2 = useSharedValue(4); const b3 = useSharedValue(4);
  const b4 = useSharedValue(4); const b5 = useSharedValue(4); const b6 = useSharedValue(4);
  const b7 = useSharedValue(4);
  const bars = [b1, b2, b3, b4, b5, b6, b7];

  const isListening = status === 'listening';
  const isProcessing = status === 'processing';
  const isActive = isListening || isProcessing;
  const micColor = isActive ? '#10B981' : '#6366F1';

  useEffect(() => {
    if (isListening) {
      btnScale.value = withTiming(1.08, { duration: 200, easing: Easing.out(Easing.back(2)) });
      const ripple = (s: typeof r1Scale, o: typeof r1Opacity, d: number) => {
        s.value = withDelay(d, withRepeat(withSequence(withTiming(1, { duration: 0 }), withTiming(2.4, { duration: 1800, easing: Easing.out(Easing.quad) })), -1));
        o.value = withDelay(d, withRepeat(withSequence(withTiming(0.55, { duration: 0 }), withTiming(0, { duration: 1800, easing: Easing.out(Easing.quad) })), -1));
      };
      ripple(r1Scale, r1Opacity, 0); ripple(r2Scale, r2Opacity, 600); ripple(r3Scale, r3Opacity, 1200);
      const heights = [12, 28, 44, 52, 44, 28, 12];
      bars.forEach((b, i) => {
        b.value = withDelay(i * 60, withRepeat(withSequence(withTiming(heights[i], { duration: 300, easing: Easing.out(Easing.sin) }), withTiming(heights[i] * 0.25, { duration: 300, easing: Easing.in(Easing.sin) })), -1));
      });
    } else {
      btnScale.value = withTiming(1, { duration: 250 });
      r1Scale.value = withTiming(1, { duration: 300 }); r1Opacity.value = withTiming(0, { duration: 300 });
      r2Scale.value = withTiming(1, { duration: 300 }); r2Opacity.value = withTiming(0, { duration: 300 });
      r3Scale.value = withTiming(1, { duration: 300 }); r3Opacity.value = withTiming(0, { duration: 300 });
      bars.forEach(b => { b.value = withTiming(4, { duration: 300 }); });
    }
  }, [isListening]);

  const ring1Style = useAnimatedStyle(() => ({ transform: [{ scale: r1Scale.value }], opacity: r1Opacity.value }));
  const ring2Style = useAnimatedStyle(() => ({ transform: [{ scale: r2Scale.value }], opacity: r2Opacity.value }));
  const ring3Style = useAnimatedStyle(() => ({ transform: [{ scale: r3Scale.value }], opacity: r3Opacity.value }));
  const btnStyle  = useAnimatedStyle(() => ({ transform: [{ scale: btnScale.value }] }));
  const bar1S = useAnimatedStyle(() => ({ height: b1.value }));
  const bar2S = useAnimatedStyle(() => ({ height: b2.value }));
  const bar3S = useAnimatedStyle(() => ({ height: b3.value }));
  const bar4S = useAnimatedStyle(() => ({ height: b4.value }));
  const bar5S = useAnimatedStyle(() => ({ height: b5.value }));
  const bar6S = useAnimatedStyle(() => ({ height: b6.value }));
  const bar7S = useAnimatedStyle(() => ({ height: b7.value }));
  const barStyles = [bar1S, bar2S, bar3S, bar4S, bar5S, bar6S, bar7S];

  // ── Core: process any text through voice → coach pipeline ────────────────────
  const processTranscript = async (text: string) => {
    // Archive the previous exchange to history BEFORE overwriting it
    const prev = useVoiceStore.getState();
    if (prev.transcript && prev.responseText) {
      setConvHistory(h => [...h, { user: prev.transcript!, ai: prev.responseText! }]);
    }

    setTranscript(text);
    setResponse(null);
    setStatus('processing');
    setAutoRestarting(false);
    if (autoRestartRef.current) { clearTimeout(autoRestartRef.current); autoRestartRef.current = null; }
    if (Platform.OS !== 'web') Haptics.selectionAsync();

    // Auto-scroll to bottom
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);

    // Voice service: intent + payment detection
    try {
      const res = await apiFetch(`${API.voice()}/text`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, language }),
      }, 5000);
      if (res.ok) {
        const data = await res.json();
        if (data.response_text) {
          setResponse(data.response_text);
          setStatus('responding');
          if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

          // Auto-restart mic if AI needs confirmation or is retrying
          const needsReply = data.action === 'confirm' || data.action === 'retry';
          if (needsReply) {
            setAutoRestarting(true);
            autoRestartRef.current = setTimeout(() => {
              setAutoRestarting(false);
              autoStartFnRef.current();
            }, 1800);
          }
          return;
        }
      }
    } catch {}

    // Coach service: Claude AI fallback
    try {
      const res = await apiFetch(`${API.coach()}/message`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text, language, user_id: 'demo' }),
      }, 8000);
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.data?.response) {
          setResponse(data.data.response);
          setStatus('responding');
          if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          return;
        }
      }
    } catch {}

    setResponse('Samajh nahi aaya. Dobara bolein ya neeche type karein.');
    setStatus('responding');
  };

  // ── Web: Web Speech API with live interim results ────────────────────────────
  const startWebSpeech = () => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) { setShowFallback(true); return; }
    const rec: SpeechRecognitionI = new SR();
    rec.lang = LANG_MAP[language] || 'hi-IN';
    rec.continuous = false;
    rec.interimResults = true;   // ← live word-by-word display
    rec.maxAlternatives = 1;
    webRecRef.current = rec;

    rec.onresult = (e: any) => {
      let interim = '';
      let final = '';
      for (let i = e.resultIndex; i < e.results.length; i++) {
        if (e.results[i].isFinal) final += e.results[i][0].transcript;
        else interim += e.results[i][0].transcript;
      }
      if (interim) setInterimText(interim);
      if (final) { setInterimText(''); processTranscript(final); }
    };
    rec.onerror = (e: any) => {
      setInterimText('');
      if (e.error === 'not-allowed') { setShowFallback(true); setStatus('idle'); }
      else { setResponse('Mic access blocked. Neeche type karein.'); setStatus('responding'); }
    };
    rec.onend = () => {
      setInterimText('');
      if (useVoiceStore.getState().status === 'listening') setStatus('idle');
    };
    rec.start();
    setStatus('listening');
    setInterimText('');
    setRecordSecs(0);
  };

  // ── Native: stop recording, upload audio, process ────────────────────────────
  const stopNativeRecording = async (recording: Audio.Recording) => {
    if (recordingStoppingRef.current) return;
    recordingStoppingRef.current = true;

    if (countdownRef.current) { clearInterval(countdownRef.current); countdownRef.current = null; }
    nativeRecRef.current = null;

    try {
      await recording.stopAndUnloadAsync();
      await Audio.setAudioModeAsync({ allowsRecordingIOS: false });
      const uri = recording.getURI();
      if (!uri) throw new Error('no uri');

      setStatus('processing');
      Haptics.selectionAsync();

      const isWav = uri.endsWith('.wav');
      const formData = new FormData();
      formData.append('audio', {
        uri,
        type: isWav ? 'audio/wav' : 'audio/m4a',
        name: isWav ? 'recording.wav' : 'recording.m4a',
      } as any);
      formData.append('language', language);

      const res = await apiFetch(`${API.voice()}/process`, {
        method: 'POST',
        body: formData,
      }, 12000);

      if (res.ok) {
        const data = await res.json();
        if (data.transcript) {
          // Always route through processTranscript so history is archived
          // and auto-restart logic fires when action='confirm'/'retry'
          await processTranscript(data.transcript);
          recordingStoppingRef.current = false;
          return;
        }
      }
    } catch {}

    setResponse('Audio bhejna nahi hua. Neeche type karein.');
    setStatus('responding');
    setShowFallback(true);
    recordingStoppingRef.current = false;
  };

  const startNativeRecording = async () => {
    try {
      const { granted } = await Audio.requestPermissionsAsync();
      if (!granted) { setShowFallback(true); return; }

      await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true });
      recordingStoppingRef.current = false;

      const { recording } = await Audio.Recording.createAsync(RECORDING_OPTIONS);

      nativeRecRef.current = recording;
      setStatus('listening');
      setRecordSecs(0);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

      // Countdown timer — auto-stop when MAX_RECORD_SECS reached
      let elapsed = 0;
      countdownRef.current = setInterval(() => {
        elapsed += 1;
        setRecordSecs(elapsed);
        if (elapsed >= MAX_RECORD_SECS) {
          if (countdownRef.current) { clearInterval(countdownRef.current); countdownRef.current = null; }
          const rec = nativeRecRef.current;
          if (rec) stopNativeRecording(rec);
        }
      }, 1000);
    } catch {
      setShowFallback(true);
    }
  };

  // Wire up auto-restart ref (updated each render so closure is always fresh)
  autoStartFnRef.current = Platform.OS === 'web' ? startWebSpeech : startNativeRecording;

  // ── Mic button handler ────────────────────────────────────────────────────────
  const handleMicPress = () => {
    if (status === 'idle' || status === 'responding') {
      setShowFallback(false);
      if (Platform.OS === 'web') {
        startWebSpeech();
      } else {
        startNativeRecording();
      }
    } else if (status === 'listening') {
      if (Platform.OS === 'web') {
        webRecRef.current?.stop();
        webRecRef.current = null;
        setStatus('idle');
      } else {
        const rec = nativeRecRef.current;
        if (rec) stopNativeRecording(rec);
      }
    }
  };

  const submitFallback = () => {
    if (!fallbackText.trim()) return;
    processTranscript(fallbackText.trim());
    setFallbackText('');
    setShowFallback(false);
  };

  const handleReset = () => {
    webRecRef.current?.abort(); webRecRef.current = null;
    if (countdownRef.current) { clearInterval(countdownRef.current); countdownRef.current = null; }
    if (autoRestartRef.current) { clearTimeout(autoRestartRef.current); autoRestartRef.current = null; }
    const rec = nativeRecRef.current;
    nativeRecRef.current = null;
    recordingStoppingRef.current = false;
    rec?.stopAndUnloadAsync().catch(() => {});
    Audio.setAudioModeAsync({ allowsRecordingIOS: false }).catch(() => {});
    setShowFallback(false); setFallbackText(''); setInterimText(''); setRecordSecs(0);
    setAutoRestarting(false); setConvHistory([]);
    reset();
  };

  const topPad = Platform.OS === 'web' ? 67 : insets.top;
  const bottomPad = Platform.OS === 'web' ? 34 : insets.bottom;

  const statusLabels: Record<string, string> = {
    idle: 'Boliye...',
    listening: Platform.OS === 'web' ? 'Sun raha hoon...' : `Recording  ${MAX_RECORD_SECS - recordSecs}s`,
    processing: 'Samajh raha hoon...',
    responding: 'Jawab taiyaar',
    error: 'Dobara try karein',
  };

  return (
    <View style={[s.root, { paddingTop: topPad }]}>
      <StatusBar barStyle="light-content" />

      <View style={s.header}>
        <Text style={s.headerTitle}>Voice</Text>
        <TouchableOpacity style={s.langPill}>
          <Text style={s.langText}>
            {language === 'hi' ? 'हिंदी' : language === 'ta' ? 'தமிழ்' : language === 'te' ? 'తెలుగు' : 'English'}
          </Text>
        </TouchableOpacity>
      </View>

      <View style={s.body}>
        {/* Conversation scroll area */}
        <ScrollView
          ref={scrollRef}
          style={s.scrollArea}
          contentContainerStyle={s.scrollContent}
          showsVerticalScrollIndicator={false}
          onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })}
        >
          {/* History — previous exchanges in this session */}
          {convHistory.map((turn, i) => (
            <View key={i} style={s.historyTurn}>
              <View style={[s.transcriptBubble, s.historyBubble]}>
                <View style={s.tBadge}><Feather name="user" size={12} color="#5A5A7A" /></View>
                <Text style={[s.transcriptText, s.historyText]}>{turn.user}</Text>
              </View>
              <View style={[s.responseBubble, s.historyBubble]}>
                <View style={s.rBadge}><Feather name="cpu" size={12} color="#4A4A6E" /></View>
                <Text style={[s.responseTextStyle, s.historyText]}>{turn.ai}</Text>
              </View>
            </View>
          ))}

          {/* Current turn */}
          {transcript && (
            <View style={s.transcriptBubble}>
              <View style={s.tBadge}><Feather name="user" size={12} color="#8B8BAD" /></View>
              <Text style={s.transcriptText}>{transcript}</Text>
            </View>
          )}
          {responseText && (
            <View style={s.responseBubble}>
              <View style={s.rBadge}><Feather name="cpu" size={12} color="#6366F1" /></View>
              <Text style={s.responseTextStyle}>{responseText}</Text>
            </View>
          )}

          {/* Auto-restart indicator */}
          {autoRestarting && (
            <View style={s.autoRestartBadge}>
              <Feather name="mic" size={12} color="#10B981" />
              <Text style={s.autoRestartText}>Listening in a moment...</Text>
            </View>
          )}

          {/* Live interim text while speaking (web) */}
          {isListening && interimText ? (
            <View style={s.interimBubble}>
              <View style={s.tBadge}><Feather name="user" size={12} color="#8B8BAD" /></View>
              <Text style={s.interimText}>{interimText}</Text>
            </View>
          ) : null}

          {/* Native: countdown progress bar */}
          {isListening && Platform.OS !== 'web' ? (
            <View style={s.countdownWrap}>
              <View style={[s.countdownBar, { width: `${((MAX_RECORD_SECS - recordSecs) / MAX_RECORD_SECS) * 100}%` as any }]} />
              <Text style={s.countdownHint}>Tap mic to stop early</Text>
            </View>
          ) : null}

          {/* Empty state examples */}
          {convHistory.length === 0 && !transcript && !responseText && !isActive && !showFallback && !interimText && (
            <View style={s.examplesArea}>
              <Text style={s.examplesTitle}>Try saying:</Text>
              {examples.slice(0, 3).map((ex, i) => (
                <View key={i} style={s.exampleRow}>
                  <Feather name="chevron-right" size={12} color="#5A5A7A" />
                  <Text style={s.exampleText}>"{ex}"</Text>
                </View>
              ))}
            </View>
          )}
        </ScrollView>

        {/* Mic button + rings */}
        <View style={s.micArea}>
          <View style={s.waveform}>
            {barStyles.map((style, i) => (
              <Animated.View key={i} style={[s.waveBar, style, { backgroundColor: micColor }]} />
            ))}
          </View>

          <View style={s.ringContainer}>
            <Animated.View style={[s.ring, { backgroundColor: micColor }, ring3Style]} />
            <Animated.View style={[s.ring, { backgroundColor: micColor }, ring2Style]} />
            <Animated.View style={[s.ring, { backgroundColor: micColor }, ring1Style]} />
            <Animated.View style={btnStyle}>
              <TouchableOpacity
                style={[s.micBtn, { backgroundColor: isProcessing ? '#3B3B6E' : micColor }]}
                onPress={handleMicPress}
                activeOpacity={0.85}
                disabled={isProcessing}
              >
                {isProcessing
                  ? <Feather name="loader" size={36} color="#FFF" />
                  : <Feather name="mic" size={36} color="#FFF" />
                }
              </TouchableOpacity>
            </Animated.View>
          </View>

          <Text style={s.statusText}>{statusLabels[status] ?? 'Boliye...'}</Text>
          {status === 'responding' && (
            <TouchableOpacity onPress={handleReset} style={s.resetBtn}>
              <Feather name="rotate-ccw" size={14} color="#8B8BAD" />
              <Text style={s.resetText}>Reset</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Fallback text input */}
        {showFallback && (
          <View style={s.fallbackWrap}>
            <View style={s.fallbackCard}>
              <TextInput
                style={s.fallbackInput}
                placeholder="Type your command..."
                placeholderTextColor="#3A3A5A"
                value={fallbackText}
                onChangeText={setFallbackText}
                onSubmitEditing={submitFallback}
                returnKeyType="send"
                autoFocus
              />
              <TouchableOpacity
                style={[s.fallbackSend, fallbackText.trim() ? s.fallbackSendActive : null]}
                onPress={submitFallback}
                disabled={!fallbackText.trim()}
              >
                <Feather name="arrow-up" size={18} color={fallbackText.trim() ? '#080812' : '#3A3A5A'} />
              </TouchableOpacity>
            </View>
            <TouchableOpacity onPress={() => setShowFallback(false)} style={s.dismissBtn}>
              <Text style={s.dismissText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Example chips — tap to run through real pipeline */}
        <View style={[s.chipsArea, { paddingBottom: bottomPad + 24 }]}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.chipsScroll}>
            {examples.map((ex, i) => (
              <TouchableOpacity key={i} style={s.chip} activeOpacity={0.7}
                onPress={() => processTranscript(ex)}>
                <Feather name="mic" size={11} color="#6366F1" />
                <Text style={s.chipText}>{ex}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#080812' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingBottom: 16,
  },
  headerTitle: { color: '#EEF2FF', fontSize: 28, fontWeight: '700', fontFamily: 'Inter_700Bold', letterSpacing: -0.5 },
  langPill: {
    backgroundColor: '#14142A', borderRadius: 20, borderWidth: 1, borderColor: '#1E2040',
    paddingHorizontal: 14, paddingVertical: 7,
  },
  langText: { color: '#8B8BAD', fontSize: 13, fontFamily: 'Inter_500Medium' },
  body: { flex: 1, flexDirection: 'column' },
  scrollArea: { flex: 1 },
  scrollContent: { flexGrow: 1, paddingHorizontal: 24, paddingBottom: 8, gap: 10, justifyContent: 'flex-end' },
  historyTurn: { gap: 8, opacity: 0.45 },
  historyBubble: { borderColor: '#16162A' },
  historyText: { color: '#6A6A9A', fontSize: 14 },
  autoRestartBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'center',
    backgroundColor: '#0D1F1A', borderRadius: 20, borderWidth: 1, borderColor: '#1A3B30',
    paddingHorizontal: 12, paddingVertical: 6,
  },
  autoRestartText: { color: '#10B981', fontSize: 12, fontFamily: 'Inter_500Medium' },
  transcriptBubble: {
    backgroundColor: '#14142A', borderRadius: 16, borderWidth: 1, borderColor: '#1E2040',
    padding: 16, flexDirection: 'row', gap: 10, alignSelf: 'flex-end', maxWidth: '85%',
  },
  tBadge: { width: 24, height: 24, borderRadius: 12, backgroundColor: '#1E2040', justifyContent: 'center', alignItems: 'center' },
  transcriptText: { color: '#C8D0F0', fontSize: 15, lineHeight: 22, flex: 1, fontFamily: 'Inter_400Regular' },
  responseBubble: {
    backgroundColor: '#0F0F1E', borderRadius: 16, borderWidth: 1, borderColor: '#1E2040',
    padding: 16, flexDirection: 'row', gap: 10, alignSelf: 'flex-start', maxWidth: '90%',
  },
  rBadge: { width: 24, height: 24, borderRadius: 12, backgroundColor: '#13133A', justifyContent: 'center', alignItems: 'center' },
  responseTextStyle: { color: '#EEF2FF', fontSize: 15, lineHeight: 23, flex: 1, fontFamily: 'Inter_400Regular' },
  interimBubble: {
    backgroundColor: '#14142A', borderRadius: 16, borderWidth: 1, borderColor: '#2E2E60',
    padding: 14, flexDirection: 'row', gap: 10, alignSelf: 'flex-end', maxWidth: '85%',
  },
  interimText: { color: '#8B8BAD', fontSize: 15, lineHeight: 22, flex: 1, fontFamily: 'Inter_400Regular', fontStyle: 'italic' },
  countdownWrap: {
    width: '100%', backgroundColor: '#0F0F1E',
    borderRadius: 12, borderWidth: 1, borderColor: '#1E2040',
    overflow: 'hidden', marginBottom: 8,
  },
  countdownBar: {
    height: 4, backgroundColor: '#10B981',
    borderRadius: 12, alignSelf: 'flex-start',
  },
  countdownHint: { color: '#5A5A7A', fontSize: 12, textAlign: 'center', paddingVertical: 6 },
  examplesArea: { alignItems: 'center', gap: 10 },
  examplesTitle: { color: '#5A5A7A', fontSize: 13, fontWeight: '600', letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 4 },
  exampleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  exampleText: { color: '#4A4A6A', fontSize: 15, fontStyle: 'italic', fontFamily: 'Inter_400Regular' },
  micArea: { alignItems: 'center', paddingVertical: 20, gap: 16 },
  waveform: { flexDirection: 'row', alignItems: 'center', gap: 4, height: 56, paddingHorizontal: 8 },
  waveBar: { width: 4, borderRadius: 3, minHeight: 4 },
  ringContainer: { width: 130, height: 130, alignItems: 'center', justifyContent: 'center' },
  ring: { position: 'absolute', width: 130, height: 130, borderRadius: 65 },
  micBtn: {
    width: 130, height: 130, borderRadius: 65, justifyContent: 'center', alignItems: 'center',
    shadowColor: '#6366F1', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.4, shadowRadius: 24, elevation: 12,
  },
  statusText: { color: '#8B8BAD', fontSize: 15, fontFamily: 'Inter_400Regular' },
  resetBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 6 },
  resetText: { color: '#8B8BAD', fontSize: 13, fontFamily: 'Inter_400Regular' },
  fallbackWrap: { paddingHorizontal: 20, paddingBottom: 8, gap: 8 },
  fallbackCard: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#0F0F1E', borderRadius: 18, borderWidth: 1, borderColor: '#1E2040',
    paddingHorizontal: 16, paddingVertical: 10, gap: 10,
  },
  fallbackInput: {
    flex: 1, color: '#EEF2FF', fontSize: 15, fontFamily: 'Inter_400Regular', paddingVertical: 4,
    ...(Platform.OS === 'web' ? { outlineStyle: 'none' as any } : {}),
  },
  fallbackSend: {
    width: 34, height: 34, borderRadius: 17, backgroundColor: '#1E2040',
    justifyContent: 'center', alignItems: 'center',
  },
  fallbackSendActive: {
    backgroundColor: '#EEF2FF',
    shadowColor: '#EEF2FF', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.3, shadowRadius: 8,
  },
  dismissBtn: { alignSelf: 'center', paddingVertical: 6 },
  dismissText: { color: '#5A5A7A', fontSize: 13 },
  chipsArea: { paddingTop: 4 },
  chipsScroll: { paddingHorizontal: 20, gap: 8 },
  chip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: '#0F0F1E', borderRadius: 20, borderWidth: 1, borderColor: '#1E2040',
    paddingHorizontal: 14, paddingVertical: 10,
  },
  chipText: { color: '#6870A0', fontSize: 13, fontFamily: 'Inter_400Regular' },
});
