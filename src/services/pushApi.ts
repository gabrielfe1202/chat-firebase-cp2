import type { DevicePlatform, PushRequestBody } from '../types/notification';
import { AppError } from '../utils/authErrors';
import { ApiError, apiRequest } from './apiClient';

/**
 * Pede à API que notifique os destinatários de uma mensagem já gravada.
 * Só enviamos `conversationId` e `messageId`: a API valida o token, confere a mensagem no banco e calcula
 * os destinatários sozinha. Como o endpoint é idempotente por mensagem, repetir a chamada é seguro.
 */
export async function requestPushForMessage(conversationId: string, messageId: string): Promise<void> {
  const body: PushRequestBody = { conversationId, messageId };
  try {
    await apiRequest('POST', '/notifications/messages', body);
  } catch (error) {
    if (error instanceof ApiError) {
      throw new AppError(
        error.status >= 400 && error.status < 500
          ? 'A notificação desta mensagem foi recusada pelo servidor.'
          : 'Não foi possível entregar a notificação desta mensagem.',
      );
    }
    throw error;
  }
}

/**
 * Registra o aparelho pela API, que grava o token no usuário autenticado e o remove de qualquer outra
 * conta (um aparelho que troca de usuário não pode continuar recebendo as notificações do anterior).
 */
export async function registerDeviceViaApi(
  deviceId: string,
  token: string,
  platform: DevicePlatform,
): Promise<void> {
  await apiRequest('POST', '/devices', { deviceId, token, platform });
}
