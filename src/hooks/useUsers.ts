import { useEffect, useMemo, useState } from 'react';
import { observePublicProfiles } from '../services/userService';
import type { PublicProfile } from '../types/user';
import { getErrorMessage } from '../utils/authErrors';

type UsersState = {
  users: PublicProfile[];
  loading: boolean;
  error: string | null;
};

type UsersResult = UsersState & {
  /** Índice por uid, para resolver nomes e fotos (autores de mensagens, integrantes). */
  byUid: ReadonlyMap<string, PublicProfile>;
};

/** Lista os usuários cadastrados em tempo real; o listener é removido ao desmontar a tela. */
export function useUsers(): UsersResult {
  const [state, setState] = useState<UsersState>({ users: [], loading: true, error: null });

  useEffect(() => {
    return observePublicProfiles(
      (users) => setState({ users, loading: false, error: null }),
      (error) => setState({ users: [], loading: false, error: getErrorMessage(error) }),
    );
  }, []);

  const byUid = useMemo(() => new Map(state.users.map((user) => [user.uid, user])), [state.users]);

  return { ...state, byUid };
}
