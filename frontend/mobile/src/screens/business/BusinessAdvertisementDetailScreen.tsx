import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Image,
  ActivityIndicator,
  Switch,
  TouchableOpacity,
  Alert,
  RefreshControl,
} from 'react-native';
import { RouteProp, useNavigation, useRoute, NavigationProp } from '@react-navigation/native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import {
  getBusinessAdvertisements,
  updateAdvertisementVisibility,
  deleteBusinessAdvertisement,
} from '../../api/business';
import { ScreenContainer } from '../../components/ScreenContainer';
import { normalizeImageUrl } from '../../api/config';
import type { BusinessStackParamList } from '../../navigation/BusinessStackNavigator';

import { useTheme } from '../../contexts/ThemeContext';
const T = {
  title: 'Объявление',
  sections: {
    info: 'Основная информация',
    dates: 'Период размещения',
    settings: 'Настройки',
  },
  fields: {
    title: 'Название',
    description: 'Описание',
    type: 'Тип',
    status: 'Статус',
    placement: 'Размещение',
    startDate: 'Дата начала',
    endDate: 'Дата окончания',
    visibility: 'Видимость',
  },
  types: {
    regular: 'Профиль',
    advertisement: 'Реклама',
  },
  statuses: {
    draft: 'Черновик',
    pending: 'На модерации',
    active: 'Активно',
    published: 'Опубликовано',
    rejected: 'Отклонено',
    expired: 'Истекло',
  },
  placements: {
    homepage: 'Главная',
    services: 'Услуги',
    sidebar: 'Боковая панель',
    banner: 'Баннер',
  },
  actions: {
    edit: 'Редактировать',
    delete: 'Удалить',
  },
  delete: {
    title: 'Удалить объявление?',
    message: 'Это действие нельзя отменить.',
    cancel: 'Отмена',
    confirm: 'Удалить',
  },
  success: {
    deleted: 'Объявление удалено',
  },
  noDate: 'Не указано',
  noDescription: 'Нет описания',
  notFound: 'Объявление не найдено',
};

type Route = RouteProp<BusinessStackParamList, 'BusinessAdvertisementDetail'>;
type Nav = NavigationProp<BusinessStackParamList>;

