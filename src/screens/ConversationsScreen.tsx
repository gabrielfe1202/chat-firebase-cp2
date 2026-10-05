import { useCallback, useLayoutEffect } from 'react';
import { Alert, FlatList, StyleSheet, Text, View } from 'react-native';
import { ConversationItem } from '../components/ConversationItem';
import { ErrorMessage } from '../components/ErrorMessage';
import { Loading } from '../components/Loading';
import { PrimaryButton } from '../components/PrimaryButton';
import { useAuth } from '../hooks/useAuth';
import { useConversations } from '../hooks/useConversations';
import { useUsers } from '../hooks/useUsers';
import { colors } from '../theme';
import type { ConversationSummary } from '../types/chat';
import type { RootScreenProps } from '../types/navigation';
import { getErrorMessage } from '../utils/authErrors';

export function ConversationsScreen({ navigation }: RootScreenProps<'Conversations'>) {
  const { profile, signOut } = useAuth();
  const myUid = profile?.uid ?? '';
  const { byUid } = useUsers();
  const { conversations, loading, error } = useConversations(myUid, byUid);

  const handleLogout = useCallback(async () => {
    try {
      await signOut();
    } catch (e) {
      Alert.alert('Não foi possível sair', getErrorMessage(e));
    }
  }, [signOut]);

  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <View style={styles.headerActions}>
          <PrimaryButton
            title="Perfil"
            variant="link"
            onPress={() => navigation.navigate('Profile', { uid: myUid })}
          />
          <PrimaryButton title="Sair" variant="link" onPress={handleLogout} />
        </View>
      ),
    });
  }, [handleLogout, myUid, navigation]);

  const handleOpen = useCallback(
    (conversation: ConversationSummary) =>
      navigation.navigate('Chat', { conversationId: conversation.id, conversationType: conversation.type }),
    [navigation],
  );

  const renderItem = useCallback(
    ({ item }: { item: ConversationSummary }) => <ConversationItem conversation={item} onPress={handleOpen} />,
    [handleOpen],
  );

  if (loading) return <Loading message="Carregando conversas..." />;

  return (
    <View style={styles.container}>
      <View style={styles.messages}>
        <ErrorMessage message={error} />
      </View>
      <FlatList
        data={conversations}
        keyExtractor={(item) => `${item.type}:${item.id}`}
        renderItem={renderItem}
        contentContainerStyle={conversations.length === 0 ? styles.emptyContainer : undefined}
        ListEmptyComponent={
          <Text style={styles.empty}>Você ainda não tem conversas. Toque em "Nova conversa" para começar.</Text>
        }
      />
      <View style={styles.footer}>
        <PrimaryButton title="Nova conversa" onPress={() => navigation.navigate('Users', { mode: 'direct' })} />
        <PrimaryButton title="Novo grupo" variant="link" onPress={() => navigation.navigate('GroupForm', {})} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  headerActions: { flexDirection: 'row' },
  messages: { paddingHorizontal: 16 },
  emptyContainer: { flexGrow: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  empty: { color: colors.textMuted, textAlign: 'center' },
  footer: { padding: 16, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
});
