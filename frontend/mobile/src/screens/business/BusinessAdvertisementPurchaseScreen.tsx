import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Linking,
  Image,
  RefreshControl,
} from 'react-native';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { getBusinessAdvertisements } from '../../api/business';
import { createStripeCheckoutSession } from '../../api/stripe';
import { ScreenContainer } from '../../components/ScreenContainer';
import { normalizeImageUrl } from '../../api/config';

import { useTheme } from '../../contexts/ThemeContext';
const T = {
  title: 'Купить рекламу',
  description: 'Продвигайте ваше объявление на платформе',
  selectAd: 'Выберите объявление',
  selectPackage: 'Выберите пакет',
  noAds: 'Нет объявлений для продвижения',
  noAdsHint: 'Сначала создайте объявление, которое хотите рекламировать',
  createAd: 'Создать объявление',
  packages: {
    basic: {
      name: 'Basic',
      features: [
        'Показ на главной 7 дней',
        'До 1000 показов',
        'Базовая статистика',
        'Email поддержка',
      ],
    },
    standard: {
      name: 'Standard',
      features: [
        'Показ на главной 14 дней',
        'До 5000 показов',
        'Расширенная статистика',
        'Приоритетная поддержка',
      ],
    },
    premium: {
      name: 'Premium',
      features: [
        'Показ на главной 30 дней',
        'Неограниченные показы',
        'Полная аналитика',
        'VIP поддержка 24/7',
      ],
    },
  },
  popular: 'Популярный',
  days: 'дней',
  total: 'Итого',
  duration: 'Период',
  buyButton: 'Перейти к оплате',
  errors: {
    selectAd: 'Выберите объявление для продвижения',
    selectPackage: 'Выберите пакет размещения',
    payment: 'Не удалось открыть страницу оплаты',
  },
};

type Package = {
  id: 'basic' | 'standard' | 'premium';
  name: string;
  duration: number;
  price: number;
  features: string[];
  popular: boolean;
};

const PACKAGES: Package[] = [
  {
    id: 'basic',
    name: T.packages.basic.name,
    duration: 7,
    price: 49,
    features: T.packages.basic.features,
    popular: false,
  },
  {
    id: 'standard',
    name: T.packages.standard.name,
    duration: 14,
    price: 89,
    features: T.packages.standard.features,
    popular: true,
  },
  {
    id: 'premium',
    name: T.packages.premium.name,
    duration: 30,
    price: 149,
    features: T.packages.premium.features,
    popular: false,
  },
];

