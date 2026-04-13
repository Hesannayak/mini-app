import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Circle } from 'react-native-svg';

interface ScoreRingProps {
  score: number;
  size?: number;
  strokeWidth?: number;
}

function getScoreColor(score: number): string {
  if (score <= 40) return '#EF4444';
  if (score <= 60) return '#F59E0B';
  if (score <= 75) return '#10B981';
  if (score <= 90) return '#6366F1';
  return '#F59E0B';
}

function getScoreLabel(score: number): string {
  if (score <= 40) return 'Getting Started';
  if (score <= 60) return 'Building Up';
  if (score <= 75) return 'On Track';
  if (score <= 90) return 'Excellent';
  return 'Champion';
}

export default function ScoreRing({ score, size = 200, strokeWidth = 12 }: ScoreRingProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = Math.min(score / 100, 1);
  const strokeDashoffset = circumference * (1 - progress);
  const ringColor = getScoreColor(score);
  const cx = size / 2;
  const cy = size / 2;

  return (
    <View style={styles.container}>
      <Svg width={size} height={size}>
        <Circle
          cx={cx}
          cy={cy}
          r={radius}
          stroke="#1E2040"
          strokeWidth={strokeWidth}
          fill="none"
        />
        <Circle
          cx={cx}
          cy={cy}
          r={radius}
          stroke={ringColor}
          strokeWidth={strokeWidth}
          fill="none"
          strokeDasharray={`${circumference} ${circumference}`}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          transform={`rotate(-90, ${cx}, ${cy})`}
        />
      </Svg>
      <View style={[styles.centerContent, { width: size, height: size }]}>
        <Text style={[styles.scoreValue, { color: ringColor }]}>{score}</Text>
        <Text style={styles.scoreMax}>/100</Text>
        <Text style={[styles.scoreLabel, { color: ringColor }]}>{getScoreLabel(score)}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerContent: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scoreValue: {
    fontSize: 52,
    fontWeight: '800',
    letterSpacing: -2,
    fontFamily: 'Inter_700Bold',
    lineHeight: 58,
  },
  scoreMax: {
    fontSize: 14,
    color: '#8B8BAD',
    fontWeight: '500',
    marginTop: -4,
  },
  scoreLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 4,
    letterSpacing: 0.3,
    fontFamily: 'Inter_600SemiBold',
  },
});
