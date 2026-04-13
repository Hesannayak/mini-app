import React, { useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Animated, Platform, StatusBar,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useUserStore } from '@/store/userStore';
import ScoreRing from '@/components/ScoreRing';

const SCORE_COMPONENTS = [
  { label: 'Bill Discipline', value: 80, weight: 30, color: '#6366F1', change: +5, icon: 'check-circle' as const },
  { label: 'Spending Control', value: 65, weight: 25, color: '#10B981', change: -2, icon: 'trending-down' as const },
  { label: 'Savings Rate', value: 70, weight: 25, color: '#F59E0B', change: 0, icon: 'dollar-sign' as const },
  { label: 'Income Stability', value: 75, weight: 20, color: '#22D3EE', change: +3, icon: 'bar-chart-2' as const },
];

const TIPS = [
  { icon: 'zap' as const, color: '#FBBF24', text: 'Bijli bill 1 din pehle bharein — Bill Discipline score badhega.' },
  { icon: 'coffee' as const, color: '#F97316', text: 'Is hafte khane pe ₹200 extra gaya. Budget mein rahein.' },
  { icon: 'trending-up' as const, color: '#10B981', text: 'Score 3 point badha kyunki Jio bill time pe bhari.' },
];

const HISTORY = [
  { week: 'This week', score: 72, change: +3 },
  { week: 'Last week', score: 69, change: +2 },
  { week: '2 weeks ago', score: 67, change: -1 },
  { week: '3 weeks ago', score: 68, change: +5 },
];

