import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { ScreenContainer } from '../../components/ScreenContainer';

import { useTheme } from '../../contexts/ThemeContext';
const styles = StyleSheet.create({
  box: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  text: { fontSize: 16, fontWeight: '600', textAlign: 'center' },
});

export function BusinessPlaceholderScreen({ title }: { title: string }) {
  const { colors } = useTheme();

  return (
    <ScreenContainer>
      <View style={styles.box}>
        <Text style={[styles.text, { color: colors.textSecondary }]}>{title}</Text>
        <Text style={[styles.text, { marginTop: 8, fontSize: 14, color: colors.textSecondary }]}>Скоро</Text>
      </View>
    </ScreenContainer>
  );
}
