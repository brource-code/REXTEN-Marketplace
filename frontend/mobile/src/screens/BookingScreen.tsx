import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TextInput, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { useRoute, useNavigation, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/RootNavigator';
import { ScreenContainer } from '../components/ScreenContainer';
import { Loader } from '../components/Loader';
import { getAvailableSlots, createBooking, CreateBookingRequest } from '../api/bookings';
import { getServiceProfile } from '../api/marketplace';
import { ServiceProfile } from '../types/marketplace';

import { useTheme } from '../contexts/ThemeContext';
type NavigationProp = NativeStackNavigationProp<RootStackParamList>;
type BookingRouteProp = RouteProp<RootStackParamList, 'Booking'>;

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
  },
  dateRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 16,
  },
  dateButton: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    marginRight: 8,
    marginBottom: 8,
    borderWidth: 1,
    minWidth: 100,
    alignItems: 'center',
  },
  dateButtonActive: {},
  dateButtonInactive: {},
  dateButtonText: {
    fontSize: 14,
    fontWeight: '500',
  },
  dateButtonTextActive: {},
  dateButtonTextInactive: {},
  timeSlotGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 8,
  },
  timeSlotButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    marginRight: 8,
    marginBottom: 8,
    borderWidth: 1,
    minWidth: 80,
    alignItems: 'center',
  },
  timeSlotButtonActive: {},
  timeSlotButtonAvailable: {},
  timeSlotButtonUnavailable: {
    opacity: 0.5,
  },
  timeSlotButtonText: {
    fontSize: 14,
    fontWeight: '500',
  },
  timeSlotButtonTextActive: {},
  timeSlotButtonTextAvailable: {},
  timeSlotButtonTextUnavailable: {},
  inputContainer: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 15,
  },
  inputMultiline: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  serviceInfo: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 24,
  },
  serviceName: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
  },
  servicePrice: {
    fontSize: 20,
    fontWeight: '700',
  },
  submitButton: {
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 8,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  submitButtonDisabled: {
    shadowOpacity: 0,
    elevation: 0,
  },
  submitButtonText: {
    fontWeight: '600',
    fontSize: 18,
  },
  errorText: {
    fontSize: 12,
    marginTop: 4,
  },
});

