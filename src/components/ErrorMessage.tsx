import { StyleSheet, Text, View } from 'react-native';
import { colors } from '../theme';

type Props = { message: string | null };

export function ErrorMessage({ message }: Props) {
  if (!message) return null;
  return (
    <View style={styles.container} accessibilityRole="alert">
      <Text style={styles.text}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { backgroundColor: colors.dangerBackground, borderRadius: 8, padding: 12 },
  text: { color: colors.danger },
});
