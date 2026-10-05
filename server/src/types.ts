export type NotificationPolicy =
  | 'all_group_messages'
  | 'mentioned_members'
  | 'direct_messages_only'
  | 'disabled';

export type ConversationType = 'direct' | 'group';

export type MessageTarget = { type: 'conversation' } | { type: 'member'; memberId: string };

/** Mensagem como gravada no Realtime Database (sem o ID, que faz parte do caminho). */
export type StoredMessage = {
  senderId: string;
  conversationType: ConversationType;
  target: MessageTarget;
  mentionedUserIds: string[];
  createdAt: number;
};

/** Conversa como gravada no Firestore, reduzida ao que a API precisa. */
export type ConversationRecord =
  | { type: 'direct'; participantIds: string[] }
  | { type: 'group'; name: string; memberIds: string[]; policy: NotificationPolicy };

/** Token de um aparelho (documento em `users/{uid}/devices/{deviceId}`). */
export type DeviceRecord = {
  uid: string;
  deviceId: string;
  token: string;
};

export type PushPayload = {
  title: string;
  body: string;
  /** O FCM só aceita valores string em `data`. */
  data: { conversationId: string; conversationType: ConversationType };
};

export type SendResult = {
  delivered: number;
  /** Tokens rejeitados como inválidos/expirados; o processador os remove. */
  invalidDevices: DeviceRecord[];
};

export type PublicUserProfile = {
  uid: string;
  name: string;
  email: string;
  phoneNumber: string;
  birthDate: string;
  photoUrl: string;
  createdAt: number;
};
