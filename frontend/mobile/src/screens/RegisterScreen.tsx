import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { RootStackParamList } from '../navigation/RootNavigator';
import { ScreenContainer } from '../components/ScreenContainer';
import { register } from '../api/auth';
import { useAuth } from '../contexts/AuthContext';

import { useTheme } from '../contexts/ThemeContext';
type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 24,
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
  },
  form: {
    width: '100%',
  },
  inputContainer: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 8,
  },
  inputWithIcon: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
  },
  inputIcon: {
    marginRight: 12,
  },
  inputText: {
    flex: 1,
    paddingVertical: 14,
    fontSize: 16,
  },
  passwordToggle: {
    padding: 4,
  },
  errorText: {
    fontSize: 12,
    marginTop: 4,
  },
  submitButton: {
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
  loginLink: {
    marginTop: 24,
    alignItems: 'center',
  },
  loginLinkText: {
    fontSize: 14,
  },
  loginLinkButton: {
    marginTop: 4,
  },
  loginLinkButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
});

export const RegisterScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const { completeSession } = useAuth();
  const { colors } = useTheme();
  
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirmation, setPasswordConfirmation] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showPasswordConfirmation, setShowPasswordConfirmation] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [focusedInput, setFocusedInput] = useState<string | null>(null);

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};
    
    if (!firstName.trim()) {
      newErrors.firstName = 'Введите имя';
    }
    
    if (!lastName.trim()) {
      newErrors.lastName = 'Введите фамилию';
    }
    
    if (!email.trim()) {
      newErrors.email = 'Введите email';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      newErrors.email = 'Некорректный email';
    }
    
    if (!password.trim()) {
      newErrors.password = 'Введите пароль';
    } else if (password.length < 6) {
      newErrors.password = 'Пароль должен быть не менее 6 символов';
    }
    
    if (password !== passwordConfirmation) {
      newErrors.passwordConfirmation = 'Пароли не совпадают';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleRegister = async () => {
    if (!validateForm()) {
      return;
    }

    setIsLoading(true);
    try {
      const result = await register({
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        email: email.trim(),
        password,
        password_confirmation: passwordConfirmation,
        role: 'CLIENT',
        phone: phone.trim() || undefined,
      });
      
      if (result.success && result.data?.user) {
        completeSession(result.data.user);
        navigation.reset({
          index: 0,
          routes: [{ name: 'MainTabs' }],
        });
      } else {
        Alert.alert('Ошибка регистрации', result.message || 'Не удалось зарегистрироваться');
      }
    } catch (error: any) {
      console.error('Register error:', error);
      Alert.alert('Ошибка', 'Не удалось зарегистрироваться. Попробуйте позже.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <ScreenContainer edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        style={[styles.container, { backgroundColor: colors.background }]}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <View style={[styles.header, { backgroundColor: colors.background }]}>
            <Text style={[styles.title, { color: colors.text }]}>Регистрация</Text>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>Создайте новый аккаунт</Text>
          </View>

          <View style={styles.form}>
            <View style={styles.inputContainer}>
              <Text style={[styles.inputLabel, { color: colors.text }]}>Имя</Text>
              <View
                style={[
                  styles.inputWithIcon,
                  { backgroundColor: colors.inputBackground, borderColor: colors.inputBorder },
                  focusedInput === 'firstName' && { borderColor: colors.primary },
                ]}
              >
                <Ionicons
                  name="person-outline"
                  size={20}
                  color={focusedInput === 'firstName' ? colors.primary : colors.textMuted}
                  style={styles.inputIcon}
                />
                <TextInput
                  style={[styles.inputText, { color: colors.text }]}
                  placeholder="Имя"
                  placeholderTextColor={colors.textMuted}
                  value={firstName}
                  onChangeText={(text) => {
                    setFirstName(text);
                    if (errors.firstName) {
                      setErrors({ ...errors, firstName: '' });
                    }
                  }}
                  onFocus={() => setFocusedInput('firstName')}
                  onBlur={() => setFocusedInput(null)}
                  autoCapitalize="words"
                />
              </View>
              {errors.firstName && <Text style={[styles.errorText, { color: colors.error }]}>{errors.firstName}</Text>}
            </View>

            <View style={styles.inputContainer}>
              <Text style={[styles.inputLabel, { color: colors.text }]}>Фамилия</Text>
              <View
                style={[
                  styles.inputWithIcon,
                  { backgroundColor: colors.inputBackground, borderColor: colors.inputBorder },
                  focusedInput === 'lastName' && { borderColor: colors.primary },
                ]}
              >
                <Ionicons
                  name="person-outline"
                  size={20}
                  color={focusedInput === 'lastName' ? colors.primary : colors.textMuted}
                  style={styles.inputIcon}
                />
                <TextInput
                  style={[styles.inputText, { color: colors.text }]}
                  placeholder="Фамилия"
                  placeholderTextColor={colors.textMuted}
                  value={lastName}
                  onChangeText={(text) => {
                    setLastName(text);
                    if (errors.lastName) {
                      setErrors({ ...errors, lastName: '' });
                    }
                  }}
                  onFocus={() => setFocusedInput('lastName')}
                  onBlur={() => setFocusedInput(null)}
                  autoCapitalize="words"
                />
              </View>
              {errors.lastName && <Text style={[styles.errorText, { color: colors.error }]}>{errors.lastName}</Text>}
            </View>

            <View style={styles.inputContainer}>
              <Text style={[styles.inputLabel, { color: colors.text }]}>Email</Text>
              <View
                style={[
                  styles.inputWithIcon,
                  { backgroundColor: colors.inputBackground, borderColor: colors.inputBorder },
                  focusedInput === 'email' && { borderColor: colors.primary },
                ]}
              >
                <Ionicons
                  name="mail-outline"
                  size={20}
                  color={focusedInput === 'email' ? colors.primary : colors.textMuted}
                  style={styles.inputIcon}
                />
                <TextInput
                  style={[styles.inputText, { color: colors.text }]}
                  placeholder="your@email.com"
                  placeholderTextColor={colors.textMuted}
                  value={email}
                  onChangeText={(text) => {
                    setEmail(text);
                    if (errors.email) {
                      setErrors({ ...errors, email: '' });
                    }
                  }}
                  onFocus={() => setFocusedInput('email')}
                  onBlur={() => setFocusedInput(null)}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </View>
              {errors.email && <Text style={[styles.errorText, { color: colors.error }]}>{errors.email}</Text>}
            </View>

            <View style={styles.inputContainer}>
              <Text style={[styles.inputLabel, { color: colors.text }]}>Телефон (необязательно)</Text>
              <View
                style={[
                  styles.inputWithIcon,
                  { backgroundColor: colors.inputBackground, borderColor: colors.inputBorder },
                  focusedInput === 'phone' && { borderColor: colors.primary },
                ]}
              >
                <Ionicons
                  name="call-outline"
                  size={20}
                  color={focusedInput === 'phone' ? colors.primary : colors.textMuted}
                  style={styles.inputIcon}
                />
                <TextInput
                  style={[styles.inputText, { color: colors.text }]}
                  placeholder="+1 (555) 123-4567"
                  placeholderTextColor={colors.textMuted}
                  value={phone}
                  onChangeText={setPhone}
                  onFocus={() => setFocusedInput('phone')}
                  onBlur={() => setFocusedInput(null)}
                  keyboardType="phone-pad"
                />
              </View>
            </View>

            <View style={styles.inputContainer}>
              <Text style={[styles.inputLabel, { color: colors.text }]}>Пароль</Text>
              <View
                style={[
                  styles.inputWithIcon,
                  { backgroundColor: colors.inputBackground, borderColor: colors.inputBorder },
                  focusedInput === 'password' && { borderColor: colors.primary },
                ]}
              >
                <Ionicons
                  name="lock-closed-outline"
                  size={20}
                  color={focusedInput === 'password' ? colors.primary : colors.textMuted}
                  style={styles.inputIcon}
                />
                <TextInput
                  style={[styles.inputText, { color: colors.text }]}
                  placeholder="Минимум 6 символов"
                  placeholderTextColor={colors.textMuted}
                  value={password}
                  onChangeText={(text) => {
                    setPassword(text);
                    if (errors.password) {
                      setErrors({ ...errors, password: '' });
                    }
                  }}
                  onFocus={() => setFocusedInput('password')}
                  onBlur={() => setFocusedInput(null)}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
                <TouchableOpacity
                  onPress={() => setShowPassword(!showPassword)}
                  style={styles.passwordToggle}
                >
                  <Ionicons
                    name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                    size={20}
                    color={colors.textMuted}
                  />
                </TouchableOpacity>
              </View>
              {errors.password && <Text style={[styles.errorText, { color: colors.error }]}>{errors.password}</Text>}
            </View>

            <View style={styles.inputContainer}>
              <Text style={[styles.inputLabel, { color: colors.text }]}>Подтвердите пароль</Text>
              <View
                style={[
                  styles.inputWithIcon,
                  { backgroundColor: colors.inputBackground, borderColor: colors.inputBorder },
                  focusedInput === 'passwordConfirmation' && { borderColor: colors.primary },
                ]}
              >
                <Ionicons
                  name="lock-closed-outline"
                  size={20}
                  color={focusedInput === 'passwordConfirmation' ? colors.primary : colors.textMuted}
                  style={styles.inputIcon}
                />
                <TextInput
                  style={[styles.inputText, { color: colors.text }]}
                  placeholder="Повторите пароль"
                  placeholderTextColor={colors.textMuted}
                  value={passwordConfirmation}
                  onChangeText={(text) => {
                    setPasswordConfirmation(text);
                    if (errors.passwordConfirmation) {
                      setErrors({ ...errors, passwordConfirmation: '' });
                    }
                  }}
                  onFocus={() => setFocusedInput('passwordConfirmation')}
                  onBlur={() => setFocusedInput(null)}
                  secureTextEntry={!showPasswordConfirmation}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
                <TouchableOpacity
                  onPress={() => setShowPasswordConfirmation(!showPasswordConfirmation)}
                  style={styles.passwordToggle}
                >
                  <Ionicons
                    name={showPasswordConfirmation ? 'eye-off-outline' : 'eye-outline'}
                    size={20}
                    color={colors.textMuted}
                  />
                </TouchableOpacity>
              </View>
              {errors.passwordConfirmation && <Text style={[styles.errorText, { color: colors.error }]}>{errors.passwordConfirmation}</Text>}
            </View>

            <TouchableOpacity
              onPress={handleRegister}
              disabled={isLoading}
              style={[
                styles.submitButton,
                { backgroundColor: colors.primary, shadowColor: colors.primary },
                isLoading && [styles.submitButtonDisabled, { backgroundColor: colors.textMuted }],
              ]}
            >
              <Text style={[styles.submitButtonText, { color: colors.buttonText }]}>
                {isLoading ? 'Регистрация...' : 'Зарегистрироваться'}
              </Text>
            </TouchableOpacity>

            <View style={styles.loginLink}>
              <Text style={[styles.loginLinkText, { color: colors.textSecondary }]}>Уже есть аккаунт?</Text>
              <TouchableOpacity
                onPress={() => navigation.goBack()}
                style={styles.loginLinkButton}
              >
                <Text style={[styles.loginLinkButtonText, { color: colors.primary }]}>Войти</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </ScreenContainer>
  );
};

