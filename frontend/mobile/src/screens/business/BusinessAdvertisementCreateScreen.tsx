import React, { useState, useCallback, useLayoutEffect, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Switch,
  Image,
} from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import {
  createBusinessAdvertisement,
  updateBusinessAdvertisement,
  getBusinessAdvertisement,
  getTeamMembers,
  getBusinessServices,
  BusinessService,
  TeamMember,
} from '../../api/business';
import { getCategories, getStates } from '../../api/marketplace';
import { ScreenContainer } from '../../components/ScreenContainer';
import type { BusinessStackParamList } from '../../navigation/BusinessStackNavigator';

import { useTheme } from '../../contexts/ThemeContext';
const T = {
  titleCreate: 'Новое объявление',
  titleEdit: 'Редактирование',
  steps: {
    general: 'Основное',
    pricing: 'Цены',
    services: 'Услуги',
    schedule: 'Расписание',
    team: 'Команда',
  },
  general: {
    title: 'Основная информация',
    name: 'Название *',
    namePlaceholder: 'Введите название',
    description: 'Описание',
    descriptionPlaceholder: 'Опишите ваше объявление...',
    category: 'Категория',
    categoryPlaceholder: 'Выберите категорию',
    state: 'Штат',
    statePlaceholder: 'Выберите штат',
    city: 'Город',
    cityPlaceholder: 'Введите город',
  },
  pricing: {
    title: 'Ценовой диапазон',
    priceFrom: 'Цена от',
    priceTo: 'Цена до',
    currency: 'Валюта',
  },
  services: {
    title: 'Услуги объявления',
    description: 'Выберите услуги из каталога компании',
    empty: 'Нет доступных услуг',
    selected: 'Выбрано услуг',
  },
  schedule: {
    title: 'Расписание работы',
    description: 'Укажите часы работы по дням недели',
    days: {
      monday: 'Понедельник',
      tuesday: 'Вторник',
      wednesday: 'Среда',
      thursday: 'Четверг',
      friday: 'Пятница',
      saturday: 'Суббота',
      sunday: 'Воскресенье',
    },
    from: 'с',
    to: 'до',
    slotStep: 'Шаг слотов (мин)',
  },
  team: {
    title: 'Команда',
    description: 'Выберите специалистов для этого объявления',
    empty: 'Нет доступных специалистов',
    selected: 'Выбрано',
  },
  actions: {
    next: 'Далее',
    back: 'Назад',
    create: 'Создать',
    save: 'Сохранить',
  },
  success: {
    created: 'Объявление создано',
    updated: 'Объявление обновлено',
  },
  errors: {
    titleRequired: 'Укажите название объявления',
  },
};

type Step = 'general' | 'pricing' | 'services' | 'schedule' | 'team';
const STEPS: Step[] = ['general', 'pricing', 'services', 'schedule', 'team'];

type DaySchedule = { enabled: boolean; from: string; to: string };
type Schedule = {
  monday: DaySchedule;
  tuesday: DaySchedule;
  wednesday: DaySchedule;
  thursday: DaySchedule;
  friday: DaySchedule;
  saturday: DaySchedule;
  sunday: DaySchedule;
};

type FormData = {
  title: string;
  description: string;
  category_id: number | null;
  state: string;
  city: string;
  priceFrom: string;
  priceTo: string;
  currency: string;
  services: number[];
  schedule: Schedule;
  slot_step_minutes: number;
  team: number[];
};

const DEFAULT_SCHEDULE: Schedule = {
  monday: { enabled: true, from: '09:00', to: '18:00' },
  tuesday: { enabled: true, from: '09:00', to: '18:00' },
  wednesday: { enabled: true, from: '09:00', to: '18:00' },
  thursday: { enabled: true, from: '09:00', to: '18:00' },
  friday: { enabled: true, from: '09:00', to: '18:00' },
  saturday: { enabled: false, from: '09:00', to: '18:00' },
  sunday: { enabled: false, from: '09:00', to: '18:00' },
};

