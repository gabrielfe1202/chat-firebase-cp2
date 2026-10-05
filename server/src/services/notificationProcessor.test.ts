import assert from 'node:assert/strict';
import { beforeEach, describe, it } from 'node:test';
import type { ConversationRecord, DeviceRecord, PushPayload, SendResult, StoredMessage } from '../types';
import {
  HttpError,
  buildPayload,
  notificationKey,
  processMessageNotification,
  type NotificationPorts,
} from './notificationProcessor';

type Fake = NotificationPorts & {
  sent: { devices: DeviceRecord[]; payload: PushPayload }[];
  removed: DeviceRecord[];
  claims: Set<string>;
  failNextSend: boolean;
};

function createFake(
  message: StoredMessage | null,
  conversation: ConversationRecord | null,
  devices: DeviceRecord[],
  result: Partial<SendResult> = {},
): Fake {
  const fake: Fake = {
    sent: [],
    removed: [],
    claims: new Set(),
    failNextSend: false,
    readMessage: async () => message,
    readConversation: async () => conversation,
    getDevices: async (uids) => devices.filter((device) => uids.includes(device.uid)),
    getDisplayName: async () => 'Ana',
    claim: async (key) => {
      if (fake.claims.has(key)) return 'duplicate';
      fake.claims.add(key);
      return 'claimed';
    },
    finish: async () => undefined,
    release: async (key) => {
      fake.claims.delete(key);
    },
    send: async (targets, payload) => {
      if (fake.failNextSend) {
        fake.failNextSend = false;
        throw new Error('FCM indisponível');
      }
      fake.sent.push({ devices: [...targets], payload });
      return { delivered: targets.length, invalidDevices: [], ...result };
    },
    removeDevices: async (targets) => {
      fake.removed.push(...targets);
    },
  };
  return fake;
}

const groupConversation = (policy: 'all_group_messages' | 'mentioned_members' | 'disabled'): ConversationRecord => ({
  type: 'group',
  name: 'Turma',
  memberIds: ['ana', 'bia', 'caio'],
  policy,
});

const groupMessage: StoredMessage = {
  senderId: 'ana',
  conversationType: 'group',
  target: { type: 'conversation' },
  mentionedUserIds: [],
  createdAt: 1,
};

const devices: DeviceRecord[] = [
  { uid: 'ana', deviceId: 'd-ana', token: 'tok-ana' },
  { uid: 'bia', deviceId: 'd-bia', token: 'tok-bia' },
  { uid: 'caio', deviceId: 'd-caio', token: 'tok-caio' },
];

const input = { uid: 'ana', conversationId: 'g1', messageId: 'm1' };
const uidsOf = (list: DeviceRecord[]): string[] => list.map((device) => device.uid).sort();

