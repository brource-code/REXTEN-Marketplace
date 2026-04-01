import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
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
import { getBusinessProfile, updateBusinessProfile, BusinessProfile } from '../../api/business';
import { ScreenContainer } from '../../components/ScreenContainer';

import { useTheme } from '../../contexts/ThemeContext';
const T = {
  title: 'Профиль компании',
  description: 'Основная информация о вашем бизнесе',
  sections: {
    basic: 'Основное',
    contact: 'Контакты',
    location: 'Адрес',
  },
  fields: {
    name: 'Название компании',
    namePlaceholder: 'Введите название',
    description: 'Описание',
    descriptionPlaceholder: 'Расскажите о вашем бизнесе...',
    phone: 'Телефон',
    phonePlaceholder: '+7 999 123-45-67',
    email: 'Email',
    emailPlaceholder: 'company@example.com',
    website: 'Сайт',
    websitePlaceholder: 'https://example.com',
    address: 'Адрес',
    addressPlaceholder: 'Улица, дом',
    city: 'Город',
    cityPlaceholder: 'Москва',
    state: 'Регион/Штат',
    statePlaceholder: 'Московская область',
  },
  save: 'Сохранить изменения',
  success: 'Профиль обновлён',
};

export function BusinessProfileSettingsScreen() {
  
  const { colors } = useTheme();
const queryClient = useQueryClient();

  const [refreshing, setRefreshing] = useState(false);
  const [form, setForm] = useState<Partial<BusinessProfile>>({});

  const query = useQuery({
    queryKey: ['business-profile-settings'],
    queryFn: getBusinessProfile,
  });

  useEffect(() => {
    if (query.data) {
      setForm({
        name: query.data.name,
        description: query.data.description,
        address: query.data.address,
        phone: query.data.phone,
        email: query.data.email,
        website: query.data.website,
        city: query.data.city,
        state: query.data.state,
      });
    }
  }, [query.data]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await query.refetch();
    setRefreshing(false);
  }, [query]);

  const saveMutation = useMutation({
    mutationFn: (data: Partial<BusinessProfile>) => updateBusinessProfile(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['business-profile-settings'] });
      queryClient.invalidateQueries({ queryKey: ['business-bootstrap'] });
      Alert.alert('Успех', T.success);
    },
    onError: (e: Error) => Alert.alert('Ошибка', e.message),
  });

  const setField = (key: keyof BusinessProfile) => (val: string) => {
    setForm((f) => ({ ...f, [key]: val }));
  };

  if (query.isLoading && !query.data) {
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
          {/* Секция: Основное */}
          <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
            <View style={[styles.sectionHeader, { borderBottomColor: colors.border }]}>
              <Ionicons name="business-outline" size={18} color={colors.primary} />
              <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>{T.sections.basic}</Text>
            </View>

            <View style={styles.formItem}>
              <Text style={[styles.formLabel, { color: colors.text }]}>{T.fields.name}</Text>
              <TextInput
                style={[styles.formInput, { backgroundColor: colors.inputBackground, borderColor: colors.inputBorder, color: colors.text }]}
                value={form.name ?? ''}
                onChangeText={setField('name')}
                placeholder={T.fields.namePlaceholder}
                placeholderTextColor={colors.textMuted}
              />
            </View>

            <View style={styles.formItem}>
              <Text style={[styles.formLabel, { color: colors.text }]}>{T.fields.description}</Text>
              <TextInput
                style={[styles.formInput, styles.formInputMultiline, { backgroundColor: colors.inputBackground, borderColor: colors.inputBorder, color: colors.text }]}
                value={form.description ?? ''}
                onChangeText={setField('description')}
                placeholder={T.fields.descriptionPlaceholder}
                placeholderTextColor={colors.textMuted}
                multiline
                numberOfLines={4}
              />
            </View>
          </View>

          {/* Секция: Контакты */}
          <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
            <View style={[styles.sectionHeader, { borderBottomColor: colors.border }]}>
              <Ionicons name="call-outline" size={18} color={colors.primary} />
              <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>{T.sections.contact}</Text>
            </View>

            <View style={styles.formItem}>
              <Text style={[styles.formLabel, { color: colors.text }]}>{T.fields.phone}</Text>
              <TextInput
                style={[styles.formInput, { backgroundColor: colors.inputBackground, borderColor: colors.inputBorder, color: colors.text }]}
                value={form.phone ?? ''}
                onChangeText={setField('phone')}
                placeholder={T.fields.phonePlaceholder}
                placeholderTextColor={colors.textMuted}
                keyboardType="phone-pad"
              />
            </View>

            <View style={styles.formItem}>
              <Text style={[styles.formLabel, { color: colors.text }]}>{T.fields.email}</Text>
              <TextInput
                style={[styles.formInput, { backgroundColor: colors.inputBackground, borderColor: colors.inputBorder, color: colors.text }]}
                value={form.email ?? ''}
                onChangeText={setField('email')}
                placeholder={T.fields.emailPlaceholder}
                placeholderTextColor={colors.textMuted}
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>

            <View style={styles.formItem}>
              <Text style={[styles.formLabel, { color: colors.text }]}>{T.fields.website}</Text>
              <TextInput
                style={[styles.formInput, { backgroundColor: colors.inputBackground, borderColor: colors.inputBorder, color: colors.text }]}
                value={form.website ?? ''}
                onChangeText={setField('website')}
                placeholder={T.fields.websitePlaceholder}
                placeholderTextColor={colors.textMuted}
                autoCapitalize="none"
              />
            </View>
          </View>

          {/* Секция: Адрес */}
          <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
            <View style={[styles.sectionHeader, { borderBottomColor: colors.border }]}>
              <Ionicons name="location-outline" size={18} color={colors.primary} />
              <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>{T.sections.location}</Text>
            </View>

            <View style={styles.formItem}>
              <Text style={[styles.formLabel, { color: colors.text }]}>{T.fields.address}</Text>
              <TextInput
                style={[styles.formInput, { backgroundColor: colors.inputBackground, borderColor: colors.inputBorder, color: colors.text }]}
                value={form.address ?? ''}
                onChangeText={setField('address')}
                placeholder={T.fields.addressPlaceholder}
                placeholderTextColor={colors.textMuted}
              />
            </View>

            <View style={styles.formRow}>
              <View style={[styles.formItem, styles.formItemHalf]}>
                <Text style={[styles.formLabel, { color: colors.text }]}>{T.fields.city}</Text>
                <TextInput
                  style={[styles.formInput, { backgroundColor: colors.inputBackground, borderColor: colors.inputBorder, color: colors.text }]}
                  value={form.city ?? ''}
                  onChangeText={setField('city')}
                  placeholder={T.fields.cityPlaceholder}
                  placeholderTextColor={colors.textMuted}
                />
              </View>
              <View style={[styles.formItem, styles.formItemHalf]}>
                <Text style={[styles.formLabel, { color: colors.text }]}>{T.fields.state}</Text>
                <TextInput
                  style={[styles.formInput, { backgroundColor: colors.inputBackground, borderColor: colors.inputBorder, color: colors.text }]}
                  value={form.state ?? ''}
                  onChangeText={setField('state')}
                  placeholder={T.fields.statePlaceholder}
                  placeholderTextColor={colors.textMuted}
                />
              </View>
            </View>
          </View>
        </ScrollView>

        {/* Кнопка сохранения */}
        <View style={[styles.footer, { backgroundColor: colors.background, borderTopColor: colors.border }]}>
          <TouchableOpacity
            style={[styles.saveBtn, { backgroundColor: colors.primary }, saveMutation.isPending && styles.saveBtnDisabled]}
            onPress={() => saveMutation.mutate(form)}
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

  formItem: { marginBottom: 16 },
  formItemHalf: { flex: 1 },
  formRow: { flexDirection: 'row', gap: 12 },
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
    minHeight: 100,
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