export function BusinessAdvertisementPurchaseScreen() {
  
  const { colors } = useTheme();
const [refreshing, setRefreshing] = useState(false);
  const [selectedAdId, setSelectedAdId] = useState<number | null>(null);
  const [selectedPackageId, setSelectedPackageId] = useState<'basic' | 'standard' | 'premium'>('standard');

  const query = useQuery({
    queryKey: ['business-advertisements', 'all'],
    queryFn: () => getBusinessAdvertisements({ pageSize: 100 }),
  });

  const advertisements = useMemo(() => {
    const data = query.data?.data ?? [];
    return data.filter(
      (ad) => ad.type !== 'ad' && ad.type !== 'advertisement' && ad.status === 'approved'
    );
  }, [query.data]);

  const selectedPackage = PACKAGES.find((p) => p.id === selectedPackageId);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await query.refetch();
    setRefreshing(false);
  }, [query]);

  const checkoutMutation = useMutation({
    mutationFn: ({ advertisementId, packageId }: { advertisementId: number; packageId: string }) =>
      createStripeCheckoutSession(advertisementId, packageId),
    onSuccess: async (data) => {
      if (data.checkout_url) {
        const canOpen = await Linking.canOpenURL(data.checkout_url);
        if (canOpen) {
          await Linking.openURL(data.checkout_url);
        } else {
          Alert.alert('Ошибка', T.errors.payment);
        }
      } else {
        Alert.alert('Ошибка', T.errors.payment);
      }
    },
    onError: (e: Error) => Alert.alert('Ошибка', e.message),
  });

  const handlePurchase = useCallback(() => {
    if (!selectedAdId) {
      Alert.alert('Ошибка', T.errors.selectAd);
      return;
    }
    if (!selectedPackageId) {
      Alert.alert('Ошибка', T.errors.selectPackage);
      return;
    }

    checkoutMutation.mutate({
      advertisementId: selectedAdId,
      packageId: selectedPackageId,
    });
  }, [selectedAdId, selectedPackageId, checkoutMutation]);

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
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
      >
        {/* Заголовок */}
        <Text style={[styles.pageTitle, { color: colors.text }]}>{T.title}</Text>
        <Text style={[styles.pageDesc, { color: colors.textSecondary }]}>{T.description}</Text>

        {advertisements.length === 0 ? (
          <View style={[styles.emptyBlock, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
            <Ionicons name="megaphone-outline" size={48} color={colors.textMuted} />
            <Text style={[styles.emptyTitle, { color: colors.text }]}>{T.noAds}</Text>
            <Text style={[styles.emptyHint, { color: colors.textSecondary }]}>{T.noAdsHint}</Text>
          </View>
        ) : (
          <>
            {/* Выбор пакета */}
            <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
              <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>{T.selectPackage}</Text>
              <View style={styles.packagesGrid}>
                {PACKAGES.map((pkg) => {
                  const isSelected = selectedPackageId === pkg.id;
                  return (
                    <TouchableOpacity
                      key={pkg.id}
                      style={[
                        styles.packageCard,
                        { backgroundColor: colors.backgroundSecondary, borderColor: colors.cardBorder },
                        isSelected && { borderColor: colors.primary, borderWidth: 2 },
                      ]}
                      onPress={() => setSelectedPackageId(pkg.id)}
                      activeOpacity={0.8}
                    >
                      <View style={styles.packageHeader}>
                        <View>
                          <Text style={[styles.packageName, { color: colors.text }, isSelected && { color: colors.primary }]}>
                            {pkg.name}
                          </Text>
                          {pkg.popular && (
                            <View style={[styles.popularBadge, { backgroundColor: colors.primaryLight }]}>
                              <Text style={[styles.popularBadgeText, { color: colors.primary }]}>{T.popular}</Text>
                            </View>
                          )}
                        </View>
                        <View style={styles.packagePriceBlock}>
                          <Text style={[styles.packagePrice, { color: colors.text }, isSelected && { color: colors.primary }]}>
                            ${pkg.price}
                          </Text>
                          <Text style={[styles.packageDuration, { color: colors.textSecondary }]}>
                            {pkg.duration} {T.days}
                          </Text>
                        </View>
                      </View>

                      <View style={styles.packageFeatures}>
                        {pkg.features.map((feature, idx) => (
                          <View key={idx} style={styles.featureRow}>
                            <Ionicons name="checkmark-circle" size={14} color={colors.success} />
                            <Text style={[styles.featureText, { color: colors.textSecondary }]}>{feature}</Text>
                          </View>
                        ))}
                      </View>

                      {isSelected && (
                        <View style={styles.selectedIndicator}>
                          <Ionicons name="checkmark-circle" size={20} color={colors.primary} />
                        </View>
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* Выбор объявления */}
            <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
              <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>{T.selectAd}</Text>
              <View style={styles.adsList}>
                {advertisements.map((ad) => {
                  const isSelected = selectedAdId === ad.id;
                  return (
                    <TouchableOpacity
                      key={ad.id}
                      style={[
                        styles.adCard,
                        { backgroundColor: colors.backgroundSecondary, borderColor: colors.cardBorder },
                        isSelected && { borderColor: colors.primary, borderWidth: 2 },
                      ]}
                      onPress={() => setSelectedAdId(ad.id)}
                      activeOpacity={0.8}
                    >
                      {normalizeImageUrl(ad.image) ? (
                        <Image source={{ uri: normalizeImageUrl(ad.image)! }} style={[styles.adThumb, { backgroundColor: colors.backgroundSecondary }]} resizeMode="cover" />
                      ) : (
                        <View style={[styles.adThumb, styles.adThumbPlaceholder, { backgroundColor: colors.backgroundSecondary }]}>
                          <Ionicons name="image-outline" size={24} color={colors.textMuted} />
                        </View>
                      )}
                      <View style={styles.adInfo}>
                        <Text style={[styles.adTitle, { color: colors.text }]} numberOfLines={1}>
                          {ad.title}
                        </Text>
                        {ad.description && (
                          <Text style={[styles.adDesc, { color: colors.textSecondary }]} numberOfLines={2}>
                            {ad.description}
                          </Text>
                        )}
                        <View style={styles.adMeta}>
                          {ad.city && <Text style={[styles.adMetaText, { color: colors.textMuted }]}>{ad.city}</Text>}
                          {ad.state && <Text style={[styles.adMetaText, { color: colors.textMuted }]}>{ad.state}</Text>}
                        </View>
                      </View>
                      {isSelected && (
                        <View style={styles.adCheckmark}>
                          <Ionicons name="checkmark-circle" size={24} color={colors.primary} />
                        </View>
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* Итого */}
            {selectedPackage && (
              <View style={[styles.totalBlock, { backgroundColor: colors.backgroundSecondary, borderColor: colors.border }]}>
                <View style={styles.totalRow}>
                  <Text style={[styles.totalLabel, { color: colors.textSecondary }]}>{T.total}:</Text>
                  <Text style={[styles.totalValue, { color: colors.text }]}>${selectedPackage.price}</Text>
                </View>
                <Text style={[styles.totalDuration, { color: colors.textSecondary }]}>
                  {T.duration}: {selectedPackage.duration} {T.days}
                </Text>
              </View>
            )}
          </>
        )}
      </ScrollView>

      {/* Кнопка покупки */}
      {advertisements.length > 0 && (
        <View style={[styles.footer, { backgroundColor: colors.card, borderTopColor: colors.border }]}>
          <TouchableOpacity
            style={[
              styles.buyBtn,
              { backgroundColor: colors.primary },
              (!selectedAdId || checkoutMutation.isPending) && styles.buyBtnDisabled,
            ]}
            onPress={handlePurchase}
            disabled={!selectedAdId || checkoutMutation.isPending}
            activeOpacity={0.8}
          >
            {checkoutMutation.isPending ? (
              <ActivityIndicator size="small" color={colors.buttonText} />
            ) : (
              <>
                <Ionicons name="card-outline" size={20} color={colors.buttonText} />
                <Text style={[styles.buyBtnText, { color: colors.buttonText }]}>{T.buyButton}</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      )}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  scroll: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 100 },

  pageTitle: { fontSize: 20, fontWeight: '700' },
  pageDesc: { fontSize: 14, fontWeight: '600', marginTop: 2, marginBottom: 20 },

  emptyBlock: { alignItems: 'center', paddingVertical: 48 },
  emptyTitle: { fontSize: 18, fontWeight: '700', marginTop: 16 },
  emptyHint: { fontSize: 14, fontWeight: '600', marginTop: 8, textAlign: 'center' },

  section: { marginBottom: 24 },
  sectionTitle: { fontSize: 16, fontWeight: '700', marginBottom: 12 },

  packagesGrid: { gap: 12 },
  packageCard: {
    borderRadius: 12,
    borderWidth: 2,
    padding: 14,
    position: 'relative',
  },
  packageHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  packageName: { fontSize: 16, fontWeight: '700' },
  popularBadge: {
    marginTop: 4,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    alignSelf: 'flex-start',
  },
  popularBadgeText: { fontSize: 10, fontWeight: '700' },
  packagePriceBlock: { alignItems: 'flex-end' },
  packagePrice: { fontSize: 22, fontWeight: '700' },
  packageDuration: { fontSize: 12, fontWeight: '600', marginTop: 2 },
  packageFeatures: { gap: 6 },
  featureRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  featureText: { fontSize: 12, fontWeight: '600', flex: 1 },
  selectedIndicator: {
    position: 'absolute',
    top: 12,
    right: 12,
  },

  adsList: { gap: 10 },
  adCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 2,
    padding: 12,
  },
  adThumb: {
    width: 56,
    height: 56,
    borderRadius: 10,
    marginRight: 12,
  },
  adThumbPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  adInfo: { flex: 1 },
  adTitle: { fontSize: 15, fontWeight: '700' },
  adDesc: { fontSize: 12, fontWeight: '600', marginTop: 2 },
  adMeta: { flexDirection: 'row', gap: 8, marginTop: 4 },
  adMetaText: { fontSize: 11, fontWeight: '600' },
  adCheckmark: { marginLeft: 8 },

  totalBlock: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
    marginBottom: 16,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  totalLabel: { fontSize: 14, fontWeight: '600' },
  totalValue: { fontSize: 24, fontWeight: '700' },
  totalDuration: { fontSize: 13, fontWeight: '600' },

  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
    borderTopWidth: 1,
  },
  buyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 12,
    paddingVertical: 16,
  },
  buyBtnDisabled: { opacity: 0.6 },
  buyBtnText: { fontSize: 16, fontWeight: '700' },
});
