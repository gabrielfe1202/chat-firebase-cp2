/** Hora da mensagem (HH:mm); retorna vazio enquanto o timestamp do servidor ainda não foi resolvido. */
export function formatMessageTime(timestamp: number): string {
  if (!timestamp) return '';
  return new Date(timestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

export function pluralize(count: number, singular: string, plural: string): string {
  return `${count} ${count === 1 ? singular : plural}`;
}
