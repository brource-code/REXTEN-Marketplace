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
  getCompanyRoles,
  createCompanyRole,
  deleteCompanyRole,
  CompanyRoleItem,
} from '../../api/business';
import { ScreenContainer } from '../../components/ScreenContainer';
import { useTheme } from '../../contexts/ThemeContext';

const T = {
  title: 'Роли и права',
  description: 'Управление ролями пользователей',
  addRole: 'Создать',
  empty: 'Нет ролей',
  filters: {
    all: 'Все',
    system: 'Системные',
    custom: 'Кастомные',
  },
  types: {
    system: 'Системная',
    custom: 'Кастомная',
  },
  modal: {
    title: 'Новая роль',
    name: 'Название',
    namePlaceholder: 'Например: Менеджер',
    slug: 'Slug (латиница)',
    slugPlaceholder: 'manager',
    cancel: 'Отмена',
    create: 'Создать',
  },
  actions: {
    delete: 'Удалить',
  },
  delete: {
    title: 'Удалить роль?',
    message: 'Пользователи с этой ролью потеряют права.',
    cancel: 'Отмена',
    confirm: 'Удалить',
  },
  errors: {
    required: 'Название и slug обязательны',
  },
  success: {
    created: 'Роль создана',
    deleted: 'Роль удалена',
  },
};

type FilterType = 'all' | 'system' | 'custom';

