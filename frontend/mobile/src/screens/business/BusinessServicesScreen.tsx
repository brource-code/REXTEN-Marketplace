import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  Modal,
  TextInput,
  Alert,
  ScrollView,
  RefreshControl,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import {
  getBusinessServices,
  createBusinessService,
  updateBusinessService,
  deleteBusinessService,
  BusinessServiceItem,
} from '../../api/business';
import { getCategories } from '../../api/marketplace';
import { useBusiness } from '../../contexts/BusinessContext';
import { ScreenContainer } from '../../components/ScreenContainer';
import { useTheme } from '../../contexts/ThemeContext';

const T = {
  title: 'Услуги',
  description: 'Управление услугами вашего бизнеса',
  addService: 'Добавить',
  empty: 'Нет услуг',
  filters: {
    all: 'Все',
    active: 'Активные',
    inactive: 'Неактивные',
  },
  card: {
    duration: 'мин',
  },
  statuses: {
    active: 'Активна',
    inactive: 'Неактивна',
  } as Record<string, string>,
  serviceTypes: {
    onsite: 'На месте',
    offsite: 'Выезд',
    hybrid: 'Гибрид',
  } as Record<string, string>,
  modal: {
    titleNew: 'Новая услуга',
    titleEdit: 'Редактирование услуги',
    name: 'Название',
    namePlaceholder: 'Введите название услуги',
    duration: 'Длительность (мин)',
    durationPlaceholder: '60',
    price: 'Цена ($)',
    pricePlaceholder: '0.00',
    category: 'Категория',
    categoryPlaceholder: 'Например: Стрижка',
    categoryHint: 'Категория из каталога REXTEN (как на маркетплейсе).',
    categoryRequired: 'Выберите категорию из списка.',
    status: 'Статус',
    serviceType: 'Тип услуги',
    cancel: 'Отмена',
    save: 'Сохранить',
  },
  delete: {
    title: 'Удалить услугу?',
    message: 'Это действие нельзя отменить.',
    cancel: 'Отмена',
    confirm: 'Удалить',
  },
  actions: {
    edit: 'Изменить',
    delete: 'Удалить',
  },
  success: {
    created: 'Услуга создана',
    updated: 'Услуга обновлена',
    deleted: 'Услуга удалена',
  },
  errors: {
    nameRequired: 'Укажите название услуги',
    saveFailed: 'Не удалось сохранить услугу',
    deleteFailed: 'Не удалось удалить услугу',
  },
};


type StatusFilter = 'all' | 'active' | 'inactive';

function formatCurrency(value: number): string {
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  } catch {
    return `$${Math.round(value)}`;
  }
}

