import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Platform, StatusBar,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { formatIndianCurrency } from '@/utils/formatters';

interface Bill {
  id: string;
  biller_name: string;
  bill_type: string;
  amount: number;
  due_date: Date;
  icon: string;
  color: string;
  paid?: boolean;
}

const today = new Date();
const addDays = (d: Date, n: number) => { const r = new Date(d); r.setDate(r.getDate() + n); return r; };

const MOCK_BILLS: Bill[] = [
  { id: '1', biller_name: 'Tata Power', bill_type: 'Electricity', amount: 1420, due_date: addDays(today, 2), icon: 'zap', color: '#FBBF24' },
  { id: '2', biller_name: 'ACT Fibernet', bill_type: 'Internet', amount: 699, due_date: addDays(today, 5), icon: 'wifi', color: '#60A5FA' },
  { id: '3', biller_name: 'Jio Postpaid', bill_type: 'Mobile', amount: 499, due_date: addDays(today, 9), icon: 'smartphone', color: '#4ADE80' },
  { id: '4', biller_name: 'Bangalore Water', bill_type: 'Water', amount: 180, due_date: addDays(today, 13), icon: 'droplet', color: '#22D3EE' },
  { id: '5', biller_name: 'HDFC Credit Card', bill_type: 'Credit Card', amount: 8450, due_date: addDays(today, 18), icon: 'credit-card', color: '#A78BFA' },
];

function getDaysLeft(dueDate: Date): number {
  return Math.ceil((dueDate.getTime() - Date.now()) / 86400000);
}

function getUrgency(days: number): 'urgent' | 'soon' | 'ok' {
  if (days <= 3) return 'urgent';
  if (days <= 7) return 'soon';
  return 'ok';
}

const urgencyColors = { urgent: '#EF4444', soon: '#F59E0B', ok: '#10B981' };
const urgencyBg = { urgent: '#EF444420', soon: '#F59E0B20', ok: '#10B98120' };

