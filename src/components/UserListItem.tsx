import { memo } from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import { colors } from '../theme';
import type { PublicProfile } from '../types/user';
import { Avatar } from './Avatar';

type Props = {
  user: PublicProfile;
  onPress: (user: PublicProfile) => void;
  /** Quando definido, exibe o indicador de seleção múltipla. */
  selected?: boolean;
  disabled?: boolean;
};

function UserListItemComponent({ user, onPress, selected, disabled = false }: Props) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled, selected: selected ?? false }}
      disabled={disabled}
      onPress={() => onPress(user)}
      style={({ pressed }) => [styles.row, pressed ? styles.pressed : null, disabled ? styles.disabled : null]}
    >
      <Avatar uri={user.photoUrl} name={user.name} size={44} />
      <Text style={styles.name} numberOfLines={1}>
        {user.name || 'Usuário sem nome'}
      </Text>
      {selected !== undefined ? (
        <Text style={[styles.check, selected ? styles.checkOn : null]}>{selected ? '✓' : ''}</Text>
      ) : null}
    </Pressable>
  );
}

export const UserListItem = memo(UserListItemComponent);

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 10 },
  pressed: { backgroundColor: colors.surface },
  disabled: { opacity: 0.5 },
  name: { flex: 1, fontSize: 16, color: colors.text },
  check: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: colors.border,
    textAlign: 'center',
    lineHeight: 20,
    color: colors.white,
    overflow: 'hidden',
  },
  checkOn: { backgroundColor: colors.primary, borderColor: colors.primary },
});
