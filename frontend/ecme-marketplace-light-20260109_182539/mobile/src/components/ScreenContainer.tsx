import React from 'react';
import { ViewProps, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

interface ScreenContainerProps extends ViewProps {
  children: React.ReactNode;
  edges?: ('top' | 'bottom' | 'left' | 'right')[];
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
});

export const ScreenContainer: React.FC<ScreenContainerProps> = ({
  children,
  edges = ['top', 'bottom'],
  style,
  ...props
}) => {
  return (
    <SafeAreaView
      edges={edges}
      style={[styles.container, style]}
      {...props}
    >
      {children}
    </SafeAreaView>
  );
};