export function BusinessRolesScreen() {
  const queryClient = useQueryClient();
  const { colors } = useTheme();

  const [filter, setFilter] = useState<FilterType>('all');
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [formName, setFormName] = useState('');
  const [formSlug, setFormSlug] = useState('');

  const query = useQuery({
    queryKey: ['business-roles'],
    queryFn: getCompanyRoles,
  });

  const roles = query.data?.roles ?? [];

  const filteredRoles = useMemo(() => {
    if (filter === 'all') return roles;
    if (filter === 'system') return roles.filter((r) => r.is_system);
    return roles.filter((r) => !r.is_system);
  }, [roles, filter]);

  const stats = useMemo(() => {
    return {
      total: roles.length,
      system: roles.filter((r) => r.is_system).length,
      custom: roles.filter((r) => !r.is_system).length,
    };
  }, [roles]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await query.refetch();
    setRefreshing(false);
  }, [query]);

  const openModal = useCallback(() => {
    setFormName('');
    setFormSlug('');
    setModalVisible(true);
  }, []);

  const closeModal = useCallback(() => {
    setModalVisible(false);
  }, []);

  const createMutation = useMutation({
    mutationFn: () => {
      if (!formName.trim() || !formSlug.trim()) {
        throw new Error(T.errors.required);
      }
      return createCompanyRole({
        name: formName.trim(),
        slug: formSlug.trim().toLowerCase().replace(/\s+/g, '_'),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['business-roles'] });
      Alert.alert('Успех', T.success.created);
      closeModal();
    },
    onError: (e: Error) => Alert.alert('Ошибка', e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteCompanyRole,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['business-roles'] });
      Alert.alert('Успех', T.success.deleted);
    },
    onError: (e: Error) => Alert.alert('Ошибка', e.message),
  });

  const confirmDelete = useCallback(
    (role: CompanyRoleItem) => {
      Alert.alert(T.delete.title, `"${role.name}"\n\n${T.delete.message}`, [
        { text: T.delete.cancel, style: 'cancel' },
        {
          text: T.delete.confirm,
          style: 'destructive',
          onPress: () => deleteMutation.mutate(role.id),
        },
      ]);
    },
    [deleteMutation]
  );

  const renderItem = useCallback(
    ({ item }: { item: CompanyRoleItem }) => {
      const isSystem = item.is_system;

      return (
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
          <View style={styles.cardContent}>
            <View style={styles.cardHeader}>
              <View style={[styles.iconWrap, { backgroundColor: isSystem ? colors.successLight : colors.primaryLight }]}>
                <Ionicons
                  name={isSystem ? 'shield-checkmark' : 'create'}
                  size={20}
                  color={isSystem ? colors.successDark : colors.primaryDark}
                />
              </View>
              <View style={styles.cardInfo}>
                <View style={styles.nameRow}>
                  <Text style={[styles.roleName, { color: colors.text }]} numberOfLines={1}>
                    {item.name}
                  </Text>
                  <View style={[styles.typeTag, { backgroundColor: isSystem ? colors.successLight : colors.primaryLight }]}>
                    <Text style={[styles.typeTagText, { color: isSystem ? colors.successDark : colors.primaryDark }]}>
                      {isSystem ? T.types.system : T.types.custom}
                    </Text>
                  </View>
                </View>
                <Text style={[styles.roleSlug, { color: colors.textSecondary }]}>{item.slug}</Text>
              </View>
            </View>
          </View>

          {!isSystem && (
            <View style={[styles.cardActions, { borderTopColor: colors.border }]}>
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
    [confirmDelete, colors]
  );

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
      {/* Заголовок */}
      <View style={[styles.headerFixed, { backgroundColor: colors.background, borderBottomColor: colors.border }]}>
        <View style={styles.titleRow}>
          <View style={styles.titleCol}>
            <Text style={[styles.pageTitle, { color: colors.text }]}>{T.title}</Text>
            <Text style={[styles.pageDesc, { color: colors.textSecondary }]}>{T.description}</Text>
          </View>
          <TouchableOpacity style={[styles.addBtn, { backgroundColor: colors.primary }]} onPress={openModal} activeOpacity={0.8}>
            <Ionicons name="add-outline" size={18} color={colors.buttonText} />
            <Text style={[styles.addBtnText, { color: colors.buttonText }]}>{T.addRole}</Text>
          </TouchableOpacity>
        </View>

        {/* Статистика */}
        <View style={styles.statsRow}>
          <View style={[styles.statCard, { backgroundColor: colors.backgroundSecondary, borderColor: colors.cardBorder }]}>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Всего</Text>
            <Text style={[styles.statValue, { color: colors.text }]}>{stats.total}</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: colors.backgroundSecondary, borderColor: colors.cardBorder }]}>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Системных</Text>
            <Text style={[styles.statValue, { color: colors.text }]}>{stats.system}</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: colors.backgroundSecondary, borderColor: colors.cardBorder }]}>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Кастомных</Text>
            <Text style={[styles.statValue, { color: colors.text }]}>{stats.custom}</Text>
          </View>
        </View>

        {/* Фильтры */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.filtersScroll}
          contentContainerStyle={styles.filtersContent}
        >
          {(['all', 'system', 'custom'] as FilterType[]).map((f) => (
            <TouchableOpacity
              key={f}
              style={[
                styles.filterChip,
                { backgroundColor: colors.backgroundSecondary, borderColor: colors.border },
                filter === f && { backgroundColor: colors.controlSelectedBg, borderColor: colors.controlSelectedBorder },
              ]}
              onPress={() => setFilter(f)}
              activeOpacity={0.8}
            >
              <Text style={[
                styles.filterChipText,
                { color: colors.textSecondary },
                filter === f && { color: colors.controlSelectedText },
              ]}>
                {T.filters[f]}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <Text style={[styles.countText, { color: colors.textSecondary }]}>Показано: {filteredRoles.length}</Text>
      </View>

      {/* Список */}
      <FlatList
        data={filteredRoles}
        keyExtractor={(item) => String(item.id)}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
        ListEmptyComponent={
          <View style={styles.emptyWrap}>
            <Ionicons name="shield-outline" size={48} color={colors.textMuted} />
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>{T.empty}</Text>
            <TouchableOpacity style={[styles.emptyAddBtn, { backgroundColor: colors.primary }]} onPress={openModal} activeOpacity={0.8}>
              <Text style={[styles.emptyAddBtnText, { color: colors.buttonText }]}>Создать первую роль</Text>
            </TouchableOpacity>
          </View>
        }
      />

      {/* Modal */}
      <Modal visible={modalVisible} animationType="slide" presentationStyle="pageSheet" onRequestClose={closeModal}>
        <KeyboardAvoidingView
          style={[styles.modalContainer, { backgroundColor: colors.background }]}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
            <TouchableOpacity onPress={closeModal} style={styles.modalCloseBtn}>
              <Ionicons name="close" size={24} color={colors.textSecondary} />
            </TouchableOpacity>
            <Text style={[styles.modalTitle, { color: colors.text }]}>{T.modal.title}</Text>
            <View style={styles.modalHeaderRight} />
          </View>

          <ScrollView style={styles.modalContent} contentContainerStyle={styles.modalContentInner}>
            {/* Название */}
            <View style={styles.formItem}>
              <Text style={[styles.formLabel, { color: colors.text }]}>
                {T.modal.name} <Text style={{ color: colors.error }}>*</Text>
              </Text>
              <TextInput
                style={[styles.formInput, { backgroundColor: colors.inputBackground, borderColor: colors.inputBorder, color: colors.text }]}
                value={formName}
                onChangeText={setFormName}
                placeholder={T.modal.namePlaceholder}
                placeholderTextColor={colors.textMuted}
              />
            </View>

            {/* Slug */}
            <View style={styles.formItem}>
              <Text style={[styles.formLabel, { color: colors.text }]}>
                {T.modal.slug} <Text style={{ color: colors.error }}>*</Text>
              </Text>
              <TextInput
                style={[styles.formInput, { backgroundColor: colors.inputBackground, borderColor: colors.inputBorder, color: colors.text }]}
                value={formSlug}
                onChangeText={setFormSlug}
                placeholder={T.modal.slugPlaceholder}
                placeholderTextColor={colors.textMuted}
                autoCapitalize="none"
              />
            </View>
          </ScrollView>

          <View style={[styles.modalFooter, { borderTopColor: colors.border }]}>
            <TouchableOpacity style={[styles.cancelBtn, { backgroundColor: colors.backgroundSecondary }]} onPress={closeModal} activeOpacity={0.8}>
              <Text style={[styles.cancelBtnText, { color: colors.textSecondary }]}>{T.modal.cancel}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.saveBtn, { backgroundColor: colors.primary }, createMutation.isPending && styles.saveBtnDisabled]}
              onPress={() => createMutation.mutate()}
              activeOpacity={0.8}
              disabled={createMutation.isPending}
            >
              {createMutation.isPending ? (
                <ActivityIndicator size="small" color={colors.buttonText} />
              ) : (
                <Text style={[styles.saveBtnText, { color: colors.buttonText }]}>{T.modal.create}</Text>
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

  headerFixed: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 8,
    borderBottomWidth: 1,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 12,
    gap: 12,
  },
  titleCol: { flex: 1, minWidth: 0 },
  pageTitle: { fontSize: 20, fontWeight: '700' },
  pageDesc: { fontSize: 14, fontWeight: '600', marginTop: 2 },

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
  statCard: {
    flex: 1,
    borderRadius: 10,
    borderWidth: 1,
    padding: 10,
    alignItems: 'center',
  },
  statLabel: { fontSize: 11, fontWeight: '700', marginBottom: 2 },
  statValue: { fontSize: 18, fontWeight: '700' },

  filtersScroll: { marginBottom: 8 },
  filtersContent: { gap: 8 },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  filterChipText: { fontSize: 13, fontWeight: '700' },

  countText: { fontSize: 13, fontWeight: '600' },

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
    gap: 12,
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardInfo: { flex: 1 },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    marginBottom: 4,
  },
  roleName: { flex: 1, fontSize: 16, fontWeight: '700' },
  typeTag: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  typeTagText: { fontSize: 11, fontWeight: '700' },
  roleSlug: { fontSize: 13, fontWeight: '600' },

  cardActions: {
    flexDirection: 'row',
    borderTopWidth: 1,
  },
  actionBtnDanger: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
  },
  actionBtnTextDanger: { fontSize: 13, fontWeight: '700' },

  emptyWrap: { alignItems: 'center', paddingVertical: 48 },
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
  formInput: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    fontWeight: '600',
  },

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
