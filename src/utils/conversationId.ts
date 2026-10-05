const SEPARATOR = '_';

/** ID determinístico: o mesmo par de uids gera sempre o mesmo ID, evitando conversas duplicadas. */
export function getDirectConversationId(uidA: string, uidB: string): string {
  if (!uidA || !uidB) {
    throw new Error('Os dois usuários precisam estar identificados.');
  }
  if (uidA === uidB) {
    throw new Error('Não é possível conversar consigo mesmo.');
  }
  return [uidA, uidB].sort().join(SEPARATOR);
}

export function getDirectParticipants(uidA: string, uidB: string): [string, string] {
  const [first, second] = [uidA, uidB].sort();
  return [first, second];
}

/** Extrai o uid do outro participante a partir do ID da conversa direta; null se o usuário não faz parte. */
export function getOtherUidFromDirectId(conversationId: string, myUid: string): string | null {
  const parts = conversationId.split(SEPARATOR);
  if (parts.length !== 2) return null;
  const [first, second] = parts;
  return getOtherParticipant([first, second], myUid);
}

/** Retorna o uid do outro participante ou null se o usuário não pertence à conversa. */
export function getOtherParticipant(
  participants: readonly [string, string],
  myUid: string,
): string | null {
  const [first, second] = participants;
  if (myUid === first) return second;
  if (myUid === second) return first;
  return null;
}