export function BusinessAdvertisementDetailScreen() {
  
  const { colors } = useTheme();

  const getStatusColor = (status: string): { bg: string; text: string } => {
    switch (status) {
      case 'active':
      case 'published':
        return { bg: colors.successLight, text: colors.success };
      case 'draft':
        return { bg: colors.warningLight, text: colors.warning };
      case 'pending':
        return { bg: colors.primaryLight, text: colors.primary };
      case 'rejected':
        return { bg: colors.errorLight, text: colors.error };
      case 'expired':
        return { bg: colors.backgroundTertiary, text: colors.textSecondary };
      default:
        return { bg: colors.backgroundTertiary, text: colors.textSecondary };
    }
  };
const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();
  const { advertisementId } = route.params;
  const queryClient = useQueryClient();

  const [refreshing, setRefreshing] = useState(false);

  const query = useQuery({
    queryKey: ['business-advertisements'],
    queryFn: () => getBusinessAdvertisements({ pageSize: 100 }),
  });

  const advertisement = query.data?.data?.find((a) => a.id === advertisementId);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await query.refetch();
    setRefreshing(false);
  }, [query]);

  const visibilityMutation = useMutation({
    mutationFn: ({ id, v }: { id: number; v: boolean }) => updateAdvertisementVisibility(id, v),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['business-advertisements'] }),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteBusinessAdvertisement,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['business-advertisements'] });
      Alert.alert('Успех', T.success.deleted);
      navigation.goBack();
    },
    onError: (e: Error) => Alert.alert('Ошибка', e.message),
  });

  const handleEdit = useCallback(() => {
    if (advertisement) {
      navigation.navigate('BusinessAdvertisementCreate', {
        editId: advertisement.id,
      });
    }
  }, [advertisement, navigation]);

  const confirmDelete = useCallback(() => {
    Alert.alert(T.delete.title, T.delete.message, [
      { text: T.delete.cancel, style: 'cancel' },
      {
        text: T.delete.confirm,
        style: 'destructive',
        onPress: () => deleteMutation.mutate(advertisementId),
      },
    ]);
  }, [deleteMutation, advertisementId]);

  if (query.isLoading && !query.data) {
    return (
      <ScreenContainer edges={['bottom']}>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </ScreenContainer>
    );
  }

  if (!advertisement) {
    return (
      <ScreenContainer edges={['bottom']}>
        <View style={styles.center}>
          <Ionicons name="alert-circle-outline" size={48} color={colors.textMuted} />
          <Text style={[styles.notFoundText, { color: colors.textSecondary }]}>{T.notFound}</Text>
        </View>
      </ScreenContainer>
    );
  }

  const statusColors = getStatusColor(advertisement.status);
  const typeLabel = T.types[advertisement.type as keyof typeof T.types] || advertisement.type;
  const statusLabel = T.statuses[advertisement.status as keyof typeof T.statuses] || advertisement.status;
  const placementLabel = T.placements[advertisement.placement as keyof typeof T.placements] || advertisement.placement;

  return (
    <ScreenContainer edges={['bottom']}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
      >
        {/* Изображение */}
        {normalizeImageUrl(advertisement.image) ? (
          <Image source={{ uri: normalizeImageUrl(advertisement.image)! }} style={[styles.heroImage, { backgroundColor: colors.backgroundSecondary }]} resizeMode="cover" />
        ) : (
          <View style={[styles.heroImage, styles.heroPlaceholder, { backgroundColor: colors.backgroundSecondary }]}>
            <Ionicons
              name={advertisement.type === 'advertisement' ? 'megaphone-outline' : 'document-outline'}
              size={48}
              color={colors.textMuted}
            />
          </View>
        )}

        {/* Заголовок и теги */}
        <View style={[styles.headerBlock, { borderBottomColor: colors.border }]}>
          <Text style={[styles.title, { color: colors.text }]}>{advertisement.title}</Text>
          <View style={styles.tagsRow}>
            <View style={[styles.typeTag, { backgroundColor: colors.backgroundSecondary }, advertisement.type === 'advertisement' && { backgroundColor: colors.purpleLight }]}>
              <Text style={[styles.typeTagText, { color: colors.textSecondary }, advertisement.type === 'advertisement' && { color: colors.purple }]}>
                {typeLabel}
              </Text>
            </View>
            <View style={[styles.statusTag, { backgroundColor: statusColors.bg }]}>
              <Text style={[styles.statusTagText, { color: statusColors.text }]}>{statusLabel}</Text>
            </View>
          </View>
        </View>

        {/* Основная информация */}
        <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
          <View style={[styles.sectionHeader, { borderBottomColor: colors.border }]}>
            <Ionicons name="information-circle-outline" size={18} color={colors.primary} />
            <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>{T.sections.info}</Text>
          </View>

          <View style={[styles.infoCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={[styles.infoRow, { borderBottomColor: colors.border }]}>
              <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>{T.fields.description}</Text>
              <Text style={[styles.infoValue, { color: colors.text }]}>
                {advertisement.description || T.noDescription}
              </Text>
            </View>
            <View style={[styles.infoRow, { borderBottomColor: colors.border }]}>
              <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>{T.fields.placement}</Text>
              <Text style={[styles.infoValue, { color: colors.text }]}>{placementLabel}</Text>
            </View>
          </View>
        </View>

        {/* Период размещения */}
        <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
          <View style={[styles.sectionHeader, { borderBottomColor: colors.border }]}>
            <Ionicons name="calendar-outline" size={18} color={colors.primary} />
            <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>{T.sections.dates}</Text>
          </View>

          <View style={[styles.infoCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={[styles.infoRow, { borderBottomColor: colors.border }]}>
              <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>{T.fields.startDate}</Text>
              <Text style={[styles.infoValue, { color: colors.text }]}>{advertisement.start_date || T.noDate}</Text>
            </View>
            <View style={[styles.infoRow, { borderBottomColor: colors.border }]}>
              <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>{T.fields.endDate}</Text>
              <Text style={[styles.infoValue, { color: colors.text }]}>{advertisement.end_date || T.noDate}</Text>
            </View>
          </View>
        </View>

        {/* Настройки */}
        <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
          <View style={[styles.sectionHeader, { borderBottomColor: colors.border }]}>
            <Ionicons name="settings-outline" size={18} color={colors.primary} />
            <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>{T.sections.settings}</Text>
          </View>

          <View style={[styles.infoCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={[styles.settingRow, { borderBottomColor: colors.border }]}>
              <Text style={[styles.settingLabel, { color: colors.text }]}>{T.fields.visibility}</Text>
              <Switch
                value={advertisement.is_active}
                onValueChange={(v) => visibilityMutation.mutate({ id: advertisement.id, v })}
                trackColor={{ false: colors.border, true: colors.successLight }}
                thumbColor={advertisement.is_active ? colors.success : colors.textMuted}
              />
            </View>
          </View>
        </View>

        {/* Действия */}
        <View style={styles.actionsBlock}>
          <TouchableOpacity style={[styles.actionBtnPrimary, { backgroundColor: colors.primary }]} onPress={handleEdit} activeOpacity={0.8}>
            <Ionicons name="create-outline" size={18} color={colors.buttonText} />
            <Text style={[styles.actionBtnPrimaryText, { color: colors.buttonText }]}>{T.actions.edit}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.actionBtnDanger, { backgroundColor: colors.errorLight }]} onPress={confirmDelete} activeOpacity={0.8}>
            <Ionicons name="trash-outline" size={18} color={colors.error} />
            <Text style={[styles.actionBtnDangerText, { color: colors.error }]}>{T.actions.delete}</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  notFoundText: { fontSize: 16, fontWeight: '700', marginTop: 12 },

  scroll: { flex: 1 },
  scrollContent: { paddingBottom: 32 },

  heroImage: {
    width: '100%',
    height: 200,
  },
  heroPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },

  headerBlock: {
    padding: 16,
    borderBottomWidth: 1,
  },
  title: { fontSize: 22, fontWeight: '700', marginBottom: 12 },
  tagsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  typeTag: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  typeTagText: { fontSize: 12, fontWeight: '700' },
  statusTag: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusTagText: { fontSize: 12, fontWeight: '700' },

  section: { padding: 16 },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  sectionTitle: { fontSize: 16, fontWeight: '700' },

  infoCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
  },
  infoRow: {
    marginBottom: 12,
  },
  infoLabel: { fontSize: 12, fontWeight: '700', marginBottom: 4 },
  infoValue: { fontSize: 15, fontWeight: '600' },

  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  settingLabel: { fontSize: 15, fontWeight: '600' },

  actionsBlock: {
    padding: 16,
    gap: 12,
  },
  actionBtnPrimary: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 12,
    paddingVertical: 14,
  },
  actionBtnPrimaryText: { fontSize: 15, fontWeight: '700' },
  actionBtnDanger: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 12,
    paddingVertical: 14,
  },
  actionBtnDangerText: { fontSize: 15, fontWeight: '700' },
});
