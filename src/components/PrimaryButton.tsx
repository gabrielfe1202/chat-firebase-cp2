import { ActivityIndicator, Pressable, StyleSheet, Text } from 'react-native';
import { colors } from '../theme';

type Props = {
  title: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  variant?: 'primary' | 'link';
};

export function PrimaryButton({ title, onPress, loading = false, disabled = false, variant = 'primary' }: Props) {
  const isDisabled = disabled || loading;
  const isLink = variant === 'link';

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      disabled={isDisabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.base,
        isLink ? styles.link : styles.primary,
        pressed && !isLink ? styles.pressed : null,
        isDisabled ? styles.disabled : null,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={isLink ? colors.primary : colors.white} />
      ) : (
        <Text style={isLink ? styles.linkText : styles.primaryText}>{title}</Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: { minHeight: 44, borderRadius: 8, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 16 },
  primary: { backgroundColor: colors.primary },
  link: { backgroundColor: 'transparent' },
  pressed: { backgroundColor: colors.primaryDark },
  disabled: { opacity: 0.6 },
  primaryText: { color: colors.white, fontWeight: '700' },
  linkText: { color: colors.primary, fontWeight: '600' },
});
