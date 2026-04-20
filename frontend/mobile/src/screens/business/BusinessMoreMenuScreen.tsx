import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Switch,
  Image,
} from 'react-native';
import { CompositeNavigationProp, useNavigation } from '@react-navigation/native';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ScreenContainer } from '../../components/ScreenContainer';
import { BusinessTabParamList } from '../../navigation/BusinessTabNavigator';
import { BusinessStackParamList } from '../../navigation/BusinessStackNavigator';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme, ThemeMode } from '../../contexts/ThemeContext';
import { normalizeImageUrl } from '../../api/config';

type Nav = CompositeNavigationProp<
  BottomTabNavigationProp<BusinessTabParamList, 'BusinessMore'>,
  NativeStackNavigationProp<BusinessStackParamList>
>;

type MenuRoute = Exclude<
  keyof BusinessStackParamList,
  'BusinessTabs' | 'BusinessBookingDetail' | 'BusinessClientDetail'
>;

type Item = {
  key: MenuRoute;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  adsOnly?: boolean;
};

const SECTIONS: { title: string; items: Item[] }[] = [
  {
    title: 'Настройки',
    items: [
      { key: 'BusinessServices', label: 'Услуги', icon: 'list-outline' },
      { key: 'BusinessTeam', label: 'Команда', icon: 'people-outline' },
      { key: 'BusinessCompanyUsers', label: 'Пользователи компании', icon: 'person-add-outline' },
      { key: 'BusinessRoles', label: 'Роли и права', icon: 'shield-outline' },
      { key: 'BusinessProfileSettings', label: 'Профиль компании', icon: 'business-outline' },
      { key: 'BusinessScheduleSettings', label: 'Часы работы', icon: 'time-outline' },
      { key: 'BusinessMarketplace', label: 'Витрина маркетплейса', icon: 'storefront-outline' },
      { key: 'BusinessNotificationsSettings', label: 'Уведомления (настройки)', icon: 'notifications-outline' },
      { key: 'BusinessNotificationsInbox', label: 'Входящие уведомления', icon: 'mail-outline' },
      { key: 'BusinessPaymentsSettings', label: 'Платежи (Stripe)', icon: 'wallet-outline' },
      { key: 'BusinessPortfolio', label: 'Портфолио', icon: 'images-outline' },
    ],
  },
  {
    title: 'Объявления',
    items: [
      { key: 'BusinessAdvertisements', label: 'Все объявления', icon: 'documents-outline' },
      { key: 'BusinessAdvertisements', label: 'Реклама (ads)', icon: 'megaphone-outline', adsOnly: true },
      { key: 'BusinessAdvertisementCreate', label: 'Создать объявление', icon: 'add-circle-outline' },
      { key: 'BusinessAdvertisementPurchase', label: 'Купить размещение', icon: 'cart-outline' },
    ],
  },
  {
    title: 'Операции',
    items: [
      { key: 'BusinessRecurringList', label: 'Повторяющиеся брони', icon: 'repeat-outline' },
      { key: 'BusinessReviews', label: 'Отзывы', icon: 'chatbubbles-outline' },
      { key: 'BusinessReports', label: 'Отчёты', icon: 'bar-chart-outline' },
      { key: 'BusinessDiscounts', label: 'Скидки и промокоды', icon: 'pricetag-outline' },
      { key: 'BusinessBilling', label: 'Транзакции Stripe', icon: 'card-outline' },
    ],
  },
  {
    title: 'Прочее',
    items: [{ key: 'BusinessLegal', label: 'Документы (legal)', icon: 'document-text-outline' }],
  },
];

const LANGUAGES = [
  { code: 'ru', label: 'Русский' },
  { code: 'en', label: 'English' },
  { code: 'es', label: 'Español' },
  { code: 'hy', label: 'Հայdelays' },
];

const THEME_OPTIONS: { value: ThemeMode; label: string }[] = [
  { value: 'light', label: 'Светлая' },
  { value: 'dark', label: 'Тёмная' },
  { value: 'system', label: 'Системная' },
];

