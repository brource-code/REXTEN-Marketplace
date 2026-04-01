import React from 'react';
import { ViewProps, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../contexts/ThemeContext';

interface ScreenContainerProps extends ViewProps {
  children: React.ReactNode;
  edges?: ('top' | 'bottom' | 'left' | 'right')[];
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});

export const ScreenContainer: React.FC<ScreenContainerProps> = ({
  children,
  edges = ['top', 'bottom'],
  style,
  ...props
}) => {
  const { colors } = useTheme();

  return (
    <SafeAreaView
      edges={edges}
      style={[styles.container, { backgroundColor: colors.background }, style]}
      {...props}
    >
      {children}
    </SafeAreaView>
  );
};
