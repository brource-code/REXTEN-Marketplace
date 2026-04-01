import React, { useMemo } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { StyleSheet } from 'react-native';
import { NavigationContainer, DefaultTheme, DarkTheme, Theme as NavTheme } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import { QueryClientProvider } from '@tanstack/react-query';
import { RootNavigator } from './src/navigation/RootNavigator';
import { AuthProvider } from './src/contexts/AuthContext';
import { BusinessProvider } from './src/contexts/BusinessContext';
import { ThemeProvider, useTheme } from './src/theme';
import { PresenceHeartbeat } from './src/components/PresenceHeartbeat';
import LocationProvider from './src/components/location/LocationProvider';
import { queryClient } from './src/lib/queryClient';

function AppContent() {
  const { theme, isDark } = useTheme();

  const navigationTheme: NavTheme = useMemo(() => ({
    dark: isDark,
    colors: {
      ...(isDark ? DarkTheme.colors : DefaultTheme.colors),
      background: theme.background,
      card: theme.card,
      text: theme.text,
      border: theme.border,
      primary: theme.primary,
      notification: theme.primary,
    },
    fonts: isDark ? DarkTheme.fonts : DefaultTheme.fonts,
  }), [isDark, theme]);

  return (
    <GestureHandlerRootView style={[styles.root, { backgroundColor: theme.background }]}>
      <NavigationContainer theme={navigationTheme}>
        <RootNavigator />
        <StatusBar style={isDark ? 'light' : 'dark'} />
      </NavigationContainer>
    </GestureHandlerRootView>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <PresenceHeartbeat />
        <BusinessProvider>
          <LocationProvider>
            <ThemeProvider>
              <AppContent />
            </ThemeProvider>
          </LocationProvider>
        </BusinessProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
});
