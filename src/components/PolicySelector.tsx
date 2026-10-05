import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors } from '../theme';
import { NOTIFICATION_POLICIES, type NotificationPolicy } from '../types/notification';
import { POLICY_LABELS } from '../utils/notificationPolicy';

type Props = {
  value: NotificationPolicy;
  onChange: (policy: NotificationPolicy) => void;
  disabled?: boolean;
};

export function PolicySelector({ value, onChange, disabled = false }: Props) {
  return (
    <View style={styles.container} accessibilityRole="radiogroup">
      {NOTIFICATION_POLICIES.map((policy) => {
        const selected = policy === value;
        const { title, description } = POLICY_LABELS[policy];
        return (
          <Pressable
            key={policy}
            accessibilityRole="radio"
            accessibilityState={{ selected, disabled }}
            disabled={disabled}
            onPress={() => onChange(policy)}
            style={[styles.option, selected ? styles.optionSelected : null, disabled ? styles.disabled : null]}
          >
            <View style={[styles.radio, selected ? styles.radioSelected : null]} />
            <View style={styles.texts}>
              <Text style={styles.title}>{title}</Text>
              <Text style={styles.description}>{description}</Text>
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 8 },
  option: {
    flexDirection: 'row',
    gap: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
  },
  optionSelected: { borderColor: colors.primary, backgroundColor: '#eff6ff' },
  disabled: { opacity: 0.6 },
  radio: { width: 18, height: 18, borderRadius: 9, borderWidth: 2, borderColor: colors.border, marginTop: 2 },
  radioSelected: { borderColor: colors.primary, backgroundColor: colors.primary },
  texts: { flex: 1, gap: 2 },
  title: { color: colors.text, fontWeight: '600' },
  description: { color: colors.textMuted, fontSize: 12 },
});
