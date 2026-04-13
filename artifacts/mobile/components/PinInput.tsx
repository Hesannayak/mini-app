import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, TextInput, StyleSheet, TouchableOpacity, Modal, Animated, Platform,
} from 'react-native';
import * as Haptics from 'expo-haptics';

interface PinInputProps {
  visible: boolean;
  amount: number;
  payee: string;
  onConfirm: (pin: string) => void;
  onCancel: () => void;
}

const CORRECT_PIN = '1234';
const MAX_TRIES = 3;

export default function PinInput({ visible, amount, payee, onConfirm, onCancel }: PinInputProps) {
  const [pin, setPin] = useState('');
  const [tries, setTries] = useState(0);
  const [error, setError] = useState('');
  const [locked, setLocked] = useState(false);
  const inputRef = useRef<TextInput>(null);
  const shakeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      setPin('');
      setTries(0);
      setError('');
      setLocked(false);
      setTimeout(() => inputRef.current?.focus(), 300);
    }
  }, [visible]);

  const shake = () => {
    if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 10, duration: 60, useNativeDriver: false }),
      Animated.timing(shakeAnim, { toValue: -10, duration: 60, useNativeDriver: false }),
      Animated.timing(shakeAnim, { toValue: 6, duration: 60, useNativeDriver: false }),
      Animated.timing(shakeAnim, { toValue: -6, duration: 60, useNativeDriver: false }),
      Animated.timing(shakeAnim, { toValue: 0, duration: 60, useNativeDriver: false }),
    ]).start();
  };

  const handleChange = (text: string) => {
    if (locked) return;
    const cleaned = text.replace(/\D/g, '').slice(0, 4);
    setPin(cleaned);
    setError('');

    if (cleaned.length === 4) {
      setTimeout(() => {
        if (cleaned === CORRECT_PIN) {
          onConfirm(cleaned);
          setPin('');
        } else {
          const newTries = tries + 1;
          setTries(newTries);
          shake();
          if (newTries >= MAX_TRIES) {
            setError('3 galat PIN. Payment blocked.');
            setLocked(true);
          } else {
            setError(`Galat PIN. ${MAX_TRIES - newTries} try baaki.`);
            setPin('');
            setTimeout(() => inputRef.current?.focus(), 200);
          }
        }
      }, 150);
    }
  };

  const handleCancel = () => {
    setPin(''); setTries(0); setError(''); setLocked(false);
    onCancel();
  };

  if (!visible) return null;

  return (
    <Modal transparent animationType="fade" visible={visible}>
      <View style={s.overlay}>
        <View style={s.card}>
          <Text style={s.title}>Enter PIN</Text>
          <Text style={s.detail}>₹{amount.toLocaleString('en-IN')} to {payee}</Text>

          <Text style={s.label}>{locked ? 'Payment blocked' : '4-digit UPI PIN'}</Text>

          <Animated.View style={[s.dotsRow, { transform: [{ translateX: shakeAnim }] }]}>
            {[0, 1, 2, 3].map((i) => (
              <View key={i} style={[
                s.dot,
                pin.length > i && s.dotFilled,
                error && pin.length === 0 && s.dotError,
              ]} />
            ))}
          </Animated.View>

          {error ? <Text style={s.errorText}>{error}</Text> : null}

          <TextInput
            ref={inputRef}
            style={s.hiddenInput}
            value={pin}
            onChangeText={handleChange}
            keyboardType="number-pad"
            maxLength={4}
            secureTextEntry
            autoFocus
            editable={!locked}
          />

          {!locked && (
            <TouchableOpacity onPress={() => inputRef.current?.focus()} activeOpacity={1}>
              <Text style={s.tapHint}>Tap here to enter PIN</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity style={s.cancelBtn} onPress={handleCancel}>
            <Text style={s.cancelText}>{locked ? 'Close' : 'Cancel'}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  card: {
    backgroundColor: '#14142A',
    borderRadius: 24,
    padding: 32,
    width: '100%',
    maxWidth: 340,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#1E2040',
  },
  title: {
    color: '#EEF2FF',
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 8,
    fontFamily: 'Inter_700Bold',
  },
  detail: {
    color: '#10B981',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 28,
    fontFamily: 'Inter_600SemiBold',
  },
  label: { color: '#8B8BAD', fontSize: 13, marginBottom: 20 },
  dotsRow: { flexDirection: 'row', gap: 20, marginBottom: 20 },
  dot: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: '#2E2E50',
    backgroundColor: 'transparent',
  },
  dotFilled: { backgroundColor: '#6366F1', borderColor: '#6366F1' },
  dotError: { borderColor: '#EF4444' },
  errorText: { color: '#EF4444', fontSize: 13, marginBottom: 16, textAlign: 'center' },
  hiddenInput: { position: 'absolute', opacity: 0, height: 0, width: 0 },
  tapHint: { color: '#5A5A7A', fontSize: 12, marginBottom: 8 },
  cancelBtn: { paddingVertical: 12, paddingHorizontal: 32, marginTop: 8 },
  cancelText: { color: '#8B8BAD', fontSize: 15, fontWeight: '500' },
});
