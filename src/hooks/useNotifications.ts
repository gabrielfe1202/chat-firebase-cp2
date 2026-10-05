import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, Linking } from 'react-native';
import { observePushTokenChanges, registerForPush } from '../services/notificationService';
import type { PushState } from '../types/notification';

type UseNotificationsResult = {
  state: PushState;
  /** Tenta registrar o aparelho de novo (pede a permissão outra vez, se o sistema ainda permitir). */
  retry: () => void;
  openSettings: () => void;
};

/**
 * Registra o aparelho para push enquanto há um usuário logado e acompanha a troca de token.
 * Se a permissão foi negada e o usuário a habilita nos ajustes, o registro é refeito ao voltar ao app.
 */
export function useNotifications(uid: string): UseNotificationsResult {
  const [state, setState] = useState<PushState>({ status: 'idle' });
  const statusRef = useRef(state.status);
  statusRef.current = state.status;

  const register = useCallback(async () => {
    if (!uid) return;
    setState({ status: 'registering' });
    setState(await registerForPush(uid));
  }, [uid]);

  useEffect(() => {
    if (!uid) return undefined;
    let active = true;

    registerForPush(uid).then((result) => {
      if (active) setState(result);
    });
    const stopTokenListener = observePushTokenChanges(uid);

    return () => {
      active = false;
      stopTokenListener();
    };
  }, [uid]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (next) => {
      if (next === 'active' && statusRef.current === 'denied') void register();
    });
    return () => subscription.remove();
  }, [register]);

  const retry = useCallback(() => void register(), [register]);
  const openSettings = useCallback(() => void Linking.openSettings(), []);

  return { state, retry, openSettings };
}
