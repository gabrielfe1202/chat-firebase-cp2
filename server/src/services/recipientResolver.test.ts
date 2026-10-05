import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { ConversationRecord, NotificationPolicy, StoredMessage } from '../types';
import { resolveRecipients } from './recipientResolver';

const members = ['ana', 'bia', 'caio', 'duda'];

const group = (policy: NotificationPolicy): ConversationRecord => ({
  type: 'group',
  name: 'Grupo',
  memberIds: members,
  policy,
});

const message = (overrides: Partial<StoredMessage> = {}): StoredMessage => ({
  senderId: 'ana',
  conversationType: 'group',
  target: { type: 'conversation' },
  mentionedUserIds: [],
  createdAt: 1,
  ...overrides,
});

describe('resolveRecipients', () => {
  describe('conversa individual', () => {
    const direct: ConversationRecord = { type: 'direct', participantIds: ['ana', 'bia'] };

    it('notifica o outro participante e nunca o remetente', () => {
      assert.deepEqual(resolveRecipients(direct, message({ conversationType: 'direct' })), ['bia']);
      assert.deepEqual(resolveRecipients(direct, message({ senderId: 'bia', conversationType: 'direct' })), ['ana']);
    });

    it('ignora remetente que não participa da conversa', () => {
      assert.deepEqual(resolveRecipients(direct, message({ senderId: 'intruso', conversationType: 'direct' })), []);
    });
  });

  describe('all_group_messages', () => {
    it('notifica todos exceto o remetente', () => {
      assert.deepEqual(resolveRecipients(group('all_group_messages'), message()), ['bia', 'caio', 'duda']);
    });

    it('também notifica todos quando a mensagem é direcionada a um integrante', () => {
      const directed = message({ target: { type: 'member', memberId: 'bia' } });
      assert.deepEqual(resolveRecipients(group('all_group_messages'), directed), ['bia', 'caio', 'duda']);
    });

    it('não notifica quem foi removido do grupo (a lista vem do Firestore atual)', () => {
      const current: ConversationRecord = { ...(group('all_group_messages') as Extract<ConversationRecord, { type: 'group' }>), memberIds: ['ana', 'bia'] };
      assert.deepEqual(resolveRecipients(current, message()), ['bia']);
    });
  });

  describe('mentioned_members', () => {
    it('não notifica ninguém em mensagem geral sem menção', () => {
      assert.deepEqual(resolveRecipients(group('mentioned_members'), message()), []);
    });

    it('notifica apenas os mencionados', () => {
      assert.deepEqual(
        resolveRecipients(group('mentioned_members'), message({ mentionedUserIds: ['caio'] })),
        ['caio'],
      );
    });

    it('notifica o integrante selecionado como destinatário', () => {
      assert.deepEqual(
        resolveRecipients(group('mentioned_members'), message({ target: { type: 'member', memberId: 'duda' } })),
        ['duda'],
      );
    });

    it('combina menções e destinatário sem repetir', () => {
      const result = resolveRecipients(
        group('mentioned_members'),
        message({ target: { type: 'member', memberId: 'bia' }, mentionedUserIds: ['bia', 'caio'] }),
      );
      assert.deepEqual(result.sort(), ['bia', 'caio']);
    });

    it('ignora menção ao próprio remetente e a quem não é integrante', () => {
      assert.deepEqual(
        resolveRecipients(group('mentioned_members'), message({ mentionedUserIds: ['ana', 'estranho'] })),
        [],
      );
    });
  });

  describe('direct_messages_only e disabled', () => {
    for (const policy of ['direct_messages_only', 'disabled'] as const) {
      it(`${policy} não gera push em grupos, mesmo com menção`, () => {
        const mentioned = message({ mentionedUserIds: ['bia'], target: { type: 'member', memberId: 'bia' } });
        assert.deepEqual(resolveRecipients(group(policy), message()), []);
        assert.deepEqual(resolveRecipients(group(policy), mentioned), []);
      });
    }
  });

  it('não aceita remetente fora do grupo', () => {
    assert.deepEqual(resolveRecipients(group('all_group_messages'), message({ senderId: 'intruso' })), []);
  });
});
