import type { ConversationRecord, StoredMessage } from '../types';

/**
 * Calcula, no servidor, quem deve ser notificado por uma mensagem.
 * A lista nunca vem do aplicativo: é derivada da conversa gravada no Firestore e da própria mensagem.
 *
 * - O remetente nunca é notificado, e só participantes da conversa podem ser destinatários.
 * - Conversa individual: o outro participante sempre recebe.
 * - Grupo, conforme a política configurada pelo proprietário:
 *   - all_group_messages: todos os integrantes (exceto o remetente), em qualquer mensagem do grupo;
 *   - mentioned_members: apenas os mencionados ou selecionados como destinatário da mensagem;
 *   - direct_messages_only e disabled: ninguém.
 */
export function resolveRecipients(conversation: ConversationRecord, message: StoredMessage): string[] {
  const participants =
    conversation.type === 'direct' ? conversation.participantIds : conversation.memberIds;

  // Remetente que não faz (mais) parte da conversa não pode disparar notificações.
  if (!participants.includes(message.senderId)) return [];

  const others = Array.from(new Set(participants.filter((uid) => uid !== message.senderId)));

  if (conversation.type === 'direct') return others;

  switch (conversation.policy) {
    case 'all_group_messages':
      return others;

    case 'mentioned_members': {
      const targeted = new Set(message.mentionedUserIds);
      if (message.target.type === 'member') targeted.add(message.target.memberId);
      return others.filter((uid) => targeted.has(uid));
    }

    case 'direct_messages_only':
    case 'disabled':
      return [];
  }
}
