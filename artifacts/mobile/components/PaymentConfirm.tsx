import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, Platform } from 'react-native';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

interface PaymentConfirmProps {
  visible: boolean;
  amount: number;
  payee: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function PaymentConfirm({ visible, amount, payee, onConfirm, onCancel }: PaymentConfirmProps) {
  if (!visible) return null;

  const handleConfirm = () => {
    if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    onConfirm();
  };

  return (
    <Modal transparent animationType="slide" visible={visible}>
      <View style={s.overlay}>
        <View style={s.sheet}>
          <View style={s.handle} />

          <View style={s.iconWrap}>
            <Feather name="send" size={22} color="#10B981" />
          </View>

          <Text style={s.label}>Send Money</Text>

          <View style={s.amountRow}>
            <Text style={s.rupee}>₹</Text>
            <Text style={s.amount}>{amount.toLocaleString('en-IN')}</Text>
          </View>

          <Text style={s.payee}>to {payee}</Text>

          <View style={s.divider} />

          <TouchableOpacity style={s.confirmBtn} onPress={handleConfirm} activeOpacity={0.85}>
            <Feather name="check" size={18} color="#080812" style={{ marginRight: 8 }} />
            <Text style={s.confirmText}>Confirm Payment</Text>
          </TouchableOpacity>

          <TouchableOpacity style={s.cancelBtn} onPress={onCancel}>
            <Text style={s.cancelText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#14142A',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 32,
    alignItems: 'center',
    borderWidth: 1,
    borderBottomWidth: 0,
    borderColor: '#1E2040',
  },
  handle: {
    width: 36,
    height: 4,
    backgroundColor: '#2E2E50',
    borderRadius: 2,
    marginBottom: 28,
  },
  iconWrap: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#0D2620',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  label: {
    color: '#8B8BAD',
    fontSize: 13,
    fontWeight: '500',
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: 12,
  },
  amountRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  rupee: {
    color: '#10B981',
    fontSize: 26,
    fontWeight: '300',
    marginTop: 6,
    marginRight: 2,
  },
  amount: {
    color: '#EEF2FF',
    fontSize: 52,
    fontWeight: '700',
    letterSpacing: -2,
    fontFamily: 'Inter_700Bold',
  },
  payee: {
    color: '#8B8BAD',
    fontSize: 16,
    marginBottom: 28,
  },
  divider: {
    width: '100%',
    height: 1,
    backgroundColor: '#1E2040',
    marginBottom: 24,
  },
  confirmBtn: {
    backgroundColor: '#10B981',
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 32,
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 8,
  },
  confirmText: {
    color: '#080812',
    fontSize: 17,
    fontWeight: '700',
    fontFamily: 'Inter_700Bold',
  },
  cancelBtn: {
    paddingVertical: 12,
    paddingHorizontal: 32,
  },
  cancelText: {
    color: '#8B8BAD',
    fontSize: 15,
    fontWeight: '500',
  },
});
