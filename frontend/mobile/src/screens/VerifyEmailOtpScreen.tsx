import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/RootNavigator';
import { ScreenContainer } from '../components/ScreenContainer';
import { useThemedStyles } from '../hooks/useThemedStyles';
import { verifyEmailCode, resendEmailCode } from '../api/auth';
import { useAuth } from '../contexts/AuthContext';
import { isBusinessAppRole } from '../constants/roles';

type Nav = NativeStackNavigationProp<RootStackParamList, 'VerifyEmailOtp'>;
type R = RouteProp<RootStackParamList, 'VerifyEmailOtp'>;

export function VerifyEmailOtpScreen() {
  const { colors, container, pageTitle, textSecondary, input, primaryButton, primaryButtonText } =
    useThemedStyles();
  const navigation = useNavigation<Nav>();
  const route = useRoute<R>();
  const { completeSession } = useAuth();
  const email = route.params?.email ?? '';

  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [resendSec, setResendSec] = useState(0);

  useEffect(() => {
    if (resendSec <= 0) return undefined;
    const t = setInterval(() => setResendSec((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(t);
  }, [resendSec]);

  const digits = useCallback((v: string) => v.replace(/\D/g, '').slice(0, 6), []);

  const onVerify = async () => {
    const c = digits(code);
    if (!email.trim()) {
      Alert.alert('Ошибка', 'Нет email. Вернитесь к регистрации.');
      return;
    }
    if (c.length !== 6) {
      Alert.alert('Ошибка', 'Введите 6 цифр кода');
      return;
    }
    setBusy(true);
    try {
      const res = await verifyEmailCode({ email: email.trim(), code: c });
      if (res.success && res.data?.user) {
        completeSession(res.data.user);
        const root = isBusinessAppRole(res.data.user.role) ? 'BusinessMain' : 'MainTabs';
        navigation.reset({ index: 0, routes: [{ name: root }] });
      } else {
        Alert.alert('Ошибка', res.message || 'Неверный код');
      }
    } finally {
      setBusy(false);
    }
  };

  const onResend = async () => {
    if (!email.trim()) return;
    setBusy(true);
    try {
      const r = await resendEmailCode({ email: email.trim() });
      if (r.success) {
        setResendSec(60);
        Alert.alert('Готово', 'Если аккаунт существует, мы отправили новый код.');
      } else {
        const w = r.waitSeconds && r.waitSeconds > 0 ? r.waitSeconds : 60;
        setResendSec(w);
        Alert.alert('Подождите', r.message || 'Повторная отправка позже');
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <ScreenContainer edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        style={[styles.wrap, { backgroundColor: colors.background }]}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <View style={[container, { paddingHorizontal: 0 }]}>
            <Text style={[pageTitle, { marginBottom: 8 }]}>Подтверждение email</Text>
            <Text style={[textSecondary, { marginBottom: 20 }]}>
              Введите 6-значный код из письма, отправленного на {email || 'ваш email'}.
            </Text>

            <Text style={[textSecondary, { marginBottom: 6 }]}>Код</Text>
            <TextInput
              style={[input, styles.codeInput]}
              value={code}
              onChangeText={(t) => setCode(digits(t))}
              keyboardType="number-pad"
              maxLength={6}
              placeholder="000000"
              placeholderTextColor={colors.textMuted}
              autoComplete="one-time-code"
            />

            <TouchableOpacity
              style={[primaryButton, { marginTop: 20, opacity: busy ? 0.6 : 1 }]}
              onPress={onVerify}
              disabled={busy}
            >
              <Text style={primaryButtonText}>{busy ? 'Проверка…' : 'Подтвердить'}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={{ marginTop: 16, opacity: busy || resendSec > 0 ? 0.5 : 1 }}
              onPress={onResend}
              disabled={busy || resendSec > 0}
            >
              <Text style={[textSecondary, { textAlign: 'center', color: colors.primary }]}>
                {resendSec > 0 ? `Отправить снова через ${resendSec} с` : 'Отправить код снова'}
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1 },
  scroll: { flexGrow: 1, padding: 24, justifyContent: 'center' },
  codeInput: {
    fontSize: 22,
    fontWeight: '700',
    letterSpacing: 6,
    textAlign: 'center',
    paddingVertical: 14,
  },
});
