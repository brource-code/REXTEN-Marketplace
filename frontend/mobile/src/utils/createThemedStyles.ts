import { StyleSheet } from 'react-native';
import { ThemeColors } from '../contexts/ThemeContext';

export function createThemedStyles(colors: ThemeColors) {
  return StyleSheet.create({
    // Контейнеры
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    
    // Заголовки страниц
    headerFixed: {
      paddingHorizontal: 16,
      paddingTop: 8,
      paddingBottom: 8,
      backgroundColor: colors.background,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    pageTitle: {
      fontSize: 20,
      fontWeight: '700',
      color: colors.text,
    },
    pageDesc: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.textSecondary,
      marginTop: 2,
    },
    
    // Карточки
    card: {
      backgroundColor: colors.card,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      marginBottom: 12,
      overflow: 'hidden',
    },
    cardContent: {
      padding: 14,
    },
    
    // Статистика
    statCard: {
      flex: 1,
      backgroundColor: colors.backgroundSecondary,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      padding: 10,
      alignItems: 'center',
    },
    statLabel: {
      fontSize: 11,
      fontWeight: '700',
      color: colors.textSecondary,
      marginBottom: 2,
    },
    statValue: {
      fontSize: 18,
      fontWeight: '700',
      color: colors.text,
    },
    
    // Фильтры
    filterChip: {
      paddingHorizontal: 14,
      paddingVertical: 8,
      borderRadius: 20,
      backgroundColor: colors.backgroundSecondary,
      borderWidth: 1,
      borderColor: colors.cardBorder,
    },
    filterChipActive: {
      backgroundColor: colors.controlSelectedBg,
      borderColor: colors.controlSelectedBorder,
    },
    filterChipText: {
      fontSize: 13,
      fontWeight: '700',
      color: colors.textSecondary,
    },
    filterChipTextActive: {
      color: colors.controlSelectedText,
    },
    
    // Поиск
    searchContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.backgroundSecondary,
      borderRadius: 10,
      paddingHorizontal: 12,
      paddingVertical: 10,
      borderWidth: 1,
      borderColor: colors.cardBorder,
    },
    searchInput: {
      flex: 1,
      fontSize: 15,
      color: colors.text,
      marginLeft: 8,
    },
    
    // Текст
    title: {
      fontSize: 16,
      fontWeight: '700',
      color: colors.text,
    },
    subtitle: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.textSecondary,
    },
    text: {
      fontSize: 14,
      color: colors.text,
    },
    textSecondary: {
      fontSize: 13,
      color: colors.textSecondary,
    },
    textMuted: {
      fontSize: 12,
      color: colors.textMuted,
    },
    
    // Кнопки действий в карточках
    cardActions: {
      flexDirection: 'row',
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },
    actionBtn: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      paddingVertical: 12,
      borderRightWidth: 1,
      borderRightColor: colors.border,
    },
    actionBtnText: {
      fontSize: 13,
      fontWeight: '700',
      color: colors.primary,
    },
    
    // Модальные окна
    modalContainer: {
      flex: 1,
      backgroundColor: colors.background,
    },
    modalHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      paddingVertical: 14,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    modalTitle: {
      fontSize: 18,
      fontWeight: '700',
      color: colors.text,
    },
    modalFooter: {
      flexDirection: 'row',
      gap: 12,
      padding: 16,
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },
    
    // Формы
    formLabel: {
      fontSize: 14,
      fontWeight: '700',
      color: colors.text,
      marginBottom: 8,
    },
    formInput: {
      borderWidth: 1,
      borderColor: colors.inputBorder,
      borderRadius: 10,
      paddingHorizontal: 14,
      paddingVertical: 12,
      fontSize: 15,
      fontWeight: '600',
      color: colors.text,
      backgroundColor: colors.inputBackground,
    },
    
    // Пустое состояние
    emptyContainer: {
      alignItems: 'center',
      paddingVertical: 48,
    },
    emptyText: {
      fontSize: 14,
      fontWeight: '700',
      color: colors.textSecondary,
      marginTop: 12,
    },
    
    // Секции
    sectionTitle: {
      fontSize: 13,
      fontWeight: '700',
      color: colors.textSecondary,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
      marginTop: 20,
      marginBottom: 10,
    },
    
    // Строки меню
    menuRow: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.card,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      paddingVertical: 14,
      paddingHorizontal: 16,
      marginBottom: 8,
    },
    menuRowLabel: {
      flex: 1,
      fontSize: 16,
      fontWeight: '600',
      color: colors.text,
      marginLeft: 12,
    },
  });
}

export type ThemedStyles = ReturnType<typeof createThemedStyles>;
