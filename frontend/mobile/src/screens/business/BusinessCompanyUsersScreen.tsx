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
  getCompanyUsers,
  getCompanyRoles,
  inviteCompanyUser,
  removeCompanyUser,
  CompanyUserMember,
} from '../../api/business';
import { ScreenContainer } from '../../components/ScreenContainer';
import { useTheme } from '../../contexts/ThemeContext';

const T = {
  title: 'Пользователи',
  description: 'Управление доступом к компании',
  invite: 'Пригласить',
  empty: 'Нет пользователей',
  owner: 'Владелец',
  modal: {
    title: 'Пригласить пользователя',
    email: 'Email',
    emailPlaceholder: 'email@example.com',
    role: 'Роль',
    selectRole: 'Выберите роль',
    cancel: 'Отмена',
    send: 'Отправить',
  },
  actions: {
    delete: 'Удалить',
  },
  delete: {
    title: 'Удалить пользователя?',
    message: 'Пользователь потеряет доступ к компании.',
    cancel: 'Отмена',
    confirm: 'Удалить',
  },
  errors: {
    required: 'Email и роль обязательны',
  },
  success: {
    invited: 'Приглашение отправлено',
    removed: 'Пользователь удалён',
  },
};

function getInitials(name: string): string {
  if (!name) return 'U';
  const parts = name.trim().split(' ');
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return name[0].toUpperCase();
}

