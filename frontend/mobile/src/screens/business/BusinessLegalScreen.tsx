import React, { useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Linking, Alert, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getPublicWebBaseUrl } from '../../api/config';
import { ScreenContainer } from '../../components/ScreenContainer';

import { useTheme } from '../../contexts/ThemeContext';
const T = {
  title: 'Юридическая информация',
  description: 'Правовые документы и политики',
  hint: 'Документы открываются в браузере',
  docs: {
    privacy: 'Политика конфиденциальности',
    terms: 'Условия использования',
    cookies: 'Политика Cookies',
  },
  sections: {
    documents: 'Документы',
    contact: 'Контакты',
  },
  contact: {
    support: 'Служба поддержки',
    supportEmail: 'support@rexten.live',
    legal: 'Юридический отдел',
    legalEmail: 'legal@rexten.live',
  },
};

const DOCS = [
  { path: '/business/legal/privacy', label: T.docs.privacy, icon: 'shield-checkmark-outline' as const },
  { path: '/business/legal/terms', label: T.docs.terms, icon: 'document-text-outline' as const },
  { path: '/business/legal/cookies', label: T.docs.cookies, icon: 'finger-print-outline' as const },
];

export function BusinessLegalScreen() {
  const base = getPublicWebBaseUrl();

  
  const { colors } = useTheme();
const openUrl = useCallback(async (path: string) => {
    const url = `${base}${path}`;
    try {
      const supported = await Linking.canOpenURL(url);
      if (supported) {
        await Linking.openURL(url);
      } else {
        Alert.alert('Ошибка', 'Не удалось открыть ссылку');
      }
    } catch {
      Alert.alert('Ошибка', 'Не удалось открыть ссылку');
    }
  }, [base]);

  const openEmail = useCallback(async (email: string) => {
    const url = `mailto:${email}`;
    try {
      await Linking.openURL(url);
    } catch {
      Alert.alert('Ошибка', 'Не удалось открыть почтовый клиент');
    }
  }, []);

  return (
    <ScreenContainer edges={['bottom']}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        {/* Заголовок */}
        <Text style={[styles.pageTitle, { color: colors.text }]}>{T.title}</Text>
        <Text style={[styles.pageDesc, { color: colors.textSecondary }]}>{T.description}</Text>

        {/* Подсказка */}
        <View style={[styles.hintCard, { backgroundColor: colors.primaryLight }]}>
          <Ionicons name="globe-outline" size={18} color={colors.primary} />
          <Text style={[styles.hintText, { color: colors.primaryDark }]}>{T.hint}</Text>
        </View>

        {/* Документы */}
        <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
          <View style={[styles.sectionHeader, { borderBottomColor: colors.border }]}>
            <Ionicons name="folder-outline" size={18} color={colors.primary} />
            <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>{T.sections.documents}</Text>
          </View>

          {DOCS.map((doc, index) => (
            <TouchableOpacity
              key={doc.path}
              style={[styles.docCard, { backgroundColor: colors.card, borderColor: colors.border }, index === DOCS.length - 1 && styles.docCardLast]}
              onPress={() => openUrl(doc.path)}
              activeOpacity={0.7}
            >
              <View style={[styles.docIconWrap, { backgroundColor: colors.primaryLight }]}>
                <Ionicons name={doc.icon} size={22} color={colors.primary} />
              </View>
              <Text style={[styles.docLabel, { color: colors.text }]}>{doc.label}</Text>
              <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
            </TouchableOpacity>
          ))}
        </View>

        {/* Контакты */}
        <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
          <View style={[styles.sectionHeader, { borderBottomColor: colors.border }]}>
            <Ionicons name="mail-outline" size={18} color={colors.primary} />
            <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>{T.sections.contact}</Text>
          </View>

          <TouchableOpacity
            style={[styles.contactCard, { backgroundColor: colors.card, borderColor: colors.border }]}
            onPress={() => openEmail(T.contact.supportEmail)}
            activeOpacity={0.7}
          >
            <View style={[styles.contactIconWrap, { backgroundColor: colors.successLight }]}>
              <Ionicons name="headset-outline" size={22} color={colors.success} />
            </View>
            <View style={styles.contactInfo}>
              <Text style={[styles.contactLabel, { color: colors.text }]}>{T.contact.support}</Text>
              <Text style={[styles.contactValue, { color: colors.textSecondary }]}>{T.contact.supportEmail}</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.contactCard, { backgroundColor: colors.card, borderColor: colors.border }, styles.contactCardLast]}
            onPress={() => openEmail(T.contact.legalEmail)}
            activeOpacity={0.7}
          >
            <View style={[styles.contactIconWrap, { backgroundColor: colors.purpleLight }]}>
              <Ionicons name="briefcase-outline" size={22} color={colors.purple} />
            </View>
            <View style={styles.contactInfo}>
              <Text style={[styles.contactLabel, { color: colors.text }]}>{T.contact.legal}</Text>
              <Text style={[styles.contactValue, { color: colors.textSecondary }]}>{T.contact.legalEmail}</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
          </TouchableOpacity>
        </View>

        {/* Версия */}
        <View style={[styles.versionBlock, { borderTopColor: colors.border }]}>
          <Text style={[styles.versionText, { color: colors.textMuted }]}>REXTEN Business v1.0.0</Text>
          <Text style={[styles.copyrightText, { color: colors.textMuted }]}>© 2024 REXTEN. Все права защищены.</Text>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 32 },

  pageTitle: { fontSize: 20, fontWeight: '700' },
  pageDesc: { fontSize: 14, fontWeight: '600', marginTop: 2, marginBottom: 12 },

  hintCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: 10,
    padding: 12,
    marginBottom: 20,
  },
  hintText: { flex: 1, fontSize: 13, fontWeight: '600' },

  section: { marginBottom: 24 },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  sectionTitle: { fontSize: 16, fontWeight: '700' },

  docCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderBottomWidth: 0,
    padding: 16,
  },
  docCardLast: {
    borderBottomWidth: 1,
    borderBottomLeftRadius: 12,
    borderBottomRightRadius: 12,
  },
  docIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  docLabel: { flex: 1, fontSize: 15, fontWeight: '700' },

  contactCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderBottomWidth: 0,
    padding: 16,
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
  },
  contactCardLast: {
    borderTopLeftRadius: 0,
    borderTopRightRadius: 0,
    borderBottomWidth: 1,
    borderBottomLeftRadius: 12,
    borderBottomRightRadius: 12,
  },
  contactIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  contactInfo: { flex: 1 },
  contactLabel: { fontSize: 15, fontWeight: '700' },
  contactValue: { fontSize: 13, fontWeight: '600', marginTop: 2 },

  versionBlock: {
    alignItems: 'center',
    paddingTop: 24,
    borderTopWidth: 1,
  },
  versionText: { fontSize: 14, fontWeight: '700' },
  copyrightText: { fontSize: 12, fontWeight: '600', marginTop: 4 },
});
