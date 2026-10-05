import type { NotificationPolicy } from './notification';

export type ChatGroup = {
  id: string;
  name: string;
  photoUrl: string;
  ownerId: string;
  memberIds: string[];
  memberLimit: number;
  notificationPolicy: NotificationPolicy;
  createdAt: number;
  updatedAt: number;
};

/** Campos que o proprietário pode alterar depois da criação; cada um é opcional. */
export type GroupSettingsUpdate = Partial<
  Pick<ChatGroup, 'name' | 'photoUrl' | 'memberLimit' | 'notificationPolicy'>
>;

export type CreateGroupInput = {
  name: string;
  photoUri: string | null;
  memberIds: string[];
  memberLimit: number;
  notificationPolicy: NotificationPolicy;
};
