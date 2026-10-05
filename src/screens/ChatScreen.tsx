import { useEffect, useLayoutEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Avatar } from '../components/Avatar';
import { useAuth } from '../hooks/useAuth';
import { getPublicProfile } from '../services/userService';
import { colors } from '../theme';
import type { RootScreenProps } from '../types/navigation';
import type { PublicProfile } from '../types/user';
import { getOtherUidFromDirectId } from '../utils/conversationId';

/**
 * Versão provisória (Fase 3): só o cabeçalho com a foto tocável que abre o perfil.
 * A lista de mensagens, o envio e o tempo real entram na Fase 4.
 */
export function ChatScreen({ navigation, route }: RootScreenProps<'Chat'>) {
  const { conversationId, conversationType } = route.params;
  const { profile } = useAuth();
  const [other, setOther] = useState<PublicProfile | null>(null);

  const otherUid =
    conversationType === 'direct' && profile ? getOtherUidFromDirectId(conversationId, profile.uid) : null;

  useEffect(() => {
    if (!otherUid) return undefined;
    let active = true;
    getPublicProfile(otherUid)
      .then((result) => active && setOther(result))
      .catch(() => active && setOther(null));
    return () => {
      active = false;
    };
  }, [otherUid]);

  useLayoutEffect(() => {
    navigation.setOptions({
      headerTitle: () => (
        <Pressable
          style={styles.header}
          disabled={!otherUid}
          onPress={() => otherUid && navigation.navigate('Profile', { uid: otherUid })}
          accessibilityRole="button"
          accessibilityLabel="Abrir perfil"
        >
          <Avatar uri={other?.photoUrl} name={other?.name} size={36} />
          <Text style={styles.title}>{other?.name ?? 'Conversa'}</Text>
        </Pressable>
      ),
    });
  }, [navigation, other, otherUid]);

  return (
    <View style={styles.container}>
      <Text style={styles.placeholder}>As mensagens aparecem aqui (Fase 4).</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background },
  header: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  title: { fontSize: 17, fontWeight: '600', color: colors.text },
  placeholder: { color: colors.textMuted },
});
