import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { colors } from '../theme';
import { MAX_MESSAGE_LENGTH } from '../types/chat';

type Props = {
  value: string;
  onChangeText: (text: string) => void;
  onSend: () => void;
  disabled?: boolean;
};

export function ChatInput({ value, onChangeText, onSend, disabled = false }: Props) {
  const canSend = value.trim().length > 0 && !disabled;

  return (
    <View style={styles.container}>
      <TextInput
        style={styles.input}
        value={value}
        onChangeText={onChangeText}
        placeholder="Digite uma mensagem"
        placeholderTextColor={colors.textMuted}
        multiline
        maxLength={MAX_MESSAGE_LENGTH}
        editable={!disabled}
      />
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Enviar mensagem"
        accessibilityState={{ disabled: !canSend }}
        disabled={!canSend}
        onPress={onSend}
        style={[styles.button, !canSend ? styles.buttonDisabled : null]}
      >
        <Text style={styles.buttonText}>Enviar</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
    padding: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    backgroundColor: colors.background,
  },
  input: {
    flex: 1,
    maxHeight: 120,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
    color: colors.text,
  },
  button: { backgroundColor: colors.primary, borderRadius: 20, paddingHorizontal: 16, paddingVertical: 10 },
  buttonDisabled: { opacity: 0.5 },
  buttonText: { color: colors.white, fontWeight: '700' },
});
