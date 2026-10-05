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
import { isRecord, readNumber, readString } from '../utils/parsers';
import { ApiError, apiRequest } from './apiClient';
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

function isPermissionDenied(error: unknown): boolean {
  return typeof error === 'object' && error !== null && 'code' in error && error.code === 'permission-denied';
}

/** Perfil completo via API, que confere o vínculo (conversa individual ou grupo em comum) nos dois bancos. */
async function getProfileViaApi(uid: string): Promise<ChatUser | null> {
  try {
    const data = await apiRequest('GET', `/users/${encodeURIComponent(uid)}/profile`);
    if (!isRecord(data)) return null;
    return {
      uid,
      name: readString(data.name),
      email: readString(data.email),
      phoneNumber: readString(data.phoneNumber),
      birthDate: readString(data.birthDate),
      photoUrl: readString(data.photoUrl),
      createdAt: readNumber(data.createdAt),
    };
  } catch (error) {
    // 403/404: sem vínculo ou perfil inexistente — a tela mostra "perfil indisponível".
    if (error instanceof ApiError && (error.status === 403 || error.status === 404)) return null;
    throw error;
  }
}

/**
 * Perfil completo. O Firestore libera o próprio perfil e o de quem tem conversa individual conosco;
 * para colegas de grupo as regras não conseguem provar o vínculo, então a consulta passa pela API.
 */
export async function getUserProfile(uid: string): Promise<ChatUser | null> {
  try {
    const snapshot = await getDoc(userRef(uid));
    return snapshot.exists() ? snapshot.data() : null;
  } catch (error) {
    if (isPermissionDenied(error)) return getProfileViaApi(uid);
    throw error;
  }
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
