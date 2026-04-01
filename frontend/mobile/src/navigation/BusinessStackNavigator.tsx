import React, { useMemo } from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useTheme } from '../contexts/ThemeContext';
import { BusinessTabNavigator } from './BusinessTabNavigator';
import { BusinessBookingDetailScreen } from '../screens/business/BusinessBookingDetailScreen';
import { BusinessClientDetailScreen } from '../screens/business/BusinessClientDetailScreen';
import { BusinessScheduleSettingsScreen } from '../screens/business/BusinessScheduleSettingsScreen';
import { BusinessRecurringListScreen } from '../screens/business/BusinessRecurringListScreen';
import { BusinessReviewsScreen } from '../screens/business/BusinessReviewsScreen';
import { BusinessReportsScreen } from '../screens/business/BusinessReportsScreen';
import { BusinessDiscountsScreen } from '../screens/business/BusinessDiscountsScreen';
import { BusinessAdvertisementsScreen } from '../screens/business/BusinessAdvertisementsScreen';
import { BusinessBillingScreen } from '../screens/business/BusinessBillingScreen';
import { BusinessProfileSettingsScreen } from '../screens/business/BusinessProfileSettingsScreen';
import { BusinessServicesScreen } from '../screens/business/BusinessServicesScreen';
import { BusinessTeamScreen } from '../screens/business/BusinessTeamScreen';
import { BusinessCompanyUsersScreen } from '../screens/business/BusinessCompanyUsersScreen';
import { BusinessRolesScreen } from '../screens/business/BusinessRolesScreen';
import { BusinessMarketplaceScreen } from '../screens/business/BusinessMarketplaceScreen';
import { BusinessNotificationsSettingsScreen } from '../screens/business/BusinessNotificationsSettingsScreen';
import { BusinessNotificationsInboxScreen } from '../screens/business/BusinessNotificationsInboxScreen';
import { BusinessPortfolioScreen } from '../screens/business/BusinessPortfolioScreen';
import { BusinessAdvertisementCreateScreen } from '../screens/business/BusinessAdvertisementCreateScreen';
import { BusinessAdvertisementPurchaseScreen } from '../screens/business/BusinessAdvertisementPurchaseScreen';
import { BusinessPaymentsSettingsScreen } from '../screens/business/BusinessPaymentsSettingsScreen';
import { BusinessLegalScreen } from '../screens/business/BusinessLegalScreen';
import { BusinessAdvertisementDetailScreen } from '../screens/business/BusinessAdvertisementDetailScreen';
import { UserProfileScreen } from '../screens/business/UserProfileScreen';

export type BusinessStackParamList = {
  BusinessTabs: undefined;
  BusinessBookingDetail: { bookingId: number };
  BusinessClientDetail: { clientId: number };
  BusinessScheduleSettings: undefined;
  BusinessRecurringList: undefined;
  BusinessReviews: undefined;
  BusinessReports: undefined;
  BusinessDiscounts: undefined;
  BusinessAdvertisements: { adsOnly?: boolean } | undefined;
  BusinessAdvertisementDetail: { advertisementId: number };
  BusinessBilling: undefined;
  BusinessProfileSettings: undefined;
  BusinessServices: undefined;
  BusinessTeam: undefined;
  BusinessCompanyUsers: undefined;
  BusinessRoles: undefined;
  BusinessMarketplace: undefined;
  BusinessNotificationsSettings: undefined;
  BusinessNotificationsInbox: undefined;
  BusinessPortfolio: undefined;
  BusinessAdvertisementCreate: { editId?: number } | undefined;
  BusinessAdvertisementPurchase: undefined;
  BusinessPaymentsSettings: undefined;
  BusinessLegal: undefined;
  UserProfile: undefined;
};

const Stack = createNativeStackNavigator<BusinessStackParamList>();

