import { createContext, useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { User } from 'firebase/auth';
import * as authService from '../services/authService';
import { unregisterDevice } from '../services/notificationService';
import { observeUserProfile } from '../services/userService';
import type { LoginInput, RegisterInput, ChatUser } from '../types/user';

/**
 * - loading: ainda recuperando a sessão salva;
 * - unauthenticated: sem usuário logado;
 * - profile-pending: autenticado, aguardando o perfil do Firestore (ex.: logo após o cadastro);
 * - authenticated: sessão e perfil disponíveis.
 */
export type AuthStatus = 'loading' | 'unauthenticated' | 'profile-pending' | 'authenticated';

export type AuthContextValue = {
  status: AuthStatus;
  firebaseUser: User | null;
  profile: ChatUser | null;
  signIn: (input: LoginInput) => Promise<void>;
  signUp: (input: RegisterInput) => Promise<void>;
  signOut: () => Promise<void>;
};

export const AuthContext = createContext<AuthContextValue | null>(null);

type Props = { children: ReactNode };

export function AuthProvider({ children }: Props) {
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<ChatUser | null>(null);
  const [sessionResolved, setSessionResolved] = useState(false);

  // Recupera e acompanha a sessão.
  useEffect(() => {
    return authService.observeAuth((user) => {
      setFirebaseUser(user);
      if (!user) setProfile(null);
      setSessionResolved(true);
    });
  }, []);

  // Escuta o perfil enquanto houver usuário; o listener é removido no logout ou na troca de usuário.
  const uid = firebaseUser?.uid ?? null;
  useEffect(() => {
    if (!uid) return undefined;
    return observeUserProfile(
      uid,
      setProfile,
      () => setProfile(null),
    );
  }, [uid]);

  const signIn = useCallback((input: LoginInput) => authService.login(input), []);
  const signUp = useCallback((input: RegisterInput) => authService.register(input), []);
  const signOut = useCallback(async () => {
    // Antes de encerrar a sessão (ainda com permissão), remove o token deste aparelho para que
    // o usuário que saiu não continue recebendo push aqui. Falha de rede não impede o logout.
    if (uid) await unregisterDevice(uid).catch(() => undefined);
    await authService.logout();
  }, [uid]);

  const status: AuthStatus = useMemo(() => {
    if (!sessionResolved) return 'loading';
    if (!firebaseUser) return 'unauthenticated';
    return profile ? 'authenticated' : 'profile-pending';
  }, [sessionResolved, firebaseUser, profile]);

  const value = useMemo<AuthContextValue>(
    () => ({ status, firebaseUser, profile, signIn, signUp, signOut }),
    [status, firebaseUser, profile, signIn, signUp, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
