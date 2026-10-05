import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { deleteDoc, doc, setDoc } from 'firebase/firestore';
import { Platform } from 'react-native';
import type { DevicePlatform, NotificationPayload, PushRegistrationResult } from '../types/notification';
import { parseNotificationPayload } from '../utils/notificationPayload';
import { isRecord, readString } from '../utils/parsers';
import { deviceTokenConverter } from './converters';
import { firestore } from './firebase';

/** Canal Android; a API informa o mesmo ID no payload do FCM. */
export const MESSAGES_CHANNEL_ID = 'messages';

const INSTALLATION_ID_KEY = 'chat.installationId';

let activeConversationId: string | null = null;

/** Informa qual conversa está aberta, para não exibir banner de mensagens que o usuário já está vendo. */
export function setActiveConversationId(conversationId: string | null): void {
  activeConversationId = conversationId;
}

/** Define como notificações recebidas com o app aberto são apresentadas. Chamar uma vez na inicialização. */
export function configureNotificationHandler(): void {
  Notifications.setNotificationHandler({
    handleNotification: async (notification) => {
      const payload = parseNotificationPayload(notification.request.content.data);
      const alreadyVisible = payload !== null && payload.conversationId === activeConversationId;
      return {
        shouldShowBanner: !alreadyVisible,
        shouldShowList: !alreadyVisible,
        shouldPlaySound: !alreadyVisible,
        shouldSetBadge: false,
      };
    },
  });
}

/** ID estável desta instalação; identifica o documento do aparelho em `users/{uid}/devices`. */
async function getInstallationId(): Promise<string> {
  const stored = await AsyncStorage.getItem(INSTALLATION_ID_KEY);
  if (stored) return stored;
  const created = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`;
  await AsyncStorage.setItem(INSTALLATION_ID_KEY, created);
  return created;
}

const currentPlatform = (): DevicePlatform => (Platform.OS === 'ios' ? 'ios' : 'android');

function readProjectId(): string {
  const extra: unknown = Constants.expoConfig?.extra;
  const eas = isRecord(extra) ? extra.eas : undefined;
  return Constants.easConfig?.projectId ?? (isRecord(eas) ? readString(eas.projectId) : '');
}

/**
 * Android: token FCM nativo (a API envia pelo Firebase Admin SDK).
 * iOS: token do Expo Push Service, pois o FCM não aceita o token APNs cru; exige projeto EAS e credencial APNs.
 */
async function fetchPushToken(): Promise<string | null> {
  if (Platform.OS === 'android') {
    const token = await Notifications.getDevicePushTokenAsync();
    return typeof token.data === 'string' && token.data.length > 0 ? token.data : null;
  }

  const projectId = readProjectId();
  if (!projectId) return null;
  const token = await Notifications.getExpoPushTokenAsync({ projectId });
  return token.data.length > 0 ? token.data : null;
}

export async function saveDeviceToken(uid: string, token: string): Promise<void> {
  const deviceId = await getInstallationId();
  const ref = doc(firestore, 'users', uid, 'devices', deviceId).withConverter(deviceTokenConverter);
  await setDoc(ref, {
    deviceId,
    token,
    platform: currentPlatform(),
    enabled: true,
    updatedAt: Date.now(),
  });
}

/**
 * Pede permissão, obtém o token do aparelho e o grava no Firestore.
 * Nunca lança: o resultado descreve o que aconteceu para a interface poder orientar o usuário.
 */
export async function registerForPush(uid: string): Promise<PushRegistrationResult> {
  if (!Device.isDevice) return { status: 'unavailable', reason: 'not-a-device' };

  try {
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync(MESSAGES_CHANNEL_ID, {
        name: 'Mensagens',
        importance: Notifications.AndroidImportance.HIGH,
      });
    }

    let permission = await Notifications.getPermissionsAsync();
    if (!permission.granted && permission.canAskAgain) {
      permission = await Notifications.requestPermissionsAsync();
    }
    if (!permission.granted) return { status: 'denied', canAskAgain: permission.canAskAgain };

    const token = await fetchPushToken();
    if (!token) return { status: 'unavailable', reason: 'no-token' };

    await saveDeviceToken(uid, token);
    return { status: 'registered' };
  } catch {
    return { status: 'unavailable', reason: 'error' };
  }
}

/** Mantém o Firestore atualizado quando o FCM troca o token (Android). Devolve a função que remove o listener. */
export function observePushTokenChanges(uid: string): () => void {
  const subscription = Notifications.addPushTokenListener((token) => {
    if (token.type === 'android' && typeof token.data === 'string') {
      void saveDeviceToken(uid, token.data).catch(() => undefined);
    }
  });
  return () => subscription.remove();
}

/** Remove o token deste aparelho do usuário (logout), para ele não receber push de uma conta encerrada. */
export async function unregisterDevice(uid: string): Promise<void> {
  const deviceId = await getInstallationId();
  await deleteDoc(doc(firestore, 'users', uid, 'devices', deviceId));
}

const handledResponseIds = new Set<string>();

/**
 * Chama `onOpen` quando o usuário toca em uma notificação, inclusive a que abriu o app do zero.
 * Cada notificação só é tratada uma vez, mesmo que o listener seja recriado.
 */
export function observeNotificationTaps(onOpen: (payload: NotificationPayload) => void): () => void {
  const handle = (response: Notifications.NotificationResponse): void => {
    const id = response.notification.request.identifier;
    if (handledResponseIds.has(id)) return;
    const payload = parseNotificationPayload(response.notification.request.content.data);
    if (!payload) return;
    handledResponseIds.add(id);
    onOpen(payload);
  };

  const launchResponse = Notifications.getLastNotificationResponse();
  if (launchResponse) handle(launchResponse);

  const subscription = Notifications.addNotificationResponseReceivedListener(handle);
  return () => subscription.remove();
}
