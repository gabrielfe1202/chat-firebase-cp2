import {
  collection,
  doc,
  getDoc,
  onSnapshot,
  orderBy,
  query,
  writeBatch,
  type Unsubscribe,
} from 'firebase/firestore';
import type { ChatUser, PublicProfile } from '../types/user';
import { publicProfileConverter, userConverter } from './converters';
import { firestore } from './firebase';

const userRef = (uid: string) => doc(firestore, 'users', uid).withConverter(userConverter);
const publicProfileRef = (uid: string) =>
  doc(firestore, 'publicProfiles', uid).withConverter(publicProfileConverter);

/** Grava o perfil completo e o perfil público na mesma operação atômica. */
export async function saveUserProfile(user: ChatUser): Promise<void> {
  const batch = writeBatch(firestore);
  batch.set(userRef(user.uid), user);
  batch.set(publicProfileRef(user.uid), { uid: user.uid, name: user.name, photoUrl: user.photoUrl });
  await batch.commit();
}

/** Perfil completo; só é legível para o próprio usuário ou para quem compartilha conversa/grupo. */
export async function getUserProfile(uid: string): Promise<ChatUser | null> {
  const snapshot = await getDoc(userRef(uid));
  return snapshot.exists() ? snapshot.data() : null;
}

export async function getPublicProfile(uid: string): Promise<PublicProfile | null> {
  const snapshot = await getDoc(publicProfileRef(uid));
  return snapshot.exists() ? snapshot.data() : null;
}

/** Observa o perfil em tempo real; devolve a função que remove o listener. */
export function observeUserProfile(
  uid: string,
  onChange: (user: ChatUser | null) => void,
  onError: (error: Error) => void,
): Unsubscribe {
  return onSnapshot(
    userRef(uid),
    (snapshot) => onChange(snapshot.exists() ? snapshot.data() : null),
    onError,
  );
}

/** Observa a lista de usuários cadastrados (perfis públicos), ordenada por nome. */
export function observePublicProfiles(
  onChange: (profiles: PublicProfile[]) => void,
  onError: (error: Error) => void,
): Unsubscribe {
  const profilesQuery = query(
    collection(firestore, 'publicProfiles').withConverter(publicProfileConverter),
    orderBy('name'),
  );
  return onSnapshot(
    profilesQuery,
    (snapshot) => onChange(snapshot.docs.map((document) => document.data())),
    onError,
  );
}
