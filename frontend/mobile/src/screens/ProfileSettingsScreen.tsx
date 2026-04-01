import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, TextInput, Alert, ActivityIndicator } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { RootStackParamList } from '../navigation/RootNavigator';
import { ScreenContainer } from '../components/ScreenContainer';
import { useAuth } from '../contexts/AuthContext';
import { isClientAppRole } from '../constants/roles';
import { getClientProfile, updateClientProfile, ClientProfile } from '../api/client';
import { US_STATES, getCitiesByState, getStateName } from '../constants/us-locations';
import { LocationSelector } from '../components/LocationSelector';

import { useTheme } from '../contexts/ThemeContext';
type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  backButton: {
    marginRight: 12,
    padding: 8,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
  },
  card: {
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
  },
  formGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
  },
  errorText: {
    fontSize: 12,
    marginTop: 4,
  },
  helpText: {
    fontSize: 12,
    marginTop: 4,
  },
  locationSection: {
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
  },
  locationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  locationHeaderText: {
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 8,
  },
  locationInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
  },
  locationInfoText: {
    fontSize: 13,
    marginLeft: 6,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 24,
    paddingTop: 24,
    borderTopWidth: 1,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '500',
  },
  saveButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
});

export const ProfileSettingsScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const { user, refreshUser } = useAuth();
  const { colors } = useTheme();
  const isClient = isClientAppRole(user?.role);
  
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [selectedState, setSelectedState] = useState<string | null>(null);
  const [selectedCity, setSelectedCity] = useState<string | null>(null);
  const [zipCode, setZipCode] = useState('');
  const [availableCities, setAvailableCities] = useState<string[]>([]);
  
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    loadProfile();
  }, [user?.role]);

  useEffect(() => {
    // Обновляем список городов при изменении штата
    if (selectedState) {
      const cities = getCitiesByState(selectedState);
      setAvailableCities(cities);
      // Сбрасываем город, если он не входит в список городов нового штата
      if (selectedCity && !cities.includes(selectedCity)) {
        setSelectedCity(null);
      }
    } else {
      setAvailableCities([]);
      setSelectedCity(null);
    }
  }, [selectedState]);

  const loadProfile = async () => {
    setIsLoading(true);
    try {
      if (!isClientAppRole(user?.role)) {
        setFirstName(user?.firstName || '');
        setLastName(user?.lastName || '');
        setPhone(user?.phone || '');
        return;
      }
      const profile = await getClientProfile();
      if (profile) {
        setFirstName(profile.firstName || '');
        setLastName(profile.lastName || '');
        setPhone(profile.phone || '');
        setAddress(profile.address || '');
        setZipCode(profile.zipCode || '');
        
        // Определяем штат: если приходит строка (например, "Alaska"), находим соответствующий ID ("AK")
        let stateValue = profile.state || null;
        if (stateValue && !US_STATES.find(s => s.id === stateValue)) {
          // Пытаемся найти по названию
          const stateByName = US_STATES.find(s => s.name === stateValue);
          if (stateByName) {
            stateValue = stateByName.id;
          }
        }
        
        setSelectedState(stateValue);
        
        // Устанавливаем доступные города для выбранного штата
        if (stateValue) {
          const cities = getCitiesByState(stateValue);
          setAvailableCities(cities);
          if (profile.city && cities.includes(profile.city)) {
            setSelectedCity(profile.city);
          }
        }
      }
    } catch (error) {
      console.error('Error loading profile:', error);
      Alert.alert('Ошибка', 'Не удалось загрузить профиль');
    } finally {
      setIsLoading(false);
    }
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};
    
    if (!firstName.trim()) {
      newErrors.firstName = 'Имя обязательно';
    }
    
    if (!lastName.trim()) {
      newErrors.lastName = 'Фамилия обязательна';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!isClient) {
      Alert.alert('Недоступно', 'Редактирование этого профиля в приложении доступно аккаунту клиента.');
      return;
    }
    if (!validate()) {
      return;
    }

    setIsSaving(true);
    try {
      const updatedProfile = await updateClientProfile({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        phone: phone.trim() || undefined,
        address: address.trim() || undefined,
        city: selectedCity || undefined,
        state: selectedState || undefined,
        zipCode: zipCode.trim() || undefined,
      });

      if (updatedProfile) {
        setIsDirty(false);
        // Обновляем пользователя, но не выкидываем при ошибке, если сохранение прошло успешно
        try {
          await refreshUser();
          // После обновления профиля локация автоматически обновится через LocationProvider
          // если она не была установлена вручную (проверяется через AsyncStorage и cooldown)
          console.log('✅ Profile updated, location will sync automatically if needed');
        } catch (refreshError) {
          console.warn('Failed to refresh user after profile update, but profile was saved:', refreshError);
          // Обновляем локально из ответа API
          if (updatedProfile) {
            // Обновляем локальное состояние пользователя из ответа
            // refreshUser уже обновит через AuthContext, но если он упал, просто продолжаем
          }
        }
        Alert.alert('Успешно', 'Профиль успешно обновлен', [
          { text: 'OK', onPress: () => navigation.goBack() },
        ]);
      }
    } catch (error: any) {
      console.error('Error updating profile:', error);
      Alert.alert(
        'Ошибка',
        error?.response?.data?.message || 'Ошибка при обновлении профиля'
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handleFieldChange = (field: string, value: string) => {
    setIsDirty(true);
    switch (field) {
      case 'firstName':
        setFirstName(value);
        break;
      case 'lastName':
        setLastName(value);
        break;
      case 'phone':
        setPhone(value);
        break;
      case 'address':
        setAddress(value);
        break;
      case 'zipCode':
        setZipCode(value);
        break;
    }
    // Очищаем ошибку при изменении поля
    if (errors[field]) {
      setErrors({ ...errors, [field]: '' });
    }
  };

  const handleLocationChange = (state: string | null, city: string | null) => {
    setIsDirty(true);
    setSelectedState(state);
    setSelectedCity(city);
  };

  if (isLoading) {
    return (
      <ScreenContainer>
          <View style={[styles.container, { backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center' }]}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={{ marginTop: 16, color: colors.textSecondary }}>Загрузка профиля...</Text>
        </View>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer>
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        {/* Заголовок */}
        <View style={[styles.header, { backgroundColor: colors.background }]}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Настройки профиля</Text>
        </View>

        <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
          <View style={[styles.scrollContent, { backgroundColor: colors.background }]}>
            <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
              <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Личные данные</Text>

              {/* Имя */}
              <View style={styles.formGroup}>
                <Text style={[styles.label, { color: colors.textSecondary }]}>Имя *</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.inputBackground, borderColor: colors.inputBorder, color: colors.text }, errors.firstName && { borderColor: colors.error }]}
                  placeholder="Введите имя"
                  placeholderTextColor={colors.textMuted}
                  value={firstName}
                  onChangeText={(value) => handleFieldChange('firstName', value)}
                />
                {errors.firstName && <Text style={[styles.errorText, { color: colors.error }]}>{errors.firstName}</Text>}
              </View>

              {/* Фамилия */}
              <View style={styles.formGroup}>
                <Text style={[styles.label, { color: colors.textSecondary }]}>Фамилия *</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.inputBackground, borderColor: colors.inputBorder, color: colors.text }, errors.lastName && { borderColor: colors.error }]}
                  placeholder="Введите фамилию"
                  placeholderTextColor={colors.textMuted}
                  value={lastName}
                  onChangeText={(value) => handleFieldChange('lastName', value)}
                />
                {errors.lastName && <Text style={[styles.errorText, { color: colors.error }]}>{errors.lastName}</Text>}
              </View>

              {/* Email (только для чтения) */}
              <View style={styles.formGroup}>
                <Text style={[styles.label, { color: colors.textSecondary }]}>Email</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.backgroundSecondary, borderColor: colors.inputBorder, color: colors.textSecondary }]}
                  placeholderTextColor={colors.textMuted}
                  value={user?.email || ''}
                  editable={false}
                />
                <Text style={[styles.helpText, { color: colors.textSecondary }]}>Email нельзя изменить</Text>
              </View>

              {/* Телефон */}
              <View style={styles.formGroup}>
                <Text style={[styles.label, { color: colors.textSecondary }]}>Телефон</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.inputBackground, borderColor: colors.inputBorder, color: colors.text }]}
                  placeholder="+1 (555) 123-4567"
                  placeholderTextColor={colors.textMuted}
                  value={phone}
                  onChangeText={(value) => handleFieldChange('phone', value)}
                  keyboardType="phone-pad"
                />
              </View>

              {/* Адрес */}
              <View style={styles.formGroup}>
                <Text style={[styles.label, { color: colors.textSecondary }]}>Адрес</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.inputBackground, borderColor: colors.inputBorder, color: colors.text }]}
                  placeholder="Введите адрес"
                  placeholderTextColor={colors.textMuted}
                  value={address}
                  onChangeText={(value) => handleFieldChange('address', value)}
                />
              </View>

              {/* Постоянная локация */}
              <View style={styles.formGroup}>
                <Text style={[styles.label, { color: colors.textSecondary }]}>Постоянная локация</Text>
                <View style={[styles.locationSection, { backgroundColor: colors.backgroundSecondary, borderColor: colors.border }]}>
                  <View style={styles.locationHeader}>
                    <Ionicons name="location-outline" size={18} color={colors.primary} />
                    <Text style={[styles.locationHeaderText, { color: colors.text }]}>
                      Укажите вашу постоянную локацию для автоматического применения в каталоге
                    </Text>
                  </View>
                  
                  <LocationSelector
                    onLocationChange={handleLocationChange}
                    showLabel={false}
                  />

                  {/* Показываем выбранную локацию */}
                  {selectedState && selectedCity && (
                    <View style={[styles.locationInfo, { borderTopColor: colors.border }]}>
                      <Ionicons name="checkmark-circle" size={16} color={colors.success} />
                      <Text style={[styles.locationInfoText, { color: colors.textSecondary }]}>
                        {selectedCity}, {getStateName(selectedState)}
                      </Text>
                    </View>
                  )}
                </View>
              </View>

              {/* Почтовый индекс */}
              <View style={styles.formGroup}>
                <Text style={[styles.label, { color: colors.textSecondary }]}>Почтовый индекс</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.inputBackground, borderColor: colors.inputBorder, color: colors.text }]}
                  placeholder="12345"
                  placeholderTextColor={colors.textMuted}
                  value={zipCode}
                  onChangeText={(value) => handleFieldChange('zipCode', value)}
                  keyboardType="numeric"
                />
              </View>

              {/* Кнопки */}
              <View style={[styles.buttonRow, { borderTopColor: colors.border }]}>
                <TouchableOpacity
                  style={[styles.cancelButton, { borderColor: colors.border, backgroundColor: colors.background }]}
                  onPress={() => navigation.goBack()}
                  disabled={isSaving}
                >
                  <Text style={[styles.cancelButtonText, { color: colors.text }]}>Отмена</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.saveButton, { backgroundColor: colors.primary }, (!isDirty || isSaving) && { backgroundColor: colors.textMuted }]}
                  onPress={handleSave}
                  disabled={!isDirty || isSaving}
                >
                  {isSaving ? (
                    <>
                      <ActivityIndicator size="small" color={colors.buttonText} />
                      <Text style={[styles.saveButtonText, { color: colors.buttonText }]}>Сохранение...</Text>
                    </>
                  ) : (
                    <>
                      <Ionicons name="checkmark-circle" size={18} color={colors.buttonText} />
                      <Text style={[styles.saveButtonText, { color: colors.buttonText }]}>Сохранить</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </ScrollView>
      </View>
    </ScreenContainer>
  );
};
