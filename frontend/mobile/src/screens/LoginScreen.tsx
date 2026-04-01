import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { RootStackParamList } from '../navigation/RootNavigator';
import { ScreenContainer } from '../components/ScreenContainer';
import { useAuth } from '../contexts/AuthContext';
import { isBusinessAppRole } from '../constants/roles';

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
  input: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
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
  registerLink: {
    marginTop: 24,
    alignItems: 'center',
  },
  registerLinkText: {
    fontSize: 14,
  },
  registerLinkButton: {
    marginTop: 4,
  },
  registerLinkButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
});

export const LoginScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const { login: authLogin } = useAuth();
  const { colors } = useTheme();
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [focusedInput, setFocusedInput] = useState<string | null>(null);

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};
    
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
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleLogin = async () => {
    if (!validateForm()) {
      return;
    }

    setIsLoading(true);
    try {
      const result = await authLogin({ email: email.trim(), password });

      if (result.success && result.user) {
        const rootRoute = isBusinessAppRole(result.user.role) ? 'BusinessMain' : 'MainTabs';
        navigation.reset({
          index: 0,
          routes: [{ name: rootRoute }],
        });
      } else {
        Alert.alert('Ошибка входа', 'Неверный email или пароль');
      }
    } catch (error: any) {
      console.error('Login error:', error);
      Alert.alert('Ошибка', error.response?.data?.message || 'Не удалось войти. Попробуйте позже.');
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
            <Text style={[styles.title, { color: colors.text }]}>Вход</Text>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>Войдите в свой аккаунт</Text>
          </View>

          <View style={styles.form}>
            <View style={styles.inputContainer}>
              <Text style={[styles.inputLabel, { color: colors.text }]}>Email</Text>
              <View
                style={[
                  styles.inputWithIcon,
                  { backgroundColor: colors.inputBackground, borderColor: colors.inputBorder },
                  focusedInput === 'email' && { borderColor: colors.inputFocusBorder },
                ]}
              >
                <Ionicons
                  name="mail-outline"
                  size={20}
                  color={focusedInput === 'email' ? colors.textSecondary : colors.textMuted}
                  style={styles.inputIcon}
                />
                <TextInput
                  style={[styles.inputText, { color: colors.text }]}
                  placeholder="your@email.com"
                  placeholderTextColor={colors.textMuted}
                  selectionColor={colors.selectionColor}
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
              <Text style={[styles.inputLabel, { color: colors.text }]}>Пароль</Text>
              <View
                style={[
                  styles.inputWithIcon,
                  { backgroundColor: colors.inputBackground, borderColor: colors.inputBorder },
                  focusedInput === 'password' && { borderColor: colors.inputFocusBorder },
                ]}
              >
                <Ionicons
                  name="lock-closed-outline"
                  size={20}
                  color={focusedInput === 'password' ? colors.textSecondary : colors.textMuted}
                  style={styles.inputIcon}
                />
                <TextInput
                  style={[styles.inputText, { color: colors.text }]}
                  placeholder="Введите пароль"
                  placeholderTextColor={colors.textMuted}
                  selectionColor={colors.selectionColor}
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

            <TouchableOpacity
              onPress={handleLogin}
              disabled={isLoading}
              style={[
                styles.submitButton,
                { backgroundColor: colors.primary, shadowColor: colors.primary },
                isLoading && [styles.submitButtonDisabled, { backgroundColor: colors.textMuted }],
              ]}
            >
              <Text style={[styles.submitButtonText, { color: colors.buttonText }]}>
                {isLoading ? 'Вход...' : 'Войти'}
              </Text>
            </TouchableOpacity>

            <View style={styles.registerLink}>
              <Text style={[styles.registerLinkText, { color: colors.textSecondary }]}>Нет аккаунта?</Text>
              <TouchableOpacity
                onPress={() => navigation.navigate('Register' as any)}
                style={styles.registerLinkButton}
              >
                <Text style={[styles.registerLinkButtonText, { color: colors.primary }]}>Зарегистрироваться</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </ScreenContainer>
  );
};

