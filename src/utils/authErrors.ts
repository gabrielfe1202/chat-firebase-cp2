/** Erro com mensagem já adequada para exibição ao usuário. */
export class AppError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AppError';
  }
}

function readCode(error: unknown): string {
  if (typeof error === 'object' && error !== null && 'code' in error) {
    const { code } = error as { code: unknown };
    if (typeof code === 'string') return code;
  }
  return '';
}

const MESSAGES: Record<string, string> = {
  'auth/invalid-email': 'O e-mail informado é inválido.',
  'auth/invalid-credential': 'E-mail ou senha incorretos.',
  'auth/wrong-password': 'E-mail ou senha incorretos.',
  'auth/user-not-found': 'E-mail ou senha incorretos.',
  'auth/user-disabled': 'Esta conta foi desativada.',
  'auth/email-already-in-use': 'Este e-mail já está cadastrado.',
  'auth/weak-password': 'A senha é muito fraca. Use ao menos 6 caracteres.',
  'auth/too-many-requests': 'Muitas tentativas. Aguarde alguns instantes e tente novamente.',
  'auth/network-request-failed': 'Sem conexão com a internet. Verifique sua rede.',
  'auth/requires-recent-login': 'Sua sessão expirou. Faça login novamente.',
  'auth/user-token-expired': 'Sua sessão expirou. Faça login novamente.',
  'permission-denied': 'Você não tem permissão para realizar esta ação.',
  unavailable: 'Serviço indisponível. Verifique sua conexão e tente novamente.',
};

/** Traduz erros do Firebase para mensagens compreensíveis, sem expor detalhes internos. */
export function getErrorMessage(error: unknown): string {
  if (error instanceof AppError) return error.message;
  const code = readCode(error);
  const key = code.startsWith('firestore/') || code.startsWith('database/') ? code.split('/')[1] : code;
  return MESSAGES[key] ?? 'Ocorreu um erro inesperado. Tente novamente.';
}
