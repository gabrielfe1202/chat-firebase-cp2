import { NOTIFICATION_POLICIES, type NotificationPolicy } from '../types/notification';

/** Helpers para ler dados desconhecidos (Firestore/RTDB) sem recorrer a `any`. */
export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function readString(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : fallback;
}

export function readNumber(value: unknown, fallback = 0): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

export function readBoolean(value: unknown, fallback = false): boolean {
  return typeof value === 'boolean' ? value : fallback;
}

export function readStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];
}

export function readPolicy(value: unknown): NotificationPolicy {
  return NOTIFICATION_POLICIES.find((policy) => policy === value) ?? 'all_group_messages';
}
