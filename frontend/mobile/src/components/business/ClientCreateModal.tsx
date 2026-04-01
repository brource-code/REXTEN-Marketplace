import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  Modal,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useMutation } from '@tanstack/react-query';
import { createClient, CreateClientPayload } from '../../api/business';
import { useTheme } from '../../contexts/ThemeContext';

interface Props {
  visible: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

const T = {
  title: 'Новый клиент',
  name: 'Имя',
  namePlaceholder: 'Введите имя клиента',
  email: 'Email',
  emailPlaceholder: 'email@example.com',
  phone: 'Телефон',
  phonePlaceholder: '+1 (555) 123-4567',
  address: 'Адрес',
  addressPlaceholder: 'Введите адрес',
  status: 'Статус',
  cancel: 'Отмена',
  create: 'Создать',
  success: 'Клиент успешно создан',
  error: 'Не удалось создать клиента',
  required: 'Обязательное поле',
  statuses: {
    regular: 'Обычный',
    permanent: 'Постоянный',
    vip: 'VIP',
  } as Record<string, string>,
};

type ClientStatus = 'regular' | 'permanent' | 'vip';

const STATUS_OPTIONS: { value: ClientStatus; label: string }[] = [
  { value: 'regular', label: T.statuses.regular },
  { value: 'permanent', label: T.statuses.permanent },
  { value: 'vip', label: T.statuses.vip },
];

export function ClientCreateModal({ visible, onClose, onSuccess }: Props) {
  const { colors } = useTheme();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [status, setStatus] = useState<ClientStatus>('regular');

  const resetForm = useCallback(() => {
    setName('');
    setEmail('');
    setPhone('');
    setAddress('');
    setStatus('regular');
  }, []);

  const handleClose = useCallback(() => {
    resetForm();
    onClose();
  }, [resetForm, onClose]);

  const mutation = useMutation({
    mutationFn: (data: CreateClientPayload) => createClient(data),
    onSuccess: () => {
      Alert.alert(T.success);
      resetForm();
      onSuccess?.();
      onClose();
    },
    onError: (error: any) => {
      let message = T.error;
      if (error?.response?.data?.errors) {
        const errors = error.response.data.errors;
        const firstError = Object.values(errors).flat()[0];
        if (typeof firstError === 'string') message = firstError;
      } else if (error?.response?.data?.message) {
        message = error.response.data.message;
      } else if (error?.message) {
        message = error.message;
      }
      Alert.alert('Ошибка', message);
    },
  });

  const handleSubmit = useCallback(() => {
    if (!name.trim()) {
      Alert.alert('Ошибка', T.required);
      return;
    }

    mutation.mutate({
      name: name.trim(),
      email: email.trim() || undefined,
      phone: phone.trim() || undefined,
      address: address.trim() || undefined,
      status,
    });
  }, [name, email, phone, address, status, mutation]);

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={handleClose}>
      <KeyboardAvoidingView
        style={[styles.container, { backgroundColor: colors.background }]}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* Header */}
        <View style={[styles.header, { borderBottomColor: colors.border }]}>
          <TouchableOpacity onPress={handleClose} style={styles.closeBtn}>
            <Ionicons name="close" size={24} color={colors.textSecondary} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.text }]}>{T.title}</Text>
          <View style={styles.headerRight} />
        </View>

        {/* Content */}
        <ScrollView style={styles.content} contentContainerStyle={styles.contentInner}>
          {/* Имя */}
          <View style={styles.formItem}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>
              {T.name} <Text style={{ color: colors.error }}>*</Text>
            </Text>
            <TextInput
              style={[styles.input, { borderColor: colors.border, color: colors.inputText, backgroundColor: colors.inputBackground }]}
              value={name}
              onChangeText={setName}
              placeholder={T.namePlaceholder}
              placeholderTextColor={colors.textMuted}
              autoCapitalize="words"
            />
          </View>

          {/* Email */}
          <View style={styles.formItem}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>{T.email}</Text>
            <TextInput
              style={[styles.input, { borderColor: colors.border, color: colors.inputText, backgroundColor: colors.inputBackground }]}
              value={email}
              onChangeText={setEmail}
              placeholder={T.emailPlaceholder}
              placeholderTextColor={colors.textMuted}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          {/* Телефон */}
          <View style={styles.formItem}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>{T.phone}</Text>
            <TextInput
              style={[styles.input, { borderColor: colors.border, color: colors.inputText, backgroundColor: colors.inputBackground }]}
              value={phone}
              onChangeText={setPhone}
              placeholder={T.phonePlaceholder}
              placeholderTextColor={colors.textMuted}
              keyboardType="phone-pad"
            />
          </View>

          {/* Адрес */}
          <View style={styles.formItem}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>{T.address}</Text>
            <TextInput
              style={[styles.input, { borderColor: colors.border, color: colors.inputText, backgroundColor: colors.inputBackground }]}
              value={address}
              onChangeText={setAddress}
              placeholder={T.addressPlaceholder}
              placeholderTextColor={colors.textMuted}
            />
          </View>

          {/* Статус */}
          <View style={styles.formItem}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>{T.status}</Text>
            <View style={styles.statusOptions}>
              {STATUS_OPTIONS.map((opt) => (
                <TouchableOpacity
                  key={opt.value}
                  style={[
                    styles.statusOption,
                    { borderColor: colors.border, backgroundColor: colors.backgroundSecondary },
                    status === opt.value && { borderColor: colors.primary, backgroundColor: colors.primaryLight },
                  ]}
                  onPress={() => setStatus(opt.value)}
                  activeOpacity={0.8}
                >
                  <Text
                    style={[
                      styles.statusOptionText,
                      { color: colors.textSecondary },
                      status === opt.value && { color: colors.primary },
                    ]}
                  >
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </ScrollView>

        {/* Footer */}
        <View style={[styles.footer, { borderTopColor: colors.border }]}>
          <TouchableOpacity style={[styles.cancelBtn, { backgroundColor: colors.backgroundTertiary }]} onPress={handleClose} activeOpacity={0.8}>
            <Text style={[styles.cancelBtnText, { color: colors.textSecondary }]}>{T.cancel}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.submitBtn, { backgroundColor: colors.primary }, mutation.isPending && styles.submitBtnDisabled]}
            onPress={handleSubmit}
            activeOpacity={0.8}
            disabled={mutation.isPending}
          >
            {mutation.isPending ? (
              <ActivityIndicator size="small" color={colors.buttonText} />
            ) : (
              <Text style={[styles.submitBtnText, { color: colors.buttonText }]}>{T.create}</Text>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  closeBtn: { padding: 4 },
  headerTitle: { fontSize: 18, fontWeight: '700' },
  headerRight: { width: 32 },

  content: { flex: 1 },
  contentInner: { padding: 16, gap: 16 },

  formItem: { marginBottom: 0 },
  label: { fontSize: 14, fontWeight: '700', marginBottom: 8 },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
  },

  statusOptions: {
    flexDirection: 'row',
    gap: 10,
  },
  statusOption: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
  },
  statusOptionText: { fontSize: 13, fontWeight: '700' },

  footer: {
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
  submitBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  submitBtnDisabled: { opacity: 0.6 },
  submitBtnText: { fontSize: 15, fontWeight: '700' },
});
