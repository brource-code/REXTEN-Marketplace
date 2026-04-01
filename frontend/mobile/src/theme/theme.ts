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
  /** Обводка при фокусе (в тёмной теме нейтральная, без «синей рамки» как на вебе в спокойном состоянии) */
  inputFocusBorder: string;
  /** Выделение текста в TextInput (iOS/Android) */
  selectionColor: string;
  /** Фон выбранного чипа/сегмента/фильтра (в dark — без синего заливания) */
  controlSelectedBg: string;
  controlSelectedBorder: string;
  controlSelectedText: string;
  
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
  inputFocusBorder: '#2563eb',
  selectionColor: 'rgba(37, 99, 235, 0.35)',
  controlSelectedBg: '#dbeafe',
  controlSelectedBorder: '#2563eb',
  controlSelectedText: '#2563eb',
  
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

/** Тёмная тема: те же опорные цвета, что и веб (frontend/src/assets/styles/tailwind/index.css — .dark, gray-950/900/800, --primary). */
export const darkTheme: Theme = {
  // Основные фоны (нейтральный «почти чёрный», как dark:bg-gray-950 на вебе — не slate/сине-серый)
  background: '#0a0a0a',
  backgroundSecondary: '#171717',
  backgroundTertiary: '#262626',
  
  // Карточки
  card: '#171717',
  cardBorder: '#404040',
  
  // Текст (серые из веб-палитры: gray-50 / 400 / 500)
  text: '#fafafa',
  textSecondary: '#a3a3a3',
  textMuted: '#737373',
  textInverse: '#0a0a0a',
  
  // Primary — для кнопок, табов, ссылок; не для обводки каждого поля/чипа
  primary: '#2a85ff',
  /** Лёгкая подложка под акценты (бейджи, иконки); чипы/фильтры используют controlSelected* */
  primaryLight: 'rgba(42, 133, 255, 0.12)',
  primaryDark: '#4996ff',
  
  // Границы
  border: '#404040',
  
  // Инпуты
  inputBackground: '#171717',
  inputBorder: '#525252',
  inputText: '#fafafa',
  inputPlaceholder: '#737373',
  inputFocusBorder: '#a3a3a3',
  selectionColor: 'rgba(42, 133, 255, 0.35)',
  controlSelectedBg: 'rgba(255, 255, 255, 0.08)',
  controlSelectedBorder: '#525252',
  controlSelectedText: '#fafafa',
  
  // Статусы
  success: '#10b981',
  successLight: '#052e26',
  successDark: '#34d399',
  
  error: '#ff6a55',
  errorLight: '#451a1a',
  
  warning: '#f59e0b',
  warningLight: '#422006',
  
  info: '#2a85ff',
  infoLight: 'rgba(42, 133, 255, 0.14)',
  
  purple: '#a78bfa',
  purpleLight: '#4c1d95',
  
  // Иконки
  icon: '#a3a3a3',
  iconMuted: '#737373',
  
  // StatusBar
  statusBar: 'light-content',
  
  // Кнопки
  buttonText: '#ffffff',
  
  // Switch (ближе к веб-акценту, без «чисто синего» трека)
  switchTrackOff: '#525252',
  switchTrackOn: 'rgba(42, 133, 255, 0.45)',
  switchThumbOff: '#737373',
  switchThumbOn: '#2a85ff',
  switchTrackOnSuccess: '#34d399',
  switchThumbOnSuccess: '#10b981',
};

// Проверка что обе темы имеют одинаковые ключи
const lightKeys = Object.keys(lightTheme).sort().join(',');
const darkKeys = Object.keys(darkTheme).sort().join(',');
if (lightKeys !== darkKeys) {
  console.error('Theme keys mismatch! lightTheme and darkTheme must have identical keys.');
}
