/** Leitura defensiva de dados desconhecidos vindos do Firebase, sem `any`. */
export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export const readString = (value: unknown, fallback = ''): string =>
  typeof value === 'string' ? value : fallback;

export const readNumber = (value: unknown, fallback = 0): number =>
  typeof value === 'number' && Number.isFinite(value) ? value : fallback;

export const readStringArray = (value: unknown): string[] =>
  Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];
