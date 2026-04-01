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

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;
type BookingRouteProp = RouteProp<RootStackParamList, 'Booking'>;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
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
    color: '#111827',
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
  dateButtonActive: {
    backgroundColor: '#2563eb',
    borderColor: '#2563eb',
  },
  dateButtonInactive: {
    backgroundColor: '#f9fafb',
    borderColor: '#e5e7eb',
  },
  dateButtonText: {
    fontSize: 14,
    fontWeight: '500',
  },
  dateButtonTextActive: {
    color: '#ffffff',
  },
  dateButtonTextInactive: {
    color: '#374151',
  },
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
  timeSlotButtonActive: {
    backgroundColor: '#10b981',
    borderColor: '#10b981',
  },
  timeSlotButtonAvailable: {
    backgroundColor: '#f9fafb',
    borderColor: '#e5e7eb',
  },
  timeSlotButtonUnavailable: {
    backgroundColor: '#f3f4f6',
    borderColor: '#e5e7eb',
    opacity: 0.5,
  },
  timeSlotButtonText: {
    fontSize: 14,
    fontWeight: '500',
  },
  timeSlotButtonTextActive: {
    color: '#ffffff',
  },
  timeSlotButtonTextAvailable: {
    color: '#374151',
  },
  timeSlotButtonTextUnavailable: {
    color: '#9ca3af',
  },
  inputContainer: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 15,
    color: '#111827',
    backgroundColor: '#ffffff',
  },
  inputMultiline: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  serviceInfo: {
    backgroundColor: '#f9fafb',
    padding: 16,
    borderRadius: 12,
    marginBottom: 24,
  },
  serviceName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 8,
  },
  servicePrice: {
    fontSize: 20,
    fontWeight: '700',
    color: '#2563eb',
  },
  submitButton: {
    backgroundColor: '#2563eb',
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 8,
    shadowColor: '#2563eb',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  submitButtonDisabled: {
    backgroundColor: '#9ca3af',
    shadowOpacity: 0,
    elevation: 0,
  },
  submitButtonText: {
    color: '#ffffff',
    fontWeight: '600',
    fontSize: 18,
  },
  errorText: {
    color: '#ef4444',
    fontSize: 12,
    marginTop: 4,
  },
});

export const BookingScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<BookingRouteProp>();
  const { serviceId, companyId, advertisementId } = route.params;

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

  return (
    <ScreenContainer>
      <View style={styles.container}>
        <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
          <View style={styles.scrollContent}>
            {/* Информация об услуге */}
            {profile && (
              <View style={styles.serviceInfo}>
                <Text style={styles.serviceName}>{profile.service.name}</Text>
                {selectedService && (
                  <Text style={styles.servicePrice}>
                    {selectedService.priceLabel || selectedService.price}
                  </Text>
                )}
              </View>
            )}

            {/* Выбор услуги */}
            {profile?.servicesList && profile.servicesList.length > 1 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Выберите услугу</Text>
                {profile.servicesList.map((service) => (
                  <TouchableOpacity
                    key={service.id}
                    onPress={() => setSelectedServiceId(Number(service.id))}
                    style={[
                      styles.dateButton,
                      selectedServiceId === Number(service.id)
                        ? styles.dateButtonActive
                        : styles.dateButtonInactive,
                    ]}
                  >
                    <Text
                      style={[
                        styles.dateButtonText,
                        selectedServiceId === Number(service.id)
                          ? styles.dateButtonTextActive
                          : styles.dateButtonTextInactive,
                      ]}
                    >
                      {service.name} - {service.priceLabel || service.price}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {/* Выбор даты */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Выберите дату</Text>
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
                        ? styles.dateButtonActive
                        : styles.dateButtonInactive,
                    ]}
                  >
                    <Text
                      style={[
                        styles.dateButtonText,
                        selectedDate === dateItem.date
                          ? styles.dateButtonTextActive
                          : styles.dateButtonTextInactive,
                      ]}
                    >
                      {dateItem.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
              {errors.date && <Text style={styles.errorText}>{errors.date}</Text>}
            </View>

            {/* Выбор времени */}
            {selectedDate && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Выберите время</Text>
                {isLoadingSlots ? (
                  <Loader message="Загрузка доступного времени..." />
                ) : availableSlots.length === 0 ? (
                  <Text style={{ color: '#6b7280', fontSize: 14 }}>
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
                                ? styles.timeSlotButtonActive
                                : isAvailable
                                ? styles.timeSlotButtonAvailable
                                : styles.timeSlotButtonUnavailable,
                            ]}
                          >
                            <Text
                              style={[
                                styles.timeSlotButtonText,
                                isSelected
                                  ? styles.timeSlotButtonTextActive
                                  : isAvailable
                                  ? styles.timeSlotButtonTextAvailable
                                  : styles.timeSlotButtonTextUnavailable,
                              ]}
                            >
                              {slot.time}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                    {errors.time && <Text style={styles.errorText}>{errors.time}</Text>}
                  </>
                )}
              </View>
            )}

            {/* Контактная информация */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Контактная информация</Text>
              
              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Имя *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Ваше имя"
                  value={clientName}
                  onChangeText={(text) => {
                    setClientName(text);
                    if (errors.clientName) {
                      setErrors({ ...errors, clientName: '' });
                    }
                  }}
                />
                {errors.clientName && <Text style={styles.errorText}>{errors.clientName}</Text>}
              </View>

              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Телефон *</Text>
                <TextInput
                  style={styles.input}
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
                {errors.clientPhone && <Text style={styles.errorText}>{errors.clientPhone}</Text>}
              </View>

              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Email (необязательно)</Text>
                <TextInput
                  style={styles.input}
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
                {errors.clientEmail && <Text style={styles.errorText}>{errors.clientEmail}</Text>}
              </View>

              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Комментарий (необязательно)</Text>
                <TextInput
                  style={[styles.input, styles.inputMultiline]}
                  placeholder="Дополнительная информация..."
                  value={clientNotes}
                  onChangeText={setClientNotes}
                  multiline={true}
                  numberOfLines={4}
                />
              </View>
            </View>
          </View>
        </ScrollView>

        {/* Кнопка отправки */}
        <View style={{ padding: 16, backgroundColor: '#ffffff', borderTopWidth: 1, borderTopColor: '#e5e7eb' }}>
          <TouchableOpacity
            onPress={handleSubmit}
            disabled={isSubmitting}
            style={[
              styles.submitButton,
              isSubmitting && styles.submitButtonDisabled,
            ]}
          >
            <Text style={styles.submitButtonText}>
              {isSubmitting ? 'Отправка...' : 'Забронировать'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScreenContainer>
  );
};

