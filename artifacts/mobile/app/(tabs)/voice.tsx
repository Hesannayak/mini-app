import React, { useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  Platform, StatusBar,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withRepeat,
  withSequence,
  withDelay,
  Easing,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { useVoiceStore } from '@/store/voiceStore';
import { useUserStore } from '@/store/userStore';
import { VOICE_EXAMPLES } from '@/constants/intents';

const MOCK_RESPONSES = [
  'Aapka is hafte ka total kharch ₹8,420 hua hai. Sabse zyada khana pe ₹2,800 gaya.',
  'Account mein ₹42,350 hain. Aaj ₹1,240 ka kharch hua.',
  'Tata Power ka bill ₹1,420 hai, 2 din mein due hai. Abhi pay karein?',
  'Mini Score 72 hai — last week se 3 point up. Bijli bill time pe bhari isliye!',
];

export default function VoiceScreen() {
  const { status, transcript, responseText, setStatus, setTranscript, setResponse, reset } = useVoiceStore();
  const { language } = useUserStore();
  const insets = useSafeAreaInsets();
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const examples = VOICE_EXAMPLES[language] || VOICE_EXAMPLES.hi;

  // Ring animations (ripple/sonar effect)
  const r1Scale = useSharedValue(1);
  const r1Opacity = useSharedValue(0);
  const r2Scale = useSharedValue(1);
  const r2Opacity = useSharedValue(0);
  const r3Scale = useSharedValue(1);
  const r3Opacity = useSharedValue(0);

  // Button scale
  const btnScale = useSharedValue(1);

  // Waveform bars
  const b1 = useSharedValue(4);
  const b2 = useSharedValue(4);
  const b3 = useSharedValue(4);
  const b4 = useSharedValue(4);
  const b5 = useSharedValue(4);
  const b6 = useSharedValue(4);
  const b7 = useSharedValue(4);

  const isListening = status === 'listening';
  const isProcessing = status === 'processing';
  const isActive = isListening || isProcessing;

  useEffect(() => {
    if (isListening) {
      btnScale.value = withTiming(1.08, { duration: 200, easing: Easing.out(Easing.back(2)) });

      // Ripple rings
      const ripple = (scale: Animated.SharedValue<number>, opacity: Animated.SharedValue<number>, delay: number) => {
        scale.value = withDelay(delay, withRepeat(
          withSequence(
            withTiming(1, { duration: 0 }),
            withTiming(2.4, { duration: 1800, easing: Easing.out(Easing.quad) }),
          ), -1
        ));
        opacity.value = withDelay(delay, withRepeat(
          withSequence(
            withTiming(0.55, { duration: 0 }),
            withTiming(0, { duration: 1800, easing: Easing.out(Easing.quad) }),
          ), -1
        ));
      };
      ripple(r1Scale, r1Opacity, 0);
      ripple(r2Scale, r2Opacity, 600);
      ripple(r3Scale, r3Opacity, 1200);

      // Waveform
      const heights = [12, 28, 44, 52, 44, 28, 12];
      const bars = [b1, b2, b3, b4, b5, b6, b7];
      bars.forEach((b, i) => {
        b.value = withDelay(i * 60, withRepeat(
          withSequence(
            withTiming(heights[i], { duration: 300, easing: Easing.out(Easing.sin) }),
            withTiming(heights[i] * 0.25, { duration: 300, easing: Easing.in(Easing.sin) }),
          ), -1
        ));
      });
    } else {
      btnScale.value = withTiming(1, { duration: 250 });
      r1Scale.value = withTiming(1, { duration: 300 }); r1Opacity.value = withTiming(0, { duration: 300 });
      r2Scale.value = withTiming(1, { duration: 300 }); r2Opacity.value = withTiming(0, { duration: 300 });
      r3Scale.value = withTiming(1, { duration: 300 }); r3Opacity.value = withTiming(0, { duration: 300 });
      [b1, b2, b3, b4, b5, b6, b7].forEach(b => { b.value = withTiming(4, { duration: 300 }); });
    }
  }, [isListening]);

  const ring1Style = useAnimatedStyle(() => ({ transform: [{ scale: r1Scale.value }], opacity: r1Opacity.value }));
  const ring2Style = useAnimatedStyle(() => ({ transform: [{ scale: r2Scale.value }], opacity: r2Opacity.value }));
  const ring3Style = useAnimatedStyle(() => ({ transform: [{ scale: r3Scale.value }], opacity: r3Opacity.value }));
  const btnStyle = useAnimatedStyle(() => ({ transform: [{ scale: btnScale.value }] }));
  const bar1S = useAnimatedStyle(() => ({ height: b1.value }));
  const bar2S = useAnimatedStyle(() => ({ height: b2.value }));
  const bar3S = useAnimatedStyle(() => ({ height: b3.value }));
  const bar4S = useAnimatedStyle(() => ({ height: b4.value }));
  const bar5S = useAnimatedStyle(() => ({ height: b5.value }));
  const bar6S = useAnimatedStyle(() => ({ height: b6.value }));
  const bar7S = useAnimatedStyle(() => ({ height: b7.value }));
  const barStyles = [bar1S, bar2S, bar3S, bar4S, bar5S, bar6S, bar7S];

  const handleMicPress = () => {
    if (timerRef.current) clearTimeout(timerRef.current);

    if (status === 'idle' || status === 'responding') {
      if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      setStatus('listening');
      setTranscript(null);
      setResponse(null);

      timerRef.current = setTimeout(() => {
        setStatus('processing');
        setTranscript(examples[Math.floor(Math.random() * examples.length)]);

        setTimeout(() => {
          const response = MOCK_RESPONSES[Math.floor(Math.random() * MOCK_RESPONSES.length)];
          setResponse(response);
          setStatus('responding');
          if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }, 1200);
      }, 3000);

    } else if (status === 'listening') {
      if (Platform.OS !== 'web') Haptics.selectionAsync();
      setStatus('idle');
      setTranscript(null);
    }
  };

  const handleReset = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    reset();
  };

  const topPad = Platform.OS === 'web' ? 67 : insets.top;
  const bottomPad = Platform.OS === 'web' ? 34 : insets.bottom;

  const statusLabels: Record<string, string> = {
    idle: 'Boliye...',
    listening: 'Sun raha hoon',
    processing: 'Samajh raha hoon...',
    responding: 'Jawab taiyaar',
    error: 'Dobara try karein',
  };

  const micColor = isActive ? '#10B981' : '#6366F1';

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
        {/* Response/transcript area */}
        <View style={s.responseArea}>
          {transcript && (
            <View style={s.transcriptBubble}>
              <View style={s.tBadge}><Feather name="user" size={12} color="#8B8BAD" /></View>
              <Text style={s.transcriptText}>{transcript}</Text>
            </View>
          )}
          {responseText && (
            <View style={s.responseBubble}>
              <View style={s.rBadge}><Feather name="cpu" size={12} color="#6366F1" /></View>
              <Text style={s.responseText}>{responseText}</Text>
            </View>
          )}
          {!transcript && !responseText && !isActive && (
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
        </View>

        {/* Mic button + rings */}
        <View style={s.micArea}>
          {/* Waveform */}
          <View style={s.waveform}>
            {barStyles.map((style, i) => (
              <Animated.View key={i} style={[s.waveBar, style, { backgroundColor: micColor }]} />
            ))}
          </View>

          {/* Rings container */}
          <View style={s.ringContainer}>
            <Animated.View style={[s.ring, { backgroundColor: micColor }, ring3Style]} />
            <Animated.View style={[s.ring, { backgroundColor: micColor }, ring2Style]} />
            <Animated.View style={[s.ring, { backgroundColor: micColor }, ring1Style]} />

            <Animated.View style={btnStyle}>
              <TouchableOpacity
                style={[s.micBtn, { backgroundColor: micColor }]}
                onPress={handleMicPress}
                activeOpacity={0.85}
              >
                {isProcessing
                  ? <Feather name="loader" size={36} color="#FFFFFF" />
                  : <Feather name={isListening ? 'mic' : 'mic'} size={36} color="#FFFFFF" />
                }
              </TouchableOpacity>
            </Animated.View>
          </View>

          <Text style={s.statusText}>{statusLabels[status]}</Text>
          {(status === 'responding') && (
            <TouchableOpacity onPress={handleReset} style={s.resetBtn}>
              <Feather name="rotate-ccw" size={14} color="#8B8BAD" />
              <Text style={s.resetText}>Reset</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Example chips */}
        <View style={[s.chipsArea, { paddingBottom: bottomPad + 24 }]}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.chipsScroll}>
            {examples.map((ex, i) => (
              <TouchableOpacity key={i} style={s.chip} activeOpacity={0.7}>
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
    backgroundColor: '#14142A', borderRadius: 20,
    borderWidth: 1, borderColor: '#1E2040',
    paddingHorizontal: 14, paddingVertical: 7,
  },
  langText: { color: '#8B8BAD', fontSize: 13, fontFamily: 'Inter_500Medium' },

  body: { flex: 1, flexDirection: 'column' },

  responseArea: { flex: 1, paddingHorizontal: 24, justifyContent: 'center', gap: 12 },

  transcriptBubble: {
    backgroundColor: '#14142A', borderRadius: 16,
    borderWidth: 1, borderColor: '#1E2040',
    padding: 16, flexDirection: 'row', gap: 10,
    alignSelf: 'flex-end', maxWidth: '85%',
  },
  tBadge: {
    width: 24, height: 24, borderRadius: 12,
    backgroundColor: '#1E2040', justifyContent: 'center', alignItems: 'center',
  },
  transcriptText: { color: '#C8D0F0', fontSize: 15, lineHeight: 22, flex: 1, fontFamily: 'Inter_400Regular' },

  responseBubble: {
    backgroundColor: '#0F0F1E', borderRadius: 16,
    borderWidth: 1, borderColor: '#1E2040',
    padding: 16, flexDirection: 'row', gap: 10,
    alignSelf: 'flex-start', maxWidth: '90%',
  },
  rBadge: {
    width: 24, height: 24, borderRadius: 12,
    backgroundColor: '#13133A', justifyContent: 'center', alignItems: 'center',
  },
  responseText: { color: '#EEF2FF', fontSize: 15, lineHeight: 23, flex: 1, fontFamily: 'Inter_400Regular' },

  examplesArea: { alignItems: 'center', gap: 10 },
  examplesTitle: { color: '#5A5A7A', fontSize: 13, fontWeight: '600', letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 4 },
  exampleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  exampleText: { color: '#4A4A6A', fontSize: 15, fontStyle: 'italic', fontFamily: 'Inter_400Regular' },

  micArea: { alignItems: 'center', paddingVertical: 20, gap: 16 },

  waveform: {
    flexDirection: 'row', alignItems: 'center', gap: 4, height: 56,
    paddingHorizontal: 8,
  },
  waveBar: { width: 4, borderRadius: 3, minHeight: 4 },

  ringContainer: { width: 130, height: 130, alignItems: 'center', justifyContent: 'center' },
  ring: { position: 'absolute', width: 130, height: 130, borderRadius: 65 },

  micBtn: {
    width: 130, height: 130, borderRadius: 65,
    justifyContent: 'center', alignItems: 'center',
    shadowColor: '#6366F1', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.4, shadowRadius: 24,
    elevation: 12,
  },

  statusText: { color: '#8B8BAD', fontSize: 15, fontFamily: 'Inter_400Regular' },

  resetBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 6 },
  resetText: { color: '#8B8BAD', fontSize: 13, fontFamily: 'Inter_400Regular' },

  chipsArea: { paddingTop: 4 },
  chipsScroll: { paddingHorizontal: 20, gap: 8 },
  chip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: '#0F0F1E', borderRadius: 20,
    borderWidth: 1, borderColor: '#1E2040',
    paddingHorizontal: 14, paddingVertical: 10,
  },
  chipText: { color: '#6870A0', fontSize: 13, fontFamily: 'Inter_400Regular' },
});
