import type { PushRequestBody } from '../types/notification';
import { AppError } from '../utils/authErrors';
import { auth } from './firebase';

const REQUEST_TIMEOUT_MS = 10000;
const MAX_ATTEMPTS = 2;

/**
 * Pede à API que notifique os destinatários de uma mensagem já gravada.
 * Só enviamos `conversationId` e `messageId`: a API valida o token, confere a mensagem no banco e calcula
 * os destinatários sozinha. Como o endpoint é idempotente por mensagem, repetir a chamada é seguro.
 */
export async function requestPushForMessage(conversationId: string, messageId: string): Promise<void> {
  const baseUrl = process.env.EXPO_PUBLIC_API_URL;
  if (!baseUrl) throw new AppError('O serviço de notificações não está configurado.');

  const user = auth.currentUser;
  if (!user) throw new AppError('Sessão expirada. Faça login novamente.');

  const idToken = await user.getIdToken();
  const body: PushRequestBody = { conversationId, messageId };
  const url = `${baseUrl.replace(/\/+$/, '')}/notifications/messages`;

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${idToken}` },
        body: JSON.stringify(body),
        signal: controller.signal,
      });
      if (response.ok) return;
      // Erros 4xx não melhoram com nova tentativa.
      if (response.status < 500) throw new AppError('A notificação desta mensagem foi recusada pelo servidor.');
    } catch (error) {
      if (error instanceof AppError) throw error;
      // Falha de rede ou timeout: tenta de novo até o limite.
    } finally {
      clearTimeout(timeout);
    }
  }

  throw new AppError('Não foi possível entregar a notificação desta mensagem.');
}
