import type { ChatGroup } from '../types/group';

export const MIN_GROUP_MEMBERS = 2;
export const MAX_MEMBER_LIMIT = 50;
export const MAX_GROUP_NAME_LENGTH = 40;

export type ValidationResult = { ok: true } | { ok: false; message: string };

const ok: ValidationResult = { ok: true };
const fail = (message: string): ValidationResult => ({ ok: false, message });

export function validateGroupName(name: string): ValidationResult {
  const trimmed = name.trim();
  if (trimmed.length === 0) return fail('Informe o nome do grupo.');
  if (trimmed.length > MAX_GROUP_NAME_LENGTH) {
    return fail(`O nome deve ter no máximo ${MAX_GROUP_NAME_LENGTH} caracteres.`);
  }
  return ok;
}

/** O limite precisa ser inteiro e não pode ficar abaixo da quantidade atual de integrantes. */
export function validateMemberLimit(limit: number, currentMembers: number): ValidationResult {
  if (!Number.isInteger(limit)) return fail('O limite deve ser um número inteiro.');
  if (limit < MIN_GROUP_MEMBERS) {
    return fail(`O limite mínimo é ${MIN_GROUP_MEMBERS} integrantes.`);
  }
  if (limit > MAX_MEMBER_LIMIT) {
    return fail(`O limite máximo é ${MAX_MEMBER_LIMIT} integrantes.`);
  }
  if (limit < currentMembers) {
    return fail(`O limite não pode ser menor que os ${currentMembers} integrantes atuais.`);
  }
  return ok;
}

/** Valida a lista de integrantes (inclui o proprietário). */
export function validateMemberIds(ownerId: string, memberIds: readonly string[]): ValidationResult {
  if (!memberIds.includes(ownerId)) return fail('O proprietário deve ser integrante do grupo.');
  if (new Set(memberIds).size !== memberIds.length) return fail('Há integrantes duplicados.');
  if (memberIds.length < MIN_GROUP_MEMBERS) {
    return fail(`O grupo precisa de pelo menos ${MIN_GROUP_MEMBERS} integrantes.`);
  }
  return ok;
}

export function validateGroupCreation(params: {
  name: string;
  ownerId: string;
  memberIds: readonly string[];
  memberLimit: number;
}): ValidationResult {
  const nameResult = validateGroupName(params.name);
  if (!nameResult.ok) return nameResult;
  const membersResult = validateMemberIds(params.ownerId, params.memberIds);
  if (!membersResult.ok) return membersResult;
  return validateMemberLimit(params.memberLimit, params.memberIds.length);
}

export function getAvailableSlots(group: Pick<ChatGroup, 'memberIds' | 'memberLimit'>): number {
  return Math.max(0, group.memberLimit - group.memberIds.length);
}

export function canAddMember(
  group: Pick<ChatGroup, 'memberIds' | 'memberLimit'>,
  uid: string,
): ValidationResult {
  if (group.memberIds.includes(uid)) return fail('O usuário já faz parte do grupo.');
  if (getAvailableSlots(group) === 0) return fail('O grupo atingiu o limite de integrantes.');
  return ok;
}

export function isGroupOwner(group: Pick<ChatGroup, 'ownerId'>, uid: string): boolean {
  return group.ownerId === uid;
}
