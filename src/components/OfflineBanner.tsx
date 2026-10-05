import { useNetInfo } from '@react-native-community/netinfo';
import { StyleSheet, Text, View } from 'react-native';
import { colors } from '../theme';

/** Avisa quando o aparelho está sem conexão; as mensagens enviadas ficam na fila e seguem ao reconectar. */
export function OfflineBanner() {
  const { isConnected } = useNetInfo();
  if (isConnected !== false) return null;

  return (
    <View style={styles.container} accessibilityRole="alert">
      <Text style={styles.text}>Sem conexão. As mensagens serão enviadas quando a rede voltar.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { backgroundColor: colors.dangerBackground, paddingVertical: 6, paddingHorizontal: 12 },
  text: { color: colors.danger, textAlign: 'center', fontSize: 12 },
});
