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
  getTeamMembers,
  createTeamMember,
  updateTeamMember,
  deleteTeamMember,
  TeamMember,
} from '../../api/business';
import { ScreenContainer } from '../../components/ScreenContainer';
import { useTheme } from '../../contexts/ThemeContext';

const T = {
  title: 'Команда',
  description: 'Управление сотрудниками',
  addMember: 'Добавить',
  empty: 'Нет сотрудников',
  filters: {
    all: 'Все',
    active: 'Активные',
    inactive: 'Неактивные',
  },
  statuses: {
    active: 'Активен',
    inactive: 'Неактивен',
  } as Record<string, string>,
  roles: {
    admin: 'Администратор',
    manager: 'Менеджер',
    specialist: 'Специалист',
  } as Record<string, string>,
  modal: {
    titleNew: 'Новый сотрудник',
    titleEdit: 'Редактирование',
    name: 'Имя',
    namePlaceholder: 'Введите имя',
    email: 'Email',
    emailPlaceholder: 'email@example.com',
    phone: 'Телефон',
    phonePlaceholder: '+7 999 123-45-67',
    role: 'Роль',
    status: 'Статус',
    cancel: 'Отмена',
    save: 'Сохранить',
  },
  actions: {
    edit: 'Изменить',
    delete: 'Удалить',
  },
  delete: {
    title: 'Удалить сотрудника?',
    message: 'Это действие нельзя отменить.',
    cancel: 'Отмена',
    confirm: 'Удалить',
  },
  errors: {
    required: 'Имя и email обязательны',
  },
};


type StatusFilter = 'all' | 'active' | 'inactive';

function getInitials(name: string): string {
  if (!name) return 'U';
  const parts = name.trim().split(' ');
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return name[0].toUpperCase();
}

