import { useCallback, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Avatar } from '../components/Avatar';
import { ErrorMessage } from '../components/ErrorMessage';
import { PrimaryButton } from '../components/PrimaryButton';
import { useAuth } from '../hooks/useAuth';
import { colors } from '../theme';
import type { RootScreenProps } from '../types/navigation';
import { getErrorMessage } from '../utils/authErrors';

/** Versão provisória (Fase 2): mostra o usuário logado e permite sair. A lista real vem na Fase 4. */
export function ConversationsScreen({ navigation }: RootScreenProps<'Conversations'>) {
  const { profile, signOut } = useAuth();
  const [error, setError] = useState<string | null>(null);

  const handleLogout = useCallback(async () => {
    try {
      await signOut();
    } catch (e) {
      setError(getErrorMessage(e));
    }
  }, [signOut]);

  return (
    <View style={styles.container}>
      <Avatar uri={profile?.photoUrl} name={profile?.name} size={80} />
      <Text style={styles.name}>{profile?.name}</Text>
      <Text style={styles.email}>{profile?.email}</Text>
      <Text style={styles.empty}>Nenhuma conversa ainda.</Text>
      <ErrorMessage message={error} />
      <PrimaryButton title="Nova conversa" onPress={() => navigation.navigate('Users', { mode: 'direct' })} />
      <PrimaryButton title="Meu perfil" variant="link" onPress={() => profile && navigation.navigate('Profile', { uid: profile.uid })} />
      <PrimaryButton title="Sair" variant="link" onPress={handleLogout} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 10, backgroundColor: colors.background },
  name: { fontSize: 20, fontWeight: '700', color: colors.text },
  email: { color: colors.textMuted },
  empty: { color: colors.textMuted, marginVertical: 12 },
});
