import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { ScreenContainer } from '../../components/ScreenContainer';
import { useAuth } from '../../contexts/AuthContext';
import { updateClientProfile } from '../../api/client';
import { normalizeImageUrl } from '../../api/config';

import { useTheme } from '../../contexts/ThemeContext';
const T = {
  title: 'Профиль',
  description: 'Управление личными данными',
  fields: {
    firstName: 'Имя',
    lastName: 'Фамилия',
    email: 'Email',
    phone: 'Телефон',
    city: 'Город',
    state: 'Штат',
  },
  placeholders: {
    firstName: 'Введите имя',
    lastName: 'Введите фамилию',
    phone: '+1 (555) 123-4567',
    city: 'Введите город',
    state: 'Введите штат',
  },
  emailHint: 'Email нельзя изменить',
  save: 'Сохранить изменения',
  saving: 'Сохранение...',
  success: 'Профиль обновлён',
  error: 'Ошибка при сохранении',
  changePhoto: 'Изменить фото',
  photoHint: 'Загрузка фото будет доступна позже',
};

export function UserProfileScreen() {
  
  const { colors } = useTheme();
const navigation = useNavigation();
  const { user, refreshUser } = useAuth();
  const queryClient = useQueryClient();

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [avatarLoadFailed, setAvatarLoadFailed] = useState(false);

  const rawAvatarUrl = (user as any)?.avatar || (user as any)?.image;

  useEffect(() => {
    setAvatarLoadFailed(false);
  }, [rawAvatarUrl, user?.id]);

  useEffect(() => {
    if (user) {
      const nameParts = (user.name || '').split(' ');
      setFirstName((user as any).firstName || nameParts[0] || '');
      setLastName((user as any).lastName || nameParts.slice(1).join(' ') || '');
      setPhone((user as any).phone || '');
      setCity((user as any).city || '');
      setState((user as any).state || '');
    }
  }, [user]);

  const updateMutation = useMutation({
    mutationFn: (data: any) => updateClientProfile(data),
    onSuccess: async () => {
      await refreshUser();
      queryClient.invalidateQueries({ queryKey: ['current-user'] });
      Alert.alert('Успешно', T.success);
    },
    onError: (error: Error) => {
      Alert.alert('Ошибка', error.message || T.error);
    },
  });

  const handleSave = useCallback(() => {
    updateMutation.mutate({
      firstName,
      lastName,
      phone,
      city,
      state,
    });
  }, [firstName, lastName, phone, city, state, updateMutation]);

  const handleChangePhoto = () => {
    Alert.alert('В разработке', T.photoHint);
  };

  const avatarUrl = normalizeImageUrl(rawAvatarUrl);
  const initials = (firstName?.charAt(0) || user?.name?.charAt(0) || 'U').toUpperCase();

  return (
    <ScreenContainer edges={['bottom']}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {/* Аватар */}
          <View style={styles.avatarSection}>
            <TouchableOpacity style={styles.avatarWrapper} onPress={handleChangePhoto}>
              {avatarUrl && !avatarLoadFailed ? (
                <Image
                  source={{ uri: avatarUrl }}
                  style={[styles.avatarImage, { backgroundColor: colors.border }]}
                  onError={() => setAvatarLoadFailed(true)}
                />
              ) : (
                <View style={[styles.avatarPlaceholder, { backgroundColor: colors.primaryLight }]}>
                  <Text style={[styles.avatarInitials, { color: colors.primary }]}>{initials}</Text>
                </View>
              )}
              <View style={[styles.avatarBadge, { backgroundColor: colors.primary, borderColor: colors.background }]}>
                <Ionicons name="camera" size={14} color={colors.buttonText} />
              </View>
            </TouchableOpacity>
            <Text style={[styles.changePhotoText, { color: colors.primary }]}>{T.changePhoto}</Text>
          </View>

          {/* Форма */}
          <View style={styles.form}>
            {/* Имя */}
            <View style={styles.fieldGroup}>
              <Text style={[styles.label, { color: colors.textSecondary }]}>{T.fields.firstName}</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.inputBackground, borderColor: colors.inputBorder, color: colors.text }]}
                value={firstName}
                onChangeText={setFirstName}
                placeholder={T.placeholders.firstName}
                placeholderTextColor={colors.textMuted}
              />
            </View>

            {/* Фамилия */}
            <View style={styles.fieldGroup}>
              <Text style={[styles.label, { color: colors.textSecondary }]}>{T.fields.lastName}</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.inputBackground, borderColor: colors.inputBorder, color: colors.text }]}
                value={lastName}
                onChangeText={setLastName}
                placeholder={T.placeholders.lastName}
                placeholderTextColor={colors.textMuted}
              />
            </View>

            {/* Email (readonly) */}
            <View style={styles.fieldGroup}>
              <Text style={[styles.label, { color: colors.textSecondary }]}>{T.fields.email}</Text>
              <View style={[styles.input, styles.inputDisabled, { backgroundColor: colors.backgroundSecondary, borderColor: colors.inputBorder }]}>
                <Text style={[styles.inputDisabledText, { color: colors.textSecondary }]}>{user?.email || ''}</Text>
              </View>
              <Text style={[styles.hint, { color: colors.textMuted }]}>{T.emailHint}</Text>
            </View>

            {/* Телефон */}
            <View style={styles.fieldGroup}>
              <Text style={[styles.label, { color: colors.textSecondary }]}>{T.fields.phone}</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.inputBackground, borderColor: colors.inputBorder, color: colors.text }]}
                value={phone}
                onChangeText={setPhone}
                placeholder={T.placeholders.phone}
                placeholderTextColor={colors.textMuted}
                keyboardType="phone-pad"
              />
            </View>

            {/* Город и Штат */}
            <View style={[styles.row, { borderBottomColor: colors.border }]}>
              <View style={[styles.fieldGroup, styles.flex]}>
                <Text style={[styles.label, { color: colors.textSecondary }]}>{T.fields.city}</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.inputBackground, borderColor: colors.inputBorder, color: colors.text }]}
                  value={city}
                  onChangeText={setCity}
                  placeholder={T.placeholders.city}
                  placeholderTextColor={colors.textMuted}
                />
              </View>
              <View style={styles.rowGap} />
              <View style={[styles.fieldGroup, styles.flex]}>
                <Text style={[styles.label, { color: colors.textSecondary }]}>{T.fields.state}</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.inputBackground, borderColor: colors.inputBorder, color: colors.text }]}
                  value={state}
                  onChangeText={setState}
                  placeholder={T.placeholders.state}
                  placeholderTextColor={colors.textMuted}
                />
              </View>
            </View>
          </View>
        </ScrollView>

        {/* Кнопка сохранения */}
        <View style={[styles.footer, { backgroundColor: colors.background, borderTopColor: colors.border }]}>
          <TouchableOpacity
            style={[styles.saveBtn, { backgroundColor: colors.primary }, updateMutation.isPending && styles.saveBtnDisabled]}
            onPress={handleSave}
            disabled={updateMutation.isPending}
            activeOpacity={0.8}
          >
            {updateMutation.isPending ? (
              <ActivityIndicator size="small" color={colors.buttonText} />
            ) : (
              <>
                <Ionicons name="checkmark-circle-outline" size={20} color={colors.buttonText} />
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
  scroll: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 100 },

  avatarSection: {
    alignItems: 'center',
    marginBottom: 24,
  },
  avatarWrapper: {
    position: 'relative',
  },
  avatarImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  avatarPlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitials: {
    fontSize: 36,
    fontWeight: '700',
  },
  avatarBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
  },
  changePhotoText: {
    fontSize: 14,
    fontWeight: '600',
    marginTop: 8,
  },

  form: {},
  fieldGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 6,
  },
  input: {
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    fontWeight: '600',
  },
  inputDisabled: {
    justifyContent: 'center',
  },
  inputDisabledText: {
    fontSize: 16,
    fontWeight: '600',
  },
  hint: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 4,
  },
  row: {
    flexDirection: 'row',
  },
  rowGap: {
    width: 12,
  },

  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
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
  saveBtnDisabled: {
    opacity: 0.7,
  },
  saveBtnText: {
    fontSize: 16,
    fontWeight: '700',
  },
});
