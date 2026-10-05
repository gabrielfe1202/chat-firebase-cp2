import assert from 'node:assert/strict';
import type { Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { after, before, describe, it } from 'node:test';
import { createApp, type AppDependencies } from './app';
import type { NotificationPorts } from './services/notificationProcessor';

const notifications: NotificationPorts = {
  readMessage: async (_conversationId, messageId) =>
    messageId === 'm1'
      ? {
          senderId: 'ana',
          conversationType: 'direct',
          target: { type: 'conversation' },
          mentionedUserIds: [],
          createdAt: 1,
        }
      : null,
  readConversation: async () => ({ type: 'direct', participantIds: ['ana', 'bia'] }),
  getDevices: async () => [{ uid: 'bia', deviceId: 'd1', token: 't1' }],
  getDisplayName: async () => 'Ana',
  claim: async () => 'claimed',
  finish: async () => undefined,
  release: async () => undefined,
  send: async () => ({ delivered: 1, invalidDevices: [] }),
  removeDevices: async () => undefined,
};

const registered: string[] = [];

const deps: AppDependencies = {
  verifyIdToken: async (token) => {
    if (token === 'token-ana') return 'ana';
    if (token === 'token-bia') return 'bia';
    throw new Error('token inválido');
  },
  notifications,
  profiles: {
    shareConversation: async (requester, target) => requester === 'ana' && target === 'bia',
    getProfile: async (uid) => ({
      uid,
      name: 'Nome',
      email: 'e@x.com',
      phoneNumber: '11999999999',
      birthDate: '2000-01-01',
      photoUrl: '',
      createdAt: 1,
    }),
  },
  devices: {
    registerDevice: async (uid, deviceId) => {
      registered.push(`${uid}:${deviceId}`);
    },
  },
};

type CallOptions = { method?: string; token?: string; body?: unknown; raw?: string };

describe('API HTTP', () => {
  let server: Server;
  let base = '';

  before(async () => {
    server = createApp(deps).listen(0);
    await new Promise((resolve) => server.once('listening', resolve));
    base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  });

  after(() => {
    server.close();
  });

  const call = (path: string, options: CallOptions = {}) =>
    fetch(`${base}${path}`, {
      method: options.method ?? 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...(options.token ? { Authorization: `Bearer ${options.token}` } : {}),
      },
      body: options.raw ?? (options.body === undefined ? undefined : JSON.stringify(options.body)),
    });

  it('GET /health responde sem autenticação', async () => {
    const response = await call('/health');
    assert.equal(response.status, 200);
    const json = (await response.json()) as { status: string };
    assert.equal(json.status, 'ok');
  });

  describe('POST /notifications/messages', () => {
    const body = { conversationId: 'ana_bia', messageId: 'm1' };

    it('401 sem token', async () => {
      assert.equal((await call('/notifications/messages', { method: 'POST', body })).status, 401);
    });

    it('401 com token inválido', async () => {
      const response = await call('/notifications/messages', { method: 'POST', body, token: 'forjado' });
      assert.equal(response.status, 401);
    });

    it('200 e notifica quando o autor autenticado é o remetente', async () => {
      const response = await call('/notifications/messages', { method: 'POST', body, token: 'token-ana' });
      assert.equal(response.status, 200);
      assert.deepEqual(await response.json(), { status: 'sent', recipients: 1, delivered: 1 });
    });

    it('403 quando outro usuário tenta disparar o push da mensagem', async () => {
      const response = await call('/notifications/messages', { method: 'POST', body, token: 'token-bia' });
      assert.equal(response.status, 403);
    });

    it('404 para mensagem inexistente', async () => {
      const response = await call('/notifications/messages', {
        method: 'POST',
        body: { ...body, messageId: 'nao-existe' },
        token: 'token-ana',
      });
      assert.equal(response.status, 404);
    });

    it('400 para corpo inválido ou IDs com caracteres de caminho', async () => {
      const invalidBodies = [{}, { conversationId: 'a/b', messageId: 'm1' }, { conversationId: 'x', messageId: '../m' }];
      for (const invalid of invalidBodies) {
        const response = await call('/notifications/messages', { method: 'POST', body: invalid, token: 'token-ana' });
        assert.equal(response.status, 400);
      }
      const malformed = await call('/notifications/messages', { method: 'POST', raw: '{oops', token: 'token-ana' });
      assert.equal(malformed.status, 400);
    });

    it('ignora lista de destinatários enviada pelo cliente', async () => {
      const response = await call('/notifications/messages', {
        method: 'POST',
        body: { ...body, recipients: ['intruso'] },
        token: 'token-ana',
      });
      assert.equal(response.status, 200);
      assert.deepEqual(await response.json(), { status: 'sent', recipients: 1, delivered: 1 });
    });
  });

  describe('GET /users/:uid/profile', () => {
    it('401 sem token', async () => {
      assert.equal((await call('/users/bia/profile')).status, 401);
    });

    it('200 para quem compartilha conversa', async () => {
      assert.equal((await call('/users/bia/profile', { token: 'token-ana' })).status, 200);
    });

    it('200 para o próprio perfil', async () => {
      assert.equal((await call('/users/ana/profile', { token: 'token-ana' })).status, 200);
    });

    it('403 sem vínculo em comum', async () => {
      assert.equal((await call('/users/ana/profile', { token: 'token-bia' })).status, 403);
    });
  });

  describe('POST /devices', () => {
    const device = { deviceId: 'dev-123', token: 't', platform: 'android' };

    it('401 sem token', async () => {
      assert.equal((await call('/devices', { method: 'POST', body: device })).status, 401);
    });

    it('204 registra o aparelho no usuário autenticado', async () => {
      const response = await call('/devices', { method: 'POST', token: 'token-ana', body: device });
      assert.equal(response.status, 204);
      assert.deepEqual(registered, ['ana:dev-123']);
    });

    it('400 para plataforma inválida', async () => {
      const response = await call('/devices', {
        method: 'POST',
        token: 'token-ana',
        body: { ...device, platform: 'web' },
      });
      assert.equal(response.status, 400);
    });
  });

  it('404 para rota desconhecida', async () => {
    assert.equal((await call('/nada')).status, 404);
  });
});
