import { memo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors } from '../theme';
import type { ChatMessage } from '../types/chat';
import { formatMessageTime } from '../utils/format';

type Props = {
  message: ChatMessage;
  isMine: boolean;
  /** Nome do autor; exibido apenas em mensagens recebidas de grupos. */
  authorName?: string;
  /** Nome do integrante a quem a mensagem foi direcionada, quando houver. */
  targetName?: string;
};

function ChatMessageItemComponent({ message, isMine, authorName, targetName }: Props) {
  const time = formatMessageTime(message.createdAt);

  return (
    <View style={[styles.row, isMine ? styles.rowMine : styles.rowOther]}>
      <View style={[styles.bubble, isMine ? styles.bubbleMine : styles.bubbleOther]}>
        {!isMine && authorName ? <Text style={styles.author}>{authorName}</Text> : null}
        {targetName ? (
          <Text style={[styles.target, isMine ? styles.textMine : null]}>Para @{targetName}</Text>
        ) : null}
        <Text style={isMine ? styles.textMine : styles.textOther}>{message.text}</Text>
        {time ? <Text style={[styles.time, isMine ? styles.timeMine : null]}>{time}</Text> : null}
      </View>
    </View>
  );
}

export const ChatMessageItem = memo(ChatMessageItemComponent);

const styles = StyleSheet.create({
  row: { paddingHorizontal: 12, paddingVertical: 3, flexDirection: 'row' },
  rowMine: { justifyContent: 'flex-end' },
  rowOther: { justifyContent: 'flex-start' },
  bubble: { maxWidth: '80%', borderRadius: 14, paddingHorizontal: 12, paddingVertical: 8, gap: 2 },
  bubbleMine: { backgroundColor: colors.primary, borderBottomRightRadius: 4 },
  bubbleOther: { backgroundColor: colors.surface, borderBottomLeftRadius: 4 },
  author: { fontWeight: '700', color: colors.primaryDark, fontSize: 12 },
  target: { fontSize: 12, fontStyle: 'italic', color: colors.textMuted },
  textMine: { color: colors.white },
  textOther: { color: colors.text },
  time: { alignSelf: 'flex-end', fontSize: 10, color: colors.textMuted },
  timeMine: { color: '#dbeafe' },
});
