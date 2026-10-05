import {
  collection,
  doc,
  onSnapshot,
  query,
  where,
  type Unsubscribe,
} from 'firebase/firestore';
import type { ChatGroup } from '../types/group';
import { groupConverter } from './converters';
import { firestore } from './firebase';

const groupRef = (groupId: string) => doc(firestore, 'groups', groupId).withConverter(groupConverter);

/** Observa em tempo real os grupos dos quais o usuário é integrante. */
export function observeUserGroups(
  uid: string,
  onChange: (groups: ChatGroup[]) => void,
  onError: (error: Error) => void,
): Unsubscribe {
  const groupsQuery = query(
    collection(firestore, 'groups').withConverter(groupConverter),
    where('memberIds', 'array-contains', uid),
  );
  return onSnapshot(
    groupsQuery,
    (snapshot) => onChange(snapshot.docs.map((document) => document.data())),
    onError,
  );
}

/** Observa um grupo; `null` quando ele não existe. Erros de permissão chegam por `onError`. */
export function observeGroup(
  groupId: string,
  onChange: (group: ChatGroup | null) => void,
  onError: (error: Error) => void,
): Unsubscribe {
  return onSnapshot(
    groupRef(groupId),
    (snapshot) => onChange(snapshot.exists() ? snapshot.data() : null),
    onError,
  );
}
