import { ref, update } from 'firebase/database';
import {
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  query,
  runTransaction,
  setDoc,
  where,
  type Transaction,
  type Unsubscribe,
} from 'firebase/firestore';
import type { ChatGroup, CreateGroupInput, GroupSettingsUpdate } from '../types/group';
import { NOTIFICATION_POLICIES } from '../types/notification';
import { AppError } from '../utils/authErrors';
import {
  MIN_GROUP_MEMBERS,
  canAddMember,
  isGroupOwner,
  validateGroupCreation,
  validateGroupName,
  validateMemberLimit,
} from '../utils/groupValidation';
import { groupConverter } from './converters';
import { firestore, realtimeDb } from './firebase';
import { uploadImage } from './imageService';

const groupDoc = (groupId: string) => doc(firestore, 'groups', groupId).withConverter(groupConverter);

const NOT_OWNER = 'Apenas o proprietário do grupo pode realizar esta ação.';
const GROUP_NOT_FOUND = 'Grupo não encontrado.';

/**
 * Espelho no Realtime Database. As regras de segurança das mensagens não conseguem ler o Firestore,
 * então o acesso é decidido por estes nós:
 *   members/{groupId}/{uid} = true  → integrante ativo (pode ler e escrever mensagens)
 *   groupMeta/{groupId}/ownerId     → quem pode alterar `members/{groupId}`
 * O Firestore continua sendo a fonte da verdade sobre grupo, limite e integrantes.
 */
const memberPath = (groupId: string, uid: string) => `members/${groupId}/${uid}`;
const ownerPath = (groupId: string) => `groupMeta/${groupId}/ownerId`;

async function setMirrorMember(groupId: string, uid: string, present: boolean): Promise<void> {
  await update(ref(realtimeDb), { [memberPath(groupId, uid)]: present ? true : null });
}

async function readGroup(transaction: Transaction, groupId: string): Promise<ChatGroup> {
  const snapshot = await transaction.get(groupDoc(groupId));
  if (!snapshot.exists()) throw new AppError(GROUP_NOT_FOUND);
  return snapshot.data();
}

function requireOwner(group: ChatGroup, actorUid: string): void {
  if (!isGroupOwner(group, actorUid)) throw new AppError(NOT_OWNER);
}

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
    groupDoc(groupId),
    (snapshot) => onChange(snapshot.exists() ? snapshot.data() : null),
    onError,
  );
}

/** Cria o grupo (o criador é o proprietário e já integrante) e publica o espelho de acesso às mensagens. */
export async function createGroup(ownerId: string, input: CreateGroupInput): Promise<ChatGroup> {
  const memberIds = Array.from(new Set([ownerId, ...input.memberIds]));
  const validation = validateGroupCreation({
    name: input.name,
    ownerId,
    memberIds,
    memberLimit: input.memberLimit,
  });
  if (!validation.ok) throw new AppError(validation.message);

  const photoUrl = input.photoUri ? await uploadImage(input.photoUri, 'groups') : '';
  const newGroupRef = doc(collection(firestore, 'groups')).withConverter(groupConverter);
  const now = Date.now();
  const group: ChatGroup = {
    id: newGroupRef.id,
    name: input.name.trim(),
    photoUrl,
    ownerId,
    memberIds,
    memberLimit: input.memberLimit,
    notificationPolicy: input.notificationPolicy,
    createdAt: now,
    updatedAt: now,
  };

  await setDoc(newGroupRef, group);

  try {
    // Em duas etapas: as regras do RTDB só aceitam gravar `members/` depois que `groupMeta/` existe.
    await update(ref(realtimeDb), { [ownerPath(group.id)]: ownerId });
    const memberPaths: Record<string, boolean> = {};
    for (const uid of memberIds) memberPaths[memberPath(group.id, uid)] = true;
    await update(ref(realtimeDb), memberPaths);
  } catch (error) {
    // Sem o espelho ninguém conseguiria ler as mensagens; desfaz para não deixar um grupo inutilizável.
    await deleteDoc(newGroupRef).catch(() => undefined);
    throw error;
  }

  return group;
}

