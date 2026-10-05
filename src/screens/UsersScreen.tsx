import { useCallback, useMemo, useState } from 'react';
import { FlatList, StyleSheet, Text, TextInput, View } from 'react-native';
import { ErrorMessage } from '../components/ErrorMessage';
import { Loading } from '../components/Loading';
import { OfflineBanner } from '../components/OfflineBanner';
import { PrimaryButton } from '../components/PrimaryButton';
import { UserListItem } from '../components/UserListItem';
import { useAuth } from '../hooks/useAuth';
import { useUsers } from '../hooks/useUsers';
import { getOrCreateDirectConversation } from '../services/chatService';
import { colors } from '../theme';
import type { RootScreenProps } from '../types/navigation';
import type { PublicProfile } from '../types/user';
import { getErrorMessage } from '../utils/authErrors';
import { filterUsers } from '../utils/userFilter';

export function UsersScreen({ navigation, route }: RootScreenProps<'Users'>) {
  const { mode, groupId, initialSelectedIds, lockedIds, maxSelectable } = route.params;
  const { profile } = useAuth();
  const myUid = profile?.uid ?? '';
  const { users, loading, error } = useUsers();

  const [searchText, setSearchText] = useState('');
  const [selectedIds, setSelectedIds] = useState<string[]>(initialSelectedIds ?? []);
  const [opening, setOpening] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const visibleUsers = useMemo(() => filterUsers(users, searchText, myUid), [users, searchText, myUid]);
  const isSelecting = mode === 'selectMembers';

  const handlePress = useCallback(
    async (user: PublicProfile) => {
      if (user.uid === myUid) return; // o próprio usuário nunca pode ser selecionado
      setActionError(null);

      if (isSelecting) {
        if (lockedIds?.includes(user.uid)) return;
        const alreadySelected = selectedIds.includes(user.uid);
        if (!alreadySelected && maxSelectable !== undefined && selectedIds.length >= maxSelectable) {
          setActionError(
            maxSelectable === 0
              ? 'O grupo não tem vagas disponíveis.'
              : `O grupo só tem vaga para mais ${maxSelectable} integrante(s).`,
          );
          return;
        }
        setSelectedIds(alreadySelected ? selectedIds.filter((id) => id !== user.uid) : [...selectedIds, user.uid]);
        return;
      }

      setOpening(true);
      try {
        const conversation = await getOrCreateDirectConversation(myUid, user.uid);
        navigation.replace('Chat', { conversationId: conversation.id, conversationType: 'direct' });
      } catch (e) {
        setActionError(getErrorMessage(e));
        setOpening(false);
      }
    },
    [isSelecting, lockedIds, maxSelectable, myUid, navigation, selectedIds],
  );

  // Volta ao formulário já aberto, entregando a seleção como parâmetro (sem empilhar outra cópia).
  const handleConfirmSelection = useCallback(() => {
    navigation.popTo('GroupForm', { groupId, selectedMemberIds: selectedIds }, { merge: true });
  }, [groupId, navigation, selectedIds]);

  const renderItem = useCallback(
    ({ item }: { item: PublicProfile }) => {
      const locked = lockedIds?.includes(item.uid) ?? false;
      return (
        <UserListItem
          user={item}
          onPress={handlePress}
          selected={isSelecting ? locked || selectedIds.includes(item.uid) : undefined}
          disabled={opening || locked}
          subtitle={locked ? 'Já é integrante' : undefined}
        />
      );
    },
    [handlePress, isSelecting, lockedIds, selectedIds, opening],
  );

  if (loading) return <Loading message="Carregando usuários..." />;

  return (
    <View style={styles.container}>
      <OfflineBanner />
      <TextInput
        style={styles.search}
        value={searchText}
        onChangeText={setSearchText}
        placeholder="Buscar por nome"
        placeholderTextColor={colors.textMuted}
        autoCapitalize="none"
        autoCorrect={false}
      />
      <View style={styles.messages}>
        <ErrorMessage message={error ?? actionError} />
      </View>
      <FlatList
        data={visibleUsers}
        keyExtractor={(item) => item.uid}
        renderItem={renderItem}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={visibleUsers.length === 0 ? styles.emptyContainer : undefined}
        ListEmptyComponent={
          <Text style={styles.empty}>
            {searchText.trim() ? 'Nenhum usuário encontrado para a busca.' : 'Nenhum outro usuário cadastrado ainda.'}
          </Text>
        }
      />
      {isSelecting ? (
        <View style={styles.footer}>
          <PrimaryButton title={`Confirmar (${selectedIds.length})`} onPress={handleConfirmSelection} />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  search: {
    margin: 16,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: colors.text,
  },
  messages: { paddingHorizontal: 16 },
  emptyContainer: { flexGrow: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  empty: { color: colors.textMuted, textAlign: 'center' },
  footer: { padding: 16, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
});
