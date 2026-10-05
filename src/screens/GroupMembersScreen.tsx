import { useCallback, useMemo } from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import { Avatar } from '../components/Avatar';
import { ErrorMessage } from '../components/ErrorMessage';
import { Loading } from '../components/Loading';
import { PrimaryButton } from '../components/PrimaryButton';
import { UserListItem } from '../components/UserListItem';
import { useAuth } from '../hooks/useAuth';
import { useConversation } from '../hooks/useConversation';
import { useUsers } from '../hooks/useUsers';
import { colors } from '../theme';
import type { RootScreenProps } from '../types/navigation';
import type { PublicProfile } from '../types/user';
import { pluralize } from '../utils/format';
import { getAvailableSlots } from '../utils/groupValidation';
import { POLICY_LABELS, getNotificationSettings } from '../utils/notificationPolicy';

export function GroupMembersScreen({ navigation, route }: RootScreenProps<'GroupMembers'>) {
  const { groupId } = route.params;
  const { profile } = useAuth();
  const myUid = profile?.uid ?? '';
  const { byUid } = useUsers();
  const info = useConversation(groupId, 'group', myUid, byUid);
  const { group } = info;

  // Proprietário primeiro; os demais na ordem em que entraram.
  const members = useMemo<PublicProfile[]>(() => {
    if (!group) return [];
    const ordered = [group.ownerId, ...group.memberIds.filter((uid) => uid !== group.ownerId)];
    return ordered.map((uid) => byUid.get(uid) ?? { uid, name: 'Usuário', photoUrl: '' });
  }, [group, byUid]);

  const handleOpenProfile = useCallback(
    (member: PublicProfile) => navigation.navigate('Profile', { uid: member.uid }),
    [navigation],
  );

  const renderItem = useCallback(
    ({ item }: { item: PublicProfile }) => {
      const subtitle = item.uid === group?.ownerId ? 'Proprietário' : item.uid === myUid ? 'Você' : undefined;
      return <UserListItem user={item} onPress={handleOpenProfile} subtitle={subtitle} />;
    },
    [group?.ownerId, handleOpenProfile, myUid],
  );

  if (info.status === 'loading') return <Loading message="Carregando grupo..." />;

  if (info.status === 'error' || !group) {
    return (
      <View style={styles.center}>
        <ErrorMessage message={info.errorMessage} />
      </View>
    );
  }

  const slots = getAvailableSlots(group);
  const notifications = getNotificationSettings(group);
  const isOwner = group.ownerId === myUid;
  return (
    <FlatList
      style={styles.list}
      data={members}
      keyExtractor={(item) => item.uid}
      renderItem={renderItem}
      ListHeaderComponent={
        <View style={styles.header}>
          <Avatar uri={group.photoUrl} name={group.name} size={96} />
          <Text style={styles.name}>{group.name}</Text>
          <Text style={styles.summary}>
            {group.memberIds.length}/{group.memberLimit} integrantes ·{' '}
            {slots === 0 ? 'sem vagas' : pluralize(slots, 'vaga disponível', 'vagas disponíveis')}
          </Text>
          <Text style={styles.summary}>
            Notificações: {POLICY_LABELS[notifications.policy].title}
          </Text>
          {isOwner ? (
            <PrimaryButton
              title="Gerenciar grupo"
              onPress={() => navigation.navigate('GroupForm', { groupId: group.id })}
            />
          ) : null}
        </View>
      }
    />
  );
}

const styles = StyleSheet.create({
  list: { flex: 1, backgroundColor: colors.background },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  header: { alignItems: 'center', gap: 8, padding: 24 },
  name: { fontSize: 22, fontWeight: '700', color: colors.text },
  summary: { color: colors.textMuted },
});
