import { adminMessaging } from './firebaseAdmin';
import { isRecord } from './readers';
import type { DeviceRecord, PushPayload, SendResult } from '../types';

/** Mesmo ID do canal criado pelo aplicativo Android. */
export const ANDROID_CHANNEL_ID = 'messages';

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';
const FCM_BATCH_SIZE = 500; // limite do sendEachForMulticast
const EXPO_BATCH_SIZE = 100; // limite do Expo Push Service

/** Códigos do FCM que indicam token que nunca mais vai funcionar. */
const INVALID_FCM_CODES = new Set([
  'messaging/registration-token-not-registered',
  'messaging/invalid-registration-token',
]);

/** Tokens do Expo Push Service (iOS) têm o formato ExponentPushToken[...]; os demais são tokens FCM. */
export const isExpoToken = (token: string): boolean => /^Expo(nent)?PushToken\[.+\]$/.test(token);

function chunk<T>(items: readonly T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += size) chunks.push(items.slice(i, i + size));
  return chunks;
}

async function sendViaFcm(devices: readonly DeviceRecord[], payload: PushPayload): Promise<SendResult> {
  const result: SendResult = { delivered: 0, invalidDevices: [] };

  for (const batch of chunk(devices, FCM_BATCH_SIZE)) {
    const response = await adminMessaging().sendEachForMulticast({
      tokens: batch.map((device) => device.token),
      notification: { title: payload.title, body: payload.body },
      data: payload.data,
      android: { priority: 'high', notification: { channelId: ANDROID_CHANNEL_ID } },
    });

    response.responses.forEach((item, index) => {
      if (item.success) {
        result.delivered += 1;
      } else if (item.error && INVALID_FCM_CODES.has(item.error.code)) {
        result.invalidDevices.push(batch[index]);
      }
    });
  }
  return result;
}

async function sendViaExpo(devices: readonly DeviceRecord[], payload: PushPayload): Promise<SendResult> {
  const result: SendResult = { delivered: 0, invalidDevices: [] };

  for (const batch of chunk(devices, EXPO_BATCH_SIZE)) {
    const response = await fetch(EXPO_PUSH_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(
        batch.map((device) => ({
          to: device.token,
          title: payload.title,
          body: payload.body,
          data: payload.data,
          sound: 'default',
          channelId: ANDROID_CHANNEL_ID,
        })),
      ),
    });
    if (!response.ok) throw new Error(`Expo Push Service respondeu ${response.status}`);

    const body: unknown = await response.json();
    const tickets = isRecord(body) && Array.isArray(body.data) ? body.data : [];

    tickets.forEach((ticket: unknown, index: number) => {
      if (!isRecord(ticket)) return;
      if (ticket.status === 'ok') {
        result.delivered += 1;
      } else if (isRecord(ticket.details) && ticket.details.error === 'DeviceNotRegistered') {
        result.invalidDevices.push(batch[index]);
      }
    });
  }
  return result;
}

/**
 * Envia a notificação a todos os aparelhos: Android pelo FCM (Firebase Admin SDK) e iOS pelo Expo Push
 * Service. Cada token só é usado uma vez, mesmo que esteja repetido em mais de um documento.
 */
export async function sendPush(devices: readonly DeviceRecord[], payload: PushPayload): Promise<SendResult> {
  const uniqueByToken = Array.from(new Map(devices.map((device) => [device.token, device])).values());
  const expoDevices = uniqueByToken.filter((device) => isExpoToken(device.token));
  const fcmDevices = uniqueByToken.filter((device) => !isExpoToken(device.token));

  const results = await Promise.all([
    fcmDevices.length > 0 ? sendViaFcm(fcmDevices, payload) : { delivered: 0, invalidDevices: [] },
    expoDevices.length > 0 ? sendViaExpo(expoDevices, payload) : { delivered: 0, invalidDevices: [] },
  ]);

  return {
    delivered: results[0].delivered + results[1].delivered,
    invalidDevices: [...results[0].invalidDevices, ...results[1].invalidDevices],
  };
}