export default function ScoreScreen() {
  const { miniScore } = useUserStore();
  const insets = useSafeAreaInsets();
  const barAnims = useRef(SCORE_COMPONENTS.map(() => new Animated.Value(0))).current;

  useEffect(() => {
    Animated.parallel(
      SCORE_COMPONENTS.map((comp, i) =>
        Animated.timing(barAnims[i], {
          toValue: comp.value,
          duration: 1000,
          delay: i * 120,
          useNativeDriver: false,
        })
      )
    ).start();
  }, []);

  const topPad = Platform.OS === 'web' ? 67 : insets.top;
  const bottomPad = Platform.OS === 'web' ? 34 : insets.bottom;

  return (
    <View style={[s.root, { paddingTop: topPad }]}>
      <StatusBar barStyle="light-content" />

      <View style={s.header}>
        <Text style={s.headerTitle}>Mini Score</Text>
        <TouchableOpacity style={s.infoBtn}>
          <Feather name="info" size={16} color="#8B8BAD" />
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={[s.scroll, { paddingBottom: bottomPad + 100 }]}>

        {/* Score ring */}
        <View style={s.scoreSection}>
          <View style={s.ringWrap}>
            <ScoreRing score={miniScore} size={200} strokeWidth={14} />
          </View>
          <View style={s.scoreRow}>
            <View style={s.changeBadge}>
              <Feather name="arrow-up" size={11} color="#10B981" />
              <Text style={s.changeBadgeText}>+3 this week</Text>
            </View>
          </View>
          <Text style={s.scoreCaption}>
            Bijli bill time pe bhari — isliye score badha!
          </Text>
        </View>

        {/* Components breakdown */}
        <Text style={s.sectionTitle}>Score Breakdown</Text>
        <View style={s.componentCard}>
          {SCORE_COMPONENTS.map((comp, i) => {
            const barWidth = barAnims[i].interpolate({
              inputRange: [0, 100],
              outputRange: ['0%', '100%'],
            });

            return (
              <View key={comp.label} style={[s.compRow, i < SCORE_COMPONENTS.length - 1 && s.compBorder]}>
                <View style={[s.compIconWrap, { backgroundColor: `${comp.color}18` }]}>
                  <Feather name={comp.icon} size={14} color={comp.color} />
                </View>
                <View style={s.compInfo}>
                  <View style={s.compTopRow}>
                    <Text style={s.compLabel}>{comp.label}</Text>
                    <View style={s.compRight}>
                      <Text style={[s.compValue, { color: comp.color }]}>{comp.value}</Text>
                      <Text style={s.compWeight}>/{comp.weight}%</Text>
                    </View>
                  </View>
                  <View style={s.barTrack}>
                    <Animated.View style={[s.barFill, { width: barWidth, backgroundColor: comp.color }]} />
                  </View>
                  {comp.change !== 0 && (
                    <View style={s.changeRow}>
                      <Feather
                        name={comp.change > 0 ? 'arrow-up' : 'arrow-down'}
                        size={10}
                        color={comp.change > 0 ? '#10B981' : '#EF4444'}
                      />
                      <Text style={[s.changeText, { color: comp.change > 0 ? '#10B981' : '#EF4444' }]}>
                        {comp.change > 0 ? '+' : ''}{comp.change} this week
                      </Text>
                    </View>
                  )}
                </View>
              </View>
            );
          })}
        </View>

        {/* Weekly history */}
        <Text style={s.sectionTitle}>History</Text>
        <View style={s.historyCard}>
          {HISTORY.map((item, i) => (
            <View key={item.week} style={[s.histRow, i < HISTORY.length - 1 && s.histBorder]}>
              <View style={s.histLeft}>
                <Text style={s.histWeek}>{item.week}</Text>
              </View>
              <View style={s.histRight}>
                <Text style={s.histScore}>{item.score}</Text>
                <View style={[s.histChange, { backgroundColor: item.change >= 0 ? '#10B98120' : '#EF444420' }]}>
                  <Feather name={item.change >= 0 ? 'arrow-up' : 'arrow-down'} size={10} color={item.change >= 0 ? '#10B981' : '#EF4444'} />
                  <Text style={[s.histChangeText, { color: item.change >= 0 ? '#10B981' : '#EF4444' }]}>
                    {item.change >= 0 ? '+' : ''}{item.change}
                  </Text>
                </View>
              </View>
            </View>
          ))}
        </View>

        {/* Tips */}
        <Text style={s.sectionTitle}>Tips to Improve</Text>
        {TIPS.map((tip, i) => (
          <View key={i} style={s.tipCard}>
            <View style={[s.tipIcon, { backgroundColor: `${tip.color}18` }]}>
              <Feather name={tip.icon} size={16} color={tip.color} />
            </View>
            <Text style={s.tipText}>{tip.text}</Text>
          </View>
        ))}

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
  infoBtn: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: '#0F0F1E', borderWidth: 1, borderColor: '#1E2040',
    justifyContent: 'center', alignItems: 'center',
  },

  scroll: { paddingHorizontal: 20 },

  scoreSection: { alignItems: 'center', marginBottom: 32 },
  ringWrap: {
    shadowColor: '#6366F1', shadowOffset: { width: 0, height: 12 }, shadowOpacity: 0.3, shadowRadius: 32,
  },
  scoreRow: { flexDirection: 'row', justifyContent: 'center', marginTop: 16, gap: 12 },
  changeBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: '#10B98120', borderRadius: 20,
    borderWidth: 1, borderColor: '#10B98130',
    paddingHorizontal: 12, paddingVertical: 6,
  },
  changeBadgeText: { color: '#10B981', fontSize: 13, fontWeight: '600', fontFamily: 'Inter_600SemiBold' },
  scoreCaption: { color: '#8B8BAD', fontSize: 13, textAlign: 'center', marginTop: 10, paddingHorizontal: 20, lineHeight: 20, fontFamily: 'Inter_400Regular' },

  sectionTitle: { color: '#8B8BAD', fontSize: 12, fontWeight: '600', letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 12, fontFamily: 'Inter_600SemiBold' },

  componentCard: {
    backgroundColor: '#0F0F1E', borderRadius: 20,
    borderWidth: 1, borderColor: '#1E2040',
    marginBottom: 28, overflow: 'hidden',
  },
  compRow: { flexDirection: 'row', alignItems: 'center', padding: 16, gap: 12 },
  compBorder: { borderBottomWidth: 1, borderBottomColor: '#0A0A16' },
  compIconWrap: { width: 36, height: 36, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  compInfo: { flex: 1, gap: 6 },
  compTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  compLabel: { color: '#C8D0F0', fontSize: 14, fontWeight: '500', fontFamily: 'Inter_500Medium' },
  compRight: { flexDirection: 'row', alignItems: 'baseline', gap: 1 },
  compValue: { fontSize: 16, fontWeight: '700', fontFamily: 'Inter_700Bold' },
  compWeight: { color: '#5A5A7A', fontSize: 11 },
  barTrack: { height: 5, backgroundColor: '#1A1A30', borderRadius: 3, overflow: 'hidden' },
  barFill: { height: 5, borderRadius: 3 },
  changeRow: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  changeText: { fontSize: 11, fontFamily: 'Inter_400Regular' },

  historyCard: {
    backgroundColor: '#0F0F1E', borderRadius: 20,
    borderWidth: 1, borderColor: '#1E2040',
    marginBottom: 28, overflow: 'hidden',
  },
  histRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16 },
  histBorder: { borderBottomWidth: 1, borderBottomColor: '#0A0A16' },
  histLeft: {},
  histWeek: { color: '#C8D0F0', fontSize: 14, fontFamily: 'Inter_400Regular' },
  histRight: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  histScore: { color: '#EEF2FF', fontSize: 18, fontWeight: '700', fontFamily: 'Inter_700Bold' },
  histChange: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    borderRadius: 10, paddingHorizontal: 8, paddingVertical: 3,
  },
  histChangeText: { fontSize: 12, fontWeight: '600', fontFamily: 'Inter_600SemiBold' },

  tipCard: {
    backgroundColor: '#0F0F1E', borderRadius: 16,
    borderWidth: 1, borderColor: '#1E2040',
    padding: 16, marginBottom: 10,
    flexDirection: 'row', alignItems: 'flex-start', gap: 14,
  },
  tipIcon: { width: 36, height: 36, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  tipText: { color: '#C8D0F0', fontSize: 14, lineHeight: 21, flex: 1, fontFamily: 'Inter_400Regular' },
});
