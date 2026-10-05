import { memo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors } from '../theme';
import type { PublicProfile } from '../types/user';
import { Avatar } from './Avatar';

type Props = {
  user: PublicProfile;
  onPress: (user: PublicProfile) => void;
  /** Quando definido, exibe o indicador de seleção múltipla. */
  selected?: boolean;
  disabled?: boolean;
  /** Texto secundário, ex.: "Proprietário". */
  subtitle?: string;
};

function UserListItemComponent({ user, onPress, selected, disabled = false, subtitle }: Props) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled, selected: selected ?? false }}
      disabled={disabled}
      onPress={() => onPress(user)}
      style={({ pressed }) => [styles.row, pressed ? styles.pressed : null, disabled ? styles.disabled : null]}
    >
      <Avatar uri={user.photoUrl} name={user.name} size={44} />
      <View style={styles.texts}>
        <Text style={styles.name} numberOfLines={1}>
          {user.name || 'Usuário sem nome'}
        </Text>
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      </View>
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
  texts: { flex: 1 },
  name: { fontSize: 16, color: colors.text },
  subtitle: { fontSize: 12, color: colors.textMuted },
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
