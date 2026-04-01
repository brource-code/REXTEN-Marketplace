import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import { RootNavigator } from './src/navigation/RootNavigator';
import { AuthProvider } from './src/contexts/AuthContext';
import LocationProvider from './src/components/location/LocationProvider';
// import './global.css'; // ОТКЛЮЧЕНО

export default function App() {
  return (
    <AuthProvider>
      <LocationProvider>
      <NavigationContainer>
        <RootNavigator />
        <StatusBar style="auto" />
      </NavigationContainer>
      </LocationProvider>
    </AuthProvider>
  );
}
