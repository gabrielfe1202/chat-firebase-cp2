import { ScrollView, StyleSheet, Text, Pressable, View } from 'react-native';
import { colors } from '../theme';
import type { PublicProfile } from '../types/user';

type Props = {
  members: readonly PublicProfile[];
  /** uid do integrante selecionado; null = mensagem geral para o grupo. */
  selectedId: string | null;
  onSelect: (uid: string | null) => void;
};

type ChipProps = { label: string; active: boolean; onPress: () => void };

function Chip({ label, active, onPress }: ChipProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      onPress={onPress}
      style={[styles.chip, active ? styles.chipActive : null]}
    >
      <Text style={active ? styles.chipTextActive : styles.chipText}>{label}</Text>
    </Pressable>
  );
}

/** Permite escolher entre enviar ao grupo todo ou direcionar a mensagem (menção) a um integrante. */
export function RecipientPicker({ members, selectedId, onSelect }: Props) {
  if (members.length === 0) return null;

  return (
    <View style={styles.container}>
      <Text style={styles.label}>Para:</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
        <Chip label="Todos" active={selectedId === null} onPress={() => onSelect(null)} />
        {members.map((member) => (
          <Chip
            key={member.uid}
            label={`@${member.name || 'Usuário'}`}
            active={selectedId === member.uid}
            onPress={() => onSelect(selectedId === member.uid ? null : member.uid)}
          />
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 12,
    gap: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    backgroundColor: colors.background,
  },
  label: { color: colors.textMuted },
  chips: { gap: 6, paddingVertical: 6, paddingRight: 12 },
  chip: { borderRadius: 14, borderWidth: 1, borderColor: colors.border, paddingHorizontal: 10, paddingVertical: 4 },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { color: colors.text },
  chipTextActive: { color: colors.white, fontWeight: '600' },
});