export function BusinessStackNavigator() {
  const { colors } = useTheme();

  const headerOptions = useMemo(() => ({
    headerShown: true,
    headerBackTitle: 'Назад',
    headerTintColor: colors.primary,
    headerStyle: { backgroundColor: colors.background },
    headerTitleStyle: { fontWeight: '700' as const, fontSize: 18, color: colors.text },
  }), [colors]);

  return (
    <Stack.Navigator screenOptions={headerOptions}>
      <Stack.Screen
        name="BusinessTabs"
        component={BusinessTabNavigator}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="BusinessBookingDetail"
        component={BusinessBookingDetailScreen}
        options={{ title: 'Бронирование' }}
      />
      <Stack.Screen
        name="BusinessClientDetail"
        component={BusinessClientDetailScreen}
        options={{ title: 'Клиент' }}
      />
      <Stack.Screen
        name="BusinessScheduleSettings"
        component={BusinessScheduleSettingsScreen}
        options={{ title: 'Часы работы' }}
      />
      <Stack.Screen
        name="BusinessRecurringList"
        component={BusinessRecurringListScreen}
        options={{ title: 'Повторы' }}
      />
      <Stack.Screen name="BusinessReviews" component={BusinessReviewsScreen} options={{ title: 'Отзывы' }} />
      <Stack.Screen name="BusinessReports" component={BusinessReportsScreen} options={{ title: 'Отчёты' }} />
      <Stack.Screen
        name="BusinessDiscounts"
        component={BusinessDiscountsScreen}
        options={{ title: 'Скидки' }}
      />
      <Stack.Screen
        name="BusinessAdvertisements"
        component={BusinessAdvertisementsScreen}
        options={{ title: 'Объявления' }}
      />
      <Stack.Screen
        name="BusinessAdvertisementDetail"
        component={BusinessAdvertisementDetailScreen}
        options={{ title: 'Объявление' }}
      />
      <Stack.Screen name="BusinessBilling" component={BusinessBillingScreen} options={{ title: 'Транзакции' }} />
      <Stack.Screen
        name="BusinessProfileSettings"
        component={BusinessProfileSettingsScreen}
        options={{ title: 'Профиль' }}
      />
      <Stack.Screen name="BusinessServices" component={BusinessServicesScreen} options={{ title: 'Услуги' }} />
      <Stack.Screen name="BusinessTeam" component={BusinessTeamScreen} options={{ title: 'Команда' }} />
      <Stack.Screen
        name="BusinessCompanyUsers"
        component={BusinessCompanyUsersScreen}
        options={{ title: 'Пользователи' }}
      />
      <Stack.Screen name="BusinessRoles" component={BusinessRolesScreen} options={{ title: 'Роли' }} />
      <Stack.Screen
        name="BusinessMarketplace"
        component={BusinessMarketplaceScreen}
        options={{ title: 'Витрина' }}
      />
      <Stack.Screen
        name="BusinessNotificationsSettings"
        component={BusinessNotificationsSettingsScreen}
        options={{ title: 'Уведомления' }}
      />
      <Stack.Screen
        name="BusinessNotificationsInbox"
        component={BusinessNotificationsInboxScreen}
        options={{ title: 'Входящие' }}
      />
      <Stack.Screen name="BusinessPortfolio" component={BusinessPortfolioScreen} options={{ title: 'Портфолио' }} />
      <Stack.Screen
        name="BusinessAdvertisementCreate"
        component={BusinessAdvertisementCreateScreen}
        options={{ title: 'Новое объявление' }}
      />
      <Stack.Screen
        name="BusinessAdvertisementPurchase"
        component={BusinessAdvertisementPurchaseScreen}
        options={{ title: 'Купить размещение' }}
      />
      <Stack.Screen
        name="BusinessPaymentsSettings"
        component={BusinessPaymentsSettingsScreen}
        options={{ title: 'Платежи' }}
      />
      <Stack.Screen name="BusinessLegal" component={BusinessLegalScreen} options={{ title: 'Документы' }} />
      <Stack.Screen name="UserProfile" component={UserProfileScreen} options={{ title: 'Профиль' }} />
    </Stack.Navigator>
  );
}