export function BusinessServicesScreen() {
  const queryClient = useQueryClient();
  const { profile } = useBusiness();
  const { colors, isDark } = useTheme();

  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingService, setEditingService] = useState<BusinessServiceItem | null>(null);

  // Form state
  const [formName, setFormName] = useState('');
  const [formDuration, setFormDuration] = useState('60');
  const [formPrice, setFormPrice] = useState('0');
  const [formCategoryId, setFormCategoryId] = useState<number | null>(null);
  const [formStatus, setFormStatus] = useState<'active' | 'inactive'>('active');
  const [formServiceType, setFormServiceType] = useState<'onsite' | 'offsite' | 'hybrid'>('onsite');

  const statusColors: Record<string, { bg: string; text: string }> = {
    active: { bg: colors.successLight, text: colors.successDark },
    inactive: { bg: colors.backgroundTertiary, text: colors.textSecondary },
  };

  const serviceTypeColors: Record<string, { bg: string; text: string }> = {
    onsite: { bg: colors.primaryLight, text: colors.primaryDark },
    offsite: { bg: colors.warningLight, text: colors.warning },
    hybrid: { bg: colors.purpleLight, text: colors.purple },
  };

  const canManage = true;

  const query = useQuery({
    queryKey: ['business-services', 'full'],
    queryFn: () => getBusinessServices({ includeInactive: true }),
  });

  const categoriesQuery = useQuery({
    queryKey: ['marketplace-categories'],
    queryFn: getCategories,
    enabled: modalVisible,
    staleTime: 60 * 60 * 1000,
  });

  const filteredServices = useMemo(() => {
    const list = query.data ?? [];
    if (statusFilter === 'all') return list;
    return list.filter((s) => s.status === statusFilter);
  }, [query.data, statusFilter]);

  const stats = useMemo(() => {
    const list = query.data ?? [];
    return {
      total: list.length,
      active: list.filter((s) => s.status === 'active').length,
      inactive: list.filter((s) => s.status === 'inactive').length,
    };
  }, [query.data]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await query.refetch();
    setRefreshing(false);
  }, [query]);

  const resetForm = useCallback(() => {
    setFormName('');
    setFormDuration('60');
    setFormPrice('0');
    setFormCategoryId(null);
    setFormStatus('active');
    setFormServiceType('onsite');
  }, []);

  const openNewModal = useCallback(() => {
    setEditingService(null);
    resetForm();
    setModalVisible(true);
  }, [resetForm]);

  const openEditModal = useCallback((service: BusinessServiceItem) => {
    setEditingService(service);
    setFormName(service.name);
    setFormDuration(String(service.duration));
    setFormPrice(String(service.price));
    const rawCat = service.category_id;
    setFormCategoryId(
      rawCat == null || rawCat === ''
        ? null
        : Number(typeof rawCat === 'number' ? rawCat : String(rawCat).trim()) || null
    );
    setFormStatus((service.status as 'active' | 'inactive') || 'active');
    setFormServiceType(service.service_type || 'onsite');
    setModalVisible(true);
  }, []);

  const closeModal = useCallback(() => {
    setModalVisible(false);
    setEditingService(null);
  }, []);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const duration = parseInt(formDuration, 10) || 60;
      const price = parseFloat(formPrice.replace(',', '.')) || 0;
      if (!formName.trim()) throw new Error(T.errors.nameRequired);
      if (formCategoryId == null) throw new Error(T.modal.categoryRequired);

      const data = {
        name: formName.trim(),
        duration,
        price,
        category_id: formCategoryId,
        status: formStatus,
        service_type: formServiceType,
      };

      if (editingService) {
        return updateBusinessService(editingService.id, data);
      }
      return createBusinessService({
        ...data,
        category_id: formCategoryId,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['business-services'] });
      queryClient.invalidateQueries({ queryKey: ['business-bootstrap'] });
      Alert.alert('Успех', editingService ? T.success.updated : T.success.created);
      closeModal();
    },
    onError: (e: Error) => Alert.alert('Ошибка', e.message || T.errors.saveFailed),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteBusinessService,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['business-services'] });
      Alert.alert('Успех', T.success.deleted);
    },
    onError: () => Alert.alert('Ошибка', T.errors.deleteFailed),
  });

  const confirmDelete = useCallback(
    (service: BusinessServiceItem) => {
      Alert.alert(T.delete.title, `"${service.name}"\n\n${T.delete.message}`, [
        { text: T.delete.cancel, style: 'cancel' },
        {
          text: T.delete.confirm,
          style: 'destructive',
          onPress: () => deleteMutation.mutate(service.id),
        },
      ]);
    },
    [deleteMutation]
  );

  const renderItem = useCallback(
    ({ item }: { item: BusinessServiceItem }) => {
      const status = item.status || 'active';
      const sc = statusColors[status] || statusColors.active;
      const serviceType = item.service_type || 'onsite';
      const stc = serviceTypeColors[serviceType] || serviceTypeColors.onsite;

      return (
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
          <View style={styles.cardContent}>
            <View style={styles.cardHeader}>
              <Text style={[styles.serviceName, { color: colors.text }]} numberOfLines={2}>
                {item.name}
              </Text>
              <View style={[styles.statusTag, { backgroundColor: sc.bg }]}>
                <Text style={[styles.statusTagText, { color: sc.text }]}>
                  {T.statuses[status] || status}
                </Text>
              </View>
            </View>

            <View style={styles.cardMeta}>
              <View style={styles.metaItem}>
                <Ionicons name="time-outline" size={16} color={colors.textSecondary} />
                <Text style={[styles.metaText, { color: colors.textSecondary }]}>
                  {item.duration} {T.card.duration}
                </Text>
              </View>
              <View style={styles.metaItem}>
                <Ionicons name="cash-outline" size={16} color={colors.textSecondary} />
                <Text style={[styles.metaValue, { color: colors.text }]}>{formatCurrency(item.price)}</Text>
              </View>
            </View>

            <View style={styles.cardFooter}>
              {item.category && (
                <View style={[styles.categoryTag, { backgroundColor: colors.backgroundSecondary }]}>
                  <Text style={[styles.categoryText, { color: colors.textSecondary }]}>{item.category}</Text>
                </View>
              )}
              <View style={[styles.typeTag, { backgroundColor: stc.bg }]}>
                <Text style={[styles.typeTagText, { color: stc.text }]}>
                  {T.serviceTypes[serviceType] || serviceType}
                </Text>
              </View>
            </View>
          </View>

          {canManage && (
            <View style={[styles.cardActions, { borderTopColor: colors.border }]}>
              <TouchableOpacity
                style={[styles.actionBtn, { borderRightColor: colors.border }]}
                onPress={() => openEditModal(item)}
                activeOpacity={0.7}
              >
                <Ionicons name="create-outline" size={16} color={colors.primary} />
                <Text style={[styles.actionBtnText, { color: colors.primary }]}>{T.actions.edit}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.actionBtnDanger}
                onPress={() => confirmDelete(item)}
                activeOpacity={0.7}
              >
                <Ionicons name="trash-outline" size={16} color={colors.error} />
                <Text style={[styles.actionBtnTextDanger, { color: colors.error }]}>{T.actions.delete}</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      );
    },
    [canManage, openEditModal, confirmDelete, colors, statusColors, serviceTypeColors]
  );

  const dynamicStyles = {
    headerFixed: {
      paddingHorizontal: 16,
      paddingTop: 8,
      paddingBottom: 8,
      backgroundColor: colors.background,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    pageTitle: { fontSize: 20, fontWeight: '700' as const, color: colors.text },
    pageDesc: { fontSize: 14, fontWeight: '600' as const, color: colors.textSecondary, marginTop: 2 },
    statCard: {
      flex: 1,
      backgroundColor: colors.backgroundSecondary,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      padding: 10,
      alignItems: 'center' as const,
    },
    statLabel: { fontSize: 11, fontWeight: '700' as const, color: colors.textSecondary, marginBottom: 2 },
    statValue: { fontSize: 18, fontWeight: '700' as const, color: colors.text },
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
    filterChipText: { fontSize: 13, fontWeight: '700' as const, color: colors.textSecondary },
    filterChipTextActive: { color: colors.controlSelectedText },
    countText: { fontSize: 13, fontWeight: '600' as const, color: colors.textSecondary },
    card: {
      backgroundColor: colors.card,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      marginBottom: 12,
      overflow: 'hidden' as const,
    },
    serviceName: { flex: 1, fontSize: 16, fontWeight: '700' as const, color: colors.text },
    metaText: { fontSize: 13, fontWeight: '600' as const, color: colors.textSecondary },
    metaValue: { fontSize: 14, fontWeight: '700' as const, color: colors.text },
    categoryTag: {
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 6,
      backgroundColor: colors.backgroundSecondary,
    },
    categoryText: { fontSize: 11, fontWeight: '700' as const, color: colors.textSecondary },
    cardActions: {
      flexDirection: 'row' as const,
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },
    emptyText: { fontSize: 14, fontWeight: '700' as const, color: colors.textSecondary, marginTop: 12 },
    modalContainer: { flex: 1, backgroundColor: colors.background },
    modalHeader: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      justifyContent: 'space-between' as const,
      paddingHorizontal: 16,
      paddingVertical: 14,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    modalTitle: { fontSize: 18, fontWeight: '700' as const, color: colors.text },
    formLabel: { fontSize: 14, fontWeight: '700' as const, color: colors.text, marginBottom: 8 },
    formInput: {
      borderWidth: 1,
      borderColor: colors.inputBorder,
      borderRadius: 10,
      paddingHorizontal: 14,
      paddingVertical: 12,
      fontSize: 15,
      fontWeight: '600' as const,
      color: colors.text,
      backgroundColor: colors.inputBackground,
    },
    optionBtn: {
      flex: 1,
      paddingVertical: 12,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      backgroundColor: colors.backgroundSecondary,
      alignItems: 'center' as const,
    },
    optionBtnActive: {
      borderColor: colors.controlSelectedBorder,
      backgroundColor: colors.controlSelectedBg,
    },
    optionBtnText: { fontSize: 13, fontWeight: '700' as const, color: colors.textSecondary },
    optionBtnTextActive: { color: colors.controlSelectedText },
    modalFooter: {
      flexDirection: 'row' as const,
      gap: 12,
      padding: 16,
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },
    cancelBtn: {
      flex: 1,
      paddingVertical: 14,
      borderRadius: 10,
      backgroundColor: colors.backgroundSecondary,
      alignItems: 'center' as const,
    },
    cancelBtnText: { fontSize: 15, fontWeight: '700' as const, color: colors.textSecondary },
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
      {/* Заголовок - фиксированный сверху */}
      <View style={dynamicStyles.headerFixed}>
        <View style={styles.titleRow}>
          <View style={styles.titleCol}>
            <Text style={dynamicStyles.pageTitle}>{T.title}</Text>
            <Text style={dynamicStyles.pageDesc}>{T.description}</Text>
          </View>
          {canManage && (
            <TouchableOpacity style={[styles.addBtn, { backgroundColor: colors.primary }]} onPress={openNewModal} activeOpacity={0.8}>
              <Ionicons name="add-outline" size={18} color={colors.buttonText} />
              <Text style={[styles.addBtnText, { color: colors.buttonText }]}>{T.addService}</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Статистика */}
        <View style={[styles.statsRow, { backgroundColor: colors.background }]}>
          <View style={dynamicStyles.statCard}>
            <Text style={dynamicStyles.statLabel}>Всего</Text>
            <Text style={dynamicStyles.statValue}>{stats.total}</Text>
          </View>
          <View style={dynamicStyles.statCard}>
            <Text style={dynamicStyles.statLabel}>Активных</Text>
            <Text style={dynamicStyles.statValue}>{stats.active}</Text>
          </View>
          <View style={dynamicStyles.statCard}>
            <Text style={dynamicStyles.statLabel}>Неактивных</Text>
            <Text style={dynamicStyles.statValue}>{stats.inactive}</Text>
          </View>
        </View>

        {/* Фильтры */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.filtersScroll}
          contentContainerStyle={styles.filtersContent}
        >
          {(['all', 'active', 'inactive'] as StatusFilter[]).map((f) => (
            <TouchableOpacity
              key={f}
              style={[dynamicStyles.filterChip, statusFilter === f && dynamicStyles.filterChipActive]}
              onPress={() => setStatusFilter(f)}
              activeOpacity={0.8}
            >
              <Text style={[dynamicStyles.filterChipText, statusFilter === f && dynamicStyles.filterChipTextActive]}>
                {T.filters[f]}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <Text style={dynamicStyles.countText}>Показано: {filteredServices.length}</Text>
      </View>

      {/* Список услуг */}
      <FlatList
        data={filteredServices}
        keyExtractor={(item) => String(item.id)}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
        ListEmptyComponent={
          <View style={styles.emptyWrap}>
            <Ionicons name="briefcase-outline" size={48} color={colors.textMuted} />
              <Text style={[styles.emptyText, { color: colors.textSecondary }]}>{T.empty}</Text>
            {canManage && (
              <TouchableOpacity style={[styles.emptyAddBtn, { backgroundColor: colors.primary }]} onPress={openNewModal} activeOpacity={0.8}>
                <Text style={[styles.emptyAddBtnText, { color: colors.buttonText }]}>Добавить первую услугу</Text>
              </TouchableOpacity>
            )}
          </View>
        }
      />

      {/* Modal для создания/редактирования */}
      <Modal visible={modalVisible} animationType="slide" presentationStyle="pageSheet" onRequestClose={closeModal}>
        <KeyboardAvoidingView
          style={[styles.modalContainer, { backgroundColor: colors.background }]}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
            <TouchableOpacity onPress={closeModal} style={styles.modalCloseBtn}>
              <Ionicons name="close" size={24} color={colors.textSecondary} />
            </TouchableOpacity>
            <Text style={[styles.modalTitle, { color: colors.text }]}>
              {editingService ? T.modal.titleEdit : T.modal.titleNew}
            </Text>
            <View style={styles.modalHeaderRight} />
          </View>

          <ScrollView style={styles.modalContent} contentContainerStyle={styles.modalContentInner}>
            {/* Название */}
            <View style={styles.formItem}>
              <Text style={[styles.formLabel, { color: colors.text }]}>
                {T.modal.name} <Text style={[styles.required, { color: colors.error }]}>*</Text>
              </Text>
              <TextInput
                style={[styles.formInput, { backgroundColor: colors.inputBackground, borderColor: colors.inputBorder, color: colors.text }]}
                value={formName}
                onChangeText={setFormName}
                placeholder={T.modal.namePlaceholder}
                placeholderTextColor={colors.textMuted}
              />
            </View>

            {/* Длительность и Цена */}
            <View style={styles.formRow}>
              <View style={[styles.formItem, { flex: 1 }]}>
                <Text style={[styles.formLabel, { color: colors.text }]}>{T.modal.duration}</Text>
                <TextInput
                  style={[styles.formInput, { backgroundColor: colors.inputBackground, borderColor: colors.inputBorder, color: colors.text }]}
                  value={formDuration}
                  onChangeText={setFormDuration}
                  placeholder={T.modal.durationPlaceholder}
                  placeholderTextColor={colors.textMuted}
                  keyboardType="number-pad"
                />
              </View>
              <View style={[styles.formItem, { flex: 1 }]}>
                <Text style={[styles.formLabel, { color: colors.text }]}>{T.modal.price}</Text>
                <TextInput
                  style={[styles.formInput, { backgroundColor: colors.inputBackground, borderColor: colors.inputBorder, color: colors.text }]}
                  value={formPrice}
                  onChangeText={setFormPrice}
                  placeholder={T.modal.pricePlaceholder}
                  placeholderTextColor={colors.textMuted}
                  keyboardType="decimal-pad"
                />
              </View>
            </View>

            {/* Категория (справочник маркетплейса) */}
            <View style={styles.formItem}>
              <Text style={[styles.formLabel, { color: colors.text }]}>{T.modal.category}</Text>
              <Text style={[styles.formHint, { color: colors.textSecondary }]}>{T.modal.categoryHint}</Text>
              {categoriesQuery.isLoading ? (
                <ActivityIndicator size="small" color={colors.primary} style={{ marginVertical: 12 }} />
              ) : (
                <View style={styles.categoryChipsWrap}>
                  {(categoriesQuery.data ?? []).map((cat) => {
                    const id = Number(cat.id);
                    const active = formCategoryId === id;
                    return (
                      <TouchableOpacity
                        key={String(cat.id)}
                        style={[
                          styles.categoryChip,
                          { borderColor: colors.cardBorder, backgroundColor: colors.backgroundSecondary },
                          active && {
                            backgroundColor: colors.controlSelectedBg,
                            borderColor: colors.controlSelectedBorder,
                          },
                        ]}
                        onPress={() => setFormCategoryId(id)}
                        activeOpacity={0.8}
                      >
                        <Text
                          style={[
                            styles.categoryChipText,
                            { color: colors.textSecondary },
                            active && { color: colors.controlSelectedText },
                          ]}
                          numberOfLines={2}
                        >
                          {cat.name}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              )}
            </View>

            {/* Статус */}
            <View style={styles.formItem}>
              <Text style={[styles.formLabel, { color: colors.text }]}>{T.modal.status}</Text>
              <View style={styles.optionsRow}>
                {(['active', 'inactive'] as const).map((s) => (
                  <TouchableOpacity
                    key={s}
                    style={[
                      styles.optionBtn,
                      { backgroundColor: colors.backgroundSecondary, borderColor: colors.cardBorder },
                      formStatus === s && { backgroundColor: colors.controlSelectedBg, borderColor: colors.controlSelectedBorder },
                    ]}
                    onPress={() => setFormStatus(s)}
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.optionBtnText, { color: colors.textSecondary }, formStatus === s && { color: colors.controlSelectedText }]}>
                      {T.statuses[s]}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Тип услуги */}
            <View style={styles.formItem}>
              <Text style={[styles.formLabel, { color: colors.text }]}>{T.modal.serviceType}</Text>
              <View style={styles.optionsRow}>
                {(['onsite', 'offsite', 'hybrid'] as const).map((t) => (
                  <TouchableOpacity
                    key={t}
                    style={[
                      styles.optionBtn,
                      { backgroundColor: colors.backgroundSecondary, borderColor: colors.cardBorder },
                      formServiceType === t && { backgroundColor: colors.controlSelectedBg, borderColor: colors.controlSelectedBorder },
                    ]}
                    onPress={() => setFormServiceType(t)}
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.optionBtnText, { color: colors.textSecondary }, formServiceType === t && { color: colors.controlSelectedText }]}>
                      {T.serviceTypes[t]}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </ScrollView>

          <View style={[styles.modalFooter, { borderTopColor: colors.border }]}>
            <TouchableOpacity style={[styles.cancelBtn, { backgroundColor: colors.backgroundSecondary }]} onPress={closeModal} activeOpacity={0.8}>
              <Text style={[styles.cancelBtnText, { color: colors.textSecondary }]}>{T.modal.cancel}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.saveBtn, { backgroundColor: colors.primary }, saveMutation.isPending && styles.saveBtnDisabled]}
              onPress={() => saveMutation.mutate()}
              activeOpacity={0.8}
              disabled={saveMutation.isPending}
            >
              {saveMutation.isPending ? (
                <ActivityIndicator size="small" color={colors.buttonText} />
              ) : (
                <Text style={[styles.saveBtnText, { color: colors.buttonText }]}>{T.modal.save}</Text>
              )}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 12,
    gap: 12,
  },
  titleCol: { flex: 1, minWidth: 0 },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 10,
  },
  addBtnText: { fontSize: 14, fontWeight: '700' },
  statsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  filtersScroll: { marginBottom: 8 },
  filtersContent: { gap: 8 },
  listContent: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 32 },
  card: {
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 12,
    overflow: 'hidden',
  },
  cardContent: { padding: 14 },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 10,
    marginBottom: 10,
  },
  serviceName: { flex: 1, fontSize: 16, fontWeight: '700' },
  statusTag: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  statusTagText: { fontSize: 11, fontWeight: '700' },
  cardMeta: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 10,
  },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaText: { fontSize: 13, fontWeight: '600' },
  metaValue: { fontSize: 14, fontWeight: '700' },
  cardFooter: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  categoryTag: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  categoryText: { fontSize: 11, fontWeight: '700' },
  typeTag: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  typeTagText: { fontSize: 11, fontWeight: '700' },
  cardActions: {
    flexDirection: 'row',
    borderTopWidth: 1,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRightWidth: 1,
  },
  actionBtnText: { fontSize: 13, fontWeight: '700' },
  actionBtnDanger: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
  },
  actionBtnTextDanger: { fontSize: 13, fontWeight: '700' },
  emptyWrap: {
    alignItems: 'center',
    paddingVertical: 48,
  },
  emptyText: { fontSize: 14, fontWeight: '700', marginTop: 12 },
  emptyAddBtn: {
    marginTop: 16,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 10,
  },
  emptyAddBtnText: { fontSize: 14, fontWeight: '700' },
  modalContainer: { flex: 1 },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  modalCloseBtn: { padding: 4 },
  modalTitle: { fontSize: 18, fontWeight: '700' },
  modalHeaderRight: { width: 32 },
  modalContent: { flex: 1 },
  modalContentInner: { padding: 16, gap: 16 },
  formItem: { marginBottom: 0 },
  formLabel: { fontSize: 14, fontWeight: '700', marginBottom: 8 },
  formHint: { fontSize: 12, fontWeight: '600', marginBottom: 8, lineHeight: 16 },
  categoryChipsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  categoryChip: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    maxWidth: '100%',
  },
  categoryChipText: {
    fontSize: 13,
    fontWeight: '700',
  },
  required: {},
  formInput: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    fontWeight: '600',
  },
  formRow: {
    flexDirection: 'row',
    gap: 12,
  },
  optionsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  optionBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
  },
  optionBtnText: { fontSize: 13, fontWeight: '700' },
  modalFooter: {
    flexDirection: 'row',
    gap: 12,
    padding: 16,
    borderTopWidth: 1,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  cancelBtnText: { fontSize: 15, fontWeight: '700' },
  saveBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  saveBtnDisabled: { opacity: 0.6 },
  saveBtnText: { fontSize: 15, fontWeight: '700' },
});
