import { memo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors } from '../theme';
import type { PublicProfile } from '../types/user';
import { Avatar } from './Avatar';

type Props = {
  member: PublicProfile;
  isOwner: boolean;
  isMe: boolean;
  /** Quando informado, exibe o botão de remover (somente para o proprietário, em outros integrantes). */
  onRemove?: (member: PublicProfile) => void;
  disabled?: boolean;
};

function GroupMemberItemComponent({ member, isOwner, isMe, onRemove, disabled = false }: Props) {
  const role = isOwner ? 'Proprietário' : isMe ? 'Você' : null;

  return (
    <View style={styles.row}>
      <Avatar uri={member.photoUrl} name={member.name} size={40} />
      <View style={styles.texts}>
        <Text style={styles.name} numberOfLines={1}>
          {member.name || 'Usuário'}
        </Text>
        {role ? <Text style={styles.role}>{role}</Text> : null}
      </View>
      {onRemove ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Remover ${member.name}`}
          disabled={disabled}
          onPress={() => onRemove(member)}
          style={[styles.remove, disabled ? styles.disabled : null]}
        >
          <Text style={styles.removeText}>Remover</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

export const GroupMemberItem = memo(GroupMemberItemComponent);

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 8 },
  texts: { flex: 1 },
  name: { color: colors.text, fontSize: 15 },
  role: { color: colors.textMuted, fontSize: 12 },
  remove: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 6, backgroundColor: colors.dangerBackground },
  removeText: { color: colors.danger, fontWeight: '600', fontSize: 12 },
  disabled: { opacity: 0.5 },
});
