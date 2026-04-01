import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Switch,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  RefreshControl,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { getMarketplaceSettings, updateMarketplaceSettings, MarketplaceSettings } from '../../api/business';
import { ScreenContainer } from '../../components/ScreenContainer';

import { useTheme } from '../../contexts/ThemeContext';
const T = {
  title: 'Витрина маркетплейса',
  description: 'Настройки отображения в каталоге',
  sections: {
    visibility: 'Видимость',
    features: 'Функции',
    seo: 'SEO настройки',
  },
  fields: {
    visible: 'Показывать компанию',
    visibleDesc: 'Компания видна в каталоге',
    showInSearch: 'Отображать в поиске',
    showInSearchDesc: 'Компания появляется в результатах поиска',
    allowBooking: 'Разрешить бронирование',
    allowBookingDesc: 'Клиенты могут записываться онлайн',
    showReviews: 'Показывать отзывы',
    showReviewsDesc: 'Отзывы видны на странице компании',
    showPortfolio: 'Показывать портфолио',
    showPortfolioDesc: 'Работы отображаются на витрине',
    seoTitle: 'SEO заголовок',
    seoTitlePlaceholder: 'Заголовок для поисковиков',
    seoDescription: 'SEO описание',
    seoDescriptionPlaceholder: 'Описание для поисковиков...',
    metaKeywords: 'Ключевые слова',
    metaKeywordsPlaceholder: 'салон, красота, услуги',
  },
  save: 'Сохранить изменения',
  success: 'Настройки сохранены',
};

