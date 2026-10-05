import type {
  ConversationRecord,
  ConversationType,
  DeviceRecord,
  MessageTarget,
  NotificationPolicy,
  PublicUserProfile,
  StoredMessage,
} from '../types';
import { adminDatabase, adminFirestore } from './firebaseAdmin';
import type { NotificationPorts } from './notificationProcessor';
import { sendPush } from './notificationSender';
import { isRecord, readNumber, readString, readStringArray } from './readers';

/** Reservas "em andamento" mais antigas que isto são consideradas abandonadas e podem ser retomadas. */
const STALE_CLAIM_MS = 60_000;

const POLICIES: readonly NotificationPolicy[] = [
  'all_group_messages',
  'mentioned_members',
  'direct_messages_only',
  'disabled',
];

const pairId = (a: string, b: string): string => (a < b ? `${a}_${b}` : `${b}_${a}`);

function parseTarget(value: unknown): MessageTarget {
  if (isRecord(value) && value.type === 'member') {
    const memberId = readString(value.memberId);
    if (memberId) return { type: 'member', memberId };
  }
  return { type: 'conversation' };
}

function parseMessage(raw: unknown): StoredMessage | null {
  if (!isRecord(raw)) return null;
  const senderId = readString(raw.senderId);
  if (!senderId) return null;
  return {
    senderId,
    conversationType: raw.conversationType === 'group' ? 'group' : 'direct',
    target: parseTarget(raw.target),
    mentionedUserIds: readStringArray(raw.mentionedUserIds),
    createdAt: readNumber(raw.createdAt),
  };
}

export const firebaseNotificationPorts: NotificationPorts = {
  async readMessage(conversationId, messageId) {
    const snapshot = await adminDatabase().ref(`messages/${conversationId}/${messageId}`).get();
    return snapshot.exists() ? parseMessage(snapshot.val()) : null;
  },

  async readConversation(conversationId: string, type: ConversationType): Promise<ConversationRecord | null> {
    const db = adminFirestore();
    if (type === 'direct') {
      const snapshot = await db.collection('directConversations').doc(conversationId).get();
      if (!snapshot.exists) return null;
      return { type: 'direct', participantIds: readStringArray(snapshot.get('participantIds')) };
    }

    const snapshot = await db.collection('groups').doc(conversationId).get();
    if (!snapshot.exists) return null;
    const policy = readString(snapshot.get('notificationPolicy'));
    return {
      type: 'group',
      name: readString(snapshot.get('name')),
      memberIds: readStringArray(snapshot.get('memberIds')),
      // Política desconhecida cai no mais restritivo: melhor não notificar do que notificar errado.
      policy: POLICIES.find((candidate) => candidate === policy) ?? 'disabled',
    };
  },

  async getDevices(uids) {
    const db = adminFirestore();
    const perUser = await Promise.all(
      uids.map(async (uid): Promise<DeviceRecord[]> => {
        const snapshot = await db.collection('users').doc(uid).collection('devices').where('enabled', '==', true).get();
        return snapshot.docs
          .map((document) => ({ uid, deviceId: document.id, token: readString(document.get('token')) }))
          .filter((device) => device.token.length > 0);
      }),
    );
    return perUser.flat();
  },

  async getDisplayName(uid) {
    const snapshot = await adminFirestore().collection('publicProfiles').doc(uid).get();
    return readString(snapshot.get('name'));
  },

  async claim(key) {
    const db = adminFirestore();
    const ref = db.collection('notificationLogs').doc(key);
    return db.runTransaction(async (transaction) => {
      const snapshot = await transaction.get(ref);
      const now = Date.now();
      if (snapshot.exists) {
        const status = readString(snapshot.get('status'));
        const startedAt = readNumber(snapshot.get('startedAt'));
        if (status === 'sent' || (status === 'processing' && now - startedAt < STALE_CLAIM_MS)) {
          return 'duplicate';
        }
      }
      transaction.set(ref, { status: 'processing', startedAt: now });
      return 'claimed';
    });
  },

  async finish(key, { recipients, delivered }) {
    await adminFirestore()
      .collection('notificationLogs')
      .doc(key)
      .set({ status: 'sent', finishedAt: Date.now(), recipients, delivered }, { merge: true });
  },

  async release(key) {
    await adminFirestore().collection('notificationLogs').doc(key).delete();
  },

  send: sendPush,

  async removeDevices(devices) {
    const db = adminFirestore();
    const batch = db.batch();
    for (const device of devices) {
      batch.delete(db.collection('users').doc(device.uid).collection('devices').doc(device.deviceId));
    }
    await batch.commit();
  },
};

/** Acesso aos perfis completos, com a checagem de vínculo que as regras do Firestore não conseguem fazer. */
export interface ProfilePorts {
  /** Verdadeiro se `requester` e `target` compartilham uma conversa individual ou um grupo. */
  shareConversation(requester: string, target: string): Promise<boolean>;
  getProfile(uid: string): Promise<PublicUserProfile | null>;
}

export const firebaseProfilePorts: ProfilePorts = {
  async shareConversation(requester, target) {
    const db = adminFirestore();
    const direct = await db.collection('directConversations').doc(pairId(requester, target)).get();
    if (direct.exists) return true;

    const groups = await db.collection('groups').where('memberIds', 'array-contains', requester).get();
    return groups.docs.some((group) => readStringArray(group.get('memberIds')).includes(target));
  },

  async getProfile(uid) {
    const snapshot = await adminFirestore().collection('users').doc(uid).get();
    if (!snapshot.exists) return null;
    return {
      uid,
      name: readString(snapshot.get('name')),
      email: readString(snapshot.get('email')),
      phoneNumber: readString(snapshot.get('phoneNumber')),
      birthDate: readString(snapshot.get('birthDate')),
      photoUrl: readString(snapshot.get('photoUrl')),
      createdAt: readNumber(snapshot.get('createdAt')),
    };
  },
};

/** Registro de aparelhos feito pela API para garantir que um token pertença a um único usuário. */
export interface DevicePorts {
  registerDevice(uid: string, deviceId: string, token: string, platform: 'android' | 'ios'): Promise<void>;
}

export const firebaseDevicePorts: DevicePorts = {
  async registerDevice(uid, deviceId, token, platform) {
    const db = adminFirestore();
    const target = db.collection('users').doc(uid).collection('devices').doc(deviceId);

    // Um aparelho pode trocar de conta: o mesmo token em outro usuário (ou outro documento) é removido.
    const sameToken = await db.collectionGroup('devices').where('token', '==', token).get();
    const batch = db.batch();
    for (const document of sameToken.docs) {
      if (document.ref.path !== target.path) batch.delete(document.ref);
    }
    batch.set(target, { token, platform, enabled: true, updatedAt: Date.now() });
    await batch.commit();
  },
};
