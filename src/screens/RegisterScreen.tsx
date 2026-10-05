import { useCallback, useMemo, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Avatar } from '../components/Avatar';
import { ErrorMessage } from '../components/ErrorMessage';
import { FormInput } from '../components/FormInput';
import { PrimaryButton } from '../components/PrimaryButton';
import { useAuth } from '../hooks/useAuth';
import { pickImage } from '../services/imageService';
import { colors } from '../theme';
import type { RootScreenProps } from '../types/navigation';
import { getErrorMessage } from '../utils/authErrors';
import type { ValidationResult } from '../utils/groupValidation';
import {
  MAX_NAME_LENGTH,
  maskBirthDate,
  maskPhone,
  validateBirthDate,
  validateEmail,
  validateName,
  validatePassword,
  validatePasswordConfirmation,
  validatePhone,
} from '../utils/validation';

type FormState = {
  name: string;
  email: string;
  password: string;
  confirmation: string;
  phone: string;
  birthDate: string;
};

type FormErrors = Partial<Record<keyof FormState, string>>;

const INITIAL_FORM: FormState = {
  name: '',
  email: '',
  password: '',
  confirmation: '',
  phone: '',
  birthDate: '',
};

const messageOf = (result: ValidationResult): string | undefined => (result.ok ? undefined : result.message);

export function RegisterScreen({ navigation }: RootScreenProps<'Register'>) {
  const { signUp } = useAuth();
  const [form, setForm] = useState<FormState>(INITIAL_FORM);
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const errors = useMemo<FormErrors>(
    () => ({
      name: messageOf(validateName(form.name)),
      email: messageOf(validateEmail(form.email)),
      password: messageOf(validatePassword(form.password)),
      confirmation: messageOf(validatePasswordConfirmation(form.password, form.confirmation)),
      phone: messageOf(validatePhone(form.phone)),
      birthDate: messageOf(validateBirthDate(form.birthDate)),
    }),
    [form],
  );
  const hasErrors = useMemo(() => Object.values(errors).some(Boolean), [errors]);
  const visibleError = (field: keyof FormState): string | undefined => (submitted ? errors[field] : undefined);

  const setField = useCallback(
    (field: keyof FormState, transform?: (value: string) => string) => (value: string) =>
      setForm((current) => ({ ...current, [field]: transform ? transform(value) : value })),
    [],
  );

  const handlePickPhoto = useCallback(async () => {
    try {
      const uri = await pickImage();
      if (uri) setPhotoUri(uri);
    } catch (e) {
      setError(getErrorMessage(e));
    }
  }, []);

  const handleRegister = useCallback(async () => {
    setSubmitted(true);
    setError(null);
    if (hasErrors) return;

    setLoading(true);
    try {
      await signUp({
        name: form.name,
        email: form.email,
        password: form.password,
        phoneNumber: form.phone,
        birthDate: form.birthDate,
        photoUri,
      });
    } catch (e) {
      setError(getErrorMessage(e));
    } finally {
      setLoading(false);
    }
  }, [form, hasErrors, photoUri, signUp]);

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Pressable style={styles.photo} onPress={handlePickPhoto} disabled={loading} accessibilityRole="button">
          <Avatar uri={photoUri} name={form.name} size={96} />
          <Text style={styles.photoLabel}>{photoUri ? 'Trocar foto' : 'Escolher foto de perfil'}</Text>
        </Pressable>

        <View style={styles.form}>
          <FormInput label="Nome" value={form.name} onChangeText={setField('name')} autoComplete="name" maxLength={MAX_NAME_LENGTH} error={visibleError('name')} />
          <FormInput
            label="E-mail"
            value={form.email}
            onChangeText={setField('email')}
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
            error={visibleError('email')}
          />
          <FormInput
            label="Celular"
            value={form.phone}
            onChangeText={setField('phone', maskPhone)}
            keyboardType="phone-pad"
            placeholder="(11) 99999-9999"
            error={visibleError('phone')}
          />
          <FormInput
            label="Data de nascimento"
            value={form.birthDate}
            onChangeText={setField('birthDate', maskBirthDate)}
            keyboardType="number-pad"
            placeholder="DD/MM/AAAA"
            error={visibleError('birthDate')}
          />
          <FormInput
            label="Senha"
            value={form.password}
            onChangeText={setField('password')}
            secureTextEntry
            autoCapitalize="none"
            error={visibleError('password')}
          />
          <FormInput
            label="Confirmar senha"
            value={form.confirmation}
            onChangeText={setField('confirmation')}
            secureTextEntry
            autoCapitalize="none"
            error={visibleError('confirmation')}
          />
          <ErrorMessage message={error} />
          <PrimaryButton title="Criar conta" onPress={handleRegister} loading={loading} />
          <PrimaryButton title="Já tenho conta" variant="link" onPress={() => navigation.goBack()} disabled={loading} />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.background },
  content: { padding: 24, gap: 16 },
  photo: { alignItems: 'center', gap: 8 },
  photoLabel: { color: colors.primary, fontWeight: '600' },
  form: { gap: 14 },
});