describe('processMessageNotification', () => {
  let fake: Fake;
  beforeEach(() => {
    fake = createFake(groupMessage, groupConversation('all_group_messages'), devices);
  });

  it('envia só aos destinatários calculados no servidor, sem o remetente', async () => {
    const result = await processMessageNotification(fake, input);
    assert.deepEqual(result, { status: 'sent', recipients: 2, delivered: 2 });
    assert.deepEqual(uidsOf(fake.sent[0].devices), ['bia', 'caio']);
  });

  it('inclui conversationId e conversationType no payload e não expõe o texto', async () => {
    await processMessageNotification(fake, input);
    const { payload } = fake.sent[0];
    assert.deepEqual(payload.data, { conversationId: 'g1', conversationType: 'group' });
    assert.equal(payload.title, 'Turma');
    assert.equal(payload.body, 'Ana enviou uma mensagem');
  });

  it('é idempotente: repetir a chamada não envia de novo', async () => {
    await processMessageNotification(fake, input);
    const second = await processMessageNotification(fake, input);
    assert.deepEqual(second, { status: 'duplicate' });
    assert.equal(fake.sent.length, 1);
  });

  it('chamadas concorrentes para a mesma mensagem enviam uma única vez', async () => {
    const results = await Promise.all([
      processMessageNotification(fake, input),
      processMessageNotification(fake, input),
      processMessageNotification(fake, input),
    ]);
    assert.equal(results.filter((r) => r.status === 'sent').length, 1);
    assert.equal(fake.sent.length, 1);
  });

  it('libera a reserva quando o envio falha, permitindo nova tentativa', async () => {
    fake.failNextSend = true;
    await assert.rejects(processMessageNotification(fake, input), /FCM indisponível/);
    assert.equal(fake.claims.size, 0);
    const retry = await processMessageNotification(fake, input);
    assert.equal(retry.status, 'sent');
  });

  it('remove tokens inválidos', async () => {
    const bad = createFake(groupMessage, groupConversation('all_group_messages'), devices, {
      delivered: 1,
      invalidDevices: [devices[2]],
    });
    await processMessageNotification(bad, input);
    assert.deepEqual(bad.removed, [devices[2]]);
  });

  it('rejeita mensagem inexistente (404)', async () => {
    const missing = createFake(null, groupConversation('all_group_messages'), devices);
    await assert.rejects(processMessageNotification(missing, input), (e) => e instanceof HttpError && e.status === 404);
  });

  it('rejeita quando o usuário autenticado não é o autor da mensagem (403)', async () => {
    await assert.rejects(
      processMessageNotification(fake, { ...input, uid: 'bia' }),
      (e) => e instanceof HttpError && e.status === 403,
    );
    assert.equal(fake.sent.length, 0);
  });

  it('rejeita autor que não é mais integrante do grupo (403)', async () => {
    const removed = createFake({ ...groupMessage, senderId: 'zeca' }, groupConversation('all_group_messages'), devices);
    await assert.rejects(
      processMessageNotification(removed, { ...input, uid: 'zeca' }),
      (e) => e instanceof HttpError && e.status === 403,
    );
  });

  it('política disabled não envia nem reserva a mensagem', async () => {
    const off = createFake(groupMessage, groupConversation('disabled'), devices);
    assert.deepEqual(await processMessageNotification(off, input), { status: 'skipped', reason: 'no-recipients' });
    assert.equal(off.sent.length, 0);
    assert.equal(off.claims.size, 0);
  });

  it('mentioned_members notifica só o mencionado', async () => {
    const mention = createFake(
      { ...groupMessage, mentionedUserIds: ['caio'] },
      groupConversation('mentioned_members'),
      devices,
    );
    await processMessageNotification(mention, input);
    assert.deepEqual(uidsOf(mention.sent[0].devices), ['caio']);
  });

  it('conversa individual notifica o outro participante', async () => {
    const direct = createFake(
      { ...groupMessage, conversationType: 'direct' },
      { type: 'direct', participantIds: ['ana', 'bia'] },
      devices,
    );
    const result = await processMessageNotification(direct, { ...input, conversationId: 'ana_bia' });
    assert.equal(result.status, 'sent');
    assert.deepEqual(uidsOf(direct.sent[0].devices), ['bia']);
    assert.equal(direct.sent[0].payload.title, 'Ana');
  });

  it('sem aparelhos registrados conclui sem erro e sem envio', async () => {
    const none = createFake(groupMessage, groupConversation('all_group_messages'), []);
    assert.deepEqual(await processMessageNotification(none, input), { status: 'sent', recipients: 2, delivered: 0 });
    assert.equal(none.sent.length, 0);
  });
});

describe('helpers', () => {
  it('notificationKey combina conversa e mensagem', () => {
    assert.equal(notificationKey('c', 'm'), 'c__m');
  });

  it('buildPayload usa textos genéricos quando o nome é desconhecido', () => {
    const payload = buildPayload('a_b', { type: 'direct', participantIds: ['a', 'b'] }, '  ');
    assert.deepEqual(payload, {
      title: 'Nova mensagem',
      body: 'Nova mensagem',
      data: { conversationId: 'a_b', conversationType: 'direct' },
    });
  });
});
