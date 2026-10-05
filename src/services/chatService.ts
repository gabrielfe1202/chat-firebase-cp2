import {
  limitToLast,
  onValue,
  push,
  query as databaseQuery,
  ref,
  serverTimestamp,
  set,
  update,
  type Unsubscribe as DatabaseUnsubscribe,
} from 'firebase/database';
import {
  collection,
  doc,
  onSnapshot,
  query,
  runTransaction,
  where,
  type Unsubscribe,
} from 'firebase/firestore';
import { MAX_MESSAGE_LENGTH, type ChatMessage, type DirectConversation, type SendMessageInput } from '../types/chat';
import { AppError } from '../utils/authErrors';
import { getDirectConversationId, getDirectParticipants } from '../utils/conversationId';
import { parseMessage, toMessageRecord } from '../utils/messageMapper';
import { directConversationConverter } from './converters';
import { firestore, realtimeDb } from './firebase';

/** Quantidade de mensagens mais recentes mantidas no listener da conversa aberta. */
export const MESSAGES_LIMIT = 100;

/**
 * Cria (ou localiza) a conversa individual entre dois usuários.
 * O ID é derivado dos dois uids ordenados, então o mesmo par nunca gera duas conversas;
 * a transação evita criação duplicada quando os dois lados abrem a conversa ao mesmo tempo.
 */
export async function getOrCreateDirectConversation(
  myUid: string,
  otherUid: string,
): Promise<DirectConversation> {
  if (myUid === otherUid) throw new AppError('Não é possível conversar consigo mesmo.');

  const id = getDirectConversationId(myUid, otherUid);
  const conversationRef = doc(firestore, 'directConversations', id).withConverter(directConversationConverter);

  const conversation = await runTransaction(firestore, async (transaction) => {
    const snapshot = await transaction.get(conversationRef);
    if (snapshot.exists()) return snapshot.data();

    const created: DirectConversation = {
      id,
      type: 'direct',
      participants: getDirectParticipants(myUid, otherUid),
      createdAt: Date.now(),
    };
    transaction.set(conversationRef, created);
    return created;
  });

  // Espelho de participantes no Realtime Database: as regras de segurança das mensagens
  // não conseguem ler o Firestore e usam este nó para saber quem pode ler/escrever.
  await update(ref(realtimeDb), {
    [`members/${id}/${myUid}`]: true,
    [`members/${id}/${otherUid}`]: true,
  });

  return conversation;
}

/** Observa em tempo real as conversas individuais em que o usuário é participante. */
export function observeDirectConversations(
  uid: string,
  onChange: (conversations: DirectConversation[]) => void,
  onError: (error: Error) => void,
): Unsubscribe {
  const conversationsQuery = query(
    collection(firestore, 'directConversations').withConverter(directConversationConverter),
    where('participantIds', 'array-contains', uid),
  );
  return onSnapshot(
    conversationsQuery,
    (snapshot) => onChange(snapshot.docs.map((document) => document.data())),
    onError,
  );
}

/**
 * Persiste a mensagem no Realtime Database e devolve o ID gerado.
 * A promise só resolve quando o servidor confirma a gravação; falhas (permissão, rede) rejeitam.
 */
export async function sendMessage(input: SendMessageInput): Promise<string> {
  const text = input.text.trim();
  if (text.length === 0) throw new AppError('Digite uma mensagem.');
  if (text.length > MAX_MESSAGE_LENGTH) {
    throw new AppError(`A mensagem deve ter no máximo ${MAX_MESSAGE_LENGTH} caracteres.`);
  }

  const messageRef = push(ref(realtimeDb, `messages/${input.conversationId}`));
  const messageId = messageRef.key;
  if (!messageId) throw new AppError('Não foi possível gerar o identificador da mensagem.');

  await set(messageRef, toMessageRecord({ ...input, text }, serverTimestamp()));
  return messageId;
}

/**
 * Escuta as mensagens mais recentes da conversa em tempo real.
 * Devolve a função que remove o listener; deve ser chamada ao desmontar a tela ou trocar de conversa.
 */
export function listenMessages(
  conversationId: string,
  onChange: (messages: ChatMessage[]) => void,
  onError: (error: Error) => void,
): DatabaseUnsubscribe {
  // As chaves geradas por push() são cronológicas, então a ordem padrão por chave já é a ordem de envio.
  const messagesQuery = databaseQuery(
    ref(realtimeDb, `messages/${conversationId}`),
    limitToLast(MESSAGES_LIMIT),
  );

  return onValue(
    messagesQuery,
    (snapshot) => {
      const messages: ChatMessage[] = [];
      snapshot.forEach((child) => {
        const message = child.key ? parseMessage(child.key, conversationId, child.val()) : null;
        if (message) messages.push(message);
      });
      onChange(messages);
    },
    onError,
  );
}
