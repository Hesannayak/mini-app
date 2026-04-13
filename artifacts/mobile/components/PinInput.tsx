import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Modal, Animated, Platform,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
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

const KEYS = [
  ['1', '2', '3'],
  ['4', '5', '6'],
  ['7', '8', '9'],
  ['', '0', 'del'],
];

export default function PinInput({ visible, amount, payee, onConfirm, onCancel }: PinInputProps) {
  const [pin, setPin] = useState('');
  const [tries, setTries] = useState(0);
  const [error, setError] = useState('');
  const [locked, setLocked] = useState(false);
  const shakeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      setPin('');
      setTries(0);
      setError('');
      setLocked(false);
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

  const pressKey = (key: string) => {
    if (locked) return;
    if (Platform.OS !== 'web') Haptics.selectionAsync();

    if (key === 'del') {
      setPin(p => p.slice(0, -1));
      setError('');
      return;
    }

    if (pin.length >= 4) return;
    const next = pin + key;
    setPin(next);
    setError('');

    if (next.length === 4) {
      setTimeout(() => {
        if (next === CORRECT_PIN) {
          onConfirm(next);
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
          }
        }
      }, 120);
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

          {error ? <Text style={s.errorText}>{error}</Text> : <View style={s.errorSpacer} />}

          <View style={s.keypad}>
            {KEYS.map((row, ri) => (
              <View key={ri} style={s.keyRow}>
                {row.map((key, ki) => {
                  if (key === '') return <View key={ki} style={s.keyEmpty} />;
                  return (
                    <TouchableOpacity
                      key={ki}
                      style={[s.key, key === 'del' && s.keyDel, locked && s.keyDisabled]}
                      onPress={() => pressKey(key)}
                      activeOpacity={0.6}
                      disabled={locked}
                    >
                      {key === 'del'
                        ? <Feather name="delete" size={20} color={locked ? '#3A3A5A' : '#8B8BAD'} />
                        : <Text style={[s.keyText, locked && s.keyTextDisabled]}>{key}</Text>
                      }
                    </TouchableOpacity>
                  );
                })}
              </View>
            ))}
          </View>

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
    backgroundColor: 'rgba(0,0,0,0.92)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  card: {
    backgroundColor: '#14142A',
    borderRadius: 28,
    padding: 28,
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
    marginBottom: 6,
    fontFamily: 'Inter_700Bold',
  },
  detail: {
    color: '#10B981',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 24,
    fontFamily: 'Inter_600SemiBold',
  },
  label: { color: '#8B8BAD', fontSize: 13, marginBottom: 18 },
  dotsRow: { flexDirection: 'row', gap: 20, marginBottom: 12 },
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
  errorText: { color: '#EF4444', fontSize: 13, marginBottom: 12, textAlign: 'center' },
  errorSpacer: { height: 28 },

  keypad: { width: '100%', marginBottom: 8 },
  keyRow: { flexDirection: 'row', justifyContent: 'center', marginBottom: 8, gap: 12 },
  key: {
    width: 72,
    height: 60,
    borderRadius: 16,
    backgroundColor: '#0F0F1E',
    borderWidth: 1,
    borderColor: '#1E2040',
    justifyContent: 'center',
    alignItems: 'center',
  },
  keyDel: { backgroundColor: '#14142A' },
  keyEmpty: { width: 72, height: 60 },
  keyDisabled: { opacity: 0.3 },
  keyText: {
    color: '#EEF2FF',
    fontSize: 22,
    fontWeight: '500',
    fontFamily: 'Inter_500Medium',
  },
  keyTextDisabled: { color: '#3A3A5A' },

  cancelBtn: { paddingVertical: 12, paddingHorizontal: 32, marginTop: 4 },
  cancelText: { color: '#8B8BAD', fontSize: 15, fontWeight: '500' },
});
