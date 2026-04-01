import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { BusinessDashboardScreen } from '../screens/business/BusinessDashboardScreen';
import { BusinessScheduleScreen } from '../screens/business/BusinessScheduleScreen';
import { BusinessBookingsListScreen } from '../screens/business/BusinessBookingsListScreen';
import { BusinessClientsListScreen } from '../screens/business/BusinessClientsListScreen';
import { BusinessMoreMenuScreen } from '../screens/business/BusinessMoreMenuScreen';
import { useTheme } from '../contexts/ThemeContext';

export type BusinessTabParamList = {
  BusinessDashboard: undefined;
  BusinessSchedule: undefined;
  BusinessBookings: undefined;
  BusinessClients: undefined;
  BusinessMore: undefined;
};

const Tab = createBottomTabNavigator<BusinessTabParamList>();

export function BusinessTabNavigator() {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textSecondary,
        tabBarStyle: {
          backgroundColor: colors.card,
          borderTopWidth: 1,
          borderTopColor: colors.border,
          paddingTop: 8,
          paddingBottom: Math.max(insets.bottom, 8),
          height: 60 + Math.max(insets.bottom - 8, 0),
        },
        tabBarLabelStyle: { fontSize: 12, fontWeight: '500' },
      }}
    >
      <Tab.Screen
        name="BusinessDashboard"
        component={BusinessDashboardScreen}
        options={{
          tabBarLabel: 'Дашборд',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="stats-chart-outline" size={size || 24} color={color} />
          ),
        }}
      />

      <Tab.Screen
        name="BusinessSchedule"
        component={BusinessScheduleScreen}
        options={{
          tabBarLabel: 'Расписание',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="calendar-number-outline" size={size || 24} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="BusinessBookings"
        component={BusinessBookingsListScreen}
        options={{
          tabBarLabel: 'Брони',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="calendar-outline" size={size || 24} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="BusinessClients"
        component={BusinessClientsListScreen}
        options={{
          tabBarLabel: 'Клиенты',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="people-outline" size={size || 24} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="BusinessMore"
        component={BusinessMoreMenuScreen}
        options={{
          tabBarLabel: 'Ещё',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="ellipsis-horizontal-outline" size={size || 24} color={color} />
          ),
        }}
      />
    </Tab.Navigator>
  );
}
