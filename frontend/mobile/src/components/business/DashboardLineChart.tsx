import React, { useMemo } from 'react';
import { View, Text, StyleSheet, useWindowDimensions } from 'react-native';
import Svg, { Line, Polyline, Circle } from 'react-native-svg';
import { useTheme } from '../../contexts/ThemeContext';

type Props = {
  data: number[];
  labels: string[];
  color: string;
  height?: number;
  emptyLabel?: string;
};

export function DashboardLineChart({
  data,
  labels,
  color,
  height = 220,
  emptyLabel = '—',
}: Props) {
  const { colors } = useTheme();
  const { width: screenW } = useWindowDimensions();
  const chartW = Math.max(280, screenW - 64);
  const pad = { top: 16, right: 12, bottom: 8, left: 8 };
  const innerW = chartW - pad.left - pad.right;
  const innerH = height - pad.top - pad.bottom - 36;

  const points = useMemo(() => {
    if (!data.length) {
      return [] as { x: number; y: number }[];
    }
    const min = Math.min(...data);
    const max = Math.max(...data);
    const span = max - min || 1;
    const n = data.length;
    return data.map((v, i) => {
      const x = pad.left + (n <= 1 ? innerW / 2 : (innerW * i) / (n - 1));
      const t = (v - min) / span;
      const y = pad.top + innerH * (1 - t);
      return { x, y };
    });
  }, [data, innerH, innerW, pad.left, pad.top]);

  const polyPoints = useMemo(() => points.map((p) => `${p.x},${p.y}`).join(' '), [points]);

  if (!data.length) {
    return (
      <View style={[styles.empty, { height, backgroundColor: colors.backgroundSecondary }]}>
        <Text style={[styles.emptyText, { color: colors.textSecondary }]}>{emptyLabel}</Text>
      </View>
    );
  }

  return (
    <View style={{ height }}>
      <Svg width={chartW} height={height - 36}>
        <Line
          x1={pad.left}
          y1={pad.top + innerH}
          x2={pad.left + innerW}
          y2={pad.top + innerH}
          stroke={colors.border}
          strokeWidth={1}
        />
        {points.length > 1 ? (
          <Polyline points={polyPoints} fill="none" stroke={color} strokeWidth={2} />
        ) : null}
        {points.map((p, i) => (
          <Circle key={`pt-${i}`} cx={p.x} cy={p.y} r={4} fill={colors.card} stroke={color} strokeWidth={2} />
        ))}
      </Svg>
      <View style={[styles.labelsRow, { width: chartW }]}>
        {labels.slice(0, data.length).map((lab, i) => (
          <Text key={`lb-${i}-${String(lab)}`} numberOfLines={1} style={[styles.label, { color: colors.textSecondary }]}>
            {lab}
          </Text>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  empty: {
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 12,
  },
  emptyText: {
    fontSize: 14,
    fontWeight: '700',
  },
  labelsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
  },
  label: {
    fontSize: 10,
    fontWeight: '600',
    flex: 1,
    textAlign: 'center',
  },
});
