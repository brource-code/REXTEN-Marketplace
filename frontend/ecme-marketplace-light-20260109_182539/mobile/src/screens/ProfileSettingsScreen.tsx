import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, TextInput, Alert, ActivityIndicator } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { RootStackParamList } from '../navigation/RootNavigator';
import { ScreenContainer } from '../components/ScreenContainer';
import { useAuth } from '../contexts/AuthContext';
import { getClientProfile, updateClientProfile, ClientProfile } from '../api/client';
import { US_STATES, getCitiesByState, getStateName } from '../constants/us-locations';
import { LocationSelector } from '../components/LocationSelector';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
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
    color: '#111827',
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 16,
  },
  formGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#f9fafb',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    color: '#111827',
  },
  inputDisabled: {
    backgroundColor: '#f3f4f6',
    color: '#6b7280',
  },
  inputError: {
    borderColor: '#ef4444',
  },
  errorText: {
    fontSize: 12,
    color: '#ef4444',
    marginTop: 4,
  },
  helpText: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 4,
  },
  locationSection: {
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  locationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  locationHeaderText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
    marginLeft: 8,
  },
  locationInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  locationInfoText: {
    fontSize: 13,
    color: '#6b7280',
    marginLeft: 6,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 24,
    paddingTop: 24,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    backgroundColor: '#ffffff',
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#111827',
  },
  saveButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 8,
    backgroundColor: '#2563eb',
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  saveButtonDisabled: {
    backgroundColor: '#9ca3af',
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
});

export const ProfileSettingsScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const { user, refreshUser } = useAuth();
  
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
  }, []);

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
        <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
          <ActivityIndicator size="large" color="#2563eb" />
          <Text style={{ marginTop: 16, color: '#6b7280' }}>Загрузка профиля...</Text>
        </View>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer>
      <View style={styles.container}>
        {/* Заголовок */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="arrow-back" size={24} color="#111827" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Настройки профиля</Text>
        </View>

        <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
          <View style={styles.scrollContent}>
            <View style={styles.card}>
              <Text style={styles.sectionTitle}>Личные данные</Text>

              {/* Имя */}
              <View style={styles.formGroup}>
                <Text style={styles.label}>Имя *</Text>
                <TextInput
                  style={[styles.input, errors.firstName && styles.inputError]}
                  placeholder="Введите имя"
                  value={firstName}
                  onChangeText={(value) => handleFieldChange('firstName', value)}
                />
                {errors.firstName && <Text style={styles.errorText}>{errors.firstName}</Text>}
              </View>

              {/* Фамилия */}
              <View style={styles.formGroup}>
                <Text style={styles.label}>Фамилия *</Text>
                <TextInput
                  style={[styles.input, errors.lastName && styles.inputError]}
                  placeholder="Введите фамилию"
                  value={lastName}
                  onChangeText={(value) => handleFieldChange('lastName', value)}
                />
                {errors.lastName && <Text style={styles.errorText}>{errors.lastName}</Text>}
              </View>

              {/* Email (только для чтения) */}
              <View style={styles.formGroup}>
                <Text style={styles.label}>Email</Text>
                <TextInput
                  style={[styles.input, styles.inputDisabled]}
                  value={user?.email || ''}
                  editable={false}
                />
                <Text style={styles.helpText}>Email нельзя изменить</Text>
              </View>

              {/* Телефон */}
              <View style={styles.formGroup}>
                <Text style={styles.label}>Телефон</Text>
                <TextInput
                  style={styles.input}
                  placeholder="+1 (555) 123-4567"
                  value={phone}
                  onChangeText={(value) => handleFieldChange('phone', value)}
                  keyboardType="phone-pad"
                />
              </View>

              {/* Адрес */}
              <View style={styles.formGroup}>
                <Text style={styles.label}>Адрес</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Введите адрес"
                  value={address}
                  onChangeText={(value) => handleFieldChange('address', value)}
                />
              </View>

              {/* Постоянная локация */}
              <View style={styles.formGroup}>
                <Text style={styles.label}>Постоянная локация</Text>
                <View style={styles.locationSection}>
                  <View style={styles.locationHeader}>
                    <Ionicons name="location-outline" size={18} color="#2563eb" />
                    <Text style={styles.locationHeaderText}>
                      Укажите вашу постоянную локацию для автоматического применения в каталоге
                    </Text>
                  </View>
                  
                  <LocationSelector
                    onLocationChange={handleLocationChange}
                    showLabel={false}
                  />

                  {/* Показываем выбранную локацию */}
                  {selectedState && selectedCity && (
                    <View style={styles.locationInfo}>
                      <Ionicons name="checkmark-circle" size={16} color="#10b981" />
                      <Text style={styles.locationInfoText}>
                        {selectedCity}, {getStateName(selectedState)}
                      </Text>
                    </View>
                  )}
                </View>
              </View>

              {/* Почтовый индекс */}
              <View style={styles.formGroup}>
                <Text style={styles.label}>Почтовый индекс</Text>
                <TextInput
                  style={styles.input}
                  placeholder="12345"
                  value={zipCode}
                  onChangeText={(value) => handleFieldChange('zipCode', value)}
                  keyboardType="numeric"
                />
              </View>

              {/* Кнопки */}
              <View style={styles.buttonRow}>
                <TouchableOpacity
                  style={styles.cancelButton}
                  onPress={() => navigation.goBack()}
                  disabled={isSaving}
                >
                  <Text style={styles.cancelButtonText}>Отмена</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.saveButton, (!isDirty || isSaving) && styles.saveButtonDisabled]}
                  onPress={handleSave}
                  disabled={!isDirty || isSaving}
                >
                  {isSaving ? (
                    <>
                      <ActivityIndicator size="small" color="#ffffff" />
                      <Text style={styles.saveButtonText}>Сохранение...</Text>
                    </>
                  ) : (
                    <>
                      <Ionicons name="checkmark-circle" size={18} color="#ffffff" />
                      <Text style={styles.saveButtonText}>Сохранить</Text>
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