type RouteParams = {
  editId?: number;
};

type Route = RouteProp<{ params: RouteParams }, 'params'>;

export function BusinessAdvertisementCreateScreen() {
  
  const { colors } = useTheme();
const navigation = useNavigation();
  const route = useRoute<Route>();
  const queryClient = useQueryClient();

  const editId = route.params?.editId;
  const isEdit = !!editId;

  const [currentStep, setCurrentStep] = useState<Step>('general');
  const [formData, setFormData] = useState<FormData>({
    title: '',
    description: '',
    category_id: null,
    state: '',
    city: '',
    priceFrom: '',
    priceTo: '',
    currency: 'USD',
    services: [],
    schedule: DEFAULT_SCHEDULE,
    slot_step_minutes: 60,
    team: [],
  });

  useLayoutEffect(() => {
    navigation.setOptions({
      title: isEdit ? T.titleEdit : T.titleCreate,
    });
  }, [navigation, isEdit]);

  // Загрузка данных для редактирования
  const { data: advertisement, isLoading: isLoadingAd } = useQuery({
    queryKey: ['business-advertisement', editId],
    queryFn: () => getBusinessAdvertisement(editId!),
    enabled: isEdit && !!editId,
  });

  // Загрузка категорий
  const { data: categories = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: getCategories,
  });

  // Загрузка штатов
  const { data: states = [] } = useQuery({
    queryKey: ['states'],
    queryFn: getStates,
  });

  // Загрузка команды
  const { data: companyTeam = [] } = useQuery({
    queryKey: ['business-team'],
    queryFn: getTeamMembers,
  });

  // Загрузка услуг компании
  const { data: companyServices = [] } = useQuery({
    queryKey: ['business-services'],
    queryFn: getBusinessServices,
  });

  // Заполнение формы при редактировании
  useEffect(() => {
    if (advertisement && isEdit) {
      const servicesIds = Array.isArray(advertisement.services)
        ? advertisement.services.map((s: any) => s.service_id || s.id).filter(Boolean)
        : [];

      const teamIds = (() => {
        const team = Array.isArray(advertisement.team)
          ? advertisement.team
          : advertisement.team
          ? JSON.parse(advertisement.team)
          : [];
        return Array.isArray(team) ? team.map((m: any) => (typeof m === 'object' ? m.id : m)) : [];
      })();

      setFormData({
        title: advertisement.title || '',
        description: advertisement.description || '',
        category_id: advertisement.category_id || null,
        state: advertisement.state || '',
        city: advertisement.city || '',
        priceFrom: advertisement.price_from?.toString() || '',
        priceTo: advertisement.price_to?.toString() || '',
        currency: advertisement.currency || 'USD',
        services: servicesIds,
        schedule: advertisement.schedule || DEFAULT_SCHEDULE,
        slot_step_minutes: advertisement.slot_step_minutes || 60,
        team: teamIds,
      });
    }
  }, [advertisement, isEdit]);

  const currentStepIndex = STEPS.indexOf(currentStep);
  const isFirstStep = currentStepIndex === 0;
  const isLastStep = currentStepIndex === STEPS.length - 1;

  const goNext = useCallback(() => {
    if (!isLastStep) {
      setCurrentStep(STEPS[currentStepIndex + 1]);
    }
  }, [currentStepIndex, isLastStep]);

  const goBack = useCallback(() => {
    if (!isFirstStep) {
      setCurrentStep(STEPS[currentStepIndex - 1]);
    }
  }, [currentStepIndex, isFirstStep]);

  const createMutation = useMutation({
    mutationFn: () => {
      const servicesData = formData.services
        .map((id) => companyServices.find((s) => s.id === id))
        .filter(Boolean)
        .map((s) => ({
          service_id: s!.id,
          name: s!.name,
          price: s!.price,
          duration: s!.duration_minutes,
        }));

      const teamData = formData.team
        .map((id) => companyTeam.find((m) => m.id === id))
        .filter(Boolean)
        .map((m) => ({
          id: m!.id,
          name: m!.name,
          role: m!.role,
        }));

      return createBusinessAdvertisement({
        title: formData.title.trim(),
        description: formData.description.trim() || undefined,
        type: 'regular',
        status: 'draft',
        category_id: formData.category_id || undefined,
        state: formData.state || undefined,
        city: formData.city || undefined,
        price_from: formData.priceFrom ? parseFloat(formData.priceFrom) : undefined,
        price_to: formData.priceTo ? parseFloat(formData.priceTo) : undefined,
        currency: formData.currency,
        services: servicesData,
        schedule: formData.schedule,
        slot_step_minutes: formData.slot_step_minutes,
        team: teamData,
      } as any);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['business-advertisements'] });
      Alert.alert('Успех', T.success.created, [{ text: 'OK', onPress: () => navigation.goBack() }]);
    },
    onError: (e: Error) => Alert.alert('Ошибка', e.message),
  });

  const updateMutation = useMutation({
    mutationFn: () => {
      const servicesData = formData.services
        .map((id) => companyServices.find((s) => s.id === id))
        .filter(Boolean)
        .map((s) => ({
          service_id: s!.id,
          name: s!.name,
          price: s!.price,
          duration: s!.duration_minutes,
        }));

      const teamData = formData.team
        .map((id) => companyTeam.find((m) => m.id === id))
        .filter(Boolean)
        .map((m) => ({
          id: m!.id,
          name: m!.name,
          role: m!.role,
        }));

      return updateBusinessAdvertisement(editId!, {
        title: formData.title.trim(),
        description: formData.description.trim() || undefined,
        category_id: formData.category_id || undefined,
        state: formData.state || undefined,
        city: formData.city || undefined,
        price_from: formData.priceFrom ? parseFloat(formData.priceFrom) : undefined,
        price_to: formData.priceTo ? parseFloat(formData.priceTo) : undefined,
        currency: formData.currency,
        services: servicesData,
        schedule: formData.schedule,
        slot_step_minutes: formData.slot_step_minutes,
        team: teamData,
      } as any);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['business-advertisements'] });
      queryClient.invalidateQueries({ queryKey: ['business-advertisement', editId] });
      Alert.alert('Успех', T.success.updated, [{ text: 'OK', onPress: () => navigation.goBack() }]);
    },
    onError: (e: Error) => Alert.alert('Ошибка', e.message),
  });

  const handleSubmit = useCallback(() => {
    if (!formData.title.trim()) {
      Alert.alert('Ошибка', T.errors.titleRequired);
      setCurrentStep('general');
      return;
    }

    if (isEdit) {
      updateMutation.mutate();
    } else {
      createMutation.mutate();
    }
  }, [formData, isEdit, createMutation, updateMutation]);

  const isPending = createMutation.isPending || updateMutation.isPending;

  const toggleService = useCallback((serviceId: number) => {
    setFormData((prev) => ({
      ...prev,
      services: prev.services.includes(serviceId)
        ? prev.services.filter((id) => id !== serviceId)
        : [...prev.services, serviceId],
    }));
  }, []);

  const toggleTeamMember = useCallback((memberId: number) => {
    setFormData((prev) => ({
      ...prev,
      team: prev.team.includes(memberId)
        ? prev.team.filter((id) => id !== memberId)
        : [...prev.team, memberId],
    }));
  }, []);

  const updateSchedule = useCallback((day: keyof Schedule, field: keyof DaySchedule, value: any) => {
    setFormData((prev) => ({
      ...prev,
      schedule: {
        ...prev.schedule,
        [day]: {
          ...prev.schedule[day],
          [field]: value,
        },
      },
    }));
  }, []);

  if (isEdit && isLoadingAd) {
    return (
      <ScreenContainer edges={['bottom']}>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </ScreenContainer>
    );
  }

  const renderStepIndicator = () => (
    <View style={[styles.stepsRow, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
      {STEPS.map((step, index) => {
        const isActive = step === currentStep;
        const isPassed = index < currentStepIndex;
        return (
          <TouchableOpacity
            key={step}
            style={[styles.stepItem, isActive && styles.stepItemActive, isPassed && styles.stepItemPassed]}
            onPress={() => setCurrentStep(step)}
            activeOpacity={0.8}
          >
            <View style={[styles.stepDot, { backgroundColor: colors.border }, isActive && { backgroundColor: colors.primary }, isPassed && { backgroundColor: colors.success }]}>
              {isPassed ? (
                <Ionicons name="checkmark" size={12} color={colors.buttonText} />
              ) : (
                <Text style={[styles.stepDotText, { color: colors.textSecondary }, (isActive || isPassed) && { color: colors.buttonText }]}>
                  {index + 1}
                </Text>
              )}
            </View>
            <Text style={[styles.stepLabel, { color: colors.textMuted }, isActive && { color: colors.primary, fontWeight: '700' }]} numberOfLines={1}>
              {T.steps[step]}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );

  const renderGeneralStep = () => (
    <View style={styles.stepContent}>
      <Text style={[styles.stepTitle, { color: colors.text }]}>{T.general.title}</Text>

      <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>{T.general.name}</Text>
      <TextInput
        style={[styles.input, { backgroundColor: colors.inputBackground, borderColor: colors.inputBorder, color: colors.text }]}
        value={formData.title}
        onChangeText={(v) => setFormData((p) => ({ ...p, title: v }))}
        placeholder={T.general.namePlaceholder}
        placeholderTextColor={colors.textMuted}
      />

      <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>{T.general.description}</Text>
      <TextInput
        style={[styles.input, styles.inputMultiline, { backgroundColor: colors.inputBackground, borderColor: colors.inputBorder, color: colors.text }]}
        value={formData.description}
        onChangeText={(v) => setFormData((p) => ({ ...p, description: v }))}
        placeholder={T.general.descriptionPlaceholder}
        placeholderTextColor={colors.textMuted}
        multiline
      />

      <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>{T.general.category}</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipsScroll}>
        <View style={styles.chipsRow}>
          {categories.map((cat: any) => (
            <TouchableOpacity
              key={cat.id}
              style={[styles.chip, { backgroundColor: colors.backgroundSecondary, borderColor: colors.border }, formData.category_id === cat.id && { backgroundColor: colors.primaryLight, borderColor: colors.primary }]}
              onPress={() => setFormData((p) => ({ ...p, category_id: cat.id }))}
              activeOpacity={0.8}
            >
              <Text style={[styles.chipText, { color: colors.textSecondary }, formData.category_id === cat.id && { color: colors.primary }]}>
                {cat.name}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      <View style={[styles.row, { borderBottomColor: colors.border }]}>
        <View style={styles.col}>
          <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>{T.general.state}</Text>
          <TextInput
            style={[styles.input, { backgroundColor: colors.inputBackground, borderColor: colors.inputBorder, color: colors.text }]}
            value={formData.state}
            onChangeText={(v) => setFormData((p) => ({ ...p, state: v }))}
            placeholder={T.general.statePlaceholder}
            placeholderTextColor={colors.textMuted}
          />
        </View>
        <View style={styles.col}>
          <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>{T.general.city}</Text>
          <TextInput
            style={[styles.input, { backgroundColor: colors.inputBackground, borderColor: colors.inputBorder, color: colors.text }]}
            value={formData.city}
            onChangeText={(v) => setFormData((p) => ({ ...p, city: v }))}
            placeholder={T.general.cityPlaceholder}
            placeholderTextColor={colors.textMuted}
          />
        </View>
      </View>
    </View>
  );

  const renderPricingStep = () => (
    <View style={styles.stepContent}>
      <Text style={[styles.stepTitle, { color: colors.text }]}>{T.pricing.title}</Text>

      <View style={[styles.row, { borderBottomColor: colors.border }]}>
        <View style={styles.col}>
          <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>{T.pricing.priceFrom}</Text>
          <TextInput
            style={[styles.input, { backgroundColor: colors.inputBackground, borderColor: colors.inputBorder, color: colors.text }]}
            value={formData.priceFrom}
            onChangeText={(v) => setFormData((p) => ({ ...p, priceFrom: v }))}
            placeholder="0"
            placeholderTextColor={colors.textMuted}
            keyboardType="numeric"
          />
        </View>
        <View style={styles.col}>
          <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>{T.pricing.priceTo}</Text>
          <TextInput
            style={[styles.input, { backgroundColor: colors.inputBackground, borderColor: colors.inputBorder, color: colors.text }]}
            value={formData.priceTo}
            onChangeText={(v) => setFormData((p) => ({ ...p, priceTo: v }))}
            placeholder="0"
            placeholderTextColor={colors.textMuted}
            keyboardType="numeric"
          />
        </View>
      </View>

      <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>{T.pricing.currency}</Text>
      <View style={styles.chipsRow}>
        {['USD', 'EUR', 'RUB'].map((cur) => (
          <TouchableOpacity
            key={cur}
            style={[styles.chip, { backgroundColor: colors.backgroundSecondary, borderColor: colors.border }, formData.currency === cur && { backgroundColor: colors.primaryLight, borderColor: colors.primary }]}
            onPress={() => setFormData((p) => ({ ...p, currency: cur }))}
            activeOpacity={0.8}
          >
            <Text style={[styles.chipText, { color: colors.textSecondary }, formData.currency === cur && { color: colors.primary }]}>{cur}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  const renderServicesStep = () => (
    <View style={styles.stepContent}>
      <Text style={[styles.stepTitle, { color: colors.text }]}>{T.services.title}</Text>
      <Text style={[styles.stepDesc, { color: colors.textSecondary }]}>{T.services.description}</Text>
      <Text style={[styles.selectedCount, { color: colors.primary }]}>
        {T.services.selected}: {formData.services.length}
      </Text>

      {companyServices.length === 0 ? (
        <View style={styles.emptyBlock}>
          <Ionicons name="list-outline" size={40} color={colors.textMuted} />
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>{T.services.empty}</Text>
        </View>
      ) : (
        <View style={styles.listBlock}>
          {companyServices.map((service: BusinessService) => {
            const isSelected = formData.services.includes(service.id);
            return (
              <TouchableOpacity
                key={service.id}
                style={[styles.selectableCard, { backgroundColor: colors.card, borderColor: colors.border }, isSelected && { borderColor: colors.primary, backgroundColor: colors.primaryLight }]}
                onPress={() => toggleService(service.id)}
                activeOpacity={0.8}
              >
                <View style={styles.selectableCardContent}>
                  <Text style={[styles.selectableCardTitle, { color: colors.text }]}>{service.name}</Text>
                  <Text style={[styles.selectableCardMeta, { color: colors.textSecondary }]}>
                    ${service.price} · {service.duration_minutes} мин
                  </Text>
                </View>
                <View style={[styles.checkbox, { borderColor: colors.textMuted }, isSelected && { backgroundColor: colors.primary, borderColor: colors.primary }]}>
                  {isSelected && <Ionicons name="checkmark" size={14} color={colors.buttonText} />}
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      )}
    </View>
  );

  const renderScheduleStep = () => {
    const days = Object.keys(formData.schedule) as (keyof Schedule)[];
    return (
      <View style={styles.stepContent}>
        <Text style={[styles.stepTitle, { color: colors.text }]}>{T.schedule.title}</Text>
        <Text style={[styles.stepDesc, { color: colors.textSecondary }]}>{T.schedule.description}</Text>

        <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>{T.schedule.slotStep}</Text>
        <View style={styles.chipsRow}>
          {[15, 30, 60, 90, 120].map((mins) => (
            <TouchableOpacity
              key={mins}
              style={[styles.chip, { backgroundColor: colors.backgroundSecondary, borderColor: colors.border }, formData.slot_step_minutes === mins && { backgroundColor: colors.primaryLight, borderColor: colors.primary }]}
              onPress={() => setFormData((p) => ({ ...p, slot_step_minutes: mins }))}
              activeOpacity={0.8}
            >
              <Text style={[styles.chipText, { color: colors.textSecondary }, formData.slot_step_minutes === mins && { color: colors.primary }]}>
                {mins}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.scheduleList}>
          {days.map((day) => {
            const dayData = formData.schedule[day];
            return (
              <View key={day} style={[styles.scheduleRow, { backgroundColor: colors.backgroundSecondary }]}>
                <View style={styles.scheduleDayCol}>
                  <Switch
                    value={dayData.enabled}
                    onValueChange={(v) => updateSchedule(day, 'enabled', v)}
                    trackColor={{ false: colors.border, true: colors.successLight }}
                    thumbColor={dayData.enabled ? colors.success : colors.textMuted}
                  />
                  <Text style={[styles.scheduleDayText, { color: colors.text }, !dayData.enabled && { color: colors.textMuted }]}>
                    {T.schedule.days[day]}
                  </Text>
                </View>
                {dayData.enabled && (
                  <View style={styles.scheduleTimeCol}>
                    <TextInput
                      style={[styles.timeInput, { borderColor: colors.border, color: colors.text, backgroundColor: colors.card }]}
                      value={dayData.from}
                      onChangeText={(v) => updateSchedule(day, 'from', v)}
                      placeholder="09:00"
                      placeholderTextColor={colors.textMuted}
                    />
                    <Text style={[styles.timeSeparator, { color: colors.textSecondary }]}>—</Text>
                    <TextInput
                      style={[styles.timeInput, { borderColor: colors.border, color: colors.text, backgroundColor: colors.card }]}
                      value={dayData.to}
                      onChangeText={(v) => updateSchedule(day, 'to', v)}
                      placeholder="18:00"
                      placeholderTextColor={colors.textMuted}
                    />
                  </View>
                )}
              </View>
            );
          })}
        </View>
      </View>
    );
  };

  const renderTeamStep = () => (
    <View style={styles.stepContent}>
      <Text style={[styles.stepTitle, { color: colors.text }]}>{T.team.title}</Text>
      <Text style={[styles.stepDesc, { color: colors.textSecondary }]}>{T.team.description}</Text>
      <Text style={[styles.selectedCount, { color: colors.primary }]}>
        {T.team.selected}: {formData.team.length}
      </Text>

      {companyTeam.length === 0 ? (
        <View style={styles.emptyBlock}>
          <Ionicons name="people-outline" size={40} color={colors.textMuted} />
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>{T.team.empty}</Text>
        </View>
      ) : (
        <View style={styles.listBlock}>
          {companyTeam.map((member: TeamMember) => {
            const isSelected = formData.team.includes(member.id);
            return (
              <TouchableOpacity
                key={member.id}
                style={[styles.selectableCard, { backgroundColor: colors.card, borderColor: colors.border }, isSelected && { borderColor: colors.primary, backgroundColor: colors.primaryLight }]}
                onPress={() => toggleTeamMember(member.id)}
                activeOpacity={0.8}
              >
                <View style={[styles.memberAvatar, { backgroundColor: colors.primaryLight }]}>
                  <Text style={[styles.memberAvatarText, { color: colors.primary }]}>{member.name?.charAt(0).toUpperCase() || 'U'}</Text>
                </View>
                <View style={styles.selectableCardContent}>
                  <Text style={[styles.selectableCardTitle, { color: colors.text }]}>{member.name}</Text>
                  <Text style={[styles.selectableCardMeta, { color: colors.textSecondary }]}>{member.role || 'Специалист'}</Text>
                </View>
                <View style={[styles.checkbox, { borderColor: colors.textMuted }, isSelected && { backgroundColor: colors.primary, borderColor: colors.primary }]}>
                  {isSelected && <Ionicons name="checkmark" size={14} color={colors.buttonText} />}
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      )}
    </View>
  );

  const renderCurrentStep = () => {
    switch (currentStep) {
      case 'general':
        return renderGeneralStep();
      case 'pricing':
        return renderPricingStep();
      case 'services':
        return renderServicesStep();
      case 'schedule':
        return renderScheduleStep();
      case 'team':
        return renderTeamStep();
      default:
        return null;
    }
  };

  return (
    <ScreenContainer edges={['bottom']}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        {renderStepIndicator()}

        <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          {renderCurrentStep()}
        </ScrollView>

        <View style={[styles.footer, { backgroundColor: colors.card, borderTopColor: colors.border }]}>
          <View style={styles.footerButtons}>
            {!isFirstStep && (
              <TouchableOpacity style={[styles.backBtn, { backgroundColor: colors.backgroundSecondary }]} onPress={goBack} activeOpacity={0.8}>
                <Ionicons name="arrow-back" size={18} color={colors.textSecondary} />
                <Text style={[styles.backBtnText, { color: colors.textSecondary }]}>{T.actions.back}</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={[styles.nextBtn, { backgroundColor: colors.primary }, isPending && styles.nextBtnDisabled]}
              onPress={isLastStep ? handleSubmit : goNext}
              disabled={isPending}
              activeOpacity={0.8}
            >
              {isPending ? (
                <ActivityIndicator size="small" color={colors.buttonText} />
              ) : (
                <>
                  <Text style={[styles.nextBtnText, { color: colors.buttonText }]}>
                    {isLastStep ? (isEdit ? T.actions.save : T.actions.create) : T.actions.next}
                  </Text>
                  {!isLastStep && <Ionicons name="arrow-forward" size={18} color={colors.buttonText} />}
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  stepsRow: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  stepItem: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
  },
  stepItemActive: {},
  stepItemPassed: {},
  stepDot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepDotText: { fontSize: 12, fontWeight: '700' },
  stepLabel: { fontSize: 10, fontWeight: '600' },

  scroll: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 100 },

  stepContent: {},
  stepTitle: { fontSize: 18, fontWeight: '700', marginBottom: 4 },
  stepDesc: { fontSize: 14, fontWeight: '600', marginBottom: 16 },
  selectedCount: { fontSize: 13, fontWeight: '700', marginBottom: 12 },

  inputLabel: { fontSize: 13, fontWeight: '700', marginBottom: 6, marginTop: 16 },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    fontSize: 15,
    fontWeight: '600',
  },
  inputMultiline: { minHeight: 100, textAlignVertical: 'top' },

  row: { flexDirection: 'row', gap: 12 },
  col: { flex: 1 },

  chipsScroll: { marginTop: 8 },
  chipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  chipText: { fontSize: 13, fontWeight: '700' },

  emptyBlock: { alignItems: 'center', paddingVertical: 32 },
  emptyText: { fontSize: 14, fontWeight: '700', marginTop: 12 },

  listBlock: { gap: 10 },
  selectableCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
  },
  selectableCardContent: { flex: 1 },
  selectableCardTitle: { fontSize: 15, fontWeight: '700' },
  selectableCardMeta: { fontSize: 13, fontWeight: '600', marginTop: 2 },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },

  memberAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  memberAvatarText: { fontSize: 16, fontWeight: '700' },

  scheduleList: { gap: 8, marginTop: 16 },
  scheduleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 10,
    padding: 12,
  },
  scheduleDayCol: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  scheduleDayText: { fontSize: 14, fontWeight: '600' },
  scheduleTimeCol: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  timeInput: {
    width: 60,
    borderWidth: 1,
    borderRadius: 8,
    padding: 8,
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
  },
  timeSeparator: { fontSize: 14, fontWeight: '600' },

  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
    borderTopWidth: 1,
  },
  footerButtons: { flexDirection: 'row', gap: 12 },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
  },
  backBtnText: { fontSize: 15, fontWeight: '700' },
  nextBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 12,
    paddingVertical: 14,
  },
  nextBtnDisabled: { opacity: 0.6 },
  nextBtnText: { fontSize: 15, fontWeight: '700' },
});
