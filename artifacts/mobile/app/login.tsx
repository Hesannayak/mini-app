import React, { useState, useRef } from 'react';
import {
  View, Text, TextInput, StyleSheet, TouchableOpacity,
  Platform, KeyboardAvoidingView, ScrollView, StatusBar,
} from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import MiniLogo from '@/components/MiniLogo';
import { useAuthStore } from '@/store/authStore';
import { useUserStore } from '@/store/userStore';
import { API } from '@/lib/api';

type Step = 'phone' | 'otp' | 'name';

export default function LoginScreen() {
  const [step, setStep] = useState<Step>('phone');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { setTokens, setPhone: savePhone } = useAuthStore();
  const { setUser } = useUserStore();
  const otpRefs = useRef<(TextInput | null)[]>([]);
  const insets = useSafeAreaInsets();

  const haptic = () => {
    if (Platform.OS !== 'web') Haptics.selectionAsync();
  };

  const sendOtp = async () => {
    if (phone.length !== 10 || !/^[6-9]/.test(phone)) {
      setError('Valid 10-digit number daalo');
      return;
    }
    setError('');
    setLoading(true);
    try {
      const res = await fetch(`${API.auth()}/otp/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone }),
      });
      const data = await res.json();
      if (data.success) {
        haptic();
        setStep('otp');
        setTimeout(() => otpRefs.current[0]?.focus(), 300);
      } else {
        setError(data.error || 'OTP bhej nahi paaye');
      }
    } catch {
      // Demo mode: skip auth
      haptic();
      setStep('otp');
      setTimeout(() => otpRefs.current[0]?.focus(), 300);
    } finally {
      setLoading(false);
    }
  };

  const verifyOtp = async () => {
    const otpString = otp.join('');
    if (otpString.length !== 6) { setError('6 digit OTP daalo'); return; }
    setError('');
    setLoading(true);
    try {
      const res = await fetch(`${API.auth()}/otp/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, otp: otpString }),
      });
      const data = await res.json();
      if (data.success) {
        const { access_token, refresh_token, user } = data.data;
        setTokens(access_token, refresh_token);
        savePhone(phone);
        if (user.name) {
          setUser({ name: user.name, language: user.language || 'hi', permissionLevel: user.permission_level, miniScore: user.mini_score });
          router.replace('/(tabs)');
        } else {
          setStep('name');
        }
      } else {
        setError(data.error || 'Galat OTP');
      }
    } catch {
      // Demo mode: skip verification
      haptic();
      setStep('name');
    } finally {
      setLoading(false);
    }
  };

  const saveName = () => {
    if (!name.trim()) { setError('Apna naam batao'); return; }
    haptic();
    setTokens('demo_access_token', 'demo_refresh_token');
    savePhone(phone || '9999999999');
    setUser({ name: name.trim(), language: 'hi', permissionLevel: 1, miniScore: 72 });
    router.replace('/(tabs)');
  };

  const handleOtpChange = (text: string, index: number) => {
    const digit = text.replace(/\D/g, '').slice(-1);
    const newOtp = [...otp];
    newOtp[index] = digit;
    setOtp(newOtp);
    setError('');
    if (digit && index < 5) otpRefs.current[index + 1]?.focus();
    if (digit && index === 5) verifyOtp();
  };

  const handleOtpKeyPress = (key: string, index: number) => {
    if (key === 'Backspace' && !otp[index] && index > 0) otpRefs.current[index - 1]?.focus();
  };

  const topPad = Platform.OS === 'web' ? 60 : insets.top + 16;

  return (
    <KeyboardAvoidingView style={s.root} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <StatusBar barStyle="light-content" />
      <ScrollView
        contentContainerStyle={[s.scroll, { paddingTop: topPad }]}
        keyboardShouldPersistTaps="handled"
      >
        <View style={s.logoArea}>
          <View style={s.logoRing}>
            <MiniLogo size={56} />
          </View>
          <Text style={s.appName}>Mini</Text>
          <Text style={s.tagline}>Apni bhaasha mein, apna paisa</Text>
        </View>

        {step === 'phone' && (
          <View style={s.card}>
            <Text style={s.cardTitle}>Welcome back</Text>
            <Text style={s.cardSub}>Enter your phone number to continue</Text>

            <View style={s.phoneRow}>
              <View style={s.prefixBox}>
                <Text style={s.flagText}>IN</Text>
                <Text style={s.prefixText}>+91</Text>
              </View>
              <TextInput
                style={s.phoneInput}
                placeholder="Phone number"
                placeholderTextColor="#4A4A6A"
                value={phone}
                onChangeText={(t) => { setPhone(t.replace(/\D/g, '').slice(0, 10)); setError(''); }}
                keyboardType="number-pad"
                maxLength={10}
                autoFocus
                returnKeyType="done"
                onSubmitEditing={sendOtp}
              />
            </View>

            {error ? <Text style={s.error}>{error}</Text> : null}

            <TouchableOpacity
              style={[s.btn, phone.length === 10 && s.btnActive]}
              onPress={sendOtp}
              disabled={loading || phone.length !== 10}
              activeOpacity={0.85}
            >
              {loading
                ? <MiniLogo size={22} spinning />
                : <Text style={[s.btnText, phone.length === 10 && s.btnTextActive]}>Continue</Text>
              }
            </TouchableOpacity>

            <Text style={s.terms}>By continuing you agree to Mini's Terms of Service</Text>

            <TouchableOpacity
              style={s.demoBtn}
              onPress={() => {
                haptic();
                setTokens('demo_access_token', 'demo_refresh_token');
                setPhone('9876543210');
                setUser({ name: 'Rahul', language: 'hi', permissionLevel: 2, miniScore: 72 });
                router.replace('/(tabs)');
              }}
            >
              <Text style={s.demoText}>Skip — Try Demo</Text>
            </TouchableOpacity>
          </View>
        )}

        {step === 'otp' && (
          <View style={s.card}>
            <TouchableOpacity style={s.backRow} onPress={() => { setStep('phone'); setOtp(['','','','','','']); setError(''); }}>
              <Feather name="arrow-left" size={16} color="#8B8BAD" />
              <Text style={s.backText}>Change number</Text>
            </TouchableOpacity>

            <Text style={s.cardTitle}>Verify OTP</Text>
            <Text style={s.cardSub}>
              Sent to <Text style={s.phoneHighlight}>+91 {phone.slice(0,5)} {phone.slice(5)}</Text>
            </Text>

            <View style={s.otpRow}>
              {otp.map((digit, i) => (
                <TextInput
                  key={i}
                  ref={(r) => { otpRefs.current[i] = r; }}
                  style={[s.otpBox, digit ? s.otpBoxFilled : null]}
                  value={digit}
                  onChangeText={(t) => handleOtpChange(t, i)}
                  onKeyPress={({ nativeEvent }) => handleOtpKeyPress(nativeEvent.key, i)}
                  keyboardType="number-pad"
                  maxLength={1}
                  selectTextOnFocus
                />
              ))}
            </View>

            {error ? <Text style={s.error}>{error}</Text> : null}

            <TouchableOpacity
              style={[s.btn, otp.join('').length === 6 && s.btnActive]}
              onPress={verifyOtp}
              disabled={loading || otp.join('').length !== 6}
              activeOpacity={0.85}
            >
              {loading ? <MiniLogo size={22} spinning /> : <Text style={[s.btnText, otp.join('').length === 6 && s.btnTextActive]}>Verify</Text>}
            </TouchableOpacity>

            <TouchableOpacity style={s.resendRow} onPress={sendOtp} disabled={loading}>
              <Text style={s.linkText}>Resend OTP</Text>
            </TouchableOpacity>
          </View>
        )}

        {step === 'name' && (
          <View style={s.card}>
            <Text style={s.cardTitle}>Aapka naam?</Text>
            <Text style={s.cardSub}>Mini aapko isi naam se bulayega</Text>

            <TextInput
              style={s.nameInput}
              placeholder="Your name"
              placeholderTextColor="#4A4A6A"
              value={name}
              onChangeText={(t) => { setName(t); setError(''); }}
              autoFocus
              onSubmitEditing={saveName}
              returnKeyType="done"
            />

            {error ? <Text style={s.error}>{error}</Text> : null}

            <TouchableOpacity
              style={[s.btn, name.trim() ? s.btnActive : null]}
              onPress={saveName}
              disabled={!name.trim()}
              activeOpacity={0.85}
            >
              <Text style={[s.btnText, name.trim() ? s.btnTextActive : null]}>Start using Mini</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#080812' },
  scroll: { flexGrow: 1, justifyContent: 'center', paddingHorizontal: 20, paddingBottom: 48 },

  logoArea: { alignItems: 'center', marginBottom: 40 },
  logoRing: {
    width: 96, height: 96, borderRadius: 48,
    backgroundColor: '#14142A',
    borderWidth: 1.5, borderColor: '#1E2040',
    justifyContent: 'center', alignItems: 'center',
    marginBottom: 20,
    shadowColor: '#6366F1', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.25, shadowRadius: 24,
  },
  appName: { color: '#EEF2FF', fontSize: 34, fontWeight: '800', letterSpacing: -1, fontFamily: 'Inter_700Bold' },
  tagline: { color: '#5A5A7A', fontSize: 14, marginTop: 8, fontStyle: 'italic' },

  card: {
    backgroundColor: '#0F0F1E',
    borderRadius: 24,
    borderWidth: 1, borderColor: '#1E2040',
    padding: 28,
    overflow: 'hidden',
  },

  backRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 20 },
  backText: { color: '#8B8BAD', fontSize: 14 },

  cardTitle: { color: '#EEF2FF', fontSize: 24, fontWeight: '700', marginBottom: 6, letterSpacing: -0.5, fontFamily: 'Inter_700Bold' },
  cardSub: { color: '#8B8BAD', fontSize: 15, marginBottom: 8, lineHeight: 22 },

  phoneDisplay: { color: '#6366F1', fontSize: 15, fontWeight: '600', marginBottom: 28 },
  phoneHighlight: { color: '#6366F1', fontWeight: '600' },

  phoneRow: { flexDirection: 'row', marginTop: 20, marginBottom: 24, gap: 10, overflow: 'hidden' },
  prefixBox: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#14142A', borderRadius: 14,
    borderWidth: 1.5, borderColor: '#1E2040',
    paddingHorizontal: 12, gap: 5, flexShrink: 0,
  },
  flagText: { color: '#6366F1', fontSize: 11, fontWeight: '700', letterSpacing: 0.5 },
  prefixText: { color: '#8B8BAD', fontSize: 14, fontWeight: '600', fontFamily: 'Inter_600SemiBold' },
  phoneInput: {
    flex: 1, minWidth: 0, backgroundColor: '#14142A', borderRadius: 14,
    borderWidth: 1.5, borderColor: '#1E2040',
    paddingHorizontal: 14, paddingVertical: 16,
    color: '#EEF2FF', fontSize: 18, fontWeight: '600',
    letterSpacing: 0.5, fontFamily: 'Inter_600SemiBold',
    ...(Platform.OS === 'web' ? { outlineStyle: 'none' as any } : {}),
  },

  otpRow: { flexDirection: 'row', gap: 6, marginTop: 24, marginBottom: 28, overflow: 'hidden' },
  otpBox: {
    flex: 1, minWidth: 0, height: 56, backgroundColor: '#14142A',
    borderRadius: 12, borderWidth: 1.5, borderColor: '#1E2040',
    textAlign: 'center', color: '#EEF2FF',
    fontSize: 22, fontWeight: '700', fontFamily: 'Inter_700Bold',
    ...(Platform.OS === 'web' ? { outlineStyle: 'none' as any } : {}),
  },
  otpBoxFilled: { borderColor: '#6366F1', backgroundColor: '#13133A' },

  resendRow: { alignItems: 'center', marginTop: 16 },

  nameInput: {
    backgroundColor: '#14142A', borderRadius: 14,
    borderWidth: 1.5, borderColor: '#1E2040',
    paddingHorizontal: 18, paddingVertical: 18,
    color: '#EEF2FF', fontSize: 20, fontWeight: '600',
    marginTop: 20, marginBottom: 24, fontFamily: 'Inter_600SemiBold',
    ...(Platform.OS === 'web' ? { outlineStyle: 'none' as any } : {}),
  },

  btn: {
    backgroundColor: '#14142A', borderRadius: 14, paddingVertical: 18,
    alignItems: 'center', borderWidth: 1.5, borderColor: '#1E2040',
    marginTop: 4,
  },
  btnActive: {
    backgroundColor: '#6366F1', borderColor: '#6366F1',
    shadowColor: '#6366F1', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.4, shadowRadius: 16,
    elevation: 8,
  },
  btnText: { color: '#5A5A7A', fontSize: 17, fontWeight: '700', fontFamily: 'Inter_700Bold' },
  btnTextActive: { color: '#FFFFFF' },

  error: { color: '#EF4444', fontSize: 13, marginBottom: 16, textAlign: 'center' },
  linkText: { color: '#6366F1', fontSize: 14, fontWeight: '500', fontFamily: 'Inter_500Medium' },

  terms: { color: '#3A3A5A', fontSize: 12, textAlign: 'center', marginTop: 20, lineHeight: 18 },
  demoBtn: { alignSelf: 'center', marginTop: 12, paddingVertical: 8, paddingHorizontal: 16 },
  demoText: { color: '#4A4A6A', fontSize: 13, fontFamily: 'Inter_400Regular', textDecorationLine: 'underline' },
});
