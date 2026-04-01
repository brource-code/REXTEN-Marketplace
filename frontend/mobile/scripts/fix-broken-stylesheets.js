#!/usr/bin/env node
/**
 * Скрипт для исправления повреждённых StyleSheet.create
 */

const fs = require('fs');
const path = require('path');

const files = [
  'src/components/business/ClientCreateModal.tsx',
  'src/components/business/ClientEditModal.tsx',
  'src/components/business/DashboardLineChart.tsx',
  'src/components/business/ScheduleMonthCalendar.tsx',
  'src/components/business/ScheduleNewBookingModal.tsx',
  'src/components/business/ScheduleRecurringBookingModal.tsx',
  'src/screens/BookingScreen.tsx',
  'src/screens/BookingsListScreen.tsx',
  'src/screens/business/BusinessAdvertisementCreateScreen.tsx',
  'src/screens/business/BusinessAdvertisementDetailScreen.tsx',
  'src/screens/business/BusinessAdvertisementPurchaseScreen.tsx',
  'src/screens/business/BusinessAdvertisementsScreen.tsx',
  'src/screens/business/BusinessBillingScreen.tsx',
  'src/screens/business/BusinessBookingDetailScreen.tsx',
  'src/screens/business/BusinessBookingsListScreen.tsx',
  'src/screens/business/BusinessClientDetailScreen.tsx',
  'src/screens/business/BusinessCompanyUsersScreen.tsx',
  'src/screens/business/BusinessDiscountsScreen.tsx',
  'src/screens/business/BusinessLegalScreen.tsx',
  'src/screens/business/BusinessMarketplaceScreen.tsx',
  'src/screens/business/BusinessNotificationsInboxScreen.tsx',
  'src/screens/business/BusinessNotificationsSettingsScreen.tsx',
  'src/screens/business/BusinessPaymentsSettingsScreen.tsx',
  'src/screens/business/BusinessPlaceholderScreen.tsx',
  'src/screens/business/BusinessPortfolioScreen.tsx',
  'src/screens/business/BusinessProfileSettingsScreen.tsx',
  'src/screens/business/BusinessRecurringListScreen.tsx',
  'src/screens/business/BusinessReportsScreen.tsx',
  'src/screens/business/BusinessReviewsScreen.tsx',
  'src/screens/business/BusinessRolesScreen.tsx',
  'src/screens/business/BusinessScheduleScreen.tsx',
  'src/screens/business/BusinessScheduleSettingsScreen.tsx',
  'src/screens/business/BusinessServicesScreen.tsx',
  'src/screens/business/BusinessTeamScreen.tsx',
  'src/screens/business/UserProfileScreen.tsx',
  'src/screens/FavoritesScreen.tsx',
  'src/screens/FiltersScreen.tsx',
  'src/screens/LoginScreen.tsx',
  'src/screens/ProfileScreen.tsx',
  'src/screens/ProfileSettingsScreen.tsx',
  'src/screens/RegisterScreen.tsx',
  'src/screens/ServiceDetailsScreen.tsx',
  'src/screens/ServicesHomeScreen.tsx',
  'src/components/layout/PageLayout.tsx',
];

const baseDir = path.join(__dirname, '..');

files.forEach(filePath => {
  const fullPath = path.join(baseDir, filePath);
  if (!fs.existsSync(fullPath)) {
    console.log(`Файл не найден: ${filePath}`);
    return;
  }
  
  let content = fs.readFileSync(fullPath, 'utf8');
  
  // Исправляем типичные проблемы:
  // 1. Отсутствующие запятые после }
  content = content.replace(/\}(\s*)\n(\s*)([a-zA-Z])/g, '},\n$2$3');
  
  // 2. Отсутствующие запятые после значений
  content = content.replace(/(\d+|'[^']*'|"[^"]*")(\s*)\n(\s*)([a-zA-Z])/g, '$1,$2\n$3$4');
  
  // 3. Исправляем "background\n" на "backgroundColor: theme.xxx,"
  content = content.replace(/background\s*\n/g, '');
  
  // 4. Исправляем незакрытые объекты
  content = content.replace(/\}\);(\s*)$/gm, '});');
  
  fs.writeFileSync(fullPath, content, 'utf8');
  console.log(`Обработан: ${filePath}`);
});

console.log('\nГотово!');
