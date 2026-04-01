import React from 'react';
import { View, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { ServicesHomeScreen } from '../screens/ServicesHomeScreen';
import { FiltersScreen } from '../screens/FiltersScreen';
import { ServiceDetailsScreen } from '../screens/ServiceDetailsScreen';
import { BookingScreen } from '../screens/BookingScreen';
import { ProfileScreen } from '../screens/ProfileScreen';
import { ProfileSettingsScreen } from '../screens/ProfileSettingsScreen';
import { FavoritesScreen } from '../screens/FavoritesScreen';
import { BookingsListScreen } from '../screens/BookingsListScreen';
import { LoginScreen } from '../screens/LoginScreen';
import { RegisterScreen } from '../screens/RegisterScreen';
import { BusinessStackNavigator } from './BusinessStackNavigator';
import { useAuth } from '../contexts/AuthContext';
import { isBusinessAppRole } from '../constants/roles';
import { useTheme } from '../contexts/ThemeContext';

export type RootStackParamList = {
  MainTabs: undefined;
  BusinessMain: undefined;
  Filters: {
    filters: any;
    onApplyFilters: (filters: any) => void;
  };
  ServiceDetails: {
    slug: string;
  };
  Booking: {
    serviceId: string;
    companyId: number;
    advertisementId?: number;
  };
  ProfileSettings: undefined;
  Login: undefined;
  Register: undefined;
};

export type MainTabParamList = {
  Services: undefined;
  Favorites: undefined;
  Bookings: undefined;
  Profile: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<MainTabParamList>();

const MainTabsNavigator: React.FC = () => {
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
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '500',
        },
      }}
    >
      <Tab.Screen
        name="Services"
        component={ServicesHomeScreen}
        options={{
          tabBarLabel: 'Услуги',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="storefront-outline" size={size || 24} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Favorites"
        component={FavoritesScreen}
        options={{
          tabBarLabel: 'Избранное',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="heart-outline" size={size || 24} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Bookings"
        component={BookingsListScreen}
        options={{
          tabBarLabel: 'Бронирования',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="calendar-outline" size={size || 24} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          tabBarLabel: 'Профиль',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="person-outline" size={size || 24} color={color} />
          ),
        }}
      />
    </Tab.Navigator>
  );
};

export const RootNavigator: React.FC = () => {
  const { user, isLoading } = useAuth();
  const { colors } = useTheme();

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background }}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  const isBusiness = !!user && isBusinessAppRole(user.role);
  const rootKey = !user ? 'guest' : isBusiness ? 'business' : 'client';

  return (
    <Stack.Navigator
      key={rootKey}
      initialRouteName={isBusiness ? 'BusinessMain' : 'MainTabs'}
      screenOptions={{
        headerShown: false,
      }}
    >
      {/*
        Важно: первый Stack.Screen должен совпадать с initialRouteName — иначе native stack
        может оставить маркетплейс (MainTabs) при роли BUSINESS_OWNER.
      */}
      {isBusiness ? (
        <>
          <Stack.Screen name="BusinessMain" component={BusinessStackNavigator} />
          <Stack.Screen name="MainTabs" component={MainTabsNavigator} />
        </>
      ) : (
        <>
          <Stack.Screen name="MainTabs" component={MainTabsNavigator} />
          <Stack.Screen name="BusinessMain" component={BusinessStackNavigator} />
        </>
      )}
      <Stack.Screen
        name="Filters"
        component={FiltersScreen}
        options={{
          presentation: 'modal',
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="ServiceDetails"
        component={ServiceDetailsScreen}
        options={{
          headerShown: true,
          headerTitle: '',
          headerBackTitle: 'Назад',
        }}
      />
      <Stack.Screen
        name="Booking"
        component={BookingScreen}
        options={{
          headerShown: true,
          headerTitle: 'Бронирование',
          headerBackTitle: 'Назад',
        }}
      />
      <Stack.Screen
        name="Login"
        component={LoginScreen}
        options={{
          headerShown: true,
          headerTitle: 'Вход',
          presentation: 'modal',
        }}
      />
      <Stack.Screen
        name="Register"
        component={RegisterScreen}
        options={{
          headerShown: true,
          headerTitle: 'Регистрация',
          presentation: 'modal',
        }}
      />
      <Stack.Screen
        name="ProfileSettings"
        component={ProfileSettingsScreen}
        options={{
          headerShown: false,
        }}
      />
    </Stack.Navigator>
  );
};
