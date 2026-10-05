import type { NotificationPolicy } from '../types/notification';

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
