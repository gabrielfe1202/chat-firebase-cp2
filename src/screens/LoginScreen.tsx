import { useCallback, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { ErrorMessage } from '../components/ErrorMessage';
import { FormInput } from '../components/FormInput';
import { PrimaryButton } from '../components/PrimaryButton';
import { useAuth } from '../hooks/useAuth';
import { colors } from '../theme';
import type { RootScreenProps } from '../types/navigation';
import { getErrorMessage } from '../utils/authErrors';
import { validateEmail } from '../utils/validation';

export function LoginScreen({ navigation }: RootScreenProps<'Login'>) {
  const { signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = useCallback(async () => {
    const emailCheck = validateEmail(email);
    if (!emailCheck.ok) return setError(emailCheck.message);
    if (password.length === 0) return setError('Informe a senha.');

    setError(null);
    setLoading(true);
    try {
      await signIn({ email, password });
    } catch (e) {
      setError(getErrorMessage(e));
    } finally {
      setLoading(false);
    }
  }, [email, password, signIn]);

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>Chat</Text>
        <Text style={styles.subtitle}>Entre com seu e-mail e senha</Text>

        <View style={styles.form}>
          <FormInput
            label="E-mail"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
            placeholder="voce@exemplo.com"
          />
          <FormInput
            label="Senha"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoCapitalize="none"
            autoComplete="password"
            placeholder="Sua senha"
          />
          <ErrorMessage message={error} />
          <PrimaryButton title="Entrar" onPress={handleLogin} loading={loading} />
          <PrimaryButton
            title="Criar conta"
            variant="link"
            onPress={() => navigation.navigate('Register')}
            disabled={loading}
          />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.background },
  content: { flexGrow: 1, justifyContent: 'center', padding: 24, gap: 8 },
  title: { fontSize: 32, fontWeight: '800', color: colors.primary, textAlign: 'center' },
  subtitle: { color: colors.textMuted, textAlign: 'center', marginBottom: 16 },
  form: { gap: 14 },
});
