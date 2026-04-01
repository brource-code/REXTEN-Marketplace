import { useTheme } from '../contexts/ThemeContext';

export function useThemedStyles() {
  const { colors, isDark } = useTheme();

  return {
    colors,
    isDark,
    
    // Базовые стили для контейнеров
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    
    // Стили для карточек
    card: {
      backgroundColor: colors.card,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      padding: 16,
      marginBottom: 12,
    },
    
    // Стили для заголовков страниц
    pageTitle: {
      fontSize: 20,
      fontWeight: '700' as const,
      color: colors.text,
      marginBottom: 8,
    },
    
    pageDescription: {
      fontSize: 14,
      fontWeight: '600' as const,
      color: colors.textSecondary,
      marginBottom: 16,
    },
    
    // Стили для секций
    sectionTitle: {
      fontSize: 13,
      fontWeight: '700' as const,
      color: colors.textSecondary,
      textTransform: 'uppercase' as const,
      letterSpacing: 0.5,
      marginTop: 20,
      marginBottom: 10,
    },
    
    // Стили для текста
    text: {
      color: colors.text,
    },
    
    textSecondary: {
      color: colors.textSecondary,
    },
    
    textMuted: {
      color: colors.textMuted,
    },
    
    // Стили для инпутов
    input: {
      backgroundColor: colors.inputBackground,
      borderWidth: 1,
      borderColor: colors.inputBorder,
      borderRadius: 10,
      paddingHorizontal: 14,
      paddingVertical: 12,
      fontSize: 15,
      color: colors.text,
    },
    
    inputPlaceholder: colors.textMuted,
    
    // Стили для строк/рядов
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
    
    // Стили для кнопок
    primaryButton: {
      backgroundColor: colors.primary,
      borderRadius: 10,
      paddingVertical: 14,
      paddingHorizontal: 20,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
    },
    
    primaryButtonText: {
      color: colors.buttonText,
      fontSize: 16,
      fontWeight: '600' as const,
    },
    
    secondaryButton: {
      backgroundColor: colors.backgroundTertiary,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 10,
      paddingVertical: 14,
      paddingHorizontal: 20,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
    },
    
    secondaryButtonText: {
      color: colors.primary,
      fontSize: 16,
      fontWeight: '600' as const,
    },
    
    // Стили для разделителей
    divider: {
      height: 1,
      backgroundColor: colors.border,
      marginVertical: 16,
    },
    
    // Стили для модальных окон
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      justifyContent: 'flex-end' as const,
    },
    
    modalContent: {
      backgroundColor: colors.background,
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      maxHeight: '90%' as const,
    },
    
    modalHeader: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      justifyContent: 'space-between' as const,
      padding: 16,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    
    modalTitle: {
      fontSize: 18,
      fontWeight: '700' as const,
      color: colors.text,
    },
    
    // Стили для чипов/тегов
    chip: {
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 16,
      backgroundColor: colors.backgroundSecondary,
      marginRight: 8,
    },
    
    chipActive: {
      backgroundColor: colors.primary,
    },
    
    chipText: {
      fontSize: 13,
      fontWeight: '600' as const,
      color: colors.textSecondary,
    },
    
    chipTextActive: {
      color: colors.buttonText,
    },
    
    // Стили для пустых состояний
    emptyContainer: {
      flex: 1,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
      paddingVertical: 60,
    },
    
    emptyText: {
      fontSize: 16,
      fontWeight: '600' as const,
      color: colors.textSecondary,
      marginTop: 12,
    },
    
    emptyHint: {
      fontSize: 14,
      color: colors.textMuted,
      marginTop: 4,
      textAlign: 'center' as const,
    },
  };
}
