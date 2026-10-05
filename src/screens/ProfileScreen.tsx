import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { Avatar } from '../components/Avatar';
import { ErrorMessage } from '../components/ErrorMessage';
import { Loading } from '../components/Loading';
import { getUserProfile } from '../services/userService';
import { colors } from '../theme';
import type { RootScreenProps } from '../types/navigation';
import type { ChatUser } from '../types/user';
import { getErrorMessage } from '../utils/authErrors';
import { formatBirthDate, maskPhone } from '../utils/validation';

type ProfileState =
  | { status: 'loading' }
  | { status: 'ready'; user: ChatUser }
  | { status: 'unavailable' }
  | { status: 'error'; message: string };

const NOT_INFORMED = 'Não informado';

type FieldProps = { label: string; value: string };

function Field({ label, value }: FieldProps) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value}>{value || NOT_INFORMED}</Text>
    </View>
  );
}

export function ProfileScreen({ route }: RootScreenProps<'Profile'>) {
  const { uid } = route.params;
  const [state, setState] = useState<ProfileState>({ status: 'loading' });

  useEffect(() => {
    let active = true;
    setState({ status: 'loading' });

    getUserProfile(uid)
      .then((user) => {
        if (!active) return;
        setState(user ? { status: 'ready', user } : { status: 'unavailable' });
      })
      .catch((error: unknown) => {
        if (!active) return;
        const code = typeof error === 'object' && error !== null && 'code' in error ? String(error.code) : '';
        // As regras só liberam o perfil completo a quem compartilha conversa ou grupo.
        setState(code === 'permission-denied' ? { status: 'unavailable' } : { status: 'error', message: getErrorMessage(error) });
      });

    return () => {
      active = false;
    };
  }, [uid]);

  if (state.status === 'loading') return <Loading message="Carregando perfil..." />;

  if (state.status === 'error') {
    return (
      <View style={styles.center}>
        <ErrorMessage message={state.message} />
      </View>
    );
  }

  if (state.status === 'unavailable') {
    return (
      <View style={styles.center}>
        <Avatar size={96} />
        <Text style={styles.unavailable}>
          Perfil indisponível. Você só pode ver os dados de quem compartilha uma conversa ou um grupo com você.
        </Text>
      </View>
    );
  }

  const { user } = state;
  return (
    <ScrollView contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Avatar uri={user.photoUrl} name={user.name} size={112} />
        <Text style={styles.name}>{user.name || 'Usuário sem nome'}</Text>
      </View>
      <Field label="E-mail" value={user.email} />
      <Field label="Celular" value={user.phoneNumber ? maskPhone(user.phoneNumber) : ''} />
      <Field label="Data de nascimento" value={user.birthDate ? formatBirthDate(user.birthDate) : ''} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: 24, gap: 16, backgroundColor: colors.background, flexGrow: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 16, backgroundColor: colors.background },
  header: { alignItems: 'center', gap: 12, marginBottom: 8 },
  name: { fontSize: 22, fontWeight: '700', color: colors.text },
  field: { gap: 2, paddingBottom: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
  label: { color: colors.textMuted, fontSize: 12 },
  value: { color: colors.text, fontSize: 16 },
  unavailable: { color: colors.textMuted, textAlign: 'center' },
});
