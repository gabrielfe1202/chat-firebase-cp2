export type NotificationPolicy =
  | 'all_group_messages'
  | 'mentioned_members'
  | 'direct_messages_only'
  | 'disabled';

export const NOTIFICATION_POLICIES: readonly NotificationPolicy[] = [
  'all_group_messages',
  'mentioned_members',
  'direct_messages_only',
  'disabled',
];

export type NotificationSettings = {
  conversationId: string;
  policy: NotificationPolicy;
  updatedBy: string;
  updatedAt: number;
};

export type DevicePlatform = 'android' | 'ios';

export type DeviceToken = {
  deviceId: string;
  token: string;
  platform: DevicePlatform;
  enabled: boolean;
  updatedAt: number;
};

/** Campos mínimos do `data` do push; o FCM só aceita valores string. */
export type NotificationPayload = {
  conversationId: string;
  conversationType: 'direct' | 'group';
};

/** Corpo enviado à API: os destinatários são sempre calculados no servidor. */
export type PushRequestBody = {
  conversationId: string;
  messageId: string;
};

export type PushUnavailableReason = 'not-a-device' | 'no-token' | 'error';

/** Resultado do registro do aparelho para receber push. */
export type PushRegistrationResult =
  | { status: 'registered' }
  | { status: 'denied'; canAskAgain: boolean }
  | { status: 'unavailable'; reason: PushUnavailableReason };

export type PushState = PushRegistrationResult | { status: 'idle' } | { status: 'registering' };
