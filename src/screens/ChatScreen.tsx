import { useCallback, useLayoutEffect, useMemo, useState } from 'react';
import { FlatList, KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { Avatar } from '../components/Avatar';
import { ChatInput } from '../components/ChatInput';
import { ChatMessageItem } from '../components/ChatMessage';
import { ErrorMessage } from '../components/ErrorMessage';
import { Loading } from '../components/Loading';
import { OfflineBanner } from '../components/OfflineBanner';
import { RecipientPicker } from '../components/RecipientPicker';
import { useAuth } from '../hooks/useAuth';
import { useChat } from '../hooks/useChat';
import { useConversation } from '../hooks/useConversation';
import { useUsers } from '../hooks/useUsers';
import { colors } from '../theme';
import type { ChatMessage, MessageTarget } from '../types/chat';
import type { RootScreenProps } from '../types/navigation';
import type { PublicProfile } from '../types/user';

const UNKNOWN_USER = 'Usuário';

export function ChatScreen({ navigation, route }: RootScreenProps<'Chat'>) {
  const { conversationId, conversationType } = route.params;
  const { profile } = useAuth();
  const myUid = profile?.uid ?? '';
  const isGroup = conversationType === 'group';

  const { byUid } = useUsers();
  const info = useConversation(conversationId, conversationType, myUid, byUid);
  const chat = useChat(conversationId, conversationType, myUid, info.status === 'ready');

  const [draft, setDraft] = useState('');
  const [recipientId, setRecipientId] = useState<string | null>(null);

  // Integrantes que podem ser mencionados (todos, exceto o próprio usuário).
  const mentionableMembers = useMemo<PublicProfile[]>(() => {
    if (!info.group) return [];
    return info.group.memberIds
      .filter((uid) => uid !== myUid)
      .map((uid) => byUid.get(uid) ?? { uid, name: UNKNOWN_USER, photoUrl: '' });
  }, [info.group, byUid, myUid]);

  // A lista é invertida (mensagem mais recente embaixo, sem precisar rolar manualmente).
  const listData = useMemo(() => [...chat.messages].reverse(), [chat.messages]);

  const handleHeaderPress = useCallback(() => {
    if (isGroup) {
      navigation.navigate('GroupMembers', { groupId: conversationId });
    } else if (info.otherUid) {
      navigation.navigate('Profile', { uid: info.otherUid });
    }
  }, [conversationId, info.otherUid, isGroup, navigation]);

  useLayoutEffect(() => {
    navigation.setOptions({
      headerTitle: () => (
        <Pressable
          style={styles.header}
          onPress={handleHeaderPress}
          accessibilityRole="button"
          accessibilityLabel={isGroup ? 'Ver integrantes do grupo' : 'Abrir perfil'}
        >
          <Avatar uri={info.photoUrl} name={info.title} size={36} />
          <Text style={styles.title} numberOfLines={1}>
            {info.title}
          </Text>
        </Pressable>
      ),
    });
  }, [handleHeaderPress, info.photoUrl, info.title, isGroup, navigation]);

  const handleSend = useCallback(async () => {
    const text = draft;
    if (text.trim().length === 0) return;

    const target: MessageTarget = recipientId
      ? { type: 'member', memberId: recipientId }
      : { type: 'conversation' };
    const mentionedUserIds = recipientId ? [recipientId] : [];

    // Limpa o campo na hora e devolve o texto se a gravação falhar, para o usuário tentar de novo.
    setDraft('');
    setRecipientId(null);
    const sent = await chat.send(text, target, mentionedUserIds);
    if (!sent) {
      setDraft(text);
      setRecipientId(recipientId);
    }
  }, [chat, draft, recipientId]);

  const renderItem = useCallback(
    ({ item }: { item: ChatMessage }) => {
      const isMine = item.senderId === myUid;
      const targetName =
        item.target.type === 'member' ? (byUid.get(item.target.memberId)?.name ?? UNKNOWN_USER) : undefined;
      return (
        <ChatMessageItem
          message={item}
          isMine={isMine}
          authorName={isGroup ? (byUid.get(item.senderId)?.name ?? UNKNOWN_USER) : undefined}
          targetName={targetName}
        />
      );
    },
    [byUid, isGroup, myUid],
  );

  if (info.status === 'loading') return <Loading message="Carregando conversa..." />;

  if (info.status === 'error') {
    return (
      <View style={styles.center}>
        <ErrorMessage message={info.errorMessage} />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      <OfflineBanner />
      {chat.error ? (
        <View style={styles.banner}>
          <ErrorMessage message={chat.error} />
        </View>
      ) : null}

      {chat.loading ? (
        <Loading message="Carregando mensagens..." />
      ) : chat.messages.length === 0 ? (
        <View style={styles.center}>
          <Text style={styles.empty}>Nenhuma mensagem ainda. Envie a primeira!</Text>
        </View>
      ) : (
        <FlatList
          style={styles.list}
          data={listData}
          inverted
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          keyboardShouldPersistTaps="handled"
        />
      )}

      {chat.sendError ? (
        <Pressable style={styles.banner} onPress={chat.dismissSendError} accessibilityRole="button">
          <ErrorMessage message={`${chat.sendError} Toque para fechar.`} />
        </Pressable>
      ) : null}

      {isGroup ? (
        <RecipientPicker members={mentionableMembers} selectedId={recipientId} onSelect={setRecipientId} />
      ) : null}
      <ChatInput value={draft} onChangeText={setDraft} onSend={handleSend} />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  list: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  banner: { padding: 8 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  title: { fontSize: 17, fontWeight: '600', color: colors.text, maxWidth: 220 },
  empty: { color: colors.textMuted, textAlign: 'center' },
});
