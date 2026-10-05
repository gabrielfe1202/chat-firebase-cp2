import type { NotificationPayload } from '../types/notification';
import { isRecord } from './parsers';

/**
 * Lê o `data` de uma notificação. O FCM entrega apenas strings, então tudo é validado:
 * um payload malformado vira null e a notificação simplesmente não navega.
 */
export function parseNotificationPayload(data: unknown): NotificationPayload | null {
  if (!isRecord(data)) return null;
  const { conversationId, conversationType } = data;
  if (typeof conversationId !== 'string' || conversationId.length === 0) return null;
  if (conversationType !== 'direct' && conversationType !== 'group') return null;
  return { conversationId, conversationType };
}
