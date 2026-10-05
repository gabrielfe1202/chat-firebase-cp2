import { useEffect, useMemo, useState } from 'react';
import { observeGroup } from '../services/groupService';
import type { ConversationType } from '../types/chat';
import type { ChatGroup } from '../types/group';
import type { PublicProfile } from '../types/user';
import { getErrorMessage } from '../utils/authErrors';
import { getOtherUidFromDirectId } from '../utils/conversationId';

export type ConversationInfo = {
  status: 'loading' | 'ready' | 'error';
  errorMessage: string | null;
  title: string;
  photoUrl: string;
  /** uid do outro participante (conversa individual). */
  otherUid: string | null;
  /** Dados do grupo (conversa em grupo). */
  group: ChatGroup | null;
};

const INVALID_CONVERSATION = 'Conversa indisponível. Você pode não fazer mais parte dela.';

/** Resolve título, foto e participantes da conversa aberta, para conversas individuais e em grupo. */
export function useConversation(
  conversationId: string,
  conversationType: ConversationType,
  myUid: string,
  usersByUid: ReadonlyMap<string, PublicProfile>,
): ConversationInfo {
  const [group, setGroup] = useState<ChatGroup | null>(null);
  const [groupState, setGroupState] = useState<'loading' | 'ready' | 'error'>('loading');
  const [groupError, setGroupError] = useState<string | null>(null);

  const isGroup = conversationType === 'group';

  useEffect(() => {
    if (!isGroup) return undefined;
    setGroupState('loading');
    setGroupError(null);

    return observeGroup(
      conversationId,
      (result) => {
        // Grupo removido ou usuário retirado dele: não há mais acesso à conversa.
        if (!result || !result.memberIds.includes(myUid)) {
          setGroup(null);
          setGroupState('error');
          setGroupError(INVALID_CONVERSATION);
          return;
        }
        setGroup(result);
        setGroupState('ready');
      },
      (error) => {
        setGroup(null);
        setGroupState('error');
        setGroupError(getErrorMessage(error));
      },
    );
  }, [conversationId, isGroup, myUid]);

  return useMemo<ConversationInfo>(() => {
    if (isGroup) {
      return {
        status: groupState,
        errorMessage: groupError,
        title: group?.name ?? 'Grupo',
        photoUrl: group?.photoUrl ?? '',
        otherUid: null,
        group,
      };
    }

    const otherUid = getOtherUidFromDirectId(conversationId, myUid);
    if (!otherUid) {
      return {
        status: 'error',
        errorMessage: INVALID_CONVERSATION,
        title: 'Conversa',
        photoUrl: '',
        otherUid: null,
        group: null,
      };
    }
    const other = usersByUid.get(otherUid);
    return {
      status: 'ready',
      errorMessage: null,
      title: other?.name ?? 'Conversa',
      photoUrl: other?.photoUrl ?? '',
      otherUid,
      group: null,
    };
  }, [conversationId, group, groupError, groupState, isGroup, myUid, usersByUid]);
}