export function BusinessMoreMenuScreen() {
  const navigation = useNavigation<Nav>();
  const { user, logout } = useAuth();
  const { mode, isDark, colors, setMode } = useTheme();

  const [selectedLanguage, setSelectedLanguage] = useState('ru');
  const [showLanguagePicker, setShowLanguagePicker] = useState(false);
  const [showThemePicker, setShowThemePicker] = useState(false);
  const [avatarLoadFailed, setAvatarLoadFailed] = useState(false);

  const rawAvatar = (user as { avatar?: string; image?: string })?.avatar || (user as { avatar?: string; image?: string })?.image;
  const avatarUri = normalizeImageUrl(rawAvatar);

  useEffect(() => {
    setAvatarLoadFailed(false);
  }, [rawAvatar, user?.id]);

  useEffect(() => {
    loadLanguage();
  }, []);

  const loadLanguage = async () => {
    try {
      const savedLang = await AsyncStorage.getItem('@app_language');
      if (savedLang) {
        setSelectedLanguage(savedLang);
      }
    } catch (error) {
      console.error('Error loading language:', error);
    }
  };

  const go = (item: Item) => {
    if (item.key === 'BusinessAdvertisements') {
      navigation.navigate('BusinessAdvertisements', item.adsOnly ? { adsOnly: true } : {});
      return;
    }
    navigation.navigate(item.key);
  };

  const handleLogout = () => {
    Alert.alert(
      'Выход из аккаунта',
      'Вы уверены, что хотите выйти?',
      [
        { text: 'Отмена', style: 'cancel' },
        {
          text: 'Выйти',
          style: 'destructive',
          onPress: async () => {
            try {
              await logout();
            } catch (error) {
              console.error('Logout error:', error);
            }
          },
        },
      ]
    );
  };

  const handleLanguageChange = async (langCode: string) => {
    setSelectedLanguage(langCode);
    setShowLanguagePicker(false);
    await AsyncStorage.setItem('@app_language', langCode);
    Alert.alert(
      'Язык изменён',
      'Перезапустите приложение для применения изменений.',
      [{ text: 'OK' }]
    );
  };

  const handleThemeChange = async (newMode: ThemeMode) => {
    await setMode(newMode);
    setShowThemePicker(false);
  };

  const currentLanguage = LANGUAGES.find((l) => l.code === selectedLanguage);
  const currentTheme = THEME_OPTIONS.find((t) => t.value === mode);

  const dynamicStyles = {
    scrollContent: {
      padding: 16,
      paddingTop: 60,
      paddingBottom: 32,
    },
    pageTitle: {
      fontSize: 20,
      fontWeight: '700' as const,
      color: colors.text,
      marginBottom: 16,
      marginTop: 8,
    },
    accountCard: {
      backgroundColor: colors.card,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      padding: 16,
      marginBottom: 8,
    },
    avatar: {
      width: 48,
      height: 48,
      borderRadius: 24,
      backgroundColor: colors.primaryLight,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
    },
    avatarText: {
      fontSize: 20,
      fontWeight: '700' as const,
      color: colors.primary,
    },
    accountName: {
      fontSize: 16,
      fontWeight: '700' as const,
      color: colors.text,
    },
    accountEmail: {
      fontSize: 13,
      fontWeight: '600' as const,
      color: colors.textSecondary,
      marginTop: 2,
    },
    section: {
      fontSize: 13,
      fontWeight: '700' as const,
      color: colors.textSecondary,
      textTransform: 'uppercase' as const,
      letterSpacing: 0.5,
      marginTop: 20,
      marginBottom: 10,
    },
    row: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      backgroundColor: colors.card,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      paddingVertical: 14,
      paddingHorizontal: 16,
      marginBottom: 8,
    },
    rowLabel: {
      flex: 1,
      fontSize: 16,
      fontWeight: '600' as const,
      color: colors.text,
      marginLeft: 12,
    },
    rowValue: {
      fontSize: 14,
      fontWeight: '600' as const,
      color: colors.textSecondary,
      marginRight: 8,
    },
    picker: {
      backgroundColor: colors.card,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      marginBottom: 8,
      overflow: 'hidden' as const,
    },
    pickerOption: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      justifyContent: 'space-between' as const,
      paddingVertical: 12,
      paddingHorizontal: 16,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    pickerOptionActive: {
      backgroundColor: colors.primaryLight,
    },
    pickerOptionText: {
      fontSize: 15,
      fontWeight: '600' as const,
      color: colors.text,
    },
    pickerOptionTextActive: {
      color: colors.primary,
    },
    hint: {
      fontSize: 12,
      fontWeight: '600' as const,
      color: colors.textMuted,
      marginTop: -4,
      marginBottom: 8,
      marginLeft: 4,
    },
    logoutRow: {
      backgroundColor: colors.errorLight,
      borderColor: colors.error,
    },
    versionBlock: {
      alignItems: 'center' as const,
      marginTop: 24,
      paddingTop: 16,
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },
    versionText: {
      fontSize: 12,
      fontWeight: '600' as const,
      color: colors.textMuted,
    },
  };

  return (
    <ScreenContainer edges={['bottom']}>
      <ScrollView style={styles.scroll} contentContainerStyle={dynamicStyles.scrollContent}>
        <Text style={dynamicStyles.pageTitle}>Ещё</Text>

        {/* Аккаунт — клик переходит на профиль */}
        <TouchableOpacity
          style={dynamicStyles.accountCard}
          onPress={() => navigation.navigate('UserProfile')}
          activeOpacity={0.7}
        >
          <View style={styles.accountInfo}>
            {avatarUri && !avatarLoadFailed ? (
              <Image
                source={{ uri: avatarUri }}
                style={[styles.avatarImage, { backgroundColor: colors.border }]}
                onError={() => setAvatarLoadFailed(true)}
              />
            ) : (
              <View style={dynamicStyles.avatar}>
                <Text style={dynamicStyles.avatarText}>
                  {user?.name?.charAt(0).toUpperCase() || 'U'}
                </Text>
              </View>
            )}
            <View style={styles.accountDetails}>
              <Text style={dynamicStyles.accountName}>{user?.name || 'Пользователь'}</Text>
              <Text style={dynamicStyles.accountEmail}>{user?.email || ''}</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
          </View>
        </TouchableOpacity>

        {/* Настройки приложения */}
        <Text style={dynamicStyles.section}>Приложение</Text>

        {/* Язык */}
        <TouchableOpacity
          style={dynamicStyles.row}
          onPress={() => {
            setShowLanguagePicker(!showLanguagePicker);
            setShowThemePicker(false);
          }}
          activeOpacity={0.7}
        >
          <Ionicons name="language-outline" size={22} color={colors.primary} />
          <Text style={dynamicStyles.rowLabel}>Язык</Text>
          <Text style={dynamicStyles.rowValue}>{currentLanguage?.label}</Text>
          <Ionicons
            name={showLanguagePicker ? 'chevron-up' : 'chevron-down'}
            size={20}
            color={colors.textMuted}
          />
        </TouchableOpacity>

        {showLanguagePicker && (
          <View style={dynamicStyles.picker}>
            {LANGUAGES.map((lang, index) => (
              <TouchableOpacity
                key={lang.code}
                style={[
                  dynamicStyles.pickerOption,
                  selectedLanguage === lang.code && dynamicStyles.pickerOptionActive,
                  index === LANGUAGES.length - 1 && { borderBottomWidth: 0 },
                ]}
                onPress={() => handleLanguageChange(lang.code)}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    dynamicStyles.pickerOptionText,
                    selectedLanguage === lang.code && dynamicStyles.pickerOptionTextActive,
                  ]}
                >
                  {lang.label}
                </Text>
                {selectedLanguage === lang.code && (
                  <Ionicons name="checkmark" size={18} color={colors.primary} />
                )}
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Тема */}
        <TouchableOpacity
          style={dynamicStyles.row}
          onPress={() => {
            setShowThemePicker(!showThemePicker);
            setShowLanguagePicker(false);
          }}
          activeOpacity={0.7}
        >
          <Ionicons name={isDark ? 'moon' : 'sunny-outline'} size={22} color={colors.primary} />
          <Text style={dynamicStyles.rowLabel}>Тема</Text>
          <Text style={dynamicStyles.rowValue}>{currentTheme?.label}</Text>
          <Ionicons
            name={showThemePicker ? 'chevron-up' : 'chevron-down'}
            size={20}
            color={colors.textMuted}
          />
        </TouchableOpacity>

        {showThemePicker && (
          <View style={dynamicStyles.picker}>
            {THEME_OPTIONS.map((option, index) => (
              <TouchableOpacity
                key={option.value}
                style={[
                  dynamicStyles.pickerOption,
                  mode === option.value && dynamicStyles.pickerOptionActive,
                  index === THEME_OPTIONS.length - 1 && { borderBottomWidth: 0 },
                ]}
                onPress={() => handleThemeChange(option.value)}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    dynamicStyles.pickerOptionText,
                    mode === option.value && dynamicStyles.pickerOptionTextActive,
                  ]}
                >
                  {option.label}
                </Text>
                {mode === option.value && (
                  <Ionicons name="checkmark" size={18} color={colors.primary} />
                )}
              </TouchableOpacity>
            ))}
          </View>
        )}

        <Text style={dynamicStyles.hint}>
          Системная тема следует настройкам устройства
        </Text>

        {/* Основные секции */}
        {SECTIONS.map((section) => (
          <View key={section.title}>
            <Text style={dynamicStyles.section}>{section.title}</Text>
            {section.items.map((item) => (
              <TouchableOpacity
                key={`${item.key}-${item.label}-${item.adsOnly ? '1' : '0'}`}
                style={dynamicStyles.row}
                onPress={() => go(item)}
                activeOpacity={0.7}
              >
                <Ionicons name={item.icon} size={22} color={colors.primary} />
                <Text style={dynamicStyles.rowLabel}>{item.label}</Text>
                <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
              </TouchableOpacity>
            ))}
          </View>
        ))}

        {/* Выход */}
        <Text style={dynamicStyles.section}>Аккаунт</Text>
        <TouchableOpacity
          style={[dynamicStyles.row, dynamicStyles.logoutRow]}
          onPress={handleLogout}
          activeOpacity={0.7}
        >
          <Ionicons name="log-out-outline" size={22} color={colors.error} />
          <Text style={[dynamicStyles.rowLabel, { color: colors.error }]}>Выйти из аккаунта</Text>
        </TouchableOpacity>

        {/* Версия */}
        <View style={dynamicStyles.versionBlock}>
          <Text style={dynamicStyles.versionText}>REXTEN Business v1.0.0</Text>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  accountInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarImage: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  accountDetails: { marginLeft: 14, flex: 1 },
});
