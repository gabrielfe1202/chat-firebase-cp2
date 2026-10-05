import type { PublicProfile } from '../types/user';

/** Minúsculas e sem acentos, para a busca ignorar maiúsculas e diacríticos. */
export function normalizeText(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim();
}

/** Remove o próprio usuário e aplica o filtro por nome. */
export function filterUsers(
  users: readonly PublicProfile[],
  searchText: string,
  excludeUid: string,
): PublicProfile[] {
  const needle = normalizeText(searchText);
  return users.filter(
    (user) => user.uid !== excludeUid && (needle === '' || normalizeText(user.name).includes(needle)),
  );
}
