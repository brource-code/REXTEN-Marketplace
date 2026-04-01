import React, { ReactNode, useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../contexts/ThemeContext';

export interface FilterChip {
  id: string;
  label: string;
}

export interface PageAction {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
}

export interface SearchConfig {
  placeholder: string;
  value: string;
  onChangeText: (text: string) => void;
}

export interface PageLayoutProps {
  title: string;
  description?: string;
  action?: PageAction;
  search?: SearchConfig;
  filters?: FilterChip[];
  activeFilter?: string;
  onFilterChange?: (id: string) => void;
  count?: number;
  countLabel?: string;
  children: ReactNode;
  isLoading?: boolean;
  isRefreshing?: boolean;
  onRefresh?: () => void;
  error?: string | null;
  scrollable?: boolean;
  edges?: ('top' | 'bottom' | 'left' | 'right')[];
}

export function PageLayout({
  title,
  description,
  action,
  search,
  filters,
  activeFilter,
  onFilterChange,
  count,
  countLabel = 'Всего',
  children,
  isLoading = false,
  isRefreshing = false,
  onRefresh,
  error,
  scrollable = false,
  edges = ['top', 'bottom'],
}: PageLayoutProps) {
  const { colors } = useTheme();

  const renderHeader = () => (
    <View style={[styles.header, { backgroundColor: colors.background }]}>
      {/* Заголовок и кнопка действия */}
      <View style={styles.titleRow}>
        <View style={styles.titleCol}>
          <Text style={[styles.pageTitle, { color: colors.text }]}>{title}</Text>
          {description && (
            <Text style={[styles.pageDesc, { color: colors.textSecondary }]}>{description}</Text>
          )}
        </View>
        {action && (
          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: colors.primary }]}
            onPress={action.onPress}
            activeOpacity={0.8}
          >
            <Ionicons name={action.icon} size={18} color={colors.buttonText} />
            <Text style={[styles.actionBtnText, { color: colors.buttonText }]}>{action.label}</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Поиск */}
      {search && (
        <View
          style={[
            styles.searchWrap,
            { backgroundColor: colors.backgroundSecondary, borderColor: colors.cardBorder },
          ]}
        >
          <Ionicons name="search-outline" size={18} color={colors.textMuted} />
          <TextInput
            style={[styles.searchInput, { color: colors.text }]}
            placeholder={search.placeholder}
            placeholderTextColor={colors.textMuted}
            value={search.value}
            onChangeText={search.onChangeText}
            returnKeyType="search"
          />
          {search.value.length > 0 && (
            <TouchableOpacity onPress={() => search.onChangeText('')}>
              <Ionicons name="close-circle" size={18} color={colors.textMuted} />
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* Фильтры */}
      {filters && filters.length > 0 && onFilterChange && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.filtersScroll}
          contentContainerStyle={styles.filtersContent}
        >
          {filters.map((f) => {
            const isActive = activeFilter === f.id;
            return (
              <TouchableOpacity
                key={f.id}
                style={[
                  styles.filterChip,
                  { backgroundColor: colors.backgroundSecondary, borderColor: colors.cardBorder },
                  isActive && { backgroundColor: colors.controlSelectedBg, borderColor: colors.controlSelectedBorder },
                ]}
                onPress={() => onFilterChange(f.id)}
                activeOpacity={0.8}
              >
                <Text
                  style={[
                    styles.filterChipText,
                    { color: colors.textSecondary },
                    isActive && { color: colors.controlSelectedText },
                  ]}
                >
                  {f.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      )}

      {/* Счётчик */}
      {count !== undefined && (
        <Text style={[styles.countText, { color: colors.textSecondary }]}>
          {countLabel}: {count}
        </Text>
      )}
    </View>
  );

  if (isLoading) {
    return (
      <SafeAreaView edges={edges} style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView edges={edges} style={[styles.container, { backgroundColor: colors.background }]}>
        {renderHeader()}
        <View style={styles.center}>
          <Ionicons name="alert-circle-outline" size={48} color={colors.error} />
          <Text style={[styles.errorText, { color: colors.error }]}>{error}</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (scrollable) {
    return (
      <SafeAreaView edges={edges} style={[styles.container, { backgroundColor: colors.background }]}>
        <ScrollView
          style={styles.flex}
          contentContainerStyle={styles.scrollContent}
          refreshControl={
            onRefresh ? (
              <RefreshControl
                refreshing={isRefreshing}
                onRefresh={onRefresh}
                tintColor={colors.primary}
              />
            ) : undefined
          }
        >
          {renderHeader()}
          {children}
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView edges={edges} style={[styles.container, { backgroundColor: colors.background }]}>
      {renderHeader()}
      <View style={styles.flex}>{children}</View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  flex: {
    flex: 1,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  scrollContent: {
    paddingBottom: 32,
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 16,
    gap: 12,
  },
  titleCol: {
    flex: 1,
    minWidth: 0,
  },
  pageTitle: {
    fontSize: 20,
    fontWeight: '700',
  },
  pageDesc: {
    fontSize: 14,
    fontWeight: '600',
    marginTop: 4,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 10,
  },
  actionBtnText: {
    fontSize: 14,
    fontWeight: '700',
  },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 12,
    borderWidth: 1,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
  },
  filtersScroll: {
    marginBottom: 12,
  },
  filtersContent: {
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  filterChipText: {
    fontSize: 13,
    fontWeight: '700',
  },
  countText: {
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 8,
  },
  errorText: {
    fontSize: 16,
    fontWeight: '600',
    marginTop: 12,
    textAlign: 'center',
  },
});
