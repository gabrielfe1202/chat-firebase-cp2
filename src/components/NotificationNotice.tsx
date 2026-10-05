import { StyleSheet, Text, View } from 'react-native';
import { colors } from '../theme';
import type { PushState } from '../types/notification';
import { PrimaryButton } from './PrimaryButton';

type Props = {
  state: PushState;
  onRetry: () => void;
  onOpenSettings: () => void;
};

type Notice = { message: string; actionLabel?: string; onAction?: () => void };

function describe({ state, onRetry, onOpenSettings }: Props): Notice | null {
  switch (state.status) {
    case 'denied':
      return {
        message: 'As notificações estão desativadas: você não será avisado de novas mensagens.',
        actionLabel: state.canAskAgain ? 'Ativar notificações' : 'Abrir ajustes',
        onAction: state.canAskAgain ? onRetry : onOpenSettings,
      };
    case 'unavailable':
      if (state.reason === 'not-a-device') {
        return { message: 'Notificações push só funcionam em aparelhos físicos.' };
      }
      return {
        message:
          state.reason === 'no-token'
            ? 'Não foi possível obter o token de notificação deste aparelho.'
            : 'Falha ao registrar este aparelho para notificações.',
        actionLabel: 'Tentar novamente',
        onAction: onRetry,
      };
    default:
      return null;
  }
}

/** Aviso discreto sobre o estado das notificações; some quando o aparelho está registrado. */
export function NotificationNotice(props: Props) {
  const notice = describe(props);
  if (!notice) return null;

  return (
    <View style={styles.container}>
      <Text style={styles.message}>{notice.message}</Text>
      {notice.actionLabel && notice.onAction ? (
        <PrimaryButton title={notice.actionLabel} variant="link" onPress={notice.onAction} />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { backgroundColor: colors.surface, paddingHorizontal: 16, paddingVertical: 8, gap: 2 },
  message: { color: colors.textMuted, fontSize: 12 },
});
