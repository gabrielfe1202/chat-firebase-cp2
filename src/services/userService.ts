import { doc, getDoc, onSnapshot, setDoc, type Unsubscribe } from 'firebase/firestore';
import type { ChatUser } from '../types/user';
import { userConverter } from './converters';
import { firestore } from './firebase';

const userRef = (uid: string) => doc(firestore, 'users', uid).withConverter(userConverter);

export async function saveUserProfile(user: ChatUser): Promise<void> {
  await setDoc(userRef(user.uid), user);
}

export async function getUserProfile(uid: string): Promise<ChatUser | null> {
  const snapshot = await getDoc(userRef(uid));
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
