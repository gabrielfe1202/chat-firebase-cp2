import { memo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors } from '../theme';
import type { ConversationSummary } from '../types/chat';
import { Avatar } from './Avatar';

type Props = {
  conversation: ConversationSummary;
  onPress: (conversation: ConversationSummary) => void;
};

function ConversationItemComponent({ conversation, onPress }: Props) {
  const isGroup = conversation.type === 'group';

  return (
    <Pressable
      accessibilityRole="button"
      onPress={() => onPress(conversation)}
      style={({ pressed }) => [styles.row, pressed ? styles.pressed : null]}
    >
      <Avatar uri={conversation.photoUrl} name={conversation.title} size={48} />
      <View style={styles.texts}>
        <Text style={styles.title} numberOfLines={1}>
          {conversation.title}
        </Text>
        <Text style={styles.subtitle} numberOfLines={1}>
          {conversation.subtitle}
        </Text>
      </View>
      <View style={[styles.badge, isGroup ? styles.badgeGroup : null]}>
        <Text style={[styles.badgeText, isGroup ? styles.badgeTextGroup : null]}>
          {isGroup ? 'Grupo' : 'Direta'}
        </Text>
      </View>
    </Pressable>
  );
}

export const ConversationItem = memo(ConversationItemComponent);

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 12 },
  pressed: { backgroundColor: colors.surface },
  texts: { flex: 1, gap: 2 },
  title: { fontSize: 16, fontWeight: '600', color: colors.text },
  subtitle: { fontSize: 13, color: colors.textMuted },
  badge: { borderRadius: 10, backgroundColor: colors.surface, paddingHorizontal: 8, paddingVertical: 2 },
  badgeGroup: { backgroundColor: '#dbeafe' },
  badgeText: { fontSize: 11, color: colors.textMuted },
  badgeTextGroup: { color: colors.primaryDark, fontWeight: '600' },
});
