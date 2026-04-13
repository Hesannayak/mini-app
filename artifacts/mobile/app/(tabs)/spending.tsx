import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Animated, Platform, StatusBar,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { formatIndianCurrency } from '@/utils/formatters';
import { CATEGORY_COLORS, CATEGORY_ICONS, CATEGORY_LABELS, type TransactionCategory } from '@/constants/categories';

type Period = 'today' | 'week' | 'month';

const SPENDING_DATA: Record<Period, { total: number; categories: Partial<Record<TransactionCategory, number>> }> = {
  today: {
    total: 1240,
    categories: { food: 480, transport: 220, shopping: 340, other: 200 },
  },
  week: {
    total: 8420,
    categories: { food: 2800, transport: 1200, groceries: 1800, shopping: 1400, bills: 850, entertainment: 370 },
  },
  month: {
    total: 32600,
    categories: { food: 8400, transport: 4200, groceries: 6800, shopping: 5200, bills: 4800, emi: 2400, education: 800 },
  },
};

const PERIOD_LABELS: Record<Period, string> = { today: 'Today', week: 'This Week', month: 'This Month' };

const RECENT_TXN = [
  { id: '1', merchant: 'Swiggy', amount: 340, cat: 'food' as TransactionCategory, time: '2h ago' },
  { id: '2', merchant: 'Rapido', amount: 80, cat: 'transport' as TransactionCategory, time: '4h ago' },
  { id: '3', merchant: 'BigBasket', amount: 620, cat: 'groceries' as TransactionCategory, time: '1d ago' },
  { id: '4', merchant: 'Netflix', amount: 199, cat: 'entertainment' as TransactionCategory, time: '2d ago' },
  { id: '5', merchant: 'Amazon', amount: 1240, cat: 'shopping' as TransactionCategory, time: '3d ago' },
];