export function BusinessMarketplaceScreen() {
  const { colors } = useTheme();
  const queryClient = useQueryClient();

  const [refreshing, setRefreshing] = useState(false);
  const [draft, setDraft] = useState<MarketplaceSettings | null>(null);

  const query = useQuery({
    queryKey: ['business-marketplace'],
    queryFn: getMarketplaceSettings,
  });

  useEffect(() => {
    if (query.data) setDraft({ ...query.data });
  }, [query.data]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await query.refetch();
    setRefreshing(false);
  }, [query]);

  const saveMutation = useMutation({
    mutationFn: (d: MarketplaceSettings) => updateMarketplaceSettings(d),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['business-marketplace'] });
      Alert.alert('Успех', T.success);
    },
    onError: (e: Error) => Alert.alert('Ошибка', e.message),
  });

  const toggle = (key: keyof MarketplaceSettings) => (v: boolean) =>
    setDraft((d) => (d ? { ...d, [key]: v } : d));

  if (query.isLoading || !draft) {
    return (
      <ScreenContainer edges={['bottom']}>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer edges={['bottom']}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* Заголовок */}
        <View style={[styles.headerFixed, { backgroundColor: colors.background, borderBottomColor: colors.border }]}>
          <Text style={[styles.pageTitle, { color: colors.text }]}>{T.title}</Text>
          <Text style={[styles.pageDesc, { color: colors.textSecondary }]}>{T.description}</Text>
        </View>

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
          }
        >
          {/* Секция: Видимость */}
          <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
            <View style={[styles.sectionHeader, { borderBottomColor: colors.border }]}>
              <Ionicons name="eye-outline" size={18} color={colors.primary} />
              <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>{T.sections.visibility}</Text>
            </View>

            <View style={[styles.switchItem, { borderBottomColor: colors.border }]}>
              <View style={styles.switchInfo}>
                <Text style={[styles.switchLabel, { color: colors.text }]}>{T.fields.visible}</Text>
                <Text style={[styles.switchDesc, { color: colors.textSecondary }]}>{T.fields.visibleDesc}</Text>
              </View>
              <Switch
                value={draft.visible}
                onValueChange={toggle('visible')}
                trackColor={{ false: colors.border, true: colors.primaryLight }}
                thumbColor={draft.visible ? colors.primary : colors.backgroundTertiary}
              />
            </View>

            <View style={[styles.switchItem, { borderBottomColor: colors.border }]}>
              <View style={styles.switchInfo}>
                <Text style={[styles.switchLabel, { color: colors.text }]}>{T.fields.showInSearch}</Text>
                <Text style={[styles.switchDesc, { color: colors.textSecondary }]}>{T.fields.showInSearchDesc}</Text>
              </View>
              <Switch
                value={draft.showInSearch}
                onValueChange={toggle('showInSearch')}
                trackColor={{ false: colors.border, true: colors.primaryLight }}
                thumbColor={draft.showInSearch ? colors.primary : colors.backgroundTertiary}
              />
            </View>
          </View>

          {/* Секция: Функции */}
          <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
            <View style={[styles.sectionHeader, { borderBottomColor: colors.border }]}>
              <Ionicons name="options-outline" size={18} color={colors.primary} />
              <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>{T.sections.features}</Text>
            </View>

            <View style={[styles.switchItem, { borderBottomColor: colors.border }]}>
              <View style={styles.switchInfo}>
                <Text style={[styles.switchLabel, { color: colors.text }]}>{T.fields.allowBooking}</Text>
                <Text style={[styles.switchDesc, { color: colors.textSecondary }]}>{T.fields.allowBookingDesc}</Text>
              </View>
              <Switch
                value={draft.allowBooking}
                onValueChange={toggle('allowBooking')}
                trackColor={{ false: colors.border, true: colors.primaryLight }}
                thumbColor={draft.allowBooking ? colors.primary : colors.backgroundTertiary}
              />
            </View>

            <View style={[styles.switchItem, { borderBottomColor: colors.border }]}>
              <View style={styles.switchInfo}>
                <Text style={[styles.switchLabel, { color: colors.text }]}>{T.fields.showReviews}</Text>
                <Text style={[styles.switchDesc, { color: colors.textSecondary }]}>{T.fields.showReviewsDesc}</Text>
              </View>
              <Switch
                value={draft.showReviews}
                onValueChange={toggle('showReviews')}
                trackColor={{ false: colors.border, true: colors.primaryLight }}
                thumbColor={draft.showReviews ? colors.primary : colors.backgroundTertiary}
              />
            </View>

            <View style={[styles.switchItem, { borderBottomWidth: 0 }]}>
              <View style={styles.switchInfo}>
                <Text style={[styles.switchLabel, { color: colors.text }]}>{T.fields.showPortfolio}</Text>
                <Text style={[styles.switchDesc, { color: colors.textSecondary }]}>{T.fields.showPortfolioDesc}</Text>
              </View>
              <Switch
                value={draft.showPortfolio}
                onValueChange={toggle('showPortfolio')}
                trackColor={{ false: colors.border, true: colors.primaryLight }}
                thumbColor={draft.showPortfolio ? colors.primary : colors.backgroundTertiary}
              />
            </View>
          </View>

          {/* Секция: SEO */}
          <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
            <View style={[styles.sectionHeader, { borderBottomColor: colors.border }]}>
              <Ionicons name="search-outline" size={18} color={colors.primary} />
              <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>{T.sections.seo}</Text>
            </View>

            <View style={styles.formItem}>
              <Text style={[styles.formLabel, { color: colors.text }]}>{T.fields.seoTitle}</Text>
              <TextInput
                style={[styles.formInput, { backgroundColor: colors.inputBackground, borderColor: colors.inputBorder, color: colors.text }]}
                value={draft.seoTitle}
                onChangeText={(t) => setDraft({ ...draft, seoTitle: t })}
                placeholder={T.fields.seoTitlePlaceholder}
                placeholderTextColor={colors.textMuted}
              />
            </View>

            <View style={styles.formItem}>
              <Text style={[styles.formLabel, { color: colors.text }]}>{T.fields.seoDescription}</Text>
              <TextInput
                style={[styles.formInput, styles.formInputMultiline, { backgroundColor: colors.inputBackground, borderColor: colors.inputBorder, color: colors.text }]}
                value={draft.seoDescription}
                onChangeText={(t) => setDraft({ ...draft, seoDescription: t })}
                placeholder={T.fields.seoDescriptionPlaceholder}
                placeholderTextColor={colors.textMuted}
                multiline
                numberOfLines={3}
              />
            </View>

            <View style={styles.formItem}>
              <Text style={[styles.formLabel, { color: colors.text }]}>{T.fields.metaKeywords}</Text>
              <TextInput
                style={[styles.formInput, { backgroundColor: colors.inputBackground, borderColor: colors.inputBorder, color: colors.text }]}
                value={draft.metaKeywords}
                onChangeText={(t) => setDraft({ ...draft, metaKeywords: t })}
                placeholder={T.fields.metaKeywordsPlaceholder}
                placeholderTextColor={colors.textMuted}
              />
            </View>
          </View>
        </ScrollView>

        {/* Кнопка сохранения */}
        <View style={[styles.footer, { borderTopColor: colors.border, backgroundColor: colors.background }]}>
          <TouchableOpacity
            style={[styles.saveBtn, { backgroundColor: colors.primary }, saveMutation.isPending && styles.saveBtnDisabled]}
            onPress={() => saveMutation.mutate(draft)}
            activeOpacity={0.8}
            disabled={saveMutation.isPending}
          >
            {saveMutation.isPending ? (
              <ActivityIndicator size="small" color={colors.buttonText} />
            ) : (
              <>
                <Ionicons name="checkmark-outline" size={20} color={colors.buttonText} />
                <Text style={[styles.saveBtnText, { color: colors.buttonText }]}>{T.save}</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  headerFixed: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  pageTitle: { fontSize: 20, fontWeight: '700' },
  pageDesc: { fontSize: 14, fontWeight: '600', marginTop: 2 },

  scroll: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 32 },

  section: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
    marginBottom: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  sectionTitle: { fontSize: 16, fontWeight: '700' },

  switchItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  switchInfo: { flex: 1, marginRight: 12 },
  switchLabel: { fontSize: 15, fontWeight: '700' },
  switchDesc: { fontSize: 13, fontWeight: '600', marginTop: 2 },

  formItem: { marginBottom: 16 },
  formLabel: { fontSize: 14, fontWeight: '700', marginBottom: 8 },
  formInput: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    fontWeight: '600',
  },
  formInputMultiline: {
    minHeight: 80,
    textAlignVertical: 'top',
  },

  footer: {
    padding: 16,
    borderTopWidth: 1,
  },
  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 12,
    paddingVertical: 14,
  },
  saveBtnDisabled: { opacity: 0.6 },
  saveBtnText: { fontSize: 16, fontWeight: '700' },
});
