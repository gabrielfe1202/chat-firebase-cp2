import type { ChatGroup } from '../types/group';
import type { NotificationPolicy, NotificationSettings } from '../types/notification';

export const POLICY_LABELS: Record<NotificationPolicy, { title: string; description: string }> = {
  all_group_messages: {
    title: 'Todas as mensagens do grupo',
    description: 'Todos os integrantes, exceto quem enviou, recebem push de cada mensagem geral.',
  },
  mentioned_members: {
    title: 'Somente mencionados',
    description: 'Só os integrantes mencionados ou selecionados na mensagem recebem push.',
  },
  direct_messages_only: {
    title: 'Somente conversas individuais',
    description: 'Mensagens de grupo não geram push; apenas conversas individuais notificam.',
  },
  disabled: {
    title: 'Desativadas',
    description: 'Nenhuma mensagem deste grupo gera push.',
  },
};

/**
 * Configuração de notificações de uma conversa em grupo. Fica no próprio documento do grupo, e só o
 * proprietário pode alterá-la; por isso `updatedBy` é sempre o proprietário.
 */
export function getNotificationSettings(
  group: Pick<ChatGroup, 'id' | 'ownerId' | 'notificationPolicy' | 'updatedAt'>,
): NotificationSettings {
  return {
    conversationId: group.id,
    policy: group.notificationPolicy,
    updatedBy: group.ownerId,
    updatedAt: group.updatedAt,
  };
}