/**
 * Adiciona um integrante. A leitura do grupo, a checagem de proprietário/limite e a escrita acontecem
 * dentro de uma transação do Firestore: se duas adições concorrentes lerem o mesmo estado, o Firestore
 * repete a transação perdedora com o estado atualizado, então `memberIds.length` nunca passa de `memberLimit`.
 */
export async function addMember(groupId: string, uid: string, actorUid: string): Promise<void> {
  await runTransaction(firestore, async (transaction) => {
    const group = await readGroup(transaction, groupId);
    requireOwner(group, actorUid);
    const check = canAddMember(group, uid);
    if (!check.ok) throw new AppError(check.message);
    transaction.update(groupDoc(groupId), { memberIds: [...group.memberIds, uid], updatedAt: Date.now() });
  });

  try {
    await setMirrorMember(groupId, uid, true);
  } catch (error) {
    // O integrante não conseguiria ler as mensagens; reverte a entrada no Firestore.
    await removeFromFirestore(groupId, uid, actorUid).catch(() => undefined);
    throw error;
  }
}

async function removeFromFirestore(groupId: string, uid: string, actorUid: string): Promise<void> {
  await runTransaction(firestore, async (transaction) => {
    const group = await readGroup(transaction, groupId);
    requireOwner(group, actorUid);
    if (uid === group.ownerId) throw new AppError('O proprietário não pode ser removido do grupo.');
    if (!group.memberIds.includes(uid)) return;
    if (group.memberIds.length <= MIN_GROUP_MEMBERS) {
      throw new AppError(`O grupo precisa ter ao menos ${MIN_GROUP_MEMBERS} integrantes.`);
    }
    transaction.update(groupDoc(groupId), {
      memberIds: group.memberIds.filter((memberId) => memberId !== uid),
      updatedAt: Date.now(),
    });
  });
}

/**
 * Remove um integrante. O acesso às mensagens é revogado primeiro (espelho do RTDB) e só depois o
 * Firestore é atualizado; se o Firestore falhar, o acesso é restaurado.
 */
export async function removeMember(groupId: string, uid: string, actorUid: string): Promise<void> {
  if (uid === actorUid) throw new AppError('O proprietário não pode ser removido do grupo.');

  await setMirrorMember(groupId, uid, false);
  try {
    await removeFromFirestore(groupId, uid, actorUid);
  } catch (error) {
    await setMirrorMember(groupId, uid, true).catch(() => undefined);
    throw error;
  }
}

/** Atualiza nome, foto, limite e/ou política de notificações (somente o proprietário). */
export async function updateGroupSettings(
  groupId: string,
  actorUid: string,
  changes: GroupSettingsUpdate,
): Promise<void> {
  await runTransaction(firestore, async (transaction) => {
    const group = await readGroup(transaction, groupId);
    requireOwner(group, actorUid);

    const updates: Record<string, string | number> = {};

    if (changes.name !== undefined) {
      const nameCheck = validateGroupName(changes.name);
      if (!nameCheck.ok) throw new AppError(nameCheck.message);
      updates.name = changes.name.trim();
    }
    if (changes.photoUrl !== undefined) updates.photoUrl = changes.photoUrl;
    if (changes.memberLimit !== undefined) {
      // Valida contra os integrantes lidos nesta transação, não contra o que a tela mostrava.
      const limitCheck = validateMemberLimit(changes.memberLimit, group.memberIds.length);
      if (!limitCheck.ok) throw new AppError(limitCheck.message);
      updates.memberLimit = changes.memberLimit;
    }
    if (changes.notificationPolicy !== undefined) {
      if (!NOTIFICATION_POLICIES.includes(changes.notificationPolicy)) {
        throw new AppError('Política de notificações inválida.');
      }
      updates.notificationPolicy = changes.notificationPolicy;
    }

    transaction.update(groupDoc(groupId), { ...updates, updatedAt: Date.now() });
  });
}
