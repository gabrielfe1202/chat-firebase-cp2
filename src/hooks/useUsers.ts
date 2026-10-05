import { useEffect, useState } from 'react';
import { observePublicProfiles } from '../services/userService';
import type { PublicProfile } from '../types/user';
import { getErrorMessage } from '../utils/authErrors';

type UsersState = {
  users: PublicProfile[];
  loading: boolean;
  error: string | null;
};

/** Lista os usuários cadastrados em tempo real; o listener é removido ao desmontar a tela. */
export function useUsers(): UsersState {
  const [state, setState] = useState<UsersState>({ users: [], loading: true, error: null });

  useEffect(() => {
    return observePublicProfiles(
      (users) => setState({ users, loading: false, error: null }),
      (error) => setState({ users: [], loading: false, error: getErrorMessage(error) }),
    );
  }, []);

  return state;
}
