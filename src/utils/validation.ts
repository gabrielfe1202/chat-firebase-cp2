import type { ValidationResult } from './groupValidation';

const ok: ValidationResult = { ok: true };
const fail = (message: string): ValidationResult => ({ ok: false, message });

export const MIN_PASSWORD_LENGTH = 6;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateName(name: string): ValidationResult {
  return name.trim().length >= 2 ? ok : fail('Informe seu nome completo.');
}

export function validateEmail(email: string): ValidationResult {
  return EMAIL_PATTERN.test(email.trim()) ? ok : fail('Informe um e-mail válido.');
}

export function validatePassword(password: string): ValidationResult {
  return password.length >= MIN_PASSWORD_LENGTH
    ? ok
    : fail(`A senha deve ter no mínimo ${MIN_PASSWORD_LENGTH} caracteres.`);
}

export function validatePasswordConfirmation(password: string, confirmation: string): ValidationResult {
  return password === confirmation ? ok : fail('As senhas não coincidem.');
}

export function onlyDigits(value: string): string {
  return value.replace(/\D/g, '');
}

export function validatePhone(phone: string): ValidationResult {
  const digits = onlyDigits(phone);
  return digits.length === 10 || digits.length === 11
    ? ok
    : fail('Informe o celular com DDD (10 ou 11 dígitos).');
}

/** Máscara (99) 99999-9999 aplicada durante a digitação. */
export function maskPhone(value: string): string {
  const digits = onlyDigits(value).slice(0, 11);
  if (digits.length <= 2) return digits;
  if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  if (digits.length <= 10) return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
}

/** Máscara DD/MM/AAAA aplicada durante a digitação. */
export function maskBirthDate(value: string): string {
  const digits = onlyDigits(value).slice(0, 8);
  if (digits.length <= 2) return digits;
  if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
}

/** Converte DD/MM/AAAA em AAAA-MM-DD; retorna null se a data não existir ou estiver no futuro. */
export function parseBirthDate(masked: string, now: Date = new Date()): string | null {
  const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(masked);
  if (!match) return null;
  const day = Number(match[1]);
  const month = Number(match[2]);
  const year = Number(match[3]);
  const date = new Date(year, month - 1, day);
  const isReal =
    date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day;
  if (!isReal || year < 1900 || date.getTime() > now.getTime()) return null;
  return `${match[3]}-${match[2]}-${match[1]}`;
}

export function validateBirthDate(masked: string): ValidationResult {
  return parseBirthDate(masked) ? ok : fail('Informe uma data de nascimento válida (DD/MM/AAAA).');
}

/** AAAA-MM-DD → DD/MM/AAAA, para exibição; retorna o texto original se estiver fora do padrão. */
export function formatBirthDate(iso: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  return match ? `${match[3]}/${match[2]}/${match[1]}` : iso;
}