export function BusinessCompanyUsersScreen() {
  const queryClient = useQueryClient();
  const { colors } = useTheme();

  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [formEmail, setFormEmail] = useState('');
  const [formRoleId, setFormRoleId] = useState<number | null>(null);

  const usersQuery = useQuery({
    queryKey: ['business-company-users'],
    queryFn: getCompanyUsers,
  });

  const rolesQuery = useQuery({
    queryKey: ['business-company-roles'],
    queryFn: getCompanyRoles,
  });

  const members = usersQuery.data?.members ?? [];
  const roles = rolesQuery.data?.roles ?? [];

  const stats = useMemo(() => {
    return {
      total: members.length,
      owners: members.filter((m) => m.is_owner).length,
    };
  }, [members]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await usersQuery.refetch();
    setRefreshing(false);
  }, [usersQuery]);

  const openModal = useCallback(() => {
    setFormEmail('');
    setFormRoleId(null);
    setModalVisible(true);
  }, []);

  const closeModal = useCallback(() => {
    setModalVisible(false);
  }, []);

  const inviteMutation = useMutation({
    mutationFn: () => {
      if (!formEmail.trim() || !formRoleId) {
        throw new Error(T.errors.required);
      }
      return inviteCompanyUser({ email: formEmail.trim(), role_id: formRoleId });
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['business-company-users'] });
      closeModal();
      if (data?.temporary_password) {
        Alert.alert(T.success.invited, `Временный пароль: ${data.temporary_password}`);
      } else {
        Alert.alert('Успех', T.success.invited);
      }
    },
    onError: (e: Error) => Alert.alert('Ошибка', e.message),
  });

  const removeMutation = useMutation({
    mutationFn: (id: number) => removeCompanyUser(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['business-company-users'] });
      Alert.alert('Успех', T.success.removed);
    },
    onError: () => Alert.alert('Ошибка', 'Не удалось удалить'),
  });

  const confirmDelete = useCallback(
    (member: CompanyUserMember) => {
      Alert.alert(T.delete.title, `"${member.name}"\n\n${T.delete.message}`, [
        { text: T.delete.cancel, style: 'cancel' },
        {
          text: T.delete.confirm,
          style: 'destructive',
          onPress: () => removeMutation.mutate(Number(member.id)),
        },
      ]);
    },
    [removeMutation]
  );

  const renderItem = useCallback(
    ({ item }: { item: CompanyUserMember }) => {
      const isOwner = item.is_owner;

      return (
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
          <View style={styles.cardContent}>
            <View style={styles.cardHeader}>
              <View style={[styles.avatar, { backgroundColor: colors.primaryLight }]}>
                <Text style={[styles.avatarText, { color: colors.primary }]}>{getInitials(item.name)}</Text>
              </View>
              <View style={styles.cardInfo}>
                <View style={styles.nameRow}>
                  <Text style={[styles.userName, { color: colors.text }]} numberOfLines={1}>
                    {item.name}
                  </Text>
                  {isOwner && (
                    <View style={[styles.ownerTag, { backgroundColor: colors.successLight }]}>
                      <Ionicons name="shield-checkmark" size={12} color={colors.successDark} />
                      <Text style={[styles.ownerTagText, { color: colors.successDark }]}>{T.owner}</Text>
                    </View>
                  )}
                </View>
                <Text style={[styles.userEmail, { color: colors.textSecondary }]} numberOfLines={1}>
                  {item.email}
                </Text>
                {item.role?.name && (
                  <View style={[styles.roleTag, { backgroundColor: colors.backgroundSecondary }]}>
                    <Text style={[styles.roleTagText, { color: colors.textSecondary }]}>{item.role.name}</Text>
                  </View>
                )}
              </View>
            </View>
          </View>

          {!isOwner && (
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

  if (usersQuery.isLoading && !usersQuery.data) {
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
            <Ionicons name="person-add-outline" size={18} color={colors.buttonText} />
            <Text style={[styles.addBtnText, { color: colors.buttonText }]}>{T.invite}</Text>
          </TouchableOpacity>
        </View>

        {/* Статистика */}
        <View style={[styles.statsRow, { backgroundColor: colors.background }]}>
          <View style={[styles.statCard, { backgroundColor: colors.backgroundSecondary, borderColor: colors.cardBorder }]}>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Всего</Text>
            <Text style={[styles.statValue, { color: colors.text }]}>{stats.total}</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: colors.backgroundSecondary, borderColor: colors.cardBorder }]}>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Владельцев</Text>
            <Text style={[styles.statValue, { color: colors.text }]}>{stats.owners}</Text>
          </View>
        </View>

        <Text style={[styles.countText, { color: colors.textSecondary }]}>Показано: {members.length}</Text>
      </View>

      {/* Список */}
      <FlatList
        data={members}
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
            <TouchableOpacity style={[styles.emptyAddBtn, { backgroundColor: colors.primary }]} onPress={openModal} activeOpacity={0.8}>
              <Text style={[styles.emptyAddBtnText, { color: colors.buttonText }]}>Пригласить первого</Text>
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

            {/* Роль */}
            <View style={styles.formItem}>
              <Text style={[styles.formLabel, { color: colors.text }]}>
                {T.modal.role} <Text style={[styles.required, { color: colors.error }]}>*</Text>
              </Text>
              {roles.length === 0 ? (
                <Text style={[styles.noRolesText, { color: colors.textSecondary }]}>Нет доступных ролей</Text>
              ) : (
                <View style={styles.rolesGrid}>
                  {roles.map((r) => (
                    <TouchableOpacity
                      key={r.id}
                      style={[
                        styles.roleChip,
                        { backgroundColor: colors.backgroundSecondary, borderColor: colors.cardBorder },
                        formRoleId === r.id && { backgroundColor: colors.primaryLight, borderColor: colors.primary },
                      ]}
                      onPress={() => setFormRoleId(r.id)}
                      activeOpacity={0.8}
                    >
                      <Text style={[
                        styles.roleChipText,
                        { color: colors.textSecondary },
                        formRoleId === r.id && { color: colors.primary },
                      ]}>
                        {r.name}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>
          </ScrollView>

          <View style={[styles.modalFooter, { borderTopColor: colors.border }]}>
            <TouchableOpacity style={[styles.cancelBtn, { backgroundColor: colors.backgroundSecondary }]} onPress={closeModal} activeOpacity={0.8}>
              <Text style={[styles.cancelBtnText, { color: colors.textSecondary }]}>{T.modal.cancel}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.saveBtn, { backgroundColor: colors.primary }, inviteMutation.isPending && styles.saveBtnDisabled]}
              onPress={() => inviteMutation.mutate()}
              activeOpacity={0.8}
              disabled={inviteMutation.isPending}
            >
              {inviteMutation.isPending ? (
                <ActivityIndicator size="small" color={colors.buttonText} />
              ) : (
                <Text style={[styles.saveBtnText, { color: colors.buttonText }]}>{T.modal.send}</Text>
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
    gap: 8,
    marginBottom: 4,
  },
  userName: { flex: 1, fontSize: 16, fontWeight: '700' },
  ownerTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  ownerTagText: { fontSize: 11, fontWeight: '700' },
  userEmail: { fontSize: 13, fontWeight: '600', marginBottom: 6 },
  roleTag: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  roleTagText: { fontSize: 11, fontWeight: '700' },

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
  required: {},
  formInput: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    fontWeight: '600',
  },

  noRolesText: { fontSize: 14, fontWeight: '600' },
  rolesGrid: { gap: 8 },
  roleChip: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
    borderWidth: 1,
  },
  roleChipActive: {},
  roleChipText: { fontSize: 14, fontWeight: '700' },
  roleChipTextActive: {},

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
