import { AppError } from '../utils/authErrors';
import { auth } from './firebase';

const REQUEST_TIMEOUT_MS = 10000;

/** Resposta de erro da API (status HTTP) ou falha de rede (status 0). */
export class ApiError extends AppError {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

/**
 * Chamada autenticada à API própria: envia o ID token do Firebase no cabeçalho Authorization.
 * Falhas de rede e respostas 5xx são repetidas até `attempts` vezes; 4xx não (a resposta não mudaria).
 * Devolve o JSON da resposta (ou null quando não há corpo).
 */
export async function apiRequest(
  method: 'GET' | 'POST',
  path: string,
  body?: unknown,
  attempts = 2,
): Promise<unknown> {
  const baseUrl = process.env.EXPO_PUBLIC_API_URL;
  if (!baseUrl) throw new AppError('O serviço online não está configurado.');

  const user = auth.currentUser;
  if (!user) throw new AppError('Sessão expirada. Faça login novamente.');

  const idToken = await user.getIdToken();
  const url = `${baseUrl.replace(/\/+$/, '')}${path}`;
  let lastStatus = 0;

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    try {
      const response = await fetch(url, {
        method,
        headers: {
          Authorization: `Bearer ${idToken}`,
          ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
        },
        body: body === undefined ? undefined : JSON.stringify(body),
        signal: controller.signal,
      });

      if (response.ok) return await response.json().catch(() => null);
      lastStatus = response.status;
      if (response.status < 500) throw new ApiError('A solicitação foi recusada pelo servidor.', response.status);
    } catch (error) {
      if (error instanceof ApiError) throw error;
      // Falha de rede ou timeout: tenta de novo até o limite.
    } finally {
      clearTimeout(timeout);
    }
  }

  throw new ApiError('Não foi possível falar com o servidor. Tente novamente.', lastStatus);
}
