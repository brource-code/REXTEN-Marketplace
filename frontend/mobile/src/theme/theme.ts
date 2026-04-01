/**
 * Централизованная система тем приложения.
 * 
 * ВСЕ цвета должны быть ТОЛЬКО здесь.
 * Компоненты используют theme.xxx, НЕ хардкод.
 * 
 * @example
 * const { theme } = useTheme();
 * <View style={{ backgroundColor: theme.background }}>
 *   <Text style={{ color: theme.text }}>Hello</Text>
 * </View>
 */

export interface Theme {
  // Основные фоны
  background: string;
  backgroundSecondary: string;
  backgroundTertiary: string;
  
  // Карточки
  card: string;
  cardBorder: string;
  
  // Текст
  text: string;
  textSecondary: string;
  textMuted: string;
  textInverse: string;
  
  // Primary (акцент)
  primary: string;
  primaryLight: string;
  primaryDark: string;
  
  // Границы и разделители
  border: string;
  
  // Инпуты
  inputBackground: string;
  inputBorder: string;
  inputText: string;
  inputPlaceholder: string;
  
  // Статусы
  success: string;
  successLight: string;
  successDark: string;
  
  error: string;
  errorLight: string;
  
  warning: string;
  warningLight: string;
  
  info: string;
  infoLight: string;
  
  purple: string;
  purpleLight: string;
  
  // Иконки
  icon: string;
  iconMuted: string;
  
  // StatusBar
  statusBar: 'light-content' | 'dark-content';
  
  // Для кнопок
  buttonText: string;
  
  // Switch компонент
  switchTrackOff: string;
  switchTrackOn: string;
  switchThumbOff: string;
  switchThumbOn: string;
  switchTrackOnSuccess: string;
  switchThumbOnSuccess: string;
}

export const lightTheme: Theme = {
  // Основные фоны
  background: '#ffffff',
  backgroundSecondary: '#f9fafb',
  backgroundTertiary: '#f3f4f6',
  
  // Карточки
  card: '#ffffff',
  cardBorder: '#e5e7eb',
  
  // Текст
  text: '#111827',
  textSecondary: '#6b7280',
  textMuted: '#9ca3af',
  textInverse: '#ffffff',
  
  // Primary
  primary: '#2563eb',
  primaryLight: '#dbeafe',
  primaryDark: '#1d4ed8',
  
  // Границы
  border: '#e5e7eb',
  
  // Инпуты
  inputBackground: '#ffffff',
  inputBorder: '#d1d5db',
  inputText: '#111827',
  inputPlaceholder: '#9ca3af',
  
  // Статусы
  success: '#059669',
  successLight: '#d1fae5',
  successDark: '#065f46',
  
  error: '#dc2626',
  errorLight: '#fecaca',
  
  warning: '#d97706',
  warningLight: '#fef3c7',
  
  info: '#2563eb',
  infoLight: '#dbeafe',
  
  purple: '#7c3aed',
  purpleLight: '#ede9fe',
  
  // Иконки
  icon: '#6b7280',
  iconMuted: '#9ca3af',
  
  // StatusBar
  statusBar: 'dark-content',
  
  // Кнопки
  buttonText: '#ffffff',
  
  // Switch
  switchTrackOff: '#e5e7eb',
  switchTrackOn: '#93c5fd',
  switchThumbOff: '#f4f4f5',
  switchThumbOn: '#2563eb',
  switchTrackOnSuccess: '#86efac',
  switchThumbOnSuccess: '#16a34a',
};

export const darkTheme: Theme = {
  // Основные фоны
  background: '#111827',
  backgroundSecondary: '#1f2937',
  backgroundTertiary: '#374151',
  
  // Карточки
  card: '#1f2937',
  cardBorder: '#374151',
  
  // Текст
  text: '#f9fafb',
  textSecondary: '#d1d5db',
  textMuted: '#9ca3af',
  textInverse: '#111827',
  
  // Primary
  primary: '#3b82f6',
  primaryLight: '#1e3a5f',
  primaryDark: '#60a5fa',
  
  // Границы
  border: '#374151',
  
  // Инпуты
  inputBackground: '#1f2937',
  inputBorder: '#4b5563',
  inputText: '#f9fafb',
  inputPlaceholder: '#9ca3af',
  
  // Статусы
  success: '#10b981',
  successLight: '#064e3b',
  successDark: '#34d399',
  
  error: '#f87171',
  errorLight: '#7f1d1d',
  
  warning: '#fbbf24',
  warningLight: '#78350f',
  
  info: '#60a5fa',
  infoLight: '#1e3a5f',
  
  purple: '#a78bfa',
  purpleLight: '#4c1d95',
  
  // Иконки
  icon: '#d1d5db',
  iconMuted: '#9ca3af',
  
  // StatusBar
  statusBar: 'light-content',
  
  // Кнопки
  buttonText: '#ffffff',
  
  // Switch
  switchTrackOff: '#4b5563',
  switchTrackOn: '#60a5fa',
  switchThumbOff: '#9ca3af',
  switchThumbOn: '#3b82f6',
  switchTrackOnSuccess: '#34d399',
  switchThumbOnSuccess: '#10b981',
};

// Проверка что обе темы имеют одинаковые ключи
const lightKeys = Object.keys(lightTheme).sort().join(',');
const darkKeys = Object.keys(darkTheme).sort().join(',');
if (lightKeys !== darkKeys) {
  console.error('Theme keys mismatch! lightTheme and darkTheme must have identical keys.');
}
