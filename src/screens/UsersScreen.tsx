import { useCallback, useMemo, useState } from 'react';
import { FlatList, StyleSheet, Text, TextInput, View } from 'react-native';
import { ErrorMessage } from '../components/ErrorMessage';
import { Loading } from '../components/Loading';
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
  const { mode, groupId } = route.params;
  const { profile } = useAuth();
  const myUid = profile?.uid ?? '';
  const { users, loading, error } = useUsers();

  const [searchText, setSearchText] = useState('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [opening, setOpening] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const visibleUsers = useMemo(() => filterUsers(users, searchText, myUid), [users, searchText, myUid]);
  const isSelecting = mode === 'selectMembers';

  const handlePress = useCallback(
    async (user: PublicProfile) => {
      if (user.uid === myUid) return; // o próprio usuário nunca pode ser selecionado
      setActionError(null);

      if (isSelecting) {
        setSelectedIds((current) =>
          current.includes(user.uid) ? current.filter((id) => id !== user.uid) : [...current, user.uid],
        );
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
    [isSelecting, myUid, navigation],
  );

  const handleConfirmSelection = useCallback(() => {
    navigation.navigate('GroupForm', { groupId, selectedMemberIds: selectedIds });
  }, [groupId, navigation, selectedIds]);

  const renderItem = useCallback(
    ({ item }: { item: PublicProfile }) => (
      <UserListItem
        user={item}
        onPress={handlePress}
        selected={isSelecting ? selectedIds.includes(item.uid) : undefined}
        disabled={opening}
      />
    ),
    [handlePress, isSelecting, selectedIds, opening],
  );

  if (loading) return <Loading message="Carregando usuários..." />;

  return (
    <View style={styles.container}>
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
          <PrimaryButton
            title={`Confirmar (${selectedIds.length})`}
            onPress={handleConfirmSelection}
            disabled={selectedIds.length === 0}
          />
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