export function BusinessTeamScreen() {
  const queryClient = useQueryClient();
  const { colors } = useTheme();

  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingMember, setEditingMember] = useState<TeamMember | null>(null);

  // Form state
  const [formName, setFormName] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formRole, setFormRole] = useState('specialist');
  const [formStatus, setFormStatus] = useState<'active' | 'inactive'>('active');

  const statusColorMap: Record<string, { bg: string; text: string }> = {
    active: { bg: colors.successLight, text: colors.successDark },
    inactive: { bg: colors.backgroundTertiary, text: colors.textSecondary },
  };

  const roleColorMap: Record<string, { bg: string; text: string }> = {
    admin: { bg: colors.warningLight, text: colors.warning },
    manager: { bg: colors.primaryLight, text: colors.primaryDark },
    specialist: { bg: colors.purpleLight, text: colors.purple },
  };

  const query = useQuery({
    queryKey: ['business-team'],
    queryFn: getTeamMembers,
  });

  const filteredMembers = useMemo(() => {
    const list = query.data ?? [];
    if (statusFilter === 'all') return list;
    return list.filter((m) => m.status === statusFilter);
  }, [query.data, statusFilter]);

  const stats = useMemo(() => {
    const list = query.data ?? [];
    return {
      total: list.length,
      active: list.filter((m) => m.status === 'active').length,
      inactive: list.filter((m) => m.status === 'inactive').length,
    };
  }, [query.data]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await query.refetch();
    setRefreshing(false);
  }, [query]);

  const resetForm = useCallback(() => {
    setFormName('');
    setFormEmail('');
    setFormPhone('');
    setFormRole('specialist');
    setFormStatus('active');
  }, []);

  const openNewModal = useCallback(() => {
    setEditingMember(null);
    resetForm();
    setModalVisible(true);
  }, [resetForm]);

  const openEditModal = useCallback((member: TeamMember) => {
    setEditingMember(member);
    setFormName(member.name);
    setFormEmail(member.email);
    setFormPhone(member.phone || '');
    setFormRole(member.role || 'specialist');
    setFormStatus((member.status as 'active' | 'inactive') || 'active');
    setModalVisible(true);
  }, []);

  const closeModal = useCallback(() => {
    setModalVisible(false);
    setEditingMember(null);
  }, []);

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!formName.trim() || !formEmail.trim()) {
        throw new Error(T.errors.required);
      }
      const data = {
        name: formName.trim(),
        email: formEmail.trim(),
        phone: formPhone.trim(),
        role: formRole,
        status: formStatus,
      };
      if (editingMember) {
        return updateTeamMember(editingMember.id, data);
      }
      return createTeamMember(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['business-team'] });
      Alert.alert('Успех', editingMember ? 'Сотрудник обновлён' : 'Сотрудник добавлен');
      closeModal();
    },
    onError: (e: Error) => Alert.alert('Ошибка', e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteTeamMember,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['business-team'] });
      Alert.alert('Успех', 'Сотрудник удалён');
    },
    onError: () => Alert.alert('Ошибка', 'Не удалось удалить'),
  });

  const confirmDelete = useCallback(
    (member: TeamMember) => {
      Alert.alert(T.delete.title, `"${member.name}"\n\n${T.delete.message}`, [
        { text: T.delete.cancel, style: 'cancel' },
        {
          text: T.delete.confirm,
          style: 'destructive',
          onPress: () => deleteMutation.mutate(member.id),
        },
      ]);
    },
    [deleteMutation]
  );

  const renderItem = useCallback(
    ({ item }: { item: TeamMember }) => {
      const status = item.status || 'active';
      const sc = statusColorMap[status] || statusColorMap.active;
      const role = item.role || 'specialist';
      const rc = roleColorMap[role] || roleColorMap.specialist;

      return (
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
          <View style={styles.cardContent}>
            <View style={styles.cardHeader}>
              <View style={[styles.avatar, { backgroundColor: colors.primaryLight }]}>
                <Text style={[styles.avatarText, { color: colors.primary }]}>{getInitials(item.name)}</Text>
              </View>
              <View style={styles.cardInfo}>
                <View style={styles.nameRow}>
                  <Text style={[styles.memberName, { color: colors.text }]} numberOfLines={1}>
                    {item.name}
                  </Text>
                  <View style={[styles.statusTag, { backgroundColor: sc.bg }]}>
                    <Text style={[styles.statusTagText, { color: sc.text }]}>
                      {T.statuses[status] || status}
                    </Text>
                  </View>
                </View>
                <View style={[styles.roleTag, { backgroundColor: rc.bg }]}>
                  <Text style={[styles.roleTagText, { color: rc.text }]}>
                    {T.roles[role] || role}
                  </Text>
                </View>
              </View>
            </View>

            <View style={styles.contactsRow}>
              {item.email && (
                <View style={styles.contactItem}>
                  <Ionicons name="mail-outline" size={14} color={colors.textSecondary} />
                  <Text style={[styles.contactText, { color: colors.textSecondary }]} numberOfLines={1}>
                    {item.email}
                  </Text>
                </View>
              )}
              {item.phone && (
                <View style={styles.contactItem}>
                  <Ionicons name="call-outline" size={14} color={colors.textSecondary} />
                  <Text style={[styles.contactText, { color: colors.textSecondary }]}>{item.phone}</Text>
                </View>
              )}
            </View>
          </View>

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
        </View>
      );
    },
    [openEditModal, confirmDelete, colors, statusColorMap, roleColorMap]
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
          <TouchableOpacity style={[styles.addBtn, { backgroundColor: colors.primary }]} onPress={openNewModal} activeOpacity={0.8}>
            <Ionicons name="person-add-outline" size={18} color={colors.buttonText} />
            <Text style={[styles.addBtnText, { color: colors.buttonText }]}>{T.addMember}</Text>
          </TouchableOpacity>
        </View>

        {/* Статистика */}
        <View style={[styles.statsRow, { backgroundColor: colors.background }]}>
          <View style={[styles.statCard, { backgroundColor: colors.backgroundSecondary, borderColor: colors.cardBorder }]}>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Всего</Text>
            <Text style={[styles.statValue, { color: colors.text }]}>{stats.total}</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: colors.backgroundSecondary, borderColor: colors.cardBorder }]}>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Активных</Text>
            <Text style={[styles.statValue, { color: colors.text }]}>{stats.active}</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: colors.backgroundSecondary, borderColor: colors.cardBorder }]}>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Неактивных</Text>
            <Text style={[styles.statValue, { color: colors.text }]}>{stats.inactive}</Text>
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
              style={[styles.filterChip, { backgroundColor: colors.backgroundSecondary, borderColor: colors.cardBorder }, statusFilter === f && { backgroundColor: colors.controlSelectedBg, borderColor: colors.controlSelectedBorder }]}
              onPress={() => setStatusFilter(f)}
              activeOpacity={0.8}
            >
              <Text style={[styles.filterChipText, { color: colors.textSecondary }, statusFilter === f && { color: colors.controlSelectedText }]}>
                {T.filters[f]}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <Text style={[styles.countText, { color: colors.textSecondary }]}>Показано: {filteredMembers.length}</Text>
      </View>

      {/* Список */}
      <FlatList
        data={filteredMembers}
        keyExtractor={(item) => String(item.id)}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
        ListEmptyComponent={
          <View style={styles.emptyWrap}>
            <Ionicons name="people-outline" size={48} color={colors.textMuted} />
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>{T.empty}</Text>
            <TouchableOpacity style={[styles.emptyAddBtn, { backgroundColor: colors.primary }]} onPress={openNewModal} activeOpacity={0.8}>
              <Text style={[styles.emptyAddBtnText, { color: colors.buttonText }]}>Добавить сотрудника</Text>
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
            <Text style={[styles.modalTitle, { color: colors.text }]}>
              {editingMember ? T.modal.titleEdit : T.modal.titleNew}
            </Text>
            <View style={styles.modalHeaderRight} />
          </View>

          <ScrollView style={styles.modalContent} contentContainerStyle={styles.modalContentInner}>
            {/* Имя */}
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

            {/* Email */}
            <View style={styles.formItem}>
              <Text style={[styles.formLabel, { color: colors.text }]}>
                {T.modal.email} <Text style={[styles.required, { color: colors.error }]}>*</Text>
              </Text>
              <TextInput
                style={[styles.formInput, { backgroundColor: colors.inputBackground, borderColor: colors.inputBorder, color: colors.text }]}
                value={formEmail}
                onChangeText={setFormEmail}
                placeholder={T.modal.emailPlaceholder}
                placeholderTextColor={colors.textMuted}
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>

            {/* Телефон */}
            <View style={styles.formItem}>
              <Text style={[styles.formLabel, { color: colors.text }]}>{T.modal.phone}</Text>
              <TextInput
                style={[styles.formInput, { backgroundColor: colors.inputBackground, borderColor: colors.inputBorder, color: colors.text }]}
                value={formPhone}
                onChangeText={setFormPhone}
                placeholder={T.modal.phonePlaceholder}
                placeholderTextColor={colors.textMuted}
                keyboardType="phone-pad"
              />
            </View>

            {/* Роль */}
            <View style={styles.formItem}>
              <Text style={[styles.formLabel, { color: colors.text }]}>{T.modal.role}</Text>
              <View style={styles.optionsRow}>
                {(['specialist', 'manager', 'admin'] as const).map((r) => (
                  <TouchableOpacity
                    key={r}
                    style={[styles.optionBtn, { backgroundColor: colors.backgroundSecondary, borderColor: colors.cardBorder }, formRole === r && { backgroundColor: colors.controlSelectedBg, borderColor: colors.controlSelectedBorder }]}
                    onPress={() => setFormRole(r)}
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.optionBtnText, { color: colors.textSecondary }, formRole === r && { color: colors.controlSelectedText }]}>
                      {T.roles[r]}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Статус */}
            <View style={styles.formItem}>
              <Text style={[styles.formLabel, { color: colors.text }]}>{T.modal.status}</Text>
              <View style={styles.optionsRow}>
                {(['active', 'inactive'] as const).map((s) => (
                  <TouchableOpacity
                    key={s}
                    style={[styles.optionBtn, { backgroundColor: colors.backgroundSecondary, borderColor: colors.cardBorder }, formStatus === s && { backgroundColor: colors.controlSelectedBg, borderColor: colors.controlSelectedBorder }]}
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
  filterChipActive: {},
  filterChipText: { fontSize: 13, fontWeight: '700' },
  filterChipTextActive: {},

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
    marginBottom: 10,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { fontSize: 16, fontWeight: '700' },
  cardInfo: { flex: 1 },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    marginBottom: 6,
  },
  memberName: { flex: 1, fontSize: 16, fontWeight: '700' },
  statusTag: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  statusTagText: { fontSize: 11, fontWeight: '700' },
  roleTag: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, alignSelf: 'flex-start' },
  roleTagText: { fontSize: 11, fontWeight: '700' },

  contactsRow: { gap: 6 },
  contactItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  contactText: { fontSize: 13, fontWeight: '600' },

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
  required: {},
  formInput: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    fontWeight: '600',
  },

  optionsRow: { flexDirection: 'row', gap: 8 },
  optionBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
  },
  optionBtnActive: {},
  optionBtnText: { fontSize: 12, fontWeight: '700' },
  optionBtnTextActive: {},

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
