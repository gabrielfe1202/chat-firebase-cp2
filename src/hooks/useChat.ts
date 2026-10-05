import { useCallback, useEffect, useState } from 'react';
import { listenMessages, sendMessage } from '../services/chatService';
import { requestPushForMessage } from '../services/pushApi';
import type { ChatMessage, ConversationType, MessageTarget } from '../types/chat';
import { getErrorMessage } from '../utils/authErrors';

type ChatState = {
  messages: ChatMessage[];
  loading: boolean;
  error: string | null;
};

type UseChatResult = ChatState & {
  sendError: string | null;
  /** A mensagem foi gravada, mas a API não conseguiu disparar a notificação. */
  pushError: string | null;
  dismissPushError: () => void;
  /** Envia a mensagem; devolve false quando a gravação falha (o erro fica em `sendError`). */
  send: (text: string, target: MessageTarget, mentionedUserIds: string[]) => Promise<boolean>;
  dismissSendError: () => void;
};

/**
 * Mantém o listener das mensagens da conversa aberta e expõe o envio.
 * O listener é recriado quando a conversa muda e removido ao desmontar a tela.
 */
export function useChat(
  conversationId: string,
  conversationType: ConversationType,
  myUid: string,
  enabled: boolean,
): UseChatResult {
  const [state, setState] = useState<ChatState>({ messages: [], loading: true, error: null });
  const [sendError, setSendError] = useState<string | null>(null);
  const [pushError, setPushError] = useState<string | null>(null);

  useEffect(() => {
    if (!enabled) return undefined;
    setState({ messages: [], loading: true, error: null });
    setSendError(null);
    setPushError(null);

    return listenMessages(
      conversationId,
      (messages) => setState({ messages, loading: false, error: null }),
      (error) => setState({ messages: [], loading: false, error: getErrorMessage(error) }),
    );
  }, [conversationId, enabled]);

  const send = useCallback(
    async (text: string, target: MessageTarget, mentionedUserIds: string[]): Promise<boolean> => {
      setSendError(null);
      try {
        const messageId = await sendMessage({
          conversationId,
          conversationType,
          senderId: myUid,
          text,
          target,
          mentionedUserIds,
        });

        // Só depois de persistida a mensagem a API é acionada. Falha no push não desfaz o envio.
        setPushError(null);
        requestPushForMessage(conversationId, messageId).catch((error: unknown) =>
          setPushError(getErrorMessage(error)),
        );
        return true;
      } catch (error) {
        setSendError(getErrorMessage(error));
        return false;
      }
    },
    [conversationId, conversationType, myUid],
  );

  const dismissSendError = useCallback(() => setSendError(null), []);
  const dismissPushError = useCallback(() => setPushError(null), []);

  return { ...state, sendError, pushError, send, dismissSendError, dismissPushError };
}
