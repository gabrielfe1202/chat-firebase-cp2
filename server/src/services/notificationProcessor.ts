import type {
  ConversationRecord,
  ConversationType,
  DeviceRecord,
  PushPayload,
  SendResult,
  StoredMessage,
} from '../types';
import { resolveRecipients } from './recipientResolver';

/** Erro com status HTTP e mensagem segura para devolver ao cliente. */
export class HttpError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = 'HttpError';
  }
}

/** Acesso aos dados e ao envio; implementado com Firebase em produção e com dublês nos testes. */
export interface NotificationPorts {
  readMessage(conversationId: string, messageId: string): Promise<StoredMessage | null>;
  readConversation(conversationId: string, type: ConversationType): Promise<ConversationRecord | null>;
  getDevices(uids: readonly string[]): Promise<DeviceRecord[]>;
  getDisplayName(uid: string): Promise<string>;
  /** Reserva a mensagem para esta execução; 'duplicate' se ela já foi (ou está sendo) notificada. */
  claim(key: string): Promise<'claimed' | 'duplicate'>;
  finish(key: string, summary: { recipients: number; delivered: number }): Promise<void>;
  /** Libera a reserva quando o envio falha, para que uma nova tentativa do cliente seja aceita. */
  release(key: string): Promise<void>;
  send(devices: readonly DeviceRecord[], payload: PushPayload): Promise<SendResult>;
  removeDevices(devices: readonly DeviceRecord[]): Promise<void>;
}

export type ProcessInput = {
  /** uid obtido do ID token validado — nunca de dados enviados pelo cliente. */
  uid: string;
  conversationId: string;
  messageId: string;
};

export type ProcessResult =
  | { status: 'sent'; recipients: number; delivered: number }
  | { status: 'skipped'; reason: 'no-recipients' }
  | { status: 'duplicate' };

const GENERIC_TITLE = 'Nova mensagem';

/** O texto da mensagem nunca vai na notificação: título e corpo trazem só o mínimo necessário. */
export function buildPayload(
  conversationId: string,
  conversation: ConversationRecord,
  senderName: string,
): PushPayload {
  const sender = senderName.trim();
  const data = { conversationId, conversationType: conversation.type };

  if (conversation.type === 'group') {
    return {
      title: conversation.name || GENERIC_TITLE,
      body: sender ? `${sender} enviou uma mensagem` : GENERIC_TITLE,
      data,
    };
  }
  return { title: sender || GENERIC_TITLE, body: GENERIC_TITLE, data };
}

export const notificationKey = (conversationId: string, messageId: string): string =>
  `${conversationId}__${messageId}`;

export async function processMessageNotification(
  ports: NotificationPorts,
  { uid, conversationId, messageId }: ProcessInput,
): Promise<ProcessResult> {
  // 1. A mensagem precisa existir no Realtime Database e ter sido enviada por quem chama.
  const message = await ports.readMessage(conversationId, messageId);
  if (!message) throw new HttpError(404, 'Mensagem não encontrada.');
  if (message.senderId !== uid) throw new HttpError(403, 'Você não é o autor desta mensagem.');

  // 2. A conversa vem do Firestore; o remetente precisa ser participante.
  const conversation = await ports.readConversation(conversationId, message.conversationType);
  if (!conversation) throw new HttpError(404, 'Conversa não encontrada.');
  const participants =
    conversation.type === 'direct' ? conversation.participantIds : conversation.memberIds;
  if (!participants.includes(uid)) throw new HttpError(403, 'Você não participa desta conversa.');

  // 3. Destinatários calculados no servidor, conforme a política.
  const recipients = resolveRecipients(conversation, message);
  if (recipients.length === 0) return { status: 'skipped', reason: 'no-recipients' };

  // 4. Idempotência: a mesma mensagem não gera push duas vezes, mesmo se o cliente repetir a chamada.
  const key = notificationKey(conversationId, messageId);
  if ((await ports.claim(key)) === 'duplicate') return { status: 'duplicate' };

  try {
    const devices = await ports.getDevices(recipients);
    let delivered = 0;

    if (devices.length > 0) {
      const senderName = await ports.getDisplayName(uid);
      const result = await ports.send(devices, buildPayload(conversationId, conversation, senderName));
      delivered = result.delivered;
      // Tokens inválidos são removidos para não serem usados de novo.
      if (result.invalidDevices.length > 0) await ports.removeDevices(result.invalidDevices);
    }

    await ports.finish(key, { recipients: recipients.length, delivered });
    return { status: 'sent', recipients: recipients.length, delivered };
  } catch (error) {
    await ports.release(key).catch(() => undefined);
    throw error;
  }
}
