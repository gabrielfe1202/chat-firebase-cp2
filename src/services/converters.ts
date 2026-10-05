import type { DocumentData, FirestoreDataConverter, QueryDocumentSnapshot } from 'firebase/firestore';
import type { DirectConversation } from '../types/chat';
import type { ChatGroup } from '../types/group';
import type { DeviceToken, DevicePlatform } from '../types/notification';
import type { ChatUser, PublicProfile } from '../types/user';
import { readBoolean, readNumber, readPolicy, readString, readStringArray } from '../utils/parsers';

/** `uid`/`id` vêm do ID do documento e não são gravados no corpo. */
export const userConverter: FirestoreDataConverter<ChatUser> = {
  toFirestore: ({ uid: _uid, ...data }: ChatUser): DocumentData => data,
  fromFirestore: (snapshot: QueryDocumentSnapshot): ChatUser => {
    const data = snapshot.data();
    return {
      uid: snapshot.id,
      name: readString(data.name),
      email: readString(data.email),
      phoneNumber: readString(data.phoneNumber),
      birthDate: readString(data.birthDate),
      photoUrl: readString(data.photoUrl),
      createdAt: readNumber(data.createdAt),
    };
  },
};

export const publicProfileConverter: FirestoreDataConverter<PublicProfile> = {
  toFirestore: ({ uid: _uid, ...data }: PublicProfile): DocumentData => data,
  fromFirestore: (snapshot: QueryDocumentSnapshot): PublicProfile => {
    const data = snapshot.data();
    return {
      uid: snapshot.id,
      name: readString(data.name),
      photoUrl: readString(data.photoUrl),
    };
  },
};

export const groupConverter: FirestoreDataConverter<ChatGroup> = {
  toFirestore: ({ id: _id, ...data }: ChatGroup): DocumentData => data,
  fromFirestore: (snapshot: QueryDocumentSnapshot): ChatGroup => {
    const data = snapshot.data();
    return {
      id: snapshot.id,
      name: readString(data.name),
      photoUrl: readString(data.photoUrl),
      ownerId: readString(data.ownerId),
      memberIds: readStringArray(data.memberIds),
      memberLimit: readNumber(data.memberLimit),
      notificationPolicy: readPolicy(data.notificationPolicy),
      createdAt: readNumber(data.createdAt),
      updatedAt: readNumber(data.updatedAt),
    };
  },
};

/** O Firestore guarda `participantIds`; o app usa a tupla `participants`. */
export const directConversationConverter: FirestoreDataConverter<DirectConversation> = {
  toFirestore: (model: DirectConversation): DocumentData => ({
    participantIds: [...model.participants],
    createdAt: model.createdAt,
  }),
  fromFirestore: (snapshot: QueryDocumentSnapshot): DirectConversation => {
    const data = snapshot.data();
    const [first = '', second = ''] = readStringArray(data.participantIds);
    return {
      id: snapshot.id,
      type: 'direct',
      participants: [first, second],
      createdAt: readNumber(data.createdAt),
    };
  },
};

function readPlatform(value: unknown): DevicePlatform {
  return value === 'ios' ? 'ios' : 'android';
}

export const deviceTokenConverter: FirestoreDataConverter<DeviceToken> = {
  toFirestore: ({ deviceId: _deviceId, ...data }: DeviceToken): DocumentData => data,
  fromFirestore: (snapshot: QueryDocumentSnapshot): DeviceToken => {
    const data = snapshot.data();
    return {
      deviceId: snapshot.id,
      token: readString(data.token),
      platform: readPlatform(data.platform),
      enabled: readBoolean(data.enabled, true),
      updatedAt: readNumber(data.updatedAt),
    };
  },
};
