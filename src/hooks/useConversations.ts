import { useEffect, useMemo, useState } from 'react';
import { observeDirectConversations } from '../services/chatService';
import { observeUserGroups } from '../services/groupService';
import type { ConversationSummary, DirectConversation } from '../types/chat';
import type { ChatGroup } from '../types/group';
import type { PublicProfile } from '../types/user';
import { getErrorMessage } from '../utils/authErrors';
import { getOtherParticipant } from '../utils/conversationId';
import { pluralize } from '../utils/format';

type ConversationsResult = {
  conversations: ConversationSummary[];
  loading: boolean;
  error: string | null;
};

/** Junta conversas individuais e grupos do usuário em uma única lista, mais recentes primeiro. */
export function useConversations(
  myUid: string,
  usersByUid: ReadonlyMap<string, PublicProfile>,
): ConversationsResult {
  const [directs, setDirects] = useState<DirectConversation[] | null>(null);
  const [groups, setGroups] = useState<ChatGroup[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!myUid) return undefined;
    setDirects(null);
    setGroups(null);
    setError(null);

    const handleError = (e: Error) => setError(getErrorMessage(e));
    const stopDirects = observeDirectConversations(myUid, setDirects, handleError);
    const stopGroups = observeUserGroups(myUid, setGroups, handleError);

    // Remove os dois listeners ao sair da tela, trocar de usuário ou fazer logout.
    return () => {
      stopDirects();
      stopGroups();
    };
  }, [myUid]);

  const conversations = useMemo<ConversationSummary[]>(() => {
    const directItems = (directs ?? []).map((conversation): ConversationSummary => {
      const otherUid = getOtherParticipant(conversation.participants, myUid);
      const other = otherUid ? usersByUid.get(otherUid) : undefined;
      return {
        id: conversation.id,
        type: 'direct',
        title: other?.name || 'Usuário',
        subtitle: 'Conversa individual',
        photoUrl: other?.photoUrl ?? '',
        createdAt: conversation.createdAt,
      };
    });

    const groupItems = (groups ?? []).map(
      (group): ConversationSummary => ({
        id: group.id,
        type: 'group',
        title: group.name,
        subtitle: `Grupo · ${pluralize(group.memberIds.length, 'integrante', 'integrantes')}`,
        photoUrl: group.photoUrl,
        createdAt: group.createdAt,
      }),
    );

    return [...directItems, ...groupItems].sort((a, b) => b.createdAt - a.createdAt);
  }, [directs, groups, myUid, usersByUid]);

  return { conversations, loading: !error && (directs === null || groups === null), error };
}
