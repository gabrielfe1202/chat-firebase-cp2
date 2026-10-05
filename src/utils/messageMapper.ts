import type { ChatMessage, MessageTarget, SendMessageInput } from '../types/chat';
import { isRecord, readNumber, readString, readStringArray } from './parsers';

function readTarget(value: unknown): MessageTarget {
  if (isRecord(value) && value.type === 'member') {
    const memberId = readString(value.memberId);
    if (memberId) return { type: 'member', memberId };
  }
  return { type: 'conversation' };
}

/** Converte o nó do Realtime Database em ChatMessage; retorna null se o nó for inválido. */
export function parseMessage(id: string, conversationId: string, raw: unknown): ChatMessage | null {
  if (!isRecord(raw)) return null;
  const senderId = readString(raw.senderId);
  const text = readString(raw.text);
  if (!senderId || !text) return null;

  return {
    id,
    conversationId,
    conversationType: raw.conversationType === 'group' ? 'group' : 'direct',
    senderId,
    text,
    target: readTarget(raw.target),
    mentionedUserIds: readStringArray(raw.mentionedUserIds),
    createdAt: readNumber(raw.createdAt),
  };
}

/** Corpo gravado no RTDB (`id` e `conversationId` fazem parte do caminho, não do corpo). */
export type MessageRecord = Omit<SendMessageInput, 'conversationId'> & {
  createdAt: object | number;
};

export function toMessageRecord(
  input: SendMessageInput,
  createdAt: MessageRecord['createdAt'],
): MessageRecord {
  return {
    conversationType: input.conversationType,
    senderId: input.senderId,
    text: input.text.trim(),
    target: input.target,
    mentionedUserIds: input.mentionedUserIds,
    createdAt,
  };
}