export default function BillsScreen() {
  const [paidIds, setPaidIds] = useState<Set<string>>(new Set());
  const insets = useSafeAreaInsets();

  const topPad = Platform.OS === 'web' ? 67 : insets.top;
  const bottomPad = Platform.OS === 'web' ? 34 : insets.bottom;

  const totalDue = MOCK_BILLS
    .filter(b => !paidIds.has(b.id))
    .reduce((sum, b) => sum + b.amount, 0);

  const urgentCount = MOCK_BILLS.filter(b => !paidIds.has(b.id) && getDaysLeft(b.due_date) <= 3).length;

  const handlePay = (bill: Bill) => {
    if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setPaidIds(prev => new Set([...prev, bill.id]));
  };

  return (
    <View style={[s.root, { paddingTop: topPad }]}>
      <StatusBar barStyle="light-content" />

      <View style={s.header}>
        <Text style={s.headerTitle}>Bills</Text>
        <TouchableOpacity style={s.addBtn}>
          <Feather name="plus" size={18} color="#6366F1" />
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={[s.scroll, { paddingBottom: bottomPad + 100 }]}>

        {/* Summary */}
        <View style={s.summaryCard}>
          <View style={s.summaryLeft}>
            <Text style={s.summaryLabel}>Total Due</Text>
            <Text style={s.summaryAmount}>{formatIndianCurrency(totalDue)}</Text>
          </View>
          {urgentCount > 0 && (
            <View style={s.urgentBadge}>
              <Feather name="alert-triangle" size={13} color="#EF4444" />
              <Text style={s.urgentBadgeText}>{urgentCount} urgent</Text>
            </View>
          )}
        </View>

        {/* Bills list */}
        <Text style={s.sectionTitle}>Upcoming</Text>

        {MOCK_BILLS.map((bill) => {
          const isPaid = paidIds.has(bill.id);
          const daysLeft = getDaysLeft(bill.due_date);
          const urgency = isPaid ? 'ok' : getUrgency(daysLeft);
          const urgColor = urgencyColors[urgency];
          const urgBg = urgencyBg[urgency];

          return (
            <View key={bill.id} style={[s.billCard, isPaid && s.billCardPaid]}>
              {/* Icon */}
              <View style={[s.billIcon, { backgroundColor: `${bill.color}18` }]}>
                <Feather name={bill.icon as any} size={20} color={isPaid ? '#5A5A7A' : bill.color} />
              </View>

              {/* Info */}
              <View style={s.billInfo}>
                <Text style={[s.billerName, isPaid && s.textFaded]}>{bill.biller_name}</Text>
                <Text style={s.billType}>{bill.bill_type}</Text>
                <View style={[s.daysTag, { backgroundColor: isPaid ? '#1A1A30' : urgBg }]}>
                  {isPaid
                    ? <><Feather name="check-circle" size={10} color="#10B981" /><Text style={[s.daysText, { color: '#10B981' }]}>Paid</Text></>
                    : <><Feather name="clock" size={10} color={urgColor} /><Text style={[s.daysText, { color: urgColor }]}>{daysLeft === 0 ? 'Due today' : daysLeft < 0 ? 'Overdue' : `${daysLeft}d left`}</Text></>
                  }
                </View>
              </View>

              {/* Amount + Pay */}
              <View style={s.billRight}>
                <Text style={[s.billAmount, isPaid && s.textFaded]}>{formatIndianCurrency(bill.amount)}</Text>
                {!isPaid ? (
                  <TouchableOpacity
                    style={[s.payBtn, urgency === 'urgent' && s.payBtnUrgent]}
                    onPress={() => handlePay(bill)}
                    activeOpacity={0.8}
                  >
                    <Text style={[s.payBtnText, urgency === 'urgent' && s.payBtnTextUrgent]}>Pay</Text>
                  </TouchableOpacity>
                ) : (
                  <View style={s.paidTag}>
                    <Feather name="check" size={12} color="#10B981" />
                  </View>
                )}
              </View>
            </View>
          );
        })}

      </ScrollView>
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
  addBtn: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: '#13133A', borderWidth: 1, borderColor: '#1E2040',
    justifyContent: 'center', alignItems: 'center',
  },

  scroll: { paddingHorizontal: 20 },

  summaryCard: {
    backgroundColor: '#0F0F1E', borderRadius: 20,
    borderWidth: 1, borderColor: '#1E2040',
    padding: 20, marginBottom: 28,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
  },
  summaryLeft: {},
  summaryLabel: { color: '#8B8BAD', fontSize: 12, fontWeight: '500', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 },
  summaryAmount: { color: '#EEF2FF', fontSize: 32, fontWeight: '800', fontFamily: 'Inter_700Bold', letterSpacing: -1 },
  urgentBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: '#EF444415', borderRadius: 20,
    borderWidth: 1, borderColor: '#EF444430',
    paddingHorizontal: 12, paddingVertical: 7,
  },
  urgentBadgeText: { color: '#EF4444', fontSize: 13, fontWeight: '600', fontFamily: 'Inter_600SemiBold' },

  sectionTitle: { color: '#8B8BAD', fontSize: 12, fontWeight: '600', letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 12, fontFamily: 'Inter_600SemiBold' },

  billCard: {
    backgroundColor: '#0F0F1E', borderRadius: 18,
    borderWidth: 1, borderColor: '#1E2040',
    padding: 16, marginBottom: 10,
    flexDirection: 'row', alignItems: 'center', gap: 14,
  },
  billCardPaid: { opacity: 0.6 },

  billIcon: { width: 46, height: 46, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },

  billInfo: { flex: 1, gap: 3 },
  billerName: { color: '#EEF2FF', fontSize: 15, fontWeight: '600', fontFamily: 'Inter_600SemiBold' },
  billType: { color: '#8B8BAD', fontSize: 12, fontFamily: 'Inter_400Regular' },
  textFaded: { color: '#5A5A7A' },

  daysTag: { flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3, alignSelf: 'flex-start' },
  daysText: { fontSize: 11, fontWeight: '600', fontFamily: 'Inter_600SemiBold' },

  billRight: { alignItems: 'flex-end', gap: 8 },
  billAmount: { color: '#EEF2FF', fontSize: 16, fontWeight: '700', fontFamily: 'Inter_700Bold' },

  payBtn: {
    backgroundColor: '#1E1E3A', borderRadius: 10,
    borderWidth: 1, borderColor: '#6366F1',
    paddingHorizontal: 16, paddingVertical: 7,
  },
  payBtnUrgent: {
    backgroundColor: '#EF4444',
    borderColor: '#EF4444',
    shadowColor: '#EF4444', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.4, shadowRadius: 8,
  },
  payBtnText: { color: '#6366F1', fontSize: 13, fontWeight: '600', fontFamily: 'Inter_600SemiBold' },
  payBtnTextUrgent: { color: '#FFFFFF' },

  paidTag: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: '#10B98120', justifyContent: 'center', alignItems: 'center',
  },
});