export const BookingScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<BookingRouteProp>();
  const { serviceId, companyId, advertisementId } = route.params;
  const { colors } = useTheme();

  const [profile, setProfile] = useState<ServiceProfile | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [selectedTime, setSelectedTime] = useState<string>('');
  const [selectedServiceId, setSelectedServiceId] = useState<number | null>(null);
  const [availableSlots, setAvailableSlots] = useState<any[]>([]);
  const [isLoadingSlots, setIsLoadingSlots] = useState(false);
  
  const [clientName, setClientName] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [clientEmail, setClientEmail] = useState('');
  const [clientNotes, setClientNotes] = useState('');
  
  const [addressLine1, setAddressLine1] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [zip, setZip] = useState('');
  const [executionType, setExecutionType] = useState<'onsite' | 'offsite'>('onsite');
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    const loadProfile = async () => {
      try {
        const profileData = await getServiceProfile(serviceId);
        if (profileData) {
          setProfile(profileData);
          if (profileData.servicesList && profileData.servicesList.length > 0) {
            setSelectedServiceId(Number(profileData.servicesList[0].id));
          }
        }
      } catch (error) {
        console.error('Error loading profile:', error);
        Alert.alert('Ошибка', 'Не удалось загрузить информацию об услуге');
      }
    };
    loadProfile();
  }, [serviceId]);

  // Генерируем доступные даты (следующие 14 дней)
  const availableDates = React.useMemo(() => {
    const dates: Array<{ date: string; label: string }> = [];
    const today = new Date();
    for (let i = 0; i < 14; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      const dateStr = date.toISOString().split('T')[0];
      const label = date.toLocaleDateString('ru-RU', { weekday: 'short', day: 'numeric', month: 'short' });
      dates.push({ date: dateStr, label });
    }
    return dates;
  }, []);

  useEffect(() => {
    if (selectedDate && selectedServiceId && companyId) {
      loadAvailableSlots();
    } else {
      setAvailableSlots([]);
    }
  }, [selectedDate, selectedServiceId, companyId]);

  const loadAvailableSlots = async () => {
    if (!selectedDate || !selectedServiceId || !companyId) return;
    
    setIsLoadingSlots(true);
    try {
      const slots = await getAvailableSlots({
        company_id: companyId,
        service_id: selectedServiceId,
        date: selectedDate,
        advertisement_id: advertisementId,
      });
      setAvailableSlots(slots);
    } catch (error) {
      console.error('Error loading slots:', error);
      setAvailableSlots([]);
    } finally {
      setIsLoadingSlots(false);
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};
    
    if (!clientName.trim()) {
      newErrors.clientName = 'Введите ваше имя';
    }
    
    if (!clientPhone.trim()) {
      newErrors.clientPhone = 'Введите номер телефона';
    } else if (!/^[\d\s\-\+\(\)]+$/.test(clientPhone)) {
      newErrors.clientPhone = 'Некорректный номер телефона';
    }
    
    if (clientEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clientEmail)) {
      newErrors.clientEmail = 'Некорректный email';
    }
    
    if (!selectedDate) {
      newErrors.date = 'Выберите дату';
    }
    
    if (!selectedTime) {
      newErrors.time = 'Выберите время';
    }
    
    if (!selectedServiceId) {
      newErrors.service = 'Выберите услугу';
    }
    
    // Валидация для гибридных услуг
    if (serviceType === 'hybrid' && !executionType) {
      newErrors.executionType = 'Выберите тип исполнения услуги';
    }
    
    // Валидация адреса для offsite бронирований
    if (finalExecutionType === 'offsite') {
      if (!addressLine1.trim()) {
        newErrors.addressLine1 = 'Введите адрес';
      }
      if (!city.trim()) {
        newErrors.city = 'Введите город';
      }
      if (!state.trim()) {
        newErrors.state = 'Введите штат';
      }
      if (!zip.trim()) {
        newErrors.zip = 'Введите почтовый индекс';
      }
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      return;
    }

    if (!selectedServiceId || !companyId || !selectedDate || !selectedTime) {
      Alert.alert('Ошибка', 'Заполните все обязательные поля');
      return;
    }

    setIsSubmitting(true);
    try {
      const bookingData: CreateBookingRequest = {
        company_id: companyId,
        service_id: selectedServiceId,
        booking_date: selectedDate,
        booking_time: selectedTime,
        client_name: clientName.trim(),
        client_phone: clientPhone.trim(),
        client_email: clientEmail.trim() || undefined,
        client_notes: clientNotes.trim() || undefined,
        advertisement_id: advertisementId,
        execution_type: finalExecutionType,
        // Добавляем адрес для offsite бронирований
        ...(finalExecutionType === 'offsite' ? {
          address_line1: addressLine1.trim(),
          city: city.trim(),
          state: state.trim(),
          zip: zip.trim(),
        } : {}),
      };

      const result = await createBooking(bookingData);
      
      if (result.success) {
        Alert.alert(
          'Успешно!',
          'Ваше бронирование создано. Мы свяжемся с вами в ближайшее время.',
          [
            {
              text: 'OK',
              onPress: () => navigation.goBack(),
            },
          ]
        );
      } else {
        Alert.alert('Ошибка', result.message || 'Не удалось создать бронирование');
      }
    } catch (error: any) {
      console.error('Error creating booking:', error);
      Alert.alert('Ошибка', 'Не удалось создать бронирование. Попробуйте позже.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectedService = profile?.servicesList?.find(s => Number(s.id) === selectedServiceId);
  
  // Определяем service_type
  const serviceType = selectedService?.service_type || 'onsite';
  
  // Определяем execution_type на основе service_type
  let finalExecutionType: 'onsite' | 'offsite' = 'onsite';
  if (serviceType === 'onsite') {
    finalExecutionType = 'onsite';
  } else if (serviceType === 'offsite') {
    finalExecutionType = 'offsite';
  } else if (serviceType === 'hybrid') {
    // Для гибридных услуг используем выбранный executionType
    finalExecutionType = executionType;
  }

  return (
    <ScreenContainer>
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
          <View style={[styles.scrollContent, { backgroundColor: colors.background }]}>
            {/* Информация об услуге */}
            {profile && (
              <View style={[styles.serviceInfo, { backgroundColor: colors.backgroundSecondary }]}>
                <Text style={[styles.serviceName, { color: colors.text }]}>{profile.service.name}</Text>
                {selectedService && (
                  <Text style={[styles.servicePrice, { color: colors.primary }]}>
                    {selectedService.priceLabel || selectedService.price}
                  </Text>
                )}
              </View>
            )}

            {/* Выбор услуги */}
            {profile?.servicesList && profile.servicesList.length > 1 && (
              <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
                <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Выберите услугу</Text>
                {profile.servicesList.map((service) => (
                  <TouchableOpacity
                    key={service.id}
                    onPress={() => setSelectedServiceId(Number(service.id))}
                    style={[
                      styles.dateButton,
                      selectedServiceId === Number(service.id)
                        ? [styles.dateButtonActive, { backgroundColor: colors.primary, borderColor: colors.primary }]
                        : [styles.dateButtonInactive, { backgroundColor: colors.backgroundSecondary, borderColor: colors.border }],
                    ]}
                  >
                    <Text
                      style={[
                        styles.dateButtonText,
                        selectedServiceId === Number(service.id)
                          ? [styles.dateButtonTextActive, { color: colors.buttonText }]
                          : [styles.dateButtonTextInactive, { color: colors.text }],
                      ]}
                    >
                      {service.name} - {service.priceLabel || service.price}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {/* Выбор даты */}
            <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
              <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Выберите дату</Text>
              <View style={styles.dateRow}>
                {availableDates.map((dateItem) => (
                  <TouchableOpacity
                    key={dateItem.date}
                    onPress={() => {
                      setSelectedDate(dateItem.date);
                      setSelectedTime('');
                    }}
                    style={[
                      styles.dateButton,
                      selectedDate === dateItem.date
                        ? [styles.dateButtonActive, { backgroundColor: colors.primary, borderColor: colors.primary }]
                        : [styles.dateButtonInactive, { backgroundColor: colors.backgroundSecondary, borderColor: colors.border }],
                    ]}
                  >
                    <Text
                      style={[
                        styles.dateButtonText,
                        selectedDate === dateItem.date
                          ? [styles.dateButtonTextActive, { color: colors.buttonText }]
                          : [styles.dateButtonTextInactive, { color: colors.text }],
                      ]}
                    >
                      {dateItem.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
              {errors.date && <Text style={[styles.errorText, { color: colors.error }]}>{errors.date}</Text>}
            </View>

            {/* Выбор времени */}
            {selectedDate && (
              <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
                <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Выберите время</Text>
                {isLoadingSlots ? (
                  <Loader message="Загрузка доступного времени..." />
                ) : availableSlots.length === 0 ? (
                  <Text style={{ color: colors.textSecondary, fontSize: 14 }}>
                    Нет доступного времени на выбранную дату
                  </Text>
                ) : (
                  <>
                    <View style={styles.timeSlotGrid}>
                      {availableSlots.map((slot, idx) => {
                        const isAvailable = slot.available !== false;
                        const isSelected = selectedTime === slot.time;
                        
                        return (
                          <TouchableOpacity
                            key={idx}
                            onPress={() => {
                              if (isAvailable) {
                                setSelectedTime(slot.time);
                              }
                            }}
                            disabled={!isAvailable}
                            style={[
                              styles.timeSlotButton,
                              isSelected
                                ? [styles.timeSlotButtonActive, { backgroundColor: colors.success, borderColor: colors.success }]
                                : isAvailable
                                ? [styles.timeSlotButtonAvailable, { backgroundColor: colors.backgroundSecondary, borderColor: colors.border }]
                                : [styles.timeSlotButtonUnavailable, { backgroundColor: colors.backgroundSecondary, borderColor: colors.border }],
                            ]}
                          >
                            <Text
                              style={[
                                styles.timeSlotButtonText,
                                isSelected
                                  ? [styles.timeSlotButtonTextActive, { color: colors.buttonText }]
                                  : isAvailable
                                  ? [styles.timeSlotButtonTextAvailable, { color: colors.text }]
                                  : [styles.timeSlotButtonTextUnavailable, { color: colors.textMuted }],
                              ]}
                            >
                              {slot.time}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                    {errors.time && <Text style={[styles.errorText, { color: colors.error }]}>{errors.time}</Text>}
                  </>
                )}
              </View>
            )}

            {/* Контактная информация */}
            <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
              <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Контактная информация</Text>
              
              <View style={styles.inputContainer}>
                <Text style={[styles.inputLabel, { color: colors.text }]}>Имя *</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.inputBackground, borderColor: colors.inputBorder, color: colors.text }]}
                  placeholder="Ваше имя"
                  value={clientName}
                  onChangeText={(text) => {
                    setClientName(text);
                    if (errors.clientName) {
                      setErrors({ ...errors, clientName: '' });
                    }
                  }}
                />
                {errors.clientName && <Text style={[styles.errorText, { color: colors.error }]}>{errors.clientName}</Text>}
              </View>

              <View style={styles.inputContainer}>
                <Text style={[styles.inputLabel, { color: colors.text }]}>Телефон *</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.inputBackground, borderColor: colors.inputBorder, color: colors.text }]}
                  placeholder="+1 (555) 123-4567"
                  value={clientPhone}
                  onChangeText={(text) => {
                    setClientPhone(text);
                    if (errors.clientPhone) {
                      setErrors({ ...errors, clientPhone: '' });
                    }
                  }}
                  keyboardType="phone-pad"
                />
                {errors.clientPhone && <Text style={[styles.errorText, { color: colors.error }]}>{errors.clientPhone}</Text>}
              </View>

              <View style={styles.inputContainer}>
                <Text style={[styles.inputLabel, { color: colors.text }]}>Email (необязательно)</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.inputBackground, borderColor: colors.inputBorder, color: colors.text }]}
                  placeholder="your@email.com"
                  value={clientEmail}
                  onChangeText={(text) => {
                    setClientEmail(text);
                    if (errors.clientEmail) {
                      setErrors({ ...errors, clientEmail: '' });
                    }
                  }}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
                {errors.clientEmail && <Text style={[styles.errorText, { color: colors.error }]}>{errors.clientEmail}</Text>}
              </View>

              <View style={styles.inputContainer}>
                <Text style={[styles.inputLabel, { color: colors.text }]}>Комментарий (необязательно)</Text>
                <TextInput
                  style={[styles.input, styles.inputMultiline, { backgroundColor: colors.inputBackground, borderColor: colors.inputBorder, color: colors.text }]}
                  placeholder="Дополнительная информация..."
                  value={clientNotes}
                  onChangeText={setClientNotes}
                  multiline={true}
                  numberOfLines={4}
                />
              </View>

              {/* Переключатель для гибридных услуг */}
              {serviceType === 'hybrid' && (
                <View style={styles.inputContainer}>
                  <Text style={[styles.inputLabel, { color: colors.text }]}>Тип исполнения *</Text>
                  <View style={{ flexDirection: 'row', gap: 16, marginTop: 8 }}>
                    <TouchableOpacity
                      onPress={() => {
                        setExecutionType('onsite');
                        if (errors.executionType) {
                          setErrors({ ...errors, executionType: '' });
                        }
                      }}
                      style={{
                        flex: 1,
                        padding: 12,
                        borderRadius: 8,
                        borderWidth: 1,
                        borderColor: executionType === 'onsite' ? colors.primary : colors.border,
                        backgroundColor: executionType === 'onsite' ? colors.primaryLight : colors.card,
                        alignItems: 'center',
                      }}
                    >
                      <Text style={{ color: executionType === 'onsite' ? colors.primary : colors.textSecondary, fontWeight: '500' }}>
                        Я приеду сам
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => {
                        setExecutionType('offsite');
                        if (errors.executionType) {
                          setErrors({ ...errors, executionType: '' });
                        }
                      }}
                      style={{
                        flex: 1,
                        padding: 12,
                        borderRadius: 8,
                        borderWidth: 1,
                        borderColor: executionType === 'offsite' ? colors.primary : colors.border,
                        backgroundColor: executionType === 'offsite' ? colors.primaryLight : colors.card,
                        alignItems: 'center',
                      }}
                    >
                      <Text style={{ color: executionType === 'offsite' ? colors.primary : colors.textSecondary, fontWeight: '500' }}>
                        Приехать ко мне
                      </Text>
                    </TouchableOpacity>
                  </View>
                  {errors.executionType && <Text style={[styles.errorText, { color: colors.error }]}>{errors.executionType}</Text>}
                </View>
              )}

              {/* Поля адреса для offsite бронирований */}
              {finalExecutionType === 'offsite' && (
                <View style={{ marginTop: 16, paddingTop: 16, borderTopWidth: 1, borderTopColor: colors.border }}>
                  <Text style={[styles.sectionTitle, { color: colors.text, marginBottom: 16 }]}>Адрес</Text>
                  
                  <View style={styles.inputContainer}>
                    <Text style={[styles.inputLabel, { color: colors.text }]}>Адрес *</Text>
                    <TextInput
                      style={[styles.input, { backgroundColor: colors.inputBackground, borderColor: colors.inputBorder, color: colors.text }]}
                      placeholder="123 Main St"
                      value={addressLine1}
                      onChangeText={(text) => {
                        setAddressLine1(text);
                        if (errors.addressLine1) {
                          setErrors({ ...errors, addressLine1: '' });
                        }
                      }}
                    />
                    {errors.addressLine1 && <Text style={[styles.errorText, { color: colors.error }]}>{errors.addressLine1}</Text>}
                  </View>

                  <View style={{ flexDirection: 'row', gap: 12 }}>
                    <View style={[styles.inputContainer, { flex: 1 }]}>
                      <Text style={[styles.inputLabel, { color: colors.text }]}>Город *</Text>
                      <TextInput
                        style={[styles.input, { backgroundColor: colors.inputBackground, borderColor: colors.inputBorder, color: colors.text }]}
                        placeholder="Los Angeles"
                        value={city}
                        onChangeText={(text) => {
                          setCity(text);
                          if (errors.city) {
                            setErrors({ ...errors, city: '' });
                          }
                        }}
                      />
                      {errors.city && <Text style={[styles.errorText, { color: colors.error }]}>{errors.city}</Text>}
                    </View>

                    <View style={[styles.inputContainer, { flex: 1 }]}>
                      <Text style={[styles.inputLabel, { color: colors.text }]}>Штат *</Text>
                      <TextInput
                        style={[styles.input, { backgroundColor: colors.inputBackground, borderColor: colors.inputBorder, color: colors.text }]}
                        placeholder="CA"
                        value={state}
                        onChangeText={(text) => {
                          setState(text);
                          if (errors.state) {
                            setErrors({ ...errors, state: '' });
                          }
                        }}
                      />
                      {errors.state && <Text style={[styles.errorText, { color: colors.error }]}>{errors.state}</Text>}
                    </View>
                  </View>

                  <View style={styles.inputContainer}>
                    <Text style={[styles.inputLabel, { color: colors.text }]}>Почтовый индекс *</Text>
                    <TextInput
                      style={[styles.input, { backgroundColor: colors.inputBackground, borderColor: colors.inputBorder, color: colors.text }]}
                      placeholder="90001"
                      value={zip}
                      onChangeText={(text) => {
                        setZip(text);
                        if (errors.zip) {
                          setErrors({ ...errors, zip: '' });
                        }
                      }}
                      keyboardType="numeric"
                    />
                    {errors.zip && <Text style={[styles.errorText, { color: colors.error }]}>{errors.zip}</Text>}
                  </View>
                </View>
              )}
            </View>
          </View>
        </ScrollView>

        {/* Кнопка отправки */}
        <View style={{ padding: 16, backgroundColor: colors.background, borderTopWidth: 1, borderTopColor: colors.border }}>
          <TouchableOpacity
            onPress={handleSubmit}
            disabled={isSubmitting}
            style={[
              styles.submitButton,
              { backgroundColor: colors.primary, shadowColor: colors.primary },
              isSubmitting && [styles.submitButtonDisabled, { backgroundColor: colors.textMuted }],
            ]}
          >
            <Text style={[styles.submitButtonText, { color: colors.buttonText }]}>
              {isSubmitting ? 'Отправка...' : 'Забронировать'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScreenContainer>
  );
};

