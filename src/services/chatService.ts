import { ref, update } from 'firebase/database';
import { doc, runTransaction } from 'firebase/firestore';
import type { DirectConversation } from '../types/chat';
import { AppError } from '../utils/authErrors';
import { getDirectConversationId, getDirectParticipants } from '../utils/conversationId';
import { directConversationConverter } from './converters';
import { firestore, realtimeDb } from './firebase';

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
