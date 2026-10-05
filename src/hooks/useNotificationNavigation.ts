import { useEffect } from 'react';
import { observeNotificationTaps } from '../services/notificationService';
import type { RootScreenProps } from '../types/navigation';

type Navigation = RootScreenProps<'Conversations'>['navigation'];

/**
 * Abre a conversa indicada no payload quando o usuário toca em uma notificação.
 * Deve ser usado na tela inicial do fluxo autenticado: ela permanece montada enquanto há sessão,
 * então o toque funciona de qualquer tela, e a notificação que abriu o app é tratada após o login.
 */
export function useNotificationNavigation(navigation: Navigation): void {
  useEffect(() => {
    return observeNotificationTaps(({ conversationId, conversationType }) => {
      navigation.navigate('Chat', { conversationId, conversationType });
    });
  }, [navigation]);
}
