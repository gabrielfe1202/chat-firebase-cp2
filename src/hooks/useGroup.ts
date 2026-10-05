import { useEffect, useState } from 'react';
import { observeGroup } from '../services/groupService';
import type { ChatGroup } from '../types/group';
import { getErrorMessage } from '../utils/authErrors';

type GroupState = {
  group: ChatGroup | null;
  loading: boolean;
  error: string | null;
};

const NOT_FOUND = 'Grupo não encontrado.';

/** Observa um grupo em tempo real. Sem `groupId` (criação), não abre listener. */
export function useGroup(groupId: string | undefined): GroupState {
  const [state, setState] = useState<GroupState>({ group: null, loading: Boolean(groupId), error: null });

  useEffect(() => {
    if (!groupId) {
      setState({ group: null, loading: false, error: null });
      return undefined;
    }
    setState({ group: null, loading: true, error: null });

    return observeGroup(
      groupId,
      (group) => setState({ group, loading: false, error: group ? null : NOT_FOUND }),
      (error) => setState({ group: null, loading: false, error: getErrorMessage(error) }),
    );
  }, [groupId]);

  return state;
}