export default function SpendingScreen() {
  const [period, setPeriod] = useState<Period>('today');
  const insets = useSafeAreaInsets();
  const animValues = useRef<Animated.Value[]>([]).current;

  const data = SPENDING_DATA[period];
  const sortedCategories = Object.entries(data.categories)
    .sort(([, a], [, b]) => b - a)
    .filter(([, a]) => a > 0) as [TransactionCategory, number][];

  if (animValues.length < sortedCategories.length) {
    while (animValues.length < sortedCategories.length) {
      animValues.push(new Animated.Value(0));
    }
  }

  useEffect(() => {
    sortedCategories.forEach((_, i) => {
      if (animValues[i]) {
        animValues[i].setValue(0);
        Animated.timing(animValues[i], {
          toValue: 1,
          duration: 700,
          delay: i * 80,
          useNativeDriver: false,
        }).start();
      }
    });
  }, [period]);

  const topPad = Platform.OS === 'web' ? 67 : insets.top;
  const bottomPad = Platform.OS === 'web' ? 34 : insets.bottom;

  return (
    <View style={[s.root, { paddingTop: topPad }]}>
      <StatusBar barStyle="light-content" />

      <View style={s.header}>
        <Text style={s.headerTitle}>Spending</Text>
        <TouchableOpacity style={s.filterBtn}>
          <Feather name="sliders" size={16} color="#8B8BAD" />
        </TouchableOpacity>
      </View>

      {/* Period selector */}
      <View style={s.periodRow}>
        {(Object.keys(PERIOD_LABELS) as Period[]).map(p => (
          <TouchableOpacity
            key={p}
            style={[s.periodBtn, period === p && s.periodBtnActive]}
            onPress={() => setPeriod(p)}
            activeOpacity={0.75}
          >
            <Text style={[s.periodText, period === p && s.periodTextActive]}>{PERIOD_LABELS[p]}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={[s.scroll, { paddingBottom: bottomPad + 100 }]}>

        {/* Total card */}
        <View style={s.totalCard}>
          <Text style={s.totalLabel}>Total Spent</Text>
          <Text style={s.totalAmount}>{formatIndianCurrency(data.total)}</Text>
          <View style={s.totalMeta}>
            <Feather name="trending-down" size={14} color="#10B981" />
            <Text style={s.totalMetaText}>12% less than last {period}</Text>
          </View>
        </View>

        {/* Category breakdown */}
        <Text style={s.sectionTitle}>Categories</Text>
        <View style={s.categoriesCard}>
          {sortedCategories.map(([cat, amount], i) => {
            const percent = Math.round((amount / data.total) * 100);
            const color = CATEGORY_COLORS[cat];
            const maxWidth = animValues[i]
              ? animValues[i].interpolate({ inputRange: [0, 1], outputRange: ['0%', `${percent}%`] })
              : '0%';

            return (
              <View key={cat} style={[s.catRow, i < sortedCategories.length - 1 && s.catRowBorder]}>
                <View style={[s.catIconWrap, { backgroundColor: `${color}18` }]}>
                  <Feather name={CATEGORY_ICONS[cat] as any} size={14} color={color} />
                </View>
                <View style={s.catInfo}>
                  <View style={s.catTopRow}>
                    <Text style={s.catName}>{CATEGORY_LABELS[cat]}</Text>
                    <Text style={s.catAmount}>{formatIndianCurrency(amount)}</Text>
                  </View>
                  <View style={s.barTrack}>
                    <Animated.View style={[s.barFill, { width: maxWidth, backgroundColor: color }]} />
                  </View>
                  <Text style={s.catPercent}>{percent}%</Text>
                </View>
              </View>
            );
          })}
        </View>

        {/* Recent transactions */}
        <Text style={s.sectionTitle}>Recent</Text>
        <View style={s.txnCard}>
          {RECENT_TXN.map((txn, i) => (
            <View key={txn.id} style={[s.txnRow, i < RECENT_TXN.length - 1 && s.txnBorder]}>
              <View style={[s.txnIcon, { backgroundColor: `${CATEGORY_COLORS[txn.cat]}18` }]}>
                <Feather name={CATEGORY_ICONS[txn.cat] as any} size={16} color={CATEGORY_COLORS[txn.cat]} />
              </View>
              <View style={s.txnInfo}>
                <Text style={s.txnMerchant}>{txn.merchant}</Text>
                <Text style={s.txnTime}>{txn.time}</Text>
              </View>
              <Text style={s.txnAmount}>-{formatIndianCurrency(txn.amount)}</Text>
            </View>
          ))}
        </View>

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
  filterBtn: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: '#0F0F1E', borderWidth: 1, borderColor: '#1E2040',
    justifyContent: 'center', alignItems: 'center',
  },

  periodRow: { flexDirection: 'row', paddingHorizontal: 20, gap: 8, marginBottom: 20 },
  periodBtn: {
    paddingHorizontal: 16, paddingVertical: 8,
    borderRadius: 20, backgroundColor: '#0F0F1E',
    borderWidth: 1, borderColor: '#1E2040',
  },
  periodBtnActive: { backgroundColor: '#EEF2FF', borderColor: '#EEF2FF' },
  periodText: { color: '#8B8BAD', fontSize: 14, fontWeight: '500', fontFamily: 'Inter_500Medium' },
  periodTextActive: { color: '#080812', fontWeight: '600', fontFamily: 'Inter_600SemiBold' },

  scroll: { paddingHorizontal: 20 },

  totalCard: {
    backgroundColor: '#0F0F1E', borderRadius: 20,
    borderWidth: 1, borderColor: '#1E2040',
    padding: 24, marginBottom: 28, alignItems: 'center',
  },
  totalLabel: { color: '#8B8BAD', fontSize: 13, letterSpacing: 0.5, textTransform: 'uppercase', fontFamily: 'Inter_500Medium' },
  totalAmount: { color: '#EEF2FF', fontSize: 40, fontWeight: '800', letterSpacing: -1.5, marginTop: 8, marginBottom: 10, fontFamily: 'Inter_700Bold' },
  totalMeta: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  totalMetaText: { color: '#10B981', fontSize: 13, fontFamily: 'Inter_400Regular' },

  sectionTitle: { color: '#8B8BAD', fontSize: 12, fontWeight: '600', letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 12, fontFamily: 'Inter_600SemiBold' },

  categoriesCard: {
    backgroundColor: '#0F0F1E', borderRadius: 20,
    borderWidth: 1, borderColor: '#1E2040',
    marginBottom: 28, overflow: 'hidden',
  },
  catRow: { flexDirection: 'row', alignItems: 'center', padding: 16, gap: 12 },
  catRowBorder: { borderBottomWidth: 1, borderBottomColor: '#0A0A16' },
  catIconWrap: { width: 36, height: 36, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  catInfo: { flex: 1, gap: 6 },
  catTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  catName: { color: '#C8D0F0', fontSize: 14, fontWeight: '500', fontFamily: 'Inter_500Medium', textTransform: 'capitalize' },
  catAmount: { color: '#EEF2FF', fontSize: 14, fontWeight: '600', fontFamily: 'Inter_600SemiBold' },
  barTrack: { height: 4, backgroundColor: '#1A1A30', borderRadius: 2, overflow: 'hidden' },
  barFill: { height: 4, borderRadius: 2 },
  catPercent: { color: '#5A5A7A', fontSize: 11, fontFamily: 'Inter_400Regular' },

  txnCard: {
    backgroundColor: '#0F0F1E', borderRadius: 20,
    borderWidth: 1, borderColor: '#1E2040',
    overflow: 'hidden',
  },
  txnRow: { flexDirection: 'row', alignItems: 'center', padding: 16, gap: 12 },
  txnBorder: { borderBottomWidth: 1, borderBottomColor: '#0A0A16' },
  txnIcon: { width: 40, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  txnInfo: { flex: 1 },
  txnMerchant: { color: '#C8D0F0', fontSize: 15, fontWeight: '500', fontFamily: 'Inter_500Medium' },
  txnTime: { color: '#5A5A7A', fontSize: 12, marginTop: 2, fontFamily: 'Inter_400Regular' },
  txnAmount: { color: '#EEF2FF', fontSize: 15, fontWeight: '600', fontFamily: 'Inter_600SemiBold' },
});
